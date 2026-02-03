import { useEffect, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export default function OAuthCallback() {
  const { provider } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { handleGoogleCallback, handleGithubCallback } = useAuth();
  
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState('');

  useEffect(() => {
    handleOAuth();
  }, []);

  const handleOAuth = async () => {
    try {
      if (provider === 'google') {
        const hash = location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        
        if (!accessToken) {
          throw new Error('No access token received from Google');
        }
        
        await handleGoogleCallback(accessToken);
        setStatus('success');
        setTimeout(() => navigate('/'), 1500);
        
      } else if (provider === 'github') {
        const params = new URLSearchParams(location.search);
        const code = params.get('code');
        
        if (!code) {
          throw new Error('No authorization code received from GitHub');
        }
        
        await handleGithubCallback(code);
        setStatus('success');
        setTimeout(() => navigate('/'), 1500);
        
      } else {
        throw new Error('Unknown OAuth provider');
      }
    } catch (err) {
      console.error('OAuth error:', err);
      setStatus('error');
      setError(err.response?.data?.error || err.message);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          background: 'white',
          borderRadius: '24px',
          padding: '48px',
          textAlign: 'center',
          maxWidth: '400px',
          width: '100%',
          margin: '20px'
        }}
      >
        {status === 'processing' && (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              style={{
                width: '64px',
                height: '64px',
                border: '4px solid #e2e8f0',
                borderTopColor: '#0ea5e9',
                borderRadius: '50%',
                margin: '0 auto 24px'
              }}
            />
            <h2 style={{ margin: 0, color: '#0f172a' }}>Signing you in...</h2>
            <p style={{ color: '#64748b', marginTop: '8px' }}>
              Connecting with {provider === 'google' ? 'Google' : 'GitHub'}
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              style={{
                width: '80px',
                height: '80px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
                fontSize: '40px',
                color: 'white'
              }}
            >
              ✓
            </motion.div>
            <h2 style={{ margin: 0, color: '#10b981' }}>Success!</h2>
            <p style={{ color: '#64748b', marginTop: '8px' }}>
              Redirecting to dashboard...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{
              width: '80px',
              height: '80px',
              background: '#fef2f2',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              fontSize: '40px'
            }}>
              ❌
            </div>
            <h2 style={{ margin: 0, color: '#dc2626' }}>Authentication Failed</h2>
            <p style={{ color: '#64748b', marginTop: '8px' }}>{error}</p>
            <button
              onClick={() => navigate('/login')}
              className="btn btn-primary"
              style={{ marginTop: '24px' }}
            >
              Back to Login
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}