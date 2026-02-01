import React from 'react';
import type { Assessment, Language, ScoreLevel } from '@/shared/types';
import { t, getErrorMessage } from '@/shared/i18n';

interface AssessmentPanelProps {
  assessment: Assessment | null;
  isAssessing: boolean;
  error: string | null;
  language: Language;
  onClose: () => void;
  onAssess: () => void;
}

export const AssessmentPanel: React.FC<AssessmentPanelProps> = ({
  assessment,
  isAssessing,
  error,
  language,
  onClose,
  onAssess,
}) => {
  const getScoreColor = (score: ScoreLevel) => {
    switch (score) {
      case 'green':
        return '#22c55e';
      case 'orange':
        return '#f59e0b';
      case 'red':
        return '#ef4444';
    }
  };

  const getScoreLabel = (score: ScoreLevel) => {
    switch (score) {
      case 'green':
        return t('score_green', language);
      case 'orange':
        return t('score_orange', language);
      case 'red':
        return t('score_red', language);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom:
          'calc(var(--floating-button-bottom, 100px) + var(--floating-button-size, 60px) + 32px)',
        right: 'var(--floating-button-right, 100px)',
        width: '320px',
        maxHeight: '400px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        padding: '12px',
        zIndex: 2147483646,
        animation: 'slideUp 0.2s ease-out',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '4px 8px',
            color: '#666',
          }}
          title={t('close', language)}
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {error ? (
          <div
            style={{
              padding: '12px',
              backgroundColor: '#fef2f2',
              borderRadius: '6px',
              color: '#991b1b',
              fontSize: '14px',
            }}
          >
            {getErrorMessage(error, language)}
          </div>
        ) : assessment ? (
          <>
            {/* Score Badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: '6px',
                backgroundColor: `${getScoreColor(assessment.score)}15`,
                border: `2px solid ${getScoreColor(assessment.score)}`,
                marginBottom: '12px',
              }}
            >
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: getScoreColor(assessment.score),
                }}
              />
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: getScoreColor(assessment.score),
                }}
              >
                {getScoreLabel(assessment.score)}
              </span>
            </div>

            {/* Explanation */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '4px' }}>
                {t('explanation', language)}
              </div>
              <div style={{ fontSize: '14px', color: '#333', lineHeight: '1.5' }}>
                {assessment.explanation}
              </div>
            </div>

            {/* Missing Context */}
            {assessment.missingContext && assessment.missingContext.length > 0 && (
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '4px' }}>
                  {t('missing_context', language)}
                </div>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#333' }}>
                  {assessment.missingContext.map((item, index) => (
                    <li key={index} style={{ marginBottom: '4px' }}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <div style={{ fontSize: '14px', color: '#666', textAlign: 'center', padding: '20px 0' }}>
            {t('no_assessment', language)}
          </div>
        )}
      </div>

      {assessment && (
        <div style={{ fontSize: '12px', color: '#6b7280', textAlign: 'left' }}>
          cmd + shift + S 再次进行评估，或者停止打字后8s评估会自动重新生成
        </div>
      )}

      {/* Assess Button */}
      <button
        onClick={onAssess}
        disabled={isAssessing}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: isAssessing ? '#ccc' : '#5b21b6',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: 600,
          cursor: isAssessing ? 'not-allowed' : 'pointer',
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) => {
          if (!isAssessing) {
            e.currentTarget.style.backgroundColor = '#6d28d9';
          }
        }}
        onMouseLeave={(e) => {
          if (!isAssessing) {
            e.currentTarget.style.backgroundColor = '#5b21b6';
          }
        }}
      >
        {isAssessing ? t('assessing', language) : t('assess_button', language)}
      </button>

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};
