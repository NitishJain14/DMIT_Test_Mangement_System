const db = require('../config/db');

// 🔹 Safe query execution with consistent error handling
const query = (sql, values = []) => {
  return new Promise((resolve, reject) => {
    db.query(sql, values, (err, result) => {
      if (err) {
        console.error('[DB_ERROR]', err.sqlMessage || err.message);
        return reject(new Error('Database query failed'));
      }
      resolve(result);
    });
  });
};

// 🔹 Input validation helper
const isNonEmptyString = (val) => typeof val === 'string' && val.trim() !== '';
const isValidId = (id) => Number.isInteger(id) && id > 0;

// ✅ Add a remark for a client (with created_by)
exports.addRemarkForClient = async (clientId, remark, createdBy) => {
  if (!isValidId(clientId)) throw new Error('Invalid client ID');
  if (!isNonEmptyString(remark)) throw new Error('Remark cannot be empty');
  if (!isValidId(createdBy)) throw new Error('Invalid creator ID');

  const sql = `
    INSERT INTO remarks (client_id, remark, created_by, created_at)
    VALUES (?, ?, ?, NOW())
  `;
  const result = await query(sql, [clientId, remark.trim(), createdBy]);
  return result.insertId;
};

exports.deleteRemarkById = async (remarkId) => {
  const sql = 'DELETE FROM remarks WHERE id = ?';
  const result = await query(sql, [remarkId]);

  if (result.affectedRows === 0) {
    throw new Error('Remark not found');
  }

  return true;
};

// ✅ Update a remark by ID
exports.updateRemark = async (remarkId, updatedRemark) => {
  if (!isValidId(remarkId)) throw new Error('Invalid remark ID');
  if (!isNonEmptyString(updatedRemark)) throw new Error('Remark cannot be empty');

  const sql = `
    UPDATE remarks
    SET remark = ?
    WHERE id = ?
  `;
  const result = await query(sql, [updatedRemark.trim(), remarkId]);
  return result; // ✅ Return MySQL result object
};


// ✅ Prevent duplicate remarks for same client
exports.findRemarkByTextAndClient = async (clientId, remark) => {
  if (!isValidId(clientId)) throw new Error('Invalid client ID');
  if (!isNonEmptyString(remark)) throw new Error('Remark cannot be empty');

  const sql = `
    SELECT id, remark, created_by, created_at
    FROM remarks
    WHERE client_id = ? AND remark = ?
    LIMIT 1
  `;
  const rows = await query(sql, [clientId, remark.trim()]);
  return rows.length > 0 ? rows[0] : null;
};

// ✅ Insert remark with full client info
exports.insertRemark = async (client, remark, createdBy) => {
  const sql = `
    INSERT INTO remarks
      (client_id, name, parents_name, email, phone, address, dob, gender, remark, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
  `;

  const values = [
    client.id,
    client.name,
    client.parents_name,
    client.email,
    client.phone,
    client.address,
    client.dob,
    client.gender,
    remark,
    createdBy // ✅ This is now inserted
  ];

  const result = await query(sql, values);
  return result.insertId;
};

// ✅ Get all remarks
exports.getAllRemarks = async () => {
  const sql = `
    SELECT *
    FROM remarks
    ORDER BY created_at DESC
  `;
  return await query(sql);
};

// ✅ Get remarks for a specific client
exports.getRemarksByClientId = async (clientId) => {
  if (!isValidId(clientId)) throw new Error('Invalid client ID');

  const sql = `
    SELECT *
    FROM remarks
    WHERE client_id = ?
    ORDER BY created_at DESC
  `;
  return await query(sql, [clientId]);
};

// Update test_file for existing client
exports.updateTestFile = async (clientId, filename) => {
  const sql = `UPDATE remarks SET test_file = ? WHERE id = ?`;
  const result = await query(
    sql,
    [filename, clientId]
  );
  return result;
};

exports.getTestFileById = async (remarkId) => {
  const sql = `SELECT test_file FROM remarks WHERE id = ?`;
  const rows = await query(sql, [remarkId]);
  return rows[0] || null;
};
