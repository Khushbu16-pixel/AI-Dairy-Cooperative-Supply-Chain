export function Loading() {
  return (
    <div className="loading-wrap">
      <div className="spinner" />
      <p>Loading…</p>
    </div>
  )
}

export function KpiCard({ icon, label, value, sub }) {
  return (
    <div className="kpi-card">
      <div className="kpi-icon">{icon}</div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  )
}

export function ProgressBar({ pct, label }) {
  const cls = pct > 85 ? 'danger' : pct > 70 ? 'warn' : ''
  return (
    <div>
      {label && <div className="progress-label">{label} {pct}%</div>}
      <div className="progress-bg">
        <div className="progress-fill" style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  )
}

export function Badge({ color = 'blue', children }) {
  return <span className={`badge badge-${color}`}>{children}</span>
}

export function TrendBadge({ trend }) {
  if (trend === 'Increasing') return <span className="trend-up">↑ {trend}</span>
  if (trend === 'Declining')  return <span className="trend-down">↓ {trend}</span>
  return <span className="trend-flat">→ {trend}</span>
}
