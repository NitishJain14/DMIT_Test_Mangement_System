// controllers/userController.js
const db = require("../config/db");
const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const  generateSpecialID  = require("../utils/generateSpecialID");
const userModel = require('../models/userModel'); // Adjust path as needed
const path = require('path');
const fs = require('fs');
const { validateUserInput } = require("../utils/userValidator");
const { sendWelcomeEmail } = require("../utils/mailer");



const roleHierarchy = {
  admin: 3,
  manager: 2,
  franchaisee: 1,
};



exports.getAllUsersByRole = async (req, res) => {
  let { role } = req.params;

  // Validate role param
  if (!role || typeof role !== "string") {
    return res.status(400).json({ message: "Role is required in the URL and must be a string" });
  }

  // Normalize role: trim and lowercase
  role = role.trim().toLowerCase();

  try {
    const users = await userModel.getUsersByRole(role);

    if (!users || users.length === 0) {
      return res.status(404).json({ message: `No users found with role '${role}'` });
    }

    return res.status(200).json(users);
  } catch (err) {
    console.error("Error fetching users by role:", err);
    return res.status(500).json({ message: "Database error", error: err.message });
  }
};

exports.createUser = async (req, res) => {
  const {
    name,
    email,
    phone_number,
    address,
    location_for_management,
    role,
    bank_name,
    account_number,
    ifsc_code,
    bank_account_type,
    password,
  } = req.body;

  const aadhar_card_file = req.files?.aadhar_card?.[0];
  const pan_card_file = req.files?.pan_card?.[0];
  const creatorId = req.user?.special_id;

  // ✅ Validate required fields
  const missingFields = validateUserInput(req.body, req.files);
  if (missingFields.length > 0) {
    return res.status(400).json({
      message: `Missing required fields: ${missingFields.join(", ")}`,
      errorFields: missingFields,
    });
  }

  try {
    // ✅ Pre-check for existing email
    const existingUser = await userModel.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        message: "User with this email already exists",
        email,
      });
    }

    // ✅ Generate special ID
    const special_id = await generateSpecialID(name, role);

    // ✅ Clean file paths
    const aadhar_card_path = path.relative("uploads", aadhar_card_file.path);
    const pan_card_path = path.relative("uploads", pan_card_file.path);

    // ✅ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Assemble user data
    const userData = {
      name,
      email,
      phone_number,
      address,
      location_for_management: location_for_management || null,
      role,
      aadhar_card: aadhar_card_path,
      pan_card: pan_card_path,
      bank_name,
      account_number,
      ifsc_code,
      bank_account_type,
      password: hashedPassword,
      special_id,
      created_by: creatorId,
    };

    // ✅ Insert user
    const userId = await userModel.createUser(userData);

    // ✅ Get creator name
    const creator = await userModel.getUserBySpecialId(creatorId);

    // ✅ Send welcome email
    await sendWelcomeEmail({
      to: email,
      name,
      email,
      password, // ⚠️ demo only, not for production
      role,
      special_id, // ✅ added special_id
      creatorName: creator?.name || "Admin",
    });

    res.status(201).json({
      message: `${role} created successfully and email sent`,
      user_id: userId,
      special_id,
    });
  } catch (err) {
    console.error("Error creating user:", err);
    res.status(500).json({
      message: "Internal server error",
      error: err.message,
    });
  }
};


exports.updatePassword = async (req, res) => {
  const { email, special_id, newPassword } = req.body;

  if (!email || !special_id || !newPassword) {
    return res.status(400).json({ message: 'Email, special_id, and new password are required.' });
  }

  try {
    // Check if user exists
    const userQuery = 'SELECT * FROM users WHERE email = ? AND special_id = ?';
    db.query(userQuery, [email, special_id], async (err, results) => {
      if (err) {
        console.error('DB error:', err);
        return res.status(500).json({ message: 'Database error', error: err.message });
      }

      if (results.length === 0) {
        return res.status(404).json({ message: 'User not found with provided email and special_id.' });
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      const updateQuery = 'UPDATE users SET password = ? WHERE email = ? AND special_id = ?';
      db.query(updateQuery, [hashedPassword, email, special_id], (updateErr, updateResult) => {
        if (updateErr) {
          console.error('Password update error:', updateErr);
          return res.status(500).json({ message: 'Failed to update password', error: updateErr.message });
        }

        return res.status(200).json({ message: 'Password updated successfully.', special_id: results[0].special_id, email: results[0].email, role: results[0].role, name: results[0].name, updatePassword: newPassword });
      });
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all users (Admin use)
exports.getUsers = async (req, res) => {
  try {
    const [rows] = await db.promise().query(`
      SELECT 
        id,
        name,
        email,
        phone_number,
        address,
        location_for_management,
        role,
        special_id,
        created_by,
        bank_name,
        account_number,
        ifsc_code,
        bank_account_type,
        aadhar_card,
        pan_card
      FROM users
    `);

    res.json(rows);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: "Database error", error: err.message });
  }
};

// GET CLIENTS CREATED BY ME
exports.getUsersCreatedByMe = async (req, res) => {
  try {
    const userId = req.user.special_id;
    // console.log(userId);
    const users = await userModel.getUsersCreatedBy(userId);
    res.json(users);
  } catch (err) {
    console.error(`[SERVER_ERROR] getClientsCreatedByMe:`, err);
    res.status(500).json({ message: 'Error fetching clients' });
  }
};

// Get a user by ID
exports.getUserById = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.promise().query(
      `SELECT 
        id,
        name,
        email,
        phone_number,
        address,
        location_for_management,
        role,
        special_id,
        created_by,
        bank_name,
        account_number,
        ifsc_code,
        bank_account_type,
        aadhar_card,
        pan_card
      FROM users WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(rows[0]);

  } catch (err) {
    console.error("Error fetching user:", err);
    return res.status(500).json({ message: "Database error", error: err.message });
  }
};

// UPDATE USER
exports.updateUser = async (req, res) => {
  const userId = req.params.id;

  try {
    // ✅ Step 1: Get existing user
    const existingUser = await userModel.getUserById(userId);
    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ Step 2: Determine file paths (keep old if no new upload)
    let aadharPath = existingUser.aadhar_card;
    let panPath = existingUser.pan_card;

    if (req.files?.aadhar_card?.[0]) {
      aadharPath = path.relative("uploads", req.files.aadhar_card[0].path);
    }
    if (req.files?.pan_card?.[0]) {
      panPath = path.relative("uploads", req.files.pan_card[0].path);
    }

    // ✅ Step 3: Merge data (DO NOT update name & role)
    const updatedData = {
      email: req.body.email || existingUser.email,
      phone_number: req.body.phone_number || existingUser.phone_number,
      address: req.body.address || existingUser.address,
      location_for_management:
        req.body.location_for_management || existingUser.location_for_management,
      aadhar_card: aadharPath,
      pan_card: panPath,
      bank_name: req.body.bank_name || existingUser.bank_name,
      account_number: req.body.account_number || existingUser.account_number,
      ifsc_code: req.body.ifsc_code || existingUser.ifsc_code,
      bank_account_type: req.body.bank_account_type || existingUser.bank_account_type,
    };

    // ✅ Step 4: Update in DB
    await userModel.updateUser(userId, updatedData);

    res.status(200).json({ message: "User updated successfully" });
  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).json({
      message: "Internal server error",
      error: err.message,
    });
  }
};

// Delete user
exports.deleteUser = (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM users WHERE id = ?", [id], (err, result) => {
    if (err) return res.status(500).json({ message: "Database error", error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted successfully" });
  });
};

// Count users created by me (with optional role filter)
exports.getMyCreatedUsersCount = (req, res) => {
  const createdBy = req.user.special_id;
  const role = req.query.role;

  const sql = `SELECT COUNT(*) AS count FROM users WHERE created_by = ? ${role ? "AND role = ?" : ""}`;
  const params = role ? [createdBy, role] : [createdBy];

  db.query(sql, params, (err, result) => {
    if (err) return res.status(500).json({ message: "Database error", error: err.message });
    res.json({ count: result[0].count });
  });
};