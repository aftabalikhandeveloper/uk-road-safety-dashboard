import { useState, useEffect, useMemo, useCallback, memo, Suspense, lazy } from 'react'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts'
import { 
  TrendingUp, Calendar, Clock, Car, Users, 
  Building2, RefreshCw, ChevronDown, ChevronUp 
} from 'lucide-react'
import {
  getTimeSeries, getHourlyPatterns, getDailyPatterns,
  getPoliceForceStats, getVehicleTypes, getYearSummary, getBulkYearSummary
} from '../services/api'

// Skeleton loader
function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
}

function SectionSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-gray-50">
        <Skeleton className="h-5 w-40" />
      </div>
      <div className="p-4">
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  )
}

const COLORS = ['#dc2626', '#f59e0b', '#16a34a', '#2563eb', '#8b5cf6', '#ec4899']

// Section component - Memoized
const AnalyticsSection = memo(function AnalyticsSection({ title, icon: Icon, children, defaultOpen = true }) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  
  const toggle = useCallback(() => setIsOpen(prev => !prev), [])

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <button
        onClick={toggle}
        className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
        {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>
      {isOpen && <div className="p-4">{children}</div>}
    </div>
  )
})

// Year over Year comparison
function YearComparison({ data }) {
  if (!data || data.length === 0) return <p className="text-gray-500">No data available</p>

  // Map API response to chart fields
  const chartData = data.map(d => ({
    ...d,
    fatal: d.fatalities || d.fatal || 0,
    serious: d.serious_injuries || d.serious || 0
  }))

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="year" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Area type="monotone" dataKey="total_accidents" name="Total Accidents" 
            fill="#2563eb" stroke="#2563eb" fillOpacity={0.3} />
          <Area type="monotone" dataKey="fatal" name="Fatal" 
            fill="#dc2626" stroke="#dc2626" fillOpacity={0.3} />
          <Area type="monotone" dataKey="serious" name="Serious" 
            fill="#f59e0b" stroke="#f59e0b" fillOpacity={0.3} />
        </AreaChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {chartData.map((year) => (
          <div key={year.year} className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{year.year}</div>
            <div className="text-sm text-gray-500">
              {year.total_accidents?.toLocaleString()} accidents
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Monthly Trends
function MonthlyTrends({ data }) {
  if (!data || data.length === 0) return <p className="text-gray-500">No data available</p>

  // API returns period like "2023-01" so we need to parse it
  const chartData = data.map(d => {
    const month = d.period ? parseInt(d.period.split('-')[1]) : d.month
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return {
      ...d,
      month_name: monthNames[(month || 1) - 1] || d.period,
    }
  })

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month_name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="total_accidents" name="Total" stroke="#2563eb" strokeWidth={2} />
        <Line type="monotone" dataKey="fatal" name="Fatal" stroke="#dc2626" strokeWidth={2} />
        <Line type="monotone" dataKey="serious" name="Serious" stroke="#f59e0b" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  )
}

// Hourly Pattern
function HourlyPattern({ data }) {
  if (!data || data.length === 0) return <p className="text-gray-500">No data available</p>

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} />
        <YAxis />
        <Tooltip labelFormatter={(h) => `${h}:00 - ${h + 1}:00`} />
        <Legend />
        <Bar dataKey="total_accidents" name="Accidents" fill="#2563eb" />
      </BarChart>
    </ResponsiveContainer>
  )
}

// Daily Pattern
function DailyPattern({ data }) {
  if (!data || data.length === 0) return <p className="text-gray-500">No data available</p>

  // API returns day and day_name directly
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="day_name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="total_accidents" name="Accidents" fill="#2563eb" />
      </BarChart>
    </ResponsiveContainer>
  )
}

// Police Force Stats - Clean card grid with stats
function PoliceForceStats({ data }) {
  if (!data || data.length === 0) return <p className="text-gray-500">No data available</p>

  // Sort by total accidents and take top 10
  const sorted = [...data].sort((a, b) => b.total_accidents - a.total_accidents).slice(0, 10)
  const maxAccidents = sorted[0]?.total_accidents || 1

  return (
    <div className="space-y-6">
      {/* Visual bar representation */}
      <div className="grid gap-3">
        {sorted.map((pf, i) => {
          const pct = (pf.total_accidents / maxAccidents) * 100
          const ksiPct = pf.ksi_rate || 0
          return (
            <div key={i} className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900 text-sm">
                  {i + 1}. {pf.police_force_name}
                </span>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-gray-600">{pf.total_accidents?.toLocaleString()} total</span>
                  <span className="text-red-600 font-medium">{pf.fatal_accidents} fatal</span>
                  <span className="text-amber-600">{pf.serious_accidents} serious</span>
                </div>
              </div>
              <div className="flex gap-2 items-center">
                <div className="flex-1 bg-gray-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                  ksiPct > 25 ? 'bg-red-100 text-red-700' : 
                  ksiPct > 20 ? 'bg-amber-100 text-amber-700' : 
                  'bg-green-100 text-green-700'
                }`}>
                  {ksiPct.toFixed(1)}% KSI
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {sorted.reduce((sum, pf) => sum + (pf.total_accidents || 0), 0).toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">Total Accidents (Top 10)</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">
            {sorted.reduce((sum, pf) => sum + (pf.fatal_accidents || 0), 0).toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">Fatal Accidents</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-amber-600">
            {sorted.reduce((sum, pf) => sum + (pf.serious_accidents || 0), 0).toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">Serious Accidents</div>
        </div>
      </div>
    </div>
  )
}

// Vehicle Type Stats - Clean visual cards
function VehicleTypeStats({ data }) {
  if (!data || data.length === 0) return <p className="text-gray-500">No data available</p>

  // Sort by vehicle count and take top 10
  const sorted = [...data]
    .sort((a, b) => (b.vehicle_count || b.accidents || 0) - (a.vehicle_count || a.accidents || 0))
    .slice(0, 10)

  const maxCount = sorted[0]?.vehicle_count || sorted[0]?.accidents || 1
  const total = sorted.reduce((sum, v) => sum + (v.vehicle_count || v.accidents || 0), 0)

  // Colors for different vehicle types
  const getColor = (name) => {
    const n = name?.toLowerCase() || ''
    if (n.includes('car')) return 'bg-blue-500'
    if (n.includes('motorcycle') || n.includes('motor cycle')) return 'bg-orange-500'
    if (n.includes('goods') || n.includes('van') || n.includes('hgv')) return 'bg-purple-500'
    if (n.includes('bus') || n.includes('coach')) return 'bg-green-500'
    if (n.includes('cycle') || n.includes('pedal')) return 'bg-teal-500'
    if (n.includes('taxi')) return 'bg-yellow-500'
    return 'bg-gray-500'
  }

  return (
    <div className="space-y-4">
      {/* Vertical bar chart style */}
      <div className="grid gap-2">
        {sorted.map((vehicle, i) => {
          const count = vehicle.vehicle_count || vehicle.accidents || 0
          const pct = (count / maxCount) * 100
          const sharePct = ((count / total) * 100).toFixed(1)
          const colorClass = getColor(vehicle.vehicle_type_name)
          
          return (
            <div key={i} className="flex items-center gap-3 group">
              <div className="w-36 text-sm text-gray-700 truncate font-medium" title={vehicle.vehicle_type_name}>
                {vehicle.vehicle_type_name}
              </div>
              <div className="flex-1 bg-gray-100 rounded h-7 overflow-hidden relative">
                <div
                  className={`h-full ${colorClass} transition-all group-hover:opacity-80`}
                  style={{ width: `${Math.max(pct, 2)}%` }}
                />
                <div className="absolute inset-0 flex items-center px-2">
                  <span className={`text-xs font-semibold ${pct > 30 ? 'text-white' : 'text-gray-700'}`}>
                    {count.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="w-14 text-right text-xs text-gray-500">
                {sharePct}%
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend showing color meanings */}
      <div className="flex flex-wrap gap-3 pt-4 border-t text-xs">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500"></span> Cars</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-500"></span> Motorcycles</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-500"></span> Goods/Vans</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500"></span> Buses</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-teal-500"></span> Cycles</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-500"></span> Other</span>
      </div>
    </div>
  )
}

// Main Analytics component
export default function Analytics() {
  const [yearData, setYearData] = useState([])
  const [monthlyData, setMonthlyData] = useState([])
  const [hourlyData, setHourlyData] = useState([])
  const [dailyData, setDailyData] = useState([])
  const [policeData, setPoliceData] = useState([])
  const [vehicleData, setVehicleData] = useState([])
  const [selectedYear, setSelectedYear] = useState('')
  const [loading, setLoading] = useState(true)

  const loadAllData = useCallback(async () => {
    setLoading(true)
    try {
      const yearParam = selectedYear || null
      
      // Load all data in parallel - using bulk endpoint for years (1 call instead of 5)
      const [years, monthly, hourly, daily, police, vehicles] = await Promise.all([
        getBulkYearSummary('2020,2021,2022,2023,2024').then(r => r.data).catch(() => []),
        getTimeSeries(yearParam, 'month').then(r => r.data).catch(() => []),
        getHourlyPatterns(yearParam).then(r => r.data).catch(() => []),
        getDailyPatterns(yearParam).then(r => r.data).catch(() => []),
        getPoliceForceStats(yearParam).then(r => r.data).catch(() => []),
        getVehicleTypes(yearParam).then(r => r.data).catch(() => []),
      ])

      setYearData(years.filter(y => y.total_accidents))
      setMonthlyData(monthly)
      setHourlyData(hourly)
      setDailyData(daily)
      setPoliceData(police)
      setVehicleData(vehicles)
    } catch (error) {
      console.error('Failed to load analytics:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedYear])
  
  useEffect(() => {
    loadAllData()
  }, [loadAllData])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-500">Comprehensive analysis of road accident data</p>
        </div>

        <div className="flex items-center gap-4">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">All Years</option>
            <option value="2024">2024</option>
            <option value="2023">2023</option>
            <option value="2022">2022</option>
            <option value="2021">2021</option>
            <option value="2020">2020</option>
          </select>

          <button
            onClick={loadAllData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <SectionSkeleton />
          <SectionSkeleton />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SectionSkeleton />
            <SectionSkeleton />
          </div>
          <SectionSkeleton />
        </div>
      ) : (
        <div className="space-y-6">
          <AnalyticsSection title="Year over Year Comparison" icon={TrendingUp}>
            <YearComparison data={yearData} />
          </AnalyticsSection>

          <AnalyticsSection title="Monthly Trends" icon={Calendar}>
            <MonthlyTrends data={monthlyData} />
          </AnalyticsSection>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AnalyticsSection title="Hourly Pattern" icon={Clock}>
              <HourlyPattern data={hourlyData} />
            </AnalyticsSection>

            <AnalyticsSection title="Daily Pattern" icon={Calendar}>
              <DailyPattern data={dailyData} />
            </AnalyticsSection>
          </div>

          <AnalyticsSection title="Police Force Statistics" icon={Building2}>
            <PoliceForceStats data={policeData} />
          </AnalyticsSection>

          <AnalyticsSection title="Vehicle Types Involved" icon={Car}>
            <VehicleTypeStats data={vehicleData} />
          </AnalyticsSection>
        </div>
      )}
    </div>
  )
}
