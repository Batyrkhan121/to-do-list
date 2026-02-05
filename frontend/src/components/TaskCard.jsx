export default function TaskCard({ task, onComplete, onEdit }) {
  const priorityColors = {
    low: { bg: '#f0fdf4', text: '#16a34a' },
    medium: { bg: '#fefce8', text: '#ca8a04' },
    high: { bg: '#fff7ed', text: '#ea580c' },
    urgent: { bg: '#fef2f2', text: '#dc2626' },
  };

  const statusColors = {
    todo: { bg: '#f1f5f9', text: '#475569' },
    progress: { bg: '#eff6ff', text: '#2563eb' },
    review: { bg: '#faf5ff', text: '#9333ea' },
    done: { bg: '#f0fdf4', text: '#16a34a' },
  };

  const priority = priorityColors[task.priority] || priorityColors.medium;
  const status = statusColors[task.status] || statusColors.todo;

  return (
    <div 
      className="card"
      onClick={() => onEdit?.(task)}
      style={{ 
        padding: '16px', 
        cursor: 'pointer',
        opacity: task.is_completed ? 0.6 : 1
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
            backgroundColor: task.is_completed ? '#10b981' : 'transparent',
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
            <span className="badge" style={{ backgroundColor: priority.bg, color: priority.text }}>
              {task.priority}
            </span>
            <span className="badge" style={{ backgroundColor: status.bg, color: status.text }}>
              {task.status}
            </span>
          </div>

          {/* Meta */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '12px', fontSize: '12px', color: '#64748b' }}>
            {task.due_date && (
              <span>Due: {task.due_date}</span>
            )}
            {task.responsible?.username && (
              <span>Assignee: {task.responsible.username}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
