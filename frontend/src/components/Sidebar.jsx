import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navigation = [
  { name: 'Dashboard', href: '/', icon: '📊' },
  { name: 'Tasks', href: '/tasks', icon: '✅' },
  { name: 'Calendar', href: '/calendar', icon: '📅' }, // ← ДОБАВЛЕНО
  { name: 'Projects', href: '/projects', icon: '📁' },
  { name: 'Teams', href: '/teams', icon: '👥' },
  { name: 'Categories', href: '/categories', icon: '🏷️' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        height: '100vh',
        width: '256px',
        backgroundColor: 'white',
        borderRight: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Logo */}
      <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              background: 'linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 100%)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
            }}
          >
            ✨
          </div>
          <div>
            <h1
              style={{
                fontWeight: 'bold',
                fontSize: '18px',
                color: '#0f172a',
                margin: 0,
              }}
            >
              TaskFlow
            </h1>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
              Manage smarter
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav
        style={{
          flex: 1,
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <span style={{ fontSize: '20px' }}>{item.icon}</span>
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div style={{ padding: '16px', borderTop: '1px solid #e2e8f0' }}>
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `sidebar-link ${isActive ? 'active' : ''}`
          }
          style={{ marginBottom: '8px' }}
        >
          <span style={{ fontSize: '20px' }}>👤</span>
          <span>Profile</span>
        </NavLink>

        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderRadius: '12px',
            width: '100%',
            border: 'none',
            background: '#fef2f2',
            color: '#dc2626',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          <span style={{ fontSize: '20px' }}>🚪</span>
          <span>Logout</span>
        </button>
      </div>

      {/* User info */}
      <div className="sidebar-user-card">
        <div className="sidebar-user-row">
          <div className="sidebar-avatar">
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="sidebar-user-info">
            <p className="sidebar-user-name">
              {user?.first_name || user?.username || 'User'}
            </p>
            <p className="sidebar-user-email">{user?.email || ''}</p>
          </div>
          <button className="sidebar-user-more" type="button" aria-label="User settings">
            ...
          </button>
        </div>
      </div>
    </aside>
  );
}
