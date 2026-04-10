// src/components/Dashboard.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchItems, fetchStats, createItem, updateItem, deleteItem } from '../api/itemApi';

const useDarkMode = () => {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('darkMode', JSON.stringify(dark));
  }, [dark]);
  return [dark, () => setDark(d => !d)];
};

const ITEMS_PER_PAGE = 10;

const STATUS_CFG = {
  active:    { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  pending:   { bg: 'bg-amber-100 dark:bg-amber-900/40',     text: 'text-amber-700 dark:text-amber-300',     dot: 'bg-amber-500'   },
  completed: { bg: 'bg-sky-100 dark:bg-sky-900/40',         text: 'text-sky-700 dark:text-sky-300',         dot: 'bg-sky-500'     },
};

const StatusBadge = ({ status }) => {
  const c = STATUS_CFG[status] || STATUS_CFG.active;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const StatCard = ({ label, value, from, to, icon }) => (
  <div className={`relative overflow-hidden rounded-2xl p-6 shadow-lg border border-white/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl`}
    style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }}>
    <div className="flex items-center justify-between mb-3">
      <span className="text-white/75 text-xs font-bold uppercase tracking-widest">{label}</span>
      <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white">{icon}</div>
    </div>
    <p className="text-4xl font-black text-white">{value}</p>
    <div className="absolute -bottom-5 -right-5 w-24 h-24 rounded-full bg-white/10" />
    <div className="absolute -bottom-10 -right-10 w-36 h-36 rounded-full bg-white/5" />
  </div>
);

const Spinner = () => <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />;

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [dark, toggleDark] = useDarkMode();

  const [items, setItems]             = useState([]);
  const [stats, setStats]             = useState({ total: 0, active: 0, pending: 0, completed: 0 });
  const [loading, setLoading]         = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [form, setForm]               = useState({ title: '', description: '', status: 'active' });
  const [formError, setFormError]     = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [search, setSearch]           = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteId, setDeleteId]       = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([fetchItems(), fetchStats()]);
      setItems(a.data.items);
      setStats(b.data.stats);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = useMemo(() => items.filter(item => {
    const q = search.toLowerCase();
    const matchQ = item.title.toLowerCase().includes(q) || (item.description || '').toLowerCase().includes(q);
    const matchS = filterStatus === 'all' || item.status === filterStatus;
    return matchQ && matchS;
  }), [items, search, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated  = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  useEffect(() => { setCurrentPage(1); }, [search, filterStatus]);

  const handleCreate = async (e) => {
    e.preventDefault(); setFormError(''); setFormSuccess('');
    if (!form.title.trim()) { setFormError('Title is required.'); return; }
    setFormLoading(true);
    try {
      await createItem(form);
      setForm({ title: '', description: '', status: 'active' });
      setFormSuccess('Item created!');
      await loadData();
      setTimeout(() => setFormSuccess(''), 3000);
    } catch (err) { setFormError(err.response?.data?.message || 'Failed.'); }
    finally { setFormLoading(false); }
  };

  const handleEditSave = async () => {
    if (!editingItem.title.trim()) return;
    setFormLoading(true);
    try {
      await updateItem(editingItem.id, { title: editingItem.title, description: editingItem.description, status: editingItem.status });
      setEditingItem(null); await loadData();
    } catch (err) { alert(err.response?.data?.message || 'Update failed.'); }
    finally { setFormLoading(false); }
  };

  const handleStatusChange = async (id, status) => {
    try { await updateItem(id, { status }); await loadData(); } catch (e) { console.error(e); }
  };

  const handleDelete = async () => {
    try { await deleteItem(deleteId); setDeleteId(null); await loadData(); }
    catch (err) { alert(err.response?.data?.message || 'Delete failed.'); }
  };

  const inputCls = "w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-200";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 transition-colors duration-300 font-sans">

      {/* NAVBAR */}
      <nav className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-gray-800/80 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
              </svg>
            </div>
            <div className="leading-tight">
              <p className="text-sm font-black text-gray-900 dark:text-white tracking-tight">TaskFlow</p>
              <p className="text-xs text-slate-400 dark:text-gray-500">Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Dark mode toggle */}
            <button onClick={toggleDark}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800 hover:text-violet-600 dark:hover:text-violet-400 transition-all duration-200"
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
              {dark ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" /></svg>
              )}
            </button>

            <div className="w-px h-6 bg-slate-200 dark:bg-gray-700" />

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-md">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block leading-tight">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{user?.name}</p>
                <p className="text-xs text-slate-400 dark:text-gray-500 truncate max-w-[140px]">{user?.email}</p>
              </div>
            </div>

            <button onClick={logout}
              className="ml-1 flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 px-3 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" /></svg>
              <span className="hidden sm:block">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* STATS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total" value={stats.total} from="#6366f1" to="#8b5cf6"
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" /></svg>} />
          <StatCard label="Active" value={stats.active} from="#10b981" to="#059669"
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>} />
          <StatCard label="Pending" value={stats.pending} from="#f59e0b" to="#d97706"
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>} />
          <StatCard label="Completed" value={stats.completed} from="#0ea5e9" to="#0284c7"
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>} />
        </div>

        {/* ADD ITEM FORM */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800 p-6 shadow-sm transition-colors duration-300">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            </div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Add New Item</h2>
          </div>

          {formError   && <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">{formError}</div>}
          {formSuccess && <div className="mb-4 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-sm flex items-center gap-2"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>{formSuccess}</div>}

          <form onSubmit={handleCreate}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input name="title" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Title *" className={inputCls} />
              <input name="description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Description (optional)" className={`${inputCls} md:col-span-2`} />
              <div className="flex gap-2">
                <select name="status" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                  className={inputCls}>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                </select>
                <button type="submit" disabled={formLoading}
                  className="shrink-0 px-5 py-2.5 text-sm font-bold rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-500/25 disabled:opacity-60 transition-all duration-200 flex items-center gap-2">
                  {formLoading ? <Spinner /> : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>}
                  Add
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* ITEMS TABLE */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800 overflow-hidden shadow-sm transition-colors duration-300">

          {/* Table toolbar */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-gray-800 flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">Your Items</h2>
              <p className="text-xs text-slate-400 dark:text-gray-500 mt-0.5">
                {filtered.length} result{filtered.length !== 1 ? 's' : ''}
                {search && <span> for "<span className="text-violet-600 dark:text-violet-400">{search}</span>"</span>}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
                </div>
                <input type="text" placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)}
                  className="pl-9 pr-9 py-2 text-sm w-full sm:w-52 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all" />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>

              {/* Filter pills */}
              <div className="flex gap-1 p-1 bg-slate-100 dark:bg-gray-800 rounded-xl">
                {['all', 'active', 'pending', 'completed'].map(s => (
                  <button key={s} onClick={() => setFilterStatus(s)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg capitalize transition-all duration-200 ${
                      filterStatus === s
                        ? 'bg-white dark:bg-gray-700 text-violet-600 dark:text-violet-400 shadow-sm'
                        : 'text-slate-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24 gap-3">
              <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-slate-400 dark:text-gray-500">Loading...</span>
            </div>
          ) : paginated.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-slate-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
              </div>
              <p className="text-sm font-semibold text-slate-500 dark:text-gray-400">{search || filterStatus !== 'all' ? 'No items match' : 'No items yet'}</p>
              <p className="text-xs text-slate-400 dark:text-gray-500 mt-1">{search || filterStatus !== 'all' ? 'Try different search terms' : 'Add your first item above'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-gray-800/50">
                    {['#', 'Title', 'Description', 'Status', 'Created', 'Actions'].map((h, i) => (
                      <th key={h} className={`text-left text-xs font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest px-6 py-3.5 ${i === 2 ? 'hidden md:table-cell' : ''} ${i === 4 ? 'hidden lg:table-cell' : ''} ${i === 5 ? 'text-right' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-gray-800/80">
                  {paginated.map((item, idx) => (
                    <tr key={item.id} className="group hover:bg-violet-50/50 dark:hover:bg-violet-900/10 transition-colors duration-150">
                      <td className="px-6 py-4 text-xs text-slate-300 dark:text-gray-600 font-mono w-12">
                        {String((currentPage - 1) * ITEMS_PER_PAGE + idx + 1).padStart(2, '0')}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{item.title}</span>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell max-w-[200px]">
                        <span className="text-sm text-slate-400 dark:text-gray-500 truncate block">{item.description || <span className="text-slate-300 dark:text-gray-600 italic">No description</span>}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={item.status} />
                          <select value={item.status} onChange={e => handleStatusChange(item.id, e.target.value)}
                            className="opacity-0 group-hover:opacity-100 text-xs rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all duration-200 cursor-pointer">
                            <option value="active">Active</option>
                            <option value="pending">Pending</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell">
                        <span className="text-xs text-slate-400 dark:text-gray-500">
                          {new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                          <button onClick={() => setEditingItem({ ...item })}
                            className="p-2 rounded-lg text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/30 transition-all" title="Edit">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" /></svg>
                          </button>
                          <button onClick={() => setDeleteId(item.id)}
                            className="p-2 rounded-lg text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all" title="Delete">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* PAGINATION */}
          {!loading && filtered.length > ITEMS_PER_PAGE && (
            <div className="px-6 py-4 border-t border-slate-100 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-slate-400 dark:text-gray-500">
                Showing <span className="font-bold text-gray-700 dark:text-gray-300">{(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)}</span> of <span className="font-bold text-gray-700 dark:text-gray-300">{filtered.length}</span>
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .reduce((acc, p, i, arr) => { if (i > 0 && p - arr[i - 1] > 1) acc.push('…'); acc.push(p); return acc; }, [])
                  .map((p, i) => p === '…' ? (
                    <span key={`d${i}`} className="w-8 h-8 flex items-center justify-center text-slate-300 dark:text-gray-600 text-sm">…</span>
                  ) : (
                    <button key={p} onClick={() => setCurrentPage(p)}
                      className={`w-8 h-8 rounded-lg text-sm font-bold transition-all duration-200 ${currentPage === p ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/30' : 'text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800'}`}>
                      {p}
                    </button>
                  ))}
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* EDIT MODAL */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" /></svg>
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Edit Item</h3>
              </div>
              <button onClick={() => setEditingItem(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-2">Title</label>
                <input value={editingItem.title} onChange={e => setEditingItem(p => ({ ...p, title: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-2">Description</label>
                <textarea value={editingItem.description || ''} onChange={e => setEditingItem(p => ({ ...p, description: e.target.value }))} rows={3} className={`${inputCls} resize-none`} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-2">Status</label>
                <select value={editingItem.status} onChange={e => setEditingItem(p => ({ ...p, status: e.target.value }))} className={inputCls}>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setEditingItem(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-gray-700 text-sm font-semibold text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
              <button onClick={handleEditSave} disabled={formLoading}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-sm font-bold shadow-lg shadow-violet-500/25 disabled:opacity-60 transition-all flex items-center justify-center gap-2">
                {formLoading ? <Spinner /> : null} Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-gray-700 p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
            </div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white mb-1">Delete this item?</h3>
            <p className="text-sm text-slate-400 dark:text-gray-500 mb-6">This is permanent and cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-gray-700 text-sm font-semibold text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
              <button onClick={handleDelete} className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white text-sm font-bold shadow-lg shadow-red-500/25 transition-all">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;