import axios from 'axios'

// Use environment variable for API URL, fallback to relative path for same-origin
const API_BASE = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : '/api/v1'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    if (import.meta.env.DEV) {
      console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`)
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message)
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

export const getAccidents = (params) =>
  api.get('/accidents', { params })

export const getAccidentById = (id) =>
  api.get(`/accidents/${id}`)

export const getNearbyAccidents = (lat, lon, radius = 500, years = null, limit = 100) =>
  api.get('/accidents/nearby', { params: { lat, lon, radius, years, limit } })

export const getLSOAStats = (lsoaCode) =>
  api.get(`/accidents/lsoa/${lsoaCode}/stats`)

export const getSchools = (params) =>
  api.get('/schools', { params })

export const getSchoolById = (urn) =>
  api.get(`/schools/${urn}`)

export const getSchoolsWithRisk = (params) =>
  api.get('/schools/risk', { params })

export const getSchoolRiskSummary = () =>
  api.get('/schools/risk/summary')

export const getSchoolAccidents = (urn, radius = 200) =>
  api.get(`/schools/${urn}/accidents`, { params: { radius } })

export const getSchoolsNearLocation = (lat, lon, radius = 1000, limit = 20) =>
  api.get('/schools/nearby', { params: { lat, lon, radius, limit } })

export default api
