import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'

const RISK_COLOR  = { HIGH: '#c0392b', MEDIUM: '#d4a017', LOW: '#2e7d52' }
const RISK_GLOW   = { HIGH: 'rgba(192,57,43,0.5)', MEDIUM: 'rgba(212,160,23,0.4)', LOW: 'rgba(46,125,82,0.3)' }
const SOURCE_SHAPE = {
  reuters_world:    'rect',
  bbc_world:        'rect',
  aljazeera:        'rect',
  reddit_worldnews: 'triangle',
  reddit_politics:  'triangle',
  reddit_conspiracy:'triangle',
  reddit_news:      'triangle',
}

function triangle(size) {
  const r = size
  return `M 0 ${-r} L ${r * 0.866} ${r * 0.5} L ${-r * 0.866} ${r * 0.5} Z`
}

export default function InfectionMap({ claims = [] }) {
  const ref      = useRef()
  const svgRef   = useRef()
  const simRef   = useRef()
  const [selected, setSelected] = useState(null)
  const [counts, setCounts]     = useState({ HIGH: 0, MEDIUM: 0, LOW: 0 })

  useEffect(() => {
    if (!claims.length) return
    const el = ref.current
    const W  = el.clientWidth || 800
    const H  = 480

    // count risks
    const c = { HIGH: 0, MEDIUM: 0, LOW: 0 }
    claims.forEach(cl => { if (c[cl.misinformation_risk] !== undefined) c[cl.misinformation_risk]++ })
    setCounts(c)

    d3.select(el).selectAll('svg').remove()

    const svg = d3.select(el)
      .append('svg')
      .attr('width', W)
      .attr('height', H)
      .style('cursor', 'grab')

    // background grid
    const defs = svg.append('defs')

    const gridPattern = defs.append('pattern')
      .attr('id', 'grid')
      .attr('width', 32)
      .attr('height', 32)
      .attr('patternUnits', 'userSpaceOnUse')
    gridPattern.append('path')
      .attr('d', 'M 32 0 L 0 0 0 32')
      .attr('fill', 'none')
      .attr('stroke', '#1f1d14')
      .attr('stroke-width', 0.5)

    svg.append('rect')
      .attr('width', W).attr('height', H)
      .attr('fill', '#0d0d0b')

    svg.append('rect')
      .attr('width', W).attr('height', H)
      .attr('fill', 'url(#grid)')

    // glow filter
    const filter = defs.append('filter').attr('id', 'glow')
    filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur')
    const feMerge = filter.append('feMerge')
    feMerge.append('feMergeNode').attr('in', 'coloredBlur')
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic')

    const g = svg.append('g')

    // zoom
    svg.call(
      d3.zoom()
        .scaleExtent([0.3, 3])
        .on('zoom', e => {
          g.attr('transform', e.transform)
          svg.style('cursor', 'grabbing')
        })
    ).on('dblclick.zoom', null)
    svg.on('mouseup', () => svg.style('cursor', 'grab'))

    const nodes = claims.slice(0, 40).map((c, i) => ({
      id:    i,
      claim: c,
      label: c.claim_text.length > 50 ? c.claim_text.slice(0, 50) + '…' : c.claim_text,
      risk:  c.misinformation_risk || 'LOW',
      source: (c.post_id || '').includes('reddit') ? 'reddit' : 'news',
      size:  c.misinformation_risk === 'HIGH' ? 14
           : c.misinformation_risk === 'MEDIUM' ? 10 : 7,
      spread: c.spread_count || 1,
    }))

    // cluster by risk: HIGH center, MEDIUM ring, LOW outer
    const riskCenter = {
      HIGH:   { x: W / 2,       y: H / 2 },
      MEDIUM: { x: W / 2,       y: H / 2 },
      LOW:    { x: W / 2,       y: H / 2 },
    }

    const links = []
    // connect HIGH nodes to each other
    const highNodes = nodes.filter(n => n.risk === 'HIGH')
    highNodes.forEach((n, i) => {
      if (i > 0) links.push({ source: highNodes[0].id, target: n.id, strength: 0.4 })
    })
    // connect MEDIUM to nearest HIGH
    nodes.filter(n => n.risk === 'MEDIUM').forEach(n => {
      if (highNodes.length > 0) {
        links.push({ source: highNodes[Math.floor(Math.random() * highNodes.length)].id, target: n.id, strength: 0.15 })
      }
    })
    // some LOW to MEDIUM
    const medNodes = nodes.filter(n => n.risk === 'MEDIUM')
    nodes.filter(n => n.risk === 'LOW').slice(0, 6).forEach(n => {
      if (medNodes.length > 0) {
        links.push({ source: medNodes[Math.floor(Math.random() * medNodes.length)].id, target: n.id, strength: 0.08 })
      }
    })

    const sim = d3.forceSimulation(nodes)
      .force('link',      d3.forceLink(links).id(d => d.id).distance(d => d.strength > 0.3 ? 60 : 100).strength(d => d.strength))
      .force('charge',    d3.forceManyBody().strength(d => d.risk === 'HIGH' ? -180 : d.risk === 'MEDIUM' ? -100 : -60))
      .force('center',    d3.forceCenter(W / 2, H / 2))
      .force('collision', d3.forceCollide().radius(d => d.size + 10))
      .force('cluster_x', d3.forceX(d => {
        if (d.risk === 'HIGH')   return W * 0.5
        if (d.risk === 'MEDIUM') return W * 0.5
        return Math.random() > 0.5 ? W * 0.25 : W * 0.75
      }).strength(0.12))
      .force('cluster_y', d3.forceY(d => {
        if (d.risk === 'HIGH')   return H * 0.5
        if (d.risk === 'MEDIUM') return H * 0.5
        return Math.random() > 0.5 ? H * 0.25 : H * 0.75
      }).strength(0.12))

    simRef.current = sim

    // draw links
    const link = g.append('g').selectAll('line').data(links).join('line')
      .attr('stroke', d => {
        const src = nodes[d.source?.id ?? d.source]
        if (!src) return '#2a2820'
        return src.risk === 'HIGH' ? 'rgba(192,57,43,0.35)' : 'rgba(42,40,32,0.8)'
      })
      .attr('stroke-width', d => d.strength > 0.3 ? 1.5 : 0.75)
      .attr('stroke-dasharray', d => d.strength > 0.3 ? 'none' : '3,3')

    // draw nodes
    const node = g.append('g').selectAll('g').data(nodes).join('g')
      .style('cursor', 'pointer')
      .call(
        d3.drag()
          .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
          .on('drag',  (e, d) => { d.fx = e.x; d.fy = e.y })
          .on('end',   (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null })
      )
      .on('click', (e, d) => { e.stopPropagation(); setSelected(d.claim) })

    // outer glow ring for HIGH
    node.filter(d => d.risk === 'HIGH')
      .append('circle')
      .attr('r', d => d.size + 8)
      .attr('fill', 'none')
      .attr('stroke', d => RISK_COLOR[d.risk])
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.3)
      .attr('filter', 'url(#glow)')

    // main shape
    node.append('circle')
      .attr('r', d => d.size)
      .attr('fill', d => RISK_COLOR[d.risk])
      .attr('fill-opacity', d => d.risk === 'HIGH' ? 0.9 : 0.75)
      .attr('stroke', d => RISK_COLOR[d.risk])
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.6)

    // risk letter inside
    node.append('text')
      .text(d => d.risk[0])
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-family', "'Courier Prime', monospace")
      .attr('font-size', d => d.size * 0.9)
      .attr('font-weight', 700)
      .attr('fill', '#fff')
      .attr('fill-opacity', 0.9)
      .attr('pointer-events', 'none')

    // label for large nodes
    node.filter(d => d.size >= 12)
      .append('text')
      .text(d => d.label.slice(0, 30) + (d.label.length > 30 ? '…' : ''))
      .attr('text-anchor', 'middle')
      .attr('y', d => d.size + 14)
      .attr('font-family', "'Courier Prime', monospace")
      .attr('font-size', 9)
      .attr('fill', '#c0392b')
      .attr('fill-opacity', 0.9)
      .attr('pointer-events', 'none')

    svg.on('click', () => setSelected(null))

    sim.on('tick', () => {
      link
        .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y)
      node.attr('transform', d =>
        `translate(${Math.max(d.size + 4, Math.min(W - d.size - 4, d.x))},${Math.max(d.size + 4, Math.min(H - d.size - 4, d.y))})`
      )
    })

    svgRef.current = svg
    return () => sim.stop()
  }, [claims])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 12, alignItems: 'start' }}>
      {/* Main diagram */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--rule)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--ink)',
        }}>
          <div style={{ fontFamily: 'var(--condensed)', fontSize: 16, letterSpacing: '0.15em', color: 'var(--headline)' }}>
            CLAIM LINK ANALYSIS
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            {Object.entries(RISK_COLOR).map(([k, c]) => (
              <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', letterSpacing: '0.1em' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'inline-block' }} />
                {k} ({counts[k] || 0})
              </span>
            ))}
          </div>
        </div>
        <div
          ref={ref}
          style={{ width: '100%', height: 480, background: '#0d0d0b', position: 'relative' }}
        />
        <div style={{
          padding: '6px 14px',
          borderTop: '1px solid var(--rule)',
          fontFamily: 'var(--mono)',
          fontSize: 9,
          color: 'var(--faded)',
          letterSpacing: '0.1em',
          background: 'var(--ink)',
        }}>
          SCROLL TO ZOOM · DRAG NODES · CLICK NODE FOR DETAIL · DOUBLE-CLICK TO RESET
        </div>
      </div>

      {/* Detail panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Legend */}
        <div className="card">
          <div style={{ fontFamily: 'var(--condensed)', fontSize: 14, letterSpacing: '0.15em', color: 'var(--headline)', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid var(--rule)' }}>
            DIAGRAM KEY
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>
            <div>
              <div style={{ color: 'var(--headline)', marginBottom: 4, fontSize: 9, letterSpacing: '0.1em' }}>NODE SIZE</div>
              <div>● Large = HIGH risk (14px)</div>
              <div>● Medium = MEDIUM risk (10px)</div>
              <div>● Small = LOW risk (7px)</div>
            </div>
            <div>
              <div style={{ color: 'var(--headline)', marginBottom: 4, fontSize: 9, letterSpacing: '0.1em' }}>CONNECTIONS</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 24, height: 1.5, background: '#c0392b', opacity: 0.8 }} />
                <span>HIGH–HIGH links</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <div style={{ width: 24, height: 1, background: 'var(--faded)', borderTop: '1px dashed var(--faded)' }} />
                <span>Cross-risk links</span>
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--headline)', marginBottom: 4, fontSize: 9, letterSpacing: '0.1em' }}>CLUSTERING</div>
              <div>HIGH-risk claims gravitate to center. Low-risk claims disperse to edges.</div>
            </div>
          </div>
        </div>

        {/* Selected claim detail */}
        <div className="card" style={{ borderTop: selected ? '2px solid var(--redline)' : '2px solid var(--rule)', minHeight: 180 }}>
          <div style={{ fontFamily: 'var(--condensed)', fontSize: 14, letterSpacing: '0.15em', color: 'var(--headline)', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid var(--rule)' }}>
            {selected ? 'CLAIM DETAIL' : 'SELECT A NODE'}
          </div>
          {selected ? (
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, lineHeight: 1.8, color: 'var(--text)' }}>
              <div style={{ marginBottom: 8, color: 'var(--muted)', fontSize: 9, letterSpacing: '0.1em' }}>CLAIM TEXT</div>
              <div style={{ marginBottom: 10, lineHeight: 1.6 }}>{selected.claim_text}</div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
                <div>
                  <div style={{ color: 'var(--muted)', fontSize: 9, letterSpacing: '0.08em', marginBottom: 2 }}>RATING</div>
                  <span className={`badge badge-${selected.rating?.toLowerCase()}`}>{selected.rating}</span>
                </div>
                <div>
                  <div style={{ color: 'var(--muted)', fontSize: 9, letterSpacing: '0.08em', marginBottom: 2 }}>RISK</div>
                  <span className={`badge badge-${selected.misinformation_risk?.toLowerCase()}`}>{selected.misinformation_risk}</span>
                </div>
              </div>

              {selected.confidence != null && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ color: 'var(--muted)', fontSize: 9, letterSpacing: '0.08em', marginBottom: 4 }}>CONFIDENCE</div>
                  <div style={{ height: 4, background: 'var(--faded)', borderRadius: 1 }}>
                    <div style={{ width: `${selected.confidence * 100}%`, height: '100%', background: 'var(--amber)', borderRadius: 1 }} />
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 9, color: 'var(--amber)', marginTop: 2 }}>{Math.round(selected.confidence * 100)}%</div>
                </div>
              )}

              {selected.explanation && (
                <div>
                  <div style={{ color: 'var(--muted)', fontSize: 9, letterSpacing: '0.08em', marginBottom: 2 }}>ANALYSIS</div>
                  <div style={{ color: 'var(--muted)', fontStyle: 'italic' }}>{selected.explanation}</div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--faded)', textAlign: 'center', paddingTop: 30, lineHeight: 2 }}>
              <div style={{ fontSize: 20, marginBottom: 8 }}>◎</div>
              <div>Click any node in the diagram<br />to inspect claim details here.</div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="card">
          <div style={{ fontFamily: 'var(--condensed)', fontSize: 14, letterSpacing: '0.15em', color: 'var(--headline)', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid var(--rule)' }}>
            NETWORK STATS
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Nodes rendered</span>
              <span style={{ color: 'var(--text)' }}>{Math.min(claims.length, 40)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>High-risk nodes</span>
              <span style={{ color: '#c0392b' }}>{counts.HIGH}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Medium-risk nodes</span>
              <span style={{ color: '#d4a017' }}>{counts.MEDIUM}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Low-risk nodes</span>
              <span style={{ color: '#2e7d52' }}>{counts.LOW}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
