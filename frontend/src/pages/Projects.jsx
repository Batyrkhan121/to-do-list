import { useState } from 'react';
import Header from '../components/Header';
import Modal from '../components/Modal';
import { 
  useProjects, 
  useCreateProject, 
  useDeleteProject,
  useTasks,
  useAddTaskToProject,
  useRemoveTaskFromProject,
  useTeams 
} from '../hooks/useApi';

export default function Projects() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [teamId, setTeamId] = useState('');
  const [deadline, setDeadline] = useState('');

  const syncOptions = {
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  };

  const { data: projectsData, isLoading } = useProjects({}, syncOptions);
  const { data: tasksData } = useTasks({}, syncOptions);
  const { data: teamsData } = useTeams();
  
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();
  const addTaskToProject = useAddTaskToProject();
  const removeTaskFromProject = useRemoveTaskFromProject();

  const projects = projectsData?.results || projectsData || [];
  const allTasks = tasksData?.results || tasksData || [];
  const teams = teamsData?.results || teamsData || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createProject.mutateAsync({ 
        project_title: title,
        description,
        team_id: teamId ? Number(teamId) : null,
        deadline: deadline || null
      });
      setIsModalOpen(false);
      setTitle('');
      setDescription('');
      setTeamId('');
      setDeadline('');
    } catch (error) {
      alert('Error: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this project?')) {
      try {
        await deleteProject.mutateAsync(id);
      } catch (error) {
        alert('Error deleting project');
      }
    }
  };

  const openTaskModal = (project) => {
    setSelectedProject(project);
    setIsTaskModalOpen(true);
  };

  const handleAddTask = async (taskId) => {
    try {
      await addTaskToProject.mutateAsync({ 
        projectId: selectedProject.id, 
        taskId: taskId 
      });
    } catch (error) {
      alert('Error adding task');
    }
  };

  const handleRemoveTask = async (taskId) => {
    try {
      await removeTaskFromProject.mutateAsync({ 
        projectId: selectedProject.id, 
        taskId: taskId 
      });
    } catch (error) {
      alert('Error removing task');
    }
  };

  const getProgressColor = (progress) => {
    if (progress >= 75) return '#10b981';
    if (progress >= 50) return '#f59e0b';
    if (progress >= 25) return '#f97316';
    return '#ef4444';
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
        title="Projects" 
        subtitle={`${projects.length} projects`}
        onAddClick={() => setIsModalOpen(true)}
        addButtonText="New Project"
      />

      <main style={{ padding: '32px' }}>
        {projects.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
            {projects.map(project => {
              const progress = project.progress || 0;
              const taskCount = project.task_count || 0;
              
              return (
                <div key={project.id} className="card" style={{ padding: '24px', position: 'relative' }}>
                  {/* Delete button */}
                  <button
                    onClick={() => handleDelete(project.id)}
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      background: '#fef2f2',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      cursor: 'pointer'
                    }}
                  >
                    🗑️
                  </button>

                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      borderRadius: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px'
                    }}>
                      📁
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: 0, fontWeight: '600', fontSize: '18px' }}>
                        {project.project_title}
                      </h3>
                      <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#64748b' }}>
                        {project.team?.name || 'No team'}
                      </p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '14px', color: '#64748b' }}>Progress</span>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: getProgressColor(progress) }}>
                        {progress}%
                      </span>
                    </div>
                    <div style={{
                      height: '10px',
                      background: '#e2e8f0',
                      borderRadius: '10px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${progress}%`,
                        background: `linear-gradient(90deg, ${getProgressColor(progress)}, ${getProgressColor(progress)}dd)`,
                        borderRadius: '10px',
                        transition: 'width 0.5s ease'
                      }} />
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr 1fr', 
                    gap: '12px',
                    padding: '16px 0',
                    borderTop: '1px solid #f1f5f9',
                    marginBottom: '16px'
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>{taskCount}</p>
                      <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>Tasks</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: '#10b981' }}>
                        {project.tasks?.filter(t => t.is_completed).length || 0}
                      </p>
                      <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>Done</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: '#f59e0b' }}>
                        {project.tasks?.filter(t => !t.is_completed).length || taskCount}
                      </p>
                      <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>Pending</p>
                    </div>
                  </div>

                  {/* Status badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <span className="badge" style={{
                      background: project.status === 'active' ? '#dcfce7' : 
                                 project.status === 'completed' ? '#dbeafe' : '#f1f5f9',
                      color: project.status === 'active' ? '#16a34a' : 
                             project.status === 'completed' ? '#2563eb' : '#64748b'
                    }}>
                      {project.status === 'active' ? '🚀 Active' : 
                       project.status === 'completed' ? '✅ Completed' : 
                       project.status === 'planning' ? '📋 Planning' : project.status}
                    </span>
                    {project.deadline && (
                      <span style={{ fontSize: '12px', color: '#64748b' }}>
                        📅 {project.deadline}
                      </span>
                    )}
                  </div>

                  {/* Manage tasks button */}
                  <button
                    onClick={() => openTaskModal(project)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: '#f0f9ff',
                      color: '#0ea5e9',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontWeight: '500',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    ⚙️ Manage Tasks
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '64px' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>📁</div>
            <h3 style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px' }}>No projects yet</h3>
            <p style={{ color: '#64748b', marginBottom: '16px' }}>Create your first project</p>
            <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
              Create Project
            </button>
          </div>
        )}
      </main>

      {/* Create Project Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Project"
      >
        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', marginBottom: '16px' }}>
            <span style={{ fontSize: '14px', fontWeight: '500' }}>Project Title *</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Website Redesign"
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
              placeholder="Project details..."
              className="input"
              rows={3}
              style={{ width: '100%', marginTop: '6px', boxSizing: 'border-box', resize: 'vertical' }}
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <label style={{ display: 'block', marginBottom: '16px' }}>
              <span style={{ fontSize: '14px', fontWeight: '500' }}>Team</span>
              <select 
                value={teamId} 
                onChange={(e) => setTeamId(e.target.value)}
                className="input"
                style={{ width: '100%', marginTop: '6px', boxSizing: 'border-box' }}
              >
                <option value="">Select team...</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </label>

            <label style={{ display: 'block', marginBottom: '16px' }}>
              <span style={{ fontSize: '14px', fontWeight: '500' }}>Deadline</span>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="input"
                style={{ width: '100%', marginTop: '6px', boxSizing: 'border-box' }}
              />
            </label>
          </div>

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
              Create Project
            </button>
          </div>
        </form>
      </Modal>

      {/* Manage Tasks Modal */}
      <Modal
        isOpen={isTaskModalOpen}
        onClose={() => { setIsTaskModalOpen(false); setSelectedProject(null); }}
        title={`Manage Tasks - ${selectedProject?.project_title || ''}`}
      >
        <div>
          {/* Current tasks in project */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#374151' }}>
              📋 Tasks in Project ({selectedProject?.tasks?.length || 0})
            </h4>
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {selectedProject?.tasks?.length > 0 ? (
                selectedProject.tasks.map(task => (
                  <div 
                    key={task.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      background: task.is_completed ? '#f0fdf4' : '#f8fafc',
                      borderRadius: '8px',
                      marginBottom: '8px'
                    }}
                  >
                    <span style={{ 
                      textDecoration: task.is_completed ? 'line-through' : 'none',
                      color: task.is_completed ? '#16a34a' : '#0f172a'
                    }}>
                      {task.is_completed ? '✅' : '⏳'} {task.title}
                    </span>
                    <button
                      onClick={() => handleRemoveTask(task.id)}
                      style={{
                        background: '#fef2f2',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))
              ) : (
                <p style={{ color: '#64748b', textAlign: 'center', padding: '16px' }}>
                  No tasks in this project yet
                </p>
              )}
            </div>
          </div>

          {/* Add tasks */}
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#374151' }}>
              ➕ Add Tasks
            </h4>
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {allTasks.filter(task => 
                !selectedProject?.tasks?.some(t => t.id === task.id)
              ).length > 0 ? (
                allTasks
                  .filter(task => !selectedProject?.tasks?.some(t => t.id === task.id))
                  .map(task => (
                    <div 
                      key={task.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        marginBottom: '8px'
                      }}
                    >
                      <span>{task.title}</span>
                      <button
                        onClick={() => handleAddTask(task.id)}
                        style={{
                          background: '#dcfce7',
                          color: '#16a34a',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '4px 12px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}
                      >
                        + Add
                      </button>
                    </div>
                  ))
              ) : (
                <p style={{ color: '#64748b', textAlign: 'center', padding: '16px' }}>
                  All tasks are already in this project or no tasks exist
                </p>
              )}
            </div>
          </div>

          <div style={{ marginTop: '24px', textAlign: 'right' }}>
            <button 
              onClick={() => { setIsTaskModalOpen(false); setSelectedProject(null); }}
              className="btn btn-primary"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
