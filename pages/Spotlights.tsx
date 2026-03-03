
import React, { useEffect, useState } from 'react';
import { getCurrentTenant } from '../tenants';

const tenant = getCurrentTenant();

const Spotlights: React.FC = () => {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  const [flyerOpen, setFlyerOpen] = useState(false);
  const [upsOpen, setUpsOpen] = useState(false);
  const [entrepreneurOpen, setEntrepreneurOpen] = useState(false);

  return (
    <div className="space-y-10 pb-10 -mt-6 md:mt-0">

      {/* Header */}
      <div className="text-center py-8 md:pt-5 md:pb-4">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-100 rounded-2xl mb-3 shadow-sm">
          <i className="fas fa-star text-amber-500 text-2xl"></i>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Community Spotlights</h1>
        <p className="text-slate-500 text-base max-w-md mx-auto md:leading-snug">
          What's happening in {tenant.name} this week. Local events, businesses, and community news worth knowing about.
        </p>
      </div>

      {/* Current Spotlights */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4 px-1 -mt-4">This Week's Spotlights</h2>
        <div className="grid gap-4">

          {/* Disaster Preparedness Summit */}
          <div className="bg-white rounded-3xl border-2 border-amber-200 overflow-hidden shadow-sm flex flex-col">
            <button
              onClick={() => setFlyerOpen(true)}
              className="w-full block hover:opacity-95 transition-opacity focus:outline-none"
              aria-label="View full flyer"
            >
              <img
                src="/images/disastersummit.jpg"
                alt="Grayson County Disaster Preparedness Summit flyer"
                className="w-full max-h-[260px] object-cover object-top"
              />
            </button>
            <div className="p-6 flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest bg-amber-100 text-amber-700 border border-amber-300 self-start">
                  Local Spotlight
                </span>
                <span className="text-slate-400 text-xs font-medium">Apr 2, 2026</span>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base leading-tight">Grayson County Disaster Preparedness Summit</h3>
                <p className="text-slate-500 text-xs mt-1 flex items-center gap-1">
                  <i className="fas fa-map-marker-alt text-orange-400"></i> Grayson County Extension Office · 64 Quarry Rd, Leitchfield
                </p>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed">
                Join the 2nd Annual Community Disaster Preparedness Summit — designed to help individuals, families, and organizations prepare for emergencies. Featuring a keynote from UK meteorologist Matt Dixon, panel discussions with local emergency officials, and a resource expo with interactive booths.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <i className="fas fa-clock text-amber-400"></i> 4:30 – 6:30 PM
                </div>
                <span className="text-slate-200">·</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Free Admission</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Community Event</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">All Ages Welcome</span>
              </div>
              <button
                onClick={() => setFlyerOpen(true)}
                className="self-start inline-flex items-center gap-1.5 text-orange-600 text-xs font-bold hover:underline"
              >
                <i className="fas fa-image text-[10px]"></i> View full flyer
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Featured Listings */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-1 px-1 -mt-4">Featured Listings</h2>
        <p className="text-slate-400 text-xs mb-4 px-1">Paid listings from local businesses and organizations this week.</p>
        <div className="grid md:grid-cols-2 gap-4">

          {/* Kids Entrepreneur Fair */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-2.5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest bg-slate-100 text-slate-500">Featured Listing</span>
              <span className="text-slate-400 text-xs">Mar 27, 2026</span>
            </div>
            <h3 className="font-bold text-slate-900 text-sm leading-tight">2nd Annual Kids Entrepreneur Fair</h3>
            <p className="text-slate-500 text-xs flex items-center gap-1">
              <i className="fas fa-map-marker-alt text-orange-400 text-[10px]"></i> Centre on Main · 425 S. Main Street, Leitchfield
            </p>
            <p className="text-slate-500 text-xs leading-relaxed">
              Grades K–12 showcase their businesses, hosted by YP of Grayson County. Kids get 30 min of early shopping before public viewing. Awards voted by peers prior to the event.
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <i className="fas fa-clock text-amber-400 text-[10px]"></i> 5:00 – 7:00 PM
              </div>
              <span className="text-slate-200">·</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Free Entry</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Grades K–12</span>
            </div>
            <p className="text-[10px] text-slate-400 italic">Limited booths · Must register in advance</p>
            <button
              onClick={() => setEntrepreneurOpen(true)}
              className="self-start inline-flex items-center gap-1.5 text-orange-600 text-xs font-bold hover:underline mt-0.5"
            >
              <i className="fas fa-image text-[10px]"></i> View full image
            </button>
          </div>

          {/* UPS Store Ribbon Cutting */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-2.5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest bg-slate-100 text-slate-500">Featured Listing</span>
              <span className="text-slate-400 text-xs">Mar 2, 2026</span>
            </div>
            <h3 className="font-bold text-slate-900 text-sm leading-tight">Ribbon Cutting – The UPS Store (Leitchfield)</h3>
            <p className="text-slate-500 text-xs flex items-center gap-1">
              <i className="fas fa-map-marker-alt text-orange-400 text-[10px]"></i> 52 Public Square · Leitchfield, KY 42754
            </p>
            <p className="text-slate-500 text-xs leading-relaxed">
              Join the Grayson County Chamber of Commerce for a ribbon cutting ceremony celebrating The UPS Store's Leitchfield location. Come welcome the new business and support local growth.
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <i className="fas fa-clock text-amber-400 text-[10px]"></i> 10:00 AM
              </div>
              <span className="text-slate-200">·</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Chamber Event</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Business Opening</span>
            </div>
            <button
              onClick={() => setUpsOpen(true)}
              className="self-start inline-flex items-center gap-1.5 text-orange-600 text-xs font-bold hover:underline mt-0.5"
            >
              <i className="fas fa-image text-[10px]"></i> View full image
            </button>
          </div>

        </div>
      </div>

      {/* Pricing tiers */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-1 px-1">Share Something With Your Community</h2>
        <p className="text-slate-500 text-sm mb-4 px-1">Have an event, a business, or something worth sharing? Get it in front of your neighbors.</p>
        <div className="space-y-5">

          {/* Local Spotlight — full width */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50/70 border border-amber-200 rounded-3xl p-8 space-y-3 shadow-md">
            <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center shadow-sm">
              <i className="fas fa-house text-amber-500 text-xl"></i>
            </div>
            <h2 className="text-xl font-bold text-slate-900">Local Spotlight</h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              The most visible spot on Townly this week. One business or event, featured on the home page for every neighbor who visits. Once it's taken, it's gone until next week.
            </p>
            <div className="pt-1">
              <span className="text-3xl font-bold text-amber-600">$25</span>
              <span className="text-slate-400 text-sm font-medium"> / week</span>
            </div>
            <ul className="space-y-1.5 text-sm text-slate-600">
              <li className="flex items-center gap-2"><i className="fas fa-check text-amber-500 text-xs"></i> Prime placement on the home page</li>
              <li className="flex items-center gap-2"><i className="fas fa-check text-amber-500 text-xs"></i> Highlighted gold border — stands out on this page</li>
              <li className="flex items-center gap-2"><i className="fas fa-check text-amber-500 text-xs"></i> Custom description &amp; icon</li>
              <li className="flex items-center gap-2"><i className="fas fa-check text-amber-500 text-xs"></i> Pinned at the TOP of this page all week</li>
              <li className="flex items-center gap-2 font-semibold text-amber-700"><i className="fas fa-lock text-amber-500 text-xs"></i> Only 1 slot available per week</li>
            </ul>
            <a
              href="mailto:hello@townlyapp.io?subject=Local Spotlight Inquiry"
              className="mt-2 w-full inline-flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 text-white font-bold px-6 py-3 rounded-xl shadow-sm transition-colors text-sm"
            >
              <i className="fas fa-envelope"></i>
              Book the Local Spotlight
            </a>
          </div>

          {/* Other Featured Listings */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-3 px-1">Other Featured Listings</p>
            <div className="grid md:grid-cols-2 gap-4">

              {/* Featured Listing — slot 1 */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-2.5 shadow-sm">
                <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center shadow-sm">
                  <i className="fas fa-store text-slate-400 text-base"></i>
                </div>
                <h2 className="text-base font-bold text-slate-800">Featured Listing</h2>
                <p className="text-slate-500 text-xs leading-relaxed">
                  A simple way to let your neighbors know what you're up to. Good for an upcoming event, a seasonal offer, or just something worth sharing this week.
                </p>
                <div className="pt-0.5">
                  <span className="text-xl font-bold text-slate-700">$5</span>
                  <span className="text-slate-400 text-xs font-medium"> / week</span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-500">
                  <li className="flex items-center gap-2"><i className="fas fa-check text-slate-400 text-[10px]"></i> Listed on this Spotlights page</li>
                  <li className="flex items-center gap-2"><i className="fas fa-check text-slate-400 text-[10px]"></i> Custom description &amp; icon</li>
                  <li className="flex items-center gap-2"><i className="fas fa-check text-slate-400 text-[10px]"></i> No long-term commitment — book by the week</li>
                </ul>
                <a
                  href="mailto:hello@townlyapp.io?subject=Featured Listing Inquiry"
                  className="mt-1 w-full inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-sm transition-colors text-xs"
                >
                  <i className="fas fa-envelope text-[10px]"></i>
                  Get a Featured Listing
                </a>
              </div>

              {/* Featured Listing — slot 2 */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-2.5 shadow-sm">
                <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center shadow-sm">
                  <i className="fas fa-store text-slate-400 text-base"></i>
                </div>
                <h2 className="text-base font-bold text-slate-800">Featured Listing</h2>
                <p className="text-slate-500 text-xs leading-relaxed">
                  A simple way to let your neighbors know what you're up to. Good for an upcoming event, a seasonal offer, or just something worth sharing this week.
                </p>
                <div className="pt-0.5">
                  <span className="text-xl font-bold text-slate-700">$5</span>
                  <span className="text-slate-400 text-xs font-medium"> / week</span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-500">
                  <li className="flex items-center gap-2"><i className="fas fa-check text-slate-400 text-[10px]"></i> Listed on this Spotlights page</li>
                  <li className="flex items-center gap-2"><i className="fas fa-check text-slate-400 text-[10px]"></i> Custom description &amp; icon</li>
                  <li className="flex items-center gap-2"><i className="fas fa-check text-slate-400 text-[10px]"></i> No long-term commitment — book by the week</li>
                </ul>
                <a
                  href="mailto:hello@townlyapp.io?subject=Featured Listing Inquiry"
                  className="mt-1 w-full inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-sm transition-colors text-xs"
                >
                  <i className="fas fa-envelope text-[10px]"></i>
                  Get a Featured Listing
                </a>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* Flyer modal */}
      {flyerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setFlyerOpen(false)}
        >
          <div
            className="relative max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setFlyerOpen(false)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors z-10"
              aria-label="Close flyer"
            >
              <i className="fas fa-times text-sm"></i>
            </button>
            <img
              src="/images/disastersummit.jpg"
              alt="Grayson County Disaster Preparedness Summit flyer"
              className="w-full rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* Kids Entrepreneur Fair modal */}
      {entrepreneurOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setEntrepreneurOpen(false)}
        >
          <div
            className="relative max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setEntrepreneurOpen(false)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors z-10"
              aria-label="Close image"
            >
              <i className="fas fa-times text-sm"></i>
            </button>
            <img
              src="/images/entrepreneur.jpg"
              alt="2nd Annual Kids Entrepreneur Fair"
              className="w-full rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* UPS Store modal */}
      {upsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setUpsOpen(false)}
        >
          <div
            className="relative max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setUpsOpen(false)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors z-10"
              aria-label="Close image"
            >
              <i className="fas fa-times text-sm"></i>
            </button>
            <img
              src="/images/ups.jpg"
              alt="Ribbon Cutting – The UPS Store Leitchfield"
              className="w-full rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default Spotlights;
