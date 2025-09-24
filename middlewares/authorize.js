const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.user.role?.toLowerCase();

    // Role hierarchy map (higher number = higher access)
    const hierarchy = {
      admin: 3,
      manager: 2,
      franchaisee: 1
    };

    const userLevel = hierarchy[userRole];
    

    // Find the **minimum** level required for any of the allowed roles
    const requiredLevels = allowedRoles.map(role => hierarchy[role.toLowerCase()]);
    const minRequiredLevel = Math.min(...requiredLevels);

    if (!userLevel || requiredLevels.includes(undefined)) {
  return res.status(400).json({ message: 'Invalid role provided' });
}


    if (!userLevel || userLevel < minRequiredLevel) {
      return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
    }

    next();
  };
};

module.exports = authorize;
