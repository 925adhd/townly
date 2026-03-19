import React from 'react';
import { Link } from 'react-router-dom';
import { CommunityAlert } from '../types';
import { getCurrentTenant } from '../tenants';

const tenant = getCurrentTenant();

const ALERT_ICON_COLORS: Record<string, string> = {
  'fa-triangle-exclamation': 'text-amber-500',
  'fa-bell':                 'text-red-700',
  'fa-bullhorn':             'text-blue-500',
  'fa-cloud-bolt':           'text-indigo-500',
  'fa-droplet':              'text-cyan-500',
  'fa-fire':                 'text-orange-500',
  'fa-road-barrier':         'text-yellow-600',
  'fa-house-flood-water':    'text-teal-500',
};

interface AlertsProps {
  communityAlerts: CommunityAlert[];
  nwsAlerts: { id: string; event: string; headline: string; severity: string; senderName: string; expires: string | null }[];
}

const SEVERITY_ORDER: Record<string, number> = { Extreme: 0, Severe: 1, Moderate: 2, Minor: 3 };

const Alerts: React.FC<AlertsProps> = ({ communityAlerts, nwsAlerts }) => {
  const allAlerts = [
    ...nwsAlerts.map(a => ({
      id: a.id,
      title: a.event,
      description: a.headline,
      icon: 'fa-cloud-bolt',
      isNws: true,
      severity: a.severity,
      expires: a.expires,
      senderName: a.senderName,
    })),
    ...communityAlerts.map(a => ({ ...a, isNws: false, severity: null, expires: null, senderName: null })),
  ];

  // Sort NWS by severity, then community alerts after
  allAlerts.sort((a, b) => {
    if (a.isNws && b.isNws) return (SEVERITY_ORDER[a.severity!] ?? 9) - (SEVERITY_ORDER[b.severity!] ?? 9);
    if (a.isNws) return -1;
    if (b.isNws) return 1;
    return 0;
  });

  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-in fade-in duration-500 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/" className="text-slate-400 hover:text-slate-600 transition-colors">
          <i className="fas fa-arrow-left text-sm"></i>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Active Alerts</h1>
          <p className="text-xs text-slate-400">{tenant.name}</p>
        </div>
      </div>

      {allAlerts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
          <i className="fas fa-check-circle text-3xl text-green-400 mb-3 block"></i>
          <p className="font-semibold text-slate-700">No active alerts</p>
          <p className="text-sm text-slate-400 mt-1">There are no alerts for {tenant.name} right now.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {allAlerts.map(alert => {
            const isSevereNws = alert.isNws && (alert.severity === 'Extreme' || alert.severity === 'Severe');
            return (
              <div
                key={alert.id}
                className={`bg-white rounded-2xl border p-5 shadow-sm ${isSevereNws ? 'border-red-200 border-l-4 border-l-red-500' : alert.isNws ? 'border-amber-200 border-l-4 border-l-amber-400' : 'border-slate-100 border-l-4 border-l-red-400'}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center mt-0.5 ${isSevereNws ? 'bg-red-100' : alert.isNws ? 'bg-amber-50' : 'bg-red-50'}`}>
                    <i className={`fas ${alert.icon} text-base ${ALERT_ICON_COLORS[alert.icon] ?? 'text-red-700'}`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${isSevereNws ? 'bg-red-100 text-red-700' : alert.isNws ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                        {alert.isNws ? `${alert.severity} · NWS` : 'Community Alert'}
                      </span>
                    </div>
                    <h2 className="font-bold text-slate-900 text-base leading-snug">{alert.title}</h2>
                    <p className="text-slate-600 text-sm leading-relaxed mt-1">{alert.description}</p>
                    {alert.isNws && (
                      <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
                        {alert.senderName && (
                          <span className="flex items-center gap-1">
                            <i className="fas fa-building text-[10px]"></i> {alert.senderName}
                          </span>
                        )}
                        {alert.expires && (
                          <span className="flex items-center gap-1">
                            <i className="fas fa-clock text-[10px]"></i> Expires {new Date(alert.expires).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Alerts;
