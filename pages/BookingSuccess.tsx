
import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { verifyStripeSession, submitSpotlightBooking } from '../lib/api';

const STORAGE_KEY = 'townly_pending_booking';

type Stage = 'verifying' | 'done' | 'error';

interface BookingSuccessProps {
  user: { id: string; name: string; email?: string } | null;
  onBookingConfirmed?: () => void;
}

const BookingSuccess: React.FC<BookingSuccessProps> = ({ user, onBookingConfirmed }) => {
  const location = useLocation();
  const [stage, setStage] = useState<Stage>('verifying');
  const [errorMsg, setErrorMsg] = useState('');
  const [bookingType, setBookingType] = useState<'spotlight' | 'featured'>('spotlight');

  useEffect(() => {
    window.scrollTo(0, 0);

    const params = new URLSearchParams(location.search);
    const sessionId = params.get('session_id');
    if (!sessionId) {
      setErrorMsg('No payment session found. If you completed payment, please contact support.');
      setStage('error');
      return;
    }

    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setErrorMsg('Booking data not found. If you completed payment, please contact support@townly.us with your Stripe receipt.');
      setStage('error');
      return;
    }

    let booking: any;
    try {
      booking = JSON.parse(raw);
      setBookingType(booking.type ?? 'spotlight');
    } catch {
      setErrorMsg('Booking data was corrupted. Please contact support@townly.us with your Stripe receipt.');
      setStage('error');
      return;
    }

    (async () => {
      try {
        const { paid } = await verifyStripeSession(sessionId);
        if (!paid) {
          setErrorMsg('Payment was not completed. Please try again or contact support.');
          setStage('error');
          sessionStorage.removeItem(STORAGE_KEY);
          return;
        }

        await submitSpotlightBooking(
          booking.type,
          booking.title,
          booking.desc,
          booking.weekStart,
          booking.eventDate ?? '',
          booking.eventTime ?? '',
          booking.location ?? '',
          booking.town ?? '',
          booking.contactName ?? '',
          booking.contactEmail ?? '',
          '',
          booking.bannerUrl ?? '',
          booking.thumbnailUrl,
          booking.flyerUrl,
          booking.tags,
          booking.teaser,
          sessionId,
          'paid',
        );

        sessionStorage.removeItem(STORAGE_KEY);
        localStorage.setItem('townly_has_bookings', '1');
        onBookingConfirmed?.();
        setStage('done');
      } catch (err: any) {
        sessionStorage.removeItem(STORAGE_KEY);
        setErrorMsg(err.message || 'Something went wrong confirming your booking. Please contact support@townly.us with your Stripe receipt.');
        setStage('error');
      }
    })();
  }, []);

  if (stage === 'verifying') {
    return (
      <div className="max-w-lg mx-auto pt-16 text-center space-y-4 px-4">
        <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center mx-auto">
          <i className="fas fa-spinner fa-spin text-orange-500 text-xl"></i>
        </div>
        <p className="text-slate-600 text-sm font-medium">Confirming your payment…</p>
      </div>
    );
  }

  if (stage === 'error') {
    return (
      <div className="max-w-lg mx-auto pt-12 text-center space-y-4 px-4">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto">
          <i className="fas fa-exclamation-circle text-red-400 text-xl"></i>
        </div>
        <h2 className="text-lg font-bold text-slate-900">Something went wrong</h2>
        <p className="text-slate-500 text-sm leading-relaxed">{errorMsg}</p>
        <p className="text-xs text-slate-400">
          Email us at <strong>contact@townly.us</strong> and include your receipt — we'll get your booking sorted.
        </p>
        <Link
          to={`/book/${bookingType}`}
          className="inline-block mt-2 bg-slate-900 text-white font-bold px-6 py-3 rounded-xl text-sm"
        >
          Back to Booking Form
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto pt-12 text-center space-y-4 px-4">
      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
        <i className="fas fa-check text-emerald-500 text-2xl"></i>
      </div>
      <h2 className="text-xl font-bold text-slate-900">Payment Received!</h2>
      <p className="text-slate-500 text-sm leading-relaxed">
        Your {bookingType === 'spotlight' ? 'Weekly Spotlight' : 'Featured Post'} is submitted and under review.
        Once approved, it will go live at midnight on the start of your selected week.
      </p>
      {user?.email && (
        <p className="text-xs text-slate-400">
          A receipt was sent to <strong>{user.email}</strong> by Stripe.
        </p>
      )}
      <Link
        to="/events"
        className="inline-block mt-4 bg-slate-900 text-white font-bold px-6 py-3 rounded-xl text-sm"
      >
        Back to Events
      </Link>
    </div>
  );
};

export default BookingSuccess;
