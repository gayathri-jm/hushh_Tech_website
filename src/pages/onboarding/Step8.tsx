/**
 * Step 8 - Address Entry (iOS-native design)
 *
 * Collects user's residential address. Auto-detects location via GPS
 * with IP fallback, then saves into onboarding_data.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import config from '../../resources/config/config';
import { upsertOnboardingData } from '../../services/onboarding/upsertOnboardingData';
import { useFooterVisibility } from '../../utils/useFooterVisibility';
import { useLocationDropdowns } from '../../hooks/useLocationDropdowns';
import { locationService } from '../../services/location/locationService';
import { SearchableSelect } from '../../components/onboarding/SearchableSelect';

/* ═══════════════════════════════════════════════
   CONSTANTS & VALIDATION
   ═══════════════════════════════════════════════ */

const DISPLAY_STEP = 7;
const TOTAL_STEPS = 12;
const PROGRESS_PCT = Math.round((DISPLAY_STEP / TOTAL_STEPS) * 100);

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

/* ═══════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════ */

export default function OnboardingStep8() {
  const navigate = useNavigate();
  const isFooterVisible = useFooterVisibility();
  const dropdowns = useLocationDropdowns();

  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [zipCode, setZipCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionStatus, setDetectionStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  useEffect(() => { window.scrollTo(0, 0); }, []);

  /* ─── Auto-detect location ─── */
  const detectAndApply = async (userId?: string) => {
    setIsDetecting(true);
    setDetectionStatus('Detecting your location...');

    try {
      const result = await locationService.detectLocation();
      if (!result.data) { setDetectionStatus(null); return; }

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
        result.data.city,
      );

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

  /* ─── Init: Load saved data or detect ─── */
  useEffect(() => {
    const init = async () => {
      if (!config.supabaseClient) return;
      const { data: { user } } = await config.supabaseClient.auth.getUser();
      if (!user) return;

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

      await detectAndApply(user.id);

      if (saved?.residence_country) {
        const code = locationService.mapCountryToIsoCode(saved.residence_country);
        dropdowns.applyDetectedLocation(code);
      }
    };
    init();
    return () => { locationService.cancel(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ─── Handlers ─── */
  const handleDetectClick = async () => {
    if (!config.supabaseClient) return;
    const { data: { user } } = await config.supabaseClient.auth.getUser();
    await detectAndApply(user?.id);
  };

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
    setTouched((p) => ({ ...p, [field]: true }));
    setErrors((p) => ({ ...p, [field]: validate(field, value) }));
  };

  const validateAll = () => {
    const next = {
      addressLine1: validateAddress(addressLine1),
      country: validateRequired(dropdowns.country, 'country'),
      state: validateRequired(dropdowns.state, 'state'),
      city: validateRequired(dropdowns.city, 'city'),
      zipCode: validateZip(zipCode),
    };
    setErrors(next);
    setTouched({ addressLine1: true, country: true, state: true, city: true, zipCode: true });
    return !Object.values(next).some(Boolean);
  };

  const handleContinue = async () => {
    if (!validateAll()) { setError('Please fix the errors above'); return; }
    setLoading(true);
    setError(null);

    if (!config.supabaseClient) { setLoading(false); return; }
    const { data: { user } } = await config.supabaseClient.auth.getUser();
    if (!user) { setError('Not authenticated'); setLoading(false); return; }

    const { error: saveError } = await upsertOnboardingData(user.id, {
      address_line_1: addressLine1.trim(),
      address_line_2: addressLine2.trim() || null,
      address_country: dropdowns.country,
      state: dropdowns.state,
      city: dropdowns.city,
      zip_code: zipCode.trim(),
      current_step: 8,
    });

    if (saveError) { setError('Failed to save. Please try again.'); setLoading(false); return; }
    navigate('/onboarding/step-9');
  };

  const handleBack = () => navigate('/onboarding/step-7');

  const handleSkip = async () => {
    if (loading) return;
    setLoading(true);
    try {
      if (config.supabaseClient) {
        const { data: { user } } = await config.supabaseClient.auth.getUser();
        if (user) await upsertOnboardingData(user.id, { current_step: 8 });
      }
      navigate('/onboarding/step-9');
    } catch { navigate('/onboarding/step-9'); }
    finally { setLoading(false); }
  };

  const isValid = addressLine1.trim() && dropdowns.country && dropdowns.state && dropdowns.city && zipCode.trim();

  /* ═══════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════ */
  return (
    <div
      className="bg-[#F2F2F7] min-h-[100dvh] flex flex-col"
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif", WebkitFontSmoothing: 'antialiased' }}
    >
      {/* ═══ iOS Navigation Bar ═══ */}
      <nav
        className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-[#C6C6C8]/30 flex items-end justify-between px-4 pb-2"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 12px) + 4px)', minHeight: '48px' }}
      >
        <button onClick={handleBack} className="text-[#007AFF] flex items-center -ml-2 active:opacity-50 transition-opacity" aria-label="Go back">
          <span className="material-symbols-outlined text-3xl -mr-1" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}>chevron_left</span>
          <span className="text-[17px] leading-none pb-[2px]">Back</span>
        </button>
      </nav>

      <main className="flex-1 flex flex-col max-w-md mx-auto w-full px-4 pt-4 pb-48">
        {/* ─── Progress Bar ─── */}
        <div className="mb-6 space-y-2">
          <span className="text-[13px] text-[#8E8E93] font-medium uppercase tracking-wide">Onboarding Progress</span>
          <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#007AFF] rounded-full transition-all duration-500" style={{ width: `${PROGRESS_PCT}%` }} />
          </div>
          <div className="flex justify-between items-center text-[13px] text-[#8E8E93] font-normal">
            <span className="text-[#007AFF] font-medium">{PROGRESS_PCT}% complete</span>
            <span>Step {DISPLAY_STEP}/{TOTAL_STEPS}</span>
          </div>
        </div>

        {/* ─── Title ─── */}
        <div className="mb-8 space-y-2">
          <h1 className="text-[34px] leading-[41px] font-bold text-black tracking-tight">
            Enter your address
          </h1>
          <p className="text-[17px] text-gray-500 leading-relaxed">
            Please provide your primary residence address.
          </p>
        </div>

        {/* ─── Detection status ─── */}
        {(isDetecting || detectionStatus) && (
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl mb-4 text-sm font-medium ${
            isDetecting ? 'bg-blue-50 text-[#007AFF]' : 'bg-green-50 text-green-600'
          }`}>
            {isDetecting && <div className="animate-spin h-4 w-4 border-2 border-[#007AFF] border-t-transparent rounded-full" />}
            <span>{detectionStatus}</span>
          </div>
        )}

        {/* ─── Use my current location ─── */}
        <div className="mb-8">
          <button
            type="button"
            onClick={handleDetectClick}
            disabled={isDetecting}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-[#007AFF]/10 rounded-xl active:opacity-70 transition-opacity disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[#007AFF] text-xl" style={{ fontVariationSettings: "'FILL' 1, 'wght' 500" }}>near_me</span>
            <span className="text-[17px] font-medium text-[#007AFF]">Use my current location</span>
          </button>
        </div>

        {/* ─── Error ─── */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">{error}</div>
        )}

        {/* ─── Address Lines — iOS Grouped Table ─── */}
        <div className="overflow-hidden rounded-[10px] bg-white mb-6">
          <div className="pl-4 pr-4 py-3 flex border-b border-[#C6C6C8]/40">
            <div className="w-1/3 min-w-[120px] text-[17px] text-black font-normal shrink-0">Address line 1</div>
            <input
              type="text"
              value={addressLine1}
              onChange={(e) => {
                setAddressLine1(e.target.value);
                if (touched.addressLine1) setErrors((p) => ({ ...p, addressLine1: validateAddress(e.target.value) }));
              }}
              onBlur={() => handleBlur('addressLine1', addressLine1)}
              placeholder="Street address"
              className="flex-1 bg-transparent border-0 p-0 text-[17px] text-black placeholder-gray-400 focus:ring-0 text-right outline-none"
              autoComplete="address-line1"
            />
          </div>
          <div className="pl-4 pr-4 py-3 flex">
            <div className="w-1/3 min-w-[120px] text-[17px] text-black font-normal shrink-0">Address line 2</div>
            <input
              type="text"
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
              placeholder="Apt, Suite, Bldg (Optional)"
              className="flex-1 bg-transparent border-0 p-0 text-[17px] text-black placeholder-gray-400 focus:ring-0 text-right outline-none"
              autoComplete="address-line2"
            />
          </div>
        </div>

        {touched.addressLine1 && errors.addressLine1 && (
          <p className="text-xs text-red-500 -mt-4 mb-4 px-4">{errors.addressLine1}</p>
        )}

        {/* ─── Country / State / City / ZIP — iOS Grouped Table ─── */}
        <div className="overflow-hidden rounded-[10px] bg-white mb-2">
          {/* Country */}
          <div className="border-b border-[#C6C6C8]/40">
            <SearchableSelect
              id="country"
              label="Country"
              value={dropdowns.country}
              options={dropdowns.countries.map((c) => ({ value: c.isoCode, label: c.name }))}
              onChange={dropdowns.setCountry}
              placeholder="Search country..."
              required
              autoComplete="country"
            />
          </div>

          {/* State */}
          <div className="border-b border-[#C6C6C8]/40">
            <SearchableSelect
              id="state"
              label="State / Province"
              value={dropdowns.state}
              options={dropdowns.states.map((s) => ({ value: s.isoCode, label: s.name }))}
              onChange={dropdowns.setState}
              placeholder="Search state..."
              disabled={!dropdowns.country}
              loading={dropdowns.loadingStates}
              loadError={dropdowns.statesError}
              onRetry={dropdowns.retryStates}
              required
              autoComplete="address-level1"
            />
          </div>

          {/* City */}
          <div className="border-b border-[#C6C6C8]/40">
            <SearchableSelect
              id="city"
              label="City"
              value={dropdowns.city}
              options={dropdowns.cities.map((c) => ({ value: c.name, label: c.name }))}
              onChange={dropdowns.setCity}
              placeholder="Search city..."
              disabled={!dropdowns.state}
              loading={dropdowns.loadingCities}
              loadError={dropdowns.citiesError}
              onRetry={dropdowns.retryCities}
              required
              autoComplete="address-level2"
            />
          </div>

          {/* ZIP Code */}
          <div className="pl-4 pr-4 py-3 flex">
            <div className="w-1/3 min-w-[90px] text-[17px] text-black font-normal shrink-0">ZIP Code</div>
            <input
              type="text"
              value={zipCode}
              inputMode="text"
              onChange={(e) => {
                const next = e.target.value.slice(0, 10);
                setZipCode(next);
                if (touched.zipCode) setErrors((p) => ({ ...p, zipCode: validateZip(next) }));
              }}
              onBlur={() => handleBlur('zipCode', zipCode)}
              placeholder="e.g. 10001"
              className="flex-1 bg-transparent border-0 p-0 text-[17px] text-black placeholder-gray-400 focus:ring-0 text-right outline-none"
              autoComplete="postal-code"
            />
          </div>
        </div>

        {touched.zipCode && errors.zipCode ? (
          <p className="text-xs text-red-500 px-4 mb-4">{errors.zipCode}</p>
        ) : (
          <p className="text-[13px] text-gray-500 px-4 mb-4">
            Supports numeric and alphanumeric codes based on region selection.
          </p>
        )}
      </main>

      {/* ═══ Fixed Footer — Skip + Continue ═══ */}
      {!isFooterVisible && (
        <div
          className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-200 px-4 py-4 z-40"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
          data-onboarding-footer
        >
          <div className="max-w-md mx-auto flex items-center gap-3">
            <button
              onClick={handleSkip}
              className="flex-1 h-[50px] rounded-xl bg-gray-100 text-[#007AFF] font-semibold text-[17px] active:scale-[0.98] transition-transform flex items-center justify-center"
            >
              Skip
            </button>
            <button
              onClick={handleContinue}
              disabled={!isValid || loading}
              data-onboarding-cta
              className={`flex-[2] h-[50px] rounded-xl font-semibold text-[17px] shadow-sm active:scale-[0.98] transition-all flex items-center justify-center ${
                isValid && !loading
                  ? 'bg-[#007AFF] text-white shadow-lg shadow-blue-500/30'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {loading ? 'Saving...' : 'Continue'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
