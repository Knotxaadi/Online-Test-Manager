const pool = require('../config/db');
const { evaluateAttempt } = require('../utils/evaluate');

/**
 * Start a new test attempt or resume an existing in-progress attempt
 * Student only
 * POST /api/attempts/start
 */
const startAttempt = async (req, res, next) => {
  let conn;
  try {
    const studentId = req.user.id;
    const { testId } = req.body;
    const tId = Number(testId);

    if (isNaN(tId)) {
      return res.status(400).json({ message: 'Valid test ID is required' });
    }

    // 1. Fetch test details
    const [tests] = await pool.query(
      `SELECT t.id, t.subject_id AS subjectId, t.title, t.duration_minutes AS durationMinutes,
              t.total_questions AS totalQuestions, t.total_marks AS totalMarks,
              t.max_violations AS maxViolations, t.status
       FROM tests t
       WHERE t.id = ?`,
      [tId]
    );

    if (tests.length === 0) {
      return res.status(404).json({ message: 'Test not found' });
    }

    const test = tests[0];
    if (test.status !== 'ACTIVE') {
      return res.status(400).json({ message: 'This test is not currently active' });
    }

    // 2. Check for existing attempt
    const [existingAttempts] = await pool.query(
      `SELECT id, status, started_at AS startedAt, expires_at AS expiresAt
       FROM attempts
       WHERE student_id = ? AND test_id = ?`,
      [studentId, tId]
    );

    let attemptId;
    let startedAt;
    let expiresAt;

    if (existingAttempts.length > 0) {
      const existing = existingAttempts[0];

      if (existing.status === 'SUBMITTED' || existing.status === 'AUTO_SUBMITTED') {
        return res.status(409).json({ message: 'You have already attempted and submitted this test.' });
      }

      // Check lazy expiry (5 seconds grace period)
      const now = new Date();
      const expiryWithGrace = new Date(new Date(existing.expiresAt).getTime() + 5000);

      if (now > expiryWithGrace) {
        const result = await evaluateAttempt(existing.id, 'AUTO_SUBMITTED');
        return res.status(409).json({
          message: 'Test time has expired. Your attempt was auto-submitted.',
          autoSubmitted: true,
          result
        });
      }

      // Resume in-progress attempt
      attemptId = existing.id;
      startedAt = existing.startedAt;
      expiresAt = existing.expiresAt;
    } else {
      // 3. Pick N random questions from subject bank and create attempt in a transaction
      conn = await pool.getConnection();
      await conn.beginTransaction();

      const [randomQuestions] = await conn.query(
        `SELECT id FROM questions 
         WHERE subject_id = ? 
         ORDER BY RAND() 
         LIMIT ?`,
        [test.subjectId, test.totalQuestions]
      );

      if (randomQuestions.length < test.totalQuestions) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({
          message: `Question bank has insufficient questions (${randomQuestions.length}/${test.totalQuestions}) to start this test.`
        });
      }

      // Insert new attempt
      const [attemptResult] = await conn.query(
        `INSERT INTO attempts 
         (student_id, test_id, status, started_at, expires_at) 
         VALUES (?, ?, 'IN_PROGRESS', NOW(), DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
        [studentId, tId, test.durationMinutes]
      );

      attemptId = attemptResult.insertId;

      // Insert attempt_questions
      for (let i = 0; i < randomQuestions.length; i++) {
        await conn.query(
          'INSERT INTO attempt_questions (attempt_id, question_id, question_order) VALUES (?, ?, ?)',
          [attemptId, randomQuestions[i].id, i + 1]
        );
      }

      // Fetch saved timestamps
      const [[timestamps]] = await conn.query(
        'SELECT started_at AS startedAt, expires_at AS expiresAt FROM attempts WHERE id = ?',
        [attemptId]
      );

      startedAt = timestamps.startedAt;
      expiresAt = timestamps.expiresAt;

      await conn.commit();
      conn.release();
      conn = null;
    }

    // 4. Fetch questions and options strictly WITHOUT is_correct
    const [assignedQuestions] = await pool.query(
      `SELECT q.id, q.question_text AS questionText, q.marks, aq.question_order AS questionOrder
       FROM attempt_questions aq
       JOIN questions q ON aq.question_id = q.id
       WHERE aq.attempt_id = ?
       ORDER BY aq.question_order ASC`,
      [attemptId]
    );

    const questionIds = assignedQuestions.map(q => q.id);

    const [options] = await pool.query(
      `SELECT id, question_id AS questionId, option_text AS optionText
       FROM options
       WHERE question_id IN (?)
       ORDER BY id ASC`,
      [questionIds]
    );

    // Group options by questionId
    const optionsByQ = {};
    for (const opt of options) {
      if (!optionsByQ[opt.questionId]) {
        optionsByQ[opt.questionId] = [];
      }
      optionsByQ[opt.questionId].push({
        id: opt.id,
        optionText: opt.optionText
      });
    }

    const formattedQuestions = assignedQuestions.map(q => ({
      id: q.id,
      questionText: q.questionText,
      marks: q.marks,
      questionOrder: q.questionOrder,
      options: optionsByQ[q.id] || []
    }));

    // Fetch student's current saved answers
    const [savedAnswers] = await pool.query(
      'SELECT question_id AS questionId, selected_option_id AS selectedOptionId FROM answers WHERE attempt_id = ?',
      [attemptId]
    );

    const answersMap = {};
    for (const ans of savedAnswers) {
      answersMap[ans.questionId] = ans.selectedOptionId;
    }

    // Fetch violation count
    const [[{ violationCount }]] = await pool.query(
      'SELECT COUNT(*) AS violationCount FROM violations WHERE attempt_id = ?',
      [attemptId]
    );

    return res.status(200).json({
      attempt: {
        id: attemptId,
        testId: tId,
        title: test.title,
        durationMinutes: test.durationMinutes,
        totalQuestions: test.totalQuestions,
        totalMarks: test.totalMarks,
        maxViolations: test.maxViolations,
        startedAt,
        expiresAt,
        serverNow: new Date().toISOString(),
        violationCount
      },
      questions: formattedQuestions,
      answers: answersMap
    });
  } catch (error) {
    if (conn) {
      await conn.rollback();
      conn.release();
    }
    next(error);
  }
};

/**
 * Get active test attempt details
 * Student only
 * GET /api/attempts/:id
 */
const getAttempt = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const attemptId = Number(req.params.id);

    if (isNaN(attemptId)) {
      return res.status(400).json({ message: 'Invalid attempt ID' });
    }

    const [attempts] = await pool.query(
      `SELECT a.id, a.student_id AS studentId, a.test_id AS testId, a.status,
              a.started_at AS startedAt, a.expires_at AS expiresAt,
              t.title, t.duration_minutes AS durationMinutes, t.total_questions AS totalQuestions,
              t.total_marks AS totalMarks, t.max_violations AS maxViolations
       FROM attempts a
       JOIN tests t ON a.test_id = t.id
       WHERE a.id = ?`,
      [attemptId]
    );

    if (attempts.length === 0) {
      return res.status(404).json({ message: 'Attempt not found' });
    }

    const attempt = attempts[0];

    // Ownership check
    if (attempt.studentId !== studentId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied: not your attempt' });
    }

    // Lazy expiry check if IN_PROGRESS
    if (attempt.status === 'IN_PROGRESS') {
      const now = new Date();
      const expiryWithGrace = new Date(new Date(attempt.expiresAt).getTime() + 5000);

      if (now > expiryWithGrace) {
        const result = await evaluateAttempt(attemptId, 'AUTO_SUBMITTED');
        return res.status(200).json({
          attempt: {
            id: attemptId,
            status: 'AUTO_SUBMITTED',
            autoSubmitted: true,
            message: 'Test time has expired. Attempt auto-submitted.'
          },
          result
        });
      }
    }

    // If attempt is already SUBMITTED or AUTO_SUBMITTED
    if (attempt.status !== 'IN_PROGRESS') {
      const [results] = await pool.query(
        'SELECT * FROM results WHERE attempt_id = ?',
        [attemptId]
      );
      return res.status(200).json({
        attempt,
        result: results[0] || null
      });
    }

    // Fetch assigned questions without is_correct
    const [assignedQuestions] = await pool.query(
      `SELECT q.id, q.question_text AS questionText, q.marks, aq.question_order AS questionOrder
       FROM attempt_questions aq
       JOIN questions q ON aq.question_id = q.id
       WHERE aq.attempt_id = ?
       ORDER BY aq.question_order ASC`,
      [attemptId]
    );

    const questionIds = assignedQuestions.map(q => q.id);

    const [options] = await pool.query(
      `SELECT id, question_id AS questionId, option_text AS optionText
       FROM options
       WHERE question_id IN (?)
       ORDER BY id ASC`,
      [questionIds]
    );

    const optionsByQ = {};
    for (const opt of options) {
      if (!optionsByQ[opt.questionId]) {
        optionsByQ[opt.questionId] = [];
      }
      optionsByQ[opt.questionId].push({
        id: opt.id,
        optionText: opt.optionText
      });
    }

    const formattedQuestions = assignedQuestions.map(q => ({
      id: q.id,
      questionText: q.questionText,
      marks: q.marks,
      questionOrder: q.questionOrder,
      options: optionsByQ[q.id] || []
    }));

    const [savedAnswers] = await pool.query(
      'SELECT question_id AS questionId, selected_option_id AS selectedOptionId FROM answers WHERE attempt_id = ?',
      [attemptId]
    );

    const answersMap = {};
    for (const ans of savedAnswers) {
      answersMap[ans.questionId] = ans.selectedOptionId;
    }

    const [[{ violationCount }]] = await pool.query(
      'SELECT COUNT(*) AS violationCount FROM violations WHERE attempt_id = ?',
      [attemptId]
    );

    return res.status(200).json({
      attempt: {
        id: attempt.id,
        testId: attempt.testId,
        title: attempt.title,
        status: attempt.status,
        durationMinutes: attempt.durationMinutes,
        totalQuestions: attempt.totalQuestions,
        totalMarks: attempt.totalMarks,
        maxViolations: attempt.maxViolations,
        startedAt: attempt.startedAt,
        expiresAt: attempt.expiresAt,
        serverNow: new Date().toISOString(),
        violationCount
      },
      questions: formattedQuestions,
      answers: answersMap
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Save an answer for a question
 * Student only
 * PUT /api/attempts/:id/answer
 */
const saveAnswer = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const attemptId = Number(req.params.id);
    const { questionId, selectedOptionId } = req.body;

    const qId = Number(questionId);
    const optId = selectedOptionId !== null && selectedOptionId !== undefined ? Number(selectedOptionId) : null;

    if (isNaN(attemptId) || isNaN(qId)) {
      return res.status(400).json({ message: 'Valid attempt ID and question ID are required' });
    }

    // 1. Verify attempt ownership and status
    const [attempts] = await pool.query(
      'SELECT id, student_id AS studentId, status, expires_at AS expiresAt FROM attempts WHERE id = ?',
      [attemptId]
    );

    if (attempts.length === 0) {
      return res.status(404).json({ message: 'Attempt not found' });
    }

    const attempt = attempts[0];
    if (attempt.studentId !== studentId) {
      return res.status(403).json({ message: 'Access denied: not your attempt' });
    }

    if (attempt.status !== 'IN_PROGRESS') {
      return res.status(400).json({ message: 'Cannot save answer: attempt is already submitted' });
    }

    // 2. Expiry check with 5s grace
    const now = new Date();
    const expiryWithGrace = new Date(new Date(attempt.expiresAt).getTime() + 5000);
    if (now > expiryWithGrace) {
      const result = await evaluateAttempt(attemptId, 'AUTO_SUBMITTED');
      return res.status(400).json({
        message: 'Test time has expired. Attempt auto-submitted.',
        autoSubmitted: true,
        result
      });
    }

    // 3. Verify question is in this attempt's assigned questions
    const [assigned] = await pool.query(
      'SELECT id FROM attempt_questions WHERE attempt_id = ? AND question_id = ?',
      [attemptId, qId]
    );

    if (assigned.length === 0) {
      return res.status(400).json({ message: 'Question does not belong to this attempt' });
    }

    // 4. If option selected, verify option belongs to question
    if (optId !== null) {
      const [options] = await pool.query(
        'SELECT id FROM options WHERE id = ? AND question_id = ?',
        [optId, qId]
      );
      if (options.length === 0) {
        return res.status(400).json({ message: 'Selected option does not belong to this question' });
      }
    }

    // 5. Upsert answer
    await pool.query(
      `INSERT INTO answers (attempt_id, question_id, selected_option_id) 
       VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE selected_option_id = VALUES(selected_option_id)`,
      [attemptId, qId, optId]
    );

    return res.status(200).json({
      message: 'Answer saved successfully',
      questionId: qId,
      selectedOptionId: optId
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Log a browser violation (tab switch, window blur, visibility change)
 * Student only
 * POST /api/attempts/:id/violation
 */
const logViolation = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const attemptId = Number(req.params.id);
    const { violationType = 'TAB_SWITCH' } = req.body;

    if (isNaN(attemptId)) {
      return res.status(400).json({ message: 'Invalid attempt ID' });
    }

    const [attempts] = await pool.query(
      `SELECT a.id, a.student_id AS studentId, a.status, a.expires_at AS expiresAt,
              t.max_violations AS maxViolations
       FROM attempts a
       JOIN tests t ON a.test_id = t.id
       WHERE a.id = ?`,
      [attemptId]
    );

    if (attempts.length === 0) {
      return res.status(404).json({ message: 'Attempt not found' });
    }

    const attempt = attempts[0];
    if (attempt.studentId !== studentId) {
      return res.status(403).json({ message: 'Access denied: not your attempt' });
    }

    if (attempt.status !== 'IN_PROGRESS') {
      return res.status(400).json({ message: 'Attempt is already submitted' });
    }

    // Record violation
    await pool.query(
      'INSERT INTO violations (attempt_id, violation_type) VALUES (?, ?)',
      [attemptId, violationType]
    );

    // Count violations
    const [[{ count }]] = await pool.query(
      'SELECT COUNT(*) AS count FROM violations WHERE attempt_id = ?',
      [attemptId]
    );

    const maxViolations = attempt.maxViolations || 3;

    if (count >= maxViolations) {
      const result = await evaluateAttempt(attemptId, 'AUTO_SUBMITTED');
      return res.status(200).json({
        autoSubmitted: true,
        violationCount: count,
        maxViolations,
        message: 'Maximum browser violations reached. Your test has been auto-submitted.',
        result
      });
    }

    return res.status(200).json({
      autoSubmitted: false,
      violationCount: count,
      maxViolations,
      message: `Violation recorded (${count}/${maxViolations})`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Submit test attempt and compute final score
 * Student only
 * POST /api/attempts/:id/submit
 */
const submitAttempt = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const attemptId = Number(req.params.id);

    if (isNaN(attemptId)) {
      return res.status(400).json({ message: 'Invalid attempt ID' });
    }

    const [attempts] = await pool.query(
      'SELECT id, student_id AS studentId, status, expires_at AS expiresAt FROM attempts WHERE id = ?',
      [attemptId]
    );

    if (attempts.length === 0) {
      return res.status(404).json({ message: 'Attempt not found' });
    }

    const attempt = attempts[0];
    if (attempt.studentId !== studentId) {
      return res.status(403).json({ message: 'Access denied: not your attempt' });
    }

    if (attempt.status !== 'IN_PROGRESS') {
      return res.status(400).json({ message: 'Attempt is already submitted' });
    }

    // Determine status: if submitted past expiry + grace, mark AUTO_SUBMITTED
    const now = new Date();
    const expiryWithGrace = new Date(new Date(attempt.expiresAt).getTime() + 5000);
    const submissionStatus = now > expiryWithGrace ? 'AUTO_SUBMITTED' : 'SUBMITTED';

    const result = await evaluateAttempt(attemptId, submissionStatus);

    return res.status(200).json({
      message: 'Test submitted successfully',
      result
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  startAttempt,
  getAttempt,
  saveAnswer,
  logViolation,
  submitAttempt
};
