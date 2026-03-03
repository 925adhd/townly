
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Provider, LostFoundPost } from '../types';
import { getCurrentTenant } from '../tenants';

const tenant = getCurrentTenant();

interface HomeProps {
  providers: Provider[];
  lostFound: LostFoundPost[];
}

const Home: React.FC<HomeProps> = ({ providers, lostFound }) => {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const categories = [
    { name: 'Home Services', label: 'Home Services', icon: 'fa-house-chimney', color: 'bg-blue-100 text-blue-600' },
    { name: 'Auto', label: 'Auto', icon: 'fa-car', color: 'bg-indigo-100 text-indigo-600' },
    { name: 'Personal Care', label: 'Personal Care', icon: 'fa-scissors', color: 'bg-pink-100 text-pink-600' },
    { name: 'Healthcare', label: 'Healthcare', icon: 'fa-stethoscope', color: 'bg-emerald-100 text-emerald-600' },
    { name: 'Restaurants', label: 'Restaurants', icon: 'fa-utensils', color: 'bg-red-100 text-red-600' },
    { name: 'Rentals', label: 'Rentals', icon: 'fa-key', color: 'bg-purple-100 text-purple-600' },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/directory?q=${encodeURIComponent(search)}`);
  };

  const sortedPosts = [...lostFound].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const latestAlert = sortedPosts.find(p => p.status === 'active');
  const latestLF = sortedPosts.find(p => p.id !== latestAlert?.id) ?? sortedPosts[0];

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-4">

      {/* Hero Section */}
      <section
        className="text-center md:text-left relative overflow-hidden rounded-3xl text-white px-4 py-8 md:px-10 md:py-14"
        style={{ backgroundImage: "url('/images/lakebackground.png')", backgroundPosition: 'center', backgroundSize: 'cover', backgroundRepeat: 'no-repeat' }}
      >
        {/* Dark overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(to right, rgba(10, 25, 50, 0.85), rgba(10, 25, 50, 0.60))' }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:gap-10">

          {/* Logo */}
          <div className="flex-shrink-0 mb-4 md:mb-0 max-w-[187px] md:max-w-[360px] mx-auto md:mx-0">
            <img src="/images/townly.png" alt={tenant.displayName} className="w-full h-auto drop-shadow-2xl" />
          </div>

          <div className="flex flex-col items-center md:items-start max-w-2xl">
          <h1 className="text-xl md:text-4xl font-bold text-white mb-2 leading-tight">
            What's happening in your town?
          </h1>
          <p className="text-white/75 text-sm md:text-base mb-6 font-medium leading-relaxed">
            Find trusted local pros. See community updates. Stay connected.
          </p>

          {/* CTA Buttons */}
          <div className="hidden md:flex flex-row items-start gap-3 mb-6">
            <Link
              to="/spotlights"
              className="flex items-center gap-1.5 bg-blue-700 hover:bg-blue-600 text-white px-5 py-2 rounded-xl font-semibold text-sm shadow transition-all hover:scale-105 active:scale-95"
            >
              Browse Events
            </Link>
            <Link
              to="/directory"
              className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 text-white/85 px-5 py-2 rounded-xl font-medium text-sm transition-all hover:scale-105 active:scale-95"
            >
              Find a Local Pro
            </Link>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="w-full relative mt-3 md:mt-0">
            <input
              type="text"
              name="search"
              placeholder="Search local pros..."
              className="w-full h-11 pl-10 pr-24 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-2xl focus:ring-2 focus:ring-orange-500 focus:bg-white text-white focus:text-slate-900 outline-none transition-all placeholder:text-slate-400 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 bg-orange-600 text-white px-4 py-1.5 rounded-lg font-bold text-sm shadow-lg hover:bg-orange-500 transition-colors">
              Search
            </button>
          </form>
          </div>
        </div>
      </section>

      {/* Community Highlights */}
      <section>
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center space-x-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
            </span>
            <h2 className="text-base font-semibold text-slate-900">Around Town</h2>
          </div>
          <Link to="/spotlights" className="text-amber-600 font-normal text-[10px] whitespace-nowrap hover:underline flex-shrink-0">See all spotlights</Link>
        </div>

        <div className="space-y-3">

          {/* Spotlight Card — full width, dominant */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl px-6 py-7 md:px-8 md:py-8 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5 flex flex-col md:flex-row md:items-center md:gap-10">
            <div className="flex flex-col flex-1">
              <span className="text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-widest bg-amber-500 text-white self-start mb-3">
                Around Town
              </span>
              <h3 className="font-extrabold text-slate-900 text-[19px] leading-tight mb-1">Disaster Preparedness Summit</h3>
              <p className="text-slate-500 text-xs flex items-center gap-1 mb-3">
                <i className="fas fa-map-marker-alt text-orange-400 text-[10px]"></i> {tenant.name} Extension Office
              </p>
              <p className="text-slate-600 text-xs leading-relaxed">
                Apr 2 · 4:30–6:30 PM. Keynote, panels &amp; resource expo. Free admission, all ages welcome.
              </p>
            </div>
            <Link to="/spotlights" className="mt-5 md:mt-0 md:flex-shrink-0 inline-flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-5 py-3 rounded-xl transition-colors shadow-sm">
              View Event Details <i className="fas fa-arrow-right text-[10px]"></i>
            </Link>
          </div>

          {/* Second row: community cards */}
          <div className="grid md:grid-cols-2 gap-3">

            {/* Community Alert Card */}
            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col">
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest bg-orange-100 text-orange-600 self-start mb-2">
                Community Alert
              </span>
              {latestAlert ? (
                <>
                  <h3 className="font-bold text-slate-900 text-sm leading-tight mb-1">{latestAlert.title}</h3>
                  <p className="text-slate-500 text-xs flex items-center">
                    <i className="fas fa-map-marker-alt mr-1 text-orange-400"></i>
                    {latestAlert.locationDescription}
                  </p>
                  <Link to="/lost-found" className="mt-auto pt-3 inline-flex items-center text-orange-600 text-xs font-bold hover:underline">
                    View board <i className="fas fa-arrow-right ml-1 text-[10px]"></i>
                  </Link>
                </>
              ) : (
                <p className="text-slate-400 text-xs leading-relaxed mt-1">
                  No alerts right now. That's a good sign.
                </p>
              )}
            </div>

            {/* Lost & Found Card */}
            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col">
              {latestLF ? (
                <>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest self-start mb-2 ${
                    latestLF.type.includes('lost') ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                  }`}>
                    {latestLF.type.replace('_', ' ')}
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm leading-tight mb-1">{latestLF.title}</h3>
                  <p className="text-slate-500 text-xs flex items-center">
                    <i className="fas fa-map-marker-alt mr-1 text-orange-400"></i>
                    {latestLF.locationDescription}
                  </p>
                  <Link to="/lost-found" className="mt-auto pt-3 inline-flex items-center text-orange-600 text-xs font-bold hover:underline">
                    View board <i className="fas fa-arrow-right ml-1 text-[10px]"></i>
                  </Link>
                </>
              ) : (
                <>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest bg-slate-100 text-slate-500 self-start mb-2">
                    Lost &amp; Found
                  </span>
                  <p className="text-slate-400 text-xs leading-relaxed mt-1">
                    No lost or found items reported today.
                  </p>
                </>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* Popular Categories */}
      <section>
        <div className="flex items-center justify-between mb-2 px-1">
          <h2 className="text-base font-bold text-slate-900">Popular Categories</h2>
          <Link to="/directory" className="text-orange-600 font-bold text-sm hover:underline">View all</Link>
        </div>
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 md:gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.name}
              to={`/directory?cat=${encodeURIComponent(cat.name)}`}
              className="group flex flex-col items-center p-3 md:p-5 bg-white border border-slate-100 rounded-2xl md:rounded-3xl shadow-sm hover:shadow-md hover:border-orange-100 transition-all text-center"
            >
              <div className={`${cat.color} w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center mb-1.5 md:mb-3 group-hover:scale-110 transition-transform shadow-sm`}>
                <i className={`fas ${cat.icon} text-lg md:text-2xl`}></i>
              </div>
              <span className="font-bold text-slate-800 text-xs md:text-sm">{cat.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Community CTA */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-50/70 rounded-[2.5rem] px-6 py-3 md:px-10 md:py-14 relative overflow-hidden border border-blue-100">
        <div className="hidden md:block absolute md:top-1/2 md:right-20 md:-translate-y-1/2 pointer-events-none md:opacity-[0.07] text-blue-400">
          <i className="fas fa-comment md:text-[250px] leading-none"></i>
        </div>
        <div className="relative z-10 max-w-xl">
          <h2 className="text-xl md:text-3xl font-bold text-slate-900 mb-3 md:mb-4">Your Voice Helps This Community</h2>
          <p className="text-slate-500 mb-5 md:mb-8 text-sm md:text-lg leading-relaxed">
            Know a business worth listing? Add them to the directory.<br />
            Looking for a trusted local pro? Ask your neighbors.
          </p>
          <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:gap-3">
            <Link to="/add-provider" className="w-full md:w-auto text-center bg-blue-800 text-white px-6 py-3 md:px-8 md:py-4 rounded-2xl font-bold shadow-sm hover:bg-blue-700 transition-all hover:scale-105 active:scale-95">
              Add a Local Business
            </Link>
            <Link to="/ask" className="w-full md:w-auto text-center bg-white text-slate-700 border border-slate-300 px-6 py-3 md:px-8 md:py-4 rounded-2xl font-bold shadow-sm hover:bg-slate-100 transition-all hover:scale-105 active:scale-95">
              Ask the Community
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Home;
