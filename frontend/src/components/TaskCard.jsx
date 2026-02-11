export default function TaskCard({ task, onComplete, onEdit, isOwnTask = true }) {
  const priorityColors = {
    low: { bg: '#dcfce7', text: '#15803d' },
    medium: { bg: '#fef3c7', text: '#b45309' },
    high: { bg: '#ffedd5', text: '#c2410c' },
    urgent: { bg: '#fee2e2', text: '#b91c1c' },
  };

  const statusColors = {
    todo: { bg: '#e2e8f0', text: '#334155' },
    progress: { bg: '#dbeafe', text: '#1d4ed8' },
    review: { bg: '#ccfbf1', text: '#0f766e' },
    done: { bg: '#dcfce7', text: '#15803d' },
  };

  const priority = priorityColors[task.priority] || priorityColors.medium;
  const status = statusColors[task.status] || statusColors.todo;
  const ownershipBadge = isOwnTask
    ? { label: 'Personal task', bg: '#dbeafe', text: '#1e40af' }
    : { label: 'Team task', bg: '#ccfbf1', text: '#0f766e' };
  const ownershipSurface = isOwnTask
    ? { border: '#93c5fd', bg: '#f8fbff' }
    : { border: '#5eead4', bg: '#f5fffd' };

  return (
    <div 
      className="card"
      onClick={() => onEdit?.(task)}
      style={{
        padding: '16px',
        cursor: 'pointer',
        opacity: task.is_completed ? 0.6 : 1,
        borderLeft: `4px solid ${ownershipSurface.border}`,
        background: ownershipSurface.bg,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        {/* Checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onComplete?.(task.id);
          }}
          style={{
            marginTop: '2px',
            width: '22px',
            height: '22px',
            borderRadius: '6px',
            border: task.is_completed ? 'none' : '2px solid #cbd5e1',
            backgroundColor: task.is_completed ? '#0ea5a4' : 'transparent',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          {task.is_completed && '✓'}
        </button>

        {/* Content */}
        <div style={{ flex: 1 }}>
          <h3 style={{ 
            fontWeight: '500', 
            margin: 0,
            textDecoration: task.is_completed ? 'line-through' : 'none',
            color: task.is_completed ? '#94a3b8' : '#0f172a'
          }}>
            {task.title}
          </h3>

          {/* Badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
            <span className="badge" style={{ backgroundColor: ownershipBadge.bg, color: ownershipBadge.text }}>
              {ownershipBadge.label}
            </span>
            <span className="badge" style={{ backgroundColor: priority.bg, color: priority.text }}>
              {task.priority}
            </span>
            <span className="badge" style={{ backgroundColor: status.bg, color: status.text }}>
              {task.status}
            </span>
          </div>

          {/* Meta */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '12px', fontSize: '12px', color: '#64748b', flexWrap: 'wrap' }}>
            {task.due_date && (
              <span>Due: {task.due_date}</span>
            )}
            {task.responsible?.username && (
              <span>Assignee: {task.responsible.username}</span>
            )}
            {task.team_name && (
              <span>Team: {task.team_name}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
