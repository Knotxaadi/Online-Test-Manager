import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';

export function TestInstructions() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTest = async () => {
      try {
        const res = await api.getTest(testId);
        setTest(res.test);
      } catch (err) {
        setError(err.message || 'Failed to load test details');
      } finally {
        setLoading(false);
      }
    };

    fetchTest();
  }, [testId]);

  const handleStart = async () => {
    setStarting(true);
    setError('');
    try {
      const res = await api.startAttempt(testId);
      navigate(`/test/${res.attempt.id}`);
    } catch (err) {
      if (err.data?.autoSubmitted && err.data?.result) {
        navigate(`/results/${err.data.result.attemptId}`);
      } else {
        setError(err.message || 'Could not start test. Please try again.');
      }
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg)' }}>
        <Navbar />
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-text-muted)' }}>
          Loading test instructions...
        </div>
      </div>
    );
  }

  if (error && !test) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg)' }}>
        <Navbar />
        <div className="container" style={{ padding: '2rem 1.5rem' }}>
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <h2 style={{ color: 'var(--color-danger)', marginBottom: '1rem' }}>Error</h2>
            <p style={{ marginBottom: '1.5rem' }}>{error}</p>
            <button onClick={() => navigate('/dashboard')} className="btn btn-secondary">
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg)' }}>
      <Navbar />

      <main className="container" style={{ padding: '2rem 1.5rem', maxWidth: '800px' }}>
        <div className="card">
          <div style={{ display: 'inline-block', fontSize: '0.8rem', fontWeight: 600, padding: '0.25rem 0.5rem', backgroundColor: '#eff6ff', color: 'var(--color-primary)', borderRadius: 'var(--radius-sm)', marginBottom: '0.5rem' }}>
            {test.subjectCode} - {test.subjectName}
          </div>

          <h1 style={{ fontSize: '1.6rem', color: 'var(--color-text)', marginBottom: '0.5rem' }}>
            {test.title}
          </h1>

          {test.description && (
            <p style={{ fontSize: '0.95rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
              {test.description}
            </p>
          )}

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '1rem',
            padding: '1.25rem',
            backgroundColor: 'var(--color-bg)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '2rem',
            textAlign: 'center'
          }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Duration</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)' }}>
                {test.durationMinutes} Mins
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Questions</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)' }}>
                {test.totalQuestions} MCQs
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Total Marks</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)' }}>
                {test.totalMarks}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Max Violations</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-danger)' }}>
                {test.maxViolations || 3}
              </div>
            </div>
          </div>

          {error && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid var(--color-danger)',
              color: 'var(--color-danger)',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.5rem',
              fontSize: '0.9rem'
            }}>
              {error}
            </div>
          )}

          <h2 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-text)' }}>
            Important Instructions & Examination Rules
          </h2>

          <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.95rem', color: 'var(--color-text)', marginBottom: '2rem' }}>
            <li>This test consists of multiple-choice questions with only <strong>one correct answer</strong> per question.</li>
            <li>Once you click <strong>START TEST</strong>, the countdown timer will begin immediately.</li>
            <li>Your answers are saved automatically as you select them. You can navigate freely between questions.</li>
            <li><strong>Browser Activity Monitoring:</strong> Switching browser tabs, minimizing the window, or losing focus will be logged as a violation. Reaching <strong>{test.maxViolations || 3} violations</strong> will immediately auto-submit your test.</li>
            <li>When the timer expires, the test will automatically submit your saved answers.</li>
            <li>Each student can attempt this test <strong>only once</strong>.</li>
          </ul>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn btn-secondary"
              disabled={starting}
            >
              Cancel
            </button>
            <button
              onClick={handleStart}
              className="btn btn-primary"
              disabled={starting}
              style={{ minWidth: '140px' }}
            >
              {starting ? 'Starting Test...' : 'START TEST'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default TestInstructions;
