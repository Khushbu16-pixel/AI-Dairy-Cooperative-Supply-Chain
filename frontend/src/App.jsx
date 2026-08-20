import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom'

import Dashboard      from './pages/Dashboard.jsx'
import Farmers        from './pages/Farmers.jsx'
import Collection     from './pages/Collection.jsx'
import Processing     from './pages/Processing.jsx'
import Distributors   from './pages/Distributors.jsx'
import Retailers      from './pages/Retailers.jsx'
import Forecast       from './pages/Forecast.jsx'
import RouteOpt       from './pages/RouteOpt.jsx'
import QualityAlerts  from './pages/QualityAlerts.jsx'
import Insights       from './pages/Insights.jsx'
import Balance        from './pages/Balance.jsx'
import Account        from './pages/Account.jsx'
import Login          from './pages/Login.jsx'
import Register       from './pages/Register.jsx'

import DataEntryModal from './components/DataEntryModal.jsx'
import { getAuthUser, getToken, clearAuth } from './utils.js'

import './App.css'

const NAV = [
  { path: '/',             label: 'Dashboard',          icon: '📊' },
  { path: '/farmers',      label: 'Farmers',            icon: '👨‍🌾' },
  { path: '/collection',   label: 'Collection Centers', icon: '🏭' },
  { path: '/processing',   label: 'Processing Plants',  icon: '⚙️' },
  { path: '/distributors', label: 'Distributors',       icon: '🚚' },
  { path: '/retailers',    label: 'Retailers',          icon: '🛒' },
]
const AI_NAV = [
  { path: '/forecast',     label: 'Demand Forecast',    icon: '🔮' },
  { path: '/routes',       label: 'Route Optimization', icon: '🗺️' },
  { path: '/alerts',       label: 'Quality Alerts',     icon: '🚨' },
  { path: '/insights',     label: 'Production Insights',icon: '💡' },
  { path: '/balance',      label: 'Supply-Demand',      icon: '⚖️' },
]

function Sidebar({ user, onOpenDataEntry, onLogout }) {
  const linkClass = ({ isActive }) =>
    'nav-item' + (isActive ? ' active' : '')

  return (
    <nav className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-icon">🐄</span>
        <div>
          <div className="brand-title">DairySCM</div>
          <div className="brand-sub">AI Supply Chain Platform</div>
        </div>
      </div>

      <div style={{ padding: '0 12px', marginBottom: 12 }}>
        <button
          className="btn btn-primary btn-block"
          style={{ fontSize: '0.82rem', padding: '7px 10px' }}
          onClick={() => onOpenDataEntry('collection')}
        >
          ➕ Record / Add Data
        </button>
      </div>

      <ul className="sidebar-nav">
        {NAV.map(n => (
          <li key={n.path}>
            <NavLink to={n.path} end className={linkClass}>
              <span className="nav-icon">{n.icon}</span>{n.label}
            </NavLink>
          </li>
        ))}
        <li className="nav-divider">AI Insights</li>
        {AI_NAV.map(n => (
          <li key={n.path}>
            <NavLink to={n.path} className={linkClass}>
              <span className="nav-icon">{n.icon}</span>{n.label}
            </NavLink>
          </li>
        ))}
        <li className="nav-divider">My Account</li>
        <li>
          <NavLink to="/account" className={linkClass}>
            <span className="nav-icon">👤</span>My Account
          </NavLink>
        </li>
        <li>
          <button
            onClick={onLogout}
            className="nav-item"
            style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', color: '#ef4444' }}
          >
            <span className="nav-icon">🚪</span>Sign Out
          </button>
        </li>
      </ul>

      <div className="sidebar-footer">
        {user ? (
          <div style={{ fontSize: '0.72rem', color: '#57606a', lineHeight: 1.3 }}>
            <div><strong>{user.organization_name}</strong></div>
            <div>User: {user.name}</div>
          </div>
        ) : (
          <div>IBM Watsonx AI Powered</div>
        )}
      </div>
    </nav>
  )
}

function Topbar({ user, onOpenDataEntry }) {
  const [time, setTime] = useState(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))

  useEffect(() => {
    const t = setInterval(() =>
      setTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h1 className="page-title">
          {user ? `Welcome, ${user.name}` : 'AI-Based Dairy Cooperative Supply Chain'}
        </h1>
        {user && (
          <span style={{ fontSize: '0.8rem', color: '#57606a', marginLeft: 8 }}>
            ({user.organization_name} · {user.location})
          </span>
        )}
      </div>
      <div className="topbar-right">
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => onOpenDataEntry('collection')}
          style={{ marginRight: 6 }}
        >
          ➕ Quick Entry
        </button>
        <span className="badge badge-green">● AI Models Active</span>
        <span className="topbar-time">{time}</span>
      </div>
    </header>
  )
}

function ProtectedRoute({ user, children }) {
  const token = getToken()
  if (!token || !user) {
    return <Navigate to="/login" replace />
  }
  return children
}

export default function App() {
  const [user, setUser] = useState(getAuthUser())
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTab, setModalTab] = useState('collection')
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleLoginSuccess = (userData) => {
    setUser(userData)
  }

  const handleLogout = () => {
    clearAuth()
    setUser(null)
    window.location.href = '/login'
  }

  const openDataEntry = (tab = 'collection') => {
    setModalTab(tab)
    setModalOpen(true)
  }

  const handleDataSuccess = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Auth Routes */}
        <Route path="/login" element={<Login onLoginSuccess={handleLoginSuccess} />} />
        <Route path="/register" element={<Register onLoginSuccess={handleLoginSuccess} />} />

        {/* Protected Application Routes */}
        <Route
          path="/*"
          element={
            <ProtectedRoute user={user}>
              <div className="layout">
                <Sidebar user={user} onOpenDataEntry={openDataEntry} onLogout={handleLogout} />
                <div className="main">
                  <Topbar user={user} onOpenDataEntry={openDataEntry} />
                  <div className="content">
                    <Routes>
                      <Route path="/"             element={<Dashboard trigger={refreshTrigger} />} />
                      <Route path="/farmers"      element={<Farmers trigger={refreshTrigger} />} />
                      <Route path="/collection"   element={<Collection trigger={refreshTrigger} />} />
                      <Route path="/processing"   element={<Processing trigger={refreshTrigger} />} />
                      <Route path="/distributors" element={<Distributors trigger={refreshTrigger} />} />
                      <Route path="/retailers"    element={<Retailers trigger={refreshTrigger} />} />
                      <Route path="/forecast"     element={<Forecast trigger={refreshTrigger} />} />
                      <Route path="/routes"       element={<RouteOpt trigger={refreshTrigger} />} />
                      <Route path="/alerts"       element={<QualityAlerts trigger={refreshTrigger} />} />
                      <Route path="/insights"     element={<Insights trigger={refreshTrigger} />} />
                      <Route path="/balance"      element={<Balance trigger={refreshTrigger} />} />
                      <Route path="/account"      element={<Account user={user} onUpdateUser={setUser} onOpenDataEntry={openDataEntry} trigger={refreshTrigger} />} />
                      <Route path="*"             element={<Navigate to="/" replace />} />
                    </Routes>
                  </div>
                </div>
              </div>

              <DataEntryModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                initialTab={modalTab}
                onSuccess={handleDataSuccess}
              />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
