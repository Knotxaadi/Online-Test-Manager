const express = require('express');
const {
  getAllQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  bulkUploadQuestions,
  deleteQuestionsBySubject
} = require('../controllers/questionController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// All question management endpoints are Admin only
router.use(requireAuth, requireRole('admin'));

router.get('/', getAllQuestions);
router.get('/:id', getQuestionById);
router.post('/', createQuestion);
router.post('/bulk-upload', bulkUploadQuestions);
router.put('/:id', updateQuestion);
router.delete('/subject/:subjectId', deleteQuestionsBySubject);
router.delete('/:id', deleteQuestion);

module.exports = router;
