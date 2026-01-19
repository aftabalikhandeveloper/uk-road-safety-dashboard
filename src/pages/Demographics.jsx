import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import api from '../services/api';

const COLORS = {
  male: '#3B82F6',
  female: '#EC4899',
  fatal: '#EF4444',
  serious: '#F59E0B',
  slight: '#22C55E',
  children: '#8B5CF6',
  youngAdults: '#06B6D4',
  adults: '#10B981',
  elderly: '#F97316'
};

export default function Demographics() {
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState(null);
  const [childStats, setChildStats] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, [selectedYear]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const yearParam = selectedYear ? `?year=${selectedYear}` : '';
      const [summaryRes, trendsRes, childRes] = await Promise.all([
        api.get(`/demographics/summary${yearParam}`),
        api.get('/demographics/trends?start_year=2019&end_year=2023'),
        api.get(`/demographics/children${yearParam}`)
      ]);
      
      setSummary(summaryRes.data);
      setTrends(trendsRes.data);
      setChildStats(childRes.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => num?.toLocaleString() || '0';

  // Prepare gender data for pie chart
  const genderData = summary?.gender?.filter(g => g.code > 0).map(g => ({
    name: g.name,
    value: g.count,
    fatal: g.fatal,
    serious: g.serious
  })) || [];

  // Prepare age data for bar chart
  const ageData = summary?.age_groups?.map(ag => ({
    name: ag.range,
    count: ag.count,
    fatal: ag.fatal,
    serious: ag.serious,
    ksi_rate: ((ag.fatal + ag.serious) / ag.count * 100).toFixed(1)
  })) || [];

  // Prepare casualty class data
  const classData = summary?.casualty_class?.map(c => ({
    name: c.name,
    count: c.count,
    fatal: c.fatal,
    serious: c.serious,
    percentage: c.percentage
  })) || [];

  // Prepare trend data
  const genderTrendData = trends?.gender_trends || [];
  const ageTrendData = trends?.age_trends || [];

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Casualty Demographics</h1>
            <p className="text-gray-400">
              Analysis of casualties by age, gender, and type
              {summary?.year && ` for ${summary.year}`}
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <select
              value={selectedYear || ''}
              onChange={(e) => setSelectedYear(e.target.value ? parseInt(e.target.value) : null)}
              className="bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700"
            >
              <option value="">All Years</option>
              {[2023, 2022, 2021, 2020, 2019].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-12">Loading demographics...</div>
        ) : error ? (
          <div className="bg-red-900/30 text-red-400 p-4 rounded-lg">{error}</div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="text-gray-400 text-sm">Total Casualties</div>
                <div className="text-3xl font-bold text-white">
                  {formatNumber(summary?.total_casualties)}
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="text-gray-400 text-sm">Male</div>
                <div className="text-3xl font-bold text-blue-400">
                  {genderData.find(g => g.name === 'Male')?.value?.toLocaleString() || 0}
                </div>
                <div className="text-gray-500 text-sm">
                  {((genderData.find(g => g.name === 'Male')?.value / summary?.total_casualties) * 100).toFixed(1)}%
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="text-gray-400 text-sm">Female</div>
                <div className="text-3xl font-bold text-pink-400">
                  {genderData.find(g => g.name === 'Female')?.value?.toLocaleString() || 0}
                </div>
                <div className="text-gray-500 text-sm">
                  {((genderData.find(g => g.name === 'Female')?.value / summary?.total_casualties) * 100).toFixed(1)}%
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="text-gray-400 text-sm">Children (&lt;16)</div>
                <div className="text-3xl font-bold text-purple-400">
                  {formatNumber(childStats?.total_children)}
                </div>
                <div className="text-gray-500 text-sm">
                  {((childStats?.total_children / summary?.total_casualties) * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Gender Breakdown */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Gender Distribution</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={genderData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        <Cell fill={COLORS.male} />
                        <Cell fill={COLORS.female} />
                      </Pie>
                      <Tooltip 
                        formatter={(value) => value.toLocaleString()}
                        contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  {genderData.map((g, idx) => (
                    <div key={idx} className="text-center">
                      <div className="text-gray-400 text-sm">{g.name} KSI</div>
                      <div className="text-white font-semibold">
                        {formatNumber(g.fatal + g.serious)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Casualty Class */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Casualty Type</h3>
                <div className="space-y-4">
                  {classData.map((c, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-300">{c.name}</span>
                        <span className="text-gray-400">{formatNumber(c.count)} ({c.percentage}%)</span>
                      </div>
                      <div className="relative h-8 bg-gray-700 rounded-lg overflow-hidden">
                        <div 
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-600 to-blue-400"
                          style={{ width: `${c.percentage}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-end pr-3">
                          <span className="text-xs text-gray-300">
                            <span className="text-red-400">{c.fatal} fatal</span>
                            <span className="mx-1">•</span>
                            <span className="text-yellow-400">{formatNumber(c.serious)} serious</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Age Distribution */}
            <div className="bg-gray-800 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">Age Distribution</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ageData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#9CA3AF" 
                      tick={{ fill: '#9CA3AF', fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                      formatter={(value, name) => [value.toLocaleString(), name]}
                    />
                    <Legend />
                    <Bar dataKey="count" name="Total" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="serious" name="Serious" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="fatal" name="Fatal" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Trends */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Gender Trends */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Gender Trends (2019-2023)</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={genderTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="year" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                        formatter={(value) => value.toLocaleString()}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="male" name="Male" stroke={COLORS.male} strokeWidth={2} dot={{ fill: COLORS.male }} />
                      <Line type="monotone" dataKey="female" name="Female" stroke={COLORS.female} strokeWidth={2} dot={{ fill: COLORS.female }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Age Group Trends */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Age Group Trends</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={ageTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="year" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                        formatter={(value) => value.toLocaleString()}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="children_under_16" name="Children" stroke={COLORS.children} strokeWidth={2} />
                      <Line type="monotone" dataKey="young_adults_16_24" name="16-24" stroke={COLORS.youngAdults} strokeWidth={2} />
                      <Line type="monotone" dataKey="adults_25_64" name="25-64" stroke={COLORS.adults} strokeWidth={2} />
                      <Line type="monotone" dataKey="elderly_65_plus" name="65+" stroke={COLORS.elderly} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Child Safety Focus */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">🧒 Child Safety Focus (Under 16)</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-gray-900 rounded-lg p-4 text-center">
                  <div className="text-gray-400 text-sm">Total</div>
                  <div className="text-2xl font-bold text-purple-400">{formatNumber(childStats?.total_children)}</div>
                </div>
                <div className="bg-gray-900 rounded-lg p-4 text-center">
                  <div className="text-gray-400 text-sm">Fatal</div>
                  <div className="text-2xl font-bold text-red-400">{childStats?.fatal || 0}</div>
                </div>
                <div className="bg-gray-900 rounded-lg p-4 text-center">
                  <div className="text-gray-400 text-sm">Serious</div>
                  <div className="text-2xl font-bold text-yellow-400">{formatNumber(childStats?.serious)}</div>
                </div>
                <div className="bg-gray-900 rounded-lg p-4 text-center">
                  <div className="text-gray-400 text-sm">Avg Age</div>
                  <div className="text-2xl font-bold text-white">{childStats?.avg_age || '-'}</div>
                </div>
                <div className="bg-gray-900 rounded-lg p-4 text-center">
                  <div className="text-gray-400 text-sm">Male/Female</div>
                  <div className="text-lg font-bold">
                    <span className="text-blue-400">{formatNumber(childStats?.male)}</span>
                    <span className="text-gray-500 mx-1">/</span>
                    <span className="text-pink-400">{formatNumber(childStats?.female)}</span>
                  </div>
                </div>
              </div>
              
              {/* Child by Role */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-gray-300 font-medium mb-3">By Age Group</h4>
                  <div className="space-y-2">
                    {childStats?.by_age?.map((ag, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-gray-900 rounded px-4 py-2">
                        <span className="text-gray-300">{ag.range}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-white font-medium">{formatNumber(ag.count)}</span>
                          <span className="text-xs text-red-400">{ag.fatal} fatal</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-gray-300 font-medium mb-3">By Role</h4>
                  <div className="space-y-2">
                    {childStats?.by_class?.map((c, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-gray-900 rounded px-4 py-2">
                        <span className="text-gray-300">{c.class}</span>
                        <span className="text-white font-medium">{formatNumber(c.count)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
