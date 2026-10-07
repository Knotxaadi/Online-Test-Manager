import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../services/api';

export default function ManageTests() {
  const [tests, setTests] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Search, Filter & Sort
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [sortBy, setSortBy] = useState('createdAt'); // 'title' | 'subject' | 'duration' | 'questions' | 'marks' | 'status' | 'createdAt'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [selectedTest, setSelectedTest] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    subjectId: '',
    title: '',
    durationMinutes: 15,
    totalQuestions: 10,
    totalMarks: 10,
    maxViolations: 3,
    status: 'INACTIVE'
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Delete State
  const [deleteId, setDeleteId] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [testsRes, subjectsRes] = await Promise.all([
        api.getTests(),
        api.getSubjects()
      ]);
      setTests(testsRes.tests || []);
      setSubjects(subjectsRes.subjects || []);
    } catch (err) {
      setError(err.message || 'Failed to load tests and subjects');
    } finally {
      setLoading(false);
    }
  };

  const handleSortClick = (columnKey) => {
    if (sortBy === columnKey) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(columnKey);
      setSortOrder('asc');
    }
  };

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedTest(null);
    setFormData({
      subjectId: subjects.length > 0 ? String(subjects[0].id) : '',
      title: '',
      durationMinutes: 15,
      totalQuestions: 10,
      totalMarks: 10,
      maxViolations: 3,
      status: 'INACTIVE'
    });
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (t) => {
    setModalMode('edit');
    setSelectedTest(t);
    setFormData({
      subjectId: String(t.subjectId || t.subject_id || ''),
      title: t.title || '',
      durationMinutes: t.durationMinutes || t.duration_minutes || 15,
      totalQuestions: t.totalQuestions || t.total_questions || 10,
      totalMarks: t.totalMarks || t.total_marks || 10,
      maxViolations: t.maxViolations !== undefined ? t.maxViolations : (t.max_violations !== undefined ? t.max_violations : 3),
      status: (t.status || 'INACTIVE').toUpperCase()
    });
    setFormError('');
    setShowModal(true);
  };

  const handleStatusToggle = async (t) => {
    const currentStatus = (t.status || 'INACTIVE').toUpperCase();
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      setError('');
      setSuccess('');
      await api.updateTestStatus(t.id, newStatus);
      setSuccess(`Test "${t.title}" status changed to ${newStatus}.`);
      fetchData();
    } catch (err) {
      setError(err.message || `Failed to update status for ${t.title}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.title.trim()) {
      setFormError('Test title is required');
      return;
    }
    if (!formData.subjectId) {
      setFormError('Please select a subject');
      return;
    }
    if (formData.durationMinutes <= 0) {
      setFormError('Duration must be greater than 0');
      return;
    }
    if (formData.totalQuestions <= 0) {
      setFormError('Total questions must be greater than 0');
      return;
    }
    if (formData.totalMarks <= 0) {
      setFormError('Total marks must be greater than 0');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        subjectId: Number(formData.subjectId),
        title: formData.title.trim(),
        durationMinutes: Number(formData.durationMinutes),
        totalQuestions: Number(formData.totalQuestions),
        totalMarks: Number(formData.totalMarks),
        maxViolations: Number(formData.maxViolations),
        status: formData.status
      };

      if (modalMode === 'create') {
        await api.createTest(payload);
        setSuccess('Test created successfully!');
      } else {
        await api.updateTest(selectedTest.id, payload);
        setSuccess('Test updated successfully!');
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      setFormError(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setError('');
      setSuccess('');
      await api.deleteTest(deleteId);
      setSuccess('Test deleted successfully!');
      setDeleteConfirmOpen(false);
      setDeleteId(null);
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to delete test');
      setDeleteConfirmOpen(false);
      setDeleteId(null);
    }
  };

  // Filter and Sort Logic
  const filteredAndSortedTests = tests
    .filter((t) => {
      const title = (t.title || '').toLowerCase();
      const subj = (t.subjectName || t.subject_name || '').toLowerCase();
      const q = searchQuery.toLowerCase();
      const matchesSearch = title.includes(q) || subj.includes(q);
      const matchesSubject = filterSubject ? String(t.subjectId || t.subject_id) === String(filterSubject) : true;
      return matchesSearch && matchesSubject;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'title') {
        comparison = (a.title || '').localeCompare(b.title || '');
      } else if (sortBy === 'subject') {
        comparison = (a.subjectName || a.subject_name || '').localeCompare(b.subjectName || b.subject_name || '');
      } else if (sortBy === 'duration') {
        comparison = Number(a.durationMinutes || a.duration_minutes || 0) - Number(b.durationMinutes || b.duration_minutes || 0);
      } else if (sortBy === 'questions') {
        comparison = Number(a.totalQuestions || a.total_questions || 0) - Number(b.totalQuestions || b.total_questions || 0);
      } else if (sortBy === 'marks') {
        comparison = Number(a.totalMarks || a.total_marks || 0) - Number(b.totalMarks || b.total_marks || 0);
      } else if (sortBy === 'status') {
        comparison = (a.status || '').localeCompare(b.status || '');
      } else {
        // createdAt or id
        comparison = Number(a.id || 0) - Number(b.id || 0);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  return (
    <div className="admin-layout">
      <Sidebar />
      <div className="admin-main">
        <main className="admin-content">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>Manage Tests</h1>
              <p style={{ color: 'var(--color-text-muted)', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
                Create, configure, and activate online timed MCQ exams with question capacity checks.
              </p>
            </div>
            <button className="btn btn-primary" onClick={openCreateModal}>
              + Create New Test
            </button>
          </div>

          {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
          {success && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{success}</div>}

          {/* Filters & Sorting Bar */}
          <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: '220px' }}>
                <input
                  type="text"
                  className="input"
                  placeholder="🔍 Search by test title or subject..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Subject Filter (Shows all subjects loaded from SQL) */}
              <div style={{ width: '240px' }}>
                <select
                  className="input"
                  value={filterSubject}
                  onChange={(e) => setFilterSubject(e.target.value)}
                >
                  <option value="">All Subjects ({subjects.length} available)</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort By Dropdown */}
              <div style={{ width: '180px' }}>
                <select
                  className="input"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="createdAt">Sort: Latest</option>
                  <option value="title">Sort: Test Title</option>
                  <option value="subject">Sort: Subject</option>
                  <option value="duration">Sort: Duration</option>
                  <option value="questions">Sort: Questions</option>
                  <option value="marks">Sort: Marks</option>
                  <option value="status">Sort: Status</option>
                </select>
              </div>

              {/* Sort Order Toggle */}
              <button
                type="button"
                className="btn btn-outline"
                style={{ height: '38px', padding: '0 0.75rem' }}
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                title={`Click to switch to ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
              >
                {sortOrder === 'asc' ? '⬆️ Asc' : '⬇️ Desc'}
              </button>
            </div>
          </div>

          {/* Tests Table */}
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                Loading tests...
              </div>
            ) : filteredAndSortedTests.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                {searchQuery || filterSubject ? 'No tests match your filter criteria.' : 'No tests created yet. Click "+ Create New Test" to begin.'}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ cursor: 'pointer' }} onClick={() => handleSortClick('title')}>
                        Title {sortBy === 'title' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                      </th>
                      <th style={{ cursor: 'pointer' }} onClick={() => handleSortClick('subject')}>
                        Subject {sortBy === 'subject' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                      </th>
                      <th style={{ cursor: 'pointer' }} onClick={() => handleSortClick('questions')}>
                        Questions {sortBy === 'questions' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                      </th>
                      <th style={{ cursor: 'pointer' }} onClick={() => handleSortClick('duration')}>
                        Duration {sortBy === 'duration' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                      </th>
                      <th style={{ cursor: 'pointer' }} onClick={() => handleSortClick('marks')}>
                        Marks {sortBy === 'marks' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                      </th>
                      <th>Max Violations</th>
                      <th style={{ cursor: 'pointer' }} onClick={() => handleSortClick('status')}>
                        Status {sortBy === 'status' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                      </th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedTests.map((t) => {
                      const isActive = (t.status || '').toUpperCase() === 'ACTIVE';
                      return (
                        <tr key={t.id}>
                          <td style={{ fontWeight: 600 }}>{t.title}</td>
                          <td>
                            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                              {t.subjectName || t.subject_name || 'N/A'} {t.subjectCode || t.subject_code ? `(${t.subjectCode || t.subject_code})` : ''}
                            </span>
                          </td>
                          <td>{t.totalQuestions || t.total_questions}</td>
                          <td>{t.durationMinutes || t.duration_minutes} mins</td>
                          <td>{t.totalMarks || t.total_marks}</td>
                          <td>{t.maxViolations !== undefined ? t.maxViolations : t.max_violations}</td>
                          <td>
                            <span className={`badge ${isActive ? 'badge-success' : 'badge-inactive'}`}>
                              {isActive ? 'ACTIVE' : 'INACTIVE'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                              <button
                                className="btn btn-outline"
                                style={{
                                  padding: '0.25rem 0.6rem',
                                  fontSize: '0.75rem',
                                  height: '30px',
                                  borderColor: isActive ? '#f59e0b' : '#10b981',
                                  color: isActive ? '#d97706' : '#059669'
                                }}
                                onClick={() => handleStatusToggle(t)}
                                title={isActive ? 'Deactivate Test' : 'Activate Test'}
                              >
                                {isActive ? 'Deactivate' : 'Activate'}
                              </button>
                              <button
                                className="btn btn-outline"
                                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', height: '30px' }}
                                onClick={() => openEditModal(t)}
                              >
                                Edit
                              </button>
                              <button
                                className="btn btn-danger"
                                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', height: '30px' }}
                                onClick={() => {
                                  setDeleteId(t.id);
                                  setDeleteConfirmOpen(true);
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modal: Create / Edit Test */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h2 style={{ marginTop: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)' }}>
              {modalMode === 'create' ? 'Create New Test' : 'Edit Test'}
            </h2>

            {formError && (
              <div className="alert alert-error" style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Subject</label>
                <select
                  className="input"
                  value={formData.subjectId}
                  onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                  required
                >
                  <option value="">Select a Subject ({subjects.length} available)</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Test Title</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. DBMS Mid-Term Examination"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Duration (minutes)</label>
                  <input
                    type="number"
                    className="input"
                    min="1"
                    max="180"
                    value={formData.durationMinutes}
                    onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Total Questions</label>
                  <input
                    type="number"
                    className="input"
                    min="1"
                    max="200"
                    value={formData.totalQuestions}
                    onChange={(e) => setFormData({ ...formData, totalQuestions: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Total Marks</label>
                  <input
                    type="number"
                    className="input"
                    min="1"
                    max="1000"
                    value={formData.totalMarks}
                    onChange={(e) => setFormData({ ...formData, totalMarks: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Max Violations</label>
                  <input
                    type="number"
                    className="input"
                    min="1"
                    max="10"
                    value={formData.maxViolations}
                    onChange={(e) => setFormData({ ...formData, maxViolations: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="input"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="INACTIVE">Inactive (Draft)</option>
                  <option value="ACTIVE">Active (Visible to Students)</option>
                </select>
                <small style={{ display: 'block', marginTop: '0.35rem', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                  Note: Activating requires the subject to have at least {formData.totalQuestions || 'N'} questions in the question bank.
                </small>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : modalMode === 'create' ? 'Create Test' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '420px' }}>
            <h3 style={{ marginTop: 0, color: 'var(--color-danger)' }}>Delete Test?</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
              Are you sure you want to delete this test? If any students have already attempted this test, deletion will be blocked to preserve historical examination records.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                className="btn btn-outline"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setDeleteId(null);
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleDelete}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
