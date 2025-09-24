const remarkModel = require('../models/remarkModel');
const clientModel = require('../models/clientModel');
const pool = require('../config/db');
const path = require('path');
const fs = require('fs');

/* ------------------------- helpers: validate/sanitize ------------------------ */

const MAX_REMARK_LEN = 2000;
const MAX_EMAIL_LEN = 254;
const MAX_PHONE_LEN = 20;

function safeTrim(s) {
  return typeof s === 'string' ? s.trim() : s;
}
function collapseWs(s) {
  return typeof s === 'string' ? s.replace(/\s+/g, ' ') : s;
}
function sanitizeText(s, maxLen) {
  s = safeTrim(s);
  s = collapseWs(s);
  if (s && maxLen && s.length > maxLen) s = s.slice(0, maxLen);
  return s;
}

function isEmail(s) {
  if (!s) return false;
  // Simple, pragmatic email check
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}
function isPhone(s) {
  if (!s) return false;
  // Allow digits, +, -, spaces, parentheses; must contain at least 7 digits
  if (!/^[0-9+\-\s()]+$/.test(s)) return false;
  const digits = s.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

function apiError(res, status, message, code = undefined, details = undefined) {
  const payload = { message };
  if (code) payload.code = code;
  if (process.env.NODE_ENV === 'development' && details) payload.details = details;
  return res.status(status).json(payload);
}

/* --------------------------------- CREATE ---------------------------------- */
// POST /api/remarks  (body: { phone?:string, email?:string, remark:string })
exports.addRemarkForClient = async (req, res) => {
  try {
    let { phone, email, remark } = req.body || {};

    // sanitize
    phone = sanitizeText(phone, MAX_PHONE_LEN);
    email = sanitizeText(email, MAX_EMAIL_LEN);
    remark = sanitizeText(remark, MAX_REMARK_LEN);

    // validate presence
    if (!phone && !email) {
      return apiError(res, 400, 'Either phone or email is required', 'VALIDATION_REQUIRED_FIELD_MISSING');
    }
    if (!remark) {
      return apiError(res, 400, 'Remark is required', 'VALIDATION_REQUIRED_FIELD_MISSING');
    }

    // validate formats
    if (phone && !isPhone(phone)) {
      return apiError(res, 400, 'Invalid phone format', 'VALIDATION_PHONE');
    }
    if (email && !isEmail(email)) {
      return apiError(res, 400, 'Invalid email format', 'VALIDATION_EMAIL');
    }

    // find client safely (model must use parameterized queries)
    const client = await clientModel.findClientByPhoneOrEmail(phone || null, email || null);
    if (!client) {
      return apiError(res, 404, 'Client not found', 'NOT_FOUND');
    }

    // (optional) Authorization check: ensure user can act on this client
    // Example: if non-admin cannot add remarks for other creators
    const role = req.user?.role?.toLowerCase();
    if (role !== 'admin' && client.created_by !== req.user?.special_id) {
      return apiError(res, 403, 'You are not allowed to add remarks to this client', 'FORBIDDEN');
    }

    // insert remark snapshot (model handles parameterization)
    // Expect remarkModel.insertRemark to RETURN insertId
    const insertId = await remarkModel.insertRemark(client, remark, req.user?.special_id || null);

    return res.status(201).json({
      message: 'Remark added successfully',
      remarkId: insertId,
      clientId: client.id,
      clientName: client.name
    });
  } catch (err) {
    console.error('[SERVER_ERROR] addRemarkForClient:', err);
    return apiError(res, 500, 'Error adding remark', 'SERVER_ERROR');
  }
};

/* ---------------------------------- READ ----------------------------------- */
// GET /api/remarks/client/:clientId
exports.viewRemarks = async (req, res) => {
  try {
    const clientId = Number(req.params.clientId);
    if (!Number.isInteger(clientId) || clientId <= 0) {
      return apiError(res, 400, 'Invalid clientId', 'VALIDATION_ID');
    }

    const remarks = await remarkModel.getRemarksByClientId(clientId);
    return res.json(remarks || []);
  } catch (err) {
    console.error('[SERVER_ERROR] viewRemarks:', err);
    return apiError(res, 500, 'Error fetching remarks', 'SERVER_ERROR');
  }
};

// GET /api/remarks
exports.viewAllRemarks = async (req, res) => {
  try {
    const remarks = await remarkModel.getAllRemarks();
    return res.json(remarks || []);
  } catch (err) {
    console.error('[SERVER_ERROR] viewAllRemarks:', err);
    return apiError(res, 500, 'Error fetching all remarks', 'SERVER_ERROR');
  }
};

/* --------------------------------- UPDATE ---------------------------------- */
// PUT /api/remarks/:remarkId  (body: { remark: string })
exports.updateRemark = async (req, res) => {
  try {
    const remarkId = Number(req.params.remarkId);
    let { remark } = req.body || {};

    if (!Number.isInteger(remarkId) || remarkId <= 0) {
      return apiError(res, 400, 'Invalid remarkId', 'VALIDATION_ID');
    }

    remark = sanitizeText(remark, MAX_REMARK_LEN);
    if (!remark) {
      return apiError(res, 400, 'Remark text is required', 'VALIDATION_REQUIRED_FIELD_MISSING');
    }

    const result = await remarkModel.updateRemark(remarkId, remark);

    if (!result || result.affectedRows === 0) {
      return apiError(res, 404, 'Remark not found or not updated', 'NOT_FOUND');
    }

    return res.json({ message: 'Remark updated successfully' });
  } catch (err) {
    console.error('[SERVER_ERROR] updateRemark:', err);
    return apiError(res, 500, 'Error updating remark', 'SERVER_ERROR');
  }
};


/* --------------------------------- DELETE ---------------------------------- */
// DELETE /api/remarks/:remarkId
exports.deleteRemark = async (req, res) => {
  try {
    const { remarkId } = req.params; // ✅ correct param name

    if (!remarkId || isNaN(remarkId)) {
      return res.status(400).json({ message: 'Invalid remark ID' });
    }

    await remarkModel.deleteRemarkById(Number(remarkId));
    res.json({ message: 'Remark deleted successfully' });

  } catch (err) {
    if (err.message === 'Remark not found') {
      return res.status(404).json({ message: err.message });
    }
    console.error('[SERVER_ERROR] deleteRemark:', err);
    res.status(500).json({ message: 'Error deleting remark' });
  }
};

// Upload test file for existing client
// Upload or replace test file
exports.uploadTestFile = async (req, res) => {
  try {
    const remarkId = Number(req.params.id);

    // 🔹 Validate ID
    if (!Number.isInteger(remarkId) || remarkId <= 0) {
      return apiError(res, 400, "Invalid remarkId", "VALIDATION_ID");
    }

    // 🔹 Validate File
    if (!req.file) {
      return apiError(res, 400, "Test file is required", "VALIDATION_REQUIRED_FIELD_MISSING");
    }

    const testFile = req.file.filename;

    // 🔹 Fetch old file from DB
    const oldFile = await remarkModel.getTestFileById(remarkId);
    if (!oldFile) {
      return apiError(res, 404, "Remark not found", "NOT_FOUND");
    }

    // 🔹 Delete old file if exists
    if (oldFile.test_file) {
      const oldFilePath = path.join(__dirname, "../uploads/tests_file", oldFile.test_file);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    // 🔹 Update new file in DB
    const result = await remarkModel.updateTestFile(remarkId, testFile);

    if (!result || result.affectedRows === 0) {
      return apiError(res, 404, "Remark not found or not updated", "NOT_FOUND");
    }

    return res.json({ message: "Test file uploaded successfully" });
  } catch (err) {
    console.error("[SERVER_ERROR] uploadTestFile:", err);
    return apiError(res, 500, "Error uploading test file", "SERVER_ERROR");
  }
};
