import { useApi, fmtNum } from '../utils.js'
import { Loading, ProgressBar, Badge } from '../components/UI.jsx'

export default function Collection({ trigger }) {
  const { data, loading } = useApi('/api/collection-centers', trigger)
  if (loading || !data) return <Loading />

  const centers = data.centers || []

  return (
    <div>
      <div className="card">
        <div className="card-header">🏭 Collection Center Status</div>
        <div className="table-wrap">
          <table>
            <thead><tr>
              <th>ID</th><th>Name</th><th>Location</th>
              <th>Capacity</th><th>Current Stock</th><th>Utilization</th>
              <th>Temperature</th><th>Status</th>
            </tr></thead>
            <tbody>
              {centers.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: '#57606a' }}>
                    No collection centers registered yet. Click <strong>➕ Record / Add Data</strong> to create one.
                  </td>
                </tr>
              ) : (
                centers.map(c => (
                  <tr key={c.id}>
                    <td><strong>{c.id}</strong></td>
                    <td>{c.name}</td>
                    <td>{c.location}</td>
                    <td>{fmtNum(c.capacity_liters)} L</td>
                    <td>{fmtNum(c.current_stock)} L</td>
                    <td style={{ minWidth: 120 }}>
                      <ProgressBar pct={c.utilization_pct || 0} label={`${c.utilization_pct || 0}%`} />
                    </td>
                    <td>{c.temp_celsius}°C</td>
                    <td>
                      <Badge color={c.status === 'Critical' ? 'red' : c.status === 'Warning' ? 'orange' : 'green'}>
                        {c.status}
                      </Badge>
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
