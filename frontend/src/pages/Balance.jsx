import { useApi, fmtNum, fmtK } from '../utils.js'
import { Loading } from '../components/UI.jsx'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

export default function Balance({ trigger }) {
  const { data, loading } = useApi('/api/ai/supply-demand-balance', trigger)
  if (loading || !data) return <Loading />

  const supplyByRegion = data.supply_by_region || {}
  const demandByRegion = data.demand_by_region || {}
  const regions = Object.keys(supplyByRegion)
  const chartData = regions.map(r => ({
    region: r,
    Supply: supplyByRegion[r] || 0,
    Demand: demandByRegion[r] || 0,
  }))
  const isPlus = (data.surplus_deficit_liters || 0) >= 0

  return (
    <div>
      <div className="balance-panel">
        <div className="balance-card">
          <div className="balance-title">Monthly Supply</div>
          <div className="balance-value">{fmtK(data.monthly_supply_liters)}</div>
          <div className="balance-unit">Litres</div>
        </div>
        <div className="balance-card">
          <div className="balance-title">Monthly Demand</div>
          <div className="balance-value">{fmtK(data.monthly_demand_liters)}</div>
          <div className="balance-unit">Litres</div>
        </div>
      </div>

      <div className="rec-box">
        <strong>{isPlus ? '✅ Surplus' : '⚠️ Deficit'}:</strong>{' '}
        {fmtNum(Math.abs(data.surplus_deficit_liters))} L — {data.recommendation}
      </div>

      <div className="chart-card" style={{ marginBottom: 20 }}>
        <div className="section-title">🗺️ Regional Supply vs. Demand (L/month)</div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
            <XAxis dataKey="region" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => fmtK(v)} />
            <Tooltip formatter={v => fmtNum(v) + ' L'} />
            <Legend />
            <Bar dataKey="Supply" fill="#1a6db5" radius={[4,4,0,0]} />
            <Bar dataKey="Demand" fill="#22c55e" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <div className="card-header">📊 Regional Breakdown</div>
        <div className="table-wrap">
          <table>
            <thead><tr>
              <th>Region</th><th>Supply (L)</th><th>Demand (L)</th><th>Balance</th>
            </tr></thead>
            <tbody>
              {regions.map(r => {
                const bal = data.supply_by_region[r] - data.demand_by_region[r]
                return (
                  <tr key={r}>
                    <td>{r}</td>
                    <td>{fmtNum(data.supply_by_region[r])}</td>
                    <td>{fmtNum(data.demand_by_region[r])}</td>
                    <td>
                      <span className={`badge ${bal >= 0 ? 'badge-green' : 'badge-red'}`}>
                        {bal >= 0 ? '+' : ''}{fmtNum(bal)} L
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
