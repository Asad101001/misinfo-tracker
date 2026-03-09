import { useState, useMemo } from 'react'

const RISK_COLOR = { HIGH: '#c0392b', MEDIUM: '#d4a017', LOW: '#2e7d52' }

function RedactedBar({ confidence }) {
  if (confidence == null) return <span style={{ color: 'var(--faded)' }}>—</span>
  const pct = Math.round(confidence * 100)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 60, height: 4, background: 'var(--faded)', borderRadius: 1 }}>
        <div style={{
          width: `${pct}%`, height: '100%', borderRadius: 1,
          background: pct > 70 ? '#2e7d52' : pct > 40 ? '#d4a017' : '#c0392b',
        }} />
      </div>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>{pct}%</span>
    </div>
  )
}

export default function ClaimsTable({ claims = [] }) {
  const [riskFilter,   setRiskFilter]   = useState('ALL')
  const [ratingFilter, setRatingFilter] = useState('ALL')
  const [search,       setSearch]       = useState('')
  const [sortBy,       setSortBy]       = useState('confidence')
  const [sortDir,      setSortDir]      = useState('desc')
  const [expanded,     setExpanded]     = useState(null)
  const [page,         setPage]         = useState(0)
  const PAGE_SIZE = 20

  const ratings = useMemo(() => {
    const s = new Set(claims.map(c => c.rating).filter(Boolean))
    return ['ALL', ...Array.from(s)]
  }, [claims])

  const filtered = useMemo(() => {
    let out = claims
    if (riskFilter !== 'ALL')   out = out.filter(c => c.misinformation_risk === riskFilter)
    if (ratingFilter !== 'ALL') out = out.filter(c => c.rating === ratingFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      out = out.filter(c => c.claim_text?.toLowerCase().includes(q) || c.explanation?.toLowerCase().includes(q))
    }
    out = [...out].sort((a, b) => {
      let av = a[sortBy] ?? 0
      let bv = b[sortBy] ?? 0
      if (typeof av === 'string') av = av.toLowerCase()
      if (typeof bv === 'string') bv = bv.toLowerCase()
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return out
  }, [claims, riskFilter, ratingFilter, search, sortBy, sortDir])

  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  function toggleSort(col) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('desc') }
    setPage(0)
  }

  const riskCounts = useMemo(() => ({
    ALL: claims.length,
    HIGH:   claims.filter(c => c.misinformation_risk === 'HIGH').length,
    MEDIUM: claims.filter(c => c.misinformation_risk === 'MEDIUM').length,
    LOW:    claims.filter(c => c.misinformation_risk === 'LOW').length,
  }), [claims])

  const SortArrow = ({ col }) => {
    if (sortBy !== col) return <span style={{ color: 'var(--faded)', marginLeft: 3 }}>⇅</span>
    return <span style={{ color: 'var(--amber)', marginLeft: 3 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <div className="card" style={{ padding: 0 }}>
      {/* Ledger header */}
      <div style={{
        background: 'var(--ink)',
        padding: '14px 18px',
        borderBottom: '1px solid var(--rule)',
      }}>
        <div style={{
          fontFamily: 'var(--condensed)',
          fontSize: 20,
          letterSpacing: '0.15em',
          color: 'var(--headline)',
          marginBottom: 12,
        }}>
          CLAIMS INTELLIGENCE LEDGER
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', marginLeft: 12, fontWeight: 400, letterSpacing: '0.08em' }}>
            {filtered.length} of {claims.length} records
          </span>
        </div>

        {/* Filters row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          {/* Risk pills */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', letterSpacing: '0.1em', marginRight: 4 }}>RISK:</span>
            {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map(f => (
              <button key={f} onClick={() => { setRiskFilter(f); setPage(0) }} style={{
                fontFamily: 'var(--mono)',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.12em',
                padding: '3px 10px',
                borderRadius: 1,
                border: `1px solid ${riskFilter === f ? (RISK_COLOR[f] || 'var(--amber)') : 'var(--faded)'}`,
                background: riskFilter === f ? 'rgba(192,57,43,0.12)' : 'transparent',
                color: riskFilter === f ? (RISK_COLOR[f] || 'var(--amber)') : 'var(--muted)',
                cursor: 'pointer',
              }}>
                {f} {riskCounts[f] != null ? `(${riskCounts[f]})` : ''}
              </button>
            ))}
          </div>

          {/* Rating filter */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', letterSpacing: '0.1em', marginRight: 4 }}>VERDICT:</span>
            <select
              value={ratingFilter}
              onChange={e => { setRatingFilter(e.target.value); setPage(0) }}
              style={{
                background: 'var(--aged)',
                color: 'var(--text)',
                border: '1px solid var(--rule)',
                fontFamily: 'var(--mono)',
                fontSize: 10,
                padding: '3px 8px',
                cursor: 'pointer',
                outline: 'none',
                borderRadius: 1,
              }}
            >
              {ratings.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* Search */}
          <div style={{ flex: 1, minWidth: 180 }}>
            <input
              type="text"
              placeholder="SEARCH CLAIMS..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0) }}
              style={{
                width: '100%',
                background: 'var(--aged)',
                border: '1px solid var(--rule)',
                borderRadius: 1,
                padding: '4px 10px',
                fontFamily: 'var(--mono)',
                fontSize: 10,
                color: 'var(--text)',
                letterSpacing: '0.08em',
                outline: 'none',
              }}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--ink)', borderBottom: '1px solid var(--rule)' }}>
              {[
                { label: '#',             col: 'id',                   w: 40  },
                { label: 'CLAIM TEXT',    col: 'claim_text',           w: null },
                { label: 'VERDICT',       col: 'rating',               w: 110 },
                { label: 'RISK',          col: 'misinformation_risk',  w: 90  },
                { label: 'CONFIDENCE',    col: 'confidence',           w: 100 },
                { label: 'SPREAD',        col: 'spread_count',         w: 70  },
                { label: 'FACT-CHECKER',  col: null,                   w: 120 },
              ].map(h => (
                <th
                  key={h.label}
                  onClick={h.col ? () => toggleSort(h.col) : undefined}
                  style={{
                    padding: '9px 14px',
                    textAlign: 'left',
                    fontFamily: 'var(--mono)',
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    color: sortBy === h.col ? 'var(--amber)' : 'var(--muted)',
                    width: h.w || undefined,
                    cursor: h.col ? 'pointer' : 'default',
                    whiteSpace: 'nowrap',
                    userSelect: 'none',
                    borderRight: '1px solid var(--rule)',
                  }}
                >
                  {h.label}
                  {h.col && <SortArrow col={h.col} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((c, i) => {
              const rowNum = page * PAGE_SIZE + i + 1
              const isExpanded = expanded === c.id
              const riskCol = RISK_COLOR[c.misinformation_risk] || 'var(--muted)'
              return (
                <>
                  <tr
                    key={c.id}
                    onClick={() => setExpanded(isExpanded ? null : c.id)}
                    style={{
                      borderBottom: '1px solid var(--rule)',
                      cursor: 'pointer',
                      background: isExpanded ? 'rgba(192,57,43,0.04)' : 'transparent',
                      borderLeft: isExpanded ? `3px solid ${riskCol}` : '3px solid transparent',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                    onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = 'transparent' }}
                  >
                    {/* Row # */}
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--faded)', borderRight: '1px solid var(--rule)', textAlign: 'right' }}>
                      {String(rowNum).padStart(3, '0')}
                    </td>

                    {/* Claim text */}
                    <td style={{ padding: '10px 14px', borderRight: '1px solid var(--rule)' }}>
                      <div style={{
                        fontFamily: 'var(--mono)',
                        fontSize: 11,
                        color: 'var(--text)',
                        lineHeight: 1.5,
                        maxWidth: 480,
                      }}>
                        {isExpanded ? c.claim_text : (c.claim_text?.length > 100 ? c.claim_text.slice(0, 100) + '…' : c.claim_text)}
                      </div>
                    </td>

                    {/* Rating */}
                    <td style={{ padding: '10px 14px', borderRight: '1px solid var(--rule)' }}>
                      <span className={`badge badge-${c.rating?.toLowerCase()}`}>{c.rating}</span>
                    </td>

                    {/* Risk */}
                    <td style={{ padding: '10px 14px', borderRight: '1px solid var(--rule)' }}>
                      <span className={`badge badge-${c.misinformation_risk?.toLowerCase()}`}>
                        {c.misinformation_risk}
                      </span>
                    </td>

                    {/* Confidence */}
                    <td style={{ padding: '10px 14px', borderRight: '1px solid var(--rule)' }}>
                      <RedactedBar confidence={c.confidence} />
                    </td>

                    {/* Spread */}
                    <td style={{ padding: '10px 14px', borderRight: '1px solid var(--rule)', textAlign: 'center' }}>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: c.spread_count > 1 ? 'var(--amber)' : 'var(--muted)' }}>
                        {c.spread_count ?? 1}
                      </span>
                    </td>

                    {/* Fact-checker */}
                    <td style={{ padding: '10px 14px' }}>
                      {c.fact_check_publisher
                        ? <a href={c.fact_check_url} target="_blank" rel="noreferrer"
                            onClick={e => e.stopPropagation()}
                            style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--amber)', textDecoration: 'none', letterSpacing: '0.04em' }}>
                            {c.fact_check_publisher}
                          </a>
                        : <span style={{ color: 'var(--faded)', fontFamily: 'var(--mono)', fontSize: 10 }}>UNVERIFIED</span>
                      }
                    </td>
                  </tr>

                  {/* Expanded explanation row */}
                  {isExpanded && (
                    <tr key={`${c.id}-exp`} style={{ borderBottom: '1px solid var(--rule)', background: 'rgba(192,57,43,0.03)' }}>
                      <td />
                      <td colSpan={6} style={{ padding: '10px 14px 16px' }}>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', lineHeight: 1.8 }}>
                          <span style={{ color: 'var(--amber)', letterSpacing: '0.1em', fontSize: 9 }}>ANALYSIS: </span>
                          {c.explanation || 'No analysis available.'}
                        </div>
                        {c.fact_check_verdict && (
                          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', marginTop: 6, lineHeight: 1.8 }}>
                            <span style={{ color: 'var(--amber)', letterSpacing: '0.1em', fontSize: 9 }}>FACT-CHECK VERDICT: </span>
                            {c.fact_check_verdict}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '50px 0',
            fontFamily: 'var(--mono)',
            color: 'var(--faded)',
            fontSize: 11,
            letterSpacing: '0.1em',
          }}>
            <div style={{ fontSize: 20, marginBottom: 8 }}>◎</div>
            NO RECORDS MATCH THIS FILTER
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 18px',
          borderTop: '1px solid var(--rule)',
          background: 'var(--ink)',
          fontFamily: 'var(--mono)',
          fontSize: 10,
        }}>
          <span style={{ color: 'var(--muted)', letterSpacing: '0.08em' }}>
            PAGE {page + 1} OF {totalPages} · RECORDS {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              style={{
                fontFamily: 'var(--mono)', fontSize: 10, padding: '4px 12px',
                background: 'transparent', border: '1px solid var(--rule)',
                color: page === 0 ? 'var(--faded)' : 'var(--text)',
                cursor: page === 0 ? 'not-allowed' : 'pointer', letterSpacing: '0.08em',
              }}
            >← PREV</button>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
              style={{
                fontFamily: 'var(--mono)', fontSize: 10, padding: '4px 12px',
                background: page < totalPages - 1 ? 'var(--redline)' : 'transparent',
                border: `1px solid ${page < totalPages - 1 ? 'var(--redline)' : 'var(--rule)'}`,
                color: page >= totalPages - 1 ? 'var(--faded)' : '#fff',
                cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', letterSpacing: '0.08em',
              }}
            >NEXT →</button>
          </div>
        </div>
      )}
    </div>
  )
}
