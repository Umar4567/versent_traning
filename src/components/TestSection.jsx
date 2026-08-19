import { useMemo, useState } from 'react';

function TestSection({
  section,
  sectionName,
  sectionIcon,
  question,
  sectionIndex,
  questionIndex,
  totalQuestions,
  timer,
  progress,
  onAnswer,
  onSkip,
  onSubmit,
  onPlayAudio,
  audioPlaying,
  answers,
}) {
  const sectionLabel = `${sectionIcon} ${sectionName}`;
  const key = `${section}_${questionIndex}`;
  const [passageOrder, setPassageOrder] = useState(() => {
    const existing = answers[key];
    if (Array.isArray(existing) && existing.length) return existing;
    return question?.correctOrder || question?.sentences?.map((_, idx) => idx) || [];
  });

  const currentPassageOrder = useMemo(() => {
    if (Array.isArray(answers[key]) && answers[key].length) {
      return answers[key];
    }
    if (Array.isArray(passageOrder) && passageOrder.length) {
      return passageOrder;
    }
    return question?.correctOrder || question?.sentences?.map((_, idx) => idx) || [];
  }, [answers, key, passageOrder, question]);

  const handleTextChange = (value) => {
    onAnswer(key, value);
  };

  const setPassageOrderAndAnswer = (order) => {
    setPassageOrder(order);
    onAnswer(key, order);
  };

  const moveSentence = (index, direction) => {
    const order = [...currentPassageOrder];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= order.length) return;
    [order[index], order[newIndex]] = [order[newIndex], order[index]];
    setPassageOrderAndAnswer(order);
  };

  const renderQuestionBody = () => {
    switch (section) {
      case 'typing':
        return (
          <>
            <div className="question-text">Type the following text exactly as shown:</div>
            <div className="typing-passage">{question.text}</div>
            <textarea
              value={answers[key] || ''}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Start typing here..."
              rows={4}
            />
          </>
        );

      case 'sentenceCompletion':
        return (
          <>
            <div className="question-text">Complete the sentence by selecting the correct word:</div>
            <div className="sentence-card">{question.sentence}</div>
            <div className="options-group">
              {question.options.map((option) => (
                <label className="option-label" key={option}>
                  <input
                    type="radio"
                    name="sentenceCompletion"
                    value={option}
                    checked={answers[key] === option}
                    onChange={() => handleTextChange(option)}
                  />
                  {option}
                </label>
              ))}
            </div>
          </>
        );

      case 'listening':
        return (
          <>
            <div className="question-text">🎧 Listen to the AI-generated audio and answer the questions:</div>
            <div className="audio-controls">
              <button className="btn-secondary" onClick={() => onPlayAudio(question.audioText)}>
                🔊 Play Audio
              </button>
              <span className="audio-hint">Audio stops automatically when you skip</span>
              {audioPlaying && <span className="audio-playing-badge">🔴 Playing...</span>}
            </div>
            {question.questions.map((q, i) => (
              <div className="listening-question" key={q.id}>
                <div className="question-text">{i + 1}. {q.question}</div>
                <div className="options-group">
                  {q.options.map((opt) => (
                    <label className="option-label" key={opt}>
                      <input
                        type="radio"
                        name={`listening_${i}`}
                        value={opt}
                        checked={answers[key]?.[i] === opt}
                        onChange={() => onAnswer(key, { ...answers[key], [i]: opt })}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </>
        );

      case 'speaking':
        return (
          <>
            <div className="question-text">🎤 AI-Generated Speaking Assessment</div>
            <div className="speaking-card">
              <h4>📋 Topic:</h4>
              <p>{question.prompt}</p>
            </div>
            <div className="speaking-timers">
              <div>
                <div className="timer-label">⏳ Preparation</div>
                <div className="timer-value">{question.preparationTime}s</div>
              </div>
              <div>
                <div className="timer-label">🎙️ Speaking</div>
                <div className="timer-value">{question.speakingTime}s</div>
              </div>
            </div>
            <p className="audio-hint">Speak clearly for about {question.speakingTime}s, then summarize what you said below.</p>
            <textarea
              value={answers[key] || ''}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Type your spoken response here..."
              rows={6}
            />
            <div className="speech-transcript">
              <div className="question-text">📝 Transcript / summary:</div>
              <div>{answers[key] ? answers[key] : 'Type your response after speaking clearly.'}</div>
            </div>
          </>
        );

      case 'dictation':
        return (
          <>
            <div className="question-text">Listen to the AI-generated audio and type what you hear:</div>
            <div className="audio-controls">
              <button className="btn-secondary" onClick={() => onPlayAudio(question.text)}>
                🔊 Play AI Audio
              </button>
              <button className="btn-secondary" onClick={() => onAnswer(key, 'recording')}>
                🎤 Start Recording
              </button>
              <span className="audio-hint">Speak clearly into your microphone</span>
            </div>
            <textarea
              value={answers[key] || ''}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Type what you hear..."
              rows={4}
            />
            <div className="dictation-status">{answers[key] ? '✅ Transcribed' : 'Waiting for input...'}</div>
          </>
        );

      case 'passageReconstruction':
        return (
          <>
            <div className="question-text">Reconstruct the sentences in the correct order:</div>
            <div className="sentence-container">
              {currentPassageOrder.map((sentenceIndex, idx) => (
                <div className="sentence-item" key={sentenceIndex}>
                  <div className="sentence-order">{idx + 1}</div>
                  <div>{question.sentences[sentenceIndex]}</div>
                  <div className="sentence-controls">
                    <button
                      className="btn-small"
                      type="button"
                      onClick={() => moveSentence(idx, -1)}
                      disabled={idx === 0}
                    >
                      ↑
                    </button>
                    <button
                      className="btn-small"
                      type="button"
                      onClick={() => moveSentence(idx, 1)}
                      disabled={idx === currentPassageOrder.length - 1}
                    >
                      ↓
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="order-feedback">Use the buttons to move sentences up or down until the passage is in the correct order.</div>
          </>
        );

      case 'emailWriting':
        return (
          <>
            <div className="question-text">{question.prompt}</div>
            <div className="email-keywords">📌 Key points to include: {question.keywords.join(', ')}</div>
            <textarea
              value={answers[key] || ''}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Write your email here..."
              rows={6}
            />
            <div className="word-count">Words: {(answers[key] || '').split(/\s+/).filter(Boolean).length}</div>
          </>
        );

      default:
        return <div className="question-text">No question available.</div>;
    }
  };

  return (
    <div id="testSection" className="section active">
      <div className="test-header">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="timer">⏱️ {timer}s</div>
      </div>

      <div className="question-nav">
        <h3>{sectionLabel} <span className="ai-tag">🤖 AI</span></h3>
        <span>Question {questionIndex + 1} of {totalQuestions}</span>
      </div>

      <div id="questionBox" className="question-box">
        {renderQuestionBody()}
      </div>

      <div className="test-controls">
        <button className="btn-primary" onClick={onSkip}>Skip →</button>
        <button className="btn-success" onClick={onSubmit}>📊 Submit Test</button>
      </div>
    </div>
  );
}

export default TestSection;
