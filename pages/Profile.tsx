
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  fetchMyPosts, fetchMyBookings, fetchMyClaimedListing,
  fetchMyLostFound, fetchMyRequests,
  deleteOwnCommunityEvent, deleteLostFoundPost, deleteRequest,
  softDeleteAccount, updateEmail, updatePassword,
} from '../lib/api';
import type { CommunityEvent, SpotlightBooking, Provider, LostFoundPost, RecommendationRequest } from '../types';

interface Props {
  user: { id: string; name: string; email?: string; role?: string } | null;
  onLogout: () => void;
}

function statusBadge(status: SpotlightBooking['status']) {
  if (status === 'approved') return { label: 'Approved', cls: 'bg-emerald-100 text-emerald-700' };
  if (status === 'rejected') return { label: 'Rejected', cls: 'bg-red-100 text-red-600' };
  return { label: 'Pending', cls: 'bg-amber-100 text-amber-700' };
}

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
        <p className="text-slate-500 text-sm">You must be logged in to view your account.</p>
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

  return (
    <div className="max-w-6xl mx-auto pb-10 px-4">

      {/* Header */}
      <div className="pt-2 flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{user.name}</h1>
          {user.email && <p className="text-slate-400 text-sm mt-0.5">{user.email}</p>}
        </div>
        <button
          onClick={() => { onLogout(); navigate('/'); }}
          className="text-sm font-semibold text-slate-500 hover:text-slate-800 border border-slate-200 hover:border-slate-400 px-4 py-2 rounded-xl transition-colors"
        >
          Log Out
        </button>
      </div>

      {loading && (
        <div className="text-center py-12 text-slate-400 text-sm">
          <i className="fas fa-spinner fa-spin mr-2"></i> Loading…
        </div>
      )}

      {!loading && (
        <div className="space-y-8">

          {/* Account Settings bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Account Settings</h2>
            {settingsMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs px-3 py-2.5 rounded-xl mb-3">{settingsMsg}</div>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => { setActiveSettings(activeSettings === 'email' ? null : 'email'); setSettingsError(''); setSettingsMsg(''); }}
                  className={`text-sm font-medium px-4 py-2 rounded-xl border transition-colors ${activeSettings === 'email' ? 'bg-slate-100 border-slate-300 text-slate-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  Change Email <i className={`fas fa-chevron-${activeSettings === 'email' ? 'up' : 'down'} text-slate-300 text-xs ml-1`}></i>
                </button>
                <button
                  onClick={() => { setActiveSettings(activeSettings === 'password' ? null : 'password'); setSettingsError(''); setSettingsMsg(''); }}
                  className={`text-sm font-medium px-4 py-2 rounded-xl border transition-colors ${activeSettings === 'password' ? 'bg-slate-100 border-slate-300 text-slate-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  Change Password <i className={`fas fa-chevron-${activeSettings === 'password' ? 'up' : 'down'} text-slate-300 text-xs ml-1`}></i>
                </button>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="text-sm font-medium px-4 py-2 rounded-xl border border-red-100 text-red-500 hover:bg-red-50 transition-colors"
              >
                Delete Account
              </button>
            </div>

            {activeSettings === 'email' && (
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
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
              <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-3 items-end">
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
          </div>

          {/* Claimed Listing */}
          {claimed && (
            <section className="w-full">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Your Business</h2>
              <Link to={`/provider/${claimed.id}`} className="flex items-center gap-4 bg-white border border-slate-200 rounded-2xl p-4 hover:border-blue-200 hover:shadow-sm transition-all">
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <i className="fas fa-store text-slate-400 text-lg"></i>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 text-sm leading-tight">{claimed.name}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{claimed.category}{claimed.town ? ` · ${claimed.town}` : ''}</p>
                </div>
                <i className="fas fa-arrow-right text-slate-300 text-xs ml-auto flex-shrink-0"></i>
              </Link>
            </section>
          )}

          {/* Bookings — full width */}
          <section className="w-full">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Your Bookings</h2>
              <div className="flex items-center gap-2">
                <Link to="/book/spotlight" className="text-xs font-bold bg-amber-500 hover:bg-amber-400 text-white px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors">
                  <i className="fas fa-star text-[10px]"></i> Spotlight
                </Link>
                <Link to="/book/featured" className="text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors">
                  <i className="fas fa-bullhorn text-[10px]"></i> Featured
                </Link>
                {bookings.length > 0 && (
                  <Link to="/my-bookings" className="text-xs font-semibold text-orange-500 hover:underline">
                    Manage <i className="fas fa-arrow-right text-[10px] ml-0.5"></i>
                  </Link>
                )}
              </div>
            </div>
            {bookings.length === 0 ? (
              <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-6 text-center">
                <p className="text-slate-400 text-sm">No paid bookings yet.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-2">
                {bookings.slice(0, 4).map(b => {
                  const badge = statusBadge(b.status);
                  return (
                    <div key={b.id} className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex items-center gap-3">
                      {b.imageUrl && <img src={b.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{b.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{b.type === 'spotlight' ? '⭐ Spotlight' : '📢 Featured'}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${badge.cls}`}>{badge.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
            {bookings.length > 4 && (
              <Link to="/my-bookings" className="block text-center text-xs font-semibold text-slate-400 hover:text-orange-500 py-2">
                View all {bookings.length} bookings
              </Link>
            )}
          </section>

          {/* 2x2 grid for activity sections */}
          <div className="grid md:grid-cols-2 gap-6">

            {/* Posts */}
            <section className="w-full">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Your Posts</h2>
              {posts.length === 0 ? (
                <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-6 text-center space-y-1.5">
                  <p className="text-slate-400 text-sm">You haven't posted anything yet.</p>
                  <Link to="/events" className="text-xs font-bold text-orange-500 hover:underline">Post on the Community Board →</Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {posts.map(post => (
                    <div key={post.id} className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 leading-tight">{post.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {new Date(post.createdAt).toLocaleDateString()} · {post.town}
                          {post.status === 'pending' && <span className="ml-2 text-amber-500 font-medium">Pending review</span>}
                        </p>
                      </div>
                      <button onClick={() => handleDeletePost(post.id)} className="text-slate-300 hover:text-red-400 transition-colors flex-shrink-0 p-1">
                        <i className="fas fa-trash text-xs"></i>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Lost & Found */}
            <section className="w-full">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Your Lost & Found</h2>
              {lostFound.length === 0 ? (
                <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-6 text-center space-y-1.5">
                  <p className="text-slate-400 text-sm">No lost & found posts yet.</p>
                  <Link to="/lost-found/new" className="text-xs font-bold text-orange-500 hover:underline">Post to Lost & Found →</Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {lostFound.map(post => (
                    <div key={post.id} className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 leading-tight">{post.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          <span className={`font-medium ${post.type === 'lost' ? 'text-red-400' : 'text-emerald-500'}`}>{post.type === 'lost' ? 'Lost' : 'Found'}</span>
                          {' · '}{new Date(post.createdAt).toLocaleDateString()} · {post.town}
                        </p>
                      </div>
                      <button onClick={() => handleDeleteLostFound(post.id)} className="text-slate-300 hover:text-red-400 transition-colors flex-shrink-0 p-1">
                        <i className="fas fa-trash text-xs"></i>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Questions */}
            <section className="w-full">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Your Questions</h2>
              {requests.length === 0 ? (
                <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-6 text-center space-y-1.5">
                  <p className="text-slate-400 text-sm">No questions asked yet.</p>
                  <Link to="/ask" className="text-xs font-bold text-orange-500 hover:underline">Ask the Community →</Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {requests.map(req => (
                    <div key={req.id} className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 leading-tight">{req.serviceNeeded}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {new Date(req.createdAt).toLocaleDateString()} · {req.town}
                          {' · '}<span className={req.status === 'open' ? 'text-blue-400' : 'text-emerald-500'}>{req.status === 'open' ? 'Open' : 'Answered'}</span>
                        </p>
                      </div>
                      <button onClick={() => handleDeleteRequest(req.id)} className="text-slate-300 hover:text-red-400 transition-colors flex-shrink-0 p-1">
                        <i className="fas fa-trash text-xs"></i>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

          </div>
        </div>
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
