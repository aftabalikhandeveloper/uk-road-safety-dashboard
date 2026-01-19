import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Key, Copy, RefreshCw, Check, AlertTriangle, TrendingUp, Clock, Zap } from 'lucide-react';

export default function Usage() {
  const { user, regenerateApiKey } = useAuth();
  const [usageData, setUsageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/users/usage-stats');
      setUsageData(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyApiKey = () => {
    if (user?.api_key) {
      navigator.clipboard.writeText(user.api_key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRegenerateKey = async () => {
    if (!confirm('Are you sure? This will invalidate your current API key.')) return;
    
    setRegenerating(true);
    const result = await regenerateApiKey();
    if (!result.success) {
      setError(result.error);
    }
    setRegenerating(false);
  };

  const formatNumber = (num) => {
    if (num === undefined || num === null) return '0';
    return num.toLocaleString();
  };

  const getUsagePercentage = () => {
    if (!usageData?.rate_limit) return 0;
    const used = usageData.current_hour_usage;
    const limit = usageData.rate_limit;
    return Math.min(100, (used / limit) * 100);
  };

  const getUsageColor = () => {
    const pct = getUsagePercentage();
    if (pct > 90) return 'bg-red-500';
    if (pct > 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getTierBadgeColor = (tier) => {
    switch (tier) {
      case 'professional': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'developer': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">API Usage & Settings</h1>
          <p className="text-gray-400">Manage your API key and monitor usage</p>
        </div>

        {/* API Key Section */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-blue-400" />
              Your API Key
            </h2>
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getTierBadgeColor(user?.tier)}`}>
              {user?.tier?.toUpperCase() || 'FREE'} TIER
            </span>
          </div>
          
          <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm">
            <div className="flex items-center justify-between">
              <code className="text-green-400 break-all">{user?.api_key || 'Loading...'}</code>
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={copyApiKey}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                  title="Copy API Key"
                >
                  {copied ? (
                    <Check className="w-5 h-5 text-green-400" />
                  ) : (
                    <Copy className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                <button
                  onClick={handleRegenerateKey}
                  disabled={regenerating}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                  title="Regenerate API Key"
                >
                  <RefreshCw className={`w-5 h-5 text-gray-400 ${regenerating ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>
          
          <div className="mt-4 text-sm text-gray-400">
            <p className="mb-2">Use your API key in requests:</p>
            <code className="block bg-gray-900 p-3 rounded text-xs text-gray-300">
              curl -H "X-API-Key: {user?.api_key?.substring(0, 20)}..." https://api.example.com/api/v1/accidents
            </code>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-12">Loading usage data...</div>
        ) : error ? (
          <div className="bg-red-900/30 text-red-400 p-4 rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            {error}
          </div>
        ) : (
          <>
            {/* Rate Limit Status */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                  <Zap className="w-4 h-4" />
                  Rate Limit
                </div>
                <div className="text-2xl font-bold text-white">
                  {formatNumber(usageData?.rate_limit)}
                </div>
                <div className="text-gray-500 text-sm">requests/hour</div>
              </div>

              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                  <TrendingUp className="w-4 h-4" />
                  This Hour
                </div>
                <div className="text-2xl font-bold text-white">
                  {formatNumber(usageData?.current_hour_usage)}
                </div>
                <div className="mt-2">
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${getUsageColor()}`}
                      style={{ width: `${getUsagePercentage()}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                  <Clock className="w-4 h-4" />
                  Today
                </div>
                <div className="text-2xl font-bold text-white">
                  {formatNumber(usageData?.today_usage)}
                </div>
                <div className="text-gray-500 text-sm">requests</div>
              </div>

              <div className="bg-gray-800 rounded-lg p-6">
                <div className="text-gray-400 text-sm mb-1">Remaining</div>
                <div className="text-2xl font-bold text-green-400">
                  {formatNumber(usageData?.remaining_requests)}
                </div>
                <div className="text-gray-500 text-sm">this hour</div>
              </div>
            </div>

            {/* Usage Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Top Endpoints */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Top Endpoints</h3>
                {usageData?.top_endpoints?.length > 0 ? (
                  <div className="space-y-3">
                    {usageData.top_endpoints.map((endpoint, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-gray-500 text-sm w-6">{idx + 1}.</span>
                          <code className="text-sm text-gray-300">{endpoint.endpoint}</code>
                        </div>
                        <span className="text-white font-medium">{formatNumber(endpoint.count)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No API calls yet</p>
                )}
              </div>

              {/* Hourly Breakdown */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Last 24 Hours</h3>
                {usageData?.hourly_breakdown?.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {usageData.hourly_breakdown.slice().reverse().map((hour, idx) => {
                      const date = new Date(hour.hour);
                      const formatted = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                      const maxCount = Math.max(...usageData.hourly_breakdown.map(h => h.count));
                      const width = maxCount > 0 ? (hour.count / maxCount * 100) : 0;
                      
                      return (
                        <div key={idx} className="flex items-center gap-3">
                          <span className="text-gray-500 text-sm w-16">{formatted}</span>
                          <div className="flex-1 bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full"
                              style={{ width: `${width}%` }}
                            />
                          </div>
                          <span className="text-white text-sm w-12 text-right">{hour.count}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No activity in the last 24 hours</p>
                )}
              </div>
            </div>

            {/* Account Stats */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Account Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <div className="text-gray-400 text-sm">Total Requests</div>
                  <div className="text-xl font-bold text-white">{formatNumber(usageData?.total_usage)}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm">Tier</div>
                  <div className="text-xl font-bold text-white capitalize">{usageData?.tier_name || user?.tier}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm">Account Created</div>
                  <div className="text-xl font-bold text-white">
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm">Email</div>
                  <div className="text-lg font-medium text-white truncate">{user?.email}</div>
                </div>
              </div>
            </div>

            {/* Upgrade CTA */}
            {user?.tier === 'free' && (
              <div className="mt-6 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Need more requests?</h3>
                    <p className="text-gray-400 text-sm mt-1">
                      Upgrade to Developer (5,000/hr) or Professional (25,000/hr) tier
                    </p>
                  </div>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                    View Plans
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
