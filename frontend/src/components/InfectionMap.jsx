import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

const RISK_COLOR = { HIGH: '#ef4444', MEDIUM: '#f59e0b', LOW: '#10b981' }

export default function InfectionMap({ claims = [] }) {
  const ref = useRef()

  useEffect(() => {
    if (!claims.length) return
    const el = ref.current
    const W = el.clientWidth || 600
    const H = 340

    d3.select(el).selectAll('*').remove()

    const svg = d3.select(el)
      .append('svg')
      .attr('width', W)
      .attr('height', H)

    svg.append('rect')
      .attr('width', W).attr('height', H)
      .attr('fill', '#0a0e1a').attr('rx', 8)

    const nodes = claims.slice(0, 30).map((c, i) => ({
      id: i,
      label: c.claim_text.slice(0, 40) + '…',
      risk: c.misinformation_risk,
      size: Math.max(6, Math.min(24, c.spread_count * 8)),
    }))

    const links = nodes.slice(1).map((n, i) => ({
      source: Math.floor(Math.random() * (i + 1)),
      target: n.id,
    }))

    const sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).distance(80))
      .force('charge', d3.forceManyBody().strength(-120))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collision', d3.forceCollide().radius(d => d.size + 8))

    const link = svg.append('g')
      .selectAll('line').data(links).join('line')
      .attr('stroke', '#1f2937').attr('stroke-width', 1.5)

    const node = svg.append('g')
      .selectAll('circle').data(nodes).join('circle')
      .attr('r', d => d.size)
      .attr('fill', d => RISK_COLOR[d.risk] || '#6b7280')
      .attr('fill-opacity', 0.85)
      .attr('stroke', d => RISK_COLOR[d.risk] || '#6b7280')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.4)
      .call(
        d3.drag()
          .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
          .on('drag',  (e, d) => { d.fx = e.x; d.fy = e.y })
          .on('end',   (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null })
      )

    const tip = d3.select(el).append('div')
      .style('position', 'absolute')
      .style('background', '#111827')
      .style('border', '1px solid #1f2937')
      .style('padding', '8px 12px')
      .style('border-radius', '6px')
      .style('font-size', '12px')
      .style('color', '#f9fafb')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('max-width', '240px')

    node
      .on('mouseover', (e, d) => tip.style('opacity', 1).html(`<b>${d.risk}</b><br/>${d.label}`))
      .on('mousemove', (e) => tip.style('left', (e.offsetX + 12) + 'px').style('top', (e.offsetY - 28) + 'px'))
      .on('mouseout', () => tip.style('opacity', 0))

    sim.on('tick', () => {
      link
        .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y)
      node
        .attr('cx', d => Math.max(d.size, Math.min(W - d.size, d.x)))
        .attr('cy', d => Math.max(d.size, Math.min(H - d.size, d.y)))
    })

    return () => sim.stop()
  }, [claims])

  return (
    <div className="card">
      <div style={{ marginBottom: 12, fontWeight: 600 }}>
        🦠 Infection Map
        <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 12, marginLeft: 8 }}>
          Nodes = claims · Drag to explore
        </span>
      </div>
      <div ref={ref} style={{ position: 'relative', width: '100%', height: 340 }} />
      <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
        {Object.entries(RISK_COLOR).map(([k, c]) => (
          <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--muted)' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: c, display: 'inline-block' }} />
            {k}
          </span>
        ))}
      </div>
    </div>
  )
}
