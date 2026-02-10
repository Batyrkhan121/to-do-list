import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import ReCAPTCHA from 'react-google-recaptcha';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [captchaToken, setCaptchaToken] = useState(null);
  const [siteKey, setSiteKey] = useState('');
  const [captchaEnabled, setCaptchaEnabled] = useState(false);

  const recaptchaRef = useRef(null);

  const { login, loginWithGoogle, loginWithGithub, oauthUrls } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const nextPath = (() => {
    const value = new URLSearchParams(location.search).get('next');
    return value && value.startsWith('/') ? value : '/';
  })();

  // Get reCAPTCHA key from backend
  useEffect(() => {
    const fetchSiteKey = async () => {
      try {
        const response = await api.get('/auth/recaptcha-key/');
        setSiteKey(response.data.site_key || '');
        setCaptchaEnabled(Boolean(response.data.enabled));
      } catch (error) {
        console.log('reCAPTCHA not configured');
      }
    };
    fetchSiteKey();
  }, []);

  const handleCaptchaChange = (token) => {
    setCaptchaToken(token);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (captchaEnabled && !captchaToken) {
      setError('Please complete the reCAPTCHA verification');
      return;
    }

    setLoading(true);

    try {
      const authResult = await login(email, password, captchaToken);
      navigate(authResult?.redirect_path || nextPath);
    } catch (err) {
      const data = err.response?.data;
      const captchaError = data?.captcha;
      setError(captchaError || data?.error || 'Login failed');

      if (captchaError) {
        if (recaptchaRef.current) {
          recaptchaRef.current.reset();
        }
        setCaptchaToken(null);
      }
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: 'white',
          borderRadius: '24px',
          padding: '48px',
          width: '100%',
          maxWidth: '420px',
          boxShadow: '0 25px 50px rgba(0,0,0,0.15)'
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <motion.div
            whileHover={{ scale: 1.05, rotate: 5 }}
            style={{
              width: '64px',
              height: '64px',
              background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: '32px',
              boxShadow: '0 10px 30px rgba(14, 165, 233, 0.3)'
            }}
          >
            ✨
          </motion.div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', margin: 0 }}>Welcome back</h1>
          <p style={{ color: '#64748b', marginTop: '8px' }}>Sign in to TaskFlow</p>
        </div>

        {/* Social Login Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          {/* reCAPTCHA */}
          {captchaEnabled && siteKey && (
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center' }}>
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={siteKey}
                onChange={handleCaptchaChange}
                onExpired={() => setCaptchaToken(null)}
              />
            </div>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={loginWithGoogle}
            disabled={!oauthUrls?.google?.configured}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              padding: '14px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              background: 'white',
              cursor: oauthUrls?.google?.configured ? 'pointer' : 'not-allowed',
              fontSize: '15px',
              fontWeight: '500',
              color: '#374151',
              opacity: oauthUrls?.google?.configured ? 1 : 0.5
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={loginWithGithub}
            disabled={!oauthUrls?.github?.configured}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              padding: '14px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              background: '#24292e',
              cursor: oauthUrls?.github?.configured ? 'pointer' : 'not-allowed',
              fontSize: '15px',
              fontWeight: '500',
              color: 'white',
              opacity: oauthUrls?.github?.configured ? 1 : 0.5
            }}
          >
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            Continue with GitHub
          </motion.button>
        </div>

        {/* Divider */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '16px', 
          marginBottom: '24px' 
        }}>
          <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
          <span style={{ color: '#94a3b8', fontSize: '14px' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
        </div>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: '#fef2f2',
              color: '#dc2626',
              padding: '12px 16px',
              borderRadius: '12px',
              marginBottom: '24px',
              fontSize: '14px'
            }}
          >
            {error}
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
              Email
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

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input"
              style={{ width: '100%', boxSizing: 'border-box' }}
              required
            />
          </div>

          <div style={{ textAlign: 'right', marginBottom: '24px' }}>
            <Link to="/forgot-password" style={{ color: '#0ea5e9', fontSize: '14px', textDecoration: 'none' }}>
              Forgot password?
            </Link>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: '16px' }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </motion.button>
        </form>

        {/* Register link */}
        <p style={{ textAlign: 'center', marginTop: '24px', color: '#64748b', fontSize: '14px' }}>
          Don't have an account?{' '}
          <Link
            to={location.search ? `/register${location.search}` : '/register'}
            style={{ color: '#0ea5e9', fontWeight: '500', textDecoration: 'none' }}
          >
            Sign up
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
