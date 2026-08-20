import { useApi, fmtNum } from '../utils.js'
import { Loading, ProgressBar } from '../components/UI.jsx'

export default function Retailers({ trigger }) {
  const { data, loading } = useApi('/api/retailers', trigger)
  if (loading || !data) return <Loading />

  const retailers = data.retailers || []

  return (
    <div>
      <div className="card">
        <div className="card-header">🛒 Retail Partners</div>
        <div className="table-wrap">
          <table>
            <thead><tr>
              <th>ID</th><th>Name</th><th>Type</th><th>City</th>
              <th>Monthly Demand</th><th>Current Stock</th><th>Days Coverage</th>
            </tr></thead>
            <tbody>
              {retailers.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: '#57606a' }}>
                    No retail partners registered yet. Click <strong>➕ Record / Add Data</strong> to create one.
                  </td>
                </tr>
              ) : (
                retailers.map(r => {
                  const dayBase = (r.monthly_demand_liters || 1) / 30
                  const dayCov  = Math.min(100, Math.round(((r.current_stock_liters || 0) / dayBase) * 100))
                  return (
                    <tr key={r.id}>
                      <td><strong>{r.id}</strong></td>
                      <td>{r.name}</td>
                      <td>{r.type}</td>
                      <td>{r.city}</td>
                      <td>{fmtNum(r.monthly_demand_liters)} L</td>
                      <td>{fmtNum(r.current_stock_liters)} L</td>
                      <td style={{ minWidth: 120 }}>
                        <ProgressBar pct={dayCov} label={`${dayCov}%`} />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
