const express = require('express');
const router = express.Router();

const clientController = require('../controllers/clientController');
const { upload, imageFields } = require('../middlewares/uploadMiddleware');
const verifyToken = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const validateCreator = require('../middlewares/validateCreator');
const authenticate = require('../middlewares/authenticate');
// ✅ Create a new client (Manager or Franchaisee or Admin)
router.post(
  '/',
  verifyToken,
  // validateCreator, // Middleware
  authorize('admin', 'manager', 'franchaisee'),
  upload.fields(imageFields),
  clientController.createClient
);

// ✅ Get clients created by logged-in user
router.get(
  '/created/me',
  verifyToken,
  authorize('admin', 'manager', 'franchaisee'),
  clientController.getClientsCreatedByMe
);

router.get('/download/:id',
     verifyToken,
     authorize('admin'),
     clientController.downloadClientById
);


// ✅ Count clients created by logged-in user
router.get(
  '/created/count/me',
  verifyToken,
  authorize('admin', 'manager', 'franchaisee'),
  clientController.countClientsCreatedByMe
);

// ✅ Get all clients (admin = all, others = created by them)
router.get(
  '/all',
  verifyToken,
  authorize('admin', 'manager', 'franchaisee'),
  clientController.getClients
);

// ✅ Get a single client by ID (only if accessible)
router.get(
  '/:id',
  verifyToken,
  authorize('admin', 'manager', 'franchaisee'),
  clientController.getClientById
);

// ✅ Delete a client (admin only for now – could allow creator in controller logic)
router.delete(
  '/:id',
  verifyToken,
  authorize('admin', 'manager', 'franchaisee'), // Only admin can delete at route level; fine-grain logic inside controller
  clientController.deleteClient
);

// ✅ Update a client (admin only for now)
router.put(
  '/:id',
  verifyToken,
    authorize('admin', 'manager', 'franchaisee'),
 // Only admin can update at route level; fine-grain logic inside controller
  upload.fields(imageFields),
  clientController.updateClient
);

// -------------------- UPDATE FILE STATUS / COMMENT (ADMIN ONLY) --------------------
router.patch(
  '/:id/file-status',
  verifyToken,
  authenticate,
  authorize('Admin'), // Only admin can update file status/comment
  clientController.updateFileStatus
);


module.exports = router;
