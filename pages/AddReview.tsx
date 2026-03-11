
import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Provider, Review, CostRange } from '../types';
import { addReview } from '../lib/api';
import CustomSelect from '../components/CustomSelect';

interface AddReviewProps {
  providers: Provider[];
  reviews: Review[];
  setReviews: React.Dispatch<React.SetStateAction<Review[]>>;
  user: { id: string, name: string } | null;
}

const AddReview: React.FC<AddReviewProps> = ({ providers, reviews, setReviews, user }) => {
  const { providerId } = useParams<{ providerId: string }>();
  const navigate = useNavigate();
  const provider = providers.find(p => p.id === providerId);

  const [rating, setRating] = useState(5);
  const [wouldHireAgain, setWouldHireAgain] = useState<boolean | null>(null);
  const [serviceDesc, setServiceDesc] = useState('');
  const [cost, setCost] = useState<CostRange>('not_shared');
  const [text, setText] = useState('');
  const [date, setDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!user) return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 bg-white rounded-3xl border border-slate-100 shadow-sm max-w-md mx-auto">
      <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center mb-4">
        <i className="fas fa-star text-orange-500 text-2xl"></i>
      </div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">Leave a Review</h2>
      <p className="text-slate-500 text-sm mb-6 leading-relaxed">Create a free account to share your experience and help your neighbors find great local businesses.</p>
      <Link to="/auth?signup=true" className="w-full bg-orange-600 hover:bg-orange-500 text-white px-8 py-3 rounded-xl font-bold transition-colors shadow-sm">
        Create Free Account
      </Link>
      <Link to="/auth" className="mt-2 text-sm text-slate-500 hover:text-slate-700 transition-colors">
        Already have an account? Sign in
      </Link>
    </div>
  );

  if (!provider) return <div className="text-center">Business not found.</div>;

  if (provider.category === 'Churches & Faith') return (
    <div className="text-center py-20 bg-white rounded-3xl border shadow-sm max-w-md mx-auto">
      <i className="fas fa-church text-4xl text-violet-300 mb-4"></i>
      <h2 className="text-xl font-bold mb-2">Reviews not available</h2>
      <p className="text-slate-500 text-sm mb-6">Churches & faith organizations are listed as a community directory only.</p>
      <Link to={`/provider/${provider.id}`} className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold text-sm">Back to Listing</Link>
    </div>
  );

  const alreadyReviewed = reviews.some(r => r.providerId === provider.id && r.userId === user.id);
  if (alreadyReviewed) return (
    <div className="text-center py-20 bg-white rounded-3xl border shadow-sm max-w-md mx-auto">
      <i className="fas fa-check-circle text-emerald-500 text-4xl mb-4"></i>
      <h2 className="text-xl font-bold mb-2">You've already reviewed this business</h2>
      <p className="text-slate-500 text-sm mb-6">Only one review per business is allowed per account.</p>
      <Link to={`/provider/${provider.id}`} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold">Back to Business</Link>
    </div>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (wouldHireAgain === null) { setError('Please tell us if you would hire them again.'); return; }
    setError('');
    setLoading(true);
    try {
      const newReview = await addReview(
        {
          providerId: provider.id,
          rating,
          wouldHireAgain,
          serviceDescription: serviceDesc,
          costRange: cost,
          reviewText: text,
          serviceDate: date,
        },
        user.id,
        user.name
      );
      setReviews(prev => [newReview, ...prev]);
      navigate(`/provider/${provider.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to submit review. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-10">
      <h1 className="text-2xl font-bold mb-2">Write a Review</h1>
      <p className="text-slate-500 mb-6">Sharing your experience with <strong>{provider.name}</strong> helps the community.</p>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl space-y-6 text-slate-900">
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">How would you rate them?</label>
          <div className="flex space-x-4">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className={`w-12 h-12 rounded-xl text-xl flex items-center justify-center transition-all ${
                  rating >= star ? 'bg-amber-100 text-amber-500' : 'bg-slate-50 text-slate-300'
                }`}
              >
                <i className="fas fa-star"></i>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">Would you hire them again?</label>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setWouldHireAgain(true)}
              className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${
                wouldHireAgain === true ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-slate-100 text-slate-400'
              }`}
            >
              <i className="fas fa-thumbs-up mr-2"></i> Yes
            </button>
            <button
              type="button"
              onClick={() => setWouldHireAgain(false)}
              className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${
                wouldHireAgain === false ? 'bg-red-50 border-red-500 text-red-700' : 'bg-white border-slate-100 text-slate-400'
              }`}
            >
              <i className="fas fa-thumbs-down mr-2"></i> No
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">What service was done?</label>
            <input
              type="text"
              name="service-description"
              required
              placeholder="e.g. Fixed HVAC unit"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
              value={serviceDesc}
              onChange={e => setServiceDesc(e.target.value)}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1 ml-1">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Approx. Date</label>
              <button
                type="button"
                onClick={() => setDate(new Date().toISOString().split('T')[0])}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wide"
              >
                Today
              </button>
            </div>
            <input
              type="date"
              name="service-date"
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Cost Range (Optional)</label>
          <CustomSelect
            value={cost}
            onChange={(v) => setCost(v as CostRange)}
            options={[
              { value: 'not_shared', label: 'Prefer not to say' },
              { value: 'under_100', label: 'Under $100' },
              { value: '100_500', label: '$100 - $500' },
              { value: '500_1000', label: '$500 - $1,000' },
              { value: '1000_5000', label: '$1,000 - $5,000' },
              { value: 'over_5000', label: 'Over $5,000' },
            ]}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Your Review</label>
          <textarea
            required
            rows={4}
            placeholder="Tell us about the quality of work, professionalism, and if you would recommend them..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            value={text}
            onChange={e => setText(e.target.value)}
          ></textarea>
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
          {loading ? 'Submitting...' : 'Submit Review'}
        </button>
      </form>
    </div>
  );
};

export default AddReview;
