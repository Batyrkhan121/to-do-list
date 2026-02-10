import { useState } from 'react';
import Header from '../components/Header';
import Modal from '../components/Modal';
import { useTeams, useCreateTeam, useDeleteTeam } from '../hooks/useApi';

export default function Teams() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const { data, isLoading } = useTeams({}, {
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  });
  const createTeam = useCreateTeam();
  const deleteTeam = useDeleteTeam();

  const teams = data?.results || data || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createTeam.mutateAsync({ 
        name, 
        description
      });
      setIsModalOpen(false);
      setName('');
      setDescription('');
    } catch (error) {
      alert('Error: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this team? All related tasks will lose their team assignment.')) {
      try {
        await deleteTeam.mutateAsync(id);
      } catch (error) {
        alert('Error deleting team');
      }
    }
  };

  const copyInviteLink = (team) => {
    if (!team.invite_code) {
      alert('Invite code is not available for this team yet. Refresh the page.');
      return;
    }
    const inviteLink = `${window.location.origin}/join/${team.invite_code}/`;
    navigator.clipboard.writeText(inviteLink);
    setCopiedId(team.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '256px' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <Header 
        title="Teams" 
        subtitle={`${teams.length} teams`}
        onAddClick={() => setIsModalOpen(true)}
        addButtonText="New Team"
      />

      <main style={{ padding: '32px' }}>
        {teams.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
            {teams.map(team => (
              <div key={team.id} className="card" style={{ padding: '24px', position: 'relative' }}>
                {/* Delete button */}
                <button
                  onClick={() => handleDelete(team.id)}
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: '#fef2f2',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                  title="Delete team"
                >
                  🗑️
                </button>

                {/* Team info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    background: 'linear-gradient(135deg, #10b981, #06b6d4)',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px'
                  }}>
                    👥
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontWeight: '600', fontSize: '18px' }}>{team.name}</h3>
                    <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#64748b' }}>
                      Lead: {team.team_lead?.username || 'Admin'}
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: '12px',
                  padding: '16px 0',
                  borderTop: '1px solid #f1f5f9',
                  borderBottom: '1px solid #f1f5f9'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '28px', fontWeight: 'bold', margin: 0, color: '#0ea5e9' }}>
                      {team.member_count || 0}
                    </p>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Members</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '28px', fontWeight: 'bold', margin: 0, color: '#10b981' }}>
                      {team.is_active ? '✓' : '✗'}
                    </p>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                      {team.is_active ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                </div>

                <div style={{ marginTop: '12px' }}>
                  <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
                    Team members
                  </p>
                  {team.members?.length ? (
                    <p style={{ margin: 0, fontSize: '13px', color: '#334155' }}>
                      {team.members.map(member => member.username).join(', ')}
                    </p>
                  ) : (
                    <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
                      No members yet
                    </p>
                  )}
                </div>

                <div style={{ marginTop: '10px' }}>
                  <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
                    Invite link
                  </p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#334155', wordBreak: 'break-all' }}>
                    {team.invite_code
                      ? `${window.location.origin}/join/${team.invite_code}/`
                      : 'Generating...'}
                  </p>
                </div>

                {/* Invite link button */}
                <button
                  onClick={() => copyInviteLink(team)}
                  style={{
                    width: '100%',
                    marginTop: '16px',
                    padding: '12px',
                    background: copiedId === team.id ? '#10b981' : '#f0f9ff',
                    color: copiedId === team.id ? 'white' : '#0ea5e9',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontWeight: '500',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                >
                  {copiedId === team.id ? (
                    <>✓ Copied!</>
                  ) : (
                    <>🔗 Copy Invite Link</>
                  )}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '64px' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>👥</div>
            <h3 style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px' }}>No teams yet</h3>
            <p style={{ color: '#64748b', marginBottom: '16px' }}>Create your first team to collaborate</p>
            <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
              Create Team
            </button>
          </div>
        )}
      </main>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Team"
      >
        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', marginBottom: '16px' }}>
            <span style={{ fontSize: '14px', fontWeight: '500' }}>Team Name *</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Development Team"
              className="input"
              style={{ width: '100%', marginTop: '6px', boxSizing: 'border-box' }}
              required
            />
          </label>

          <label style={{ display: 'block', marginBottom: '16px' }}>
            <span style={{ fontSize: '14px', fontWeight: '500' }}>Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this team do?"
              className="input"
              rows={3}
              style={{ width: '100%', marginTop: '6px', boxSizing: 'border-box', resize: 'vertical' }}
            />
          </label>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
            <button 
              type="button" 
              onClick={() => setIsModalOpen(false)}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                background: 'white',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Team
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
