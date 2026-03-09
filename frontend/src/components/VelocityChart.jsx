import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const RISK_COLOR = { HIGH: '#ef4444', MEDIUM: '#f59e0b', LOW: '#10b981' }

export default function VelocityChart({ data = [] }) {
  const chartData = data.slice(0, 15).map(d => ({
    name: d.claim_text.slice(0, 35) + '…',
    spread: d.spread_count,
    risk: d.misinformation_risk,
  }))

  return (
    <div className="card">
      <div style={{ marginBottom: 16, fontWeight: 600 }}>
        📡 Claim Spread Velocity
        <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 12, marginLeft: 8 }}>
          Top claims by spread count
        </span>
      </div>
      {chartData.length === 0
        ? <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 40 }}>No velocity data yet</div>
        : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
              <XAxis type="number" stroke="#374151" tick={{ fill: '#6b7280', fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={220} tick={{ fill: '#9ca3af', fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 6 }}
                labelStyle={{ color: '#f9fafb', fontSize: 12 }}
                cursor={{ fill: '#1f2937' }}
              />
              <Bar dataKey="spread" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={RISK_COLOR[entry.risk] || '#6b7280'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )
      }
    </div>
  )
}
