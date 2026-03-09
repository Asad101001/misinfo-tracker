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

// ── Ticker content ──────────────────────────────────────────────────────────
function Ticker({ stats }) {
  const items = stats ? [
    `TOTAL POSTS MONITORED: ${stats.total_posts}`,
    `CLAIMS EXTRACTED: ${stats.total_claims}`,
    `HIGH-RISK FLAGS: ${stats.high_risk_claims}`,
    `ANALYSIS COVERAGE: ${stats.total_posts ? Math.round((stats.analyzed_posts / stats.total_posts) * 100) : 0}%`,
    `STATUS: ACTIVE MONITORING`,
    `CLASSIFICATION: OPEN SOURCE INTELLIGENCE`,
    `DISTRIBUTION: UNRESTRICTED`,
  ] : ['AWAITING FEED DATA...']

  const text = items.join('   ◆   ')
  return (
    <div style={{
      background: 'var(--redline)',
      overflow: 'hidden',
      height: 26,
      display: 'flex',
      alignItems: 'center',
      borderBottom: '1px solid #8b1a1a',
      position: 'relative',
    }}>
      <div style={{
        display: 'flex',
        whiteSpace: 'nowrap',
        animation: 'ticker 40s linear infinite',
        fontFamily: 'var(--mono)',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.08em',
        color: '#fff',
      }}>
        {/* duplicate for seamless loop */}
        <span style={{ padding: '0 40px' }}>{text}</span>
        <span style={{ padding: '0 40px' }}>{text}</span>
      </div>
    </div>
  )
}

// ── Masthead ────────────────────────────────────────────────────────────────
function Masthead({ clock, collecting, onCollect }) {
  const [blink, setBlink] = useState(true)
  useEffect(() => {
    const t = setInterval(() => setBlink(b => !b), 800)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{
      background: 'var(--ink)',
      borderBottom: '3px double var(--rule)',
      padding: '0 28px',
    }}>
      {/* Dateline */}
      <div style={{
        borderBottom: '1px solid var(--rule)',
        padding: '6px 0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontFamily: 'var(--mono)',
        fontSize: 10,
        color: 'var(--muted)',
        letterSpacing: '0.1em',
      }}>
        <span>ESTABLISHED 2025 · OPEN SOURCE INTELLIGENCE PROJECT</span>
        <span style={{ fontFamily: 'var(--mono)', letterSpacing: '0.15em' }}>
          {clock.toUTCString().slice(0, 25).toUpperCase()}
          <span style={{ opacity: blink ? 1 : 0, marginLeft: 4 }}>█</span>
        </span>
        <span>VOLUME I · ISSUE {Math.floor(Date.now() / 86400000) - 19000}</span>
      </div>

      {/* Main masthead */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        padding: '10px 0 8px',
        gap: 16,
      }}>
        {/* Left block */}
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', lineHeight: 1.8 }}>
          <div>SOURCES MONITORED: 7</div>
          <div>FEEDS: RSS + REDDIT</div>
          <div>AI: GROQ + MISTRAL</div>
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: 'var(--condensed)',
            fontSize: 42,
            letterSpacing: '0.06em',
            color: 'var(--headline)',
            lineHeight: 1,
            textShadow: '0 0 40px rgba(192,57,43,0.3)',
          }}>MISINFO TRACKER</div>
          <div style={{
            fontFamily: 'var(--display)',
            fontSize: 12,
            color: 'var(--muted)',
            letterSpacing: '0.2em',
            marginTop: 2,
          }}>
            ── MISINFORMATION VELOCITY INTELLIGENCE ──
          </div>
        </div>

        {/* Right block */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
          {/* LIVE stamp */}
          <div style={{
            border: '2px solid var(--redline)',
            padding: '2px 10px',
            fontFamily: 'var(--mono)',
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--redline)',
            letterSpacing: '0.2em',
            animation: 'stamppulse 2s ease-in-out infinite',
          }}>● LIVE</div>

          <button
            onClick={onCollect}
            disabled={collecting}
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.1em',
              background: collecting ? 'transparent' : 'var(--redline)',
              color: collecting ? 'var(--muted)' : '#fff',
              border: `1px solid ${collecting ? 'var(--faded)' : 'var(--redline)'}`,
              padding: '6px 14px',
              cursor: collecting ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              borderRadius: 'var(--radius)',
            }}
          >
            {collecting ? '[ COLLECTING... ]' : '[ RUN COLLECTION ]'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Source Breakdown ─────────────────────────────────────────────────────────
function SourceBreakdown({ stats }) {
  if (!stats?.source_breakdown) return null
  const total = stats.total_posts || 1
  const entries = Object.entries(stats.source_breakdown).sort((a, b) => b[1] - a[1])
  return (
    <div className="card">
      <div style={{
        fontFamily: 'var(--condensed)',
        fontSize: 16,
        letterSpacing: '0.15em',
        color: 'var(--headline)',
        marginBottom: 14,
        paddingBottom: 6,
        borderBottom: '1px solid var(--rule)',
      }}>SOURCE DISPATCH</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 24px' }}>
        {entries.map(([src, count]) => {
          const pct = Math.round((count / total) * 100)
          return (
            <div key={src}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {src.replace(/_/g, ' ')}
                </span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--amber)', fontWeight: 700 }}>
                  {count} · {pct}%
                </span>
              </div>
              <div style={{ height: 4, background: 'var(--faded)', borderRadius: 1, overflow: 'hidden' }}>
                <div style={{
                  width: `${pct}%`,
                  height: '100%',
                  background: src.includes('reddit') ? 'var(--amber)' : 'var(--redline)',
                  transition: 'width 0.8s ease',
                }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const { data: stats,    reload: reloadStats }    = useFetch(api.stats)
  const { data: claims,   reload: reloadClaims }   = useFetch(api.claims)
  const { data: velocity, reload: reloadVelocity } = useFetch(api.velocity)
  const [collecting, setCollecting] = useState(false)
  const [clock, setClock] = useState(new Date())
  const [activeTab, setActiveTab] = useState('dashboard')

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

  const tabs = [
    { id: 'dashboard', label: 'DASHBOARD' },
    { id: 'claims',    label: 'CLAIMS LEDGER' },
    { id: 'network',   label: 'LINK ANALYSIS' },
  ]

  return (
    <div style={{ minHeight: '100vh' }}>
      <Masthead clock={clock} collecting={collecting} onCollect={handleCollect} />
      <Ticker stats={stats} />

      {/* Section nav */}
      <div style={{
        background: 'var(--ink)',
        borderBottom: '1px solid var(--rule)',
        padding: '0 28px',
        display: 'flex',
        gap: 0,
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.12em',
              padding: '10px 20px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--redline)' : '2px solid transparent',
              color: activeTab === tab.id ? 'var(--headline)' : 'var(--muted)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{
          fontFamily: 'var(--mono)',
          fontSize: 10,
          color: 'var(--muted)',
          display: 'flex',
          alignItems: 'center',
          letterSpacing: '0.08em',
        }}>
          {claims ? `${claims.length} CLAIMS ON RECORD` : 'LOADING...'}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '24px 28px', maxWidth: 1440, margin: '0 auto' }}>

        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <>
            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
              <StatCard
                label="DISPATCHES INTERCEPTED"
                value={stats?.total_posts}
                sub="total posts monitored"
                alert={false}
                accent="var(--amber)"
              />
              <StatCard
                label="DISPATCHES ANALYZED"
                value={stats?.analyzed_posts}
                sub={stats?.total_posts ? `${Math.round((stats.analyzed_posts/stats.total_posts)*100)}% processed` : '—'}
                alert={false}
                accent="#4a9d6f"
              />
              <StatCard
                label="CLAIMS EXTRACTED"
                value={stats?.total_claims}
                sub="verifiable statements"
                alert={false}
                accent="var(--amber)"
              />
              <StatCard
                label="HIGH-RISK FLAGS"
                value={stats?.high_risk_claims}
                sub={stats?.high_risk_claims > 0 ? '⚠ REQUIRES REVIEW' : '◆ NONE FLAGGED'}
                alert={stats?.high_risk_claims > 0}
                accent={stats?.high_risk_claims > 0 ? 'var(--redline)' : '#4a9d6f'}
              />
            </div>

            {/* Source breakdown */}
            <div style={{ marginBottom: 16 }}>
              <SourceBreakdown stats={stats} />
            </div>

            {/* Velocity chart */}
            <VelocityChart data={velocity || []} />
          </>
        )}

        {/* CLAIMS LEDGER TAB */}
        {activeTab === 'claims' && (
          <ClaimsTable claims={claims || []} />
        )}

        {/* LINK ANALYSIS TAB */}
        {activeTab === 'network' && (
          <InfectionMap claims={claims || []} />
        )}

      </div>

      {/* Footer */}
      <div style={{
        borderTop: '3px double var(--rule)',
        padding: '10px 28px',
        display: 'flex',
        justifyContent: 'space-between',
        fontFamily: 'var(--mono)',
        fontSize: 9,
        color: 'var(--faded)',
        letterSpacing: '0.1em',
        marginTop: 40,
      }}>
        <span>MISINFO TRACKER · OPEN SOURCE INTELLIGENCE · AI-ASSISTED ANALYSIS</span>
        <span>DATA: GROQ LLAMA-3.3-70B + MISTRAL · FACT-CHECK: GOOGLE FACT CHECK TOOLS</span>
        <span>AUTO-REFRESH: 60s · BUILD: DOCKER + K8S</span>
      </div>
    </div>
  )
}
