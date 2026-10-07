const pool = require('../config/db');

/**
 * Get all tests
 * Admin: lists all tests with question bank statistics
 * Student: lists active tests with their personal attempt status
 * GET /api/tests
 */
const getAllTests = async (req, res, next) => {
  try {
    const isStudent = req.user.role === 'student';

    if (isStudent) {
      // For student: return active tests with student's attempt status
      const [tests] = await pool.query(
        `SELECT t.id, t.subject_id AS subjectId, s.name AS subjectName, s.code AS subjectCode,
                t.title, t.description, t.duration_minutes AS durationMinutes,
                t.total_questions AS totalQuestions, t.total_marks AS totalMarks,
                t.max_violations AS maxViolations, t.status,
                a.id AS attemptId, a.status AS attemptStatus, a.obtained_marks AS obtainedMarks,
                a.started_at AS attemptStartedAt, a.expires_at AS attemptExpiresAt
         FROM tests t
         JOIN subjects s ON t.subject_id = s.id
         LEFT JOIN attempts a ON t.id = a.test_id AND a.student_id = ?
         WHERE t.status = 'ACTIVE'
         ORDER BY t.id DESC`,
        [req.user.id]
      );
      return res.status(200).json({ tests });
    }

    // For Admin: return all tests with question bank size
    const [tests] = await pool.query(
      `SELECT t.id, t.subject_id AS subjectId, s.name AS subjectName, s.code AS subjectCode,
              t.title, t.description, t.duration_minutes AS durationMinutes,
              t.total_questions AS totalQuestions, t.total_marks AS totalMarks,
              t.max_violations AS maxViolations, t.status, t.created_at AS createdAt,
              (SELECT COUNT(*) FROM questions q WHERE q.subject_id = t.subject_id) AS questionBankCount,
              (SELECT COUNT(*) FROM attempts att WHERE att.test_id = t.id) AS attemptCount
       FROM tests t
       JOIN subjects s ON t.subject_id = s.id
       ORDER BY t.id DESC`
    );

    return res.status(200).json({ tests });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single test by ID
 * GET /api/tests/:id
 */
const getTestById = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid test ID' });
    }

    const [tests] = await pool.query(
      `SELECT t.id, t.subject_id AS subjectId, s.name AS subjectName, s.code AS subjectCode,
              t.title, t.description, t.duration_minutes AS durationMinutes,
              t.total_questions AS totalQuestions, t.total_marks AS totalMarks,
              t.max_violations AS maxViolations, t.status, t.created_at AS createdAt,
              (SELECT COUNT(*) FROM questions q WHERE q.subject_id = t.subject_id) AS questionBankCount
       FROM tests t
       JOIN subjects s ON t.subject_id = s.id
       WHERE t.id = ?`,
      [id]
    );

    if (tests.length === 0) {
      return res.status(404).json({ message: 'Test not found' });
    }

    const test = tests[0];

    // If student, check if test is active or student has an attempt
    if (req.user.role === 'student') {
      const [attempts] = await pool.query(
        'SELECT id, status FROM attempts WHERE test_id = ? AND student_id = ?',
        [id, req.user.id]
      );
      test.userAttempt = attempts[0] || null;
    }

    return res.status(200).json({ test });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new test (Admin)
 * POST /api/tests
 */
const createTest = async (req, res, next) => {
  try {
    const {
      subjectId,
      title,
      description = '',
      durationMinutes,
      totalQuestions,
      totalMarks,
      maxViolations = 3,
      status = 'INACTIVE'
    } = req.body;

    const sId = Number(subjectId);
    const duration = Number(durationMinutes);
    const totalQ = Number(totalQuestions);
    const marks = Number(totalMarks);
    const maxV = Number(maxViolations);

    if (!title || isNaN(sId) || isNaN(duration) || isNaN(totalQ) || isNaN(marks)) {
      return res.status(400).json({
        message: 'Subject, title, duration (mins), total questions, and total marks are required'
      });
    }

    if (duration <= 0 || totalQ <= 0 || marks <= 0) {
      return res.status(400).json({
        message: 'Duration, total questions, and total marks must be positive numbers'
      });
    }

    // Verify subject exists
    const [subjects] = await pool.query('SELECT id FROM subjects WHERE id = ?', [sId]);
    if (subjects.length === 0) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    // AC14: If status is ACTIVE, verify question bank capacity
    if (status === 'ACTIVE') {
      const [[{ bankCount }]] = await pool.query(
        'SELECT COUNT(*) AS bankCount FROM questions WHERE subject_id = ?',
        [sId]
      );
      if (bankCount < totalQ) {
        return res.status(400).json({
          message: `Cannot activate test: subject has only ${bankCount} question(s) in question bank, but ${totalQ} are required.`
        });
      }
    }

    const [result] = await pool.query(
      `INSERT INTO tests 
       (subject_id, title, description, duration_minutes, total_questions, total_marks, max_violations, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [sId, title, description, duration, totalQ, marks, maxV, status]
    );

    return res.status(201).json({
      message: 'Test created successfully',
      test: {
        id: result.insertId,
        subjectId: sId,
        title,
        description,
        durationMinutes: duration,
        totalQuestions: totalQ,
        totalMarks: marks,
        maxViolations: maxV,
        status
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update test details (Admin)
 * PUT /api/tests/:id
 */
const updateTest = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid test ID' });
    }

    const {
      subjectId,
      title,
      description = '',
      durationMinutes,
      totalQuestions,
      totalMarks,
      maxViolations = 3
    } = req.body;

    const sId = Number(subjectId);
    const duration = Number(durationMinutes);
    const totalQ = Number(totalQuestions);
    const marks = Number(totalMarks);
    const maxV = Number(maxViolations);

    if (!title || isNaN(sId) || isNaN(duration) || isNaN(totalQ) || isNaN(marks)) {
      return res.status(400).json({
        message: 'Subject, title, duration (mins), total questions, and total marks are required'
      });
    }

    const [tests] = await pool.query('SELECT id, status FROM tests WHERE id = ?', [id]);
    if (tests.length === 0) {
      return res.status(404).json({ message: 'Test not found' });
    }

    // Verify subject exists
    const [subjects] = await pool.query('SELECT id FROM subjects WHERE id = ?', [sId]);
    if (subjects.length === 0) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    // If test is currently ACTIVE, ensure new total questions is supported by bank
    if (tests[0].status === 'ACTIVE') {
      const [[{ bankCount }]] = await pool.query(
        'SELECT COUNT(*) AS bankCount FROM questions WHERE subject_id = ?',
        [sId]
      );
      if (bankCount < totalQ) {
        return res.status(400).json({
          message: `Cannot update active test: subject has only ${bankCount} question(s) in bank, but ${totalQ} are required.`
        });
      }
    }

    await pool.query(
      `UPDATE tests 
       SET subject_id = ?, title = ?, description = ?, duration_minutes = ?, total_questions = ?, total_marks = ?, max_violations = ? 
       WHERE id = ?`,
      [sId, title, description, duration, totalQ, marks, maxV, id]
    );

    return res.status(200).json({
      message: 'Test updated successfully',
      test: {
        id,
        subjectId: sId,
        title,
        description,
        durationMinutes: duration,
        totalQuestions: totalQ,
        totalMarks: marks,
        maxViolations: maxV
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update test status (Activate/Deactivate) (Admin)
 * AC14: Cannot activate if question bank has fewer questions than total_questions
 * PUT /api/tests/:id/status
 */
const updateTestStatus = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid test ID' });
    }

    const { status } = req.body;
    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ message: 'Status must be ACTIVE or INACTIVE' });
    }

    const [tests] = await pool.query(
      'SELECT id, subject_id AS subjectId, total_questions AS totalQuestions FROM tests WHERE id = ?',
      [id]
    );

    if (tests.length === 0) {
      return res.status(404).json({ message: 'Test not found' });
    }

    const test = tests[0];

    // AC14 Check on Activation
    if (status === 'ACTIVE') {
      const [[{ bankCount }]] = await pool.query(
        'SELECT COUNT(*) AS bankCount FROM questions WHERE subject_id = ?',
        [test.subjectId]
      );

      if (bankCount < test.totalQuestions) {
        return res.status(400).json({
          message: `Cannot activate test: subject has only ${bankCount} question(s) in question bank, but ${test.totalQuestions} are required.`
        });
      }
    }

    await pool.query('UPDATE tests SET status = ? WHERE id = ?', [status, id]);

    return res.status(200).json({
      message: `Test ${status === 'ACTIVE' ? 'activated' : 'deactivated'} successfully`,
      status
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete test (Admin) - Blocked if attempts exist (D-009)
 * DELETE /api/tests/:id
 */
const deleteTest = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid test ID' });
    }

    const [tests] = await pool.query('SELECT id FROM tests WHERE id = ?', [id]);
    if (tests.length === 0) {
      return res.status(404).json({ message: 'Test not found' });
    }

    // Check if test has attempts
    const [[{ attemptCount }]] = await pool.query(
      'SELECT COUNT(*) AS attemptCount FROM attempts WHERE test_id = ?',
      [id]
    );

    if (attemptCount > 0) {
      return res.status(409).json({
        message: 'Cannot delete test with existing student attempts. Please deactivate the test instead to preserve audit records.'
      });
    }

    await pool.query('DELETE FROM tests WHERE id = ?', [id]);
    return res.status(200).json({ message: 'Test deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllTests,
  getTestById,
  createTest,
  updateTest,
  updateTestStatus,
  deleteTest
};
