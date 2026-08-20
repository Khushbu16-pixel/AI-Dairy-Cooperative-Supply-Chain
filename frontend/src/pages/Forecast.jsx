import { useApi } from '../utils.js'
import { Loading } from '../components/UI.jsx'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

const COLORS = ['#1a6db5','#22c55e','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316']

export default function Forecast({ trigger }) {
  const { data, loading } = useApi('/api/ai/demand-forecast', trigger)
  if (loading || !data) return <Loading />

  const forecasts = data.forecasts || []
  const top4 = forecasts.slice(0, 4)
  const chartData = (top4.length > 0 && top4[0].days) ? top4[0].days.map((day, di) => {
    const obj = { day }
    top4.forEach(f => { obj[f.retailer.split(' ')[0]] = f.predicted_liters[di] })
    return obj
  }) : []

  return (
    <div>
      <div style={{ marginBottom: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <span className="badge badge-blue">Model: {data.model}</span>
        <span className="badge badge-green">Accuracy: {data.accuracy}</span>
      </div>

      {forecasts.length === 0 ? (
        <div className="card" style={{ padding: '32px', textAlign: 'center', color: '#57606a' }}>
          <h3>🔮 No Retail Demand Data Available</h3>
          <p style={{ marginTop: 8 }}>Register retail partners using <strong>➕ Record / Add Data</strong> to generate automated 7-day demand forecasts.</p>
        </div>
      ) : (
        <>
          <div className="chart-card" style={{ marginBottom: 20 }}>
            <div className="section-title">🔮 7-Day Demand Forecast — Top Retailers</div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                {top4.map((f, i) => (
                  <Line key={f.retailer} type="monotone"
                    dataKey={f.retailer.split(' ')[0]}
                    stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="insight-grid">
            {forecasts.map(f => (
              <div key={f.retailer} className="insight-card">
                <div className="insight-header">
                  <div>
                    <div className="insight-name">{f.retailer}</div>
                    <div className="insight-detail">📍 {f.city}</div>
                  </div>
                  <span className="badge badge-blue">{f.confidence_pct}% conf.</span>
                </div>
                <div className="insight-tip">
                  7-day: {f.predicted_liters.map(v => <strong key={v}>{v.toLocaleString()}L </strong>)}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
