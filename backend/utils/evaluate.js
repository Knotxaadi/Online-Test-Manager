const pool = require('../config/db');

/**
 * Evaluates a test attempt and records results in a database transaction
 * @param {number} attemptId - Attempt ID
 * @param {'SUBMITTED' | 'AUTO_SUBMITTED'} status - Submission status
 * @param {object} [existingConn] - Optional existing DB connection
 * @returns {Promise<object>} Evaluated result summary
 */
const evaluateAttempt = async (attemptId, status = 'SUBMITTED', existingConn = null) => {
  let conn = existingConn;
  let isLocalTransaction = false;

  try {
    if (!conn) {
      conn = await pool.getConnection();
      await conn.beginTransaction();
      isLocalTransaction = true;
    }

    // 1. Fetch attempt and test metadata
    const [attempts] = await conn.query(
      `SELECT a.id, a.student_id AS studentId, a.test_id AS testId, a.status,
              t.total_questions AS testTotalQuestions, t.total_marks AS testTotalMarks
       FROM attempts a
       JOIN tests t ON a.test_id = t.id
       WHERE a.id = ? FOR UPDATE`,
      [attemptId]
    );

    if (attempts.length === 0) {
      throw new Error(`Attempt ${attemptId} not found`);
    }

    const attempt = attempts[0];

    // If already evaluated, return the existing result
    if (attempt.status === 'SUBMITTED' || attempt.status === 'AUTO_SUBMITTED') {
      const [existingResults] = await conn.query(
        `SELECT attempt_id AS attemptId, total_questions AS totalQuestions,
                correct_answers AS correctAnswers, wrong_answers AS wrongAnswers,
                unanswered, total_marks AS totalMarks, obtained_marks AS obtainedMarks,
                percentage, created_at AS createdAt
         FROM results
         WHERE attempt_id = ?`,
        [attemptId]
      );
      if (existingResults.length > 0) {
        if (isLocalTransaction) {
          await conn.commit();
        }
        return {
          ...existingResults[0],
          status: attempt.status
        };
      }
    }

    // 2. Fetch all questions assigned to this attempt
    const [assignedQuestions] = await conn.query(
      `SELECT aq.question_id AS questionId, q.marks
       FROM attempt_questions aq
       JOIN questions q ON aq.question_id = q.id
       WHERE aq.attempt_id = ?
       ORDER BY aq.question_order ASC`,
      [attemptId]
    );

    if (assignedQuestions.length === 0) {
      throw new Error(`No questions assigned to attempt ${attemptId}`);
    }

    const questionIds = assignedQuestions.map(q => q.questionId);

    // 3. Fetch correct option for each question
    const [correctOptions] = await conn.query(
      `SELECT question_id AS questionId, id AS correctOptionId
       FROM options
       WHERE question_id IN (?) AND is_correct = 1`,
      [questionIds]
    );

    const correctMap = new Map();
    for (const row of correctOptions) {
      correctMap.set(row.questionId, row.correctOptionId);
    }

    // 4. Fetch student's submitted answers
    const [savedAnswers] = await conn.query(
      `SELECT question_id AS questionId, selected_option_id AS selectedOptionId
       FROM answers
       WHERE attempt_id = ?`,
      [attemptId]
    );

    const answerMap = new Map();
    for (const ans of savedAnswers) {
      answerMap.set(ans.questionId, ans.selectedOptionId);
    }

    // 5. Score the attempt
    let correctAnswers = 0;
    let wrongAnswers = 0;
    let unanswered = 0;
    let obtainedMarks = 0;
    let totalMarks = 0;

    for (const q of assignedQuestions) {
      const qMarks = Number(q.marks) || 1;
      totalMarks += qMarks;

      const selectedOptionId = answerMap.get(q.questionId);
      const correctOptionId = correctMap.get(q.questionId);

      if (!selectedOptionId) {
        unanswered++;
        // If row existed without selection, update is_correct = null
        if (answerMap.has(q.questionId)) {
          await conn.query(
            'UPDATE answers SET is_correct = NULL WHERE attempt_id = ? AND question_id = ?',
            [attemptId, q.questionId]
          );
        }
      } else if (Number(selectedOptionId) === Number(correctOptionId)) {
        correctAnswers++;
        obtainedMarks += qMarks;
        await conn.query(
          'UPDATE answers SET is_correct = 1 WHERE attempt_id = ? AND question_id = ?',
          [attemptId, q.questionId]
        );
      } else {
        wrongAnswers++;
        await conn.query(
          'UPDATE answers SET is_correct = 0 WHERE attempt_id = ? AND question_id = ?',
          [attemptId, q.questionId]
        );
      }
    }

    const totalQuestions = assignedQuestions.length;
    const percentage = totalMarks > 0 ? Number(((obtainedMarks / totalMarks) * 100).toFixed(2)) : 0.00;

    // 6. Insert / Update Results
    await conn.query(
      `INSERT INTO results 
       (attempt_id, total_questions, correct_answers, wrong_answers, unanswered, total_marks, obtained_marks, percentage)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       total_questions = VALUES(total_questions),
       correct_answers = VALUES(correct_answers),
       wrong_answers = VALUES(wrong_answers),
       unanswered = VALUES(unanswered),
       total_marks = VALUES(total_marks),
       obtained_marks = VALUES(obtained_marks),
       percentage = VALUES(percentage)`,
      [
        attemptId,
        totalQuestions,
        correctAnswers,
        wrongAnswers,
        unanswered,
        totalMarks,
        obtainedMarks,
        percentage
      ]
    );

    // 7. Update Attempt Status & Marks
    await conn.query(
      `UPDATE attempts 
       SET status = ?, submitted_at = NOW(), obtained_marks = ?, percentage = ?
       WHERE id = ?`,
      [status, obtainedMarks, percentage, attemptId]
    );

    if (isLocalTransaction) {
      await conn.commit();
    }

    return {
      attemptId,
      status,
      totalQuestions,
      correctAnswers,
      wrongAnswers,
      unanswered,
      totalMarks,
      obtainedMarks,
      percentage
    };
  } catch (error) {
    if (isLocalTransaction && conn) {
      await conn.rollback();
    }
    throw error;
  } finally {
    if (isLocalTransaction && conn) {
      conn.release();
    }
  }
};

module.exports = {
  evaluateAttempt
};
