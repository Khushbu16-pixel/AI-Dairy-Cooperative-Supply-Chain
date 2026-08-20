import { useApi, fmtNum } from '../utils.js'
import { Loading, KpiCard, Badge } from '../components/UI.jsx'

export default function Farmers({ trigger }) {
  const { data, loading } = useApi('/api/farmers', trigger)
  if (loading || !data) return <Loading />

  const farmers = data.farmers || []
  const totalCows  = farmers.reduce((s, f) => s + (f.cows || 0), 0)
  const totalYield = farmers.reduce((s, f) => s + (f.daily_yield_liters || 0), 0)

  return (
    <div>
      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <KpiCard icon="👨‍🌾" label="Total Farmers"    value={farmers.length}       sub="Active members" />
        <KpiCard icon="🐄" label="Total Cows"         value={fmtNum(totalCows)}   sub="Productive livestock" />
        <KpiCard icon="🥛" label="Total Daily Yield"  value={fmtNum(totalYield)+' L'} sub="Combined production" />
      </div>
      <div className="card">
        <div className="card-header">👨‍🌾 Registered Farmers</div>
        <div className="table-wrap">
          <table>
            <thead><tr>
              <th>ID</th><th>Name</th><th>Village</th><th>Cows</th>
              <th>Daily Yield</th><th>Quality Score</th><th>Coordinates</th>
            </tr></thead>
            <tbody>
              {farmers.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: '#57606a' }}>
                    No farmers registered yet. Click <strong>➕ Record / Add Data</strong> to register your first farmer.
                  </td>
                </tr>
              ) : (
                farmers.map(f => (
                  <tr key={f.id}>
                    <td><strong>{f.id}</strong></td>
                    <td>{f.name}</td>
                    <td>{f.village}</td>
                    <td>{f.cows}</td>
                    <td>{fmtNum(f.daily_yield_liters)} L</td>
                    <td>
                      <Badge color={f.quality_score >= 95 ? 'green' : f.quality_score >= 90 ? 'blue' : 'orange'}>
                        {f.quality_score}
                      </Badge>
                    </td>
                    <td style={{ fontSize: '0.75rem', color: '#57606a' }}>
                      {(f.lat || 0).toFixed(3)}°N, {(f.lng || 0).toFixed(3)}°E
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
