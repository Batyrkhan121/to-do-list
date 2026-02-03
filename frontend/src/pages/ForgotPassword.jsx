import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  
  const { requestPasswordReset } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError('Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '24px',
        padding: '48px',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 25px 50px rgba(0,0,0,0.15)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: '#f0f9ff',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: '32px'
          }}>
            🔐
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', margin: 0 }}>Reset Password</h1>
          <p style={{ color: '#64748b', marginTop: '8px' }}>
            {sent ? 'Check your email' : "Enter your email to reset"}
          </p>
        </div>

        {sent ? (
          <div>
            <div style={{
              background: '#f0fdf4',
              color: '#16a34a',
              padding: '16px',
              borderRadius: '12px',
              marginBottom: '24px',
              textAlign: 'center'
            }}>
              ✅ If the email exists, a reset link has been sent!
            </div>
            <p style={{ color: '#64748b', fontSize: '14px', textAlign: 'center', marginBottom: '24px' }}>
              Check your inbox and spam folder. The link expires in 24 hours.
            </p>
            <Link 
              to="/login" 
              className="btn btn-primary"
              style={{ width: '100%', display: 'block', textAlign: 'center', textDecoration: 'none' }}
            >
              Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{
                background: '#fef2f2',
                color: '#dc2626',
                padding: '12px 16px',
                borderRadius: '12px',
                marginBottom: '24px',
                fontSize: '14px'
              }}>
                {error}
              </div>
            )}

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input"
                style={{ width: '100%', boxSizing: 'border-box' }}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '16px', marginBottom: '16px' }}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>

            <Link 
              to="/login" 
              style={{ 
                display: 'block', 
                textAlign: 'center', 
                color: '#64748b', 
                fontSize: '14px',
                textDecoration: 'none'
              }}
            >
              ← Back to Login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}