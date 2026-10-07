import React from 'react';
import { useNavigate } from 'react-router-dom';

export function TestCard({ test }) {
  const navigate = useNavigate();

  const isCompleted = test.attemptStatus === 'SUBMITTED' || test.attemptStatus === 'AUTO_SUBMITTED';
  const isInProgress = test.attemptStatus === 'IN_PROGRESS';

  const handleAction = () => {
    if (isCompleted) {
      navigate(`/results/${test.attemptId}`);
    } else {
      navigate(`/instructions/${test.id}`);
    }
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <span style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          padding: '0.25rem 0.5rem',
          backgroundColor: '#eff6ff',
          color: 'var(--color-primary)',
          borderRadius: 'var(--radius-sm)'
        }}>
          {test.subjectCode} - {test.subjectName}
        </span>
        {isCompleted && (
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            padding: '0.25rem 0.5rem',
            backgroundColor: '#dcfce7',
            color: 'var(--color-success)',
            borderRadius: 'var(--radius-sm)'
          }}>
            Score: {test.obtainedMarks} / {test.totalMarks}
          </span>
        )}
      </div>

      <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem', color: 'var(--color-text)' }}>
        {test.title}
      </h3>

      {test.description && (
        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '1rem', flex: 1 }}>
          {test.description}
        </p>
      )}

      <div style={{
        display: 'flex',
        gap: '1rem',
        fontSize: '0.85rem',
        color: 'var(--color-text-muted)',
        paddingTop: '0.75rem',
        borderTop: '1px solid var(--color-border)',
        marginBottom: '1rem'
      }}>
        <div>⏱ <strong>{test.durationMinutes}</strong> mins</div>
        <div>❓ <strong>{test.totalQuestions}</strong> questions</div>
        <div>🏆 <strong>{test.totalMarks}</strong> marks</div>
      </div>

      <button
        onClick={handleAction}
        className={`btn ${isCompleted ? 'btn-secondary' : 'btn-primary'}`}
        style={{ width: '100%', justifyContent: 'center' }}
      >
        {isCompleted ? 'View Result' : isInProgress ? 'Resume Test' : 'Start Test'}
      </button>
    </div>
  );
}

export default TestCard;
