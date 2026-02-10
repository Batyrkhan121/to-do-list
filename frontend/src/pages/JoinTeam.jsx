import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useJoinTeam, useJoinTeamByCode, useTeamInviteInfo, useTeamInviteInfoByCode } from '../hooks/useApi';

export default function JoinTeam() {
  const { teamId, inviteCode } = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();
  const identifier = inviteCode || teamId;
  const isCodeMode = Boolean(inviteCode);

  const [localMessage, setLocalMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  const [joined, setJoined] = useState(false);
  const [autoJoinAttempted, setAutoJoinAttempted] = useState(false);

  const joinTeam = useJoinTeam();
  const joinTeamByCode = useJoinTeamByCode();
  const inviteById = useTeamInviteInfo(teamId);
  const inviteByCode = useTeamInviteInfoByCode(inviteCode);
  const inviteDataSource = isCodeMode ? inviteByCode : inviteById;
  const inviteInfo = inviteDataSource.data;
  const inviteLoading = inviteDataSource.isLoading;
  const inviteError = inviteDataSource.error;

  const teamNameFromQuery = searchParams.get('name');
  const teamName = useMemo(
    () => inviteInfo?.name || teamNameFromQuery || `Team #${identifier || 'unknown'}`,
    [inviteInfo?.name, teamNameFromQuery, identifier]
  );

  useEffect(() => {
    if (!joined) return;
    const timeoutId = setTimeout(() => {
      navigate('/tasks', { replace: true });
    }, 1400);

    return () => clearTimeout(timeoutId);
  }, [joined, navigate]);

  const getApiError = (error) => {
    const data = error?.response?.data;
    if (!data) return error.message || 'Failed to join the team';
    if (typeof data === 'string') return data;
    if (typeof data.detail === 'string') return data.detail;

    const firstField = Object.keys(data)[0];
    if (!firstField) return 'Failed to join the team';
    const value = data[firstField];
    if (Array.isArray(value)) return `${firstField}: ${value[0]}`;
    return `${firstField}: ${String(value)}`;
  };

  const handleJoin = async () => {
    if (!isAuthenticated) {
      const next = encodeURIComponent(`${location.pathname}${location.search}`);
      navigate(`/login?next=${next}`, { replace: true });
      return;
    }

    setLocalMessage('');
    setMessageType('info');
    try {
      const result = isCodeMode
        ? await joinTeamByCode.mutateAsync(inviteCode)
        : await joinTeam.mutateAsync(teamId);
      setJoined(true);
      setMessageType('success');
      setLocalMessage(result?.detail || 'You have joined this team.');
    } catch (error) {
      setMessageType('error');
      setLocalMessage(getApiError(error));
    }
  };

  useEffect(() => {
    if (loading || !isAuthenticated) return;
    if (inviteLoading || joined || autoJoinAttempted) return;
    if (inviteInfo?.is_member) return;

    setAutoJoinAttempted(true);

    const joinAutomatically = async () => {
      setLocalMessage('');
      setMessageType('info');
      try {
        const result = isCodeMode
          ? await joinTeamByCode.mutateAsync(inviteCode)
          : await joinTeam.mutateAsync(teamId);
        setJoined(true);
        setMessageType('success');
        setLocalMessage(result?.detail || 'You have joined this team.');
      } catch (error) {
        setMessageType('error');
        setLocalMessage(getApiError(error));
      }
    };

    joinAutomatically();
  }, [
    loading,
    isAuthenticated,
    inviteLoading,
    inviteInfo,
    joined,
    autoJoinAttempted,
    joinTeam,
    joinTeamByCode,
    isCodeMode,
    inviteCode,
    teamId,
  ]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '24px' }}>
      <div
        className="card"
        style={{
          maxWidth: '560px',
          margin: '64px auto',
          padding: '32px',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '28px' }}>Team Invitation</h1>
        <p style={{ color: '#64748b', marginTop: '8px' }}>
          You were invited to join <strong>{teamName}</strong>.
        </p>

        {inviteLoading && (
          <p style={{ color: '#64748b', marginTop: '16px' }}>Loading team details...</p>
        )}

        {inviteError && (
          <p style={{ color: '#dc2626', marginTop: '16px' }}>
            Could not load invite details. You can still try joining.
          </p>
        )}

        {inviteInfo && (
          <div
            style={{
              marginTop: '16px',
              padding: '16px',
              borderRadius: '12px',
              background: '#f1f5f9',
            }}
          >
            <p style={{ margin: 0, color: '#334155' }}>
              Team lead: <strong>{inviteInfo.team_lead}</strong>
            </p>
            <p style={{ margin: '8px 0 0', color: '#334155' }}>
              Members: <strong>{inviteInfo.member_count}</strong>
            </p>
          </div>
        )}

        {(inviteInfo?.is_member || joined) && (
          <p style={{ color: '#059669', marginTop: '16px' }}>
            You are already in this team. Shared tasks are now visible in Tasks and Calendar.
          </p>
        )}

        {localMessage && (
          <p
            style={{
              marginTop: '16px',
              color: messageType === 'error' ? '#dc2626' : (messageType === 'success' ? '#059669' : '#0f172a'),
            }}
          >
            {localMessage}
          </p>
        )}

        <div style={{ display: 'flex', gap: '12px', marginTop: '24px', flexWrap: 'wrap' }}>
          {!inviteInfo?.is_member && !joined && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleJoin}
              disabled={joinTeam.isPending || joinTeamByCode.isPending}
            >
              {isAuthenticated
                ? (joinTeam.isPending || joinTeamByCode.isPending ? 'Joining...' : 'Join Team')
                : 'Login to Join Team'}
            </button>
          )}

          <Link
            to="/tasks"
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              textDecoration: 'none',
              color: '#0f172a',
              background: 'white',
              fontWeight: 500,
            }}
          >
            Open Tasks
          </Link>

          <Link
            to="/teams"
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              textDecoration: 'none',
              color: '#0f172a',
              background: 'white',
              fontWeight: 500,
            }}
          >
            Open Teams
          </Link>
        </div>
      </div>
    </div>
  );
}
