import { useState } from 'react';

export default function AdminDashboard({ onStart, onRegisterCandidate, candidates, candidateLoading, results, resultsLoading, showRegistrationPage, onOpenRegistration, onBackToDashboard }) {
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredUserId, setRegisteredUserId] = useState(null);
  const [filterText, setFilterText] = useState('');
  const [expandedResultId, setExpandedResultId] = useState(null);

  const resetForm = () => {
    setUserId('');
    setEmail('');
    setPassword('');
    setRegisteredUserId(null);
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setMessage('');

    if (!userId.trim() || !email.trim() || !password) {
      setMessage('User ID, email, and password are required.');
      return;
    }

    setIsSubmitting(true);
    const result = await onRegisterCandidate(userId.trim(), email.trim(), password);
    setIsSubmitting(false);

    if (result?.error) {
      setMessage(result.error);
      setRegisteredUserId(null);
    } else {
      setRegisteredUserId(result?.userId || userId.trim());
      resetForm();
      setMessage(result?.message || 'Candidate registered successfully.');
    }
  };

  const sectionLabels = {
    typing: 'Typing',
    sentenceCompletion: 'Sentence Completion',
    listening: 'Listening Comprehension',
    speaking: 'Speaking',
    dictation: 'Dictation',
    passageReconstruction: 'Passage Reconstruction',
    emailWriting: 'Email Writing',
  };

  const parseJsonValue = (value) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value || {};
  };

  const getQuestionCount = (questions) => {
    if (!questions || typeof questions !== 'object') return 0;
    return Object.values(questions).reduce((count, items) => {
      if (Array.isArray(items)) return count + items.length;
      return count;
    }, 0);
  };

  const renderQuestionText = (section, question, idx) => {
    if (!question) return `Question ${idx + 1}`;
    if (section === 'typing' || section === 'dictation') {
      return question.text || question.prompt || `Question ${idx + 1}`;
    }
    if (section === 'sentenceCompletion') {
      return `${question.sentence} (Correct: ${question.answer || 'N/A'})`;
    }
    if (section === 'listening') {
      return `${question.audioText?.slice(0, 80) || 'Listening passage'}...`;
    }
    if (section === 'speaking') {
      return question.prompt || `Speaking prompt ${idx + 1}`;
    }
    if (section === 'passageReconstruction') {
      return `Reconstruct passage ${idx + 1}`;
    }
    if (section === 'emailWriting') {
      return question.prompt || `Email writing ${idx + 1}`;
    }
    return `Question ${idx + 1}`;
  };

  const renderAnswerText = (section, answer, question) => {
    if (answer == null || answer === '') return 'No answer provided';
    if (section === 'listening' && typeof answer === 'object') {
      return Object.entries(answer)
        .map(([key, value]) => `Q${parseInt(key, 10) + 1}: ${value}`)
        .join(' | ');
    }
    if (section === 'passageReconstruction' && Array.isArray(answer) && question?.sentences) {
      return answer.map((idx) => question.sentences[idx]).join(' ↔ ');
    }
    if (typeof answer === 'object') {
      return JSON.stringify(answer);
    }
    return String(answer);
  };

  const renderResultDetails = (result) => {
    const questions = parseJsonValue(result.questions || result.rawAnswers?.questions || {});
    const answers = parseJsonValue(result.rawAnswers || {});
    const detailSections = Object.entries(questions)
      .map(([section, items]) => {
        if (!Array.isArray(items) || !items.length) return null;

        return (
          <div className="detail-section" key={section}>
            <div className="detail-section-heading">{sectionLabels[section] || section}</div>
            <table className="detail-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Question</th>
                  <th>Candidate Answer</th>
                </tr>
              </thead>
              <tbody>
                {items.map((question, idx) => {
                  const keyName = `${section}_${idx}`;
                  const answer = answers[keyName];
                  return (
                    <tr key={`${section}-${idx}`}>
                      <td>{idx + 1}</td>
                      <td>{renderQuestionText(section, question, idx)}</td>
                      <td>{renderAnswerText(section, answer, question)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })
      .filter(Boolean);

    if (!detailSections.length) {
      const answerLines = Object.entries(answers).map(([key, value]) => {
        const formattedValue = typeof value === 'object' && value !== null
          ? Object.entries(value)
              .map(([subKey, subValue]) => `  - ${subKey}: ${subValue}`)
              .join('\n')
          : String(value);

        return `${key}: ${formattedValue}`;
      });

      return (
        <div className="detail-empty">
          <p>No question details are available for this result.</p>
          {answerLines.length > 0 && (
            <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem', color: '#333', lineHeight: 1.5 }}>
              {answerLines.join('\n')}
            </div>
          )}
        </div>
      );
    }

    return detailSections;
  };

  if (showRegistrationPage) {
    return (
      <div id="dashboard" className="section active">
        <div className="dashboard-content">
          <h2>📝 Register Candidate</h2>
          <p className="subtitle">Create a candidate account instantly without email confirmation.</p>

          <div className="admin-panel">
            <form className="register-form" onSubmit={handleRegister}>
              <label>User ID</label>
              <input
                type="text"
                value={registeredUserId || userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Enter user ID"
                readOnly={Boolean(registeredUserId)}
                style={{ backgroundColor: registeredUserId ? '#f0f0f0' : '#fff', cursor: registeredUserId ? 'default' : 'text' }}
              />
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="candidate@example.com"
              />
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter a secure password"
              />
              <div className="login-actions">
                <button type="submit" className="btn-success" disabled={isSubmitting}>
                  {isSubmitting ? 'Registering…' : 'Create Candidate Account'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    resetForm();
                    onBackToDashboard();
                  }}
                >
                  Back to Dashboard
                </button>
              </div>
            </form>
            {message && <div className="admin-message">{message}</div>}
            {registeredUserId && (
              <div className="admin-message" style={{ marginTop: 10, padding: 10, backgroundColor: '#e8f5e9', borderLeft: '4px solid #4caf50' }}>
                ✓ Candidate registered with User ID: <strong>{registeredUserId}</strong>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="dashboard" className="section active">
      <div className="dashboard-content">
        <h2>🛡️ Admin Dashboard</h2>
        <p className="subtitle">Create candidate accounts and manage candidate registrations.</p>

          <div className="info-card">
            <div className="info-card-title">Admin-only registration</div>
            <div className="info-card-text">
              Only admins may register new candidates. Accounts are created through Supabase.
            </div>
          </div>

        <div className="login-actions" style={{ marginBottom: 20 }}>
          <button className="btn-success" onClick={onOpenRegistration}>
            Register Candidate
          </button>
        </div>

        {(candidateLoading || candidates?.length > 0) && (
          <div className="admin-grid">
            <div className="admin-panel">
              <h3>Registered Candidates</h3>
              {candidateLoading ? (
                <div className="loading-subtitle">Loading candidates…</div>
              ) : (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <input
                      type="text"
                      value={filterText}
                      onChange={(e) => setFilterText(e.target.value)}
                      placeholder="Filter by user or email"
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #ccc' }}
                    />
                  </div>
                  <div className="candidate-table-wrapper">
                    <table className="candidate-table">
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Email ID</th>
                          <th>Test Result</th>
                        </tr>
                      </thead>
                      <tbody>
                        {candidates
                          .filter((candidate) => {
                            const search = filterText.toLowerCase();
                            return (
                              !search ||
                              (candidate.user_id_custom || '').toLowerCase().includes(search) ||
                              (candidate.email || '').toLowerCase().includes(search)
                            );
                          })
                          .map((candidate) => (
                            <tr key={candidate.id}>
                              <td>{candidate.user_id_custom || 'N/A'}</td>
                              <td>{candidate.email}</td>
                              <td>{candidate.latestResult || 'Pending'}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {(resultsLoading || results?.length > 0) && (
          <div className="admin-grid">
            <div className="admin-panel">
              <h3>Recent Test Results</h3>
              {resultsLoading ? (
                <div className="loading-subtitle">Loading results…</div>
              ) : (
                <div className="candidate-table-wrapper">
                  <table className="candidate-table">
                    <thead>
                      <tr>
                        <th>Score</th>
                        <th>Candidate ID</th>
                        <th>Email</th>
                        <th>Created</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.flatMap((result) => {
                        const summaryRow = (
                          <tr key={`summary-${result.id}`}>
                            <td>{(result.total_score != null && result.max_score != null) ? `${result.total_score}/${result.max_score}` : (result.percentage != null ? `${result.percentage}%` : 'N/A')}</td>
                            <td>{result.candidateUserId || result.authUserId || 'N/A'}</td>
                            <td>{result.userEmail || result.userName || 'N/A'}</td>
                            <td>{result.created_at ? new Date(result.created_at).toLocaleString() : 'N/A'}</td>
                            <td>
                              <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => setExpandedResultId(expandedResultId === result.id ? null : result.id)}
                              >
                                {expandedResultId === result.id ? 'Hide' : 'View'}
                              </button>
                            </td>
                          </tr>
                        );

                        const detailRow = expandedResultId === result.id ? (
                          <tr key={`details-${result.id}`} className="result-details-row">
                            <td colSpan="5">
                              <div className="result-details-card">
                                {renderResultDetails(result)}
                              </div>
                            </td>
                          </tr>
                        ) : null;

                        return detailRow ? [summaryRow, detailRow] : [summaryRow];
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        <button onClick={onStart} className="btn-primary generate-btn" id="startBtn">
          🤖 Generate NEW 20-Min AI Test Preview
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
