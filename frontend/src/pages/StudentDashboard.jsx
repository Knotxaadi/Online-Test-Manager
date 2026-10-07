import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import TestCard from '../components/TestCard';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [testsRes, resultsRes] = await Promise.all([
          api.getTests(),
          api.getResults()
        ]);
        setTests(testsRes.tests || []);
        setResults(resultsRes.results || []);
      } catch (err) {
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Separate available tests from completed ones
  const availableTests = tests.filter(
    (t) => t.attemptStatus !== 'SUBMITTED' && t.attemptStatus !== 'AUTO_SUBMITTED'
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg)' }}>
      <Navbar />

      <main className="container" style={{ padding: '2rem 1.5rem' }}>
        {/* Welcome & Student Profile Header */}
        <div className="card" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', color: 'var(--color-text)', marginBottom: '0.25rem' }}>
              Welcome back, {user?.name}!
            </h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
              Student ID: <strong>{user?.studentId}</strong> • Email: <strong>{user?.email}</strong>
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{
              padding: '0.75rem 1.25rem',
              backgroundColor: '#eff6ff',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                {availableTests.length}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Available Tests</div>
            </div>
            <div style={{
              padding: '0.75rem 1.25rem',
              backgroundColor: '#f0fdf4',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-success)' }}>
                {results.length}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Completed Tests</div>
            </div>
          </div>
        </div>

        {error && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid var(--color-danger)',
            color: 'var(--color-danger)',
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem'
          }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
            Loading tests...
          </div>
        ) : (
          <>
            {/* Available Tests Section */}
            <section style={{ marginBottom: '2.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--color-text)' }}>
                Available Active Tests
              </h2>

              {availableTests.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--color-text-muted)' }}>
                  <p style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>No active tests available right now.</p>
                  <span style={{ fontSize: '0.85rem' }}>Check back later or contact your instructor.</span>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                  gap: '1.25rem'
                }}>
                  {availableTests.map((test) => (
                    <TestCard key={test.id} test={test} />
                  ))}
                </div>
              )}
            </section>

            {/* Completed Tests History Section */}
            <section>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--color-text)' }}>
                Your Completed Test Results
              </h2>

              {results.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                  <p>You haven't completed any tests yet.</p>
                </div>
              ) : (
                <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.95rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
                        <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600 }}>Test Title</th>
                        <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600 }}>Subject</th>
                        <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600 }}>Score</th>
                        <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600 }}>Percentage</th>
                        <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600 }}>Status</th>
                        <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600 }}>Date</th>
                        <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600, textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((r) => (
                        <tr key={r.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '1rem 1.25rem', fontWeight: 500 }}>{r.testTitle}</td>
                          <td style={{ padding: '1rem 1.25rem', color: 'var(--color-text-muted)' }}>{r.subjectCode}</td>
                          <td style={{ padding: '1rem 1.25rem', fontWeight: 600 }}>
                            {r.obtainedMarks} / {r.totalMarks}
                          </td>
                          <td style={{ padding: '1rem 1.25rem' }}>
                            <span style={{
                              fontWeight: 600,
                              color: r.percentage >= 50 ? 'var(--color-success)' : 'var(--color-danger)'
                            }}>
                              {r.percentage}%
                            </span>
                          </td>
                          <td style={{ padding: '1rem 1.25rem' }}>
                            <span style={{
                              fontSize: '0.8rem',
                              padding: '0.2rem 0.5rem',
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor: r.attemptStatus === 'AUTO_SUBMITTED' ? '#fffbeb' : '#f0fdf4',
                              color: r.attemptStatus === 'AUTO_SUBMITTED' ? 'var(--color-warning)' : 'var(--color-success)',
                              fontWeight: 600
                            }}>
                              {r.attemptStatus}
                            </span>
                          </td>
                          <td style={{ padding: '1rem 1.25rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                            {new Date(r.createdAt).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                            <button
                              onClick={() => navigate(`/results/${r.attemptId}`)}
                              className="btn btn-secondary"
                              style={{ height: '32px', fontSize: '0.85rem' }}
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default StudentDashboard;
