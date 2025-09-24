const clientModel = require('../models/clientModel');
const path = require('path');
const archiver = require('archiver');
const fs = require('fs');
const Joi = require('joi');

// -------------------- Validation Schema --------------------
const clientSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  parents_name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  gender: Joi.string().valid('male', 'female', 'other').required(),
  dob: Joi.date().required(),
  address: Joi.string().max(255).required(),
  phone: Joi.string().pattern(/^\+?[0-9]{10,15}$/).required(),
  client_type: Joi.string().valid('premium', 'standard', 'basic').required()
});

// -------------------- Utility: Delete file --------------------
const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (err) {
    console.warn(`[WARN] Could not delete file: ${filePath}`, err);
  }
};

// -------------------- DOWNLOAD CLIENT --------------------
exports.downloadClientById = async (req, res) => {
  const clientId = req.params.id;
  try {
    const client = await clientModel.getClientById(clientId);
    if (!client) return res.status(404).json({ message: 'Client not found' });

    const clientText = `
Client ID: ${client.id}
Name: ${client.name}
Parents Name: ${client.parents_name}
Phone: ${client.phone}
Email: ${client.email}
Gender: ${client.gender}
Date of Birth: ${client.dob}
Address: ${client.address}
Client Type: ${client.client_type}
Created By: ${client.created_by}
File Status: ${client.file_status || 'no_status'}
File Comment: ${client.file_comment || ''}
    `.trim();

    const safeClientName = client.name.replace(/\s+/g, '_').toLowerCase();
    const imageFolderName = `${safeClientName}_${client.phone.slice(-4)}`;
    const imageFolderPath = path.join(__dirname, '..', 'uploads', 'clients', imageFolderName);

    res.setHeader('Content-Disposition', `attachment; filename=client_${client.phone}.zip`);
    res.setHeader('Content-Type', 'application/zip');

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);

    if (fs.existsSync(imageFolderPath)) {
      archive.directory(imageFolderPath, `client_${client.id}/images`);
    }

    archive.append(clientText, { name: `client_${client.id}/images/client_data.txt` });

    await archive.finalize();
  } catch (err) {
    res.status(500).json({ message: 'Failed to prepare download', error: err.message });
  }
};

// -------------------- CREATE CLIENT --------------------
exports.createClient = async (req, res) => {
  try {
    const { error, value } = clientSchema.validate(req.body);
    if (error) return res.status(400).json({ message: 'Validation failed', error: error.details });

    const created_by = req.user.special_id;
    const fileMap = {};

    for (let key in req.files) {
      if (req.files[key]?.[0]) {
        fileMap[key] = path.relative(process.cwd(), req.files[key][0].path).replace(/\\/g, '/');
      }
    }

    // Add default file_status and file_comment
    const newClient = { ...value, created_by, ...fileMap, file_status: 'no_status', file_comment: null };
    const insertId = await clientModel.createClient(newClient);

    res.status(201).json({ message: 'Client created successfully', client_id: insertId });
  } catch (err) {
    console.error(`[SERVER_ERROR] createClient:`, err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// -------------------- GET CLIENTS --------------------
exports.getClients = async (req, res) => {
  try {
    const role = req.user.role?.toLowerCase();
    const userId = req.user.special_id;

    const clients = role === 'admin'
      ? await clientModel.getAllClients()
      : await clientModel.getClientsByCreator(userId);

    res.json(clients);
  } catch (err) {
    console.error(`[SERVER_ERROR] getClients:`, err);
    res.status(500).json({ message: 'Error fetching clients' });
  }
};

// -------------------- GET CLIENT BY ID --------------------
exports.getClientById = async (req, res) => {
  try {
    const { id } = req.params;
    const role = req.user.role?.toLowerCase();
    const userId = req.user.special_id;

    const client = await clientModel.getClientById(id);
    if (!client) return res.status(404).json({ message: 'Client not found' });

    if (role !== 'admin' && client.created_by !== userId) {
      return res.status(403).json({ message: 'Forbidden: Not authorized' });
    }

    res.json(client);
  } catch (err) {
    console.error(`[SERVER_ERROR] getClientById:`, err);
    res.status(500).json({ message: 'Error fetching client' });
  }
};

// -------------------- GET CLIENTS CREATED BY ME --------------------
exports.getClientsCreatedByMe = async (req, res) => {
  try {
    const userId = req.user.special_id;
    const clients = await clientModel.getClientsByCreator(userId);
    res.json(clients);
  } catch (err) {
    console.error(`[SERVER_ERROR] getClientsCreatedByMe:`, err);
    res.status(500).json({ message: 'Error fetching clients' });
  }
};

// -------------------- COUNT MY CLIENTS --------------------
exports.countClientsCreatedByMe = async (req, res) => {
  try {
    const userId = req.user.special_id;
    const count = await clientModel.countClientsByCreator(userId);
    res.json({ count });
  } catch (err) {
    console.error(`[SERVER_ERROR] countClientsCreatedByMe:`, err);
    res.status(500).json({ message: 'Error counting clients' });
  }
};

// -------------------- DELETE CLIENT --------------------
exports.deleteClient = async (req, res) => {
  try {
    const { id } = req.params;
    const role = req.user.role?.toLowerCase();
    const userId = req.user.special_id;

    const client = await clientModel.getClientById(id);
    if (!client) return res.status(404).json({ message: 'Client not found' });

    if (role !== 'admin' && client.created_by !== userId) {
      return res.status(403).json({ message: 'Forbidden: Not authorized' });
    }

    let folderPath = '';
    for (let key in client) {
      if (typeof client[key] === 'string' && client[key].startsWith('uploads/')) {
        const fullPath = path.join(process.cwd(), client[key]);
        deleteFile(fullPath);

        if (!folderPath) {
          folderPath = fullPath.split(path.sep).slice(0, -1).join(path.sep);
        }
      }
    }

    if (folderPath && fs.existsSync(folderPath)) {
      fs.rmSync(folderPath, { recursive: true, force: true });
    }

    await clientModel.deleteClient(id);
    res.json({ message: 'Client deleted successfully' });
  } catch (err) {
    console.error(`[SERVER_ERROR] deleteClient:`, err);
    res.status(500).json({ message: 'Error deleting client' });
  }
};

// -------------------- UPDATE CLIENT --------------------
exports.updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    const role = req.user.role?.toLowerCase();
    const userId = req.user.special_id;

    const client = await clientModel.getClientById(id);
    if (!client) return res.status(404).json({ message: 'Client not found' });

    if (role !== 'admin' && client.created_by !== userId) {
      return res.status(403).json({ message: 'Forbidden: Not authorized' });
    }

    const { error, value } = clientSchema.validate(req.body, { allowUnknown: true });
    if (error) return res.status(400).json({ message: 'Validation failed', error: error.details });

    const updatedData = { ...value };

    // Handle file replacements
    for (let key in req.files) {
      if (req.files[key]?.[0]) {
        const newPath = path.relative(process.cwd(), req.files[key][0].path).replace(/\\/g, '/');
        if (client[key]) deleteFile(path.join(process.cwd(), client[key]));
        updatedData[key] = newPath;
      }
    }

    // Prevent non-admins from updating file_status/comment here
    if ('file_status' in updatedData || 'file_comment' in updatedData) {
      if (role !== 'admin') {
        return res.status(403).json({ message: 'Only admin can update file status or comment' });
      }
    }

    await clientModel.updateClient(id, updatedData);
    res.json({ message: 'Client updated successfully' });
  } catch (err) {
    console.error(`[SERVER_ERROR] updateClient:`, err);
    res.status(500).json({ message: 'Error updating client' });
  }
};

// -------------------- UPDATE FILE STATUS / COMMENT (ADMIN ONLY) --------------------
exports.updateFileStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const role = req.user.role?.toLowerCase();

    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admin can update file status/comment' });
    }

    const { file_status, file_comment } = req.body;
    const validStatuses = ['no_status', 'approved', 'analyzing', 'rejected'];

    if (!file_status || !validStatuses.includes(file_status)) {
      return res.status(400).json({ message: 'Invalid file_status value' });
    }

    const client = await clientModel.getClientById(id);
    if (!client) return res.status(404).json({ message: 'Client not found' });

    await clientModel.updateClient(id, { file_status, file_comment: file_comment || null });

    res.json({ message: 'File status and comment updated successfully' });
  } catch (err) {
    console.error(`[SERVER_ERROR] updateFileStatus:`, err);
    res.status(500).json({ message: 'Error updating file status/comment' });
  }
};
