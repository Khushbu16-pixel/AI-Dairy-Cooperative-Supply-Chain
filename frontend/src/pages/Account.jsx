import { useState } from 'react'
import { api, useApi } from '../utils.js'
import { Loading, KpiCard } from '../components/UI.jsx'

export default function Account({ user, onUpdateUser, onOpenDataEntry }) {
  const { data: dashData, loading } = useApi('/api/dashboard')
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState({
    name: user?.name || '',
    organization_name: user?.organization_name || '',
    location: user?.location || '',
    phone: user?.phone || ''
  })
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' })
  const [saving, setSaving] = useState(false)

  const handleProfileSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setStatusMsg({ type: '', text: '' })
    try {
      const res = await api.put('/api/auth/profile', formData)
      if (res.data.user) {
        if (onUpdateUser) onUpdateUser(res.data.user)
        setStatusMsg({ type: 'success', text: 'Profile updated successfully!' })
        setEditMode(false)
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.response?.data?.message || 'Failed to update profile.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading && !dashData) return <Loading />

  const k = dashData?.kpis || {}

  return (
    <div>
      <div className="section-title">👤 My Cooperative Account & Organization Profile</div>

      {statusMsg.text && (
        <div className={statusMsg.type === 'success' ? 'alert-box alert-success' : 'alert-box alert-error'} style={{ marginBottom: 16 }}>
          {statusMsg.type === 'success' ? '✅ ' : '⚠️ '}{statusMsg.text}
        </div>
      )}

      {/* Account Profile Card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>🏢 Organization Profile</span>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => { setEditMode(!editMode); setStatusMsg({ type: '', text: '' }) }}
          >
            {editMode ? 'Cancel' : '✏️ Edit Profile'}
          </button>
        </div>

        {!editMode ? (
          <div className="profile-grid">
            <div className="profile-item">
              <div className="profile-label">Administrator Name</div>
              <div className="profile-val">{user?.name || 'N/A'}</div>
            </div>
            <div className="profile-item">
              <div className="profile-label">Email Address</div>
              <div className="profile-val">{user?.email || 'N/A'}</div>
            </div>
            <div className="profile-item">
              <div className="profile-label">Cooperative / Enterprise</div>
              <div className="profile-val">{user?.organization_name || 'N/A'}</div>
            </div>
            <div className="profile-item">
              <div className="profile-label">Primary Region</div>
              <div className="profile-val">{user?.location || 'N/A'}</div>
            </div>
            <div className="profile-item">
              <div className="profile-label">Contact Phone</div>
              <div className="profile-val">{user?.phone || 'Not specified'}</div>
            </div>
            <div className="profile-item">
              <div className="profile-label">Data Isolation Status</div>
              <div className="profile-val">
                <span className="badge badge-green">🔒 Dedicated Account Isolation Active</span>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleProfileSave} style={{ padding: '16px 0' }}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Cooperative Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.organization_name}
                  onChange={e => setFormData({ ...formData, organization_name: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Location / City</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : '💾 Save Profile Changes'}
            </button>
          </form>
        )}
      </div>

      {/* User's Isolated Dairy Data Overview */}
      <div className="section-title">📊 My Dairy Supply Chain Entities</div>
      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <KpiCard icon="👨‍🌾" label="My Farmers" value={k.total_farmers || 0} sub="Registered members" />
        <KpiCard icon="🥛" label="Daily Production" value={(k.daily_production_liters || 0) + ' L'} sub="Total yield" />
        <KpiCard icon="🏭" label="Collection Centers" value={k.collection_centers || 0} sub={`Storage ${k.storage_utilization_pct || 0}%`} />
        <KpiCard icon="⚙️" label="Processing Plants" value={k.processing_plants || 0} sub={`Avg util ${k.avg_plant_utilization_pct || 0}%`} />
        <KpiCard icon="🚚" label="Distributors" value={dashData?.distributors?.length || 4} sub="Logistics partners" />
        <KpiCard icon="🛒" label="Retail Partners" value={k.total_retailers || 0} sub="Retail network" />
      </div>

      {/* Quick Action Data Entry triggers */}
      <div className="card">
        <div className="card-header">⚡ Quick Operations & Data Entry</div>
        <p style={{ fontSize: '0.85rem', color: '#57606a', marginBottom: 16 }}>
          Add new farmers, record morning/evening milk intake, provision chilling hubs, or dispatch stock to processing plants.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => onOpenDataEntry && onOpenDataEntry('collection')}>
            🥛 Record Milk Intake
          </button>
          <button className="btn btn-secondary" onClick={() => onOpenDataEntry && onOpenDataEntry('farmer')}>
            👨‍🌾 Add Farmer
          </button>
          <button className="btn btn-secondary" onClick={() => onOpenDataEntry && onOpenDataEntry('center')}>
            🏭 Add Collection Center
          </button>
          <button className="btn btn-secondary" onClick={() => onOpenDataEntry && onOpenDataEntry('plant')}>
            ⚙️ Add Processing Plant
          </button>
          <button className="btn btn-secondary" onClick={() => onOpenDataEntry && onOpenDataEntry('transfer')}>
            🔄 Dispatch Milk to Plant
          </button>
        </div>
      </div>
    </div>
  )
}
