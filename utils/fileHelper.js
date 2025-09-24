const fs = require('fs');
const path = require('path');

/**
 * Deletes a single file if it exists
 * @param {string} filePath - Absolute path to the file
 */
const deleteFile = (filePath) => {
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`[FILE_DELETED] ${filePath}`);
    } catch (err) {
      console.error(`[DELETE_FILE_ERROR] ${filePath}`, err.message);
    }
  }
};

/**
 * Deletes a folder and all its contents recursively
 * @param {string} folderPath - Absolute path to folder
 */
const deleteFolderRecursive = (folderPath) => {
  if (fs.existsSync(folderPath)) {
    try {
      fs.rmSync(folderPath, { recursive: true, force: true });
      console.log(`[FOLDER_DELETED] ${folderPath}`);
    } catch (err) {
      console.error(`[DELETE_FOLDER_ERROR] ${folderPath}`, err.message);
    }
  }
};

module.exports = {
  deleteFile,
  deleteFolderRecursive,
};
