const bcrypt = require('bcrypt');
const pool = require('../config/db');

/**
 * Get all students (Admin)
 * GET /api/students
 */
const getAllStudents = async (req, res, next) => {
  try {
    const [students] = await pool.query(
      `SELECT id, student_id AS studentId, name, email, status, created_at AS createdAt 
       FROM students 
       ORDER BY id DESC`
    );
    return res.status(200).json({ students });
  } catch (error) {
    next(error);
  }
};

/**
 * Get student by ID (Admin)
 * GET /api/students/:id
 */
const getStudentById = async (req, res, next) => {
  try {
    const studentId = Number(req.params.id);
    if (isNaN(studentId)) {
      return res.status(400).json({ message: 'Invalid student ID' });
    }

    const [students] = await pool.query(
      `SELECT id, student_id AS studentId, name, email, status, created_at AS createdAt 
       FROM students 
       WHERE id = ?`,
      [studentId]
    );

    if (students.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }

    return res.status(200).json({ student: students[0] });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new student (Admin)
 * POST /api/students
 */
const createStudent = async (req, res, next) => {
  try {
    const { studentId, name, email, password, status = 'ACTIVE' } = req.body;

    if (!studentId || !name || !email || !password) {
      return res.status(400).json({ message: 'Student ID, name, email, and password are required' });
    }

    if (!['ACTIVE', 'DISABLED'].includes(status)) {
      return res.status(400).json({ message: 'Status must be either ACTIVE or DISABLED' });
    }

    // Check unique constraints
    const [existing] = await pool.query(
      'SELECT id, student_id, email FROM students WHERE student_id = ? OR email = ?',
      [studentId, email]
    );

    if (existing.length > 0) {
      const match = existing[0];
      if (match.student_id === studentId) {
        return res.status(409).json({ message: 'Student ID is already registered' });
      }
      return res.status(409).json({ message: 'Email address is already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      'INSERT INTO students (student_id, name, email, password, status) VALUES (?, ?, ?, ?, ?)',
      [studentId, name, email, hashedPassword, status]
    );

    return res.status(201).json({
      message: 'Student created successfully',
      student: {
        id: result.insertId,
        studentId,
        name,
        email,
        status
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update student details (Admin)
 * PUT /api/students/:id
 */
const updateStudent = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid student ID' });
    }

    const { name, email, status } = req.body;
    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }

    if (status && !['ACTIVE', 'DISABLED'].includes(status)) {
      return res.status(400).json({ message: 'Status must be either ACTIVE or DISABLED' });
    }

    // Verify student exists
    const [students] = await pool.query('SELECT id, status FROM students WHERE id = ?', [id]);
    if (students.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Check if email taken by another student
    const [emailCheck] = await pool.query(
      'SELECT id FROM students WHERE email = ? AND id != ?',
      [email, id]
    );
    if (emailCheck.length > 0) {
      return res.status(409).json({ message: 'Email address is already in use by another student' });
    }

    const newStatus = status || students[0].status;

    await pool.query(
      'UPDATE students SET name = ?, email = ?, status = ? WHERE id = ?',
      [name, email, newStatus, id]
    );

    return res.status(200).json({
      message: 'Student updated successfully',
      student: { id, name, email, status: newStatus }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset student password (Admin)
 * PUT /api/students/:id/reset-password
 */
const resetStudentPassword = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid student ID' });
    }

    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'New password is required and must be at least 6 characters' });
    }

    const [students] = await pool.query('SELECT id FROM students WHERE id = ?', [id]);
    if (students.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE students SET password = ? WHERE id = ?', [hashedPassword, id]);

    return res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete student (Admin) - Blocked if attempts exist (D-009)
 * DELETE /api/students/:id
 */
const deleteStudent = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid student ID' });
    }

    const [students] = await pool.query('SELECT id FROM students WHERE id = ?', [id]);
    if (students.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Check if student has test attempts
    const [[{ attemptCount }]] = await pool.query(
      'SELECT COUNT(*) AS attemptCount FROM attempts WHERE student_id = ?',
      [id]
    );

    if (attemptCount > 0) {
      return res.status(409).json({
        message: 'Cannot delete student with existing test attempts. Please disable the student account instead to preserve exam records.'
      });
    }

    await pool.query('DELETE FROM students WHERE id = ?', [id]);
    return res.status(200).json({ message: 'Student deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk Upload Students from CSV
 * Option to replace existing students dataset (and export old student results archive)
 * POST /api/students/bulk-upload
 */
const bulkUploadStudents = async (req, res, next) => {
  let conn;
  try {
    const { students, replaceExisting = false } = req.body;

    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ message: 'No student records provided in payload' });
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    let archiveData = [];

    if (replaceExisting) {
      // 1. Gather all existing students & their exam results to produce archive dataset
      const [existingResults] = await conn.query(
        `SELECT stu.student_id AS studentId, stu.name AS studentName, stu.email AS studentEmail,
                t.title AS testTitle, s.name AS subjectName,
                r.obtained_marks AS obtainedMarks, r.total_marks AS totalMarks,
                r.percentage, a.status AS attemptStatus,
                (SELECT COUNT(*) FROM violations v WHERE v.attempt_id = a.id) AS violationCount,
                a.submitted_at AS submittedAt
         FROM students stu
         LEFT JOIN attempts a ON stu.id = a.student_id
         LEFT JOIN results r ON a.id = r.attempt_id
         LEFT JOIN tests t ON a.test_id = t.id
         LEFT JOIN subjects s ON t.subject_id = s.id
         ORDER BY stu.id ASC, a.submitted_at DESC`
      );
      archiveData = existingResults;

      // 2. Clear existing results, answers, violations, attempt_questions, attempts, and students
      await conn.query('DELETE FROM results');
      await conn.query('DELETE FROM answers');
      await conn.query('DELETE FROM violations');
      await conn.query('DELETE FROM attempt_questions');
      await conn.query('DELETE FROM attempts');
      await conn.query('DELETE FROM students');
    }

    let insertedCount = 0;
    let skippedCount = 0;

    for (const stu of students) {
      const studentId = (stu.studentId || stu.student_id || stu.rollNumber || stu.roll_number || '').trim();
      const name = (stu.name || stu.fullName || stu.full_name || '').trim();
      const email = (stu.email || '').trim();
      const rawPassword = (stu.password || 'Student@123').trim();
      const status = (stu.status || 'ACTIVE').toUpperCase() === 'DISABLED' ? 'DISABLED' : 'ACTIVE';

      if (!studentId || !name || !email) {
        skippedCount++;
        continue;
      }

      if (!replaceExisting) {
        // Check duplicate
        const [existing] = await conn.query(
          'SELECT id FROM students WHERE student_id = ? OR email = ?',
          [studentId, email]
        );
        if (existing.length > 0) {
          skippedCount++;
          continue;
        }
      }

      const hashedPassword = await bcrypt.hash(rawPassword, 10);
      await conn.query(
        'INSERT INTO students (student_id, name, email, password, status) VALUES (?, ?, ?, ?, ?)',
        [studentId, name, email, hashedPassword, status]
      );
      insertedCount++;
    }

    await conn.commit();
    conn.release();
    conn = null;

    return res.status(200).json({
      message: replaceExisting
        ? `Replaced student records: ${insertedCount} inserted.`
        : `Bulk upload complete: ${insertedCount} inserted, ${skippedCount} skipped (duplicates/invalid).`,
      insertedCount,
      skippedCount,
      archiveData: replaceExisting ? archiveData : undefined
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
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  resetStudentPassword,
  deleteStudent,
  bulkUploadStudents
};
