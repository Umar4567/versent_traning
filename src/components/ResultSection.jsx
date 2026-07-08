function ResultSection({ results, onRestart }) {
  if (!results) return null;

  const getFeedback = (percentage) => {
    if (percentage >= 90) {
      return {
        message: 'Outstanding work! Your English readiness is strong — keep practicing to stay sharp.',
        category: 'strength',
      };
    }

    if (percentage >= 75) {
      return {
        message: 'Great progress! You are on track — focus on consistency and review a few weaker areas.',
        category: 'recommendation',
      };
    }

    if (percentage >= 50) {
      return {
        message: 'Good effort! You have a solid foundation — work on accuracy and timing next.',
        category: 'recommendation',
      };
    }

    return {
      message: 'Keep going! This is a great chance to use AI practice and build stronger English skills.',
      category: 'weakness',
    };
  };

  const getSectionFeedback = (percentage) => {
    if (percentage >= 90) return 'Excellent performance in this section.';
    if (percentage >= 75) return 'Very good — a little more review will make this section stronger.';
    if (percentage >= 50) return 'Fair start; focus on the missing questions to improve here.';
    return 'Needs practice — repeat this section to build confidence.';
  };

  const feedback = getFeedback(results.percentage);

  return (
    <div id="resultsSection" className="section active">
      <div className="results-container">
        <div className="results-header">
          {results.userEmail && (
            <div style={{ marginBottom: 15, paddingBottom: 15, borderBottom: '1px solid #ddd' }}>
              <div style={{ fontSize: '14px', color: '#666' }}>Candidate Information</div>
              {results.userId && <div style={{ fontSize: '16px', fontWeight: 'bold' }}>User ID: {results.userId}</div>}
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>Email: {results.userEmail}</div>
            </div>
          )}
          <div className="result-icon">📊</div>
          <div className="total-score">
            <div className="score-number">{results.total_score ?? results.completed ?? 0}</div>
            <div className="score-max">/ {results.totalQuestions} completed</div>
          </div>
          <div className="score-percentage">{results.percentage}%</div>
          <div className={`feedback-text ${feedback.category}`}>{feedback.message}</div>
        </div>

        <div className="insights-section">
          <h3>Performance Insights</h3>
          <div className="insight-item strength">
            <span className="insight-icon">✅</span>
            <div>
              <strong>Completed:</strong>
              <p>{results.total_score ?? results.completed ?? 0} out of {results.totalQuestions}</p>
            </div>
          </div>
          <div className={`insight-item ${feedback.category}`}>
            <span className="insight-icon">💡</span>
            <div>
              <strong>Overall recommendation:</strong>
              <p>{feedback.message}</p>
            </div>
          </div>
        </div>

        <div className="section-feedback-grid">
          {results.sectionResults.map((section) => (
            <div key={section.key} className={`section-feedback-card ${section.percentage >= 75 ? 'strength' : section.percentage >= 50 ? 'recommendation' : 'weakness'}`}>
              <div className="section-feedback-header">
                <strong>{section.name}</strong>
                <span>{section.percentage}%</span>
              </div>
              <div className="section-feedback-body">
                <p>{section.completed} / {section.total} completed</p>
                <p>{getSectionFeedback(section.percentage)}</p>
              </div>
            </div>
          ))}
        </div>

        <button onClick={onRestart} className="btn-primary retry-btn">
          🤖 Generate NEW AI Questions
        </button>
      </div>
    </div>
  );
}

export default ResultSection;
