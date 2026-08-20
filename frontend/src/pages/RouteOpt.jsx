import { useApi, fmtNum } from '../utils.js'
import { Loading } from '../components/UI.jsx'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

export default function RouteOpt({ trigger }) {
  const { data, loading } = useApi('/api/ai/route-optimization', trigger)
  if (loading || !data) return <Loading />

  const optimizations = data.optimizations || []
  const chartData = optimizations.map(o => ({
    name: o.distributor.split(' ')[0],
    Current:   o.current_distance_km,
    Optimized: o.optimized_distance_km,
  }))

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <span className="badge badge-blue">Algorithm: {data.algorithm}</span>
      </div>

      {optimizations.length === 0 ? (
        <div className="card" style={{ padding: '32px', textAlign: 'center', color: '#57606a' }}>
          <h3>🗺️ No Distribution Data Available</h3>
          <p style={{ marginTop: 8 }}>Register regional distributors using <strong>➕ Record / Add Data</strong> to calculate 2-Opt TSP route optimizations.</p>
        </div>
      ) : (
        <>
          <div className="chart-card" style={{ marginBottom: 20 }}>
            <div className="section-title">📉 Distance Reduction per Distributor (km)</div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={v => fmtNum(v) + ' km'} />
                <Legend />
                <Bar dataKey="Current"   fill="#94a3b8" radius={[4,4,0,0]} />
                <Bar dataKey="Optimized" fill="#1a6db5" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <div className="card-header">Route Optimization Summary</div>
            <div className="table-wrap">
              <table>
                <thead><tr>
                  <th>Distributor</th><th>Region</th>
                  <th>Current Dist.</th><th>Optimized</th>
                  <th>Cost Saving</th><th>Fuel Saving</th>
                </tr></thead>
                <tbody>
                  {optimizations.map(o => (
                    <tr key={o.distributor}>
                      <td>{o.distributor}</td>
                      <td>{o.region}</td>
                      <td>{fmtNum(o.current_distance_km)} km</td>
                      <td>{fmtNum(o.optimized_distance_km)} km</td>
                      <td><span className="badge badge-green">-{o.cost_saving_pct}%</span></td>
                      <td><span className="badge badge-blue">-{o.fuel_saving_pct}%</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="section-title">💡 AI Recommendations</div>
          {optimizations.map(o => (
            <div key={o.distributor} className="alert-card alert-low">
              <div className="alert-icon">🗺️</div>
              <div>
                <div className="alert-title">{o.distributor} — {o.region}</div>
                <div className="alert-msg">{o.recommendation}</div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
