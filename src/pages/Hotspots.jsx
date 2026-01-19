import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { AlertTriangle, TrendingUp, MapPin, RefreshCw, Flame, Map as MapIcon } from 'lucide-react'
import { getHotspots, getHeatmapData, getAccidentConditions } from '../services/api'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Heatmap is supported via circle markers - no leaflet.heat needed
const heatLayerSupported = false

// Risk category colors
const RISK_COLORS = {
  'Critical': '#7f1d1d',
  'Very High': '#dc2626',
  'High': '#f59e0b',
  'Moderate': '#eab308',
  'Low': '#16a34a',
}

// Risk category badge styles
const RISK_BADGES = {
  'Critical': 'bg-red-900 text-white',
  'Very High': 'bg-red-600 text-white',
  'High': 'bg-amber-500 text-white',
  'Moderate': 'bg-yellow-500 text-gray-900',
  'Low': 'bg-green-600 text-white',
}

const CHART_COLORS = ['#dc2626', '#f59e0b', '#16a34a', '#2563eb', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

// Calculate risk category from score
function getRiskCategory(score, accidentCount) {
  if (accidentCount >= 100 || score >= 200) return 'Critical'
  if (accidentCount >= 50 || score >= 100) return 'Very High'
  if (accidentCount >= 25 || score >= 50) return 'High'
  if (accidentCount >= 10 || score >= 20) return 'Moderate'
  return 'Low'
}

// Summary stats card
function StatCard({ title, value, subtitle, color = 'blue' }) {
  const colors = {
    red: 'bg-red-50 border-red-200 text-red-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
  }

  return (
    <div className={`rounded-lg border p-4 ${colors[color]}`}>
      <div className="text-sm font-medium">{title}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {subtitle && <div className="text-xs mt-1 opacity-75">{subtitle}</div>}
    </div>
  )
}

// Heatmap using circle markers with interactive hover tooltips
function HeatmapCircles({ data }) {
  if (!data || data.length === 0) return null

  const getSeverityLabel = (intensity) => {
    if (intensity >= 8) return 'Critical'
    if (intensity >= 5) return 'High'
    if (intensity >= 3) return 'Moderate'
    return 'Low'
  }

  return (
    <>
      {data.map((point, index) => {
        const intensity = point.intensity || 1
        const color = intensity >= 8 ? '#dc2626' : 
                      intensity >= 5 ? '#f59e0b' : 
                      intensity >= 3 ? '#eab308' : '#16a34a'
        const baseRadius = Math.max(4, Math.min(10, intensity))
        const opacity = Math.min(0.8, 0.3 + (intensity / 15))
        const severityLabel = getSeverityLabel(intensity)

        return (
          <CircleMarker
            key={index}
            center={[point.lat, point.lng]}
            radius={baseRadius}
            pathOptions={{
              color: color,
              fillColor: color,
              fillOpacity: opacity,
              weight: 1,
            }}
            eventHandlers={{
              mouseover: (e) => {
                const marker = e.target
                marker.setStyle({
                  weight: 3,
                  fillOpacity: 0.9,
                  color: '#1e40af',
                })
                marker.setRadius(baseRadius * 1.5)
                marker.openPopup()
              },
              mouseout: (e) => {
                const marker = e.target
                marker.setStyle({
                  weight: 1,
                  fillOpacity: opacity,
                  color: color,
                })
                marker.setRadius(baseRadius)
                marker.closePopup()
              },
            }}
          >
            <Popup>
              <div className="text-center min-w-32">
                <div className={`font-bold text-sm mb-1 ${
                  intensity >= 8 ? 'text-red-600' :
                  intensity >= 5 ? 'text-amber-600' :
                  intensity >= 3 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {severityLabel} Risk Area
                </div>
                <div className="text-xs text-gray-600">
                  <p>Intensity: <strong>{intensity.toFixed(1)}</strong></p>
                  <p>Accidents: <strong>{point.count || Math.round(intensity)}</strong></p>
                  {point.fatal > 0 && <p className="text-red-600">Fatal: {point.fatal}</p>}
                  {point.serious > 0 && <p className="text-amber-600">Serious: {point.serious}</p>}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {point.lat.toFixed(4)}, {point.lng.toFixed(4)}
                </div>
              </div>
            </Popup>
          </CircleMarker>
        )
      })}
    </>
  )
}

// Native heatmap layer (when leaflet.heat is available)
function NativeHeatmapLayer({ data }) {
  const map = useMap()
  const heatLayerRef = useRef(null)

  useEffect(() => {
    if (!data || data.length === 0 || !heatLayerSupported) return

    // Remove existing heat layer
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current)
    }

    // Create heat layer data: [lat, lng, intensity]
    const heatData = data.map(point => [
      point.lat,
      point.lng,
      point.intensity || 1
    ])

    // Create and add heat layer
    heatLayerRef.current = L.heatLayer(heatData, {
      radius: 15,
      blur: 20,
      maxZoom: 17,
      max: 10,
      gradient: {
        0.0: '#00ff00',
        0.25: '#ffff00',
        0.5: '#ffa500',
        0.75: '#ff4500',
        1.0: '#ff0000'
      }
    }).addTo(map)

    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current)
      }
    }
  }, [data, map])

  return null
}

// Hotspot Map with heatmap
function HotspotMap({ hotspots, heatmapData, showHeatmap }) {
  const center = [52.5, -1.5] // Center of UK

  // Filter out invalid coordinates
  const validHotspots = hotspots.filter(h => 
    h.latitude && h.longitude && 
    !isNaN(h.latitude) && !isNaN(h.longitude) &&
    h.latitude !== 0 && h.longitude !== 0
  )

  const validHeatmapData = heatmapData.filter(h =>
    h.lat && h.lng &&
    !isNaN(h.lat) && !isNaN(h.lng)
  )

  return (
    <MapContainer
      center={center}
      zoom={6}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {showHeatmap && validHeatmapData.length > 0 && (
        heatLayerSupported ? (
          <NativeHeatmapLayer data={validHeatmapData} />
        ) : (
          <HeatmapCircles data={validHeatmapData} />
        )
      )}

      {!showHeatmap && validHotspots.map((hotspot, index) => {
        const riskCategory = hotspot.risk_category || getRiskCategory(hotspot.risk_score, hotspot.accident_count)
        const color = RISK_COLORS[riskCategory] || '#6b7280'
        const baseRadius = Math.min(15, Math.max(6, (hotspot.accident_count || 0) / 10))

        return (
          <CircleMarker
            key={index}
            center={[hotspot.latitude, hotspot.longitude]}
            radius={baseRadius}
            pathOptions={{
              color: color,
              fillColor: color,
              fillOpacity: 0.6,
              weight: 2,
            }}
            eventHandlers={{
              mouseover: (e) => {
                const marker = e.target
                marker.setStyle({
                  weight: 4,
                  fillOpacity: 0.85,
                  color: '#1e3a8a',
                })
                marker.setRadius(baseRadius * 1.4)
                marker.openPopup()
              },
              mouseout: (e) => {
                const marker = e.target
                marker.setStyle({
                  weight: 2,
                  fillOpacity: 0.6,
                  color: color,
                })
                marker.setRadius(baseRadius)
                marker.closePopup()
              },
            }}
          >
            <Popup>
              <div className="min-w-48">
                <div className="font-semibold text-gray-900 mb-2">
                  {hotspot.lsoa_name || hotspot.lsoa_code}
                </div>
                <span className={`text-xs px-2 py-1 rounded ${RISK_BADGES[riskCategory]}`}>
                  {riskCategory} Risk
                </span>
                <div className="text-sm mt-2 space-y-1">
                  <p><span className="text-gray-500">Total Accidents:</span> {hotspot.accident_count}</p>
                  <p><span className="text-gray-500">Fatal:</span> {hotspot.fatal_count}</p>
                  <p><span className="text-gray-500">Serious:</span> {hotspot.serious_count}</p>
                  <p><span className="text-gray-500">Risk Score:</span> {hotspot.risk_score?.toFixed(1)}</p>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}

// Top hotspots table
function HotspotTable({ hotspots }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left">Rank</th>
            <th className="px-4 py-3 text-left">Location</th>
            <th className="px-4 py-3 text-left">Risk</th>
            <th className="px-4 py-3 text-right">Score</th>
            <th className="px-4 py-3 text-right">Accidents</th>
            <th className="px-4 py-3 text-right">Fatal</th>
            <th className="px-4 py-3 text-right">Serious</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {hotspots.slice(0, 25).map((h, i) => {
            const riskCategory = h.risk_category || getRiskCategory(h.risk_score, h.accident_count)
            return (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{i + 1}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{h.lsoa_name || h.lsoa_code}</div>
                  <div className="text-xs text-gray-500">{h.lsoa_code}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded ${RISK_BADGES[riskCategory]}`}>
                    {riskCategory}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono">{h.risk_score?.toFixed(1)}</td>
                <td className="px-4 py-3 text-right">{h.accident_count?.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-red-600">{h.fatal_count}</td>
                <td className="px-4 py-3 text-right text-amber-600">{h.serious_count}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// Accident conditions charts
function AccidentConditionsCharts({ conditions }) {
  if (!conditions) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Weather Conditions - Horizontal Bar */}
      {conditions.weather && conditions.weather.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="font-semibold text-gray-900 mb-4">🌤️ Weather Conditions</h4>
          <div className="space-y-3">
            {(() => {
              const weatherData = conditions.weather.slice(0, 6)
              const maxCount = Math.max(...weatherData.map(w => w.count || 0))
              const total = weatherData.reduce((sum, w) => sum + (w.count || 0), 0)
              
              return weatherData.map((w, i) => {
                const barWidth = maxCount > 0 ? ((w.count || 0) / maxCount) * 100 : 0
                const percentage = total > 0 ? ((w.count || 0) / total) * 100 : 0
                
                return (
                  <div key={i} className="group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600 truncate flex-1" title={w.name}>{w.name}</span>
                      <span className="text-xs font-bold text-gray-900 ml-2">
                        {(w.count || 0).toLocaleString()}
                        <span className="text-gray-400 font-normal ml-1">({percentage.toFixed(0)}%)</span>
                      </span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300 group-hover:opacity-80"
                        style={{ width: `${barWidth}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        </div>
      )}

      {/* Light Conditions */}
      {conditions.light && conditions.light.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="font-semibold text-gray-900 mb-4">Light Conditions</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={conditions.light} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Road Surface */}
      {conditions.road_surface && conditions.road_surface.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="font-semibold text-gray-900 mb-4">Road Surface</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={conditions.road_surface}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10, angle: -45 }} height={60} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#16a34a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Road Type */}
      {conditions.road_type && conditions.road_type.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="font-semibold text-gray-900 mb-4">Road Type</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={conditions.road_type}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10, angle: -45 }} height={60} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

// Main Hotspots component
export default function Hotspots() {
  const [hotspots, setHotspots] = useState([])
  const [heatmapData, setHeatmapData] = useState([])
  const [conditions, setConditions] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedYear, setSelectedYear] = useState('2023')
  const [limit, setLimit] = useState(100)
  const [showHeatmap, setShowHeatmap] = useState(false) // Start with markers view

  useEffect(() => {
    loadData()
  }, [selectedYear, limit])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const yearParam = selectedYear || undefined
      
      const [hotspotsRes, heatmapRes, conditionsRes] = await Promise.all([
        getHotspots(yearParam, limit).catch(e => { console.error('Hotspots error:', e); return { data: [] } }),
        getHeatmapData(yearParam, 2000).catch(e => { console.error('Heatmap error:', e); return { data: [] } }),
        getAccidentConditions(yearParam).catch(e => { console.error('Conditions error:', e); return { data: null } })
      ])

      console.log('Hotspots loaded:', hotspotsRes.data?.length || 0)
      console.log('Heatmap loaded:', heatmapRes.data?.length || 0)

      setHotspots(hotspotsRes.data || [])
      setHeatmapData(heatmapRes.data || [])
      setConditions(conditionsRes.data || null)
    } catch (err) {
      console.error('Failed to load hotspots:', err)
      setError(err.message)
      setHotspots([])
    } finally {
      setLoading(false)
    }
  }

  // Calculate summary stats
  const stats = {
    total: hotspots.length,
    critical: hotspots.filter(h => getRiskCategory(h.risk_score, h.accident_count) === 'Critical').length,
    veryHigh: hotspots.filter(h => getRiskCategory(h.risk_score, h.accident_count) === 'Very High').length,
    high: hotspots.filter(h => getRiskCategory(h.risk_score, h.accident_count) === 'High').length,
    totalAccidents: hotspots.reduce((sum, h) => sum + (h.accident_count || 0), 0),
    totalFatal: hotspots.reduce((sum, h) => sum + (h.fatal_count || 0), 0),
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accident Hotspots</h1>
          <p className="text-gray-500">Areas with highest risk scores and accident concentrations</p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          Error loading data: {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">All Years</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
              <option value="2022">2022</option>
              <option value="2021">2021</option>
              <option value="2020">2020</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Show Top</label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="250">250</option>
              <option value="500">500</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHeatmap(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                showHeatmap 
                  ? 'bg-orange-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Flame className="w-4 h-4" />
              Heatmap
            </button>
            <button
              onClick={() => setShowHeatmap(false)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                !showHeatmap 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <MapIcon className="w-4 h-4" />
              Markers
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <StatCard
              title="Total Areas"
              value={stats.total.toLocaleString()}
              color="blue"
            />
            <StatCard
              title="Critical Risk"
              value={stats.critical}
              color="red"
            />
            <StatCard
              title="Very High Risk"
              value={stats.veryHigh}
              color="red"
            />
            <StatCard
              title="High Risk"
              value={stats.high}
              color="amber"
            />
            <StatCard
              title="Total Accidents"
              value={stats.totalAccidents.toLocaleString()}
              color="blue"
            />
            <StatCard
              title="Fatal Accidents"
              value={stats.totalFatal.toLocaleString()}
              color="red"
            />
          </div>

          {/* Map */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                {showHeatmap ? <Flame className="w-4 h-4 text-orange-600" /> : <MapPin className="w-4 h-4" />}
                {showHeatmap ? 'Accident Heatmap' : 'Hotspot Locations'}
                <span className="text-sm font-normal text-gray-500">
                  ({showHeatmap ? `${heatmapData.length.toLocaleString()} points` : `${hotspots.length} areas`})
                </span>
              </h3>
            </div>
            <div className="h-[500px]">
              <HotspotMap 
                hotspots={hotspots} 
                heatmapData={heatmapData}
                showHeatmap={showHeatmap}
              />
            </div>
          </div>

          {/* Accident Conditions */}
          {conditions && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Accident Conditions Analysis
              </h3>
              <AccidentConditionsCharts conditions={conditions} />
            </div>
          )}

          {/* Top Hotspots Table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                Top Risk Areas
              </h3>
            </div>
            <HotspotTable hotspots={hotspots} />
          </div>
        </>
      )}
    </div>
  )
}
