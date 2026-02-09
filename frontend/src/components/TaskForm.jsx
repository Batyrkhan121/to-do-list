import { useState, useEffect } from 'react';
import { useTeams, useCategories } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';

export default function TaskForm({ task, onSubmit, onCancel }) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    team: '',
    responsible: '',
    category: '',
    status: 'todo',
    priority: 'medium',
    due_date: '',
  });

  const { data: teamsData } = useTeams();
  const { data: categoriesData } = useCategories();

  const teams = teamsData?.results || teamsData || [];
  const categories = categoriesData?.results || categoriesData || [];

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        team: task.team?.id || task.team_id || task.team || '',
        responsible: task.responsible?.id || task.responsible || user?.id || '',
        category: task.category?.id || task.category || '',
        status: task.status || 'todo',
        priority: task.priority || 'medium',
        due_date: task.due_date || '',
      });
    }
  }, [task, user?.id]);

  useEffect(() => {
    if (!task && user?.id) {
      setFormData((prev) => ({
        ...prev,
        responsible: prev.responsible || user.id,
      }));
    }
  }, [task, user?.id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      title: formData.title.trim(),
      description: formData.description,
      team: formData.team ? Number(formData.team) : null,
      responsible: formData.responsible ? Number(formData.responsible) : user?.id || null,
      category: formData.category ? Number(formData.category) : null,
      status: formData.status,
      priority: formData.priority,
      due_date: formData.due_date || null,
    };
    onSubmit(data);
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '14px',
    marginTop: '6px',
    boxSizing: 'border-box'
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '16px'
  };

  const labelTextStyle = {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151'
  };

  return (
    <form onSubmit={handleSubmit}>
      <label style={labelStyle}>
        <span style={labelTextStyle}>Task Title *</span>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="Enter task title..."
          style={inputStyle}
          required
        />
      </label>

      <label style={labelStyle}>
        <span style={labelTextStyle}>Description</span>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Add details..."
          rows={3}
          style={{...inputStyle, resize: 'vertical'}}
        />
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <label style={labelStyle}>
          <span style={labelTextStyle}>Team *</span>
          <select
            name="team"
            value={formData.team}
            onChange={handleChange}
            style={inputStyle}
            required={!task}
          >
            <option value="">Select team...</option>
            {teams.map(team => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
        </label>

        <label style={labelStyle}>
          <span style={labelTextStyle}>Category</span>
          <select name="category" value={formData.category} onChange={handleChange} style={inputStyle}>
            <option value="">Select category...</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <label style={labelStyle}>
          <span style={labelTextStyle}>Priority</span>
          <select name="priority" value={formData.priority} onChange={handleChange} style={inputStyle}>
            <option value="low">🟢 Low</option>
            <option value="medium">🟡 Medium</option>
            <option value="high">🟠 High</option>
            <option value="urgent">🔴 Urgent</option>
          </select>
        </label>

        <label style={labelStyle}>
          <span style={labelTextStyle}>Status</span>
          <select name="status" value={formData.status} onChange={handleChange} style={inputStyle}>
            <option value="todo">📋 To Do</option>
            <option value="progress">🚀 In Progress</option>
            <option value="review">👀 In Review</option>
            <option value="done">✅ Done</option>
          </select>
        </label>
      </div>

      <label style={labelStyle}>
        <span style={labelTextStyle}>Due Date</span>
        <input
          type="date"
          name="due_date"
          value={formData.due_date}
          onChange={handleChange}
          style={inputStyle}
        />
      </label>

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
        <button 
          type="button" 
          onClick={onCancel}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            background: 'white',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          Cancel
        </button>
        <button 
          type="submit"
          className="btn btn-primary"
        >
          {task ? 'Update Task' : 'Create Task'}
        </button>
      </div>
    </form>
  );
}
