import { useState } from 'react'

export default function ClaimsTable({ claims = [] }) {
  const [filter, setFilter] = useState('ALL')

  const filtered = filter === 'ALL'
    ? claims
    : claims.filter(c => c.misinformation_risk === filter)

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontWeight: 600 }}>🔍 Extracted Claims</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
              fontSize: 11, fontWeight: 600,
              background: filter === f ? 'var(--accent)' : 'var(--border)',
              color: filter === f ? '#fff' : 'var(--muted)',
            }}>{f}</button>
          ))}
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Claim', 'Rating', 'Risk', 'Confidence', 'Fact Checker'].map(h => (
                <th key={h} style={{
                  padding: '8px 12px', textAlign: 'left',
                  color: 'var(--muted)', fontWeight: 500, fontSize: 11, whiteSpace: 'nowrap'
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 50).map((c, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}
                onMouseOver={e => e.currentTarget.style.background = '#1f2937'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '10px 12px', maxWidth: 360 }}>
                  <div style={{ fontWeight: 500, marginBottom: 2 }}>{c.claim_text}</div>
                  {c.explanation && (
                    <div style={{ color: 'var(--muted)', fontSize: 11 }}>{c.explanation}</div>
                  )}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <span className={`badge badge-${c.rating?.toLowerCase()}`}>{c.rating}</span>
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <span className={`badge badge-${c.misinformation_risk?.toLowerCase()}`}>
                    {c.misinformation_risk}
                  </span>
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--muted)' }}>
                  {c.confidence != null ? `${(c.confidence * 100).toFixed(0)}%` : '—'}
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--muted)', fontSize: 11 }}>
                  {c.fact_check_publisher
                    ? <a href={c.fact_check_url} target="_blank" rel="noreferrer"
                        style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                        {c.fact_check_publisher}
                      </a>
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>
            No claims match this filter
          </div>
        )}
      </div>
    </div>
  )
}
