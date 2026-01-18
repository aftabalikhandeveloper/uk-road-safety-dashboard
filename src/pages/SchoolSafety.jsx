import { useState, useEffect, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, CircleMarker, Popup, Circle, useMap } from 'react-leaflet'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts'
import { School, AlertTriangle, MapPin, RefreshCw, Search, Filter, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { getSchools, getSchoolDetail, getSchoolsSummary, getSchoolPhases, getSchoolCounties } from '../services/api'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icons in Leaflet/React
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// School icon
const schoolIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#2563eb" width="32" height="32">
      <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
})

// Risk level colors and labels
const RISK_LEVELS = {
  high: { color: '#dc2626', label: 'High Risk', threshold: 10 },
  medium: { color: '#f59e0b', label: 'Medium Risk', threshold: 5 },
  low: { color: '#16a34a', label: 'Low Risk', threshold: 0 },
}

const getRiskLevel = (accidentCount) => {
  if (accidentCount >= RISK_LEVELS.high.threshold) return 'high'
  if (accidentCount >= RISK_LEVELS.medium.threshold) return 'medium'
  return 'low'
}

// Summary card
function StatCard({ title, value, subtitle, icon: Icon, variant = 'default' }) {
  const variants = {
    default: 'bg-white border-gray-200',
    warning: 'bg-amber-50 border-amber-200',
    danger: 'bg-red-50 border-red-200',
    success: 'bg-green-50 border-green-200',
  }

  return (
    <div className={`rounded-lg border p-4 ${variants[variant]}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-gray-600">{title}</div>
          <div className="text-2xl font-bold mt-1">{value?.toLocaleString() || 0}</div>
          {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
        </div>
        {Icon && <Icon className="w-6 h-6 text-gray-400" />}
      </div>
    </div>
  )
}

// Filter panel
function FilterPanel({ filters, setFilters, onApply, phases, counties, loading }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Filter className="w-4 h-4" />
        Filters
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {/* Search */}
        <div>
          <label className="block text-sm text-gray-600 mb-1">School Name</label>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder="Search..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        {/* Phase */}
        <div>
          <label className="block text-sm text-gray-600 mb-1">Phase</label>
          <select
            value={filters.phase}
            onChange={(e) => setFilters({ ...filters, phase: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">All Phases</option>
            {phases.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* County */}
        <div>
          <label className="block text-sm text-gray-600 mb-1">County</label>
          <select
            value={filters.county}
            onChange={(e) => setFilters({ ...filters, county: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">All Counties</option>
            {counties.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Town */}
        <div>
          <label className="block text-sm text-gray-600 mb-1">Town</label>
          <input
            type="text"
            value={filters.town}
            onChange={(e) => setFilters({ ...filters, town: e.target.value })}
            placeholder="Town..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        {/* Radius */}
        <div>
          <label className="block text-sm text-gray-600 mb-1">Radius</label>
          <select
            value={filters.radius}
            onChange={(e) => setFilters({ ...filters, radius: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="200">200m</option>
            <option value="500">500m</option>
            <option value="1000">1km</option>
            <option value="2000">2km</option>
          </select>
        </div>

        {/* Year */}
        <div>
          <label className="block text-sm text-gray-600 mb-1">Year</label>
          <select
            value={filters.year}
            onChange={(e) => setFilters({ ...filters, year: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">All Years</option>
            <option value="2024">2024</option>
            <option value="2023">2023</option>
            <option value="2022">2022</option>
            <option value="2021">2021</option>
            <option value="2020">2020</option>
          </select>
        </div>

        {/* Risk Level */}
        <div>
          <label className="block text-sm text-gray-600 mb-1">Risk Level</label>
          <select
            value={filters.riskLevel}
            onChange={(e) => setFilters({ ...filters, riskLevel: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">All Levels</option>
            <option value="high">High Risk (10+)</option>
            <option value="medium">Medium Risk (5-9)</option>
            <option value="low">Low Risk (0-4)</option>
          </select>
        </div>

        {/* Order By */}
        <div>
          <label className="block text-sm text-gray-600 mb-1">Sort By</label>
          <select
            value={filters.orderBy}
            onChange={(e) => setFilters({ ...filters, orderBy: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="accident_count">Accidents</option>
            <option value="fatal_count">Fatal</option>
            <option value="name">Name</option>
            <option value="number_of_pupils">Pupils</option>
          </select>
        </div>

        {/* Page Size */}
        <div>
          <label className="block text-sm text-gray-600 mb-1">Per Page</label>
          <select
            value={filters.pageSize}
            onChange={(e) => setFilters({ ...filters, pageSize: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="200">200</option>
          </select>
        </div>

        {/* Apply Button */}
        <div className="flex items-end">
          <button
            onClick={onApply}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Search className="w-4 h-4" />
            Search
          </button>
        </div>
      </div>
    </div>
  )
}

// Map centering component
function MapCenter({ center, zoom }) {
  const map = useMap()
  useEffect(() => {
    if (center) {
      map.setView(center, zoom)
    }
  }, [center, zoom, map])
  return null
}

// School safety map
function SchoolSafetyMap({ schools, selectedSchool, onSelectSchool, radius }) {
  const defaultCenter = [52.5, -1.5] // Center of England

  return (
    <MapContainer
      center={defaultCenter}
      zoom={6}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {selectedSchool && (
        <MapCenter 
          center={[selectedSchool.latitude, selectedSchool.longitude]} 
          zoom={15} 
        />
      )}

      {/* School markers with hover interaction */}
      {schools.map((school, index) => {
        if (!school.latitude || !school.longitude) return null
        const riskLevel = getRiskLevel(school.accident_count || 0)
        const isSelected = selectedSchool?.urn === school.urn
        
        return (
          <Marker
            key={school.urn || index}
            position={[school.latitude, school.longitude]}
            icon={schoolIcon}
            eventHandlers={{
              click: () => onSelectSchool(school),
              mouseover: (e) => {
                e.target.openPopup()
              },
              mouseout: (e) => {
                // Keep popup open if this school is selected
                if (!isSelected) {
                  e.target.closePopup()
                }
              },
            }}
          >
            <Popup>
              <div className="min-w-56">
                <div className="font-bold text-gray-900 text-base">{school.name}</div>
                <div className="text-sm text-gray-500">{school.phase_of_education || 'School'}</div>
                <div className="text-xs text-gray-400 mb-2">{school.town}, {school.postcode}</div>
                
                <div className={`inline-block px-2 py-1 rounded text-xs font-medium mb-2 ${
                  riskLevel === 'high' ? 'bg-red-100 text-red-700' :
                  riskLevel === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                }`}>
                  {riskLevel === 'high' ? '⚠️ High Risk' :
                   riskLevel === 'medium' ? '⚡ Medium Risk' : '✓ Low Risk'}
                </div>
                
                <div className="text-sm space-y-1 border-t border-gray-100 pt-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Accidents:</span>
                    <strong className={
                      riskLevel === 'high' ? 'text-red-600' :
                      riskLevel === 'medium' ? 'text-amber-600' : 'text-green-600'
                    }>{school.accident_count || 0}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Fatal:</span>
                    <span className="text-red-600 font-medium">{school.fatal_count || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Serious:</span>
                    <span className="text-amber-600 font-medium">{school.serious_count || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Slight:</span>
                    <span className="text-green-600 font-medium">{school.slight_count || 0}</span>
                  </div>
                </div>
                
                {school.number_of_pupils && (
                  <div className="text-xs text-gray-400 mt-2 border-t border-gray-100 pt-2">
                    👨‍🎓 {school.number_of_pupils.toLocaleString()} pupils
                  </div>
                )}
                
                <div className="text-xs text-blue-600 mt-2 cursor-pointer hover:underline">
                  Click for detailed analysis →
                </div>
              </div>
            </Popup>
          </Marker>
        )
      })}

      {/* Selected school radius circle */}
      {selectedSchool && selectedSchool.latitude && (
        <>
          <Circle
            center={[selectedSchool.latitude, selectedSchool.longitude]}
            radius={radius}
            pathOptions={{
              color: '#2563eb',
              fillColor: '#2563eb',
              fillOpacity: 0.1,
              weight: 2,
              dashArray: '5, 10',
            }}
          />

          {/* Nearby accidents with hover interactions */}
          {selectedSchool.accidents?.map((accident, i) => {
            const baseRadius = accident.severity === 1 ? 10 : accident.severity === 2 ? 7 : 5
            const color = accident.severity === 1 ? '#dc2626' :
                         accident.severity === 2 ? '#f59e0b' : '#16a34a'
            const severityLabel = accident.severity === 1 ? 'Fatal' : 
                                  accident.severity === 2 ? 'Serious' : 'Slight'

            return (
              <CircleMarker
                key={i}
                center={[accident.latitude, accident.longitude]}
                radius={baseRadius}
                pathOptions={{
                  color: color,
                  fillColor: color,
                  fillOpacity: 0.7,
                  weight: 2,
                }}
                eventHandlers={{
                  mouseover: (e) => {
                    const marker = e.target
                    marker.setStyle({
                      weight: 4,
                      fillOpacity: 0.95,
                      color: '#1e3a8a',
                    })
                    marker.setRadius(baseRadius * 1.5)
                    marker.openPopup()
                  },
                  mouseout: (e) => {
                    const marker = e.target
                    marker.setStyle({
                      weight: 2,
                      fillOpacity: 0.7,
                      color: color,
                    })
                    marker.setRadius(baseRadius)
                    marker.closePopup()
                  },
                }}
              >
                <Popup>
                  <div className="min-w-44">
                    <div className={`font-bold text-sm mb-1 ${
                      accident.severity === 1 ? 'text-red-600' :
                      accident.severity === 2 ? 'text-amber-600' : 'text-green-600'
                    }`}>
                      {accident.severity === 1 ? '💀' : accident.severity === 2 ? '🚨' : '⚠️'} {severityLabel} Accident
                    </div>
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Date:</span>
                        <span className="font-medium">{accident.accident_date}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Casualties:</span>
                        <span className="font-medium">{accident.number_of_casualties}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Distance:</span>
                        <span className="font-medium">{Math.round(accident.distance_meters)}m from school</span>
                      </div>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            )
          })}
        </>
      )}
    </MapContainer>
  )
}

// Schools list with pagination
function SchoolsList({ schools, selectedSchool, onSelectSchool, total, page, pageSize, onPageChange }) {
  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="flex flex-col h-full">
      {/* Header with count */}
      <div className="p-3 border-b border-gray-200 bg-gray-50">
        <div className="text-sm text-gray-600">
          Showing {schools.length} of {total.toLocaleString()} schools
        </div>
      </div>

      {/* List */}
      <div className="flex-1 divide-y divide-gray-200 overflow-y-auto max-h-[400px]">
        {schools.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No schools found. Try adjusting your filters.
          </div>
        ) : (
          schools.map((school, index) => {
            const riskLevel = getRiskLevel(school.accident_count || 0)
            const isSelected = selectedSchool?.urn === school.urn

            return (
              <button
                key={school.urn || index}
                onClick={() => onSelectSchool(school)}
                className={`w-full p-3 text-left hover:bg-gray-50 transition-colors ${
                  isSelected ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{school.name}</div>
                    <div className="text-xs text-gray-500">{school.phase_of_education}</div>
                    <div className="text-xs text-gray-400 truncate">{school.town}, {school.postcode}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`
                      inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
                      ${riskLevel === 'high' ? 'bg-red-100 text-red-700' :
                        riskLevel === 'medium' ? 'bg-amber-100 text-amber-700' :
                        'bg-green-100 text-green-700'}
                    `}>
                      {school.accident_count || 0}
                    </span>
                    {school.fatal_count > 0 && (
                      <div className="text-xs text-red-600 mt-1">
                        {school.fatal_count} fatal
                      </div>
                    )}
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-3 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="flex items-center gap-1 px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            <ChevronLeft className="w-4 h-4" />
            Prev
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="flex items-center gap-1 px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}

// Risk distribution chart - Stacked bar + Progress bars
function RiskDistributionChart({ summary }) {
  const data = [
    { name: 'High Risk', label: '10+ accidents', value: summary?.high_risk_count || 0, color: '#dc2626', icon: '🔴' },
    { name: 'Medium Risk', label: '5-9 accidents', value: summary?.medium_risk_count || 0, color: '#f59e0b', icon: '🟡' },
    { name: 'Low Risk', label: '0-4 accidents', value: summary?.low_risk_count || 0, color: '#16a34a', icon: '🟢' },
  ]

  const total = data.reduce((sum, d) => sum + d.value, 0)
  const maxValue = Math.max(...data.map(d => d.value))
  if (total === 0) return null

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <h4 className="font-semibold text-gray-900 mb-4">🏫 School Risk Distribution</h4>
      
      {/* Stacked bar visualization */}
      <div className="mb-6">
        <div className="flex h-10 rounded-xl overflow-hidden shadow-lg">
          {data.map((item) => {
            const width = total > 0 ? (item.value / total) * 100 : 0
            return (
              <div
                key={item.name}
                className="relative flex items-center justify-center transition-all duration-300 hover:brightness-110 cursor-pointer"
                style={{ width: `${width}%`, backgroundColor: item.color }}
                title={`${item.name}: ${item.value.toLocaleString()} schools (${width.toFixed(1)}%)`}
              >
                {width > 12 && (
                  <span className="text-white text-sm font-bold drop-shadow">
                    {item.value.toLocaleString()}
                  </span>
                )}
              </div>
            )
          })}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>Higher Risk ←</span>
          <span>→ Lower Risk</span>
        </div>
      </div>

      {/* Individual progress bars */}
      <div className="space-y-4">
        {data.map((item) => {
          const percentage = total > 0 ? (item.value / total) * 100 : 0
          const barWidth = maxValue > 0 ? (item.value / maxValue) * 100 : 0
          
          return (
            <div key={item.name} className="group">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span>{item.icon}</span>
                  <span className="text-sm font-medium text-gray-700">{item.name}</span>
                  <span className="text-xs text-gray-400">({item.label})</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-gray-900">{item.value.toLocaleString()}</span>
                  <span className="text-xs text-gray-400 ml-1">({percentage.toFixed(1)}%)</span>
                </div>
              </div>
              <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 group-hover:opacity-80"
                  style={{ 
                    width: `${barWidth}%`, 
                    backgroundColor: item.color,
                    boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.15)'
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Selected school detail panel
function SchoolDetailPanel({ school, radius }) {
  if (!school) return null

  const riskLevel = getRiskLevel(school.accident_count || 0)

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="font-semibold text-gray-900">{school.name}</h4>
          <p className="text-sm text-gray-500">{school.phase_of_education}</p>
          <p className="text-xs text-gray-400">{school.street}, {school.town}, {school.postcode}</p>
        </div>
        <span className={`
          px-3 py-1 rounded-full text-sm font-medium
          ${riskLevel === 'high' ? 'bg-red-100 text-red-700' :
            riskLevel === 'medium' ? 'bg-amber-100 text-amber-700' :
            'bg-green-100 text-green-700'}
        `}>
          {RISK_LEVELS[riskLevel].label}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold">{school.accident_count || 0}</div>
          <div className="text-xs text-gray-500">Total Accidents</div>
        </div>
        <div className="text-center p-3 bg-red-50 rounded-lg">
          <div className="text-2xl font-bold text-red-600">{school.fatal_count || 0}</div>
          <div className="text-xs text-gray-500">Fatal</div>
        </div>
        <div className="text-center p-3 bg-amber-50 rounded-lg">
          <div className="text-2xl font-bold text-amber-600">{school.serious_count || 0}</div>
          <div className="text-xs text-gray-500">Serious</div>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{school.slight_count || 0}</div>
          <div className="text-xs text-gray-500">Slight</div>
        </div>
      </div>

      <div className="text-sm text-gray-600 space-y-1">
        {school.number_of_pupils && (
          <p><span className="text-gray-400">Pupils:</span> {school.number_of_pupils.toLocaleString()}</p>
        )}
        {school.local_authority_name && (
          <p><span className="text-gray-400">Local Authority:</span> {school.local_authority_name}</p>
        )}
        <p><span className="text-gray-400">Search Radius:</span> {radius}m</p>
      </div>

      {school.accidents && school.accidents.length > 0 && (
        <div className="mt-4">
          <h5 className="font-medium text-gray-900 mb-2">Recent Accidents ({school.accidents.length})</h5>
          <div className="max-h-48 overflow-y-auto space-y-2">
            {school.accidents.slice(0, 10).map((acc, i) => (
              <div key={i} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    acc.severity === 1 ? 'bg-red-500' :
                    acc.severity === 2 ? 'bg-amber-500' : 'bg-green-500'
                  }`} />
                  <span>{acc.accident_date}</span>
                </div>
                <span className="text-gray-500">{Math.round(acc.distance_meters)}m away</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Main SchoolSafety component
export default function SchoolSafety() {
  const [schools, setSchools] = useState([])
  const [selectedSchool, setSelectedSchool] = useState(null)
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  
  // Filter options
  const [phases, setPhases] = useState([])
  const [counties, setCounties] = useState([])
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    phase: '',
    county: '',
    town: '',
    radius: 500,
    year: '',
    riskLevel: '',
    orderBy: 'accident_count',
    pageSize: 50,
  })

  // Load filter options on mount
  useEffect(() => {
    loadFilterOptions()
    loadSchools()
    loadSummary()
  }, [])

  const loadFilterOptions = async () => {
    try {
      const [phasesRes, countiesRes] = await Promise.all([
        getSchoolPhases(),
        getSchoolCounties()
      ])
      setPhases(phasesRes.data || [])
      setCounties(countiesRes.data || [])
    } catch (error) {
      console.error('Failed to load filter options:', error)
    }
  }

  const loadSummary = async () => {
    try {
      const year = filters.year || undefined
      const res = await getSchoolsSummary(filters.radius, year)
      setSummary(res.data)
    } catch (error) {
      console.error('Failed to load summary:', error)
    }
  }

  const loadSchools = async (newPage = 1) => {
    setLoading(true)
    try {
      const params = {
        page: newPage,
        page_size: filters.pageSize,
        radius: filters.radius,
        order_by: filters.orderBy,
        order_dir: 'desc',
      }
      
      if (filters.search) params.search = filters.search
      if (filters.phase) params.phase = filters.phase
      if (filters.county) params.county = filters.county
      if (filters.town) params.town = filters.town
      if (filters.year) params.year = parseInt(filters.year)
      if (filters.riskLevel) params.risk_level = filters.riskLevel

      const response = await getSchools(params)
      setSchools(response.data.data || [])
      setTotal(response.data.total || 0)
      setPage(response.data.page || 1)
    } catch (error) {
      console.error('Failed to load schools:', error)
      setSchools([])
    } finally {
      setLoading(false)
    }
  }

  const handleApplyFilters = () => {
    setSelectedSchool(null)
    loadSchools(1)
    loadSummary()
  }

  const handlePageChange = (newPage) => {
    loadSchools(newPage)
  }

  const handleSelectSchool = async (school) => {
    // Load detailed info with accidents
    try {
      const year = filters.year || undefined
      const response = await getSchoolDetail(school.urn, filters.radius, year)
      setSelectedSchool(response.data)
    } catch (error) {
      console.error('Failed to load school details:', error)
      setSelectedSchool(school)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">School Safety Analysis</h1>
          <p className="text-gray-500">Analyzing accident patterns near {total.toLocaleString()} schools</p>
        </div>
        <button
          onClick={handleApplyFilters}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <FilterPanel 
        filters={filters}
        setFilters={setFilters}
        onApply={handleApplyFilters}
        phases={phases}
        counties={counties}
        loading={loading}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title="Total Schools"
          value={summary?.total_schools}
          icon={School}
        />
        <StatCard
          title="High Risk"
          value={summary?.high_risk_count}
          subtitle="10+ accidents"
          icon={AlertTriangle}
          variant="danger"
        />
        <StatCard
          title="Medium Risk"
          value={summary?.medium_risk_count}
          subtitle="5-9 accidents"
          icon={AlertCircle}
          variant="warning"
        />
        <StatCard
          title="Low Risk"
          value={summary?.low_risk_count}
          subtitle="0-4 accidents"
          icon={School}
          variant="success"
        />
        <StatCard
          title="Total Accidents"
          value={summary?.total_accidents}
          subtitle={`Within ${filters.radius}m`}
          icon={MapPin}
        />
        <StatCard
          title="Fatal Accidents"
          value={summary?.total_fatal}
          subtitle="Near schools"
          icon={AlertTriangle}
          variant="danger"
        />
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              School Locations
              {selectedSchool && (
                <span className="text-sm font-normal text-gray-500">
                  - {selectedSchool.name}
                </span>
              )}
            </h3>
          </div>
          <div className="h-[500px]">
            <SchoolSafetyMap 
              schools={schools}
              selectedSchool={selectedSchool}
              onSelectSchool={handleSelectSchool}
              radius={filters.radius}
            />
          </div>
        </div>

        {/* Schools List */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <School className="w-4 h-4" />
              Schools
            </h3>
          </div>
          <SchoolsList 
            schools={schools}
            selectedSchool={selectedSchool}
            onSelectSchool={handleSelectSchool}
            total={total}
            page={page}
            pageSize={filters.pageSize}
            onPageChange={handlePageChange}
          />
        </div>
      </div>

      {/* Selected school detail and chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {selectedSchool && (
          <SchoolDetailPanel 
            school={selectedSchool}
            radius={filters.radius}
          />
        )}
        <RiskDistributionChart summary={summary} />
      </div>
    </div>
  )
}
