// const db = require('../config/db');

// const generateSpecialID = (name, role, callback) => {
//   const prefix = role.slice(0, 3).toUpperCase();
//   const cleanName = name.replace(/\s+/g, ''); // remove all whitespace

//   const query = `SELECT COUNT(*) AS count FROM users WHERE special_id LIKE '${prefix}@%'`;

//   db.query(query, (err, results) => {
//     if (err) return callback(err);

//     const count = results[0].count + 1;
//     const special_id = `${prefix}@${cleanName}#${count}`;

//     callback(null, special_id);
//   });
// };

// module.exports = generateSpecialID;

const db = require('../config/db');


const generateSpecialID = (name, role) => {
  return new Promise((resolve, reject) => {
    try {
      // Basic validation
      if (!name || typeof name !== 'string' || !name.trim()) {
        return reject(new Error('Invalid or missing name.'));
      }

      if (!role || typeof role !== 'string' || !role.trim()) {
        return reject(new Error('Invalid or missing role.'));
      }

      // Clean and validate role
      const validRoles = ['admin', 'manager', 'franchaisee'];
      const roleLower = role.toLowerCase();

      if (!validRoles.includes(roleLower)) {
        return reject(new Error(`Role must be one of: ${validRoles.join(', ')}`));
      }

      const prefix = roleLower.slice(0, 3).toUpperCase();
      const cleanName = name.replace(/\s+/g, '');

      const likePattern = `${prefix}@%`;

      // Use parameterized query to avoid SQL injection
      const query = `SELECT COUNT(*) AS count FROM users WHERE special_id LIKE ?`;

      db.query(query, [likePattern], (err, results) => {
        if (err) return reject(new Error('Database error while generating special_id'));

        const count = (results && results[0] && results[0].count) || 0;
        const special_id = `${prefix}@${cleanName}#${count + 1}`;

        return resolve(special_id);
      });
    } catch (error) {
      return reject(error);
    }
  });
};

module.exports = generateSpecialID;

