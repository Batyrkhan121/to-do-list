import { useState } from 'react';
import Header from '../components/Header';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user, updateProfile, changePassword, logout } = useAuth();
  
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  
  const [profileData, setProfileData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    username: user?.username || ''
  });
  
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    new_password2: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await updateProfile(profileData);
      setIsEditOpen(false);
      setMessage('Profile updated!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.username?.[0] || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');

    if (passwordData.new_password !== passwordData.new_password2) {
      setError("Passwords don't match");
      return;
    }

    setLoading(true);

    try {
      await changePassword(
        passwordData.old_password,
        passwordData.new_password,
        passwordData.new_password2
      );
      setIsPasswordOpen(false);
      setPasswordData({ old_password: '', new_password: '', new_password2: '' });
      setMessage('Password changed! Please login again.');
      setTimeout(() => logout(), 2000);
    } catch (err) {
      setError(err.response?.data?.old_password || 'Password change failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <Header title="Profile" subtitle="Manage your account" />

      <main style={{ padding: '32px', maxWidth: '600px' }}>
        {/* Success message */}
        {message && (
          <div style={{
            background: '#f0fdf4',
            color: '#16a34a',
            padding: '16px',
            borderRadius: '12px',
            marginBottom: '24px'
          }}>
            ✅ {message}
          </div>
        )}

        {/* User card */}
        <div className="card" style={{ padding: '32px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
            <div style={{
              width: '80px',
              height: '80px',
              background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              color: 'white',
              fontWeight: 'bold'
            }}>
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '24px' }}>
                {user?.first_name || user?.username}
                {user?.last_name && ` ${user.last_name}`}
              </h2>
              <p style={{ color: '#64748b', margin: '4px 0 0' }}>{user?.email}</p>
              <p style={{ color: '#94a3b8', fontSize: '14px', margin: '4px 0 0' }}>
                Member since {new Date(user?.date_joined).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px' }}>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Username</p>
              <p style={{ fontWeight: '600', margin: '4px 0 0' }}>{user?.username}</p>
            </div>
            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px' }}>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Email</p>
              <p style={{ fontWeight: '600', margin: '4px 0 0' }}>{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Account Settings</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={() => setIsEditOpen(true)}
              style={{
                padding: '16px',
                background: '#f8fafc',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                textAlign: 'left'
              }}
            >
              <span style={{ fontSize: '20px' }}>✏️</span>
              <div>
                <p style={{ margin: 0, fontWeight: '500' }}>Edit Profile</p>
                <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>Change name and username</p>
              </div>
            </button>

            <button
              onClick={() => setIsPasswordOpen(true)}
              style={{
                padding: '16px',
                background: '#f8fafc',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                textAlign: 'left'
              }}
            >
              <span style={{ fontSize: '20px' }}>🔐</span>
              <div>
                <p style={{ margin: 0, fontWeight: '500' }}>Change Password</p>
                <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>Update your password</p>
              </div>
            </button>

            <button
              onClick={logout}
              style={{
                padding: '16px',
                background: '#fef2f2',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                textAlign: 'left'
              }}
            >
              <span style={{ fontSize: '20px' }}>🚪</span>
              <div>
                <p style={{ margin: 0, fontWeight: '500', color: '#dc2626' }}>Logout</p>
                <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>Sign out of your account</p>
              </div>
            </button>
          </div>
        </div>
      </main>

      {/* Edit Profile Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Profile">
        <form onSubmit={handleUpdateProfile}>
          {error && (
            <div style={{ background: '#fef2f2', color: '#dc2626', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
              {error}
            </div>
          )}
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>First Name</label>
              <input
                type="text"
                value={profileData.first_name}
                onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                className="input"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>Last Name</label>
              <input
                type="text"
                value={profileData.last_name}
                onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
                className="input"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          </div>
          
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>Username</label>
            <input
              type="text"
              value={profileData.username}
              onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
              className="input"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>
          
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setIsEditOpen(false)} style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={loading} className="btn btn-primary">{loading ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </Modal>

      {/* Change Password Modal */}
      <Modal isOpen={isPasswordOpen} onClose={() => setIsPasswordOpen(false)} title="Change Password">
        <form onSubmit={handleChangePassword}>
          {error && (
            <div style={{ background: '#fef2f2', color: '#dc2626', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
              {error}
            </div>
          )}
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>Current Password</label>
            <input
              type="password"
              value={passwordData.old_password}
              onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
              className="input"
              style={{ width: '100%', boxSizing: 'border-box' }}
              required
            />
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>New Password</label>
            <input
              type="password"
              value={passwordData.new_password}
              onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
              className="input"
              style={{ width: '100%', boxSizing: 'border-box' }}
              required
            />
          </div>
          
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>Confirm New Password</label>
            <input
              type="password"
              value={passwordData.new_password2}
              onChange={(e) => setPasswordData({ ...passwordData, new_password2: e.target.value })}
              className="input"
              style={{ width: '100%', boxSizing: 'border-box' }}
              required
            />
          </div>
          
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setIsPasswordOpen(false)} style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={loading} className="btn btn-primary">{loading ? 'Changing...' : 'Change Password'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}