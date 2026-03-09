import { useState, useEffect, useCallback } from 'react'
import { api } from './api'
import StatCard from './components/StatCard'
import InfectionMap from './components/InfectionMap'
import VelocityChart from './components/VelocityChart'
import ClaimsTable from './components/ClaimsTable'

function useFetch(fn) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    setLoading(true)
    try { setData(await fn()) } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])
  return { data, loading, reload: load }
}

export default function App() {
  const { data: stats,    reload: reloadStats }    = useFetch(api.stats)
  const { data: claims,   reload: reloadClaims }   = useFetch(api.claims)
  const { data: velocity, reload: reloadVelocity } = useFetch(api.velocity)
  const [collecting, setCollecting] = useState(false)
  const [clock, setClock] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const t = setInterval(() => {
      reloadStats(); reloadClaims(); reloadVelocity()
    }, 60000)
    return () => clearInterval(t)
  }, [])

  async function handleCollect() {
    setCollecting(true)
    await api.collect()
    setTimeout(() => {
      reloadStats(); reloadClaims(); reloadVelocity()
      setCollecting(false)
    }, 3000)
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 40 }}>

      {/* Header */}
      <div style={{
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        padding: '0 32px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', height: 56,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>🕵️</span>
          <span style={{ fontWeight: 700, fontSize: 16 }}>Misinfo Tracker</span>
          <span style={{
            background: '#052e16', color: '#10b981',
            fontSize: 10, padding: '2px 8px', borderRadius: 999, fontWeight: 600,
          }}>LIVE</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: 'var(--muted)', fontSize: 12, fontFamily: 'monospace' }}>
            {clock.toUTCString().slice(17, 25)} UTC
          </span>
          <button onClick={handleCollect} disabled={collecting} style={{
            background: collecting ? 'var(--border)' : 'var(--accent)',
            color: '#fff', border: 'none', padding: '6px 16px',
            borderRadius: 6, cursor: collecting ? 'not-allowed' : 'pointer',
            fontSize: 12, fontWeight: 600,
          }}>
            {collecting ? '⏳ Collecting…' : '▶ Run Collection'}
          </button>
        </div>
      </div>

      <div style={{ padding: '28px 32px', maxWidth: 1400, margin: '0 auto' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          <StatCard label="Total Posts"      value={stats?.total_posts}      color="var(--accent)" />
          <StatCard label="Analyzed"         value={stats?.analyzed_posts}   color="var(--success)"
            sub={stats?.total_posts ? `${((stats.analyzed_posts / stats.total_posts) * 100).toFixed(0)}% coverage` : ''} />
          <StatCard label="Claims Extracted" value={stats?.total_claims}     color="var(--warning)" />
          <StatCard label="High Risk Claims" value={stats?.high_risk_claims} color="var(--danger)"
            sub={stats?.high_risk_claims > 0 ? '⚠ Requires attention' : '✓ None detected'} />
        </div>

        {/* Source breakdown */}
        {stats?.source_breakdown && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div style={{ fontWeight: 600, marginBottom: 14 }}>📡 Source Breakdown</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.entries(stats.source_breakdown).map(([src, count]) => {
                const pct = Math.round((count / stats.total_posts) * 100)
                return (
                  <div key={src} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 160, color: 'var(--muted)', fontSize: 12 }}>{src}</div>
                    <div style={{ flex: 1, background: 'var(--border)', borderRadius: 4, height: 8 }}>
                      <div style={{ width: `${pct}%`, background: 'var(--accent)',
                        borderRadius: 4, height: '100%', transition: 'width 0.5s' }} />
                    </div>
                    <div style={{ width: 32, textAlign: 'right', fontSize: 12, color: 'var(--muted)' }}>{count}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Map + Velocity */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          <InfectionMap claims={claims || []} />
          <VelocityChart data={velocity || []} />
        </div>

        {/* Claims table */}
        <ClaimsTable claims={claims || []} />

      </div>
    </div>
  )
}
