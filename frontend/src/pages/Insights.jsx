import { useApi, fmtNum } from '../utils.js'
import { Loading, KpiCard, TrendBadge } from '../components/UI.jsx'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

export default function Insights({ trigger }) {
  const { data, loading } = useApi('/api/ai/production-insights', trigger)
  if (loading || !data) return <Loading />

  const insights = data.insights || []
  const trendCounts = {
    Increasing: insights.filter(i => i.trend === 'Increasing').length,
    Stable:     insights.filter(i => i.trend === 'Stable').length,
    Declining:  insights.filter(i => i.trend === 'Declining').length,
  }
  const chartData = insights.map(f => ({
    name: f.name.split(' ')[0], score: f.quality_score
  }))

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <span className="badge badge-blue">Model: {data.model}</span>
      </div>
      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <KpiCard icon="↑" label="Increasing Yield" value={trendCounts.Increasing} sub="Farmers" />
        <KpiCard icon="→" label="Stable Yield"     value={trendCounts.Stable}     sub="Farmers" />
        <KpiCard icon="↓" label="Declining Yield"  value={trendCounts.Declining}  sub="Needs attention" />
      </div>

      {insights.length === 0 ? (
        <div className="card" style={{ padding: '32px', textAlign: 'center', color: '#57606a' }}>
          <h3>💡 No Production Records Available</h3>
          <p style={{ marginTop: 8 }}>Register member farmers and record daily milk collections to view automated yield and quality regression trends.</p>
        </div>
      ) : (
        <>
          <div className="chart-card" style={{ marginBottom: 20 }}>
            <div className="section-title">📊 Quality Score per Farmer</div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[80, 100]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={v => [v + '%', 'Quality Score']} />
                <Bar dataKey="score" fill="#1a6db5" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="section-title">💡 Individual AI Recommendations</div>
          <div className="insight-grid">
            {insights.map(f => (
              <div key={f.farmer_id} className="insight-card">
                <div className="insight-header">
                  <div>
                    <div className="insight-name">{f.name} <span style={{ fontWeight: 400, color: '#57606a' }}>({f.farmer_id})</span></div>
                    <div className="insight-detail">📍 {f.village} · Quality: {f.quality_score}</div>
                  </div>
                  <TrendBadge trend={f.trend} />
                </div>
                <div className="insight-detail">Daily yield: <strong>{fmtNum(f.daily_yield)} L</strong></div>
                <div className="insight-tip">💡 {f.suggestion}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
