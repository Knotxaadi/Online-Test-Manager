import React from 'react';

export function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  selectedOptionId,
  onSelectOption
}) {
  if (!question) return null;

  return (
    <div className="card" style={{ padding: '2rem' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.25rem',
        paddingBottom: '0.75rem',
        borderBottom: '1px solid var(--color-border)'
      }}>
        <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--color-text-muted)' }}>
          Question {questionNumber} of {totalQuestions}
        </span>
        <span style={{ fontSize: '0.85rem', color: 'var(--color-primary)', fontWeight: 500 }}>
          {question.marks} mark{question.marks > 1 ? 's' : ''}
        </span>
      </div>

      <h2 style={{
        fontSize: '1.25rem',
        lineHeight: 1.6,
        fontWeight: 600,
        marginBottom: '1.5rem',
        color: 'var(--color-text)'
      }}>
        {question.questionText}
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {question.options.map((option, index) => {
          const isSelected = selectedOptionId === option.id;
          const letter = String.fromCharCode(65 + index); // A, B, C, D

          return (
            <label
              key={option.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '1rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                border: `1.5px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                backgroundColor: isSelected ? '#eff6ff' : 'var(--color-surface)',
                cursor: 'pointer',
                transition: 'all 150ms ease'
              }}
            >
              <input
                type="radio"
                name={`question-${question.id}`}
                value={option.id}
                checked={isSelected}
                onChange={() => onSelectOption(question.id, option.id)}
                style={{
                  marginRight: '1rem',
                  accentColor: 'var(--color-primary)',
                  width: '18px',
                  height: '18px'
                }}
              />
              <span style={{
                fontWeight: 600,
                color: isSelected ? 'var(--color-primary)' : 'var(--color-text-muted)',
                marginRight: '0.75rem'
              }}>
                {letter}.
              </span>
              <span style={{ color: 'var(--color-text)', fontSize: '1rem' }}>
                {option.optionText}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export default QuestionCard;
