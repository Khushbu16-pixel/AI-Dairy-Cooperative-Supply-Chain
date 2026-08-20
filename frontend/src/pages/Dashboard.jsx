import { useApi, fmtNum, fmtK } from '../utils.js'
import { Loading, KpiCard } from '../components/UI.jsx'
import {
  LineChart, Line, BarChart, Bar,
  PieChart, Pie, Cell, Tooltip, Legend,
  XAxis, YAxis, CartesianGrid, ResponsiveContainer
} from 'recharts'

const COLORS = ['#1a6db5', '#22c55e', '#f59e0b', '#ef4444']

export default function Dashboard({ trigger }) {
  const { data, loading } = useApi('/api/dashboard', trigger)
  if (loading || !data) return <Loading />

  const k = data.kpis || {}
  const trendLabels = data.production_trend?.labels || []
  const trendValues = data.production_trend?.data || []
  const trendData = trendLabels.map((l, i) => ({
    name: l, value: trendValues[i] || 0
  }))
  const qualLabels = data.quality_dist?.labels || ["Excellent (>95)", "Good (90-95)", "Average (85-90)", "Below (<85)"]
  const qualValues = data.quality_dist?.data || [0, 0, 0, 0]
  const qualData = qualLabels.map((l, i) => ({
    name: l, value: qualValues[i] || 0
  }))

  return (
    <div>
      <div className="kpi-grid">
        <KpiCard icon="👨‍🌾" label="Total Farmers"        value={k.total_farmers}           sub="Active members" />
        <KpiCard icon="🥛" label="Daily Production"      value={fmtNum(k.daily_production_liters)+' L'} sub="Milk collected today" />
        <KpiCard icon="🏭" label="Collection Centers"   value={k.collection_centers}       sub={`Avg storage ${k.storage_utilization_pct}%`} />
        <KpiCard icon="⚙️" label="Processing Plants"    value={k.processing_plants}        sub={`Avg util ${k.avg_plant_utilization_pct}%`} />
        <KpiCard icon="🛒" label="Retail Partners"       value={k.total_retailers}          sub="Across 8 cities" />
        <KpiCard icon="📦" label="Monthly Demand"        value={fmtK(k.monthly_demand_liters)+' L'} sub="Aggregate retail" />
        <KpiCard icon="⭐" label="Avg Milk Quality"      value={k.avg_quality_score+'%'}    sub="FAO Grade A standard" />
        <KpiCard icon="🚚" label="On-Time Delivery"      value={k.on_time_delivery_pct+'%'} sub="Last 30 days" />
        <KpiCard icon="🚨" label="Active AI Alerts"      value={data.alerts_count}          sub="Requires attention" />
      </div>

      <div className="chart-grid">
        <div className="chart-card">
          <div className="section-title">📈 30-Day Milk Production Trend</div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={4} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={v => [fmtNum(v) + ' L', 'Production']} />
              <Line type="monotone" dataKey="value" stroke="#1a6db5" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-card">
          <div className="section-title">🎯 Quality Distribution</div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={qualData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {qualData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <div className="card-header">🔗 Supply Chain Stage Overview</div>
        <div className="table-wrap">
          <table>
            <thead><tr>
              <th>Stage</th><th>Count</th><th>Key Metric</th><th>AI Status</th>
            </tr></thead>
            <tbody>
              <tr><td>🌾 Farm Collection</td><td>{k.total_farmers} farmers</td><td>{fmtNum(k.daily_production_liters)} L/day</td><td><span className="badge badge-green">Monitored</span></td></tr>
              <tr><td>🏭 Collection Centers</td><td>{k.collection_centers} centers</td><td>{k.storage_utilization_pct}% utilization</td><td><span className="badge badge-green">IoT Active</span></td></tr>
              <tr><td>⚙️ Processing Plants</td><td>{k.processing_plants} plants</td><td>{k.avg_plant_utilization_pct}% avg capacity</td><td><span className="badge badge-blue">Optimizing</span></td></tr>
              <tr><td>🚚 Distribution</td><td>4 distributors</td><td>{k.on_time_delivery_pct}% on-time</td><td><span className="badge badge-green">Route AI On</span></td></tr>
              <tr><td>🛒 Retail</td><td>{k.total_retailers} retailers</td><td>{fmtK(k.monthly_demand_liters)} L/mo demand</td><td><span className="badge badge-blue">Forecasting</span></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
