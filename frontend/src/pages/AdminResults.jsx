import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { downloadCSV } from '../utils/csvHelper';

export default function AdminResults() {
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.getResults();
      setResults(res.results || []);
    } catch (err) {
      setError(err.message || 'Failed to load test results');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (results.length === 0) {
      alert('No results available to export.');
      return;
    }

    const exportRows = results.map((r) => {
      const studentId = r.studentId || r.student_id || r.roll_number || 'N/A';
      const studentName = r.studentName || r.student_name || 'Student';
      const email = r.studentEmail || r.email || 'N/A';
      const testTitle = r.testTitle || r.test_title || 'Exam';
      const subjectName = r.subjectName || r.subject_name || '';
      const subjectCode = r.subjectCode || r.subject_code || '';
      const attemptStatus = (r.attemptStatus || r.attempt_status || 'SUBMITTED').toUpperCase();
      const violationCount = Number(r.violationCount || r.violation_count || 0);
      const score = r.obtainedMarks !== undefined ? r.obtainedMarks : (r.score !== undefined ? r.score : 0);
      const totalMarks = r.totalMarks || r.total_marks || 0;
      const percentage = r.percentage !== undefined && r.percentage !== null ? Number(r.percentage).toFixed(2) : '0.00';
      const submittedAt = r.submittedAt || r.submitted_at || r.createdAt || '';

      return {
        'Attempt ID': r.attemptId || r.attempt_id || r.id,
        'Student ID': studentId,
        'Student Name': studentName,
        'Email': email,
        'Test Title': testTitle,
        'Subject': `${subjectName} (${subjectCode})`,
        'Obtained Marks': score,
        'Total Marks': totalMarks,
        'Percentage (%)': percentage,
        'Status': attemptStatus,
        'Violations': violationCount,
        'Submission Time': submittedAt ? new Date(submittedAt).toLocaleString() : 'N/A'
      };
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    downloadCSV(`exam_results_report_${timestamp}.csv`, exportRows);
  };

  const filteredResults = results.filter((r) => {
    const studentName = (r.studentName || r.student_name || '').toLowerCase();
    const rollNo = (r.studentId || r.student_id || r.roll_number || '').toLowerCase();
    const testTitle = (r.testTitle || r.test_title || '').toLowerCase();
    const q = searchQuery.toLowerCase();

    const matchesSearch = studentName.includes(q) || rollNo.includes(q) || testTitle.includes(q);
    const attemptStatus = (r.attemptStatus || r.attempt_status || '').toLowerCase();
    const matchesStatus = statusFilter ? attemptStatus === statusFilter.toLowerCase() : true;

    return matchesSearch && matchesStatus;
  });

  // Analytics
  const totalSubmissions = results.length;
  const avgScore = totalSubmissions > 0
    ? (results.reduce((acc, curr) => acc + (Number(curr.percentage) || 0), 0) / totalSubmissions).toFixed(1)
    : '0.0';
  const highestScore = totalSubmissions > 0
    ? Math.max(...results.map(r => Number(r.percentage) || 0)).toFixed(1)
    : '0.0';
  const disqualifiedCount = results.filter(r => {
    const st = (r.attemptStatus || r.attempt_status || '').toLowerCase();
    const viol = Number(r.violationCount || r.violation_count || 0);
    return st === 'disqualified' || viol >= 3;
  }).length;

  return (
    <div className="admin-layout">
      <Sidebar />
      <div className="admin-main">
        <main className="admin-content">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
                Student Results & Exam Submissions
              </h1>
              <p style={{ color: 'var(--color-text-muted)', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
                View and audit all student scores, percentages, attempt statuses, and violation logs.
              </p>
            </div>
            <button
              onClick={handleExportCSV}
              className="btn btn-primary"
              style={{ gap: '0.4rem' }}
            >
              📥 Export Results CSV
            </button>
          </div>

          {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

          {/* Stats Overview */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Total Submissions</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-primary)' }}>{totalSubmissions}</div>
            </div>
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Average Score</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-success)' }}>{avgScore}%</div>
            </div>
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Highest Score</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#6366f1' }}>{highestScore}%</div>
            </div>
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Violations / Disqualified</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: disqualifiedCount > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
                {disqualifiedCount}
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '240px' }}>
                <input
                  type="text"
                  className="input"
                  placeholder="🔍 Search by student name, student ID, or test title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div style={{ width: '200px' }}>
                <select
                  className="input"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="AUTO_SUBMITTED">Auto-Submitted</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="DISQUALIFIED">Disqualified</option>
                </select>
              </div>
            </div>
          </div>

          {/* Results Table */}
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                Loading submission records...
              </div>
            ) : filteredResults.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                {searchQuery || statusFilter ? 'No results match the selected filters.' : 'No student attempts recorded yet.'}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Test / Subject</th>
                      <th>Score</th>
                      <th>Percentage</th>
                      <th>Status</th>
                      <th>Violations</th>
                      <th>Submitted At</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResults.map((r) => {
                      const studentId = r.studentId || r.student_id || r.roll_number || 'N/A';
                      const studentName = r.studentName || r.student_name || 'Student';
                      const testTitle = r.testTitle || r.test_title || 'Exam';
                      const subjectName = r.subjectName || r.subject_name || '';
                      const attemptStatus = (r.attemptStatus || r.attempt_status || 'SUBMITTED').toUpperCase();
                      const violationCount = Number(r.violationCount || r.violation_count || 0);
                      const isDisqualified = attemptStatus === 'DISQUALIFIED' || violationCount >= 3;
                      const score = r.obtainedMarks !== undefined ? r.obtainedMarks : (r.score !== undefined ? r.score : '-');
                      const totalMarks = r.totalMarks || r.total_marks || '-';
                      const percentage = r.percentage !== undefined && r.percentage !== null ? Number(r.percentage).toFixed(1) : null;
                      const attemptId = r.attemptId || r.attempt_id || r.id;

                      return (
                        <tr key={attemptId}>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{studentName}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                              ID: {studentId}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 500 }}>{testTitle}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                              {subjectName}
                            </div>
                          </td>
                          <td style={{ fontWeight: 600 }}>
                            {score !== '-' ? `${score} / ${totalMarks}` : '-'}
                          </td>
                          <td>
                            {percentage !== null ? (
                              <span style={{
                                fontWeight: 700,
                                color: Number(percentage) >= 50 ? 'var(--color-success)' : 'var(--color-danger)'
                              }}>
                                {percentage}%
                              </span>
                            ) : '-'}
                          </td>
                          <td>
                            <span
                              className={`badge ${isDisqualified ? 'badge-danger' : attemptStatus === 'SUBMITTED' ? 'badge-success' : 'badge-warning'}`}
                            >
                              {attemptStatus}
                            </span>
                          </td>
                          <td>
                            <span style={{
                              fontWeight: 600,
                              color: violationCount > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)'
                            }}>
                              {violationCount}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                            {r.submittedAt || r.submitted_at || r.createdAt ? new Date(r.submittedAt || r.submitted_at || r.createdAt).toLocaleString() : '-'}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              className="btn btn-outline"
                              style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', height: '30px' }}
                              onClick={() => navigate(`/results/${attemptId}`)}
                            >
                              View Details
                            </button>
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
    </div>
  );
}
