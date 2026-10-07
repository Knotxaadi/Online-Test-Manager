const express = require('express');
const {
  getAllResults,
  getResultByAttemptId
} = require('../controllers/resultController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(requireAuth);

router.get('/', getAllResults);
router.get('/:attemptId', getResultByAttemptId);

module.exports = router;
