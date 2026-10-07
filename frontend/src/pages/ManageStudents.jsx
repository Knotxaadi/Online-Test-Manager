import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { parseCSV, downloadCSV, downloadSampleStudentsTemplate } from '../utils/csvHelper';

export function ManageStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [currentStudent, setCurrentStudent] = useState(null);

  // Form States
  const [formData, setFormData] = useState({ studentId: '', name: '', email: '', password: '', status: 'ACTIVE' });
  const [newPassword, setNewPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [processing, setProcessing] = useState(false);

  // CSV Upload States
  const [csvFile, setCsvFile] = useState(null);
  const [parsedCsvData, setParsedCsvData] = useState([]);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [csvError, setCsvError] = useState('');
  const fileInputRef = useRef(null);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.getStudents();
      setStudents(res.students || []);
    } catch (err) {
      setError(err.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setFormError('');
    try {
      await api.createStudent(formData);
      setShowAddModal(false);
      setSuccess('Student created successfully!');
      setFormData({ studentId: '', name: '', email: '', password: '', status: 'ACTIVE' });
      fetchStudents();
    } catch (err) {
      setFormError(err.message || 'Failed to create student');
    } finally {
      setProcessing(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setFormError('');
    try {
      await api.updateStudent(currentStudent.id, {
        name: formData.name,
        email: formData.email,
        status: formData.status
      });
      setShowEditModal(false);
      setSuccess('Student details updated successfully!');
      fetchStudents();
    } catch (err) {
      setFormError(err.message || 'Failed to update student');
    } finally {
      setProcessing(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setFormError('');
    try {
      await api.resetStudentPassword(currentStudent.id, { password: newPassword });
      setShowPasswordModal(false);
      setNewPassword('');
      setSuccess(`Password for ${currentStudent.name} reset successfully!`);
    } catch (err) {
      setFormError(err.message || 'Failed to reset password');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    setProcessing(true);
    setFormError('');
    try {
      await api.deleteStudent(currentStudent.id);
      setShowDeleteModal(false);
      setSuccess('Student deleted successfully!');
      fetchStudents();
    } catch (err) {
      setFormError(err.message || 'Failed to delete student');
    } finally {
      setProcessing(false);
    }
  };

  // CSV File Handler
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCsvFile(file);
    setCsvError('');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const parsed = parseCSV(text);
        if (parsed.length === 0) {
          setCsvError('The selected CSV file has no valid data rows or headers.');
          setParsedCsvData([]);
          return;
        }
        setParsedCsvData(parsed);
      } catch (err) {
        setCsvError('Failed to parse CSV file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleCsvSubmit = async () => {
    if (parsedCsvData.length === 0) {
      setCsvError('Please select a valid CSV file first.');
      return;
    }

    setProcessing(true);
    setCsvError('');

    try {
      const res = await api.bulkUploadStudents({
        students: parsedCsvData,
        replaceExisting
      });

      // If replaceExisting was true and archiveData was returned, trigger download of old records
      if (replaceExisting && Array.isArray(res.archiveData) && res.archiveData.length > 0) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        downloadCSV(`archived_students_results_${timestamp}.csv`, res.archiveData);
      }

      setSuccess(res.message || 'Students imported successfully!');
      setShowCsvModal(false);
      setCsvFile(null);
      setParsedCsvData([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchStudents();
    } catch (err) {
      setCsvError(err.message || 'Bulk upload failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleExportStudents = () => {
    if (students.length === 0) {
      alert('No students to export.');
      return;
    }
    const exportData = students.map(s => ({
      student_id: s.studentId || s.student_id,
      name: s.name,
      email: s.email,
      status: s.status,
      created_at: s.createdAt || s.created_at
    }));
    downloadCSV('students_list.csv', exportData);
  };

  const filteredStudents = students.filter((s) => {
    const name = (s.name || '').toLowerCase();
    const stuId = (s.studentId || s.student_id || '').toLowerCase();
    const email = (s.email || '').toLowerCase();
    const q = search.toLowerCase();
    return name.includes(q) || stuId.includes(q) || email.includes(q);
  });

  return (
    <div className="admin-layout">
      <Sidebar />
      <div className="admin-main">
        <main className="admin-content">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
                Manage Students
              </h1>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                Create student accounts, upload bulk CSV rosters, reset credentials, and manage enrollment.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  setCsvFile(null);
                  setParsedCsvData([]);
                  setCsvError('');
                  setShowCsvModal(true);
                }}
                className="btn btn-secondary"
                style={{ gap: '0.4rem' }}
              >
                📥 Import CSV
              </button>
              <button
                onClick={handleExportStudents}
                className="btn btn-outline"
                style={{ gap: '0.4rem' }}
              >
                📤 Export CSV
              </button>
              <button
                onClick={() => {
                  setFormData({ studentId: '', name: '', email: '', password: '', status: 'ACTIVE' });
                  setFormError('');
                  setShowAddModal(true);
                }}
                className="btn btn-primary"
              >
                + Add Student
              </button>
            </div>
          </div>

          {error && <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>{error}</div>}
          {success && <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>{success}</div>}

          {/* Search Bar */}
          <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
            <input
              type="text"
              placeholder="🔍 Search students by name, Student ID / Roll number, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input"
            />
          </div>

          {/* Students Table */}
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                Loading student directory...
              </div>
            ) : filteredStudents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                {search ? 'No students found matching your search.' : 'No students registered yet. Click "+ Add Student" or "📥 Import CSV" to populate records.'}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Student ID / Roll No</th>
                      <th>Full Name</th>
                      <th>Email Address</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((s) => {
                      const isActive = (s.status || 'ACTIVE').toUpperCase() === 'ACTIVE';
                      const studentId = s.studentId || s.student_id;
                      return (
                        <tr key={s.id}>
                          <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>
                            {studentId}
                          </td>
                          <td style={{ fontWeight: 500 }}>{s.name}</td>
                          <td style={{ color: 'var(--color-text-secondary)' }}>{s.email}</td>
                          <td>
                            <span className={`badge ${isActive ? 'badge-success' : 'badge-inactive'}`}>
                              {s.status}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                              <button
                                onClick={() => {
                                  setCurrentStudent(s);
                                  setFormData({ name: s.name, email: s.email, status: s.status });
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
                                  setCurrentStudent(s);
                                  setNewPassword('');
                                  setFormError('');
                                  setShowPasswordModal(true);
                                }}
                                className="btn btn-outline"
                                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', height: '30px' }}
                              >
                                Reset Pass
                              </button>
                              <button
                                onClick={() => {
                                  setCurrentStudent(s);
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

      {/* CSV Bulk Upload Modal */}
      {showCsvModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '650px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
                📥 Bulk Upload Students CSV
              </h2>
              <button
                type="button"
                onClick={downloadSampleStudentsTemplate}
                className="btn btn-outline"
                style={{ fontSize: '0.75rem', height: '30px' }}
              >
                📄 Download Template CSV
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
              Upload a <code>.csv</code> file with columns: <code>student_id</code>, <code>name</code>, <code>email</code>, <code>password</code>, <code>status</code>.
            </p>

            {csvError && <div className="alert alert-error" style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>{csvError}</div>}

            <div className="form-group">
              <label className="form-label">Select CSV File</label>
              <input
                type="file"
                accept=".csv,text/csv"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="input"
              />
            </div>

            {/* Import Mode Options */}
            <div style={{ margin: '1.25rem 0', padding: '1rem', background: 'var(--color-bg-alt)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>Import Behavior:</div>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', cursor: 'pointer', marginBottom: '0.75rem' }}>
                <input
                  type="radio"
                  name="importMode"
                  checked={!replaceExisting}
                  onChange={() => setReplaceExisting(false)}
                  style={{ marginTop: '0.2rem' }}
                />
                <span style={{ fontSize: '0.85rem' }}>
                  <strong>Append / Merge</strong>: Adds new students and skips duplicates. Existing exam scores remain untouched.
                </span>
              </label>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="importMode"
                  checked={replaceExisting}
                  onChange={() => setReplaceExisting(true)}
                  style={{ marginTop: '0.2rem' }}
                />
                <span style={{ fontSize: '0.85rem', color: 'var(--color-danger)' }}>
                  <strong>Replace Entire Student List</strong>: Wipes previous student records and populates new CSV. <em>(Existing scores/results are automatically downloaded into an archive CSV backup).</em>
                </span>
              </label>
            </div>

            {/* Preview Table */}
            {parsedCsvData.length > 0 && (
              <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-text)' }}>
                  Preview: {parsedCsvData.length} records ready to import
                </div>
                <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                  <table className="table" style={{ fontSize: '0.8rem' }}>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedCsvData.slice(0, 5).map((row, idx) => (
                        <tr key={idx}>
                          <td>{row.student_id || row.studentid || row.roll_number || 'N/A'}</td>
                          <td>{row.name || row.fullname || 'N/A'}</td>
                          <td>{row.email || 'N/A'}</td>
                          <td>{row.status || 'ACTIVE'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedCsvData.length > 5 && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                    + {parsedCsvData.length - 5} more rows...
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                type="button"
                onClick={() => setShowCsvModal(false)}
                disabled={processing}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCsvSubmit}
                disabled={processing || parsedCsvData.length === 0}
                className="btn btn-primary"
              >
                {processing ? 'Processing CSV...' : replaceExisting ? 'Replace & Archive Students' : 'Import Students'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h2 style={{ marginTop: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)' }}>
              Add New Student
            </h2>
            {formError && <div className="alert alert-error" style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>{formError}</div>}

            <form onSubmit={handleAddSubmit}>
              <div className="form-group">
                <label className="form-label">Student ID / Roll Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. STU004"
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  className="input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. john@college.edu"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Initial Password</label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Account Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="input"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="DISABLED">Disabled</option>
                </select>
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
                  {processing ? 'Creating...' : 'Create Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {showEditModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h2 style={{ marginTop: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)' }}>
              Edit Student Details
            </h2>
            {formError && <div className="alert alert-error" style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>{formError}</div>}

            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label className="form-label">Student ID (Read-only)</label>
                <input
                  type="text"
                  disabled
                  value={currentStudent?.studentId || currentStudent?.student_id || ''}
                  className="input"
                  style={{ backgroundColor: 'var(--color-bg-alt)' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Account Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="input"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="DISABLED">Disabled</option>
                </select>
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

      {/* Reset Password Modal */}
      {showPasswordModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '420px' }}>
            <h2 style={{ marginTop: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)' }}>
              Reset Password
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
              Set a new password for <strong>{currentStudent?.name}</strong> ({currentStudent?.studentId || currentStudent?.student_id}).
            </p>
            {formError && <div className="alert alert-error" style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>{formError}</div>}

            <form onSubmit={handlePasswordSubmit}>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  type="password"
                  required
                  placeholder="Enter new password (min 6 chars)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
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
                  {processing ? 'Updating...' : 'Update Password'}
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
            <h3 style={{ marginTop: 0, color: 'var(--color-danger)' }}>Delete Student?</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
              Are you sure you want to delete <strong>{currentStudent?.name}</strong>? If this student has previous exam attempts, deletion will be blocked to preserve historical records.
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

export default ManageStudents;
