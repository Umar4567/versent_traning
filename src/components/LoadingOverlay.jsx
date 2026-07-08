function LoadingOverlay({ isActive, step }) {
  return (
    <div className={`loading-overlay ${isActive ? 'active' : ''}`}>
      <div className="loading-content">
        <div className="spinner" />
        <h3>{step || '🤖 AI is creating FRESH questions...'}</h3>
        <p className="loading-subtitle">Generating unique content just for you</p>
      </div>
    </div>
  );
}

export default LoadingOverlay;
