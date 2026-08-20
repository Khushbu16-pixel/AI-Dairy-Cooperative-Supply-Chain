import { useState, useEffect } from 'react'
import axios from 'axios'

// Set up Axios defaults
export const api = axios.create({
  baseURL: '',
})

// Attach JWT token to all requests if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('dairyscm_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 Unauthorized globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        localStorage.removeItem('dairyscm_token')
        localStorage.removeItem('dairyscm_user')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export function useApi(url, trigger = 0) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    api.get(url)
      .then(r => { setData(r.data); setLoading(false); setError(null) })
      .catch(e => {
        setError(e.response?.data?.message || e.response?.data?.error || e.message)
        setLoading(false)
      })
  }, [url, trigger])

  return { data, loading, error, refetch: () => setData(null) }
}

export function getToken() {
  return localStorage.getItem('dairyscm_token')
}

export function setAuth(token, user) {
  localStorage.setItem('dairyscm_token', token)
  localStorage.setItem('dairyscm_user', JSON.stringify(user))
}

export function getAuthUser() {
  const u = localStorage.getItem('dairyscm_user')
  try {
    return u ? JSON.parse(u) : null
  } catch {
    return null
  }
}

export function clearAuth() {
  localStorage.removeItem('dairyscm_token')
  localStorage.removeItem('dairyscm_user')
}

export function fmtNum(n) {
  return Number(n || 0).toLocaleString('en-IN')
}

export function fmtK(n) {
  const num = Number(n || 0)
  return num >= 1000 ? (num / 1000).toFixed(1) + 'K' : String(num)
}
