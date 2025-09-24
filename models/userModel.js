const db = require('../config/db');

// ✅ Create a new user
exports.createUser = (data) => {
  const sql = `
    INSERT INTO users (
      name, email, phone_number, address, location_for_management,
      role, aadhar_card, pan_card, bank_name, account_number,
      ifsc_code, bank_account_type, password, special_id, created_by
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const values = [
    data.name,
    data.email,
    data.phone_number,
    data.address,
    data.location_for_management,
    data.role,
    data.aadhar_card,      // image path or URL
    data.pan_card,         // image path or URL
    data.bank_name,
    data.account_number,
    data.ifsc_code,
    data.bank_account_type,
    data.password,
    data.special_id,
    data.created_by
  ];
  return new Promise((resolve, reject) => {
    db.query(sql, values, (err, result) => {
      if (err) return reject(err);
      resolve(result.insertId);
    });
  });
};


// ✅ Get user by email
exports.getUserByEmail = (email) => {
  return new Promise((resolve, reject) => {
    db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
      if (err) return reject(err);
      resolve(results[0] || null);
    });
  });
};

// UserModel.js

exports.getUserById = (id) => {
  const sql = "SELECT * FROM users WHERE id = ?";
  return new Promise((resolve, reject) => {
    db.query(sql, [id], (err, results) => {
      if (err) return reject(err);
      resolve(results[0] || null); // return single user or null
    });
  });
};


// ✅ Get users created by a specific user (optionally filtered by role)
exports.getUsersCreatedBy = (creatorId, role = null) => {
  return new Promise((resolve, reject) => {
    const sql = role
      ? 'SELECT * FROM users WHERE created_by = ? AND role = ?'
      : 'SELECT * FROM users WHERE created_by = ?';
    const params = role ? [creatorId, role] : [creatorId];
    db.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

// ✅ Count users created by a specific user for a role
exports.getUsersCountByRole = (creatorId, role) => {
  return new Promise((resolve, reject) => {
    db.query(
      'SELECT COUNT(*) AS count FROM users WHERE created_by = ? AND role = ?',
      [creatorId, role],
      (err, results) => {
        if (err) return reject(err);
        resolve(results[0].count);
      }
    );
  });
};

// ✅ Update user by ID
// UserModel.js
exports.updateUser = (id, data) => {
  const sql = `
    UPDATE users SET
      email = ?, 
      phone_number = ?, 
      address = ?, 
      location_for_management = ?,
      aadhar_card = ?, 
      pan_card = ?, 
      bank_name = ?, 
      account_number = ?,
      ifsc_code = ?, 
      bank_account_type = ?
    WHERE id = ?
  `;

  const values = [
    data.email,
    data.phone_number,
    data.address,
    data.location_for_management,
    data.aadhar_card,
    data.pan_card,
    data.bank_name,
    data.account_number,
    data.ifsc_code,
    data.bank_account_type,
    id
  ];

  return new Promise((resolve, reject) => {
    db.query(sql, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};


// ✅ Delete user by ID
exports.deleteUser = (id) => {
  return new Promise((resolve, reject) => {
    db.query('DELETE FROM users WHERE id = ?', [id], (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};

// ✅ Get user by special ID
exports.getUserBySpecialId = (specialId) => {
  return new Promise((resolve, reject) => {
    db.query('SELECT * FROM users WHERE special_id = ?', [specialId], (err, results) => {
      if (err) return reject(err);
      resolve(results[0] || null);
    });
  });
};

// ✅ Get user by both email and special ID
exports.getUserByEmailAndSpecialId = (email, specialId) => {
  return new Promise((resolve, reject) => {
    db.query(
      'SELECT * FROM users WHERE email = ? AND special_id = ?',
      [email, specialId],
      (err, results) => {
        if (err) return reject(err);
        resolve(results[0] || null);
      }
    );
  });
};

// ✅ Store refresh token
exports.storeRefreshToken = (special_id, token) => {
  const sql = 'INSERT INTO refresh_tokens (special_id, token) VALUES (?, ?)';
  return new Promise((resolve, reject) => {
    db.query(sql, [special_id, token], (err, result) => {
      if (err) return reject(err);
      resolve(result.insertId);
    });
  });
};

// ✅ Delete refresh token
exports.deleteRefreshToken = (special_id) => {
  const sql = 'DELETE FROM refresh_tokens WHERE special_id = ?';
  return new Promise((resolve, reject) => {
    db.query(sql, [special_id], (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};


exports.getUsersByRole  = async (role) => {
  const sql = `
    SELECT id, name, email, phone_number, address, location_for_management,
           role, special_id, created_by, bank_name, account_number, ifsc_code,
           bank_account_type, aadhar_card, pan_card, created_at, updated_at
    FROM users
    WHERE role = ?
  `;

  // Use execute() for prepared statement
  const [rows] = await db.promise().execute(sql, [role]);
  return rows;
};







