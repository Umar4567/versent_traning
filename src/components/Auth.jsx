import { useState } from 'react';
import { signUpWithEmail, signInWithEmail, supabaseClient } from '../lib/supabase.js';

export default function Auth({ onClose }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSignUp = async () => {
    setLoading(true);
    setMessage('');
    try {
      const { data, error } = await signUpWithEmail(email, password);
      if (error) {
        setMessage(error.message);
      } else {
        setMessage('Signed up — check your email to confirm.');
        // Attempt to create a simple profile row (may require DB policy adjustments)
        try {
          const userId = data?.user?.id;
          if (userId) {
            await supabaseClient.from('profiles').upsert({ id: userId, email, role: 'candidate' });
          }
        } catch (e) {
          console.warn('Profile upsert failed:', e);
        }
      }
    } catch (err) {
      setMessage(err.message || String(err));
    }
    setLoading(false);
  };

  const handleSignIn = async () => {
    setLoading(true);
    setMessage('');
    try {
      const { data, error } = await signInWithEmail(email, password);
      if (error) {
        setMessage(error.message);
      } else {
        setMessage('Signed in successfully');
        onClose && onClose();
      }
    } catch (err) {
      setMessage(err.message || String(err));
    }
    setLoading(false);
  };

  return (
    <div className="auth-modal">
      <h3>Sign In / Sign Up</h3>
      <div>
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button onClick={handleSignIn} disabled={loading}>Sign In</button>
        <button onClick={handleSignUp} disabled={loading}>Sign Up (candidate)</button>
        <button onClick={onClose}>Close</button>
      </div>
      {message && <div style={{ marginTop: 8 }}>{message}</div>}
    </div>
  );
}
