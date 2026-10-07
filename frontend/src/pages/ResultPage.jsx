import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export function ResultPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const res = await api.getResult(attemptId);
        setResult(res.result);
      } catch (err) {
        setError(err.message || 'Failed to load test results');
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [attemptId]);

  const isAdmin = user?.role === 'admin';

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--color-bg)' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>Loading assessment report...</p>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg)' }}>
        {!isAdmin && <Navbar />}
        <div style={{ display: 'flex' }}>
          {isAdmin && <Sidebar />}
          <main className="container" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
            <div className="card" style={{ maxWidth: '500px', margin: '0 auto', padding: '2rem' }}>
              <h2 style={{ color: 'var(--color-danger)', marginBottom: '1rem' }}>Result Not Found</h2>
              <p style={{ marginBottom: '1.5rem' }}>{error || 'Unable to retrieve test results.'}</p>
              <button
                onClick={() => navigate(isAdmin ? '/admin/results' : '/dashboard')}
                className="btn btn-secondary"
              >
                Return to {isAdmin ? 'Results' : 'Dashboard'}
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const isPassed = result.percentage >= 50;

  const content = (
    <main className="container" style={{ padding: '2.5rem 1.5rem', maxWidth: '750px' }}>
      <div className="card" style={{ padding: '2.5rem' }}>
        {/* Test & Student Meta */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <span style={{
            fontSize: '0.8rem',
            fontWeight: 600,
            padding: '0.25rem 0.6rem',
            backgroundColor: '#eff6ff',
            color: 'var(--color-primary)',
            borderRadius: 'var(--radius-sm)'
          }}>
            {result.subjectCode} - {result.subjectName}
          </span>

          <h1 style={{ fontSize: '1.75rem', color: 'var(--color-text)', marginTop: '0.5rem', marginBottom: '0.25rem' }}>
            {result.testTitle}
          </h1>

          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
            Student: <strong>{result.studentName}</strong> ({result.studentId})
          </p>
        </div>

        {/* Big Score Card */}
        <div style={{
          backgroundColor: isPassed ? '#f0fdf4' : '#fef2f2',
          border: `1.5px solid ${isPassed ? 'var(--color-success)' : 'var(--color-danger)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '2rem',
          textAlign: 'center',
          marginBottom: '2rem'
        }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
            FINAL SCORE
          </div>
          <div style={{
            fontSize: '3rem',
            fontWeight: 800,
            color: isPassed ? 'var(--color-success)' : 'var(--color-danger)',
            lineHeight: 1
          }}>
            {result.obtainedMarks} <span style={{ fontSize: '1.5rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>/ {result.totalMarks}</span>
          </div>
          <div style={{
            display: 'inline-block',
            marginTop: '0.75rem',
            padding: '0.35rem 1rem',
            borderRadius: 'var(--radius-full)',
            backgroundColor: isPassed ? 'var(--color-success)' : 'var(--color-danger)',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: '0.9rem'
          }}>
            {result.percentage}% • {isPassed ? 'Passed' : 'Needs Improvement'}
          </div>

          <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            Status: <strong>{result.attemptStatus}</strong>
          </div>
        </div>

        {/* Detailed Breakdown Grid */}
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--color-text)' }}>
          Performance Breakdown
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <div style={{ padding: '1rem', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Total Questions</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--color-text)' }}>{result.totalQuestions}</div>
          </div>

          <div style={{ padding: '1rem', backgroundColor: '#f0fdf4', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Correct</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--color-success)' }}>{result.correctAnswers}</div>
          </div>

          <div style={{ padding: '1rem', backgroundColor: '#fef2f2', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Incorrect</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--color-danger)' }}>{result.wrongAnswers}</div>
          </div>

          <div style={{ padding: '1rem', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Unanswered</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--color-text)' }}>{result.unanswered}</div>
          </div>

          <div style={{ padding: '1rem', backgroundColor: result.violationCount > 0 ? '#fffbeb' : 'var(--color-bg)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Violations</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: result.violationCount > 0 ? 'var(--color-warning)' : 'var(--color-text)' }}>
              {result.violationCount || 0}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={() => navigate(isAdmin ? '/admin/results' : '/dashboard')}
            className="btn btn-primary"
            style={{ minWidth: '180px' }}
          >
            ← Back to {isAdmin ? 'Results Portal' : 'Dashboard'}
          </button>
        </div>
      </div>
    </main>
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg)' }}>
      {!isAdmin && <Navbar />}
      {isAdmin ? (
        <div style={{ display: 'flex' }}>
          <Sidebar />
          <div style={{ flex: 1 }}>{content}</div>
        </div>
      ) : (
        content
      )}
    </div>
  );
}

export default ResultPage;
