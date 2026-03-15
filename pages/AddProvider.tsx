
import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Provider, Category, Town } from '../types';
import { addProvider } from '../lib/api';
import CustomSelect from '../components/CustomSelect';
import { getCurrentTenant } from '../tenants';

const tenant = getCurrentTenant();

interface AddProviderProps {
  setProviders: React.Dispatch<React.SetStateAction<Provider[]>>;
  user: { id: string, name: string } | null;
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

const AddProvider: React.FC<AddProviderProps> = ({ setProviders, user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [name, setName] = useState('');
  const [cat, setCat] = useState<Category>('Home Services');
  const [sub, setSub] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [town, setTown] = useState<Town>(tenant.towns[0]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const categories: Category[] = ['Food & Drink', 'Shopping', 'Home Services', 'Automotive', 'Personal Care', 'Health & Medical', 'Professional Services', 'Housing & Rentals', 'Churches', 'Schools & Education', 'Government & Public Services', 'Events & Community', 'Parks & Recreation', 'Other'];
  const towns: Town[] = tenant.towns;

  if (!user) return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 bg-white rounded-3xl border border-slate-100 shadow-sm max-w-md mx-auto">
      <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center mb-4">
        <i className="fas fa-store text-orange-500 text-2xl"></i>
      </div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">Add your business to {tenant.name}</h2>
      <p className="text-slate-500 text-sm mb-6 leading-relaxed">Create a free account to list your business and connect with your community.</p>
      <Link to="/login?signup=true" state={{ from: location.pathname }} className="w-full bg-orange-600 hover:bg-orange-500 text-white px-8 py-3 rounded-xl font-bold transition-colors shadow-sm">
        Create Free Account
      </Link>
      <Link to="/login" state={{ from: location.pathname }} className="mt-2 text-sm text-slate-500 hover:text-slate-700 transition-colors">
        Already have an account? Sign in
      </Link>
    </div>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const newProvider = await addProvider({ name, category: cat, subcategory: sub, phone, address, town }, user.id);
      setProviders(prev => [newProvider, ...prev]);
      navigate(`/provider/${newProvider.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to add business. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto pb-10">
      <h1 className="text-2xl font-bold mb-2">{cat === 'Churches' ? 'Add a Church or Faith Organization' : 'List a New Business'}</h1>
      <p className="text-slate-500 mb-6">{cat === 'Churches' ? `Help your community find faith communities in ${tenant.name}.` : `Help others find great services in ${tenant.name}.`}</p>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl space-y-5 text-slate-900">
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">{cat === 'Churches' ? 'Church / Organization Name' : 'Business Name'}</label>
          <input
            type="text"
            name="business-name"
            required
            placeholder={cat === 'Churches' ? 'e.g. First Baptist Church' : "e.g. Mike's Masonry"}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Category</label>
            <CustomSelect
              value={cat}
              onChange={(v) => setCat(v as any)}
              options={categories.map(c => ({ value: c, label: c }))}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Town</label>
            <CustomSelect
              value={town}
              onChange={(v) => setTown(v as any)}
              options={towns.map(t => ({ value: t, label: t }))}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">{cat === 'Churches' ? 'Denomination / Type' : 'Specific Service'}</label>
          <input
            type="text"
            name="subcategory"
            placeholder={cat === 'Churches' ? 'e.g. Baptist, Methodist, Non-Denominational' : 'e.g. Chimney Repair, Bricklaying'}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
            value={sub}
            onChange={e => setSub(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">
            Address{cat !== 'Churches' && <span className="normal-case text-slate-300 font-normal"> (optional)</span>}
          </label>
          <input
            type="text"
            name="address"
            required={cat === 'Churches'}
            placeholder={cat === 'Churches' ? 'e.g. 123 Main St, Leitchfield, KY' : 'e.g. 123 Main St — leave blank if mobile/on-site'}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
            value={address}
            onChange={e => setAddress(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Phone Number</label>
          <input
            type="tel"
            name="phone"
            placeholder="(270) 555-0000"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
            value={phone}
            onChange={e => setPhone(formatPhone(e.target.value))}
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
        >
          {loading ? 'Saving...' : cat === 'Churches' ? 'Add Listing' : 'Add Business'}
        </button>
      </form>
    </div>
  );
};

export default AddProvider;
