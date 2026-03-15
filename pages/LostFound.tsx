
import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LostFoundPost, LostFoundType, Town } from '../types';
import { updateLostFoundStatus, updateLostFoundPost, deleteLostFoundPost, submitReport } from '../lib/api';
import CustomSelect from '../components/CustomSelect';
import { getCurrentTenant } from '../tenants';

const tenant = getCurrentTenant();

interface LostFoundProps {
  posts: LostFoundPost[];
  setPosts: React.Dispatch<React.SetStateAction<LostFoundPost[]>>;
  user: { id: string, name: string, role?: string } | null;
}

function formatPhone(raw: string): string {
  const cleaned = raw.replace(/[\s\-\(\)\.]/g, '');
  if (!/^\d{0,10}$/.test(cleaned)) return raw;
  const d = cleaned;
  if (d.length === 0) return '';
  if (d.length <= 3) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

const LostFound: React.FC<LostFoundProps> = ({ posts, setPosts, user }) => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<LostFoundType | 'all'>('all');
  const [townDropdownOpen, setTownDropdownOpen] = useState(false);
  const townDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (townDropdownRef.current && !townDropdownRef.current.contains(e.target as Node)) {
        setTownDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const [townFilter, setTownFilter] = useState<Town | 'All'>('All');
  const [showResolved, setShowResolved] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionNotice, setActionNotice] = useState('');

  // Report state
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  const handleSubmitReport = async (postId: string, postTitle: string) => {
    if (!user) return;
    setSubmittingReport(true);
    try {
      await submitReport('lost_found', postId, postTitle, reportReason);
      setReportingId(null);
      setReportReason('');
      setActionNotice('Report submitted. Thank you.');
      setTimeout(() => setActionNotice(''), 4000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to submit report.');
    } finally {
      setSubmittingReport(false);
    }
  };

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [eTitle, setETitle] = useState('');
  const [eType, setEType] = useState<LostFoundType>('lost_pet');
  const [eTown, setETown] = useState<Town>(tenant.towns[0]);
  const [eDate, setEDate] = useState('');
  const [eLocation, setELocation] = useState('');
  const [eDesc, setEDesc] = useState('');
  const [eContact, setEContact] = useState('');
  const [saving, setSaving] = useState(false);

  const filteredPosts = posts.filter(p => {
    const matchTab = activeTab === 'all' || p.type === activeTab;
    const matchTown = townFilter === 'All' || p.town === townFilter;
    const matchStatus = showResolved ? true : p.status === 'active';
    return matchTab && matchTown && matchStatus;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const resolvedCount = posts.filter(p => p.status === 'resolved').length;
  const isAdminOrMod = user?.role === 'admin' || user?.role === 'moderator';

  const handleResolve = async (id: string) => {
    try {
      await updateLostFoundStatus(id, 'resolved');
      setPosts(prev => prev.map(p => p.id === id ? { ...p, status: 'resolved' as const } : p));
    } catch (err: any) {
      setActionError(err.message || 'Failed to update status.');
    }
  };

  const handleUnresolve = async (id: string) => {
    try {
      await updateLostFoundStatus(id, 'active');
      setPosts(prev => prev.map(p => p.id === id ? { ...p, status: 'active' as const } : p));
    } catch (err: any) {
      setActionError(err.message || 'Failed to update status.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteLostFoundPost(id);
      setPosts(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete post.');
    }
  };

  const openEdit = (post: LostFoundPost) => {
    setETitle(post.title);
    setEType(post.type);
    setETown(post.town);
    setEDate(post.dateOccurred);
    setELocation(post.locationDescription);
    setEDesc(post.description);
    setEContact(post.contactMethod);
    setEditingId(post.id);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true);
    try {
      const updated = await updateLostFoundPost(editingId, {
        type: eType,
        title: eTitle,
        description: eDesc,
        locationDescription: eLocation,
        town: eTown,
        dateOccurred: eDate,
        contactMethod: eContact,
      });
      setPosts(prev => prev.map(p => p.id === updated.id ? updated : p));
      setEditingId(null);
    } catch (err: any) {
      setActionError(err.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const types: { id: LostFoundType; label: string }[] = [
    { id: 'lost_pet', label: 'Lost Pet' },
    { id: 'found_pet', label: 'Found Pet' },
    { id: 'lost_package', label: 'Lost Package' },
    { id: 'found_package', label: 'Found Package' },
    { id: 'lost_item', label: 'Lost Item' },
    { id: 'found_item', label: 'Found Item' },
  ];

  const tabs = [
    { id: 'all',           label: 'Everything',   icon: 'fa-list',             accent: 'all'   },
    { id: 'lost_pet',      label: 'Lost Pets',     icon: 'fa-dog',              accent: 'lost'  },
    { id: 'found_pet',     label: 'Found Pets',    icon: 'fa-paw',              accent: 'found' },
    { id: 'lost_package',  label: 'Lost Package',  icon: 'fa-box',              accent: 'lost'  },
    { id: 'found_package', label: 'Found Package', icon: 'fa-box-open',         accent: 'found' },
    { id: 'lost_item',     label: 'Lost Items',    icon: 'fa-magnifying-glass', accent: 'lost'  },
    { id: 'found_item',    label: 'Found Items',   icon: 'fa-location-dot',     accent: 'found' },
  ];

  const tabIconColor = (accent: string, isActive: boolean) => {
    if (isActive) return 'text-white';
    if (accent === 'lost')  return 'text-red-400';
    if (accent === 'found') return 'text-emerald-500';
    return 'text-slate-400';
  };

  const tabBorderClass = (accent: string) => {
    if (accent === 'lost')  return 'border-red-100 hover:border-red-200 hover:bg-red-50/20';
    if (accent === 'found') return 'border-emerald-100 hover:border-emerald-200 hover:bg-emerald-50/20';
    return 'border-slate-200 hover:border-slate-300 hover:bg-slate-50';
  };

  const towns: Town[] = tenant.towns;

  return (
    <div className="space-y-6">
      {actionError && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm font-medium px-4 py-3 rounded-xl flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError('')} className="ml-4 text-red-400 hover:text-red-600 font-bold text-lg leading-none">&times;</button>
        </div>
      )}
      {actionNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium px-4 py-3 rounded-xl flex items-center justify-between">
          <span><i className="fas fa-check-circle mr-2"></i>{actionNotice}</span>
          <button onClick={() => setActionNotice('')} className="ml-4 text-emerald-400 hover:text-emerald-600 font-bold text-lg leading-none">&times;</button>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Community Lost & Found</h1>
          <p className="text-slate-500">Helping the community reunite with pets and property.</p>
        </div>
        <Link
          to={user ? '/lost-found/new' : '/login?signup=true'}
          state={user ? undefined : { from: location.pathname }}
          className="bg-orange-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-orange-700 transition-colors flex items-center justify-center"
        >
          <i className="fas fa-plus mr-2"></i>
          Post Alert
        </Link>
      </div>

      {/* Tabs - Scrollable on mobile */}
      <div className="overflow-x-auto pb-2 flex space-x-2 scrollbar-hide">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center space-x-2 ${
              activeTab === tab.id
                ? tab.id === 'all' ? 'bg-slate-600 text-white shadow-md' : 'bg-slate-900 text-white shadow-md'
                : `bg-white text-slate-600 border ${tabBorderClass(tab.accent)}`
            }`}
          >
            <i className={`fas ${tab.icon} ${tabIconColor(tab.accent, activeTab === tab.id)}`}></i>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-grow relative" ref={townDropdownRef}>
          <button
            onClick={() => setTownDropdownOpen(!townDropdownOpen)}
            className="w-full flex items-center space-x-3 bg-white px-4 py-3 rounded-2xl border border-slate-100 shadow-sm hover:border-slate-200 transition-colors"
          >
            <i className="fas fa-filter text-slate-400"></i>
            <span className="flex-grow text-left text-sm font-semibold text-slate-700">
              {townFilter === 'All' ? `All of ${tenant.name}` : townFilter}
            </span>
            <i className={`fas fa-chevron-down text-slate-400 text-xs transition-transform ${townDropdownOpen ? 'rotate-180' : ''}`}></i>
          </button>
          {townDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-100 shadow-xl z-50 overflow-hidden">
              {(['All', ...towns] as (Town | 'All')[]).map(t => (
                <button
                  key={t}
                  onClick={() => { setTownFilter(t); setTownDropdownOpen(false); }}
                  className={`w-full text-left px-4 py-3 text-sm font-semibold transition-colors ${
                    townFilter === t ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {t === 'All' ? `All of ${tenant.name}` : t}
                </button>
              ))}
            </div>
          )}
        </div>
        {resolvedCount > 0 && (
          <button
            onClick={() => setShowResolved(!showResolved)}
            className={`whitespace-nowrap px-4 py-3 rounded-2xl text-sm font-bold border transition-all ${
              showResolved ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
            }`}
          >
            {showResolved ? 'Hide Resolved' : `Show Resolved (${resolvedCount})`}
          </button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredPosts.map(post => {
          const canManage = !!(user && (user.id === post.userId || isAdminOrMod));
          const isEditing = editingId === post.id;

          if (isEditing) {
            return (
              <div key={post.id} className="col-span-full bg-white rounded-3xl border border-blue-100 shadow-sm p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Edit Post</h3>
                <form onSubmit={handleSaveEdit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">Type of Alert</label>
                    <div className="flex flex-wrap gap-2">
                      {types.map(t => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setEType(t.id)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            eType === t.id ? 'bg-orange-600 text-white shadow-md' : 'bg-slate-50 text-slate-500 border border-slate-200'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Title</label>
                      <input
                        type="text"
                        name="edit-title"
                        required
                        value={eTitle}
                        onChange={e => setETitle(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Town</label>
                      <CustomSelect
                        value={eTown}
                        onChange={(v) => setETown(v as Town)}
                        options={towns.map(t => ({ value: t, label: t }))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1 ml-1">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Date Occurred</label>
                        <button
                          type="button"
                          onClick={() => setEDate(new Date().toISOString().split('T')[0])}
                          className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wide"
                        >
                          Today
                        </button>
                      </div>
                      <input
                        type="date"
                        name="edit-date"
                        required
                        value={eDate}
                        onChange={e => setEDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Specific Location</label>
                      <input
                        type="text"
                        name="edit-location"
                        value={eLocation}
                        onChange={e => setELocation(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Description</label>
                    <textarea
                      required
                      rows={3}
                      value={eDesc}
                      onChange={e => setEDesc(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Contact Method</label>
                    <input
                      type="text"
                      name="edit-contact"
                      required
                      value={eContact}
                      onChange={e => setEContact(formatPhone(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button
                      type="submit"
                      disabled={saving}
                      className="bg-blue-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-60"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="bg-slate-100 text-slate-700 font-bold px-6 py-3 rounded-xl hover:bg-slate-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            );
          }

          const canReport = !!(user && user.id !== post.userId);

          return (
            <div key={post.id} className={`bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col ${post.status === 'resolved' ? 'opacity-60' : ''}`}>
              <div className="relative h-48 bg-slate-100">
                <img src={post.photoUrl || `https://picsum.photos/seed/${post.id}/400/300`} alt="" loading="lazy" className="w-full h-full object-cover" />
                <div className={`absolute top-4 left-4 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                  post.type.includes('lost') ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
                }`}>
                  {post.type.replace(/_/g, ' ')}
                </div>
                {post.status === 'resolved' && (
                  <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                    <span className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold rotate-[-5deg] shadow-lg">RESOLVED</span>
                  </div>
                )}
              </div>
              <div className="p-5 flex-grow">
                <h3 className="font-bold text-lg text-slate-900 line-clamp-1 mb-1">{post.title}</h3>
                <div className="flex items-center text-xs text-slate-400 mb-3 space-x-2">
                  <span className="flex items-center"><i className="fas fa-map-marker-alt mr-1"></i> {post.town}</span>
                  <span>•</span>
                  <span>{new Date(post.dateOccurred).toLocaleDateString()}</span>
                </div>
                <p className="text-slate-600 text-sm mb-4 line-clamp-3">{post.description}</p>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mb-4">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Contact Details</div>
                  <div className="text-slate-900 text-xs font-semibold">{post.contactMethod}</div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                  <span className="text-xs text-slate-400">By {post.userName}</span>
                  <div className="flex items-center gap-3">
                    {canReport && (
                      <button
                        onClick={() => { setReportingId(reportingId === post.id ? null : post.id); setReportReason(''); }}
                        className="text-xs text-slate-300 hover:text-red-400 transition-colors"
                        title="Report this post"
                      >
                        <i className="fas fa-flag"></i>
                      </button>
                    )}
                    {canManage && (
                      <>
                        {post.status === 'active' && (
                          <button onClick={() => handleResolve(post.id)} className="text-xs font-bold text-blue-600 hover:text-blue-700">
                            Mark Resolved
                          </button>
                        )}
                        {post.status === 'resolved' && (
                          <button onClick={() => handleUnresolve(post.id)} className="text-xs font-bold text-amber-600 hover:text-amber-700">
                            Unresolve
                          </button>
                        )}
                        <button onClick={() => openEdit(post)} className="text-xs font-bold text-slate-500 hover:text-slate-700">
                          Edit
                        </button>
                        <button onClick={() => handleDelete(post.id)} className="text-xs font-bold text-red-400 hover:text-red-600">
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
              {reportingId === post.id && (
                <div className="border-t border-slate-100 bg-slate-50 px-5 pb-4 pt-3">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Report this post</p>
                  <textarea
                    value={reportReason}
                    onChange={e => setReportReason(e.target.value)}
                    placeholder="Why are you reporting this? (optional)"
                    rows={2}
                    className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 focus:ring-1 focus:ring-red-300 outline-none resize-none mb-2"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSubmitReport(post.id, post.title)}
                      disabled={submittingReport}
                      className="text-xs font-bold bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      {submittingReport ? 'Reporting...' : 'Submit Report'}
                    </button>
                    <button
                      onClick={() => { setReportingId(null); setReportReason(''); }}
                      className="text-xs font-bold text-slate-500 px-3 py-1.5 rounded-lg hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {filteredPosts.length === 0 && (
          <div className="col-span-full text-center py-14 px-8 bg-white rounded-3xl border border-dashed border-slate-200">
            <div className="text-4xl text-emerald-300 mb-3"><i className="fas fa-handshake"></i></div>
            <p className="text-slate-500 font-medium">No active posts right now.</p>
            <p className="text-slate-400 font-medium text-sm">That's a good sign.</p>
            <p className="text-slate-400 text-sm mt-1">If something goes missing, locals will see it here.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LostFound;
