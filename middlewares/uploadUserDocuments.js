const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Helper to sanitize folder names
const sanitize = (str) => str.replace(/[^a-zA-Z0-9]/g, "");

// Set up storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    try {
      const userName = req.body.name || "Unknown";
      const rawPhone = req.body.phone_number || "1234"; // Must be sent in body
      // const last4 = rawAadhar.slice(-4);
      const safeName = sanitize(userName);

      const folderName = `${safeName}_${rawPhone}`;
      const fullPath = path.join(__dirname, "../uploads/UserDocs", folderName);

      // Create the directory if it doesn't exist
      fs.mkdirSync(fullPath, { recursive: true });

      // Attach folder path to req for controller use
      req.uploadFolder = fullPath;

      cb(null, fullPath);
    } catch (err) {
      cb(new Error("Error while setting up upload folder"));
    }
  },

  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueName = `${file.fieldname}-${Date.now()}${ext}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|pdf/;
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only jpeg, jpg, png, and pdf files are allowed"));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

const uploadUserDocuments = upload.fields([
  { name: "aadhar_card", maxCount: 1 },
  { name: "pan_card", maxCount: 1 },
]);

module.exports = { uploadUserDocuments };
