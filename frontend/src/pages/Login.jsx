import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, setAuth } from '../utils.js'

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/api/auth/login', { email, password })
      if (res.data.token && res.data.user) {
        setAuth(res.data.token, res.data.user)
        if (onLoginSuccess) onLoginSuccess(res.data.user)
        navigate('/')
      }
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const fillDemoCredentials = () => {
    setEmail('demo@dairyscm.com')
    setPassword('demo123')
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <span className="auth-logo">🐄</span>
          <h1 className="auth-title">DairySCM Platform</h1>
          <p className="auth-sub">AI-Based Dairy Cooperative Supply Chain</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleLogin} className="auth-form">
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              placeholder="e.g. operator@cooperative.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Authenticating…' : 'Sign In to Dashboard'}
          </button>
        </form>

        <div className="auth-divider">
          <span>OR</span>
        </div>

        <button
          type="button"
          onClick={fillDemoCredentials}
          className="btn btn-secondary btn-block"
          style={{ marginBottom: 16 }}
        >
          ⚡ Load Sample Demo Account (demo@dairyscm.com)
        </button>

        <div className="auth-footer">
          Don't have an account yet?{' '}
          <Link to="/register" className="auth-link">
            Create Cooperative Account
          </Link>
        </div>
      </div>
    </div>
  )
}
