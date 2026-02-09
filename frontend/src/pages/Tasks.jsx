import { useState } from 'react';
import Header from '../components/Header';
import TaskCard from '../components/TaskCard';
import Modal from '../components/Modal';
import TaskForm from '../components/TaskForm';
import { useTasks, useCreateTask, useUpdateTask, useCompleteTask, useDeleteTask } from '../hooks/useApi';

export default function Tasks() {
  const [filters, setFilters] = useState({ status: '', priority: '' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const { data, isLoading, error } = useTasks(filters);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const completeTask = useCompleteTask();
  const deleteTask = useDeleteTask();

  const tasks = data?.results || data || [];

  const getApiErrorMessage = (error) => {
    const responseData = error?.response?.data;
    if (!responseData) return error.message;
    if (typeof responseData === 'string') return responseData;
    if (typeof responseData.detail === 'string') return responseData.detail;

    const [firstField] = Object.keys(responseData);
    if (!firstField) return error.message;

    const fieldValue = responseData[firstField];
    if (Array.isArray(fieldValue) && fieldValue.length > 0) {
      return `${firstField}: ${fieldValue[0]}`;
    }

    return `${firstField}: ${String(fieldValue)}`;
  };

  const handleCreate = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleSubmit = async (data) => {
    try {
      if (editingTask) {
        await updateTask.mutateAsync({ id: editingTask.id, data });
      } else {
        await createTask.mutateAsync(data);
      }
      setIsModalOpen(false);
      setEditingTask(null);
    } catch (error) {
      alert(`Error: ${getApiErrorMessage(error)}`);
    }
  };

  const handleDelete = async (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask.mutateAsync(taskId);
      } catch (error) {
        alert('Error deleting task');
      }
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '256px' }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '4px solid #e2e8f0',
          borderTopColor: '#0ea5e9',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <Header 
        title="Tasks" 
        subtitle={`${tasks.length} tasks`}
        onAddClick={handleCreate}
        addButtonText="New Task"
      />

      <main style={{ padding: '32px' }}>
        {/* Filters */}
        <div className="card" style={{ padding: '16px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <select
              value={filters.status}
              onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
              className="input"
              style={{ width: 'auto' }}
            >
              <option value="">All Status</option>
              <option value="todo">To Do</option>
              <option value="progress">In Progress</option>
              <option value="review">In Review</option>
              <option value="done">Done</option>
            </select>

            <select
              value={filters.priority}
              onChange={(e) => setFilters(f => ({ ...f, priority: e.target.value }))}
              className="input"
              style={{ width: 'auto' }}
            >
              <option value="">All Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>

            {(filters.status || filters.priority) && (
              <button
                onClick={() => setFilters({ status: '', priority: '' })}
                style={{ color: '#0ea5e9', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '500' }}
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Tasks */}
        {error ? (
          <div style={{ backgroundColor: '#fef2f2', color: '#dc2626', padding: '16px', borderRadius: '12px' }}>
            Error: {error.message}. Make sure Django is running!
          </div>
        ) : tasks.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
            {tasks.map(task => (
              <div key={task.id} style={{ position: 'relative' }}>
                <TaskCard
                  task={task}
                  onComplete={(id) => completeTask.mutate(id)}
                  onEdit={handleEdit}
                />
                <button
                  onClick={() => handleDelete(task.id)}
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: '#fef2f2',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '64px' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>📝</div>
            <h3 style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px' }}>No tasks found</h3>
            <p style={{ color: '#64748b', marginBottom: '16px' }}>Create your first task to get started</p>
            <button onClick={handleCreate} className="btn btn-primary">
              Create Task
            </button>
          </div>
        )}
      </main>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingTask(null); }}
        title={editingTask ? 'Edit Task' : 'Create New Task'}
      >
        <TaskForm
          task={editingTask}
          onSubmit={handleSubmit}
          onCancel={() => { setIsModalOpen(false); setEditingTask(null); }}
        />
      </Modal>
    </div>
  );
}
