const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

/**
 * Admin Login
 * POST /api/auth/admin/login
 */
const adminLogin = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    const identifier = username || email;

    if (!identifier || !password) {
      return res.status(400).json({ message: 'Username/email and password are required' });
    }

    const [admins] = await pool.query(
      'SELECT id, username, email, password FROM admins WHERE username = ? OR email = ?',
      [identifier, identifier]
    );

    if (admins.length === 0) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const admin = admins[0];
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { id: admin.id, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    return res.status(200).json({
      token,
      user: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: 'admin'
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Student Login
 * POST /api/auth/student/login
 */
const studentLogin = async (req, res, next) => {
  try {
    const { studentId, rollNumber, roll_number, password } = req.body;
    const identifier = studentId || rollNumber || roll_number;

    if (!identifier || !password) {
      return res.status(400).json({ message: 'Student ID and password are required' });
    }

    const [students] = await pool.query(
      'SELECT id, student_id, name, email, password, status FROM students WHERE student_id = ?',
      [identifier]
    );

    if (students.length === 0) {
      return res.status(401).json({ message: 'Invalid student ID or password' });
    }

    const student = students[0];

    if (student.status !== 'ACTIVE') {
      return res.status(403).json({ message: 'Account is disabled. Please contact administrator.' });
    }

    const isPasswordValid = await bcrypt.compare(password, student.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid student ID or password' });
    }

    const token = jwt.sign(
      { id: student.id, studentId: student.student_id, role: 'student' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    return res.status(200).json({
      token,
      user: {
        id: student.id,
        studentId: student.student_id,
        name: student.name,
        email: student.email,
        role: 'student'
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current authenticated user profile
 * GET /api/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    return res.status(200).json({ user: req.user });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  adminLogin,
  studentLogin,
  getMe
};
