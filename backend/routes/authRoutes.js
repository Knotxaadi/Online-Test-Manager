const express = require('express');
const rateLimit = require('express-rate-limit');
const { adminLogin, studentLogin, getMe } = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

// Rate limiter for login endpoints: max 50 requests per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please try again later.' }
});

router.post('/admin/login', authLimiter, adminLogin);
router.post('/student/login', authLimiter, studentLogin);
router.get('/me', requireAuth, getMe);

module.exports = router;
