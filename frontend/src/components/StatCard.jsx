export default function StatCard({ title, value, icon, color = 'blue', subtitle }) {
  const colors = {
    blue: { bg: '#eff6ff', text: '#2563eb' },
    green: { bg: '#f0fdf4', text: '#16a34a' },
    purple: { bg: '#faf5ff', text: '#9333ea' },
    red: { bg: '#fef2f2', text: '#dc2626' },
    orange: { bg: '#fff7ed', text: '#ea580c' },
  };

  const colorStyle = colors[color] || colors.blue;

  return (
    <div className="card" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: '14px', color: '#64748b', fontWeight: '500', margin: 0 }}>
            {title}
          </p>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#0f172a', marginTop: '8px', marginBottom: 0 }}>
            {value}
          </p>
          {subtitle && (
            <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px', margin: 0 }}>
              {subtitle}
            </p>
          )}
        </div>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          backgroundColor: colorStyle.bg,
          color: colorStyle.text
        }}>
          {icon}
        </div>
      </div>
    </div>
  );
}