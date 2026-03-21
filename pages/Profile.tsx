
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  fetchMyPosts, fetchMyBookings, fetchMyClaimedListing,
  fetchMyLostFound, fetchMyRequests,
  deleteOwnCommunityEvent, deleteLostFoundPost, deleteRequest,
  softDeleteAccount, updateEmail, updatePassword,
} from '../lib/api';
import type { CommunityEvent, SpotlightBooking, Provider, LostFoundPost, RecommendationRequest } from '../types';
import Avatar from '../components/avatar/Avatar';
import { getCurrentTenant } from '../tenants';

const tenant = getCurrentTenant();

interface Props {
  user: { id: string; name: string; email?: string; role?: string } | null;
  onLogout: () => void;
}

function statusBadge(status: SpotlightBooking['status']) {
  if (status === 'approved') return { label: 'Approved', cls: 'bg-emerald-100 text-emerald-700' };
  if (status === 'rejected') return { label: 'Rejected', cls: 'bg-red-100 text-red-600' };
  return { label: 'Pending', cls: 'bg-amber-100 text-amber-700' };
}

type ActivityItem =
  | { kind: 'post'; id: string; title: string; date: string; town: string; status?: string; postType?: string }
  | { kind: 'lost_found'; id: string; title: string; date: string; town: string; lfType: string }
  | { kind: 'question'; id: string; title: string; date: string; town: string; status: string; slug?: string };

const Profile: React.FC<Props> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<CommunityEvent[]>([]);
  const [bookings, setBookings] = useState<SpotlightBooking[]>([]);
  const [claimed, setClaimed] = useState<Provider | null>(null);
  const [lostFound, setLostFound] = useState<LostFoundPost[]>([]);
  const [requests, setRequests] = useState<RecommendationRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Account settings
  const [activeSettings, setActiveSettings] = useState<'email' | 'password' | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState('');
  const [settingsError, setSettingsError] = useState('');

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!user) return;
    Promise.all([fetchMyPosts(), fetchMyBookings(), fetchMyClaimedListing(), fetchMyLostFound(), fetchMyRequests()])
      .then(([p, b, c, lf, rq]) => { setPosts(p); setBookings(b); setClaimed(c); setLostFound(lf); setRequests(rq); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-lg mx-auto pt-16 text-center space-y-4 px-4">
        <p className="text-slate-500 text-sm">You must be logged in to view your profile.</p>
        <Link to="/login" className="inline-block bg-slate-900 text-white font-bold px-6 py-3 rounded-xl text-sm">Sign In</Link>
      </div>
    );
  }

  async function handleDeletePost(id: string) {
    try { await deleteOwnCommunityEvent(id); setPosts(prev => prev.filter(p => p.id !== id)); }
    catch (err: any) { alert(err.message || 'Failed to delete post.'); }
  }

  async function handleDeleteLostFound(id: string) {
    try { await deleteLostFoundPost(id); setLostFound(prev => prev.filter(p => p.id !== id)); }
    catch (err: any) { alert(err.message || 'Failed to delete post.'); }
  }

  async function handleDeleteRequest(id: string) {
    try { await deleteRequest(id); setRequests(prev => prev.filter(r => r.id !== id)); }
    catch (err: any) { alert(err.message || 'Failed to delete question.'); }
  }

  async function handleUpdateEmail() {
    if (!newEmail.trim()) return;
    setSettingsLoading(true); setSettingsError(''); setSettingsMsg('');
    try {
      await updateEmail(newEmail.trim());
      setSettingsMsg('Confirmation links sent. Check both your current and new email and click both links.');
      setNewEmail(''); setActiveSettings(null);
    } catch (err: any) { setSettingsError(err.message || 'Failed to update email.'); }
    finally { setSettingsLoading(false); }
  }

  async function handleUpdatePassword() {
    if (!newPassword || newPassword.length < 8) { setSettingsError('Password must be at least 8 characters.'); return; }
    setSettingsLoading(true); setSettingsError(''); setSettingsMsg('');
    try {
      await updatePassword(newPassword);
      setSettingsMsg('Password updated.');
      setNewPassword(''); setActiveSettings(null);
    } catch (err: any) { setSettingsError(err.message || 'Failed to update password.'); }
    finally { setSettingsLoading(false); }
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText !== 'DELETE') return;
    setDeleting(true); setDeleteError('');
    try {
      await softDeleteAccount();
      onLogout();
      navigate('/');
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete account. Please try again.');
      setDeleting(false);
    }
  }

  // Build unified activity feed sorted by date
  const activity: ActivityItem[] = [
    ...posts.map(p => ({ kind: 'post' as const, id: p.id, title: p.title, date: p.createdAt, town: p.town, status: p.status, postType: p.postType })),
    ...lostFound.map(p => ({ kind: 'lost_found' as const, id: p.id, title: p.title, date: p.createdAt, town: p.town, lfType: p.type.startsWith('lost') ? 'Lost' : 'Found' })),
    ...requests.map(r => ({ kind: 'question' as const, id: r.id, title: r.serviceNeeded, date: r.createdAt, town: r.town, status: r.status, slug: r.slug })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalActivity = posts.length + lostFound.length + requests.length;

  return (
    <div className="max-w-[44rem] mx-auto pb-24 px-4 space-y-4">

      {/* ── Profile Header ──────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar user={user} size="lg" />
            <div>
              <h1 className="text-xl font-bold text-slate-900">{user.name}</h1>
              {user.email && <p className="text-slate-400 text-xs mt-0.5">{user.email}</p>}
              <p className="text-slate-400 text-xs mt-1">
                <i className="fas fa-map-marker-alt mr-1"></i>Community member in {tenant.name}
              </p>
            </div>
          </div>
        </div>

        {/* Stats row */}
        {!loading && totalActivity > 0 && (
          <div className="flex gap-6 mt-4 pt-3 border-t border-slate-100">
            <div className="text-center">
              <p className="text-xl font-bold text-slate-800">{requests.length}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Questions</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-slate-800">{posts.length}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Posts</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-slate-800">{lostFound.length}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Lost & Found</p>
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div className="text-center py-12 text-slate-400 text-sm">
          <i className="fas fa-spinner fa-spin mr-2"></i> Loading…
        </div>
      )}

      {!loading && (
        <>
          {/* ── Jump Back In ──────────────────────────────────────────── */}
          <div>
            <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Jump back in</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link to="/ask" className="flex items-center justify-center gap-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-sm min-h-[48px] py-3.5 rounded-xl transition-all">
                <i className="fas fa-comments text-sm"></i> Ask a Question
              </Link>
              <Link to="/events#community" className="flex items-center justify-center gap-2.5 bg-orange-600 hover:bg-orange-700 active:scale-[0.98] text-white font-bold text-sm min-h-[48px] py-3.5 rounded-xl transition-all">
                <i className="fas fa-bullhorn text-sm"></i> Post to Community
              </Link>
              <Link to="/lost-found/new" className="flex items-center justify-center gap-2.5 bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-white font-bold text-sm min-h-[48px] py-3.5 rounded-xl transition-all">
                <i className="fas fa-paw text-sm"></i> Lost & Found
              </Link>
            </div>
          </div>

          {/* ── Your Listing ─────────────────────────────────────────── */}
          {claimed && (
            <div>
              <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Your Listing</h2>
              <Link to={`/provider/${claimed.id}`} className="flex items-center gap-4 bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-200 hover:shadow-sm active:scale-[0.98] transition-all">
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                  {claimed.image
                    ? <img src={claimed.image} alt={claimed.name} className="w-12 h-12 object-cover rounded-xl" />
                    : <i className="fas fa-store text-slate-400 text-lg"></i>}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 text-sm leading-tight">{claimed.name}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{claimed.category}{claimed.town ? ` · ${claimed.town}` : ''}</p>
                </div>
                <i className="fas fa-chevron-right text-slate-300 text-xs ml-auto flex-shrink-0"></i>
              </Link>
            </div>
          )}

          {/* ── Your Activity ─────────────────────────────────────────── */}
          <div>
            <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Your Activity</h2>
            {activity.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-3">
                <i className="fas fa-hand-wave text-3xl text-slate-200 block"></i>
                <p className="text-slate-600 text-sm font-medium">You haven't shared anything yet.</p>
                <p className="text-slate-400 text-xs leading-relaxed">Start by asking a question or posting to your community.</p>
                <Link to="/ask" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-all mt-2">
                  <i className="fas fa-comments text-xs"></i> Ask a Question
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {activity.map(item => {
                  const kindLabel = item.kind === 'question' ? 'Question' : item.kind === 'lost_found' ? 'Lost & Found' : 'Post';
                  const kindColor = item.kind === 'question' ? 'bg-blue-100 text-blue-600' : item.kind === 'lost_found' ? 'bg-amber-100 text-amber-700' : 'bg-orange-100 text-orange-600';
                  const linkTo = item.kind === 'question' && item.slug ? `/ask/${item.slug}`
                    : item.kind === 'post' ? `/events?event=${item.id}`
                    : item.kind === 'lost_found' ? `/lost-found`
                    : undefined;

                  const card = (
                    <div className={`bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-3.5 flex items-center gap-3 transition-all ${linkTo ? 'hover:bg-slate-50 hover:border-slate-300 hover:shadow active:scale-[0.98] cursor-pointer' : ''}`}>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0 ${kindColor}`}>{kindLabel}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 leading-tight truncate">{item.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {new Date(item.date).toLocaleDateString()} · {item.town}
                          {item.kind === 'question' && (
                            <span className={`ml-1.5 ${item.status === 'open' ? 'text-blue-400' : 'text-emerald-500'}`}>
                              · {item.status === 'open' ? 'Open' : 'Answered'}
                            </span>
                          )}
                          {item.kind === 'lost_found' && (
                            <span className={`ml-1.5 font-medium ${item.lfType === 'Lost' ? 'text-red-400' : 'text-emerald-500'}`}>
                              · {item.lfType}
                            </span>
                          )}
                          {item.kind === 'post' && item.status === 'pending' && (
                            <span className="ml-1.5 text-amber-500 font-medium">· Pending review</span>
                          )}
                        </p>
                      </div>
                      {linkTo && <i className="fas fa-chevron-right text-slate-300 text-[10px] flex-shrink-0 mr-1"></i>}
                      <button
                        onClick={e => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (item.kind === 'post') handleDeletePost(item.id);
                          else if (item.kind === 'lost_found') handleDeleteLostFound(item.id);
                          else handleDeleteRequest(item.id);
                        }}
                        className="text-slate-300 hover:text-red-400 active:text-red-500 transition-colors flex-shrink-0 p-1.5 -mr-1"
                        title="Delete"
                      >
                        <i className="fas fa-trash text-xs"></i>
                      </button>
                    </div>
                  );

                  return linkTo ? (
                    <Link key={`${item.kind}-${item.id}`} to={linkTo} className="block rounded-xl">
                      {card}
                    </Link>
                  ) : (
                    <div key={`${item.kind}-${item.id}`}>{card}</div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Bookings (only if they have any) ──────────────────────── */}
          {bookings.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Your Bookings</h2>
                <Link to="/my-bookings" className="text-xs font-semibold text-orange-500 hover:underline">
                  Manage <i className="fas fa-arrow-right text-[10px] ml-0.5"></i>
                </Link>
              </div>
              <div className="space-y-2">
                {bookings.slice(0, 4).map(b => {
                  const badge = statusBadge(b.status);
                  return (
                    <div key={b.id} className="bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-3 flex items-center gap-3">
                      {b.imageUrl && <img src={b.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{b.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{b.type === 'spotlight' ? 'Spotlight' : 'Featured'}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${badge.cls}`}>{badge.label}</span>
                    </div>
                  );
                })}
              </div>
              {bookings.length > 4 && (
                <Link to="/my-bookings" className="block text-center text-xs font-semibold text-slate-400 hover:text-orange-500 py-2 mt-1">
                  View all {bookings.length} bookings
                </Link>
              )}
            </div>
          )}

          {/* ── Account Settings ──────────────────────────────────────── */}
          <div className="pt-4 border-t border-slate-100">
            <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Account Settings</h2>
            {settingsMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs px-3 py-2.5 rounded-xl mb-3">{settingsMsg}</div>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { setActiveSettings(activeSettings === 'email' ? null : 'email'); setSettingsError(''); setSettingsMsg(''); }}
                className={`text-xs font-medium px-4 py-2.5 rounded-xl border transition-colors ${activeSettings === 'email' ? 'bg-slate-100 border-slate-300 text-slate-900' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
              >
                Change Email <i className={`fas fa-chevron-${activeSettings === 'email' ? 'up' : 'down'} text-slate-300 text-[10px] ml-1`}></i>
              </button>
              <button
                onClick={() => { setActiveSettings(activeSettings === 'password' ? null : 'password'); setSettingsError(''); setSettingsMsg(''); }}
                className={`text-xs font-medium px-4 py-2.5 rounded-xl border transition-colors ${activeSettings === 'password' ? 'bg-slate-100 border-slate-300 text-slate-900' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
              >
                Change Password <i className={`fas fa-chevron-${activeSettings === 'password' ? 'up' : 'down'} text-slate-300 text-[10px] ml-1`}></i>
              </button>
            </div>

            {activeSettings === 'email' && (
              <div className="mt-4 space-y-3">
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex gap-2.5 items-start">
                  <i className="fas fa-triangle-exclamation text-amber-500 text-sm mt-0.5 flex-shrink-0"></i>
                  <p className="text-sm text-amber-800 leading-snug">
                    <span className="font-bold">Check both inboxes.</span> You'll receive a confirmation link at your <span className="font-semibold">current</span> email and your <span className="font-semibold">new</span> email. You must click <span className="font-semibold">both links</span> for the change to take effect.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="flex-1 min-w-[200px]">
                    <input type="email" placeholder="New email address" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                  <div className="flex flex-col gap-1">
                    {settingsError && <p className="text-xs text-red-500">{settingsError}</p>}
                    <button onClick={handleUpdateEmail} disabled={settingsLoading || !newEmail.trim()} className="bg-slate-900 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl disabled:opacity-50 transition-colors whitespace-nowrap">
                      {settingsLoading ? 'Saving…' : 'Update Email'}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {activeSettings === 'password' && (
              <div className="mt-4 flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[200px]">
                  <input type="password" placeholder="New password (min 8 characters)" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div className="flex flex-col gap-1">
                  {settingsError && <p className="text-xs text-red-500">{settingsError}</p>}
                  <button onClick={handleUpdatePassword} disabled={settingsLoading || newPassword.length < 8} className="bg-slate-900 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl disabled:opacity-50 transition-colors whitespace-nowrap">
                    {settingsLoading ? 'Saving…' : 'Update Password'}
                  </button>
                </div>
              </div>
            )}

            {/* Delete Account — separated */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="text-[11px] font-medium text-red-400 hover:text-red-600 transition-colors"
              >
                <i className="fas fa-trash-can mr-1 text-[10px]"></i>Delete Account
              </button>
            </div>
          </div>
        </>
      )}

      {/* Delete Account Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Delete your account?</h2>
            <p className="text-slate-500 text-sm leading-relaxed">Your profile will be permanently removed. Some posts may remain visible on Townly to preserve community conversations, but they will appear as posted by <span className="font-semibold text-slate-700">"Deleted User."</span></p>
            <p className="text-slate-400 text-xs">You will be logged out immediately. This action cannot be undone.</p>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 block">Type <span className="font-bold text-slate-700">DELETE</span> to confirm</label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>
            {deleteError && <p className="text-xs text-red-500">{deleteError}</p>}
            <div className="flex gap-3 pt-1">
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirmText !== 'DELETE'}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-40 transition-colors"
              >
                {deleting ? 'Deleting…' : 'Delete Account'}
              </button>
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); setDeleteError(''); }}
                className="px-4 py-2.5 border border-slate-200 text-slate-500 font-semibold rounded-xl hover:bg-slate-50 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
