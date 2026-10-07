import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Timer from '../components/Timer';
import QuestionCard from '../components/QuestionCard';
import useViolationMonitor from '../hooks/useViolationMonitor';
import api from '../services/api';

export function TestPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Violation Alert State
  const [violationCount, setViolationCount] = useState(0);
  const [violationWarning, setViolationWarning] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const isSubmittedRef = useRef(false);

  // 1. Fetch Attempt & Questions
  useEffect(() => {
    const fetchAttemptData = async () => {
      try {
        const res = await api.getAttempt(attemptId);

        if (res.attempt.status === 'SUBMITTED' || res.attempt.status === 'AUTO_SUBMITTED') {
          isSubmittedRef.current = true;
          navigate(`/results/${attemptId}`);
          return;
        }

        setAttempt(res.attempt);
        setQuestions(res.questions || []);
        setAnswers(res.answers || {});
        setViolationCount(res.attempt.violationCount || 0);
      } catch (err) {
        setError(err.message || 'Failed to load test');
      } finally {
        setLoading(false);
      }
    };

    fetchAttemptData();
  }, [attemptId, navigate]);

  // 2. Violation Handler (Callback from useViolationMonitor)
  const handleViolation = useCallback(async (type) => {
    if (isSubmittedRef.current) return;

    try {
      const res = await api.logViolation(attemptId, type);
      setViolationCount(res.violationCount);

      if (res.autoSubmitted) {
        isSubmittedRef.current = true;
        alert('Maximum violations reached! Your test has been auto-submitted.');
        navigate(`/results/${attemptId}`);
      } else {
        setViolationWarning(`⚠️ Warning: Browser focus loss or tab switch detected (${res.violationCount}/${res.maxViolations}). Reaching ${res.maxViolations} violations will auto-submit your test!`);
        setTimeout(() => setViolationWarning(''), 5000);
      }
    } catch (err) {
      console.error('Failed to log violation:', err.message);
    }
  }, [attemptId, navigate]);

  // Enable Activity Monitoring
  useViolationMonitor(!loading && !submitting && !isSubmittedRef.current, handleViolation);

  // 3. Option Selection & Auto-Save
  const handleSelectOption = async (questionId, optionId) => {
    // Update local state immediately for responsive UI
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionId
    }));

    try {
      await api.saveAnswer(attemptId, questionId, optionId);
    } catch (err) {
      if (err.data?.autoSubmitted) {
        isSubmittedRef.current = true;
        alert('Time expired! Your test was auto-submitted.');
        navigate(`/results/${attemptId}`);
      } else {
        setError('Failed to save answer to server. Please re-select.');
      }
    }
  };

  // 4. Test Submission
  const handleSubmitTest = async () => {
    if (isSubmittedRef.current) return;
    setSubmitting(true);
    setError('');

    try {
      isSubmittedRef.current = true;
      await api.submitAttempt(attemptId);
      navigate(`/results/${attemptId}`);
    } catch (err) {
      setError(err.message || 'Failed to submit test');
      setSubmitting(false);
      isSubmittedRef.current = false;
    }
  };

  // 5. Timer Expiry Handler
  const handleTimerExpire = useCallback(async () => {
    if (isSubmittedRef.current) return;
    isSubmittedRef.current = true;
    try {
      await api.submitAttempt(attemptId);
    } catch (err) {
      console.error('Auto submit error on timer expire:', err);
    } finally {
      navigate(`/results/${attemptId}`);
    }
  }, [attemptId, navigate]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--color-bg)' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>Loading examination room...</p>
      </div>
    );
  }

  if (error && !attempt) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--color-bg)', padding: '1rem' }}>
        <div className="card" style={{ maxWidth: '500px', textAlign: 'center', padding: '2rem' }}>
          <h2 style={{ color: 'var(--color-danger)', marginBottom: '1rem' }}>Error</h2>
          <p style={{ marginBottom: '1.5rem' }}>{error}</p>
          <button onClick={() => navigate('/dashboard')} className="btn btn-secondary">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).filter(k => answers[k] !== null && answers[k] !== undefined).length;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Distraction-Free Header */}
      <header style={{
        backgroundColor: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        padding: '0.75rem 1.5rem',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div>
            <h1 style={{ fontSize: '1.2rem', color: 'var(--color-text)', margin: 0 }}>
              {attempt?.title}
            </h1>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Answered {answeredCount} of {totalQuestions}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Timer
              expiresAt={attempt?.expiresAt}
              serverNow={attempt?.serverNow}
              onExpire={handleTimerExpire}
            />
            <button
              onClick={() => setShowConfirmModal(true)}
              className="btn btn-primary"
              disabled={submitting}
              style={{ fontWeight: 600, height: '38px' }}
            >
              {submitting ? 'Submitting...' : 'SUBMIT TEST'}
            </button>
          </div>
        </div>
      </header>

      {/* Violation Alert Banner */}
      {violationWarning && (
        <div
          role="alert"
          style={{
            backgroundColor: '#fffbeb',
            borderBottom: '1px solid var(--color-warning)',
            color: '#b45309',
            padding: '0.75rem 1.5rem',
            textAlign: 'center',
            fontWeight: 600,
            fontSize: '0.95rem'
          }}
        >
          {violationWarning}
        </div>
      )}

      {error && (
        <div style={{
          backgroundColor: '#fef2f2',
          borderBottom: '1px solid var(--color-danger)',
          color: 'var(--color-danger)',
          padding: '0.75rem 1.5rem',
          textAlign: 'center',
          fontSize: '0.9rem'
        }}>
          {error}
        </div>
      )}

      {/* Main Examination Area: 2 Columns */}
      <main style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '1.5rem',
        width: '100%',
        flex: 1,
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 280px',
        gap: '1.5rem',
        alignItems: 'start'
      }}>
        {/* Left Column: Question Card & Navigation Buttons */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <QuestionCard
            question={currentQuestion}
            questionNumber={currentIndex + 1}
            totalQuestions={totalQuestions}
            selectedOptionId={answers[currentQuestion?.id]}
            onSelectOption={handleSelectOption}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="btn btn-secondary"
            >
              ← Previous
            </button>

            <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
              Question {currentIndex + 1} of {totalQuestions}
            </span>

            {currentIndex < totalQuestions - 1 ? (
              <button
                onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                className="btn btn-primary"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={() => setShowConfirmModal(true)}
                className="btn btn-primary"
                style={{ backgroundColor: 'var(--color-success)' }}
              >
                Review & Submit ✓
              </button>
            )}
          </div>
        </section>

        {/* Right Column: Question Palette */}
        <aside className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--color-text)' }}>
            Question Palette
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '0.5rem',
            marginBottom: '1.25rem'
          }}>
            {questions.map((q, idx) => {
              const isCurrent = idx === currentIndex;
              const isAnswered = answers[q.id] !== null && answers[q.id] !== undefined;

              let bgColor = 'var(--color-surface)';
              let textColor = 'var(--color-text)';
              let borderColor = 'var(--color-border)';

              if (isCurrent) {
                bgColor = 'var(--color-primary)';
                textColor = '#ffffff';
                borderColor = 'var(--color-primary-dark)';
              } else if (isAnswered) {
                bgColor = 'var(--color-success)';
                textColor = '#ffffff';
                borderColor = 'var(--color-success)';
              }

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  aria-label={`Question ${idx + 1}, ${isAnswered ? 'answered' : 'unanswered'}`}
                  style={{
                    height: '38px',
                    borderRadius: 'var(--radius-sm)',
                    border: `1.5px solid ${borderColor}`,
                    backgroundColor: bgColor,
                    color: textColor,
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    transition: 'all 150ms ease'
                  }}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Palette Legend */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            fontSize: '0.8rem',
            color: 'var(--color-text-muted)',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--color-border)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: '14px', height: '14px', backgroundColor: 'var(--color-primary)', borderRadius: '3px' }}></span>
              <span>Current Question</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: '14px', height: '14px', backgroundColor: 'var(--color-success)', borderRadius: '3px' }}></span>
              <span>Answered ({answeredCount})</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: '14px', height: '14px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '3px' }}></span>
              <span>Unanswered ({totalQuestions - answeredCount})</span>
            </div>
          </div>
        </aside>
      </main>

      {/* Submit Confirmation Modal */}
      {showConfirmModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem'
        }}>
          <div className="card" style={{ maxWidth: '440px', width: '100%', padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', color: 'var(--color-text)' }}>
              Confirm Test Submission
            </h3>
            <p style={{ fontSize: '0.95rem', color: 'var(--color-text)', marginBottom: '1rem' }}>
              Are you sure you want to submit your test?
            </p>

            <div style={{
              backgroundColor: 'var(--color-bg)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              marginBottom: '1.5rem',
              fontSize: '0.9rem'
            }}>
              <div>Total Questions: <strong>{totalQuestions}</strong></div>
              <div>Answered: <strong style={{ color: 'var(--color-success)' }}>{answeredCount}</strong></div>
              <div>Unanswered: <strong style={{ color: 'var(--color-danger)' }}>{totalQuestions - answeredCount}</strong></div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="btn btn-secondary"
                disabled={submitting}
              >
                Back to Test
              </button>
              <button
                onClick={handleSubmitTest}
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Yes, Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TestPage;
