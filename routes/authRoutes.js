const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticate = require('../middlewares/authenticate');
const userController = require('../controllers/userController');
const { uploadUserDocuments } = require('../middlewares/uploadUserDocuments');


// Middlewares
const { body } = require('express-validator');
const authorize = require('../middlewares/authorize');

// Registration Route
router.post(
  '/register',
  uploadUserDocuments,         // ✅ Multer parses req.body and req.files here
  authController.register
);

// Login Route
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('special_id').notEmpty().withMessage('Special ID is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  authController.login
);

// Logout Route
router.post('/logout', authenticate, authController.logout);

// Refresh Token
router.post(
  '/refresh-token',
  [
    body('refreshToken').notEmpty().withMessage('Refresh token is required'),
  ],
  authController.refreshToken
);

module.exports = router;
