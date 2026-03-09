export default function StatCard({ label, value, sub, color = 'var(--accent)' }) {
  return (
    <div className="card" style={{ borderTop: `3px solid ${color}` }}>
      <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 700, color }}>{value ?? '—'}</div>
      {sub && <div style={{ color: 'var(--muted)', fontSize: 11, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}
