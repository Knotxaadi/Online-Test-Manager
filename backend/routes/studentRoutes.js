const express = require('express');
const {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  resetStudentPassword,
  deleteStudent,
  bulkUploadStudents
} = require('../controllers/studentController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// All student management endpoints are Admin only
router.use(requireAuth, requireRole('admin'));

router.get('/', getAllStudents);
router.get('/:id', getStudentById);
router.post('/', createStudent);
router.post('/bulk-upload', bulkUploadStudents);
router.put('/:id', updateStudent);
router.put('/:id/reset-password', resetStudentPassword);
router.delete('/:id', deleteStudent);

module.exports = router;
