const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Allowed image formats
const allowedTypes = ['.jpg', '.jpeg', '.png'];

// Storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let name = req.body.name || 'unknown';
    let phone = req.body.phone || '0000000000';

    // Clean and format folder name
    name = name.trim().replace(/\s+/g, '_');
    const last4 = phone.slice(-4);
    const folder = `${name}_${last4}`;

    const dir = path.join(__dirname, '../uploads/clients', folder);
    fs.mkdirSync(dir, { recursive: true });

    // Save for use in controller if needed
    req.clientUploadPath = dir;

    cb(null, dir);
  },

  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = file.fieldname.replace(/\s+/g, '_');
    cb(null, `${safeName}_${Date.now()}${ext}`);
  },
});

// File filter for image types
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only .jpg, .jpeg, .png files allowed'), false);
  }
};

// Upload middleware
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

// All image fields (same as yours)
const imageFields = [
  { name: 'left_thumb_front' }, { name: 'left_thumb_left' }, { name: 'left_thumb_right' },
  { name: 'left_index_front' }, { name: 'left_index_left' }, { name: 'left_index_right' },
  { name: 'left_middle_front' }, { name: 'left_middle_left' }, { name: 'left_middle_right' },
  { name: 'left_ring_front' }, { name: 'left_ring_left' }, { name: 'left_ring_right' },
  { name: 'left_little_front' }, { name: 'left_little_left' }, { name: 'left_little_right' },

  { name: 'right_thumb_front' }, { name: 'right_thumb_left' }, { name: 'right_thumb_right' },
  { name: 'right_index_front' }, { name: 'right_index_left' }, { name: 'right_index_right' },
  { name: 'right_middle_front' }, { name: 'right_middle_left' }, { name: 'right_middle_right' },
  { name: 'right_ring_front' }, { name: 'right_ring_left' }, { name: 'right_ring_right' },
  { name: 'right_little_front' }, { name: 'right_little_left' }, { name: 'right_little_right' },

  { name: 'full_hand_left_image' },
  { name: 'full_hand_right_image' }
];

// Exported
module.exports = {
  upload,
  imageFields
};
