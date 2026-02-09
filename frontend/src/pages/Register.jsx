import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import ReCAPTCHA from 'react-google-recaptcha';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password2: '',
    first_name: '',
    last_name: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const [siteKey, setSiteKey] = useState('');
  const [captchaEnabled, setCaptchaEnabled] = useState(false);
  
  const recaptchaRef = useRef(null);
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Получаем ключ reCAPTCHA с сервера
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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCaptchaChange = (token) => {
    setCaptchaToken(token);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (formData.password !== formData.password2) {
      setError("Passwords don't match");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    // Проверяем captcha если она настроена
    if (captchaEnabled && !captchaToken) {
      setError("Please complete the reCAPTCHA verification");
      return;
    }
    
    setLoading(true);

    try {
      await register({
        ...formData,
        captcha_token: captchaToken
      });
      const loginPath = location.search ? `/login${location.search}` : '/login';
      navigate(loginPath, { state: { message: 'Registration successful! Please login.' } });
    } catch (err) {
      const errors = err.response?.data;
      if (errors) {
        if (errors.captcha) {
          setError(errors.captcha);
          // Сбрасываем капчу
          if (recaptchaRef.current) {
            recaptchaRef.current.reset();
          }
          setCaptchaToken(null);
        } else {
          const firstError = Object.values(errors)[0];
          setError(Array.isArray(firstError) ? firstError[0] : firstError);
        }
      } else if (err.response?.status === 400) {
        setError('Bad request. Please check all fields and try again.');
      } else {
        setError('Registration failed');
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
          maxWidth: '480px',
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
          <h1 style={{ fontSize: '28px', fontWeight: '700', margin: 0 }}>Create account</h1>
          <p style={{ color: '#64748b', marginTop: '8px' }}>Join TaskFlow today</p>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                First Name
              </label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                placeholder="John"
                className="input"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                Last Name
              </label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                placeholder="Doe"
                className="input"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
              Username *
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="johndoe"
              className="input"
              style={{ width: '100%', boxSizing: 'border-box' }}
              required
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
              Email *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              className="input"
              style={{ width: '100%', boxSizing: 'border-box' }}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                Password *
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="input"
                style={{ width: '100%', boxSizing: 'border-box' }}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                Confirm *
              </label>
              <input
                type="password"
                name="password2"
                value={formData.password2}
                onChange={handleChange}
                placeholder="••••••••"
                className="input"
                style={{ width: '100%', boxSizing: 'border-box' }}
                required
              />
            </div>
          </div>

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

          {/* Password requirements */}
          <div style={{ 
            background: '#f8fafc', 
            padding: '12px 16px', 
            borderRadius: '10px', 
            marginBottom: '24px',
            fontSize: '13px',
            color: '#64748b'
          }}>
            <p style={{ margin: '0 0 8px', fontWeight: '500', color: '#475569' }}>Password requirements:</p>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li style={{ color: formData.password.length >= 8 ? '#16a34a' : '#64748b' }}>
                At least 8 characters
              </li>
              <li style={{ color: formData.password === formData.password2 && formData.password2 ? '#16a34a' : '#64748b' }}>
                Passwords match
              </li>
            </ul>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: '16px' }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  style={{ display: 'inline-block' }}
                >
                  ⏳
                </motion.span>
                Creating account...
              </span>
            ) : (
              'Create Account'
            )}
          </motion.button>
        </form>

        {/* Login link */}
        <p style={{ textAlign: 'center', marginTop: '24px', color: '#64748b', fontSize: '14px' }}>
          Already have an account?{' '}
          <Link
            to={location.search ? `/login${location.search}` : '/login'}
            style={{ color: '#0ea5e9', fontWeight: '500', textDecoration: 'none' }}
          >
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
