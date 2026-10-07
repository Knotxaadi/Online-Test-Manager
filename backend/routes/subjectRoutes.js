const express = require('express');
const {
  getAllSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject
} = require('../controllers/subjectController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// Read operations available to all authenticated users (students & admins)
router.get('/', requireAuth, getAllSubjects);
router.get('/:id', requireAuth, getSubjectById);

// Write operations restricted to Admin
router.post('/', requireAuth, requireRole('admin'), createSubject);
router.put('/:id', requireAuth, requireRole('admin'), updateSubject);
router.delete('/:id', requireAuth, requireRole('admin'), deleteSubject);

module.exports = router;
