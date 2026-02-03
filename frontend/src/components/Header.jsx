export default function Header({ title, subtitle, onAddClick, addButtonText }) {
  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 10,
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid #f1f5f9'
    }}>
      <div style={{ padding: '16px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
              {title}
            </h1>
            {subtitle && (
              <p style={{ color: '#64748b', marginTop: '4px', margin: 0 }}>{subtitle}</p>
            )}
          </div>

          {onAddClick && (
            <button onClick={onAddClick} className="btn btn-primary">
              <span>+</span>
              {addButtonText || 'Add New'}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}