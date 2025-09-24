// routes/remarkRoutes.js
const express = require('express');
const router = express.Router();

const remarkController = require('../controllers/remarkController');
const verifyToken = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const upload = require('../middlewares/upload');


// ✅ Add a new remark for a client by phone/email
router.post(
  '/add_remark',
  verifyToken,
  authorize('admin'),
  remarkController.addRemarkForClient
);

// ✅ Get all remarks in the system
router.get(
  '/',
  verifyToken,
  authorize('admin', 'manager', 'franchaisee'),
  remarkController.viewAllRemarks
);

// ✅ Get all remarks for a specific client
router.get(
  '/remark/:clientId',
  verifyToken,
  authorize('admin', 'manager', 'franchaisee'),
  remarkController.viewRemarks
);

// ✅ Update a remark by ID
router.put(
  '/:remarkId',
  verifyToken,
  authorize('admin', 'manager', 'franchaisee'),
  remarkController.updateRemark
);

// ✅ Delete a remark by ID
router.delete(
  '/:remarkId',
  verifyToken,
  authorize('admin', 'manager', 'franchaisee'),
  remarkController.deleteRemark
);

router.post("/:id/upload-test-file", upload.single("test_file"), remarkController.uploadTestFile);


module.exports = router;
