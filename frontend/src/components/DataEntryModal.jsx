import { useState, useEffect } from 'react'
import { api } from '../utils.js'

export default function DataEntryModal({ isOpen, onClose, initialTab = 'collection', onSuccess }) {
  const [activeTab, setActiveTab] = useState(initialTab)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  // Existing entity lists for dropdowns
  const [farmersList, setFarmersList] = useState([])
  const [centersList, setCentersList] = useState([])
  const [plantsList, setPlantsList] = useState([])

  // Form states
  const [farmerForm, setFarmerForm] = useState({
    name: '', village: '', cows: 10, daily_yield_liters: 150, quality_score: 93, lat: 22.5, lng: 73.0
  })

  const [collectionForm, setCollectionForm] = useState({
    farmer_id: '', center_id: '', quantity_liters: 120, fat_pct: 4.2, snf_pct: 8.5, quality_score: 92
  })

  const [centerForm, setCenterForm] = useState({
    name: '', location: '', capacity_liters: 5000, current_stock: 0, temp_celsius: 3.8
  })

  const [plantForm, setPlantForm] = useState({
    name: '', location: '', capacity_liters_per_day: 100000, utilization_pct: 75, products: 'Milk, Butter, Cheese'
  })

  const [distributorForm, setDistributorForm] = useState({
    name: '', region: 'North India', delivery_routes: 12, vehicles: 6, on_time_pct: 94
  })

  const [retailerForm, setRetailerForm] = useState({
    name: '', type: 'Supermarket', city: 'Delhi', monthly_demand_liters: 25000, current_stock_liters: 2000
  })

  const [transferForm, setTransferForm] = useState({
    center_id: '', plant_id: '', quantity_liters: 500
  })

  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab])

  useEffect(() => {
    if (isOpen) {
      setMessage({ type: '', text: '' })
      // Load dropdown data
      api.get('/api/farmers').then(r => setFarmersList(r.data.farmers || [])).catch(() => {})
      api.get('/api/collection-centers').then(r => setCentersList(r.data.centers || [])).catch(() => {})
      api.get('/api/processing-plants').then(r => setPlantsList(r.data.plants || [])).catch(() => {})
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleFarmerSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ type: '', text: '' })
    try {
      await api.post('/api/farmers', farmerForm)
      setMessage({ type: 'success', text: `Farmer '${farmerForm.name}' added successfully!` })
      setFarmerForm({ name: '', village: '', cows: 10, daily_yield_liters: 150, quality_score: 93, lat: 22.5, lng: 73.0 })
      if (onSuccess) onSuccess()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || err.response?.data?.error || 'Failed to add farmer' })
    } finally {
      setLoading(false)
    }
  }

  const handleCollectionSubmit = async (e) => {
    e.preventDefault()
    if (!collectionForm.farmer_id || !collectionForm.center_id) {
      setMessage({ type: 'error', text: 'Please select a registered Farmer and Collection Center.' })
      return
    }
    setLoading(true)
    setMessage({ type: '', text: '' })
    try {
      await api.post('/api/collections', collectionForm)
      setMessage({ type: 'success', text: `Recorded intake of ${collectionForm.quantity_liters} L. Stock updated!` })
      if (onSuccess) onSuccess()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || err.response?.data?.error || 'Failed to record collection' })
    } finally {
      setLoading(false)
    }
  }

  const handleCenterSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/api/collection-centers', centerForm)
      setMessage({ type: 'success', text: `Collection Center '${centerForm.name}' added!` })
      setCenterForm({ name: '', location: '', capacity_liters: 5000, current_stock: 0, temp_celsius: 3.8 })
      if (onSuccess) onSuccess()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to add center' })
    } finally {
      setLoading(false)
    }
  }

  const handlePlantSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const prods = plantForm.products.split(',').map(s => s.trim()).filter(Boolean)
      await api.post('/api/processing-plants', { ...plantForm, products: prods })
      setMessage({ type: 'success', text: `Processing Plant '${plantForm.name}' added!` })
      if (onSuccess) onSuccess()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to add plant' })
    } finally {
      setLoading(false)
    }
  }

  const handleDistributorSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/api/distributors', distributorForm)
      setMessage({ type: 'success', text: `Distributor '${distributorForm.name}' added!` })
      if (onSuccess) onSuccess()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to add distributor' })
    } finally {
      setLoading(false)
    }
  }

  const handleRetailerSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/api/retailers', retailerForm)
      setMessage({ type: 'success', text: `Retail partner '${retailerForm.name}' added!` })
      if (onSuccess) onSuccess()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to add retailer' })
    } finally {
      setLoading(false)
    }
  }

  const handleTransferSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/api/inventory/transfer', transferForm)
      setMessage({ type: 'success', text: `Dispatched ${transferForm.quantity_liters} L to processing plant!` })
      if (onSuccess) onSuccess()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || err.response?.data?.error || 'Transfer failed' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>📝 Dairy Supply Chain Data Entry</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-tabs">
          <button className={`tab-btn ${activeTab === 'collection' ? 'active' : ''}`} onClick={() => { setActiveTab('collection'); setMessage({type:'',text:''}) }}>🥛 Record Intake</button>
          <button className={`tab-btn ${activeTab === 'farmer' ? 'active' : ''}`} onClick={() => { setActiveTab('farmer'); setMessage({type:'',text:''}) }}>👨‍🌾 Add Farmer</button>
          <button className={`tab-btn ${activeTab === 'center' ? 'active' : ''}`} onClick={() => { setActiveTab('center'); setMessage({type:'',text:''}) }}>🏭 Add Center</button>
          <button className={`tab-btn ${activeTab === 'plant' ? 'active' : ''}`} onClick={() => { setActiveTab('plant'); setMessage({type:'',text:''}) }}>⚙️ Add Plant</button>
          <button className={`tab-btn ${activeTab === 'distributor' ? 'active' : ''}`} onClick={() => { setActiveTab('distributor'); setMessage({type:'',text:''}) }}>🚚 Add Distributor</button>
          <button className={`tab-btn ${activeTab === 'retailer' ? 'active' : ''}`} onClick={() => { setActiveTab('retailer'); setMessage({type:'',text:''}) }}>🛒 Add Retailer</button>
          <button className={`tab-btn ${activeTab === 'transfer' ? 'active' : ''}`} onClick={() => { setActiveTab('transfer'); setMessage({type:'',text:''}) }}>🔄 Stock Transfer</button>
        </div>

        {message.text && (
          <div className={message.type === 'success' ? 'alert-box alert-success' : 'alert-box alert-error'}>
            {message.type === 'success' ? '✅ ' : '⚠️ '}{message.text}
          </div>
        )}

        {/* 1. Record Milk Collection */}
        {activeTab === 'collection' && (
          <form onSubmit={handleCollectionSubmit} className="modal-form">
            <p className="modal-help">Record daily milk collection from a member farmer to a village chilling center.</p>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Select Farmer *</label>
                <select
                  className="form-input"
                  value={collectionForm.farmer_id}
                  onChange={e => setCollectionForm({ ...collectionForm, farmer_id: e.target.value })}
                  required
                >
                  <option value="">-- Choose Registered Farmer --</option>
                  {farmersList.map(f => (
                    <option key={f.id} value={f.id}>{f.name} ({f.id} - {f.village})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Select Collection Center *</label>
                <select
                  className="form-input"
                  value={collectionForm.center_id}
                  onChange={e => setCollectionForm({ ...collectionForm, center_id: e.target.value })}
                  required
                >
                  <option value="">-- Choose Center --</option>
                  {centersList.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.id} - Stock: {c.current_stock}L)</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Quantity (Litres) *</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input"
                  value={collectionForm.quantity_liters}
                  onChange={e => setCollectionForm({ ...collectionForm, quantity_liters: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Fat %</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input"
                  value={collectionForm.fat_pct}
                  onChange={e => setCollectionForm({ ...collectionForm, fat_pct: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">SNF %</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input"
                  value={collectionForm.snf_pct}
                  onChange={e => setCollectionForm({ ...collectionForm, snf_pct: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Quality Score</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input"
                  value={collectionForm.quality_score}
                  onChange={e => setCollectionForm({ ...collectionForm, quality_score: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Recording...' : '💾 Save Milk Collection'}
            </button>
          </form>
        )}

        {/* 2. Add Farmer */}
        {activeTab === 'farmer' && (
          <form onSubmit={handleFarmerSubmit} className="modal-form">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Farmer Full Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Ramesh Patel"
                  value={farmerForm.name}
                  onChange={e => setFarmerForm({ ...farmerForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Village / Location *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Anand"
                  value={farmerForm.village}
                  onChange={e => setFarmerForm({ ...farmerForm, village: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Cows Count</label>
                <input
                  type="number"
                  className="form-input"
                  value={farmerForm.cows}
                  onChange={e => setFarmerForm({ ...farmerForm, cows: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Daily Yield (Litres)</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input"
                  value={farmerForm.daily_yield_liters}
                  onChange={e => setFarmerForm({ ...farmerForm, daily_yield_liters: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Quality Score (80-100)</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input"
                  value={farmerForm.quality_score}
                  onChange={e => setFarmerForm({ ...farmerForm, quality_score: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : '➕ Add Farmer'}
            </button>
          </form>
        )}

        {/* 3. Add Collection Center */}
        {activeTab === 'center' && (
          <form onSubmit={handleCenterSubmit} className="modal-form">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Center Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Anand Primary CC"
                  value={centerForm.name}
                  onChange={e => setCenterForm({ ...centerForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Location / City *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Anand"
                  value={centerForm.location}
                  onChange={e => setCenterForm({ ...centerForm, location: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Capacity (Litres) *</label>
                <input
                  type="number"
                  className="form-input"
                  value={centerForm.capacity_liters}
                  onChange={e => setCenterForm({ ...centerForm, capacity_liters: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Initial Stock (Litres)</label>
                <input
                  type="number"
                  className="form-input"
                  value={centerForm.current_stock}
                  onChange={e => setCenterForm({ ...centerForm, current_stock: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Chilling Temp (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input"
                  value={centerForm.temp_celsius}
                  onChange={e => setCenterForm({ ...centerForm, temp_celsius: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : '➕ Add Collection Center'}
            </button>
          </form>
        )}

        {/* 4. Add Processing Plant */}
        {activeTab === 'plant' && (
          <form onSubmit={handlePlantSubmit} className="modal-form">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Plant Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Gujarat Milk Processing Unit"
                  value={plantForm.name}
                  onChange={e => setPlantForm({ ...plantForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Location *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Anand"
                  value={plantForm.location}
                  onChange={e => setPlantForm({ ...plantForm, location: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Daily Capacity (Litres)</label>
                <input
                  type="number"
                  className="form-input"
                  value={plantForm.capacity_liters_per_day}
                  onChange={e => setPlantForm({ ...plantForm, capacity_liters_per_day: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Utilization %</label>
                <input
                  type="number"
                  className="form-input"
                  value={plantForm.utilization_pct}
                  onChange={e => setPlantForm({ ...plantForm, utilization_pct: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Products Manufactured (comma-separated)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Milk, Butter, Cheese, Ghee"
                value={plantForm.products}
                onChange={e => setPlantForm({ ...plantForm, products: e.target.value })}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : '➕ Add Processing Plant'}
            </button>
          </form>
        )}

        {/* 5. Add Distributor */}
        {activeTab === 'distributor' && (
          <form onSubmit={handleDistributorSubmit} className="modal-form">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Distributor Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. WestFlow Dairy Trans"
                  value={distributorForm.name}
                  onChange={e => setDistributorForm({ ...distributorForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Region *</label>
                <select
                  className="form-input"
                  value={distributorForm.region}
                  onChange={e => setDistributorForm({ ...distributorForm, region: e.target.value })}
                >
                  <option value="North India">North India</option>
                  <option value="West India">West India</option>
                  <option value="South India">South India</option>
                  <option value="East India">East India</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Delivery Routes</label>
                <input
                  type="number"
                  className="form-input"
                  value={distributorForm.delivery_routes}
                  onChange={e => setDistributorForm({ ...distributorForm, delivery_routes: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Vehicles Count</label>
                <input
                  type="number"
                  className="form-input"
                  value={distributorForm.vehicles}
                  onChange={e => setDistributorForm({ ...distributorForm, vehicles: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">On-Time Delivery %</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input"
                  value={distributorForm.on_time_pct}
                  onChange={e => setDistributorForm({ ...distributorForm, on_time_pct: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : '➕ Add Distributor'}
            </button>
          </form>
        )}

        {/* 6. Add Retailer */}
        {activeTab === 'retailer' && (
          <form onSubmit={handleRetailerSubmit} className="modal-form">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Retailer Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. FreshMart Mumbai"
                  value={retailerForm.name}
                  onChange={e => setRetailerForm({ ...retailerForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">City *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Mumbai"
                  value={retailerForm.city}
                  onChange={e => setRetailerForm({ ...retailerForm, city: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Type</label>
                <select
                  className="form-input"
                  value={retailerForm.type}
                  onChange={e => setRetailerForm({ ...retailerForm, type: e.target.value })}
                >
                  <option value="Supermarket">Supermarket</option>
                  <option value="Chain Store">Chain Store</option>
                  <option value="Retailer">Retailer</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Monthly Demand (Litres)</label>
                <input
                  type="number"
                  className="form-input"
                  value={retailerForm.monthly_demand_liters}
                  onChange={e => setRetailerForm({ ...retailerForm, monthly_demand_liters: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Current Stock (Litres)</label>
                <input
                  type="number"
                  className="form-input"
                  value={retailerForm.current_stock_liters}
                  onChange={e => setRetailerForm({ ...retailerForm, current_stock_liters: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : '➕ Add Retail Partner'}
            </button>
          </form>
        )}

        {/* 7. Stock Transfer */}
        {activeTab === 'transfer' && (
          <form onSubmit={handleTransferSubmit} className="modal-form">
            <p className="modal-help">Transfer bulk chilled milk from a Collection Center to a Processing Plant.</p>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Source Collection Center *</label>
                <select
                  className="form-input"
                  value={transferForm.center_id}
                  onChange={e => setTransferForm({ ...transferForm, center_id: e.target.value })}
                  required
                >
                  <option value="">-- Choose Center --</option>
                  {centersList.map(c => (
                    <option key={c.id} value={c.id}>{c.name} (Stock: {c.current_stock}L)</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Destination Processing Plant *</label>
                <select
                  className="form-input"
                  value={transferForm.plant_id}
                  onChange={e => setTransferForm({ ...transferForm, plant_id: e.target.value })}
                  required
                >
                  <option value="">-- Choose Plant --</option>
                  {plantsList.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.location})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Transfer Quantity (Litres) *</label>
              <input
                type="number"
                className="form-input"
                value={transferForm.quantity_liters}
                onChange={e => setTransferForm({ ...transferForm, quantity_liters: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Processing Transfer...' : '🚀 Dispatch to Plant'}
            </button>
          </form>
        )}

      </div>
    </div>
  )
}
