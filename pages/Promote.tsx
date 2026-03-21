
import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface PromoteProps {
  user: { id: string; name: string; email?: string; role?: string } | null;
}

const Promote: React.FC<PromoteProps> = ({ user }) => {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const el = document.getElementById(location.hash.slice(1));
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  }, [location.hash]);

  return (
    <div className="max-w-4xl mx-auto pb-6 -mt-2 md:mt-0">
      <div className="pt-2 pb-1 md:pt-4 md:pb-2">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Promote Your Post</h1>
        <p className="text-slate-500 text-sm">Promote an event, business, or announcement for extra visibility this week.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 items-start">

        {/* Local Spotlight — full width */}
        <div id="spotlight" className="bg-gradient-to-br from-amber-50 to-orange-50/70 border border-amber-200 rounded-3xl p-8 space-y-3 shadow-md">
          <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center shadow-sm">
            <i className="fas fa-star text-amber-500 text-xl"></i>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Weekly Spotlight</h2>
          <p className="text-slate-600 text-sm leading-relaxed">
            The most visible placement on Townly.<br />Your post appears prominently on the Home and Events pages.
          </p>
          <div className="pt-1">
            <span className="text-3xl font-bold text-amber-600">$25</span>
            <span className="text-slate-400 text-sm font-medium"> / week</span>
          </div>
          <ul className="space-y-1.5 text-sm text-slate-600">
            <li className="flex items-center gap-2"><i className="fas fa-check text-amber-500 text-xs"></i> Priority placement on the Home and Events pages</li>
            <li className="flex items-center gap-2"><i className="fas fa-check text-amber-500 text-xs"></i> Highlighted with an amber spotlight card to stand out</li>
            <li className="flex items-center gap-2"><i className="fas fa-check text-amber-500 text-xs"></i> Large spotlight banner for your event or announcement</li>
            <li className="flex items-center gap-2"><i className="fas fa-check text-amber-500 text-xs"></i> Clickable flyer or event image</li>
            <li className="flex items-center gap-2"><i className="fas fa-check text-amber-500 text-xs"></i> Pinned for the full week</li>
            <li className="flex items-center gap-2 font-semibold text-amber-700"><i className="fas fa-lock text-amber-500 text-xs"></i> Only 1 spotlight available each week</li>
          </ul>
          <p className="text-xs text-amber-700/80 font-medium">Perfect for grand openings, sales, local events, and time-sensitive announcements.</p>
          <Link
            to={user ? '/book/spotlight' : '/login?signup=true'}
            state={user ? undefined : { from: location.pathname }}
            className="mt-2 w-full inline-flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 text-white font-bold px-6 py-3 rounded-xl shadow-sm transition-colors text-sm"
          >
            <i className="fas fa-star"></i>
            {user ? 'Book a Weekly Spotlight' : 'Sign In to Book'}
          </Link>
        </div>

        {/* Featured Post */}
        <div id="featured" className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 shadow-sm">
          <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center shadow-sm">
            <i className="fas fa-bullhorn text-slate-400 text-base"></i>
          </div>
          <h2 className="text-base font-bold text-slate-800">Featured Post</h2>
          <p className="text-slate-500 text-xs leading-relaxed">
            Promote your event, business, sale, or announcement this week.
          </p>
          <div className="pt-0.5">
            <span className="text-xl font-bold text-slate-700">$5</span>
            <span className="text-slate-400 text-xs font-medium"> / week</span>
          </div>
          <ul className="space-y-1.5 text-xs text-slate-500">
            <li className="flex items-center gap-2"><i className="fas fa-check text-slate-400 text-[10px]"></i> Shown above regular community posts</li>
            <li className="flex items-center gap-2"><i className="fas fa-check text-slate-400 text-[10px]"></i> Upload an image <em className="text-slate-400">(free posts are text-only)</em></li>
            <li className="flex items-center gap-2"><i className="fas fa-check text-slate-400 text-[10px]"></i> Active for the full week</li>
            <li className="flex items-center gap-2 font-semibold text-slate-600 text-sm"><i className="fas fa-lock text-slate-400 text-xs"></i> Only 5 featured posts available each week</li>
          </ul>
          <p className="text-xs text-slate-400 font-medium">Perfect for yard sales, fundraisers, local events, and community announcements.</p>
          <Link
            to={user ? '/book/featured' : '/login?signup=true'}
            state={user ? undefined : { from: location.pathname }}
            className="mt-1 w-full inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-sm transition-colors text-xs"
          >
            <i className="fas fa-bullhorn text-[10px]"></i>
            {user ? 'Get Featured This Week' : 'Sign In to Book'}
          </Link>
        </div>

      </div>

      {/* Content Policy Disclaimer */}
      <p className="text-xs text-slate-400 mt-3 mb-1 px-1">
        By submitting a paid post you agree that content violating community standards — including misleading, obscene, or fraudulent posts — may be removed by the admin without refund.
      </p>
    </div>
  );
};

export default Promote;
