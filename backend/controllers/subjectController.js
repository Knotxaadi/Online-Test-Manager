const pool = require('../config/db');

/**
 * Get all subjects (Admin and Student)
 * GET /api/subjects
 */
const getAllSubjects = async (req, res, next) => {
  try {
    const [subjects] = await pool.query(
      `SELECT s.id, s.name, s.code, s.description, s.created_at AS createdAt,
              COUNT(q.id) AS questionCount
       FROM subjects s
       LEFT JOIN questions q ON s.id = q.subject_id
       GROUP BY s.id
       ORDER BY s.name ASC`
    );
    return res.status(200).json({ subjects });
  } catch (error) {
    next(error);
  }
};

/**
 * Get subject by ID
 * GET /api/subjects/:id
 */
const getSubjectById = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid subject ID' });
    }

    const [subjects] = await pool.query(
      `SELECT s.id, s.name, s.code, s.description, s.created_at AS createdAt,
              COUNT(q.id) AS questionCount
       FROM subjects s
       LEFT JOIN questions q ON s.id = q.subject_id
       WHERE s.id = ?
       GROUP BY s.id`,
      [id]
    );

    if (subjects.length === 0) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    return res.status(200).json({ subject: subjects[0] });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new subject (Admin)
 * POST /api/subjects
 */
const createSubject = async (req, res, next) => {
  try {
    const { name, code, description = '' } = req.body;

    if (!name || !code) {
      return res.status(400).json({ message: 'Subject name and subject code are required' });
    }

    // Check unique subject code
    const [existing] = await pool.query('SELECT id FROM subjects WHERE code = ?', [code]);
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Subject code already exists' });
    }

    const [result] = await pool.query(
      'INSERT INTO subjects (name, code, description) VALUES (?, ?, ?)',
      [name, code, description]
    );

    return res.status(201).json({
      message: 'Subject created successfully',
      subject: {
        id: result.insertId,
        name,
        code,
        description,
        questionCount: 0
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update subject (Admin)
 * PUT /api/subjects/:id
 */
const updateSubject = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid subject ID' });
    }

    const { name, code, description = '' } = req.body;
    if (!name || !code) {
      return res.status(400).json({ message: 'Subject name and subject code are required' });
    }

    const [subjects] = await pool.query('SELECT id FROM subjects WHERE id = ?', [id]);
    if (subjects.length === 0) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    // Check unique code across other subjects
    const [codeCheck] = await pool.query('SELECT id FROM subjects WHERE code = ? AND id != ?', [code, id]);
    if (codeCheck.length > 0) {
      return res.status(409).json({ message: 'Subject code is already used by another subject' });
    }

    await pool.query(
      'UPDATE subjects SET name = ?, code = ?, description = ? WHERE id = ?',
      [name, code, description, id]
    );

    return res.status(200).json({
      message: 'Subject updated successfully',
      subject: { id, name, code, description }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete subject (Admin) - Blocked if questions or tests exist
 * DELETE /api/subjects/:id
 */
const deleteSubject = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid subject ID' });
    }

    const [subjects] = await pool.query('SELECT id FROM subjects WHERE id = ?', [id]);
    if (subjects.length === 0) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    // Check for existing tests or questions
    const [[{ testCount }]] = await pool.query('SELECT COUNT(*) AS testCount FROM tests WHERE subject_id = ?', [id]);
    const [[{ questionCount }]] = await pool.query('SELECT COUNT(*) AS questionCount FROM questions WHERE subject_id = ?', [id]);

    if (testCount > 0 || questionCount > 0) {
      return res.status(409).json({
        message: `Cannot delete subject: it contains ${testCount} test(s) and ${questionCount} question(s). Please remove or reassign them first.`
      });
    }

    await pool.query('DELETE FROM subjects WHERE id = ?', [id]);
    return res.status(200).json({ message: 'Subject deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject
};
