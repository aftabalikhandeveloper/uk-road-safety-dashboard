import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { 
  AlertTriangle, 
  Users, 
  Car, 
  TrendingDown, 
  TrendingUp,
  Skull,
  AlertCircle,
  CheckCircle,
  RefreshCw
} from 'lucide-react'
import { 
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts'
import { getYearSummary, getTimeSeries, getHourlyPatterns, getHealth } from '../services/api'

// Skeleton loader component
function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
  )
}

// Skeleton card for loading state
function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="w-12 h-12 rounded-lg" />
      </div>
    </div>
  )
}

// Skeleton chart for loading state
function ChartSkeleton({ height = 'h-64' }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <Skeleton className="h-6 w-40 mb-4" />
      <Skeleton className={`w-full ${height}`} />
    </div>
  )
}

// Stat Card Component - Memoized for performance
const StatCard = memo(function StatCard({ title, value, change, changeType, icon: Icon, color }) {
  const colorClasses = {
    red: 'bg-red-50 text-red-600 border-red-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
  }

  return (
    <div className="stat-card bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold mt-1">{value?.toLocaleString() || '-'}</p>
          {change !== undefined && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${
              changeType === 'decrease' ? 'text-green-600' : 'text-red-600'
            }`}>
              {changeType === 'decrease' ? (
                <TrendingDown className="w-4 h-4" />
              ) : (
                <TrendingUp className="w-4 h-4" />
              )}
              <span>{Math.abs(change).toFixed(1)}% vs last year</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg border ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  )
})

// Severity Breakdown Component - Horizontal Stacked Bar
function SeverityBreakdown({ data }) {
  const severityData = [
    { name: 'Fatal', value: data?.fatal || 0, color: '#dc2626', icon: '💀' },
    { name: 'Serious', value: data?.serious || 0, color: '#f59e0b', icon: '🚨' },
    { name: 'Slight', value: data?.slight || 0, color: '#16a34a', icon: '⚠️' },
  ]

  const total = severityData.reduce((sum, item) => sum + item.value, 0)
  const maxValue = Math.max(...severityData.map(d => d.value))

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Severity Breakdown</h3>
      
      {/* Stacked horizontal bar */}
      <div className="mb-6">
        <div className="flex h-8 rounded-lg overflow-hidden shadow-inner">
          {severityData.map((item, i) => {
            const width = total > 0 ? (item.value / total) * 100 : 0
            return (
              <div
                key={item.name}
                className="relative group transition-all duration-300 hover:opacity-90"
                style={{ width: `${width}%`, backgroundColor: item.color }}
                title={`${item.name}: ${item.value.toLocaleString()} (${width.toFixed(1)}%)`}
              >
                {width > 8 && (
                  <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">
                    {width.toFixed(0)}%
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Individual bars */}
      <div className="space-y-4">
        {severityData.map((item) => {
          const percentage = total > 0 ? (item.value / total) * 100 : 0
          const barWidth = maxValue > 0 ? (item.value / maxValue) * 100 : 0
          
          return (
            <div key={item.name}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span>{item.icon}</span>
                  <span className="text-sm font-medium text-gray-700">{item.name}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-gray-900">{item.value.toLocaleString()}</span>
                  <span className="text-sm text-gray-400 ml-2">({percentage.toFixed(1)}%)</span>
                </div>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${barWidth}%`, backgroundColor: item.color }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Monthly Trend Chart
function MonthlyTrendChart({ data }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Monthly Accident Trend</h3>
      <div className="h-72">
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="total_accidents" 
              name="Total Accidents"
              stroke="#2563eb" 
              strokeWidth={2}
            />
            <Line 
              type="monotone" 
              dataKey="fatal" 
              name="Fatal"
              stroke="#dc2626" 
              strokeWidth={2}
            />
            <Line 
              type="monotone" 
              dataKey="serious" 
              name="Serious"
              stroke="#f59e0b" 
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// Hourly Pattern Chart
function HourlyPatternChart({ data }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Accidents by Hour of Day</h3>
      <div className="h-64">
        <ResponsiveContainer>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} />
            <YAxis />
            <Tooltip labelFormatter={(h) => `${h}:00 - ${h+1}:00`} />
            <Bar dataKey="total_accidents" name="Accidents" fill="#2563eb" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// API Status Component
function ApiStatus({ status }) {
  return (
    <div className={`rounded-lg p-4 ${
      status === 'healthy' ? 'bg-green-50' : 
      status === 'degraded' ? 'bg-amber-50' : 'bg-red-50'
    }`}>
      <div className="flex items-center gap-3">
        {status === 'healthy' ? (
          <CheckCircle className="w-5 h-5 text-green-600" />
        ) : status === 'degraded' ? (
          <AlertCircle className="w-5 h-5 text-amber-600" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-red-600" />
        )}
        <div>
          <p className="font-medium">
            {status === 'healthy' ? 'All Systems Operational' :
             status === 'degraded' ? 'Degraded Performance' : 'System Issues'}
          </p>
          <p className="text-sm text-gray-500">API and Database Status</p>
        </div>
      </div>
    </div>
  )
}

// Main Dashboard Component
export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState('all')
  const [summary, setSummary] = useState(null)
  const [timeSeries, setTimeSeries] = useState([])
  const [hourlyPatterns, setHourlyPatterns] = useState([])
  const [apiStatus, setApiStatus] = useState('loading')
  const [error, setError] = useState(null)

  const years = ['all', 2024, 2023, 2022, 2021, 2020]

  useEffect(() => {
    loadDashboardData()
  }, [selectedYear])

  const loadDashboardData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Check API health
      const healthRes = await getHealth()
      setApiStatus(healthRes.data.status)

      // Load year summary
      const summaryRes = await getYearSummary(selectedYear)
      setSummary(summaryRes.data)

      // Load time series for selected year
      try {
        const yearParam = selectedYear === 'all' ? null : selectedYear
        const timeSeriesRes = await getTimeSeries(yearParam, 'month')
        setTimeSeries(timeSeriesRes.data || [])
      } catch (e) {
        console.log('Time series not available')
        setTimeSeries([])
      }

      // Load hourly patterns
      try {
        const yearParam = selectedYear === 'all' ? null : selectedYear
        const hourlyRes = await getHourlyPatterns(yearParam)
        setHourlyPatterns(hourlyRes.data || [])
      } catch (e) {
        console.log('Hourly patterns not available')
        setHourlyPatterns([])
      }

    } catch (err) {
      console.error('Failed to load dashboard data:', err)
      setError('Failed to load data. Make sure the API is running.')
      setApiStatus('error')
    } finally {
      setLoading(false)
    }
  }

  // Memoize computed values
  const statsData = useMemo(() => ({
    totalAccidents: summary?.total_accidents,
    totalCasualties: summary?.total_casualties,
    fatalAccidents: summary?.severity_breakdown?.fatal,
    vehiclesInvolved: summary?.total_vehicles,
    ksiRate: summary?.total_accidents > 0
      ? (((summary?.severity_breakdown?.fatal || 0) + (summary?.severity_breakdown?.serious || 0)) / summary.total_accidents * 100).toFixed(1)
      : 0,
    avgCasualties: summary?.total_accidents > 0
      ? (summary.total_casualties / summary.total_accidents).toFixed(2)
      : 0,
    fatalityRate: summary?.total_accidents > 0
      ? (((summary?.severity_breakdown?.fatal || 0) / summary.total_accidents) * 100).toFixed(2)
      : 0,
  }), [summary])

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        
        {/* Stats skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        
        {/* Charts skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
        
        <ChartSkeleton height="h-80" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-800">{error}</h3>
        <button 
          onClick={loadDashboardData}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          <RefreshCw className="w-4 h-4 inline mr-2" />
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Overview of UK road accident statistics</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
          >
            {years.map(year => (
              <option key={year} value={year}>{year === 'all' ? 'All Years' : year}</option>
            ))}
          </select>

          <button 
            onClick={loadDashboardData}
            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50"
          >
            <RefreshCw className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* API Status */}
      <ApiStatus status={apiStatus} />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Accidents"
          value={summary?.total_accidents}
          icon={AlertTriangle}
          color="blue"
        />
        <StatCard
          title="Total Casualties"
          value={summary?.total_casualties}
          icon={Users}
          color="amber"
        />
        <StatCard
          title="Fatal Accidents"
          value={summary?.severity_breakdown?.fatal}
          icon={Skull}
          color="red"
        />
        <StatCard
          title="Vehicles Involved"
          value={summary?.total_vehicles}
          icon={Car}
          color="green"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SeverityBreakdown data={summary?.severity_breakdown} />
        <HourlyPatternChart data={hourlyPatterns} />
      </div>

      {/* Monthly Trend */}
      {timeSeries.length > 0 && (
        <MonthlyTrendChart data={timeSeries} />
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-2">
            KSI Rate (Killed or Seriously Injured)
          </h3>
          <p className="text-3xl font-bold text-amber-600">
            {summary && summary.total_accidents > 0
              ? (((summary.severity_breakdown?.fatal || 0) + (summary.severity_breakdown?.serious || 0)) / summary.total_accidents * 100).toFixed(1)
              : 0}%
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-2">
            Avg Casualties per Accident
          </h3>
          <p className="text-3xl font-bold text-blue-600">
            {summary && summary.total_accidents > 0
              ? (summary.total_casualties / summary.total_accidents).toFixed(2)
              : 0}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-2">
            Fatality Rate
          </h3>
          <p className="text-3xl font-bold text-red-600">
            {summary && summary.total_accidents > 0
              ? (((summary.severity_breakdown?.fatal || 0) / summary.total_accidents) * 100).toFixed(2)
              : 0}%
          </p>
        </div>
      </div>
    </div>
  )
}
