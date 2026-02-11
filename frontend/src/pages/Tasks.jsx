import { useMemo, useState } from 'react';
import Header from '../components/Header';
import TaskCard from '../components/TaskCard';
import Modal from '../components/Modal';
import TaskForm from '../components/TaskForm';
import { useTasks, useCreateTask, useUpdateTask, useCompleteTask, useDeleteTask } from '../hooks/useApi';

function TaskGridSection({
  title,
  count,
  dotColor,
  sectionColor,
  tasks,
  isOwnTask,
  onComplete,
  onEdit,
  onDelete,
  emptyText,
}) {
  return (
    <section
      className="card"
      style={{
        padding: '20px',
        border: `1px solid ${sectionColor}33`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span style={{ width: '10px', height: '10px', borderRadius: '999px', background: dotColor }}></span>
        <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>
          {title} ({count})
        </h3>
      </div>

      {tasks.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {tasks.map((task) => (
            <div key={task.id} style={{ position: 'relative' }}>
              <TaskCard
                task={task}
                isOwnTask={isOwnTask}
                onComplete={(id) => onComplete(id)}
                onEdit={onEdit}
              />
              <button
                onClick={() => onDelete(task.id)}
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: '#fef2f2',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '12px', color: '#64748b' }}>
          {emptyText}
        </div>
      )}
    </section>
  );
}

function getCompletionStats(taskList) {
  const total = taskList.length;
  const completed = taskList.filter((task) => task.is_completed).length;
  const pending = total - completed;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { total, completed, pending, percent };
}

function CompletionCard({ title, color, stats }) {
  return (
    <div className="card" style={{ padding: '16px', border: `1px solid ${color}33` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
        <h4 style={{ margin: 0, fontSize: '15px', color: '#0f172a' }}>{title}</h4>
        <span style={{ color, fontWeight: 700 }}>{stats.percent}%</span>
      </div>

      <div style={{ height: '8px', borderRadius: '999px', background: '#e2e8f0', overflow: 'hidden', marginBottom: '10px' }}>
        <div
          style={{
            width: `${stats.percent}%`,
            height: '100%',
            background: color,
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#64748b', flexWrap: 'wrap' }}>
        <span>Total: {stats.total}</span>
        <span>Done: {stats.completed}</span>
        <span>Pending: {stats.pending}</span>
      </div>
    </div>
  );
}

function isTeamTask(task) {
  if (task?.team_name) return true;
  if (task?.team_id) return true;
  if (task?.team?.id) return true;
  return false;
}

export default function Tasks() {
  const [filters, setFilters] = useState({ status: '', priority: '' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const syncOptions = {
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  };
  const { data, isLoading, error } = useTasks(filters, syncOptions);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const completeTask = useCompleteTask();
  const deleteTask = useDeleteTask();

  const tasks = data?.results || data || [];

  const personalTasks = useMemo(
    () => tasks.filter((task) => !isTeamTask(task)),
    [tasks]
  );
  const teamTasks = useMemo(
    () => tasks.filter((task) => isTeamTask(task)),
    [tasks]
  );

  const allStats = useMemo(() => getCompletionStats(tasks), [tasks]);
  const personalStats = useMemo(() => getCompletionStats(personalTasks), [personalTasks]);
  const teamStats = useMemo(() => getCompletionStats(teamTasks), [teamTasks]);

  const getApiErrorMessage = (err) => {
    const responseData = err?.response?.data;
    if (!responseData) return err.message;
    if (typeof responseData === 'string') return responseData;
    if (typeof responseData.detail === 'string') return responseData.detail;

    const [firstField] = Object.keys(responseData);
    if (!firstField) return err.message;

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

  const handleSubmit = async (payload) => {
    try {
      if (editingTask) {
        await updateTask.mutateAsync({ id: editingTask.id, data: payload });
      } else {
        await createTask.mutateAsync(payload);
      }
      setIsModalOpen(false);
      setEditingTask(null);
    } catch (err) {
      alert(`Error: ${getApiErrorMessage(err)}`);
    }
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      await deleteTask.mutateAsync(taskId);
    } catch {
      alert('Error deleting task');
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '256px' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            border: '4px solid #e2e8f0',
            borderTopColor: '#0ea5e9',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        ></div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <Header
        title="Tasks"
        subtitle={`${tasks.length} total | ${personalTasks.length} personal | ${teamTasks.length} team`}
        onAddClick={handleCreate}
        addButtonText="New Task"
      />

      <main className="page-main">
        <div className="card" style={{ padding: '16px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <select
              value={filters.status}
              onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
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
              onChange={(event) => setFilters((current) => ({ ...current, priority: event.target.value }))}
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
          <p style={{ margin: '10px 0 0', fontSize: '12px', color: '#64748b' }}>
            Auto-sync is enabled: updates from teammates appear every 5 seconds.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <CompletionCard title="All tasks progress" color="#0ea5e9" stats={allStats} />
          <CompletionCard title="Personal tasks progress" color="#1d4ed8" stats={personalStats} />
          <CompletionCard title="Team tasks progress" color="#0f766e" stats={teamStats} />
        </div>

        {error ? (
          <div style={{ backgroundColor: '#fef2f2', color: '#dc2626', padding: '16px', borderRadius: '12px' }}>
            Error: {error.message}. Make sure Django is running.
          </div>
        ) : tasks.length > 0 ? (
          <div style={{ display: 'grid', gap: '24px' }}>
            <TaskGridSection
              title="Personal tasks"
              count={personalTasks.length}
              dotColor="#1d4ed8"
              sectionColor="#1d4ed8"
              tasks={personalTasks}
              isOwnTask={true}
              onComplete={(id) => completeTask.mutate(id)}
              onEdit={handleEdit}
              onDelete={handleDelete}
              emptyText="No personal tasks yet."
            />

            <TaskGridSection
              title="Team tasks"
              count={teamTasks.length}
              dotColor="#0f766e"
              sectionColor="#0f766e"
              tasks={teamTasks}
              isOwnTask={false}
              onComplete={(id) => completeTask.mutate(id)}
              onEdit={handleEdit}
              onDelete={handleDelete}
              emptyText="No team tasks right now."
            />
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '64px' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px', color: '#0ea5e9' }}>No tasks</div>
            <h3 style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px' }}>No tasks found</h3>
            <p style={{ color: '#64748b', marginBottom: '16px' }}>Create your first task to get started</p>
            <button onClick={handleCreate} className="btn btn-primary">
              Create Task
            </button>
          </div>
        )}
      </main>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTask(null);
        }}
        title={editingTask ? 'Edit Task' : 'Create New Task'}
      >
        <TaskForm
          task={editingTask}
          onSubmit={handleSubmit}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingTask(null);
          }}
        />
      </Modal>
    </div>
  );
}
