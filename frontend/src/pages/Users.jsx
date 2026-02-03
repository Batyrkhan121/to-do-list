import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import Modal from '../components/Modal';
import { PageTransition, CardAnimation } from '../components/animations/PageTransition';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function Users() {
  const { can } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, rolesRes] = await Promise.all([
        api.get('/auth/users/'),
        api.get('/auth/roles/')
      ]);
      setUsers(usersRes.data);
      setRoles(rolesRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeRole = async (userId, roleId) => {
    try {
      await api.put(`/auth/users/${userId}/role/`, { role_id: roleId });
      fetchData();
      setIsModalOpen(false);
      setSelectedUser(null);
    } catch (error) {
      alert('Failed to change role: ' + (error.response?.data?.error || error.message));
    }
  };

  const getRoleBadgeColor = (roleName) => {
    const colors = {
      admin: { bg: '#fef2f2', text: '#dc2626', border: '#fca5a5' },
      manager: { bg: '#faf5ff', text: '#9333ea', border: '#d8b4fe' },
      member: { bg: '#eff6ff', text: '#2563eb', border: '#93c5fd' },
      viewer: { bg: '#f1f5f9', text: '#64748b', border: '#cbd5e1' },
    };
    return colors[roleName] || colors.member;
  };

  if (!can('can_manage_team')) {
    return (
      <PageTransition>
        <div style={{ padding: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔒</div>
          <h2>Access Denied</h2>
          <p style={{ color: '#64748b' }}>You don't have permission to manage users.</p>
        </div>
      </PageTransition>
    );
  }

  if (loading) {
    return (
      <PageTransition>
        <Header title="Users" subtitle="Loading..." />
        <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
          <div className="spinner"></div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <Header 
        title="Users Management" 
        subtitle={`${users.length} users in the system`}
      />

      <main style={{ padding: '32px' }}>
        {/* Role Legend */}
        <div style={{ 
          display: 'flex', 
          gap: '16px', 
          marginBottom: '24px',
          flexWrap: 'wrap'
        }}>
          {roles.map(role => {
            const color = getRoleBadgeColor(role.name);
            return (
              <div 
                key={role.id}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  padding: '8px 16px',
                  background: color.bg,
                  borderRadius: '20px',
                  border: `1px solid ${color.border}`
                }}
              >
                <span style={{ 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  background: color.text 
                }} />
                <span style={{ fontSize: '14px', color: color.text, fontWeight: '500' }}>
                  {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Users Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
          gap: '20px' 
        }}>
          {users.map((user, index) => {
            const color = getRoleBadgeColor(user.role?.name);
            return (
              <CardAnimation key={user.id} index={index}>
                <div 
                  className="card" 
                  style={{ padding: '24px', cursor: 'pointer' }}
                  onClick={() => {
                    setSelectedUser(user);
                    setIsModalOpen(true);
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {/* Avatar */}
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '16px',
                      background: `linear-gradient(135deg, ${color.text}40, ${color.text}20)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      fontWeight: 'bold',
                      color: color.text
                    }}>
                      {user.username?.[0]?.toUpperCase() || 'U'}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                        {user.first_name || user.username}
                        {user.last_name && ` ${user.last_name}`}
                      </h3>
                      <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#64748b' }}>
                        {user.email}
                      </p>
                    </div>

                    {/* Role Badge */}
                    <span style={{
                      padding: '6px 12px',
                      borderRadius: '20px',
                      background: color.bg,
                      color: color.text,
                      fontSize: '13px',
                      fontWeight: '600',
                      border: `1px solid ${color.border}`
                    }}>
                      {user.role?.display_name || 'Member'}
                    </span>
                  </div>

                  {/* Permissions preview */}
                  <div style={{ 
                    marginTop: '16px', 
                    paddingTop: '16px', 
                    borderTop: '1px solid #f1f5f9',
                    display: 'flex',
                    gap: '8px',
                    flexWrap: 'wrap'
                  }}>
                    {user.permissions?.can_create_tasks && (
                      <span style={{ fontSize: '12px', color: '#64748b' }}>✅ Tasks</span>
                    )}
                    {user.permissions?.can_create_projects && (
                      <span style={{ fontSize: '12px', color: '#64748b' }}>📁 Projects</span>
                    )}
                    {user.permissions?.can_manage_team && (
                      <span style={{ fontSize: '12px', color: '#64748b' }}>👥 Team</span>
                    )}
                    {user.permissions?.can_manage_settings && (
                      <span style={{ fontSize: '12px', color: '#64748b' }}>⚙️ Settings</span>
                    )}
                  </div>
                </div>
              </CardAnimation>
            );
          })}
        </div>
      </main>

      {/* Edit Role Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedUser(null); }}
        title="Change User Role"
      >
        {selectedUser && (
          <div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '16px',
              marginBottom: '24px',
              padding: '16px',
              background: '#f8fafc',
              borderRadius: '12px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '20px'
              }}>
                {selectedUser.username?.[0]?.toUpperCase()}
              </div>
              <div>
                <h3 style={{ margin: 0 }}>{selectedUser.username}</h3>
                <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>{selectedUser.email}</p>
              </div>
            </div>

            <p style={{ marginBottom: '16px', fontWeight: '500' }}>Select new role:</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {roles.map(role => {
                const color = getRoleBadgeColor(role.name);
                const isSelected = selectedUser.role?.name === role.name;
                return (
                  <motion.button
                    key={role.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleChangeRole(selectedUser.id, role.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px',
                      borderRadius: '12px',
                      border: isSelected ? `2px solid ${color.text}` : '1px solid #e2e8f0',
                      background: isSelected ? color.bg : 'white',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '600', color: color.text }}>
                        {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                      </div>
                      <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                        {role.description}
                      </div>
                    </div>
                    {isSelected && (
                      <span style={{ color: color.text, fontSize: '20px' }}>✓</span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}
      </Modal>
    </PageTransition>
  );
}