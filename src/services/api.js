import axios from 'axios'

// Use environment variable for API URL, fallback to production FastAPI URL
const API_BASE = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : 'https://uk-road-safety-api-815530569947.europe-west1.run.app/api/v1'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor for auth and logging
api.interceptors.request.use(
  (config) => {
    // Mark as dashboard request (not counted against usage/rate limit)
    config.headers['X-Dashboard'] = 'true';
    
    // Add API key if available for data endpoints
    const apiKey = localStorage.getItem('api_key');
    if (apiKey && !config.url?.includes('/users/')) {
      config.headers['X-API-Key'] = apiKey;
    }
    
    // Add JWT token if available
    const token = localStorage.getItem('token');
    if (token && !config.headers['Authorization']) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`)
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor for error handling and auth
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message)
    
    // If unauthorized, clear stored credentials
    if (error.response?.status === 401) {
      const isAuthEndpoint = error.config?.url?.includes('/users/login') || 
                             error.config?.url?.includes('/users/signup');
      if (!isAuthEndpoint) {
        // Token expired or invalid - redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('api_key');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error)
  }
)

// Analytics endpoints
export const getYearSummary = (year) => {
  if (year === 'all' || !year) {
    return api.get('/analytics/summary')
  }
  return api.get(`/analytics/summary/${year}`)
}

// NEW: Bulk endpoint - get multiple years in one call
export const getBulkYearSummary = (years = '2020,2021,2022,2023,2024') =>
  api.get('/analytics/summary/bulk', { params: { years } })

export const getTimeSeries = (year, groupBy = 'month') => {
  const startYear = year || 2020
  const endYear = year || 2024
  return api.get('/analytics/timeseries', { 
    params: { start_year: startYear, end_year: endYear, granularity: groupBy } 
  })
}

export const getHourlyPatterns = (year) =>
  api.get('/analytics/patterns/hourly', { params: year ? { year } : {} })

export const getDailyPatterns = (year) =>
  api.get('/analytics/patterns/daily', { params: { year } })

export const getPoliceForceStats = (year) =>
  api.get('/analytics/police-forces', { params: { year } })

export const getHotspots = (year, limit = 50) =>
  api.get('/analytics/hotspots', { params: { year, limit } })

export const getVehicleTypes = (year) =>
  api.get('/analytics/vehicle-types', { params: { year } })

export const getAccidentConditions = (year) =>
  api.get('/analytics/accident-conditions', { params: { year } })

export const getHeatmapData = (year, limit = 5000) =>
  api.get('/analytics/heatmap-data', { params: { year, limit } })

// Accidents endpoints
export const getAccidents = (params) =>
  api.get('/accidents', { params })

export const getAccidentById = (id) =>
  api.get(`/accidents/${id}`)

export const getNearbyAccidents = (lat, lon, radius = 500, years = null, limit = 100) =>
  api.get('/accidents/nearby', { 
    params: { lat, lon, radius, years, limit } 
  })

export const getLSOAStats = (lsoaCode) =>
  api.get(`/accidents/lsoa/${lsoaCode}/stats`)

// Health check - use full URL since /health is at root, not under /api/v1
const API_ROOT = import.meta.env.VITE_API_URL || 'https://uk-road-safety-api-815530569947.europe-west1.run.app'
export const getHealth = () =>
  axios.get(`${API_ROOT}/health`)

// Schools endpoints
export const getSchools = (params = {}) =>
  api.get('/schools', { params })

export const getSchoolDetail = (urn, radius = 500, year = null) =>
  api.get(`/schools/${urn}`, { params: { radius, year } })

export const getSchoolsSummary = (radius = 500, year = null) =>
  api.get('/schools/summary', { params: { radius, year } })

export const getSchoolPhases = () =>
  api.get('/schools/phases')

export const getSchoolLocalAuthorities = () =>
  api.get('/schools/local-authorities')

export const getSchoolCounties = () =>
  api.get('/schools/counties')

export default api
