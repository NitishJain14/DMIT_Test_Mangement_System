const jwt = require('jsonwebtoken');
require('dotenv').config();

const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization token is missing or malformed' });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach necessary user info
    req.user = {
      special_id: decoded.special_id,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired. Please log in again.' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ message: 'Invalid token.' });
    }

    console.error('JWT verification error:', error);
    return res.status(500).json({ message: 'Internal Server Error during token validation.' });
  }
 
};

module.exports = authenticate;



// const jwt = require('jsonwebtoken');
// require('dotenv').config();

// const authenticate = (req, res, next) => {
//   const header = req.headers.authorization;
//   if (!header || !header.startsWith('Bearer ')) {
//     return res.status(401).json({ message: 'Access token missing or invalid' });
//   }

//   const token = header.split(' ')[1];

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

//     // Attach only necessary user details
//     req.user = {
//       special_id: decoded.special_id,
//       role: decoded.role,
//     };

//     next();
//   } catch (err) {
//     return res.status(403).json({ message: 'Token is not valid' });
//   }
// };

// module.exports = authenticate;
