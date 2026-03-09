export default function StatCard({ label, value, sub, alert = false, accent = 'var(--amber)' }) {
  return (
    <div className="card" style={{
      borderTop: `2px solid ${accent}`,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Corner classification mark */}
      <div style={{
        position: 'absolute',
        top: 8, right: 10,
        fontFamily: 'var(--mono)',
        fontSize: 8,
        color: 'var(--faded)',
        letterSpacing: '0.1em',
      }}>◆ INTEL</div>

      <div style={{
        fontFamily: 'var(--mono)',
        fontSize: 9,
        letterSpacing: '0.18em',
        color: 'var(--muted)',
        textTransform: 'uppercase',
        marginBottom: 8,
      }}>{label}</div>

      <div style={{
        fontFamily: 'var(--condensed)',
        fontSize: 48,
        lineHeight: 1,
        color: value != null ? accent : 'var(--faded)',
        letterSpacing: '0.04em',
        marginBottom: 6,
      }}>
        {value ?? '—'}
      </div>

      {sub && (
        <div style={{
          fontFamily: 'var(--mono)',
          fontSize: 10,
          color: alert ? accent : 'var(--muted)',
          letterSpacing: '0.06em',
          paddingTop: 6,
          borderTop: '1px solid var(--rule)',
        }}>{sub}</div>
      )}

      {/* Scan line effect on alert */}
      {alert && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: '2px',
          background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
          animation: 'stamppulse 1.5s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
      )}
    </div>
  )
}
