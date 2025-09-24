const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
require('dotenv').config();
const { validateUserInput } = require("../utils/userValidator");
const db = require("../config/db");
const path = require('path');


const generateSpecialID = require('../utils/generateSpecialID');

// Utilities
const validateEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const validatePassword = (password) =>
  password.length >= 8;

const validateRole = (role) =>
  ['admin', 'manager', 'franchaisee'].includes(role.toLowerCase());

// REGISTER





exports.register = async (req, res) => {
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
  const creatorId = req.user?.special_id || null;

  // ✅ Validate required fields
  const missingFields = validateUserInput(req.body, req.files);
  if (missingFields.length > 0) {
    return res.status(400).json({
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  try {
    // ✅ Check creator validity
  

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
      created_by: creatorId || null,
    };

    // ✅ Insert user
    const userId = await userModel.createUser(userData);

    res.status(201).json({
      message: `${role} created successfully`,
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
// ✅ Helper function to validate required fields





exports.login = async (req, res) => {
  try {
    const { email, special_id, password } = req.body;

    if (!email || !special_id || !password) {
      return res.status(400).json({ message: "Email, Special ID, and Password are required" });
    }

    const user = await userModel.getUserByEmailAndSpecialId(email, special_id);
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }


    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const accessToken = jwt.sign(
      { special_id: user.special_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Store refresh token in DB
    await userModel.storeRefreshToken(user.special_id, accessToken); // You need to make this return a promise too

    res.status(200).json({
      message: `Login successful for ${user.name}`,
      accessToken,
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        special_id: user.special_id,
      },
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// LOGOUT
exports.logout = async (req, res) => {
  const { special_id } = req.user;
  if (!special_id) return res.status(400).json({ message: "Invalid request" });

  try {
    await userModel.deleteRefreshToken(special_id);
    res.json({ message: 'Logout successful' });
  } catch (err) {
    res.status(500).json({ message: "Logout failed", error: err.message });
  }
};


// REFRESH TOKEN
exports.refreshToken = (req, res) => {
  const { token } = req.body;

  if (!token) return res.status(401).json({ message: "Refresh token required" });

  jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: "Invalid or expired refresh token" });

    const newAccessToken = jwt.sign(
      { special_id: decoded.special_id, role: decoded.role },
      process.env.JWT_SECRET,
      { expiresIn: "2d" }
    );

    res.json({ accessToken: newAccessToken });
  });
};



