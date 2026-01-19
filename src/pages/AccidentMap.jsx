import { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMapEvents, useMap } from 'react-leaflet'
import { Search, Filter, Crosshair, Layers, RefreshCw, ZoomIn } from 'lucide-react'
import { getNearbyAccidents } from '../services/api'
import 'leaflet/dist/leaflet.css'

// Debounce hook for search optimization
function useDebounce(callback, delay) {
  const timeoutRef = useRef(null)
  
  return useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = setTimeout(() => {
      callback(...args)
    }, delay)
  }, [callback, delay])
}

// Virtual marker rendering - only render visible markers
function useVisibleMarkers(accidents, maxVisible = 200) {
  return useMemo(() => {
    if (accidents.length <= maxVisible) return accidents
    // Prioritize by severity (fatal first) then take top N
    return [...accidents]
      .sort((a, b) => a.severity - b.severity)
      .slice(0, maxVisible)
  }, [accidents, maxVisible])
}

// Severity colors
const SEVERITY_COLORS = {
  1: '#dc2626', // Fatal - Red
  2: '#f59e0b', // Serious - Amber
  3: '#16a34a', // Slight - Green
}

const SEVERITY_LABELS = {
  1: 'Fatal',
  2: 'Serious',
  3: 'Slight',
}

// Map click handler component
function MapClickHandler({ onClick }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng)
    },
  })
  return null
}

// Accident marker component - Memoized for performance
const AccidentMarker = memo(function AccidentMarker({ accident }) {
  const color = SEVERITY_COLORS[accident.severity] || '#6b7280'
  const radius = accident.severity === 1 ? 8 : accident.severity === 2 ? 6 : 4

  // Handle both nested location object and direct lat/lng
  const lat = accident.location?.latitude || accident.latitude
  const lng = accident.location?.longitude || accident.longitude

  if (!lat || !lng) return null

  return (
    <CircleMarker
      center={[lat, lng]}
      radius={radius}
      pathOptions={{
        color: color,
        fillColor: color,
        fillOpacity: 0.7,
        weight: 2,
      }}
    >
      <Popup>
        <div className="min-w-48">
          <div className="font-semibold text-gray-900 mb-2">
            {SEVERITY_LABELS[accident.severity]} Accident
          </div>
          <div className="text-sm space-y-1">
            <p><span className="text-gray-500">Date:</span> {accident.accident_date}</p>
            <p><span className="text-gray-500">Time:</span> {accident.accident_time || 'N/A'}</p>
            <p><span className="text-gray-500">Casualties:</span> {accident.number_of_casualties}</p>
            <p><span className="text-gray-500">Distance:</span> {accident.distance_meters ? Math.round(accident.distance_meters) + 'm' : 'N/A'}</p>
            {accident.lsoa_code && (
              <p><span className="text-gray-500">LSOA:</span> {accident.lsoa_code}</p>
            )}
          </div>
        </div>
      </Popup>
    </CircleMarker>
  )
}, (prev, next) => prev.accident.accident_id === next.accident.accident_id)

// Filter panel - Memoized
const FilterPanel = memo(function FilterPanel({ filters, setFilters, onSearch, loading }) {
  const handleRadiusChange = useCallback((e) => {
    setFilters(prev => ({ ...prev, radius: Number(e.target.value) }))
  }, [setFilters])
  
  const handleYearChange = useCallback((e) => {
    setFilters(prev => ({ ...prev, year: e.target.value }))
  }, [setFilters])
  
  const handleSeverityChange = useCallback((e) => {
    setFilters(prev => ({ ...prev, severity: e.target.value }))
  }, [setFilters])
  
  const handleLimitChange = useCallback((e) => {
    setFilters(prev => ({ ...prev, limit: Number(e.target.value) }))
  }, [setFilters])

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <Filter className="w-4 h-4" />
        Filters
      </h3>

      <div className="space-y-4">
        {/* Radius */}
        <div>
          <label className="block text-sm text-gray-600 mb-1">
            Search Radius: {filters.radius}m
          </label>
          <input
            type="range"
            min="100"
            max="5000"
            step="100"
            value={filters.radius}
            onChange={handleRadiusChange}
            className="w-full"
          />
        </div>

        {/* Year */}
        <div>
          <label className="block text-sm text-gray-600 mb-1">Year</label>
          <select
            value={filters.year}
            onChange={(e) => setFilters({ ...filters, year: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">All Years</option>
            <option value="2024">2024</option>
            <option value="2023">2023</option>
            <option value="2022">2022</option>
            <option value="2021">2021</option>
            <option value="2020">2020</option>
          </select>
        </div>

        {/* Severity */}
        <div>
          <label className="block text-sm text-gray-600 mb-1">Severity</label>
          <select
            value={filters.severity}
            onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">All Severities</option>
            <option value="1">Fatal Only</option>
            <option value="2">Serious Only</option>
            <option value="3">Slight Only</option>
          </select>
        </div>

        {/* Limit */}
        <div>
          <label className="block text-sm text-gray-600 mb-1">Max Results</label>
          <select
            value={filters.limit}
            onChange={(e) => setFilters({ ...filters, limit: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="250">250</option>
            <option value="500">500</option>
          </select>
        </div>

        <button
          onClick={onSearch}
          disabled={loading}
          className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          {loading ? 'Searching...' : 'Search Area'}
        </button>
      </div>
    </div>
  )
})

// Legend component
function MapLegend() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <Layers className="w-4 h-4" />
        Legend
      </h3>
      <div className="space-y-2">
        {Object.entries(SEVERITY_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-center gap-2">
            <span
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: SEVERITY_COLORS[key] }}
            />
            <span className="text-sm text-gray-600">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Main AccidentMap component
export default function AccidentMap() {
  const [accidents, setAccidents] = useState([])
  const [loading, setLoading] = useState(false)
  const [center, setCenter] = useState({ lat: 51.5074, lng: -0.1278 }) // London
  const [filters, setFilters] = useState({
    radius: 1000,
    year: '',
    severity: '',
    limit: 100,
  })
  const [searchLocation, setSearchLocation] = useState(null)

  // Visible markers (optimized for performance)
  const visibleMarkers = useVisibleMarkers(accidents, 300)
  const hiddenCount = accidents.length - visibleMarkers.length

  // Memoized search function
  const searchNearby = useCallback(async (lat, lng) => {
    setLoading(true)
    try {
      const years = filters.year || null
      const response = await getNearbyAccidents(
        lat,
        lng,
        filters.radius,
        years,
        filters.limit
      )
      
      // The API returns { data: [...], center: {...}, radius_meters, total }
      let data = response.data?.data || response.data?.accidents || response.data || []
      
      // Apply severity filter client-side if API doesn't support it
      if (filters.severity) {
        data = data.filter(a => a.severity === Number(filters.severity))
      }
      
      setAccidents(data)
      setSearchLocation({ lat, lng })
    } catch (error) {
      console.error('Failed to load accidents:', error)
      setAccidents([])
    } finally {
      setLoading(false)
    }
  }, [filters.year, filters.radius, filters.limit, filters.severity])

  // Debounced map click to prevent rapid-fire requests
  const debouncedSearch = useDebounce(searchNearby, 300)

  const handleMapClick = useCallback((latlng) => {
    setCenter({ lat: latlng.lat, lng: latlng.lng })
    debouncedSearch(latlng.lat, latlng.lng)
  }, [debouncedSearch])

  const handleSearch = useCallback(() => {
    searchNearby(center.lat, center.lng)
  }, [searchNearby, center.lat, center.lng])
  
  // Initial load
  useEffect(() => {
    searchNearby(center.lat, center.lng)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleLocateMe = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setCenter({ lat: latitude, lng: longitude })
          searchNearby(latitude, longitude)
        },
        (error) => {
          console.error('Geolocation error:', error)
          alert('Unable to get your location')
        }
      )
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accident Map</h1>
          <p className="text-gray-500">Click on the map to search for accidents in that area</p>
        </div>

        <button
          onClick={handleLocateMe}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Crosshair className="w-4 h-4" />
          Use My Location
        </button>
      </div>

      {/* Map and Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <FilterPanel 
            filters={filters} 
            setFilters={setFilters} 
            onSearch={handleSearch}
            loading={loading}
          />
          <MapLegend />

          {/* Results info */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <div className="text-sm text-gray-600">
              {loading ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Loading...
                </div>
              ) : (
                <>
                  <p className="font-medium text-gray-900">
                    {accidents.length} accidents found
                  </p>
                  {hiddenCount > 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      Showing {visibleMarkers.length} on map (prioritizing severe)
                    </p>
                  )}
                  {searchLocation && (
                    <p className="mt-1">
                      Within {filters.radius}m of<br />
                      {searchLocation.lat.toFixed(4)}, {searchLocation.lng.toFixed(4)}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="lg:col-span-3 h-[600px] rounded-lg overflow-hidden border border-gray-200 shadow-sm">
          <MapContainer
            center={[center.lat, center.lng]}
            zoom={14}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            <MapClickHandler onClick={handleMapClick} />

            {/* Search radius circle */}
            {searchLocation && (
              <CircleMarker
                center={[searchLocation.lat, searchLocation.lng]}
                radius={5}
                pathOptions={{
                  color: '#2563eb',
                  fillColor: '#2563eb',
                  fillOpacity: 1,
                }}
              />
            )}

            {/* Accident markers - using optimized visible markers */}
            {visibleMarkers.map((accident, index) => (
              <AccidentMarker key={accident.accident_id || index} accident={accident} />
            ))}
          </MapContainer>
        </div>
      </div>

      {/* Accidents table */}
      {accidents.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Accident Details</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Time</th>
                  <th className="px-4 py-3 text-left">Severity</th>
                  <th className="px-4 py-3 text-left">Casualties</th>
                  <th className="px-4 py-3 text-left">Distance</th>
                  <th className="px-4 py-3 text-left">LSOA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {accidents.slice(0, 20).map((accident, index) => (
                  <tr key={accident.accident_id || index} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{accident.accident_date}</td>
                    <td className="px-4 py-3">{accident.accident_time || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`
                        px-2 py-1 rounded-full text-xs font-medium
                        ${accident.severity === 1 ? 'severity-fatal' :
                          accident.severity === 2 ? 'severity-serious' : 'severity-slight'}
                      `}>
                        {SEVERITY_LABELS[accident.severity]}
                      </span>
                    </td>
                    <td className="px-4 py-3">{accident.number_of_casualties}</td>
                    <td className="px-4 py-3">{accident.distance_meters ? Math.round(accident.distance_meters) + 'm' : '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{accident.lsoa_code || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
