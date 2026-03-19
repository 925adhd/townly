
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { LostFoundPost, LostFoundType, Town } from '../types';
import { addLostFoundPost } from '../lib/api';
import CustomSelect from '../components/CustomSelect';
import { getCurrentTenant } from '../tenants';

const tenant = getCurrentTenant();

interface CreateLostFoundProps {
  setPosts: React.Dispatch<React.SetStateAction<LostFoundPost[]>>;
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

const CreateLostFound: React.FC<CreateLostFoundProps> = ({ setPosts, user }) => {
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const [type, setType] = useState<LostFoundType>('lost_pet');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [location, setLocation] = useState('');
  const [town, setTown] = useState<Town>(tenant.towns[0]);
  const [date, setDate] = useState('');
  const [contact, setContact] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoPreviewRef = useRef<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const types: { id: LostFoundType, label: string }[] = [
    { id: 'lost_pet', label: 'Lost Pet' },
    { id: 'found_pet', label: 'Found Pet' },
    { id: 'lost_package', label: 'Lost Package' },
    { id: 'found_package', label: 'Found Package' },
    { id: 'lost_item', label: 'Lost Item' },
    { id: 'found_item', label: 'Found Item' },
  ];

  const towns: Town[] = tenant.towns;

  if (!user) return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 bg-white rounded-3xl border border-slate-100 shadow-sm max-w-md mx-auto">
      <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center mb-4">
        <i className="fas fa-paw text-orange-500 text-2xl"></i>
      </div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">Post a Lost & Found Alert</h2>
      <p className="text-slate-500 text-sm mb-6 leading-relaxed">Create a free account to post alerts and help reunite the community with lost pets and property.</p>
      <Link to="/login?signup=true" state={{ from: routeLocation.pathname }} className="w-full bg-orange-600 hover:bg-orange-500 text-white px-8 py-3 rounded-xl font-bold transition-colors shadow-sm">
        Create Free Account
      </Link>
      <Link to="/login" state={{ from: routeLocation.pathname }} className="mt-2 text-sm text-slate-500 hover:text-slate-700 transition-colors">
        Already have an account? Sign in
      </Link>
    </div>
  );

  // Revoke any existing blob URL when a new one is created or on unmount
  useEffect(() => {
    return () => {
      if (photoPreviewRef.current) URL.revokeObjectURL(photoPreviewRef.current);
    };
  }, []);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (photoPreviewRef.current) {
      URL.revokeObjectURL(photoPreviewRef.current);
      photoPreviewRef.current = null;
    }
    setPhotoFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      photoPreviewRef.current = url;
      setPhotoPreview(url);
    } else {
      setPhotoPreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const newPost = await addLostFoundPost(
        {
          type,
          title,
          description: desc,
          locationDescription: location,
          town,
          dateOccurred: date,
          contactMethod: contact,
        },
        photoFile,
        user.id,
        user.name
      );
      setPosts(prev => [newPost, ...prev]);
      navigate('/lost-found');
    } catch (err: any) {
      setError(err.message || 'Failed to post alert. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto pb-10">
      <h1 className="text-2xl font-bold mb-2">Create an Alert</h1>
      <p className="text-slate-500 mb-6">Reach locals quickly. Include as much detail as possible.</p>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl space-y-5 text-slate-900">
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">Type of Alert</label>
          <div className="flex flex-wrap gap-2">
            {types.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setType(t.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  type === t.id ? 'bg-orange-600 text-white shadow-md' : 'bg-slate-50 text-slate-500 border border-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Title</label>
          <input
            type="text"
            name="title"
            required
            placeholder="e.g. Brown Beagle found on Main St"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-orange-500 outline-none"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Town</label>
            <CustomSelect
              value={town}
              onChange={(v) => setTown(v as Town)}
              options={towns.map(t => ({ value: t, label: t }))}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1 ml-1">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Date Occurred</label>
              <button
                type="button"
                onClick={() => setDate(new Date().toISOString().split('T')[0])}
                className="text-[10px] font-bold text-orange-600 hover:text-orange-700 uppercase tracking-wide"
              >
                Today
              </button>
            </div>
            <input
              type="date"
              name="date-occurred"
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-orange-500 outline-none"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Specific Location</label>
          <input
            type="text"
            name="location"
            placeholder="e.g. Near the Dollar General, or 402 Oak St porch"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-orange-500 outline-none"
            value={location}
            onChange={e => setLocation(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Description</label>
          <textarea
            required
            rows={4}
            placeholder="Describe the pet, item, or package. For pets, include physical traits, collar color, and temperament..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-orange-500 outline-none resize-none"
            value={desc}
            onChange={e => setDesc(e.target.value)}
          ></textarea>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Contact Method <span className="font-normal normal-case text-slate-300">(optional)</span></label>
          <input
            type="text"
            name="contact"
            placeholder="Phone, Facebook, email, etc."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-orange-500 outline-none"
            value={contact}
            onChange={e => setContact(formatPhone(e.target.value))}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Photo (Optional)</label>
          <input
            type="file"
            name="photo"
            accept="image/*"
            onChange={handlePhotoChange}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-orange-500 outline-none file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-orange-50 file:text-orange-600"
          />
          {photoPreview && (
            <img src={photoPreview} alt="Preview" className="mt-3 w-full h-40 object-cover rounded-xl border border-slate-200" />
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-orange-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-orange-700 transition-colors disabled:opacity-60"
        >
          {loading ? 'Posting...' : 'Post Alert'}
        </button>
      </form>
    </div>
  );
};

export default CreateLostFound;
