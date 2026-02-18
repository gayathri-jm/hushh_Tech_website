/**
 * Step 8 — Address Entry
 *
 * Collects user's residential address. Auto-detects location via GPS
 * (reverse geocoded through GCP / Supabase Edge Function) with IP fallback.
 *
 * Data priority: Saved address → GPS detection → Step 6 country.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import config from '../../resources/config/config';
import { upsertOnboardingData } from '../../services/onboarding/upsertOnboardingData';
import { useFooterVisibility } from '../../utils/useFooterVisibility';
import { useLocationDropdowns } from '../../hooks/useLocationDropdowns';
import { locationService } from '../../services/location/locationService';
import { SearchableSelect } from '../../components/onboarding/SearchableSelect';

// ─── Validation helpers ─────────────────────────────────────────────────────

const validateAddress = (v: string) => {
  if (!v.trim()) return 'Address is required';
  if (v.trim().length < 5) return 'Address is too short';
  if (v.trim().length > 100) return 'Address is too long';
  if (!/[a-zA-Z]/.test(v)) return 'Please enter a valid address';
  return undefined;
};

const validateRequired = (v: string, label: string) =>
  !v ? `Please select a ${label}` : undefined;

const validateZip = (v: string) => {
  if (!v.trim()) return 'ZIP / postal code is required';
  if (v.trim().length < 3 || v.trim().length > 10) return 'Enter a valid postal code';
  return undefined;
};

// ─── Icons ──────────────────────────────────────────────────────────────────

const BackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

const LocationIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

// ─── Component ──────────────────────────────────────────────────────────────

function OnboardingStep8() {
  const navigate = useNavigate();
  const isFooterVisible = useFooterVisibility();

  // Form fields
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [zipCode, setZipCode] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionStatus, setDetectionStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  // Cascade dropdowns via custom hook
  const dropdowns = useLocationDropdowns();

  // Scroll to top on mount
  useEffect(() => { window.scrollTo(0, 0); }, []);

  // ─── Load initial data on mount ─────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      if (!config.supabaseClient) return;
      const { data: { user } } = await config.supabaseClient.auth.getUser();
      if (!user) return;

      // Priority 1: Existing saved address
      const { data: saved } = await config.supabaseClient
        .from('onboarding_data')
        .select('address_line_1, address_line_2, address_country, state, city, zip_code, residence_country')
        .eq('user_id', user.id)
        .maybeSingle();

      if (saved?.address_line_1) {
        setAddressLine1(saved.address_line_1);
        setAddressLine2(saved.address_line_2 || '');
        setZipCode(saved.zip_code || '');
        const code = locationService.mapCountryToIsoCode(saved.address_country || 'US');
        dropdowns.applyDetectedLocation(code, saved.state, undefined, saved.city);
        return;
      }

      // Priority 2: GPS / IP auto-detection
      await detectAndApply(user.id);

      // Priority 3: Residence country from Step 6
      if (saved?.residence_country) {
        const code = locationService.mapCountryToIsoCode(saved.residence_country);
        dropdowns.applyDetectedLocation(code);
      }
    };

    init();
    return () => { locationService.cancel(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Location detection ─────────────────────────────────────────────────

  const detectAndApply = async (userId?: string) => {
    setIsDetecting(true);
    setDetectionStatus('Detecting your location…');

    try {
      const result = await locationService.detectLocation();
      if (!result.data) {
        setDetectionStatus(null);
        return;
      }

      // Apply to form
      if (result.data.postalCode) setZipCode(result.data.postalCode);
      if (result.data.formattedAddress) {
        const parsed = locationService.parseFormattedAddress(result.data.formattedAddress, result.data);
        if (parsed.line1) setAddressLine1(parsed.line1);
        if (parsed.line2) setAddressLine2(parsed.line2);
      }
      dropdowns.applyDetectedLocation(
        result.data.countryCode,
        result.data.stateCode,
        result.data.state,
        result.data.city
      );

      // Cache to Supabase (best-effort)
      if (userId) {
        locationService.saveLocationToOnboarding(userId, result.data).catch(() => {});
      }

      setDetectionStatus(result.data.city || result.data.country || 'Location detected');
      setTimeout(() => setDetectionStatus(null), 2500);
    } catch {
      setDetectionStatus(null);
    } finally {
      setIsDetecting(false);
    }
  };

  const handleDetectClick = async () => {
    if (!config.supabaseClient) return;
    const { data: { user } } = await config.supabaseClient.auth.getUser();
    await detectAndApply(user?.id);
  };

  // ─── Validation ─────────────────────────────────────────────────────────

  const validate = (field: string, value: string) => {
    switch (field) {
      case 'addressLine1': return validateAddress(value);
      case 'country': return validateRequired(value, 'country');
      case 'state': return validateRequired(value, 'state');
      case 'city': return validateRequired(value, 'city');
      case 'zipCode': return validateZip(value);
      default: return undefined;
    }
  };

  const handleBlur = (field: string, value: string) => {
    setTouched(p => ({ ...p, [field]: true }));
    setErrors(p => ({ ...p, [field]: validate(field, value) }));
  };

  const validateAll = () => {
    const e = {
      addressLine1: validateAddress(addressLine1),
      country: validateRequired(dropdowns.country, 'country'),
      state: validateRequired(dropdowns.state, 'state'),
      city: validateRequired(dropdowns.city, 'city'),
      zipCode: validateZip(zipCode),
    };
    setErrors(e);
    setTouched({ addressLine1: true, country: true, state: true, city: true, zipCode: true });
    return !Object.values(e).some(Boolean);
  };

  // ─── Submit ─────────────────────────────────────────────────────────────

  const handleContinue = async () => {
    if (!validateAll()) return setError('Please fix the errors above');

    setLoading(true);
    setError(null);

    if (!config.supabaseClient) return setLoading(false);
    const { data: { user } } = await config.supabaseClient.auth.getUser();
    if (!user) { setError('Not authenticated'); return setLoading(false); }

    const { error: err } = await upsertOnboardingData(user.id, {
      address_line_1: addressLine1.trim(),
      address_line_2: addressLine2.trim() || null,
      address_country: dropdowns.country,
      state: dropdowns.state,
      city: dropdowns.city,
      zip_code: zipCode.trim(),
      current_step: 8,
    });

    if (err) { setError('Failed to save. Please try again.'); setLoading(false); return; }
    navigate('/onboarding/step-9');
  };

  const handleBack = () => navigate('/onboarding/step-7');

  const isValid = addressLine1.trim() && dropdowns.country && dropdowns.state && dropdowns.city && zipCode.trim();

  // ─── Input helper ───────────────────────────────────────────────────────

  const inputClass = (field: string) =>
    `w-full h-12 px-4 rounded-lg border bg-white text-slate-900 placeholder:text-slate-400 text-base focus:outline-none focus:ring-2 transition-all ${
      touched[field] && errors[field]
        ? 'border-red-400 focus:ring-red-200 focus:border-red-400'
        : 'border-gray-200 focus:ring-[#2b8cee]/20 focus:border-[#2b8cee]'
    }`;

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="bg-slate-50 min-h-screen" style={{ fontFamily: "'Manrope', sans-serif" }}>
      <div className="onboarding-shell relative flex min-h-screen w-full flex-col bg-white max-w-[500px] mx-auto shadow-xl overflow-hidden border-x border-slate-100">

        {/* Header */}
        <header className="flex items-center px-4 pt-6 pb-4 bg-white/95 backdrop-blur-sm sticky top-0 z-10">
          <button onClick={handleBack} className="flex items-center gap-1 text-slate-900 hover:text-[#2b8cee] transition-colors" aria-label="Go back">
            <BackIcon />
            <span className="text-base font-bold tracking-tight">Back</span>
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 flex flex-col px-4 sm:px-6 pb-40 sm:pb-48 overflow-y-auto">
          {/* Title */}
          <div className="mb-8 text-center">
            <h1 className="text-slate-900 text-[22px] font-bold leading-tight tracking-tight mb-3">Enter your address</h1>
            <p className="text-slate-500 text-[14px] leading-relaxed">Please provide your primary residence address.</p>

            {/* Detection status */}
            {(isDetecting || detectionStatus) && (
              <div className={`mt-4 py-2 px-4 rounded-full inline-flex items-center gap-2 text-sm font-medium transition-all ${
                isDetecting ? 'bg-blue-50 text-blue-600 animate-pulse' : 'bg-green-50 text-green-600'
              }`}>
                {isDetecting && (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                <span>{detectionStatus}</span>
              </div>
            )}

            {/* Detect button */}
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={handleDetectClick}
                disabled={isDetecting}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Detect my current location"
              >
                <LocationIcon />
                Use my current location
              </button>
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm" role="alert">{error}</div>
          )}

          {/* Card 1: Street address */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5 mb-6 space-y-5">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-900" htmlFor="addr1">Address line 1</label>
              <input
                id="addr1" type="text" value={addressLine1}
                onChange={e => { setAddressLine1(e.target.value); if (touched.addressLine1) setErrors(p => ({ ...p, addressLine1: validateAddress(e.target.value) })); }}
                onBlur={() => handleBlur('addressLine1', addressLine1)}
                placeholder="Street address" className={inputClass('addressLine1')}
                autoComplete="address-line1" aria-required="true"
              />
              {touched.addressLine1 && errors.addressLine1 && <p className="text-red-500 text-xs mt-1">{errors.addressLine1}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-baseline">
                <label className="block text-sm font-medium text-slate-900" htmlFor="addr2">Address line 2</label>
                <span className="text-xs text-slate-400">Optional</span>
              </div>
              <input
                id="addr2" type="text" value={addressLine2}
                onChange={e => setAddressLine2(e.target.value)}
                placeholder="Apt, suite, unit, etc." className={inputClass('addressLine2')}
                autoComplete="address-line2"
              />
            </div>
          </div>

          {/* Card 2: Region */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5 space-y-5 mb-4">
            {/* Country — searchable */}
            <SearchableSelect
              id="country"
              label="Country"
              value={dropdowns.country}
              options={dropdowns.countries.map(c => ({ value: c.isoCode, label: c.name }))}
              onChange={dropdowns.setCountry}
              placeholder="Search country…"
              required
              autoComplete="country"
            />

            {/* State & City — searchable with error/retry */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SearchableSelect
                id="state"
                label="State / Province"
                value={dropdowns.state}
                options={dropdowns.states.map(s => ({ value: s.isoCode, label: s.name }))}
                onChange={dropdowns.setState}
                placeholder="Search state…"
                disabled={!dropdowns.country}
                loading={dropdowns.loadingStates}
                loadError={dropdowns.statesError}
                onRetry={dropdowns.retryStates}
                required
                autoComplete="address-level1"
              />

              <SearchableSelect
                id="city"
                label="City"
                value={dropdowns.city}
                options={dropdowns.cities.map(c => ({ value: c.name, label: c.name }))}
                onChange={dropdowns.setCity}
                placeholder="Search city…"
                disabled={!dropdowns.state}
                loading={dropdowns.loadingCities}
                loadError={dropdowns.citiesError}
                onRetry={dropdowns.retryCities}
                required
                autoComplete="address-level2"
              />
            </div>

            {/* ZIP */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-900" htmlFor="zip">ZIP / Postal code</label>
              <input
                id="zip" type="text" value={zipCode} inputMode="text"
                onChange={e => { const v = e.target.value.slice(0, 10); setZipCode(v); if (touched.zipCode) setErrors(p => ({ ...p, zipCode: validateZip(v) })); }}
                onBlur={() => handleBlur('zipCode', zipCode)}
                placeholder="e.g. 10001" className={inputClass('zipCode')}
                autoComplete="postal-code" aria-required="true"
              />
              {touched.zipCode && errors.zipCode
                ? <p className="text-red-500 text-xs mt-1">{errors.zipCode}</p>
                : <p className="text-slate-400 text-xs mt-1">Supports numeric &amp; alphanumeric codes</p>}
            </div>
          </div>
        </main>

        {/* Footer */}
        {!isFooterVisible && (
          <div className="fixed bottom-0 left-0 right-0 z-50 w-full max-w-[500px] mx-auto border-t border-slate-100 bg-white/90 backdrop-blur-md px-4 sm:px-6 pt-4 sm:pt-5 pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-[0_-4px_20px_rgba(0,0,0,0.04)] flex flex-col gap-3 sm:gap-4" data-onboarding-footer>
            <button
              onClick={handleContinue} disabled={!isValid || loading} data-onboarding-cta
              className={`flex w-full items-center justify-center rounded-full h-11 sm:h-12 px-6 text-sm sm:text-base font-semibold transition-all active:scale-[0.98] ${
                isValid && !loading
                  ? 'bg-[#2b8cee] hover:bg-[#2070c0] text-white shadow-lg shadow-[#2b8cee]/20'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              {loading ? 'Saving…' : 'Continue'}
            </button>
            <button onClick={handleBack} className="flex w-full items-center justify-center rounded-full bg-transparent py-2 text-slate-500 text-sm font-semibold hover:text-slate-800 transition-colors">
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default OnboardingStep8;
