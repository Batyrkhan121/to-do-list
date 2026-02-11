import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export default function TeamProgressCard({ teams, overall }) {
  const navigate = useNavigate();

  if (!teams || teams.length === 0) {
    return (
      <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
        <h3 style={{ fontWeight: '600', marginBottom: '8px' }}>No team tasks yet</h3>
        <p style={{ color: '#64748b', marginBottom: '16px' }}>
          Create a team to get started with collaborative tasks!
        </p>
      </div>
    );
  }

  const getProgressColor = (percent) => {
    if (percent >= 75) return '#10b981';
    if (percent >= 40) return '#f59e0b';
    return '#ef4444';
  };

  const overallColor = getProgressColor(overall?.progress || 0);
  const overallProgress = overall?.progress || 0;

  return (
    <div className="card" style={{ padding: '24px' }}>
      <h3 style={{ marginTop: 0, marginBottom: '20px', fontWeight: '600' }}>
        👥 Team Progress
      </h3>

      {/* Overall Progress Bar */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: '500', color: '#334155' }}>
            Overall Team Progress
          </span>
          <span style={{ fontSize: '14px', fontWeight: '600', color: overallColor }}>
            {overallProgress}%
          </span>
        </div>
        <div style={{
          height: '12px',
          background: '#e2e8f0',
          borderRadius: '999px',
          overflow: 'hidden',
        }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${overallProgress}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            style={{
              height: '100%',
              background: overallColor,
              borderRadius: '999px',
            }}
          />
        </div>
        <p style={{ fontSize: '12px', color: '#64748b', margin: '8px 0 0' }}>
          {overall?.completed || 0} of {overall?.total || 0} tasks completed
        </p>
      </div>

      {/* Team Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {teams.map((team) => {
          const teamColor = getProgressColor(team.progress_percent);
          
          return (
            <motion.div
              key={team.id}
              whileHover={{ scale: 1.02 }}
              onClick={() => navigate('/teams')}
              style={{
                padding: '16px',
                background: '#f8fafc',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, fontWeight: '600', fontSize: '15px', color: '#0f172a' }}>
                  {team.name}
                </h4>
                <span style={{ fontSize: '13px', fontWeight: '600', color: teamColor }}>
                  {team.progress_percent}%
                </span>
              </div>

              {/* Mini Progress Bar */}
              <div style={{
                height: '6px',
                background: '#e2e8f0',
                borderRadius: '999px',
                overflow: 'hidden',
                marginBottom: '12px',
              }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${team.progress_percent}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  style={{
                    height: '100%',
                    background: teamColor,
                    borderRadius: '999px',
                  }}
                />
              </div>

              {/* Tasks info and member avatars */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  {team.completed_tasks} of {team.total_tasks} tasks done
                </span>
                
                {/* Member Avatars */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {team.members.slice(0, 5).map((member, idx) => {
                    const initials = member.username.slice(0, 2).toUpperCase();
                    const bgColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
                    const bgColor = bgColors[idx % bgColors.length];
                    
                    return (
                      <div
                        key={member.id}
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: member.avatar_url ? bgColor : bgColor,
                          backgroundImage: member.avatar_url ? `url("${member.avatar_url}")` : 'none',
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          border: '2px solid white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          fontWeight: '600',
                          color: 'white',
                          marginLeft: idx === 0 ? 0 : '-8px',
                          position: 'relative',
                        }}
                        title={member.username}
                      >
                        {!member.avatar_url && initials}
                        {member.is_lead && (
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
                          }}>
                            ⭐
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {team.members.length > 5 && (
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: '#64748b',
                      border: '2px solid white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      fontWeight: '600',
                      color: 'white',
                      marginLeft: '-8px',
                    }}>
                      +{team.members.length - 5}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
