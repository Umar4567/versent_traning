function Dashboard({ onStart }) {
  return (
    <div id="dashboard" className="section active">
      <div className="dashboard-content">
        <h2>🚀 AI-Generated Practice Test</h2>
        <p className="subtitle">Each question has a 30-second timer that auto-advances</p>

        

        <div className="features-grid">
          {[
            { icon: '⌨️', title: 'Typing', label: '30s timer' },
            { icon: '📝', title: 'Sentence Completion', label: '30s timer' },
            { icon: '🎧', title: 'Listening', label: '30s timer • Audio auto-stops' },
            { icon: '🎤', title: 'Speaking', label: '30s timer' },
            { icon: '📝', title: 'Dictation', label: '30s timer' },
            { icon: '🧩', title: 'Passage Reconstruction', label: '30s timer' },
            { icon: '✉️', title: 'Email Writing', label: '30s timer' },
          ].map((feature) => (
            <div className="feature-card" key={feature.title}>
              <div className="icon">{feature.icon}</div>
              <h3>{feature.title} <span className="ai-badge-small">AI</span></h3>
              <p>{feature.label}</p>
            </div>
          ))}
        </div>

        <button onClick={onStart} className="btn-primary generate-btn" id="startBtn">
          🤖 Generate NEW 20-Min AI Test
        </button>

        <div className="badge-row">
          <span className="fresh-questions-badge">🔄 Fresh Questions</span>
          <span className="auto-advance-badge">⏱️ Auto-Advance</span>
          <span className="auto-advance-badge danger">🎧 Audio Auto-Stop</span>
        </div>

        <p className="dashboard-note">⏱️ 30 seconds per question • 7 sections × 6 questions = ~20 minutes</p>
      </div>
    </div>
  );
}

export default Dashboard;
