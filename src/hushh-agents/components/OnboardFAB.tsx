import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/** Floating Action Button — "List Your Business" */
export const OnboardFAB = () => {
  const nav = useNavigate();
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem('hushh_fab_seen');
    if (!seen) {
      setIsNew(true);
      localStorage.setItem('hushh_fab_seen', '1');
    }
  }, []);

  return (
    <button
      onClick={() => nav('/hushh-agents/onboard')}
      className={`fixed bottom-24 right-4 z-50 flex items-center gap-2 px-5 py-3.5 bg-black text-white rounded-2xl shadow-2xl 
        active:scale-95 transition-all ${isNew ? 'animate-bounce' : 'hover:scale-105'}`}
      aria-label="List your business"
    >
      <span className="material-symbols-outlined text-xl">add_business</span>
      <span className="text-sm font-semibold">List Your Business</span>
    </button>
  );
};

/** Top banner nudge for directory pages */
export const OnboardBanner = () => {
  const nav = useNavigate();
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem('hushh_banner_dismissed');
    if (dismissed) setIsDismissed(true);
  }, []);

  if (isDismissed) return null;

  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-lg">🚀</span>
        <p className="text-sm truncate">
          Are you a local business? <strong>Get listed for free!</strong>
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => nav('/hushh-agents/onboard')}
          className="px-3 py-1.5 bg-white text-blue-700 rounded-lg text-xs font-semibold active:scale-95"
        >
          Onboard Now
        </button>
        <button
          onClick={() => { setIsDismissed(true); sessionStorage.setItem('hushh_banner_dismissed', '1'); }}
          className="text-white/70 hover:text-white"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default OnboardFAB;
