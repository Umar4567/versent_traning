import { useState } from 'react';
import { signInWithEmail, getUser } from '../lib/supabase.js';

export default function Login({ onSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSignIn = async () => {
    setLoading(true);
    setMessage('');
    if (!email || !password) {
      setMessage('Please enter both email and password.');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await signInWithEmail(email.trim(), password);
      if (error) {
        setMessage(error.message || JSON.stringify(error));
      } else {
        const user = data?.user || data?.session?.user || (await getUser()) || null;
        if (user) {
          setMessage('Signed in successfully.');
          onSuccess && onSuccess(user);
        } else {
          setMessage('Sign in succeeded, but no active session was found. Please refresh or try again.');
        }
      }
    } catch (err) {
      setMessage(err.message || String(err));
    }
    setLoading(false);
  };

  return (
    <div className="login-page-wrapper">
      <div className="login-page">
        <h2 className="login-title">Sign In</h2>
        <div className="login-subtitle">Use your admin-provided account to access the app.</div>
        <div className="login-form">
          <input
            className="login-input"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="login-input"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="login-actions">
            <button className="btn-primary" onClick={handleSignIn} disabled={loading}>Sign In</button>
          </div>
          {message && <div className="login-message">{message}</div>}
          <div className="login-caption">
            Registration is managed by administrators only. Please contact your admin to create an account.
          </div>
        </div>
      </div>
    </div>
  );
}
