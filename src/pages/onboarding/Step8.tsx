/**
 * Step 8 - Address Entry
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
import { OnboardingStepProgress } from '../../components/onboarding/OnboardingStepProgress';

const validateAddress = (value: string) => {
  if (!value.trim()) return 'Address is required';
  if (value.trim().length < 5) return 'Address is too short';
  if (value.trim().length > 100) return 'Address is too long';
  if (!/[a-zA-Z]/.test(value)) return 'Please enter a valid address';
  return undefined;
};

const validateRequired = (value: string, label: string) =>
  !value ? `Please select a ${label}` : undefined;

const validateZip = (value: string) => {
  if (!value.trim()) return 'ZIP / postal code is required';
  if (value.trim().length < 3 || value.trim().length > 10) return 'Enter a valid postal code';
  return undefined;
};

const BackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

const HomeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5L12 3l9 6.5" />
    <path d="M5 10.5V21h14V10.5" />
  </svg>
);

const GlobeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const PinIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const LocationIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

function OnboardingStep8() {
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

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const detectAndApply = async (userId?: string) => {
    setIsDetecting(true);
    setDetectionStatus('Detecting your location...');

    try {
      const result = await locationService.detectLocation();
      if (!result.data) {
        setDetectionStatus(null);
        return;
      }

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
    return () => {
      locationService.cancel();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDetectClick = async () => {
    if (!config.supabaseClient) return;
    const { data: { user } } = await config.supabaseClient.auth.getUser();
    await detectAndApply(user?.id);
  };

  const validate = (field: string, value: string) => {
    switch (field) {
      case 'addressLine1':
        return validateAddress(value);
      case 'country':
        return validateRequired(value, 'country');
      case 'state':
        return validateRequired(value, 'state');
      case 'city':
        return validateRequired(value, 'city');
      case 'zipCode':
        return validateZip(value);
      default:
        return undefined;
    }
  };

  const handleBlur = (field: string, value: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors((prev) => ({ ...prev, [field]: validate(field, value) }));
  };

  const validateAll = () => {
    const nextErrors = {
      addressLine1: validateAddress(addressLine1),
      country: validateRequired(dropdowns.country, 'country'),
      state: validateRequired(dropdowns.state, 'state'),
      city: validateRequired(dropdowns.city, 'city'),
      zipCode: validateZip(zipCode),
    };

    setErrors(nextErrors);
    setTouched({
      addressLine1: true,
      country: true,
      state: true,
      city: true,
      zipCode: true,
    });

    return !Object.values(nextErrors).some(Boolean);
  };

  const handleContinue = async () => {
    if (!validateAll()) {
      setError('Please fix the errors above');
      return;
    }

    setLoading(true);
    setError(null);

    if (!config.supabaseClient) {
      setLoading(false);
      return;
    }

    const { data: { user } } = await config.supabaseClient.auth.getUser();
    if (!user) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }

    const { error: saveError } = await upsertOnboardingData(user.id, {
      address_line_1: addressLine1.trim(),
      address_line_2: addressLine2.trim() || null,
      address_country: dropdowns.country,
      state: dropdowns.state,
      city: dropdowns.city,
      zip_code: zipCode.trim(),
      current_step: 8,
    });

    if (saveError) {
      setError('Failed to save. Please try again.');
      setLoading(false);
      return;
    }

    navigate('/onboarding/step-9');
  };

  const handleBack = () => navigate('/onboarding/step-7');

  const handleSkip = async () => {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      if (config.supabaseClient) {
        const { data: { user } } = await config.supabaseClient.auth.getUser();
        if (user) {
          await upsertOnboardingData(user.id, { current_step: 8 });
        }
      }
      navigate('/onboarding/step-9');
    } catch {
      navigate('/onboarding/step-9');
    } finally {
      setLoading(false);
    }
  };

  const isValid =
    addressLine1.trim() &&
    dropdowns.country &&
    dropdowns.state &&
    dropdowns.city &&
    zipCode.trim();

  const inputClass = (field: string) =>
    `w-full rounded-lg border bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
      touched[field] && errors[field]
        ? 'border-red-400 focus:ring-red-200 focus:border-red-400'
        : 'border-slate-200 focus:ring-[#3A63B8]/20 focus:border-[#3A63B8]'
    }`;

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'Manrope', sans-serif" }}>
      <div className="onboarding-shell relative mx-auto flex min-h-screen w-full max-w-[500px] flex-col overflow-hidden border-x border-slate-100 bg-white shadow-xl">
        <header className="sticky top-0 z-20 flex items-center justify-between bg-white/90 px-4 pt-4 pb-2 backdrop-blur-sm sm:px-6 sm:pt-5">
          <button
            onClick={handleBack}
            className="flex size-10 items-center justify-center rounded-full text-slate-900 transition hover:bg-slate-100"
            aria-label="Go back"
          >
            <BackIcon />
          </button>
          <button
            type="button"
            onClick={handleSkip}
            disabled={loading}
            className="text-sm font-semibold tracking-wide text-slate-500 transition-colors hover:text-[#3A63B8] disabled:cursor-not-allowed disabled:opacity-50"
          >
            SKIP
          </button>
        </header>

        <OnboardingStepProgress currentStep={8} totalSteps={12} displayStep={7} />

        <main className="flex-1 overflow-y-auto px-4 pb-32 sm:px-6 sm:pb-40">
          <div className="mb-8 mt-1 px-2 text-center">
            <h1 className="mb-2 text-2xl font-bold text-slate-900">Enter your address</h1>
            <p className="text-sm leading-relaxed text-slate-500">
              Please provide your primary residence address.
            </p>

            {(isDetecting || detectionStatus) && (
              <div
                className={`mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  isDetecting ? 'animate-pulse bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'
                }`}
              >
                {isDetecting && (
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                )}
                <span>{detectionStatus}</span>
              </div>
            )}
          </div>

          <div className="mb-8 flex justify-center">
            <button
              type="button"
              onClick={handleDetectClick}
              disabled={isDetecting}
              className="inline-flex items-center gap-2 rounded-full border border-[#3A63B8]/20 bg-[#F0F4FF] px-6 py-3 text-sm font-medium text-[#3A63B8] shadow-sm transition hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Use my current location"
            >
              <LocationIcon />
              Use my current location
            </button>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
              {error}
            </div>
          )}

          <div className="mb-4 space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-900" htmlFor="address-line-1">
                <span className="text-[#3A63B8]">
                  <HomeIcon />
                </span>
                Address line 1
              </label>
              <input
                id="address-line-1"
                type="text"
                value={addressLine1}
                onChange={(event) => {
                  setAddressLine1(event.target.value);
                  if (touched.addressLine1) {
                    setErrors((prev) => ({ ...prev, addressLine1: validateAddress(event.target.value) }));
                  }
                }}
                onBlur={() => handleBlur('addressLine1', addressLine1)}
                placeholder="Street address"
                className={inputClass('addressLine1')}
                autoComplete="address-line1"
                aria-required="true"
              />
              {touched.addressLine1 && errors.addressLine1 && (
                <p className="mt-1 text-xs text-red-500">{errors.addressLine1}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between pl-7">
                <label className="block text-sm font-semibold text-slate-900" htmlFor="address-line-2">
                  Address line 2
                </label>
                <span className="text-xs text-slate-500">Optional</span>
              </div>
              <input
                id="address-line-2"
                type="text"
                value={addressLine2}
                onChange={(event) => setAddressLine2(event.target.value)}
                placeholder="Apt, suite, unit, etc."
                className={inputClass('addressLine2')}
                autoComplete="address-line2"
              />
            </div>
          </div>

          <div className="mb-4 space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <SearchableSelect
              id="country"
              label="Country"
              labelIcon={<GlobeIcon />}
              value={dropdowns.country}
              options={dropdowns.countries.map((country) => ({ value: country.isoCode, label: country.name }))}
              onChange={dropdowns.setCountry}
              placeholder="Search country..."
              required
              autoComplete="country"
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SearchableSelect
                id="state"
                label="State / Province"
                value={dropdowns.state}
                options={dropdowns.states.map((state) => ({ value: state.isoCode, label: state.name }))}
                onChange={dropdowns.setState}
                placeholder="Search state..."
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
                options={dropdowns.cities.map((city) => ({ value: city.name, label: city.name }))}
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

            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-900" htmlFor="zip-code">
                <span className="text-[#3A63B8]">
                  <PinIcon />
                </span>
                ZIP / Postal code
              </label>
              <input
                id="zip-code"
                type="text"
                value={zipCode}
                inputMode="text"
                onChange={(event) => {
                  const next = event.target.value.slice(0, 10);
                  setZipCode(next);
                  if (touched.zipCode) {
                    setErrors((prev) => ({ ...prev, zipCode: validateZip(next) }));
                  }
                }}
                onBlur={() => handleBlur('zipCode', zipCode)}
                placeholder="e.g. 10001"
                className={inputClass('zipCode')}
                autoComplete="postal-code"
                aria-required="true"
              />
              {touched.zipCode && errors.zipCode ? (
                <p className="mt-1 text-xs text-red-500">{errors.zipCode}</p>
              ) : (
                <p className="mt-1 text-xs text-slate-500">Supports numeric and alphanumeric codes</p>
              )}
            </div>
          </div>
        </main>

        {!isFooterVisible && (
          <div
            className="fixed bottom-0 left-0 right-0 z-50 mx-auto w-full max-w-[500px] border-t border-slate-200 bg-white/80 px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+12px)] backdrop-blur-md sm:px-6 sm:pt-5"
            data-onboarding-footer
          >
            <button
              onClick={handleContinue}
              disabled={!isValid || loading}
              data-onboarding-cta
              className={`flex h-11 w-full items-center justify-center rounded-full px-6 text-sm font-semibold transition-all active:scale-[0.98] sm:h-12 sm:text-base ${
                isValid && !loading
                  ? 'bg-[#3A63B8] text-white shadow-lg shadow-[#3A63B8]/30 hover:shadow-[#3A63B8]/50'
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

export default OnboardingStep8;
