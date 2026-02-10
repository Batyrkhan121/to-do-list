import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [oauthUrls, setOauthUrls] = useState(null);

  useEffect(() => {
    checkAuth();
    fetchOAuthUrls();
  }, []);

  const fetchOAuthUrls = async () => {
    try {
      const response = await api.get('/auth/oauth/urls/');
      setOauthUrls(response.data);
    } catch (error) {
      console.log('OAuth URLs not available');
    }
  };

  const checkAuth = async () => {
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const response = await api.get('/auth/me/');
        setUser(response.data);
        setPermissions(response.data.permissions || {});
      } catch (error) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setUser(null);
        setPermissions({});
      }
    }
    setLoading(false);
  };

  const login = async (email, password, captchaToken = null) => {
    const response = await api.post('/auth/login/', {
      email,
      password,
      captcha_token: captchaToken,
    });
    const { access, refresh, user: loggedInUser, redirect_path: redirectPath, joined_team: joinedTeam } = response.data;

    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    setUser(loggedInUser);

    const meResponse = await api.get('/auth/me/');
    setUser(meResponse.data);
    setPermissions(meResponse.data.permissions || {});

    return {
      ...meResponse.data,
      redirect_path: redirectPath || null,
      joined_team: joinedTeam || null,
    };
  };

  const register = async (data) => {
    const response = await api.post('/auth/register/', data);
    return response.data;
  };

  const logout = async () => {
    try {
      const refresh = localStorage.getItem('refresh_token');
      await api.post(
        '/auth/logout/',
        { refresh });
    } catch (error) {
      // Ignore
    }

    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    setPermissions({});
  };

  const changePassword = async (oldPassword, newPassword, newPassword2) => {
    const response = await api.post(
      '/auth/change-password/',
      {
        old_password: oldPassword,
        new_password: newPassword,
        new_password2: newPassword2,
      });
    return response.data;
  };

  const requestPasswordReset = async (email) => {
    const response = await api.post('/auth/password-reset/', { email });
    return response.data;
  };

  const confirmPasswordReset = async (uidb64, token, newPassword, newPassword2) => {
    const response = await api.post('/auth/password-reset-confirm/', {
      uidb64,
      token,
      new_password: newPassword,
      new_password2: newPassword2,
    });
    return response.data;
  };

  const updateProfile = async (data) => {
    const response = await api.patch('/auth/profile/', data);
    setUser(response.data);
    return response.data;
  };

  const loginWithGoogle = () => {
    if (oauthUrls?.google?.configured) {
      window.location.href = oauthUrls.google.auth_url;
    } else {
      alert('Google OAuth is not configured');
    }
  };

  const handleGoogleCallback = async (accessToken) => {
    const response = await api.post('/auth/oauth/google/', { access_token: accessToken });
    const { access, refresh, user: loggedInUser } = response.data;

    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    setUser(loggedInUser);

    return loggedInUser;
  };

  const loginWithGithub = () => {
    if (oauthUrls?.github?.configured) {
      window.location.href = oauthUrls.github.auth_url;
    } else {
      alert('GitHub OAuth is not configured');
    }
  };

  const handleGithubCallback = async (code) => {
    const response = await api.post('/auth/oauth/github/', { code });
    const { access, refresh, user: loggedInUser } = response.data;

    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    setUser(loggedInUser);

    return loggedInUser;
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    oauthUrls,
    login,
    register,
    logout,
    changePassword,
    requestPasswordReset,
    confirmPasswordReset,
    updateProfile,
    checkAuth,
    loginWithGoogle,
    handleGoogleCallback,
    loginWithGithub,
    handleGithubCallback,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
