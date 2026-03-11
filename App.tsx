
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}
import { getCurrentTenant } from './tenants';
import Home from './pages/Home';
import Directory from './pages/Directory';
import ProviderDetail from './pages/ProviderDetail';
import LostFound from './pages/LostFound';
import CreateLostFound from './pages/CreateLostFound';
import AddProvider from './pages/AddProvider';
import AddReview from './pages/AddReview';
import Recommendations from './pages/Recommendations';
import Auth from './pages/Auth';
import Spotlights from './pages/Spotlights';
import BookSpotlight from './pages/BookSpotlight';
import BookingSuccess from './pages/BookingSuccess';
import Admin from './pages/Admin';
import MyBookings from './pages/MyBookings';
import { supabase } from './lib/supabase';
import { fetchProviders, fetchReviews, fetchLostFound, fetchRequests, fetchActiveAlert, signOut } from './lib/api';
import { Provider, Review, LostFoundPost, RecommendationRequest, CommunityAlert } from './types';

const tenant = getCurrentTenant();

const App: React.FC = () => {
  const [chairRocking, setChairRocking] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [lostFound, setLostFound] = useState<LostFoundPost[]>([]);
  const [requests, setRequests] = useState<RecommendationRequest[]>([]);
  const [communityAlert, setCommunityAlert] = useState<CommunityAlert | null>(null);
  const [user, setUser] = useState<{ id: string, name: string, email?: string, role?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Load data from Supabase on mount
  useEffect(() => {
    Promise.all([
      fetchProviders(),
      fetchReviews(),
      fetchLostFound(),
      fetchRequests(),
      fetchActiveAlert(),
    ]).then(([p, r, lf, req, alert]) => {
      setProviders(p);
      setReviews(r);
      setLostFound(lf);
      setRequests(req);
      setCommunityAlert(alert);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  // Sync auth session
  useEffect(() => {
    const loadUser = async (supabaseUser: { id: string; user_metadata?: any; email?: string }) => {
      const name = supabaseUser.user_metadata?.name || supabaseUser.email || 'User';
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', supabaseUser.id)
        .single();
      setUser({ id: supabaseUser.id, name, email: supabaseUser.email ?? undefined, role: profile?.role ?? undefined });
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) loadUser(session.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) loadUser(session.user);
      else setUser(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut();
    setUser(null);
  };

  return (
    <HashRouter>
      <ScrollToTop />
      <div className="min-h-screen flex flex-col nav-page-pb">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50 h-20">
          <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between relative">
            <span className="md:hidden absolute left-1/2 -translate-x-1/2 font-bold text-slate-900 text-base pointer-events-none">{tenant.name}</span>
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                <img
                  src="/images/chair-icon.webp"
                  alt={tenant.displayName}
                  className={`h-10 w-auto object-contain chair-icon${chairRocking ? ' rocking' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setChairRocking(true);
                    const onHome = ['', '#', '#/'].includes(window.location.hash);
                    if (!onHome) window.location.hash = '#/';
                    else e.preventDefault();
                  }}
                  onAnimationEnd={() => setChairRocking(false)}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              <span className="hidden md:inline font-bold text-slate-900 text-lg">{tenant.name}</span>
              <div className="fallback-text hidden flex flex-col -space-y-3">
                <span className="font-porch text-orange-600 text-2xl drop-shadow-sm">Front</span>
                <span className="font-talk text-slate-900 text-lg tracking-wider">PORCH</span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center space-x-6">
              <Link to="/spotlights" className="text-slate-600 hover:text-orange-600 font-medium transition-colors">Events</Link>
              <Link to="/directory" className="text-slate-600 hover:text-orange-600 font-medium transition-colors">Businesses</Link>
              <Link to="/lost-found" className="text-slate-600 hover:text-orange-600 font-medium transition-colors">Lost & Found</Link>
              <Link to="/ask" className="text-slate-600 hover:text-orange-600 font-medium transition-colors">Ask Community</Link>
              {user ? (
                <div className="flex items-center space-x-3">
                  <span className="text-slate-500 text-sm">Hi, {user.name}</span>
                  {localStorage.getItem('townly_has_bookings') && (
                    <Link to="/my-bookings" className="text-xs font-bold text-slate-400 hover:text-orange-600 transition-colors">My Bookings</Link>
                  )}
                  {user.role === 'admin' && (
                    <Link to="/admin" className="text-xs font-bold text-slate-400 hover:text-orange-600 transition-colors">Admin</Link>
                  )}
                  <button onClick={handleLogout} className="text-sm font-semibold text-orange-600">Logout</button>
                </div>
              ) : (
                <Link to="/auth" className="bg-slate-900 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-orange-600 transition-colors shadow-sm">Login</Link>
              )}
            </nav>

            <div className="md:hidden flex items-center space-x-3">
              {user ? (
                <>
                  {localStorage.getItem('townly_has_bookings') && (
                    <Link to="/my-bookings" className="flex flex-col items-center text-slate-400 hover:text-orange-600 transition-colors">
                      <i className="fas fa-calendar-check text-lg"></i>
                      <span className="text-[10px] mt-1 font-medium">Bookings</span>
                    </Link>
                  )}
                  {user.role === 'admin' && (
                    <Link to="/admin" className="flex flex-col items-center text-slate-400 hover:text-orange-600 transition-colors">
                      <i className="fas fa-shield-halved text-lg"></i>
                      <span className="text-[10px] mt-1 font-medium">Admin</span>
                    </Link>
                  )}
                  <button onClick={handleLogout} className="flex flex-col items-center text-slate-500 hover:text-orange-600 transition-colors">
                    <i className="fas fa-right-from-bracket text-lg"></i>
                    <span className="text-[10px] mt-1 font-medium">Logout</span>
                  </button>
                </>
              ) : (
                <Link to="/auth" className="flex flex-col items-center text-orange-600 hover:text-orange-700 transition-colors">
                  <i className="fas fa-user text-lg"></i>
                  <span className="text-[10px] mt-1 font-medium">Login</span>
                </Link>
              )}
            </div>
          </div>
        </header>

        <main className="flex-grow max-w-7xl mx-auto w-full px-4 py-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-slate-400 text-sm font-medium">Loading...</div>
            </div>
          ) : (
            <Routes>
              <Route path="/" element={<Home providers={providers} lostFound={lostFound} communityAlert={communityAlert} setCommunityAlert={setCommunityAlert} />} />
              <Route path="/directory" element={<Directory providers={providers} user={user} />} />
              <Route path="/provider/:id" element={<ProviderDetail providers={providers} setProviders={setProviders} reviews={reviews} setReviews={setReviews} user={user} />} />
              <Route path="/lost-found" element={<LostFound posts={lostFound} setPosts={setLostFound} user={user} />} />
              <Route path="/lost-found/new" element={<CreateLostFound setPosts={setLostFound} user={user} />} />
              <Route path="/add-provider" element={<AddProvider setProviders={setProviders} user={user} />} />
              <Route path="/review/:providerId" element={<AddReview providers={providers} reviews={reviews} setReviews={setReviews} user={user} />} />
              <Route path="/ask" element={<Recommendations requests={requests} setRequests={setRequests} user={user} />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/spotlights" element={<Spotlights user={user} />} />
              <Route path="/book/:type" element={<BookSpotlight user={user} />} />
              <Route path="/book/success" element={<BookingSuccess user={user} />} />
              <Route path="/my-bookings" element={<MyBookings user={user} />} />
              <Route path="/admin" element={<Admin user={user} communityAlert={communityAlert} setCommunityAlert={setCommunityAlert} />} />
            </Routes>
          )}
        </main>

        {/* Mobile Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 mobile-nav-shadow" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <div className="h-16 flex items-center justify-around">
            <Link to="/" className="flex flex-col items-center text-slate-400 hover:text-orange-600">
              <i className="fas fa-home text-lg"></i>
              <span className="text-[10px] mt-1 font-medium">Home</span>
            </Link>
            <Link to="/directory" state={{ scrollTop: true }} className="flex flex-col items-center text-slate-400 hover:text-orange-600">
              <i className="fas fa-search text-lg"></i>
              <span className="text-[10px] mt-1 font-medium">Businesses</span>
            </Link>
            <Link to="/spotlights" className="flex flex-col items-center text-slate-400 hover:text-orange-600">
              <i className="fas fa-calendar-alt text-lg"></i>
              <span className="text-[10px] mt-1 font-medium">Events</span>
            </Link>
            <Link to="/ask" className="flex flex-col items-center text-slate-400 hover:text-orange-600">
              <i className="fas fa-comments text-lg"></i>
              <span className="text-[10px] mt-1 font-medium">Ask</span>
            </Link>
          </div>
        </nav>
      </div>
    </HashRouter>
  );
};

export default App;
