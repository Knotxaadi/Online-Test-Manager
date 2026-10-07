const jwt = require('jsonwebtoken');
const pool = require('../config/db');

/**
 * Middleware to authenticate JWT token and attach user to req.user
 */
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication token required' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Authentication token required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    if (decoded.role === 'student') {
      const [students] = await pool.query(
        'SELECT id, student_id, name, email, status FROM students WHERE id = ?',
        [decoded.id]
      );

      if (students.length === 0) {
        return res.status(401).json({ message: 'User not found' });
      }

      const student = students[0];
      if (student.status !== 'ACTIVE') {
        return res.status(403).json({ message: 'Account is disabled. Please contact administrator.' });
      }

      req.user = {
        id: student.id,
        studentId: student.student_id,
        name: student.name,
        email: student.email,
        role: 'student'
      };
    } else if (decoded.role === 'admin') {
      const [admins] = await pool.query(
        'SELECT id, username, email FROM admins WHERE id = ?',
        [decoded.id]
      );

      if (admins.length === 0) {
        return res.status(401).json({ message: 'User not found' });
      }

      const admin = admins[0];
      req.user = {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: 'admin'
      };
    } else {
      return res.status(403).json({ message: 'Invalid token role' });
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to restrict route access by role(s)
 * @param  {...string} roles - Allowed roles e.g. 'admin', 'student'
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied: insufficient permissions' });
    }
    next();
  };
};

module.exports = {
  requireAuth,
  requireRole
};
