import React, { useEffect, useState } from 'react';

interface NWSAlert {
  id: string;
  event: string;
  headline: string;
  severity: string;
  senderName: string;
  expires: string | null;
}

const EVENT_ICONS: [string, string][] = [
  ['tornado',       'fa-tornado'],
  ['thunderstorm',  'fa-cloud-bolt'],
  ['wind',          'fa-wind'],
  ['flood',         'fa-house-flood-water'],
  ['snow',          'fa-snowflake'],
  ['ice',           'fa-snowflake'],
  ['winter',        'fa-snowflake'],
  ['freeze',        'fa-snowflake'],
  ['fire',          'fa-fire'],
  ['heat',          'fa-temperature-high'],
  ['fog',           'fa-smog'],
];

function getIcon(event: string): string {
  const lower = event.toLowerCase();
  for (const [key, icon] of EVENT_ICONS) {
    if (lower.includes(key)) return icon;
  }
  return 'fa-triangle-exclamation';
}

type SeverityStyle = { bg: string; border: string; badge: string; text: string; sub: string; icon: string };

function getSeverityStyle(severity: string): SeverityStyle {
  switch (severity) {
    case 'Extreme':
      return { bg: 'bg-red-950', border: 'border-red-500', badge: 'bg-red-600 text-white', text: 'text-red-50', sub: 'text-red-300', icon: 'text-red-400' };
    case 'Severe':
      return { bg: 'bg-red-900', border: 'border-red-400', badge: 'bg-red-500 text-white', text: 'text-red-50', sub: 'text-red-300', icon: 'text-red-300' };
    case 'Moderate':
      return { bg: 'bg-amber-900', border: 'border-amber-500', badge: 'bg-amber-500 text-white', text: 'text-amber-50', sub: 'text-amber-300', icon: 'text-amber-300' };
    default:
      return { bg: 'bg-slate-800', border: 'border-slate-500', badge: 'bg-slate-600 text-slate-100', text: 'text-slate-100', sub: 'text-slate-400', icon: 'text-slate-400' };
  }
}

function formatExpires(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

const NWSAlertBanner: React.FC = () => {
  const [alerts, setAlerts] = useState<NWSAlert[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('https://api.weather.gov/alerts/active?zone=KYZ021,KYC085', {
      headers: { Accept: 'application/geo+json' },
    })
      .then(r => r.json())
      .then(data => {
        const parsed: NWSAlert[] = (data.features ?? []).map((f: any) => ({
          id: f.id as string,
          event: f.properties.event as string,
          headline: f.properties.headline as string,
          severity: f.properties.severity as string,
          senderName: f.properties.senderName as string,
          expires: f.properties.expires ?? null,
        }));
        setAlerts(parsed);
      })
      .catch(() => {});
  }, []);

  const visible = alerts.filter(a => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2">
      {visible.map(alert => {
        const s = getSeverityStyle(alert.severity);
        const icon = getIcon(alert.event);
        const expires = formatExpires(alert.expires);

        return (
          <div
            key={alert.id}
            className={`${s.bg} border-l-4 ${s.border} rounded-2xl px-5 py-4 flex gap-4 items-start shadow-lg`}
          >
            {/* Icon */}
            <div className={`flex-shrink-0 mt-0.5 ${s.icon}`}>
              <i className={`fas ${icon} text-xl`}></i>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${s.badge}`}>
                  {alert.severity}
                </span>
                <span className={`text-sm font-bold ${s.text}`}>{alert.event}</span>
              </div>
              <p className={`text-xs leading-relaxed ${s.text} opacity-90`}>{alert.headline}</p>
              <p className={`text-[10px] mt-1.5 ${s.sub}`}>
                {alert.senderName}{expires ? ` · Expires ${expires}` : ''}
              </p>
            </div>

            {/* Dismiss */}
            <button
              onClick={() => setDismissed(prev => new Set([...prev, alert.id]))}
              className={`flex-shrink-0 ${s.sub} hover:opacity-100 opacity-60 transition-opacity p-1`}
              title="Dismiss"
            >
              <i className="fas fa-xmark text-sm"></i>
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default NWSAlertBanner;
