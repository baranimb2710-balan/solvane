import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import TopBar from '../../components/TopBar';
import FloatingChatButton from '../../components/FloatingChatButton';
import {
  getAdminStats,
  getAdminUsers,
  getAdminLoginLogs,
  getAdminChatLogs,
  downloadAdminExportCsv,
} from '../../services/api';

/**
 * Solvane - Admin Portal ("/admin")
 * Restricted to administrators (redirects non-admins via AdminRoute).
 * 
 * Features:
 * - Overview tab with 6 metrics cards & quick action links
 * - Users tab with search, pagination & CSV export
 * - Login Logs tab with status filters, pagination & CSV export
 * - Chat Questions tab with user details & timestamp
 * - Places Management navigation link
 * - Fully mobile responsive with horizontally scrolling tables
 */
export default function AdminDashboard() {
  const navigate = useNavigate();

  // Active tab: 'overview' | 'users' | 'logins' | 'chat' | 'places'
  const [activeTab, setActiveTab] = useState('overview');

  // Overview Stats
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState('');

  // Users State
  const [users, setUsers] = useState([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [usersPages, setUsersPages] = useState(1);
  const [userSearch, setUserSearch] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');

  // Login Logs State
  const [logs, setLogs] = useState([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(1);
  const [logsPages, setLogsPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState(''); // '' (all), 'true', 'false'
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState('');

  // Chat Logs State
  const [chatLogs, setChatLogs] = useState([]);
  const [chatTotal, setChatTotal] = useState(0);
  const [chatPage, setChatPage] = useState(1);
  const [chatPages, setChatPages] = useState(1);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');

  // CSV Export Loading
  const [exportingUsers, setExportingUsers] = useState(false);
  const [exportingLogs, setExportingLogs] = useState(false);

  // Load Overview Stats
  const fetchStats = async () => {
    setStatsLoading(true);
    setStatsError('');
    const res = await getAdminStats();
    setStatsLoading(false);
    if (res.success && res.data) {
      setStats(res.data);
    } else {
      setStatsError(res.error || 'Failed to load system statistics.');
    }
  };

  // Load Users
  const fetchUsers = async (page = 1, search = userSearch) => {
    setUsersLoading(true);
    setUsersError('');
    const res = await getAdminUsers({ page, limit: 15, search });
    setUsersLoading(false);
    if (res.success && res.data) {
      setUsers(res.data.users || []);
      setUsersTotal(res.data.total || 0);
      setUsersPage(res.data.page || 1);
      setUsersPages(res.data.total_pages || 1);
    } else {
      setUsersError(res.error || 'Failed to load user accounts.');
    }
  };

  // Load Login Logs
  const fetchLogs = async (page = 1, successFilter = statusFilter) => {
    setLogsLoading(true);
    setLogsError('');
    const parsedSuccess = successFilter === 'true' ? true : successFilter === 'false' ? false : null;
    const res = await getAdminLoginLogs({ page, limit: 20, success: parsedSuccess });
    setLogsLoading(false);
    if (res.success && res.data) {
      setLogs(res.data.logs || []);
      setLogsTotal(res.data.total || 0);
      setLogsPage(res.data.page || 1);
      setLogsPages(res.data.total_pages || 1);
    } else {
      setLogsError(res.error || 'Failed to load login audit logs.');
    }
  };

  // Load Chat Logs
  const fetchChatLogs = async (page = 1) => {
    setChatLoading(true);
    setChatError('');
    const res = await getAdminChatLogs({ page, limit: 20 });
    setChatLoading(false);
    if (res.success && res.data) {
      setChatLogs(res.data.questions || []);
      setChatTotal(res.data.total || 0);
      setChatPage(res.data.page || 1);
      setChatPages(res.data.total_pages || 1);
    } else {
      setChatError(res.error || 'Failed to load tourist chat questions.');
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers(1, userSearch);
    } else if (activeTab === 'logins') {
      fetchLogs(1, statusFilter);
    } else if (activeTab === 'chat') {
      fetchChatLogs(1);
    }
  }, [activeTab]);

  const handleUserSearchSubmit = (e) => {
    e.preventDefault();
    fetchUsers(1, userSearch);
  };

  const handleExportUsers = async () => {
    setExportingUsers(true);
    await downloadAdminExportCsv('users');
    setExportingUsers(false);
  };

  const handleExportLogs = async () => {
    setExportingLogs(true);
    await downloadAdminExportCsv('login-logs');
    setExportingLogs(false);
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'Never';
    try {
      const d = new Date(isoString);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-orange-500 selection:text-white">
      {/* Background radial glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-sky-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/3 left-1/4 w-[400px] h-[400px] bg-orange-600/10 rounded-full blur-[100px]" />
      </div>

      <TopBar active="admin" />

      <main className="relative z-10 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 flex-1">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl sm:text-3xl font-black text-white">⚡ Solvane Admin Portal</span>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-400/30">
                Restricted Access
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Platform analytics, user management, audit logs, and destination records.
            </p>
          </div>

          <Link
            to="/admin/places"
            className="self-start sm:self-auto px-4 py-2 rounded-xl text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/15 transition-all flex items-center gap-1.5"
          >
            <span>🏛️</span>
            <span>Places Management</span>
          </Link>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-white/5">
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'users', label: 'Users', icon: '👥' },
            { id: 'logins', label: 'Login Logs', icon: '🔐' },
            { id: 'chat', label: 'Chat Questions', icon: '💬' },
            { id: 'places', label: 'Places Manager', icon: '🗺️' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 border ${
                  isActive
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-400 shadow-md shadow-orange-500/20'
                    : 'bg-slate-900/60 text-slate-300 border-white/10 hover:border-orange-400/30 hover:bg-slate-850'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: OVERVIEW METRICS */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in">
            {statsError && (
              <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/40 text-xs text-red-200 flex items-center justify-between">
                <span>⚠️ {statsError}</span>
                <button
                  onClick={fetchStats}
                  className="px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 hover:bg-red-500/30 border border-red-400/40"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Stat Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {[
                {
                  label: 'Total Registered Users',
                  value: stats?.total_users ?? (statsLoading ? '...' : 0),
                  icon: '👥',
                  color: 'from-sky-500 to-blue-600',
                  badge: 'All time',
                },
                {
                  label: 'New Users (Last 7 Days)',
                  value: stats?.new_users_7d ?? (statsLoading ? '...' : 0),
                  icon: '✨',
                  color: 'from-amber-400 to-orange-500',
                  badge: 'Growth',
                },
                {
                  label: 'Successful Logins',
                  value: stats?.total_logins ?? (statsLoading ? '...' : 0),
                  icon: '🔐',
                  color: 'from-emerald-400 to-teal-600',
                  badge: 'Authentication',
                },
                {
                  label: 'Failed Logins (24 Hours)',
                  value: stats?.failed_logins_24h ?? (statsLoading ? '...' : 0),
                  icon: '🛡️',
                  color: stats?.failed_logins_24h > 0 ? 'from-red-500 to-rose-600' : 'from-slate-600 to-slate-700',
                  badge: 'Security alert',
                },
                {
                  label: 'Saved Trip Plans',
                  value: stats?.total_saved_plans ?? (statsLoading ? '...' : 0),
                  icon: '🧭',
                  color: 'from-orange-500 to-amber-600',
                  badge: 'Saved Itineraries',
                },
                {
                  label: 'Chat Questions Asked',
                  value: stats?.total_chat_questions ?? (statsLoading ? '...' : 0),
                  icon: '💬',
                  color: 'from-indigo-500 to-purple-600',
                  badge: 'AI Guide Usage',
                },
              ].map((card, idx) => (
                <div
                  key={idx}
                  className="bg-slate-900/80 border border-white/10 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col justify-between space-y-3 relative overflow-hidden group hover:border-orange-400/30 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl sm:text-3xl">{card.icon}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400">
                      {card.badge}
                    </span>
                  </div>
                  <div>
                    <span className="text-2xl sm:text-3xl font-black text-white tracking-tight block">
                      {card.value}
                    </span>
                    <span className="text-xs text-slate-400 mt-1 block font-medium">
                      {card.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Actions Panel */}
            <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-6 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                Quick Administrative Actions
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <button
                  onClick={() => setActiveTab('users')}
                  className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-left space-y-1 transition-all cursor-pointer"
                >
                  <span className="text-lg">👥</span>
                  <p className="text-xs font-bold text-white">Browse Users</p>
                  <p className="text-[11px] text-slate-400">View registered accounts & search</p>
                </button>

                <button
                  onClick={() => setActiveTab('logins')}
                  className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-left space-y-1 transition-all cursor-pointer"
                >
                  <span className="text-lg">🔐</span>
                  <p className="text-xs font-bold text-white">Audit Logins</p>
                  <p className="text-[11px] text-slate-400">Inspect authentication attempts</p>
                </button>

                <button
                  onClick={handleExportUsers}
                  disabled={exportingUsers}
                  className="p-4 rounded-2xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-400/30 text-left space-y-1 transition-all cursor-pointer"
                >
                  <span className="text-lg">📥</span>
                  <p className="text-xs font-bold text-sky-200">
                    {exportingUsers ? 'Exporting...' : 'Export Users CSV'}
                  </p>
                  <p className="text-[11px] text-slate-400">Download full user list</p>
                </button>

                <button
                  onClick={handleExportLogs}
                  disabled={exportingLogs}
                  className="p-4 rounded-2xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-400/30 text-left space-y-1 transition-all cursor-pointer"
                >
                  <span className="text-lg">📥</span>
                  <p className="text-xs font-bold text-orange-200">
                    {exportingLogs ? 'Exporting...' : 'Export Logins CSV'}
                  </p>
                  <p className="text-[11px] text-slate-400">Download login audit trail</p>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: USERS TABLE */}
        {/* ========================================================================= */}
        {activeTab === 'users' && (
          <div className="space-y-4 animate-fade-in">
            {/* Search Bar & Export Button */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <form onSubmit={handleUserSearchSubmit} className="flex items-center gap-2 flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Search by username or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-400 transition-colors"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 shadow-md transition-all cursor-pointer shrink-0"
                >
                  Search
                </button>
              </form>

              <button
                onClick={handleExportUsers}
                disabled={exportingUsers}
                className="px-4 py-2 rounded-xl text-xs font-bold text-sky-200 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/30 transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto shrink-0"
              >
                <span>📥</span>
                <span>{exportingUsers ? 'Exporting...' : 'Download CSV'}</span>
              </button>
            </div>

            {usersError && (
              <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-xs text-red-200 flex items-center justify-between">
                <span>⚠️ {usersError}</span>
                <button
                  onClick={() => fetchUsers(usersPage, userSearch)}
                  className="px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 hover:bg-red-500/30"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Horizontally scrolling table container */}
            <div className="bg-slate-900/80 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5 text-slate-300">
                      <th className="p-3.5 pl-5 font-semibold">User ID</th>
                      <th className="p-3.5 font-semibold">Username</th>
                      <th className="p-3.5 font-semibold">Email</th>
                      <th className="p-3.5 font-semibold">Role</th>
                      <th className="p-3.5 font-semibold">Total Logins</th>
                      <th className="p-3.5 font-semibold">Registered</th>
                      <th className="p-3.5 pr-5 font-semibold">Last Login</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-200">
                    {usersLoading && (
                      <tr>
                        <td colSpan="7" className="p-8 text-center text-slate-400">
                          Loading users...
                        </td>
                      </tr>
                    )}

                    {!usersLoading && users.length === 0 && (
                      <tr>
                        <td colSpan="7" className="p-8 text-center text-slate-400">
                          No users found matching your criteria.
                        </td>
                      </tr>
                    )}

                    {!usersLoading &&
                      users.map((u) => (
                        <tr key={u.user_id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-3.5 pl-5 font-mono text-slate-400">#{u.user_id}</td>
                          <td className="p-3.5 font-bold text-white">{u.username}</td>
                          <td className="p-3.5 text-slate-300 font-mono text-[11px]">{u.email}</td>
                          <td className="p-3.5">
                            {u.is_admin ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-400/30">
                                Admin
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/10">
                                Tourist
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 font-semibold text-sky-300">{u.login_count}</td>
                          <td className="p-3.5 text-slate-400 text-[11px]">{formatDate(u.created_at)}</td>
                          <td className="p-3.5 pr-5 text-slate-400 text-[11px]">{formatDate(u.last_login)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Bar */}
              <div className="p-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                <span>
                  Showing {users.length} of {usersTotal} user{usersTotal !== 1 ? 's' : ''}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    disabled={usersPage <= 1 || usersLoading}
                    onClick={() => fetchUsers(usersPage - 1, userSearch)}
                    className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Previous
                  </button>
                  <span className="px-2 text-white font-medium">
                    {usersPage} / {usersPages}
                  </span>
                  <button
                    disabled={usersPage >= usersPages || usersLoading}
                    onClick={() => fetchUsers(usersPage + 1, userSearch)}
                    className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: LOGIN AUDIT LOGS */}
        {/* ========================================================================= */}
        {activeTab === 'logins' && (
          <div className="space-y-4 animate-fade-in">
            {/* Status Filter Chips & CSV Export */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Filter status:</span>
                {[
                  { id: '', label: 'All Logins' },
                  { id: 'true', label: 'Successful Only' },
                  { id: 'false', label: 'Failed Only' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      setStatusFilter(f.id);
                      fetchLogs(1, f.id);
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                      statusFilter === f.id
                        ? 'bg-orange-500/20 text-orange-400 border-orange-400/40 shadow-sm'
                        : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <button
                onClick={handleExportLogs}
                disabled={exportingLogs}
                className="px-4 py-2 rounded-xl text-xs font-bold text-orange-200 bg-orange-500/15 hover:bg-orange-500/25 border border-orange-400/30 transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto shrink-0"
              >
                <span>📥</span>
                <span>{exportingLogs ? 'Exporting...' : 'Download CSV'}</span>
              </button>
            </div>

            {logsError && (
              <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-xs text-red-200 flex items-center justify-between">
                <span>⚠️ {logsError}</span>
                <button
                  onClick={() => fetchLogs(logsPage, statusFilter)}
                  className="px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 hover:bg-red-500/30"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Table */}
            <div className="bg-slate-900/80 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5 text-slate-300">
                      <th className="p-3.5 pl-5 font-semibold">Log ID</th>
                      <th className="p-3.5 font-semibold">Timestamp</th>
                      <th className="p-3.5 font-semibold">User Account</th>
                      <th className="p-3.5 font-semibold">Email Attempted</th>
                      <th className="p-3.5 pr-5 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-200">
                    {logsLoading && (
                      <tr>
                        <td colSpan="5" className="p-8 text-center text-slate-400">
                          Loading audit logs...
                        </td>
                      </tr>
                    )}

                    {!logsLoading && logs.length === 0 && (
                      <tr>
                        <td colSpan="5" className="p-8 text-center text-slate-400">
                          No login events recorded for this selection.
                        </td>
                      </tr>
                    )}

                    {!logsLoading &&
                      logs.map((l) => (
                        <tr key={l.log_id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-3.5 pl-5 font-mono text-slate-400">#{l.log_id}</td>
                          <td className="p-3.5 text-slate-400 text-[11px]">{formatDate(l.time)}</td>
                          <td className="p-3.5 font-bold text-white">
                            {l.user_id ? `${l.username} (#${l.user_id})` : 'Unregistered'}
                          </td>
                          <td className="p-3.5 text-slate-300 font-mono text-[11px]">{l.email_attempted}</td>
                          <td className="p-3.5 pr-5">
                            {l.success ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-400/30">
                                ✓ Successful
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-400/30">
                                ✗ Failed
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="p-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                <span>
                  Showing {logs.length} of {logsTotal} log{logsTotal !== 1 ? 's' : ''}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    disabled={logsPage <= 1 || logsLoading}
                    onClick={() => fetchLogs(logsPage - 1, statusFilter)}
                    className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Previous
                  </button>
                  <span className="px-2 text-white font-medium">
                    {logsPage} / {logsPages}
                  </span>
                  <button
                    disabled={logsPage >= logsPages || logsLoading}
                    onClick={() => fetchLogs(logsPage + 1, statusFilter)}
                    className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: CHAT QUESTIONS */}
        {/* ========================================================================= */}
        {activeTab === 'chat' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <p>Questions tourists have asked the Solvane AI Guide.</p>
              <span>Total: {chatTotal} questions</span>
            </div>

            {chatError && (
              <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-xs text-red-200 flex items-center justify-between">
                <span>⚠️ {chatError}</span>
                <button
                  onClick={() => fetchChatLogs(chatPage)}
                  className="px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 hover:bg-red-500/30"
                >
                  Retry
                </button>
              </div>
            )}

            <div className="bg-slate-900/80 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5 text-slate-300">
                      <th className="p-3.5 pl-5 font-semibold">Log ID</th>
                      <th className="p-3.5 font-semibold">Timestamp</th>
                      <th className="p-3.5 font-semibold">Tourist User</th>
                      <th className="p-3.5 pr-5 font-semibold">Question Asked</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-200">
                    {chatLoading && (
                      <tr>
                        <td colSpan="4" className="p-8 text-center text-slate-400">
                          Loading questions...
                        </td>
                      </tr>
                    )}

                    {!chatLoading && chatLogs.length === 0 && (
                      <tr>
                        <td colSpan="4" className="p-8 text-center text-slate-400">
                          No tourist questions logged yet.
                        </td>
                      </tr>
                    )}

                    {!chatLoading &&
                      chatLogs.map((q) => (
                        <tr key={q.log_id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-3.5 pl-5 font-mono text-slate-400">#{q.log_id}</td>
                          <td className="p-3.5 text-slate-400 text-[11px] whitespace-nowrap">{formatDate(q.time)}</td>
                          <td className="p-3.5 font-bold text-white whitespace-nowrap">
                            {q.username}
                            {q.email && <span className="block text-[10px] text-slate-400 font-mono">{q.email}</span>}
                          </td>
                          <td className="p-3.5 pr-5 text-slate-200 leading-relaxed font-medium">
                            "{q.question}"
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="p-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                <span>
                  Showing {chatLogs.length} of {chatTotal} question{chatTotal !== 1 ? 's' : ''}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    disabled={chatPage <= 1 || chatLoading}
                    onClick={() => fetchChatLogs(chatPage - 1)}
                    className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Previous
                  </button>
                  <span className="px-2 text-white font-medium">
                    {chatPage} / {chatPages}
                  </span>
                  <button
                    disabled={chatPage >= chatPages || chatLoading}
                    onClick={() => fetchChatLogs(chatPage + 1)}
                    className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: PLACES MANAGEMENT REDIRECT / SHORTCUT */}
        {/* ========================================================================= */}
        {activeTab === 'places' && (
          <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-8 text-center space-y-4 max-w-lg mx-auto my-8 animate-fade-in">
            <div className="text-4xl">🏛️</div>
            <h3 className="text-lg font-bold text-white">Destinations & Places Manager</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Create, edit, verify, and delete Ramanathapuram tourist attractions in the SQLite database with full image compression and thumbnail support.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/admin/places"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 shadow-md transition-all text-center"
              >
                Open Places Directory
              </Link>
              <Link
                to="/admin/places/new"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/15 transition-all text-center"
              >
                + Add New Place
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* Footer Watermark */}
      <footer className="relative z-10 py-4 text-center text-[11px] text-slate-400 border-t border-white/5">
        Ramanathapuram AI Heritage Companion • Solvane Admin Portal
      </footer>

      <FloatingChatButton />
    </div>
  );
}
