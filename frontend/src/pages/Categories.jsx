import { useState } from 'react';
import Header from '../components/Header';
import Modal from '../components/Modal';
import { useCategories, useCreateCategory, useDeleteCategory } from '../hooks/useApi';

export default function Categories() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3b82f6');

  const { data, isLoading } = useCategories();
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();

  const categories = data?.results || data || [];

  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
    '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6',
    '#a855f7', '#ec4899'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createCategory.mutateAsync({ name, color });
      setIsModalOpen(false);
      setName('');
      setColor('#3b82f6');
    } catch (error) {
      alert('Error creating category');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this category?')) {
      await deleteCategory.mutateAsync(id);
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
        title="Categories" 
        subtitle={`${categories.length} categories`}
        onAddClick={() => setIsModalOpen(true)}
        addButtonText="New Category"
      />

      <main style={{ padding: '32px' }}>
        {categories.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
            {categories.map(category => (
              <div key={category.id} className="card" style={{ padding: '20px', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div 
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      backgroundColor: category.color + '20',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px'
                    }}
                  >
                    🏷️
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontWeight: '600' }}>{category.name}</h3>
                    <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
                      {category.task_count || 0} tasks
                    </p>
                  </div>
                </div>
                <div 
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    backgroundColor: category.color,
                    borderRadius: '0 0 16px 16px'
                  }}
                />
                <button
                  onClick={() => handleDelete(category.id)}
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
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏷️</div>
            <h3 style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px' }}>No categories yet</h3>
            <p style={{ color: '#64748b', marginBottom: '16px' }}>Create categories to organize tasks</p>
            <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
              Create Category
            </button>
          </div>
        )}
      </main>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Category"
      >
        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', marginBottom: '16px' }}>
            <span style={{ fontSize: '14px', fontWeight: '500' }}>Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Category name..."
              className="input"
              style={{ width: '100%', marginTop: '6px', boxSizing: 'border-box' }}
              required
            />
          </label>

          <label style={{ display: 'block', marginBottom: '16px' }}>
            <span style={{ fontSize: '14px', fontWeight: '500' }}>Color</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
              {colors.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: c,
                    border: color === c ? '3px solid #0f172a' : 'none',
                    cursor: 'pointer',
                    transform: color === c ? 'scale(1.1)' : 'scale(1)'
                  }}
                />
              ))}
            </div>
          </label>

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
              Create
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}