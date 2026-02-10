import { motion } from 'framer-motion';
import Header from '../components/Header';
import StatCard from '../components/StatCard';
import TaskCard from '../components/TaskCard';
import { PageTransition, CardAnimation, Skeleton } from '../components/animations/PageTransition';
import { useDashboard, useCompleteTask } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading, error } = useDashboard({
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  });
  const completeTask = useCompleteTask();

  if (isLoading) {
    return (
      <PageTransition>
        <Header title="Dashboard" subtitle="Loading..." />
        <main style={{ padding: '32px' }}>
          {/* Skeleton для статистики */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '32px' }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="card" style={{ padding: '24px' }}>
                <Skeleton width="60%" height="16px" />
                <div style={{ marginTop: '12px' }}>
                  <Skeleton width="40%" height="32px" />
                </div>
              </div>
            ))}
          </div>
          
          {/* Skeleton для задач */}
          <div className="card" style={{ padding: '24px' }}>
            <Skeleton width="30%" height="20px" />
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[1, 2, 3].map(i => (
                <Skeleton key={i} height="80px" borderRadius="12px" />
              ))}
            </div>
          </div>
        </main>
      </PageTransition>
    );
  }

  if (error) {
    return (
      <PageTransition>
        <div style={{ padding: '32px' }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              background: '#fef2f2',
              color: '#dc2626',
              padding: '24px',
              borderRadius: '16px',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h3>Connection Error</h3>
            <p>Make sure Django server is running on http://127.0.0.1:8000</p>
          </motion.div>
        </div>
      </PageTransition>
    );
  }

  const productivity = stats?.total_tasks > 0 
    ? Math.round((stats.completed_tasks / stats.total_tasks) * 100) 
    : 0;

  return (
    <PageTransition>
      <Header 
        title="Dashboard" 
        subtitle="Welcome back! Here's your productivity overview."
      />

      <main style={{ padding: '32px' }}>
        {/* Stats Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
          gap: '24px', 
          marginBottom: '32px' 
        }}>
          <CardAnimation index={0}>
            <StatCard
              title="Total Tasks"
              value={stats?.total_tasks || 0}
              icon="📋"
              color="blue"
            />
          </CardAnimation>
          
          <CardAnimation index={1}>
            <StatCard
              title="Completed"
              value={stats?.completed_tasks || 0}
              icon="✅"
              color="green"
              subtitle={`${productivity}% done`}
            />
          </CardAnimation>
          
          <CardAnimation index={2}>
            <StatCard
              title="In Progress"
              value={stats?.in_progress_tasks || 0}
              icon="🚀"
              color="purple"
            />
          </CardAnimation>
          
          <CardAnimation index={3}>
            <StatCard
              title="Overdue"
              value={stats?.overdue_tasks || 0}
              icon="⚠️"
              color="red"
            />
          </CardAnimation>
        </div>

        {/* Productivity Ring */}
        <CardAnimation index={4}>
          <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px', fontWeight: '600' }}>
              📊 Productivity Score
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
              {/* Circular Progress */}
              <div style={{ position: 'relative', width: '120px', height: '120px' }}>
                <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="12"
                  />
                  <motion.circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke={productivity >= 70 ? '#10b981' : productivity >= 40 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={314}
                    initial={{ strokeDashoffset: 314 }}
                    animate={{ strokeDashoffset: 314 - (314 * productivity / 100) }}
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                  />
                </svg>
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center'
                }}>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 }}
                    style={{ fontSize: '28px', fontWeight: 'bold' }}
                  >
                    {productivity}%
                  </motion.div>
                </div>
              </div>
              
              {/* Stats breakdown */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: '24px' }}>
                  <div>
                    <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Active Projects</p>
                    <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '4px 0 0' }}>
                      {stats?.active_projects || 0}
                    </p>
                  </div>
                  <div>
                    <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Teams</p>
                    <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '4px 0 0' }}>
                      {stats?.total_teams || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardAnimation>

        {/* Recent Tasks */}
        <CardAnimation index={5}>
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px', fontWeight: '600' }}>
              📝 Recent Tasks
            </h3>
            
            <motion.div 
              style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.1, delayChildren: 0.3 }
                }
              }}
            >
              {stats?.recent_tasks?.length > 0 ? (
                stats.recent_tasks.map((task, index) => (
                  <motion.div
                    key={task.id}
                    variants={{
                      hidden: { opacity: 0, x: -20 },
                      visible: { opacity: 1, x: 0 }
                    }}
                  >
                    <TaskCard 
                      task={task} 
                      isOwnTask={task.responsible?.id === user?.id}
                      onComplete={(id) => completeTask.mutate(id)}
                    />
                  </motion.div>
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ 
                    textAlign: 'center', 
                    padding: '40px',
                    color: '#64748b'
                  }}
                >
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
                  <p>No tasks yet. Create your first task!</p>
                </motion.div>
              )}
            </motion.div>
          </div>
        </CardAnimation>
      </main>
    </PageTransition>
  );
}
