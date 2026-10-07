const express = require('express');
const {
  getAllTests,
  getTestById,
  createTest,
  updateTest,
  updateTestStatus,
  deleteTest
} = require('../controllers/testController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// Read tests: available to authenticated users (role-specific filtering inside controller)
router.get('/', requireAuth, getAllTests);
router.get('/:id', requireAuth, getTestById);

// Admin-only mutation endpoints
router.post('/', requireAuth, requireRole('admin'), createTest);
router.put('/:id', requireAuth, requireRole('admin'), updateTest);
router.put('/:id/status', requireAuth, requireRole('admin'), updateTestStatus);
router.delete('/:id', requireAuth, requireRole('admin'), deleteTest);

module.exports = router;
