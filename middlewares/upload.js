const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure uploads/tests_file directory exists
const uploadDir = path.join(__dirname, "../uploads/tests_file");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// File filter for Word or PDF
const fileFilter = (req, file, cb) => {
  const allowedTypes = [".pdf", ".doc", ".docx"];
  if (!allowedTypes.includes(path.extname(file.originalname).toLowerCase())) {
    return cb(new Error("Only Word or PDF files are allowed"));
  }
  cb(null, true);
};

const upload = multer({ storage, fileFilter });

module.exports = upload;
