import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import api from '../services/api';

export function ManageSubjects() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentSubject, setCurrentSubject] = useState(null);

  // Forms
  const [formData, setFormData] = useState({ name: '', code: '', description: '' });
  const [formError, setFormError] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.getSubjects();
      setSubjects(res.subjects || []);
    } catch (err) {
      setError(err.message || 'Failed to load subjects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setFormError('');
    try {
      await api.createSubject(formData);
      setShowAddModal(false);
      setSuccess('Subject created successfully!');
      setFormData({ name: '', code: '', description: '' });
      fetchSubjects();
    } catch (err) {
      setFormError(err.message || 'Failed to create subject');
    } finally {
      setProcessing(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setFormError('');
    try {
      await api.updateSubject(currentSubject.id, formData);
      setShowEditModal(false);
      setSuccess('Subject updated successfully!');
      fetchSubjects();
    } catch (err) {
      setFormError(err.message || 'Failed to update subject');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    setProcessing(true);
    setFormError('');
    try {
      await api.deleteSubject(currentSubject.id);
      setShowDeleteModal(false);
      setSuccess('Subject deleted successfully!');
      fetchSubjects();
    } catch (err) {
      setFormError(err.message || 'Failed to delete subject');
    } finally {
      setProcessing(false);
    }
  };

  const filteredSubjects = subjects.filter((s) => {
    const name = (s.name || '').toLowerCase();
    const code = (s.code || '').toLowerCase();
    const q = search.toLowerCase();
    return name.includes(q) || code.includes(q);
  });

  return (
    <div className="admin-layout">
      <Sidebar />
      <div className="admin-main">
        <main className="admin-content">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
                Manage Subjects
              </h1>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                Define academic subjects, manage curriculum question banks, and configure course modules.
              </p>
            </div>
            <button
              onClick={() => {
                setFormData({ name: '', code: '', description: '' });
                setFormError('');
                setShowAddModal(true);
              }}
              className="btn btn-primary"
            >
              + Add New Subject
            </button>
          </div>

          {error && <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>{error}</div>}
          {success && <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>{success}</div>}

          {/* Search Filter */}
          <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
            <input
              type="text"
              placeholder="🔍 Search subjects by name or code (e.g. DBMS, CS101)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input"
            />
          </div>

          {/* Subjects Table / Responsive Grid */}
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                Loading subjects...
              </div>
            ) : filteredSubjects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                {search ? 'No subjects found matching your filter.' : 'No subjects registered yet. Click "+ Add New Subject" to begin.'}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Subject Code</th>
                      <th>Subject Name</th>
                      <th>Questions in Bank</th>
                      <th>Description</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubjects.map((sub) => {
                      const qCount = Number(sub.questionCount !== undefined ? sub.questionCount : (sub.question_count || 0));
                      return (
                        <tr key={sub.id}>
                          <td style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--color-primary)' }}>
                            {sub.code}
                          </td>
                          <td style={{ fontWeight: 600 }}>{sub.name}</td>
                          <td>
                            <button
                              onClick={() => navigate(`/admin/questions?subjectId=${sub.id}`)}
                              className="badge"
                              style={{
                                border: 'none',
                                cursor: 'pointer',
                                background: qCount > 0 ? 'var(--color-primary-light)' : 'var(--color-bg-alt)',
                                color: qCount > 0 ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                padding: '0.35rem 0.65rem',
                                borderRadius: '4px',
                                fontWeight: 600
                              }}
                              title="Click to view questions for this subject"
                            >
                              📖 {qCount} Questions →
                            </button>
                          </td>
                          <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                            {sub.description || 'No description provided'}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => navigate(`/admin/questions?subjectId=${sub.id}`)}
                                className="btn btn-outline"
                                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', height: '30px' }}
                                title="Manage Questions"
                              >
                                Questions
                              </button>
                              <button
                                onClick={() => {
                                  setCurrentSubject(sub);
                                  setFormData({ name: sub.name, code: sub.code, description: sub.description || '' });
                                  setFormError('');
                                  setShowEditModal(true);
                                }}
                                className="btn btn-outline"
                                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', height: '30px' }}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  setCurrentSubject(sub);
                                  setFormError('');
                                  setShowDeleteModal(true);
                                }}
                                className="btn btn-danger"
                                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', height: '30px' }}
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

      {/* Add Subject Modal */}
      {showAddModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h2 style={{ marginTop: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)' }}>
              Add New Subject
            </h2>
            {formError && <div className="alert alert-error" style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>{formError}</div>}

            <form onSubmit={handleAddSubmit}>
              <div className="form-group">
                <label className="form-label">Subject Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CS101"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Subject Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Database Management Systems"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description (Optional)</label>
                <textarea
                  placeholder="Short description of the course curriculum..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input"
                  rows="3"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={processing}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="btn btn-primary"
                >
                  {processing ? 'Creating...' : 'Create Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Subject Modal */}
      {showEditModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h2 style={{ marginTop: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)' }}>
              Edit Subject
            </h2>
            {formError && <div className="alert alert-error" style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>{formError}</div>}

            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label className="form-label">Subject Code</label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Subject Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input"
                  rows="3"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  disabled={processing}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="btn btn-primary"
                >
                  {processing ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '420px' }}>
            <h3 style={{ marginTop: 0, color: 'var(--color-danger)' }}>Delete Subject?</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
              Are you sure you want to delete <strong>{currentSubject?.name}</strong>? Subjects with linked questions or tests cannot be deleted without first clearing them.
            </p>
            {formError && <div className="alert alert-error" style={{ marginTop: '1rem', fontSize: '0.875rem' }}>{formError}</div>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={processing}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={processing}
                className="btn btn-danger"
              >
                {processing ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageSubjects;
