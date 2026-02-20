import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import config from '../../resources/config/config';
import { upsertOnboardingData } from '../../services/onboarding/upsertOnboardingData';
import { useFooterVisibility } from '../../utils/useFooterVisibility';
import { OnboardingStepProgress } from '../../components/onboarding/OnboardingStepProgress';

// Back arrow icon (same as Step3)
const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

// Lock icon
const LockIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

// Calendar icon
const CalendarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

// Info icon
const InfoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

// Chevron down icon
const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="6,9 12,15 18,9" />
  </svg>
);

function OnboardingStep9() {
  const navigate = useNavigate();
  const isFooterVisible = useFooterVisibility();
  const [ssn, setSsn] = useState('');
  const [dob, setDob] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  
  // Ref for native date picker
  const dateInputRef = useRef<HTMLInputElement>(null);

  const formatIsoToDisplay = (iso?: string | null) => {
    if (!iso) return '';
    const parts = iso.split('-');
    if (parts.length === 3) {
      const [yyyy, mm, dd] = parts;
      return `${mm}/${dd}/${yyyy}`;
    }
    return iso;
  };

  const parseDobToIso = (value: string) => {
    if (!value) return null;

    const parts = value.split('/');
    if (parts.length === 3) {
      let [p1, p2, year] = parts.map((p) => p.trim());
      let month = p1;
      let day = p2;

      if (parseInt(p1, 10) > 12) {
        day = p1;
        month = p2;
      }

      const iso = `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      if (!Number.isNaN(Date.parse(iso))) {
        return iso;
      }
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))) {
      return value;
    }

    return null;
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      if (!config.supabaseClient) return;

      const { data: { user } } = await config.supabaseClient.auth.getUser();
      if (!user) return;

      // Fetch existing data
      const { data } = await config.supabaseClient
        .from('onboarding_data')
        .select('ssn_encrypted, date_of_birth')
        .eq('user_id', user.id)
        .single();

      // Restore saved DOB and SSN when user returns to this step
      if (data?.date_of_birth) {
        const savedDob = formatIsoToDisplay(data.date_of_birth);
        if (savedDob) {
          setDob(savedDob);
          console.log('[Step9] Restored saved DOB');
        }
      }
      if (data?.ssn_encrypted && data.ssn_encrypted !== '999-99-9999') {
        setSsn(data.ssn_encrypted);
        console.log('[Step9] Restored saved SSN');
      }
    };

    loadData();
  }, []);

  const formatSSN = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 5) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5, 9)}`;
  };

  const handleSSNChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatSSN(e.target.value);
    setSsn(formatted);
  };

  const formatDate = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 4) return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
  };

  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatDate(e.target.value);
    setDob(formatted);
  };

  // Handle native date picker selection
  const handleNativeDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isoDate = e.target.value; // Format: YYYY-MM-DD
    if (isoDate) {
      const displayDate = formatIsoToDisplay(isoDate);
      setDob(displayDate);
    }
  };

  // Open native date picker when calendar icon is clicked
  const openDatePicker = () => {
    if (dateInputRef.current) {
      dateInputRef.current.showPicker?.(); // Modern browsers
      dateInputRef.current.click(); // Fallback
    }
  };

  // SSN is OPTIONAL - user can continue with just DOB
  const isFormValid = dob.length === 10;  // Only DOB is required

  const handleContinue = async () => {
    if (!isFormValid) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError(null);

    if (!config.supabaseClient) {
      setError('Configuration error');
      setLoading(false);
      return;
    }

    const { data: { user } } = await config.supabaseClient.auth.getUser();
    if (!user) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }

    const isoDob = parseDobToIso(dob);
    if (!isoDob) {
      setError('Please enter a valid date in MM/DD/YYYY or DD/MM/YYYY format');
      setLoading(false);
      return;
    }

    const { error: upsertError } = await upsertOnboardingData(user.id, {
      ssn_encrypted: ssn,
      date_of_birth: isoDob,
      current_step: 9,
    });

    if (upsertError) {
      setError('Failed to save data');
      setLoading(false);
      return;
    }

    navigate('/onboarding/step-11');
  };

  const handleSkip = async () => {
    if (!isFormValid) {
      setError('Please enter your date of birth before skipping');
      return;
    }

    setLoading(true);
    setError(null);

    if (!config.supabaseClient) {
      setError('Configuration error');
      setLoading(false);
      return;
    }

    const { data: { user } } = await config.supabaseClient.auth.getUser();
    if (!user) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }

    const isoDob = parseDobToIso(dob);
    if (!isoDob) {
      setError('Please enter a valid date in MM/DD/YYYY or DD/MM/YYYY format');
      setLoading(false);
      return;
    }

    const { error: upsertError } = await upsertOnboardingData(user.id, {
      ssn_encrypted: '999-99-9999',
      date_of_birth: isoDob,
      current_step: 9,
    });

    if (upsertError) {
      setError('Failed to save data');
      setLoading(false);
      return;
    }

    navigate('/onboarding/step-11');
  };

  const handleBack = () => {
    navigate('/onboarding/step-8');
  };

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'Manrope', sans-serif" }}>
      <div className="onboarding-shell relative mx-auto flex min-h-screen w-full max-w-[500px] flex-col overflow-hidden border-x border-slate-100 bg-white shadow-xl">
        <header className="sticky top-0 z-20 flex items-center justify-between bg-white/90 px-4 pt-4 pb-2 backdrop-blur-sm sm:px-6 sm:pt-5">
          <button
            onClick={handleBack}
            aria-label="Go back"
            className="flex size-10 shrink-0 items-center justify-center rounded-full text-slate-900 transition-colors hover:bg-slate-100"
          >
            <BackIcon />
          </button>
          <button
            type="button"
            onClick={handleSkip}
            className="text-sm font-semibold tracking-wide text-slate-500 transition-colors hover:text-[#3A63B8]"
          >
            SKIP
          </button>
        </header>

        <OnboardingStepProgress currentStep={9} totalSteps={12} displayStep={8} />

        <main className="flex-1 overflow-y-auto px-4 pb-32 sm:px-6 sm:pb-40">
          <div className="mb-8 mt-1 flex flex-col items-center px-2 text-center">
            <h1 className="mb-2 text-2xl font-bold leading-tight text-slate-900">
              We just need a few more details
            </h1>
            <p className="text-sm text-slate-500">
              Federal law requires us to collect this info for tax reporting.
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mb-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <label className="flex flex-col w-full">
              <p className="pb-2 text-sm font-semibold leading-normal text-slate-900">Social Security number</p>
              <div className="relative">
                <input
                  type="text"
                  value={ssn}
                  onChange={handleSSNChange}
                  placeholder="000-00-0000"
                  maxLength={11}
                  inputMode="numeric"
                  className="h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 pr-10 text-base font-medium tracking-widest text-slate-900 placeholder:text-slate-400 transition-all focus:border-[#3A63B8] focus:outline-none focus:ring-2 focus:ring-[#3A63B8]/20"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <LockIcon />
                </span>
              </div>
            </label>

            <div className="mt-4 border-t border-slate-200/60 pt-3">
              <details 
                className="group"
                open={showInfo}
                onToggle={(e) => setShowInfo((e.target as HTMLDetailsElement).open)}
              >
                <summary className="flex list-none cursor-pointer items-center justify-between py-1 text-sm font-medium text-[#3A63B8] transition-colors hover:text-[#2c4f97]">
                  <span className="flex items-center gap-2">
                    <InfoIcon />
                    <span>Why do we need your SSN?</span>
                  </span>
                  <ChevronDownIcon className="transition-transform group-open:rotate-180" />
                </summary>
                <div className="pb-1 pt-3">
                  <p className="text-sm leading-relaxed text-slate-500">
                    We are required by federal law to collect this information to prevent fraud and verify your identity before opening an investment account.
                  </p>
                </div>
              </details>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <label className="flex flex-col w-full">
              <p className="pb-2 text-sm font-semibold leading-normal text-slate-900">Date of birth</p>
              <div className="relative">
                <input
                  type="text"
                  value={dob}
                  onChange={handleDobChange}
                  placeholder="MM/DD/YYYY"
                  maxLength={10}
                  inputMode="numeric"
                  className="h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 pr-10 text-base font-medium text-slate-900 placeholder:text-slate-400 transition-all focus:border-[#3A63B8] focus:outline-none focus:ring-2 focus:ring-[#3A63B8]/20"
                />
                <button 
                  type="button"
                  onClick={openDatePicker}
                  aria-label="Open date picker"
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer hover:opacity-70 transition-opacity p-1"
                >
                  <CalendarIcon />
                </button>
                <input
                  ref={dateInputRef}
                  type="date"
                  onChange={handleNativeDateChange}
                  className="sr-only"
                  aria-hidden="true"
                  tabIndex={-1}
                  max={new Date().toISOString().split('T')[0]}
                  min="1900-01-01"
                />
              </div>
            </label>
          </div>
        </main>

        {!isFooterVisible && (
          <div
            className="fixed bottom-0 left-0 right-0 z-50 mx-auto w-full max-w-[500px] border-t border-slate-200 bg-white/80 px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+12px)] backdrop-blur-md sm:px-6 sm:pt-5"
            data-onboarding-footer
          >
            <button
              onClick={handleContinue}
              disabled={!isFormValid || loading}
              data-onboarding-cta
              className={`flex h-11 w-full items-center justify-center rounded-full px-6 text-sm font-semibold text-white transition-all active:scale-[0.98] sm:h-12 sm:text-base ${
                isFormValid && !loading
                  ? 'bg-[#3A63B8] shadow-lg shadow-[#3A63B8]/30 hover:shadow-[#3A63B8]/50'
                  : 'cursor-not-allowed bg-slate-200 text-slate-400'
              }`}
            >
              {loading ? 'Saving...' : 'Continue'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default OnboardingStep9;

