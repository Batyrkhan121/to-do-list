import { useState } from 'react';
import Header from '../components/Header';
import Modal from '../components/Modal';
import { useTeams, useCreateTeam, useDeleteTeam, useTeamDashboardStats } from '../hooks/useApi';

function buildInviteLink(team) {
  if (!team?.invite_code) return '';
  const params = new URLSearchParams({
    invite_code: team.invite_code,
    name: team.name || '',
  });
  return `${window.location.origin}/join/team/${team.id}?${params.toString()}`;
}

function getTeamPeople(team) {
  const peopleMap = new Map();

  if (team?.team_lead) {
    peopleMap.set(team.team_lead.id, {
      ...team.team_lead,
      isLead: true,
    });
  }

  (team?.members || []).forEach((member) => {
    const existing = peopleMap.get(member.id);
    peopleMap.set(member.id, {
      ...member,
      isLead: existing?.isLead || false,
    });
  });

  return Array.from(peopleMap.values());
}

export default function Teams() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const { data, isLoading } = useTeams({}, {
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  });
  const { data: teamStats } = useTeamDashboardStats();
  const createTeam = useCreateTeam();
  const deleteTeam = useDeleteTeam();

  const teams = data?.results || data || [];

  // Helper function to get team stats
  const getTeamStatsById = (teamId) => {
    if (!teamStats?.teams) return null;
    return teamStats.teams.find(t => t.id === teamId);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await createTeam.mutateAsync({ name, description });
      setIsModalOpen(false);
      setName('');
      setDescription('');
    } catch (error) {
      alert('Error: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this team? All related tasks will lose their team assignment.')) {
      return;
    }

    try {
      await deleteTeam.mutateAsync(id);
    } catch {
      alert('Error deleting team');
    }
  };

  const copyInviteLink = async (team) => {
    if (!team.invite_code) {
      alert('Invite code is not available for this team yet. Refresh the page.');
      return;
    }

    const inviteLink = buildInviteLink(team);

    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopiedId(team.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      alert('Failed to copy link. Please copy it manually.');
    }
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

      <main className="page-main">
        {teams.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '24px' }}>
            {teams.map((team) => {
              const people = getTeamPeople(team);
              const inviteLink = buildInviteLink(team);
              const stats = getTeamStatsById(team.id);
              const progress = stats?.progress_percent || 0;
              const progressColor = progress >= 75 ? '#10b981' : progress >= 40 ? '#f59e0b' : '#ef4444';

              return (
                <div key={team.id} className="card" style={{ padding: '24px', position: 'relative' }}>
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
                      fontSize: '14px',
                    }}
                    title="Delete team"
                  >
                    Delete
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                    <div
                      style={{
                        width: '60px',
                        height: '60px',
                        background: 'linear-gradient(135deg, #10b981, #06b6d4)',
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '22px',
                      }}
                    >
                      {team.name?.slice(0, 1)?.toUpperCase() || 'T'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: 0, fontWeight: '600', fontSize: '18px' }}>{team.name}</h3>
                      <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#64748b' }}>
                        Lead: {team.team_lead?.username || 'Admin'}
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {stats && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>Progress</span>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: progressColor }}>
                          {progress}%
                        </span>
                      </div>
                      <div style={{
                        height: '8px',
                        background: '#e2e8f0',
                        borderRadius: '999px',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${progress}%`,
                          background: progressColor,
                          borderRadius: '999px',
                          transition: 'width 0.5s ease',
                        }} />
                      </div>
                      <p style={{ fontSize: '11px', color: '#64748b', margin: '4px 0 0' }}>
                        {stats.completed_tasks} of {stats.total_tasks} tasks done
                      </p>
                    </div>
                  )}

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '12px',
                      padding: '16px 0',
                      borderTop: '1px solid #f1f5f9',
                      borderBottom: '1px solid #f1f5f9',
                    }}
                  >
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '28px', fontWeight: 'bold', margin: 0, color: '#0ea5e9' }}>
                        {team.member_count || 0}
                      </p>
                      <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Members</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '28px', fontWeight: 'bold', margin: 0, color: '#10b981' }}>
                        {team.is_active ? 'On' : 'Off'}
                      </p>
                      <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                        {team.is_active ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                  </div>

                  {/* Member Avatars */}
                  <div style={{ marginTop: '12px' }}>
                    <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
                      Team members
                    </p>
                    {people.length > 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                        {people.slice(0, 8).map((member, idx) => {
                          const initials = member.username.slice(0, 2).toUpperCase();
                          const bgColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
                          const bgColor = bgColors[idx % bgColors.length];
                          
                          return (
                            <div
                              key={member.id}
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: bgColor,
                                border: '2px solid white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '11px',
                                fontWeight: '600',
                                color: 'white',
                                position: 'relative',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                              }}
                              title={member.username + (member.isLead ? ' (Lead)' : '')}
                            >
                              {initials}
                              {member.isLead && (
                                <div style={{
                                  position: 'absolute',
                                  top: '-4px',
                                  right: '-4px',
                                  width: '14px',
                                  height: '14px',
                                  background: '#fbbf24',
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '8px',
                                  border: '2px solid white',
                                }}>
                                  ⭐
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {people.length > 8 && (
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: '#64748b',
                            border: '2px solid white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: '600',
                            color: 'white',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          }}>
                            +{people.length - 8}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>No members yet</p>
                    )}
                  </div>

                  <div style={{ marginTop: '10px' }}>
                    <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
                      Invite link
                    </p>
                    <p style={{ margin: 0, fontSize: '12px', color: '#334155', wordBreak: 'break-all' }}>
                      {inviteLink || 'Generating...'}
                    </p>
                  </div>

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
                      transition: 'all 0.2s',
                    }}
                  >
                    {copiedId === team.id ? 'Copied' : 'Copy Invite Link'}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '64px' }}>
            <div style={{ fontSize: '42px', marginBottom: '16px', color: '#0ea5e9' }}>No teams</div>
            <h3 style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px' }}>No teams yet</h3>
            <p style={{ color: '#64748b', marginBottom: '16px' }}>Create your first team to collaborate</p>
            <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
              Create Team
            </button>
          </div>
        )}
      </main>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Team">
        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', marginBottom: '16px' }}>
            <span style={{ fontSize: '14px', fontWeight: '500' }}>Team Name *</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
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
              onChange={(event) => setDescription(event.target.value)}
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
                cursor: 'pointer',
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
