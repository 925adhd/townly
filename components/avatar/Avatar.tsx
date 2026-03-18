import React from 'react';
import CougarPaw from './CougarPaw';
import { getColorFromSeed } from '../../lib/avatar/colors';

interface AvatarUser {
  id: string;
  name?: string;
  isBusinessOwner?: boolean;
}

interface Props {
  user: AvatarUser;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  xs: { px: 24, paw: 18, badge: 10, text: 'text-[9px]' },
  sm: { px: 28, paw: 20, badge: 12, text: 'text-[10px]' },
  md: { px: 40, paw: 28, badge: 14, text: 'text-sm' },
  lg: { px: 56, paw: 38, badge: 16, text: 'text-lg' },
};

const Avatar: React.FC<Props> = ({ user, size = 'md', className = '' }) => {
  const color = getColorFromSeed(user.id);
  const s = sizes[size];
  const initial = (user.name || '?').charAt(0).toUpperCase();

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full bg-slate-100 flex-shrink-0 ${className}`}
      style={{ width: s.px, height: s.px }}
    >
      <CougarPaw color={color} size={s.paw} />

      {/* Business owner badge */}
      {user.isBusinessOwner && (
        <div
          className="absolute bg-amber-400 border-2 border-white rounded-full flex items-center justify-center"
          style={{ width: s.badge, height: s.badge, bottom: -1, right: -1 }}
          title="Business Owner"
        >
          <i className="fas fa-store text-white" style={{ fontSize: s.badge * 0.5 }}></i>
        </div>
      )}

      {/* Fallback initial overlay (hidden — kept for accessibility / screen readers) */}
      <span className="sr-only">{user.name || 'User'}</span>
    </div>
  );
};

export default Avatar;
