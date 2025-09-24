const db = require('../config/db');

// 🔧 Utility to execute queries as Promises
const query = (sql, values = []) => {
  return new Promise((resolve, reject) => {
    db.query(sql, values, (err, result) => {
      if (err) {
        console.error('MySQL Error:', err);
        return reject(new Error('Database query failed'));
      }
      resolve(result);
    });
  });
};

// ✅ Create a new client
exports.createClient = async (clientData) => {
  // Ensure file_status and file_comment defaults
  const clientWithDefaults = {
    ...clientData,
    file_status: clientData.file_status || 'no_status',
    file_comment: clientData.file_comment || null
  };

  const fields = Object.keys(clientWithDefaults).join(', ');
  const placeholders = Object.keys(clientWithDefaults).map(() => '?').join(', ');
  const values = Object.values(clientWithDefaults);

  const sql = `INSERT INTO clients (${fields}) VALUES (${placeholders})`;

  const result = await query(sql, values);
  return result.insertId;
};

// ✅ Get all clients (admin)
exports.getAllClients = async () => {
  const sql = 'SELECT * FROM clients ORDER BY created_at DESC';
  return await query(sql);
};

// ✅ Get a specific client by ID
exports.getClientById = async (id) => {
  const sql = 'SELECT * FROM clients WHERE id = ?';
  const result = await query(sql, [id]);
  return result[0] || null;
};

// ✅ Get all clients created by a specific user
exports.getClientsByCreator = async (creatorId) => {
  const sql = 'SELECT * FROM clients WHERE created_by = ? ORDER BY created_at DESC';
  return await query(sql, [creatorId]);
};

// ✅ Count number of clients created by a specific user
exports.countClientsByCreator = async (creatorId) => {
  const sql = 'SELECT COUNT(*) AS total FROM clients WHERE created_by = ?';
  const result = await query(sql, [creatorId]);
  return result[0].total;
};

// ✅ Delete a client by ID
exports.deleteClient = async (id) => {
  const sql = 'DELETE FROM clients WHERE id = ?';
  return await query(sql, [id]);
};

// ✅ Update a client by ID
exports.updateClient = async (id, updatedData) => {
  // Validate file_status if it exists
  if ('file_status' in updatedData) {
    const validStatuses = ['no_status', 'approved', 'analyzing', 'rejected'];
    if (!validStatuses.includes(updatedData.file_status)) {
      throw new Error('Invalid file_status value');
    }
  }

  // Ensure file_comment exists in the object (can be null)
  if (!('file_comment' in updatedData)) {
    updatedData.file_comment = null;
  }

  const fields = Object.keys(updatedData).map(key => `${key} = ?`).join(', ');
  const values = Object.values(updatedData);

  const sql = `UPDATE clients SET ${fields} WHERE id = ?`;
  return await query(sql, [...values, id]);
};

// ✅ Find a client by phone or email
exports.findClientByPhoneOrEmail = async (phone, email) => {
  let sql = `
    SELECT id, name, parents_name, email, phone, address, dob, gender
    FROM clients
    WHERE 1=1
  `;
  const values = [];

  if (phone) {
    sql += ` AND phone = ?`;
    values.push(phone);
  }
  if (email) {
    sql += ` AND email = ?`;
    values.push(email);
  }

  sql += ` LIMIT 1`;

  const rows = await query(sql, values);
  return rows.length > 0 ? rows[0] : null;
};
