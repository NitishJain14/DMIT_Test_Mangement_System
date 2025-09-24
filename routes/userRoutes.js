// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authenticate = require('../middlewares/authenticate');
const checkCreatePermission = require('../middlewares/checkCreatePermission');
const authorize = require('../middlewares/authorize');
const validateCreator = require('../middlewares/validateCreator');
const { uploadUserDocuments } = require('../middlewares/uploadUserDocuments');


// Create a user (Admin and Manager can create users)
router.post(
  '/',
  authenticate,                // ✅ Auth first
  uploadUserDocuments,         // ✅ Multer parses req.body and req.files here
  authorize('Admin', 'Manager'), 
  validateCreator, 
  checkCreatePermission, 
  userController.createUser
);

// Get users by role (Admin sees all, others see created ones only)
router.get('/getUserByRole/:role', authenticate, authorize('Admin', 'Manager', 'Franchaisee'), userController.getAllUsersByRole);


router.post('/update-password', authenticate, authorize('Admin'), userController.updatePassword);


// Get total created users by this user
router.get('/count', authenticate, authorize('Admin'), userController.getMyCreatedUsersCount);

// Get total created users by this user
router.get(
  '/created/me',
  authenticate,
  userController.getUsersCreatedByMe
);

// Get all users (admin only)
router.get('/all', authenticate, authorize('Admin'), userController.getUsers);

// Get, update, delete by ID
router.get('/:id', authenticate,authorize('Admin'), userController.getUserById);
router.put('/:id', authenticate, uploadUserDocuments, authorize('Admin'), userController.updateUser);
router.delete('/:id', authenticate, authorize('Admin'), userController.deleteUser);

module.exports = router;
