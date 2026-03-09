import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'

const RISK_COLOR = { HIGH: '#c0392b', MEDIUM: '#d4a017', LOW: '#2e7d52' }

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div style={{
      background: '#0d0d0b',
      border: '1px solid #2a2820',
      borderLeft: `3px solid ${RISK_COLOR[d?.risk] || '#6b6655'}`,
      padding: '10px 14px',
      fontFamily: "'Courier Prime', monospace",
      fontSize: 11,
      maxWidth: 280,
    }}>
      <div style={{ color: '#e8e4d0', marginBottom: 6, lineHeight: 1.4 }}>{label}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20 }}>
        <span style={{ color: '#6b6655', letterSpacing: '0.08em' }}>SPREAD COUNT</span>
        <span style={{ color: RISK_COLOR[d?.risk] || '#d4a017', fontWeight: 700 }}>{d?.spread}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginTop: 3 }}>
        <span style={{ color: '#6b6655', letterSpacing: '0.08em' }}>RISK LEVEL</span>
        <span style={{ color: RISK_COLOR[d?.risk] || '#d4a017' }}>{d?.risk}</span>
      </div>
      {d?.hours > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginTop: 3 }}>
          <span style={{ color: '#6b6655', letterSpacing: '0.08em' }}>HRS ACTIVE</span>
          <span style={{ color: '#6b6655' }}>{d.hours?.toFixed(1)}h</span>
        </div>
      )}
    </div>
  )
}

// Custom Y-axis tick — truncate and style
const CustomYTick = ({ x, y, payload }) => {
  const text = payload.value
  const truncated = text.length > 38 ? text.slice(0, 38) + '…' : text
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={-6} y={0} dy={4}
        textAnchor="end"
        fill="#6b6655"
        fontFamily="'Courier Prime', monospace"
        fontSize={10}
        letterSpacing="0.04em"
      >
        {truncated}
      </text>
    </g>
  )
}

export default function VelocityChart({ data = [] }) {
  const chartData = data.slice(0, 12).map(d => ({
    name:   d.claim_text.length > 55 ? d.claim_text.slice(0, 55) + '…' : d.claim_text,
    spread: d.spread_count,
    risk:   d.misinformation_risk,
    hours:  d.hours_active,
  }))

  const maxSpread = Math.max(...chartData.map(d => d.spread), 1)

  return (
    <div className="card">
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 18,
        paddingBottom: 12,
        borderBottom: '1px solid var(--rule)',
      }}>
        <div>
          <div style={{
            fontFamily: 'var(--condensed)',
            fontSize: 18,
            letterSpacing: '0.15em',
            color: 'var(--headline)',
          }}>
            CLAIM SPREAD VELOCITY
          </div>
          <div style={{
            fontFamily: 'var(--mono)',
            fontSize: 10,
            color: 'var(--muted)',
            letterSpacing: '0.08em',
            marginTop: 2,
          }}>
            TOP {chartData.length} CLAIMS BY PROPAGATION COUNT
          </div>
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          {Object.entries(RISK_COLOR).map(([k, c]) => (
            <span key={k} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontFamily: 'var(--mono)', fontSize: 9,
              color: 'var(--muted)', letterSpacing: '0.1em',
            }}>
              <span style={{ width: 10, height: 3, background: c, display: 'inline-block' }} />
              {k}
            </span>
          ))}
        </div>
      </div>

      {chartData.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 0',
          fontFamily: 'var(--mono)',
          color: 'var(--faded)',
          fontSize: 11,
          letterSpacing: '0.1em',
        }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>◎</div>
          NO VELOCITY DATA ON RECORD
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={chartData.length * 38 + 40}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 60, bottom: 0, left: 280 }}
            barSize={14}
          >
            <XAxis
              type="number"
              domain={[0, maxSpread + 1]}
              tick={{ fill: '#3d3b30', fontSize: 9, fontFamily: "'Courier Prime', monospace" }}
              tickLine={false}
              axisLine={{ stroke: '#2a2820' }}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={270}
              tick={<CustomYTick />}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
            <ReferenceLine x={maxSpread} stroke="#2a2820" strokeDasharray="3 3" />
            <Bar dataKey="spread" radius={[0, 2, 2, 0]}>
              {chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={RISK_COLOR[entry.risk] || '#6b6655'}
                  fillOpacity={0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* Footer annotation */}
      {chartData.length > 0 && (
        <div style={{
          marginTop: 12,
          paddingTop: 10,
          borderTop: '1px solid var(--rule)',
          fontFamily: 'var(--mono)',
          fontSize: 9,
          color: 'var(--faded)',
          letterSpacing: '0.08em',
        }}>
          SPREAD COUNT = NUMBER OF TIMES CLAIM DETECTED ACROSS MONITORED SOURCES
        </div>
      )}
    </div>
  )
}
