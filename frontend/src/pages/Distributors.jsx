import { useApi } from '../utils.js'
import { Loading, Badge } from '../components/UI.jsx'

export default function Distributors({ trigger }) {
  const { data, loading } = useApi('/api/distributors', trigger)
  if (loading || !data) return <Loading />

  const distributors = data.distributors || []

  return (
    <div>
      <div className="card">
        <div className="card-header">🚚 Distribution Network</div>
        <div className="table-wrap">
          <table>
            <thead><tr>
              <th>ID</th><th>Name</th><th>Region</th>
              <th>Routes</th><th>Vehicles</th><th>On-Time Delivery</th>
            </tr></thead>
            <tbody>
              {distributors.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: '#57606a' }}>
                    No distributors registered yet. Click <strong>➕ Record / Add Data</strong> to create one.
                  </td>
                </tr>
              ) : (
                distributors.map(d => (
                  <tr key={d.id}>
                    <td><strong>{d.id}</strong></td>
                    <td>{d.name}</td>
                    <td>{d.region}</td>
                    <td>{d.delivery_routes}</td>
                    <td>{d.vehicles}</td>
                    <td>
                      <Badge color={d.on_time_pct >= 95 ? 'green' : d.on_time_pct >= 90 ? 'blue' : 'orange'}>
                        {d.on_time_pct}%
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
