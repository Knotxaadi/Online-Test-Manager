const pool = require('../config/db');

/**
 * Get all questions (Admin only)
 * Optional filter: ?subjectId=1
 * GET /api/questions
 */
const getAllQuestions = async (req, res, next) => {
  try {
    const { subjectId } = req.query;
    let query = `
      SELECT q.id, q.subject_id AS subjectId, s.name AS subjectName, s.code AS subjectCode,
             q.question_text AS questionText, q.marks, q.created_at AS createdAt
      FROM questions q
      JOIN subjects s ON q.subject_id = s.id
    `;
    const params = [];

    if (subjectId) {
      const sId = Number(subjectId);
      if (!isNaN(sId)) {
        query += ' WHERE q.subject_id = ?';
        params.push(sId);
      }
    }

    query += ' ORDER BY q.id DESC';

    const [questions] = await pool.query(query, params);

    if (questions.length === 0) {
      return res.status(200).json({ questions: [] });
    }

    // Fetch options for all returned questions in a single query to avoid N+1
    const questionIds = questions.map(q => q.id);
    const [options] = await pool.query(
      `SELECT id, question_id AS questionId, option_text AS optionText, is_correct AS isCorrect
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
        optionText: opt.optionText,
        isCorrect: Boolean(opt.isCorrect)
      });
    }

    const result = questions.map(q => ({
      ...q,
      options: optionsByQ[q.id] || []
    }));

    return res.status(200).json({ questions: result });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single question by ID (Admin only)
 * GET /api/questions/:id
 */
const getQuestionById = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid question ID' });
    }

    const [questions] = await pool.query(
      `SELECT q.id, q.subject_id AS subjectId, s.name AS subjectName, s.code AS subjectCode,
              q.question_text AS questionText, q.marks, q.created_at AS createdAt
       FROM questions q
       JOIN subjects s ON q.subject_id = s.id
       WHERE q.id = ?`,
      [id]
    );

    if (questions.length === 0) {
      return res.status(404).json({ message: 'Question not found' });
    }

    const [options] = await pool.query(
      `SELECT id, option_text AS optionText, is_correct AS isCorrect
       FROM options 
       WHERE question_id = ?
       ORDER BY id ASC`,
      [id]
    );

    const question = {
      ...questions[0],
      options: options.map(o => ({
        id: o.id,
        optionText: o.optionText,
        isCorrect: Boolean(o.isCorrect)
      }))
    };

    return res.status(200).json({ question });
  } catch (error) {
    next(error);
  }
};

/**
 * Helper to validate 4 options with exactly 1 correct
 */
const validateOptions = (options) => {
  if (!Array.isArray(options) || options.length !== 4) {
    return 'Question must contain exactly 4 options';
  }

  let correctCount = 0;
  for (let i = 0; i < options.length; i++) {
    const opt = options[i];
    const text = opt.optionText !== undefined ? opt.optionText : opt.text;
    if (!text || String(text).trim() === '') {
      return `Option ${i + 1} text cannot be empty`;
    }
    const isCorrect = Boolean(opt.isCorrect || opt.is_correct);
    if (isCorrect) correctCount++;
  }

  if (correctCount !== 1) {
    return 'Exactly one option must be marked as correct';
  }

  return null;
};

/**
 * Create Question with 4 options in a Transaction (Admin only)
 * POST /api/questions
 */
const createQuestion = async (req, res, next) => {
  let conn;
  try {
    const { subjectId, questionText, marks = 1, options } = req.body;

    if (!subjectId || isNaN(Number(subjectId))) {
      return res.status(400).json({ message: 'Valid subjectId is required' });
    }

    if (!questionText || questionText.trim() === '') {
      return res.status(400).json({ message: 'Question text is required' });
    }

    const marksNum = Number(marks);
    if (isNaN(marksNum) || marksNum <= 0) {
      return res.status(400).json({ message: 'Marks must be a positive number' });
    }

    // Verify subject exists
    const [subjects] = await pool.query('SELECT id FROM subjects WHERE id = ?', [Number(subjectId)]);
    if (subjects.length === 0) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    const optionsError = validateOptions(options);
    if (optionsError) {
      return res.status(400).json({ message: optionsError });
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [qResult] = await conn.query(
      'INSERT INTO questions (subject_id, question_text, marks) VALUES (?, ?, ?)',
      [Number(subjectId), questionText.trim(), marksNum]
    );
    const questionId = qResult.insertId;

    const insertedOptions = [];
    for (const opt of options) {
      const text = (opt.optionText !== undefined ? opt.optionText : opt.text).trim();
      const isCorrect = Boolean(opt.isCorrect || opt.is_correct);
      const [optResult] = await conn.query(
        'INSERT INTO options (question_id, option_text, is_correct) VALUES (?, ?, ?)',
        [questionId, text, isCorrect]
      );
      insertedOptions.push({
        id: optResult.insertId,
        optionText: text,
        isCorrect
      });
    }

    await conn.commit();

    return res.status(201).json({
      message: 'Question created successfully',
      question: {
        id: questionId,
        subjectId: Number(subjectId),
        questionText: questionText.trim(),
        marks: marksNum,
        options: insertedOptions
      }
    });
  } catch (error) {
    if (conn) await conn.rollback();
    next(error);
  } finally {
    if (conn) conn.release();
  }
};

/**
 * Update Question & Options (Admin only)
 * PUT /api/questions/:id
 */
const updateQuestion = async (req, res, next) => {
  let conn;
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid question ID' });
    }

    const { subjectId, questionText, marks = 1, options } = req.body;

    if (!questionText || questionText.trim() === '') {
      return res.status(400).json({ message: 'Question text is required' });
    }

    const marksNum = Number(marks);
    if (isNaN(marksNum) || marksNum <= 0) {
      return res.status(400).json({ message: 'Marks must be a positive number' });
    }

    // Verify question exists
    const [existingQ] = await pool.query('SELECT id, subject_id AS subjectId FROM questions WHERE id = ?', [id]);
    if (existingQ.length === 0) {
      return res.status(404).json({ message: 'Question not found' });
    }

    const sId = subjectId ? Number(subjectId) : existingQ[0].subjectId;
    if (subjectId) {
      const [subjects] = await pool.query('SELECT id FROM subjects WHERE id = ?', [sId]);
      if (subjects.length === 0) {
        return res.status(404).json({ message: 'Subject not found' });
      }
    }

    if (options) {
      const optionsError = validateOptions(options);
      if (optionsError) {
        return res.status(400).json({ message: optionsError });
      }
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    await conn.query(
      'UPDATE questions SET subject_id = ?, question_text = ?, marks = ? WHERE id = ?',
      [sId, questionText.trim(), marksNum, id]
    );

    const updatedOptions = [];
    if (options) {
      await conn.query('DELETE FROM options WHERE question_id = ?', [id]);

      for (const opt of options) {
        const text = (opt.optionText !== undefined ? opt.optionText : opt.text).trim();
        const isCorrect = Boolean(opt.isCorrect || opt.is_correct);
        const [optResult] = await conn.query(
          'INSERT INTO options (question_id, option_text, is_correct) VALUES (?, ?, ?)',
          [id, text, isCorrect]
        );
        updatedOptions.push({ id: optResult.insertId, optionText: text, isCorrect });
      }
    }

    await conn.commit();

    return res.status(200).json({
      message: 'Question updated successfully',
      question: {
        id,
        subjectId: sId,
        questionText: questionText.trim(),
        marks: marksNum,
        options: updatedOptions
      }
    });
  } catch (error) {
    if (conn) await conn.rollback();
    next(error);
  } finally {
    if (conn) conn.release();
  }
};

/**
 * Delete single question (Admin only)
 * DELETE /api/questions/:id
 */
const deleteQuestion = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid question ID' });
    }

    const [questions] = await pool.query('SELECT id FROM questions WHERE id = ?', [id]);
    if (questions.length === 0) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Check if question has been used in any student attempt
    const [[{ usedCount }]] = await pool.query(
      'SELECT COUNT(*) AS usedCount FROM attempt_questions WHERE question_id = ?',
      [id]
    );

    if (usedCount > 0) {
      return res.status(409).json({
        message: 'Cannot delete question: it is recorded as part of existing student exam attempts.'
      });
    }

    // Options cascade delete via FK
    await pool.query('DELETE FROM questions WHERE id = ?', [id]);

    return res.status(200).json({ message: 'Question deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk Upload Questions for a Specific Subject from CSV/JSON
 * POST /api/questions/bulk-upload
 */
const bulkUploadQuestions = async (req, res, next) => {
  let conn;
  try {
    const { subjectId, questions, replaceExisting = false } = req.body;

    const sId = Number(subjectId);
    if (isNaN(sId)) {
      return res.status(400).json({ message: 'Valid subjectId is required' });
    }

    const [subjects] = await pool.query('SELECT id, name FROM subjects WHERE id = ?', [sId]);
    if (subjects.length === 0) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'No questions provided in payload' });
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    if (replaceExisting) {
      // Get all existing question IDs for this subject
      const [existingQs] = await conn.query('SELECT id FROM questions WHERE subject_id = ?', [sId]);
      const qIds = existingQs.map(q => q.id);

      if (qIds.length > 0) {
        // Delete options for these questions
        await conn.query('DELETE FROM options WHERE question_id IN (?)', [qIds]);
        // Delete questions for this subject
        await conn.query('DELETE FROM questions WHERE subject_id = ?', [sId]);
      }
    }

    let insertedCount = 0;
    let skippedCount = 0;

    for (const q of questions) {
      const qText = (q.questionText || q.question || q.question_text || '').trim();
      if (!qText) {
        skippedCount++;
        continue;
      }

      const marksNum = Number(q.marks || 1) > 0 ? Number(q.marks || 1) : 1;

      // Extract 4 options
      let optionsList = [];
      if (Array.isArray(q.options) && q.options.length === 4) {
        optionsList = q.options.map(opt => ({
          text: (opt.text || opt.optionText || opt.option_text || '').trim(),
          isCorrect: Boolean(opt.isCorrect || opt.is_correct)
        }));
      } else {
        // From CSV columns: option_a, option_b, option_c, option_d, correct_option
        const optA = (q.optionA || q.option_a || q.option1 || '').trim();
        const optB = (q.optionB || q.option_b || q.option2 || '').trim();
        const optC = (q.optionC || q.option_c || q.option3 || '').trim();
        const optD = (q.optionD || q.option_d || q.option4 || '').trim();
        const correctRaw = String(q.correctOption || q.correct_option || q.answer || 'A').trim().toUpperCase();

        if (!optA || !optB || !optC || !optD) {
          skippedCount++;
          continue;
        }

        const isACorrect = correctRaw === 'A' || correctRaw === '1' || correctRaw === optA.toUpperCase();
        const isBCorrect = correctRaw === 'B' || correctRaw === '2' || correctRaw === optB.toUpperCase();
        const isCCorrect = correctRaw === 'C' || correctRaw === '3' || correctRaw === optC.toUpperCase();
        const isDCorrect = correctRaw === 'D' || correctRaw === '4' || correctRaw === optD.toUpperCase();

        optionsList = [
          { text: optA, isCorrect: isACorrect },
          { text: optB, isCorrect: isBCorrect },
          { text: optC, isCorrect: isCCorrect },
          { text: optD, isCorrect: isDCorrect }
        ];
      }

      // Validate exactly 1 correct
      const correctCount = optionsList.filter(o => o.isCorrect).length;
      if (correctCount !== 1) {
        // Default to option A if none marked
        if (correctCount === 0) {
          optionsList[0].isCorrect = true;
        } else {
          // Keep only the first correct
          let foundFirst = false;
          optionsList = optionsList.map(o => {
            if (o.isCorrect && !foundFirst) {
              foundFirst = true;
              return o;
            }
            return { ...o, isCorrect: false };
          });
        }
      }

      const [qRes] = await conn.query(
        'INSERT INTO questions (subject_id, question_text, marks) VALUES (?, ?, ?)',
        [sId, qText, marksNum]
      );
      const newQId = qRes.insertId;

      for (const opt of optionsList) {
        await conn.query(
          'INSERT INTO options (question_id, option_text, is_correct) VALUES (?, ?, ?)',
          [newQId, opt.text, opt.isCorrect]
        );
      }

      insertedCount++;
    }

    await conn.commit();
    conn.release();
    conn = null;

    return res.status(200).json({
      message: replaceExisting
        ? `Replaced questions for ${subjects[0].name}: ${insertedCount} questions inserted.`
        : `Uploaded ${insertedCount} questions successfully. (${skippedCount} invalid rows skipped).`,
      insertedCount,
      skippedCount
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
 * Delete All Questions for a Specific Subject
 * DELETE /api/questions/subject/:subjectId
 */
const deleteQuestionsBySubject = async (req, res, next) => {
  let conn;
  try {
    const subjectId = Number(req.params.subjectId);
    if (isNaN(subjectId)) {
      return res.status(400).json({ message: 'Invalid subject ID' });
    }

    const [subjects] = await pool.query('SELECT id, name FROM subjects WHERE id = ?', [subjectId]);
    if (subjects.length === 0) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [questions] = await conn.query('SELECT id FROM questions WHERE subject_id = ?', [subjectId]);
    const qIds = questions.map(q => q.id);

    if (qIds.length > 0) {
      await conn.query('DELETE FROM options WHERE question_id IN (?)', [qIds]);
      await conn.query('DELETE FROM questions WHERE subject_id = ?', [subjectId]);
    }

    await conn.commit();
    conn.release();
    conn = null;

    return res.status(200).json({
      message: `All ${qIds.length} questions for subject "${subjects[0].name}" were deleted successfully.`
    });
  } catch (error) {
    if (conn) {
      await conn.rollback();
      conn.release();
    }
    next(error);
  }
};

module.exports = {
  getAllQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  bulkUploadQuestions,
  deleteQuestionsBySubject
};
