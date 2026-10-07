const express = require('express');
const {
  startAttempt,
  getAttempt,
  saveAnswer,
  logViolation,
  submitAttempt
} = require('../controllers/attemptController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// Attempt endpoints are for logged-in students
router.post('/start', requireAuth, requireRole('student'), startAttempt);
router.get('/:id', requireAuth, getAttempt);
router.put('/:id/answer', requireAuth, requireRole('student'), saveAnswer);
router.post('/:id/violation', requireAuth, requireRole('student'), logViolation);
router.post('/:id/submit', requireAuth, requireRole('student'), submitAttempt);

module.exports = router;
