import { motion } from 'framer-motion';
import { useTasks, useCompleteTask } from '../hooks/useApi';

export default function TeamTasksList() {
  const { data: tasksData, isLoading } = useTasks({}, {
    refetchInterval: 5000,
  });
  const completeTask = useCompleteTask();

  const tasks = tasksData?.results || tasksData || [];
  const teamTasks = tasks.filter(task => task.team_id != null);

  if (isLoading) {
    return (
      <div className="card" style={{ padding: '24px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '20px', fontWeight: '600' }}>
          📋 Team Tasks
        </h3>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (teamTasks.length === 0) {
    return (
      <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
        <h3 style={{ fontWeight: '600', marginBottom: '8px' }}>No team tasks yet</h3>
        <p style={{ color: '#64748b' }}>
          Your teams don't have any tasks. Create one to get started!
        </p>
      </div>
    );
  }

  // Group tasks by team
  const tasksByTeam = {};
  teamTasks.forEach(task => {
    const teamName = task.team_name || 'Unknown Team';
    if (!tasksByTeam[teamName]) {
      tasksByTeam[teamName] = [];
    }
    tasksByTeam[teamName].push(task);
  });

  const priorityColors = {
    low: { bg: '#dcfce7', text: '#15803d' },
    medium: { bg: '#fef3c7', text: '#b45309' },
    high: { bg: '#ffedd5', text: '#c2410c' },
    urgent: { bg: '#fee2e2', text: '#b91c1c' },
  };

  const handleToggleComplete = (taskId) => {
    completeTask.mutate(taskId);
  };

  return (
    <div className="card" style={{ padding: '24px' }}>
      <h3 style={{ marginTop: 0, marginBottom: '20px', fontWeight: '600' }}>
        📋 Team Tasks
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {Object.entries(tasksByTeam).map(([teamName, tasks]) => (
          <div key={teamName}>
            <h4 style={{ 
              fontSize: '14px', 
              fontWeight: '600', 
              color: '#64748b', 
              margin: '0 0 12px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              {teamName}
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {tasks.map((task) => {
                const priority = priorityColors[task.priority] || priorityColors.medium;
                const initials = task.responsible?.username?.slice(0, 2).toUpperCase() || '?';
                
                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      padding: '16px',
                      background: task.is_completed ? '#f8fafc' : '#ffffff',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      opacity: task.is_completed ? 0.7 : 1,
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      {/* Checkbox */}
                      <button
                        onClick={() => handleToggleComplete(task.id)}
                        style={{
                          marginTop: '2px',
                          width: '22px',
                          height: '22px',
                          borderRadius: '6px',
                          border: task.is_completed ? 'none' : '2px solid #cbd5e1',
                          backgroundColor: task.is_completed ? '#10b981' : 'transparent',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          fontSize: '12px',
                          flexShrink: 0,
                        }}
                      >
                        {task.is_completed && '✓'}
                      </button>

                      {/* Content */}
                      <div style={{ flex: 1 }}>
                        <h3 style={{ 
                          fontWeight: '500', 
                          margin: 0,
                          fontSize: '15px',
                          textDecoration: task.is_completed ? 'line-through' : 'none',
                          color: task.is_completed ? '#94a3b8' : '#0f172a',
                        }}>
                          {task.title}
                        </h3>

                        {/* Badges */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                          <span 
                            className="badge" 
                            style={{ 
                              backgroundColor: priority.bg, 
                              color: priority.text,
                              fontSize: '11px',
                              padding: '4px 10px',
                            }}
                          >
                            {task.priority}
                          </span>
                          
                          {task.due_date && (
                            <span 
                              className="badge" 
                              style={{ 
                                backgroundColor: '#dbeafe', 
                                color: '#1e40af',
                                fontSize: '11px',
                                padding: '4px 10px',
                              }}
                            >
                              📅 {task.due_date}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Responsible User Avatar */}
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: 'white',
                        flexShrink: 0,
                      }}
                      title={task.responsible?.username || 'Unknown'}
                      >
                        {initials}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
