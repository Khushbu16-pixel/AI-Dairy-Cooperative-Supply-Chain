import { useApi, fmtNum } from '../utils.js'
import { Loading, ProgressBar } from '../components/UI.jsx'

export default function Processing({ trigger }) {
  const { data, loading } = useApi('/api/processing-plants', trigger)
  if (loading || !data) return <Loading />

  const plants = data.plants || []

  return (
    <div>
      <div className="card">
        <div className="card-header">⚙️ Processing Plants</div>
        <div className="table-wrap">
          <table>
            <thead><tr>
              <th>ID</th><th>Plant Name</th><th>Location</th>
              <th>Capacity / Day</th><th>Utilization</th><th>Products</th>
            </tr></thead>
            <tbody>
              {plants.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: '#57606a' }}>
                    No processing plants registered yet. Click <strong>➕ Record / Add Data</strong> to create one.
                  </td>
                </tr>
              ) : (
                plants.map(p => (
                  <tr key={p.id}>
                    <td><strong>{p.id}</strong></td>
                    <td>{p.name}</td>
                    <td>{p.location}</td>
                    <td>{fmtNum(p.capacity_liters_per_day)} L</td>
                    <td style={{ minWidth: 120 }}>
                      <ProgressBar pct={p.utilization_pct || 0} label={`${p.utilization_pct || 0}%`} />
                    </td>
                    <td>
                      {(p.products || []).map(pr => (
                        <span key={pr} className="badge badge-blue" style={{ margin: '1px 2px' }}>{pr}</span>
                      ))}
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
