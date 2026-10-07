const pool = require('../config/db');

/**
 * Get all results
 * Student: sees own results
 * Admin: sees all results with student details
 * GET /api/results
 */
const getAllResults = async (req, res, next) => {
  try {
    const isStudent = req.user.role === 'student';

    if (isStudent) {
      const [results] = await pool.query(
        `SELECT r.id, r.attempt_id AS attemptId, r.total_questions AS totalQuestions,
                r.correct_answers AS correctAnswers, r.wrong_answers AS wrongAnswers,
                r.unanswered, r.total_marks AS totalMarks, r.obtained_marks AS obtainedMarks,
                r.percentage, r.created_at AS createdAt,
                t.id AS testId, t.title AS testTitle,
                s.name AS subjectName, s.code AS subjectCode,
                a.status AS attemptStatus, a.started_at AS startedAt, a.submitted_at AS submittedAt,
                (SELECT COUNT(*) FROM violations v WHERE v.attempt_id = a.id) AS violationCount
         FROM results r
         JOIN attempts a ON r.attempt_id = a.id
         JOIN tests t ON a.test_id = t.id
         JOIN subjects s ON t.subject_id = s.id
         WHERE a.student_id = ?
         ORDER BY r.created_at DESC`,
        [req.user.id]
      );
      return res.status(200).json({ results });
    }

    // Admin: all results
    const [results] = await pool.query(
      `SELECT r.id, r.attempt_id AS attemptId, r.total_questions AS totalQuestions,
              r.correct_answers AS correctAnswers, r.wrong_answers AS wrongAnswers,
              r.unanswered, r.total_marks AS totalMarks, r.obtained_marks AS obtainedMarks,
              r.percentage, r.created_at AS createdAt,
              stu.id AS studentDbId, stu.student_id AS studentId, stu.name AS studentName, stu.email AS studentEmail,
              t.id AS testId, t.title AS testTitle,
              s.name AS subjectName, s.code AS subjectCode,
              a.status AS attemptStatus, a.started_at AS startedAt, a.submitted_at AS submittedAt,
              (SELECT COUNT(*) FROM violations v WHERE v.attempt_id = a.id) AS violationCount
       FROM results r
       JOIN attempts a ON r.attempt_id = a.id
       JOIN students stu ON a.student_id = stu.id
       JOIN tests t ON a.test_id = t.id
       JOIN subjects s ON t.subject_id = s.id
       ORDER BY r.created_at DESC`
    );

    return res.status(200).json({ results });
  } catch (error) {
    next(error);
  }
};

/**
 * Get detailed result for a specific attempt
 * GET /api/results/:attemptId
 */
const getResultByAttemptId = async (req, res, next) => {
  try {
    const attemptId = Number(req.params.attemptId);
    if (isNaN(attemptId)) {
      return res.status(400).json({ message: 'Invalid attempt ID' });
    }

    const [results] = await pool.query(
      `SELECT r.id, r.attempt_id AS attemptId, r.total_questions AS totalQuestions,
              r.correct_answers AS correctAnswers, r.wrong_answers AS wrongAnswers,
              r.unanswered, r.total_marks AS totalMarks, r.obtained_marks AS obtainedMarks,
              r.percentage, r.created_at AS createdAt,
              a.student_id AS studentDbId, a.status AS attemptStatus,
              a.started_at AS startedAt, a.submitted_at AS submittedAt,
              stu.student_id AS studentId, stu.name AS studentName,
              t.id AS testId, t.title AS testTitle,
              s.name AS subjectName, s.code AS subjectCode,
              (SELECT COUNT(*) FROM violations v WHERE v.attempt_id = a.id) AS violationCount
       FROM results r
       JOIN attempts a ON r.attempt_id = a.id
       JOIN students stu ON a.student_id = stu.id
       JOIN tests t ON a.test_id = t.id
       JOIN subjects s ON t.subject_id = s.id
       WHERE r.attempt_id = ?`,
      [attemptId]
    );

    if (results.length === 0) {
      return res.status(404).json({ message: 'Result not found for this attempt' });
    }

    const result = results[0];

    // Ownership check
    if (req.user.role === 'student' && result.studentDbId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied: not your result' });
    }

    return res.status(200).json({ result });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllResults,
  getResultByAttemptId
};
