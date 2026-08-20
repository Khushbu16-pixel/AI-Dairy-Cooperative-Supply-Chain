import { useApi } from '../utils.js'
import { Loading } from '../components/UI.jsx'

export default function QualityAlerts({ trigger }) {
  const { data, loading } = useApi('/api/ai/quality-alerts', trigger)
  if (loading || !data) return <Loading />

  return (
    <div>
      <div style={{ marginBottom: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <span className="badge badge-blue">Monitoring: {data.monitoring}</span>
        {data.alerts.length > 0
          ? <span className="badge badge-red">{data.alerts.length} Active Alert{data.alerts.length > 1 ? 's' : ''}</span>
          : <span className="badge badge-green">All Clear</span>}
      </div>

      {data.alerts.length === 0 ? (
        <div className="alert-card alert-low">
          <div className="alert-icon">✅</div>
          <div>
            <div className="alert-title">No Active Alerts</div>
            <div className="alert-msg">All collection centers are operating within safe parameters.</div>
          </div>
        </div>
      ) : (
        data.alerts.map((a, i) => (
          <div key={i} className={`alert-card alert-${a.severity.toLowerCase()}`}>
            <div className="alert-icon">{a.severity === 'High' ? '🔴' : '🟡'}</div>
            <div>
              <div className="alert-title">
                {a.center} — {a.alert_type}
                <span className={`badge ${a.severity === 'High' ? 'badge-red' : 'badge-orange'}`}
                  style={{ marginLeft: 8 }}>{a.severity}</span>
              </div>
              <div className="alert-msg">{a.message}</div>
              <div className="alert-action">→ {a.action}</div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
