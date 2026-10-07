import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import api from '../services/api';

export function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    studentCount: 0,
    subjectCount: 0,
    testCount: 0,
    questionCount: 0,
    resultCount: 0
  });
  const [recentResults, setRecentResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [studentsRes, subjectsRes, testsRes, questionsRes, resultsRes] = await Promise.all([
          api.getStudents(),
          api.getSubjects(),
          api.getTests(),
          api.getQuestions(),
          api.getResults()
        ]);

        setStats({
          studentCount: studentsRes.students?.length || 0,
          subjectCount: subjectsRes.subjects?.length || 0,
          testCount: testsRes.tests?.length || 0,
          questionCount: questionsRes.questions?.length || 0,
          resultCount: resultsRes.results?.length || 0
        });

        setRecentResults((resultsRes.results || []).slice(0, 5));
      } catch (err) {
        setError(err.message || 'Failed to load admin dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="admin-layout">
      <Sidebar />
      <div className="admin-main">
        <main className="admin-content">
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
              Admin Dashboard
            </h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
              System overview, academic metrics, and quick management controls.
            </p>
          </div>

          {error && <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>{error}</div>}

          {loading ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
              Loading dashboard statistics...
            </div>
          ) : (
            <>
              {/* Stat Cards Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1.25rem',
                marginBottom: '2rem'
              }}>
                <div
                  className="card"
                  onClick={() => navigate('/admin/students')}
                  style={{ cursor: 'pointer', transition: 'box-shadow 150ms ease, transform 150ms ease' }}
                >
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>👥 Total Students</div>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-primary)', marginTop: '0.25rem' }}>
                    {stats.studentCount}
                  </div>
                </div>

                <div
                  className="card"
                  onClick={() => navigate('/admin/subjects')}
                  style={{ cursor: 'pointer', transition: 'box-shadow 150ms ease, transform 150ms ease' }}
                >
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>📚 Subjects</div>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: '#0d9488', marginTop: '0.25rem' }}>
                    {stats.subjectCount}
                  </div>
                </div>

                <div
                  className="card"
                  onClick={() => navigate('/admin/tests')}
                  style={{ cursor: 'pointer', transition: 'box-shadow 150ms ease, transform 150ms ease' }}
                >
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>📝 Online Tests</div>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f59e0b', marginTop: '0.25rem' }}>
                    {stats.testCount}
                  </div>
                </div>

                <div
                  className="card"
                  onClick={() => navigate('/admin/questions')}
                  style={{ cursor: 'pointer', transition: 'box-shadow 150ms ease, transform 150ms ease' }}
                >
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>❓ Question Bank</div>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: '#8b5cf6', marginTop: '0.25rem' }}>
                    {stats.questionCount}
                  </div>
                </div>

                <div
                  className="card"
                  onClick={() => navigate('/admin/results')}
                  style={{ cursor: 'pointer', transition: 'box-shadow 150ms ease, transform 150ms ease' }}
                >
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>📈 Submissions</div>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-success)', marginTop: '0.25rem' }}>
                    {stats.resultCount}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="card" style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--color-text)' }}>
                  ⚡ Quick Management Actions
                </h2>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button onClick={() => navigate('/admin/students')} className="btn btn-secondary">
                    👥 Manage Students
                  </button>
                  <button onClick={() => navigate('/admin/subjects')} className="btn btn-secondary">
                    📚 Manage Subjects
                  </button>
                  <button onClick={() => navigate('/admin/tests')} className="btn btn-secondary">
                    📝 Manage Tests
                  </button>
                  <button onClick={() => navigate('/admin/questions')} className="btn btn-secondary">
                    ❓ Question Bank
                  </button>
                  <button onClick={() => navigate('/admin/results')} className="btn btn-secondary">
                    📈 View Results
                  </button>
                </div>
              </div>

              {/* Recent Activity Table */}
              <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
                    Recent Exam Submissions
                  </h2>
                  <button
                    onClick={() => navigate('/admin/results')}
                    className="btn btn-outline"
                    style={{ fontSize: '0.8rem', height: '30px' }}
                  >
                    View All Submissions →
                  </button>
                </div>

                {recentResults.length === 0 ? (
                  <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No recent student attempts yet.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Test</th>
                          <th>Score</th>
                          <th>Percentage</th>
                          <th>Status</th>
                          <th>Date</th>
                          <th style={{ textAlign: 'right' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentResults.map((r) => {
                          const studentId = r.studentId || r.student_id || r.roll_number || 'N/A';
                          const studentName = r.studentName || r.student_name || 'Student';
                          const testTitle = r.testTitle || r.test_title || 'Exam';
                          const attemptStatus = (r.attemptStatus || r.attempt_status || 'SUBMITTED').toUpperCase();
                          const score = r.obtainedMarks !== undefined ? r.obtainedMarks : (r.score !== undefined ? r.score : '-');
                          const totalMarks = r.totalMarks || r.total_marks || '-';
                          const percentage = r.percentage !== undefined && r.percentage !== null ? Number(r.percentage).toFixed(1) : null;
                          const attemptId = r.attemptId || r.attempt_id || r.id;

                          return (
                            <tr key={attemptId}>
                              <td>
                                <div style={{ fontWeight: 600 }}>{studentName}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>ID: {studentId}</div>
                              </td>
                              <td>{testTitle}</td>
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
                                <span className={`badge ${attemptStatus === 'SUBMITTED' ? 'badge-success' : 'badge-warning'}`}>
                                  {attemptStatus}
                                </span>
                              </td>
                              <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                {r.submittedAt || r.submitted_at || r.createdAt ? new Date(r.submittedAt || r.submitted_at || r.createdAt).toLocaleDateString() : '-'}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <button
                                  className="btn btn-outline"
                                  style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', height: '28px' }}
                                  onClick={() => navigate(`/results/${attemptId}`)}
                                >
                                  Details
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
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default AdminDashboard;
