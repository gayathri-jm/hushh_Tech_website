import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import config from '../../resources/config/config';
import { useFooterVisibility } from '../../utils/useFooterVisibility';
import { getAllCountries, getStatesOfCountry, getCitiesOfState } from '../../data/locationData';
import { locationService } from '../../services/location/locationService';
import type { LocationData } from '../../services/location/types';

// Types for location data
interface Country {
  isoCode: string;
  name: string;
}

interface State {
  isoCode: string;
  name: string;
}

interface City {
  name: string;
}

// Back arrow icon
const BackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

// Info icon for helper text
const InfoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 flex-shrink-0 mt-0.5">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </svg>
);

// Chevron down icon for selects
const ChevronDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

// Field validation errors type
interface FieldErrors {
  addressLine1?: string;
  country?: string;
  state?: string;
  city?: string;
  zipCode?: string;
}

function OnboardingStep8() {
  const navigate = useNavigate();
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [country, setCountry] = useState(''); // Empty initially - will be set by GPS or user selection
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const isFooterVisible = useFooterVisibility();

  // Location data
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  // Refs to store pending GPS/inference values (applied when dropdowns load)
  const pendingGpsCountry = useRef<string | null>(null);
  const pendingGpsState = useRef<string | null>(null);
  const pendingGpsCity = useRef<string | null>(null);


  // Scroll to top on component mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Load countries on mount (static list - no heavy processing)
  useEffect(() => {
    setLoadingCountries(true);
    const allCountries = getAllCountries();
    setCountries(allCountries);
    setLoadingCountries(false);
    console.log('[Step8] Countries loaded:', allCountries.length);
  }, []);

  // Load states when country changes (async API call)
  useEffect(() => {
    if (!country) {
      setStates([]);
      return;
    }

    let cancelled = false;
    const loadStates = async () => {
      setLoadingStates(true);
      try {
        // Find state name for the selected state (API needs country name)
        const statesList = await getStatesOfCountry(country);
        if (!cancelled) {
          setStates(statesList);
          console.log('[Step8] States loaded for', country, ':', statesList.length);
        }
      } catch (err) {
        console.error('Error loading states:', err);
      } finally {
        if (!cancelled) setLoadingStates(false);
      }
    };
    loadStates();
    return () => { cancelled = true; };
  }, [country]);

  // Load cities when state changes (async API call)
  useEffect(() => {
    if (!country || !state) {
      setCities([]);
      return;
    }

    let cancelled = false;
    const loadCities = async () => {
      setLoadingCities(true);
      try {
        // Find state name from the states list (API needs state name, not code)
        const stateObj = states.find(s => s.isoCode === state);
        const stateName = stateObj?.name || state;
        const citiesList = await getCitiesOfState(country, stateName);
        if (!cancelled) {
          setCities(citiesList);
          console.log('[Step8] Cities loaded for', stateName, ':', citiesList.length);
        }
      } catch (err) {
        console.error('Error loading cities:', err);
      } finally {
        if (!cancelled) setLoadingCities(false);
      }
    };
    loadCities();
    return () => { cancelled = true; };
  }, [country, state, states]);

  // ============================================
  // FIX: Watch for dropdown data loading and apply pending GPS values
  // This solves the race condition where GPS data arrives before dropdowns load
  // ============================================

  // Apply pending country when countries list loads
  useEffect(() => {
    if (countries.length > 0 && pendingGpsCountry.current) {
      const countryCode = pendingGpsCountry.current;
      const countryExists = countries.some(c => c.isoCode === countryCode);
      if (countryExists) {
        console.log('[Step8] Applying pending GPS country:', countryCode);
        setCountry(countryCode);
      }
      pendingGpsCountry.current = null;
    }
  }, [countries]);

  // Apply pending state when states list loads
  useEffect(() => {
    if (states.length > 0 && pendingGpsState.current) {
      const stateCode = pendingGpsState.current;
      const stateExists = states.some(s => s.isoCode === stateCode || s.name === stateCode);
      if (stateExists) {
        // Use isoCode if it matches, otherwise use name
        const matchingState = states.find(s => s.isoCode === stateCode || s.name === stateCode);
        if (matchingState) {
          console.log('[Step8] Applying pending GPS state:', matchingState.isoCode);
          setState(matchingState.isoCode);
        }
      }
      pendingGpsState.current = null;
    }
  }, [states]);

  // Apply pending city when cities list loads
  useEffect(() => {
    if (cities.length > 0 && pendingGpsCity.current) {
      const cityName = pendingGpsCity.current;
      const cityExists = cities.some(c => c.name === cityName);
      if (cityExists) {
        console.log('[Step8] Applying pending GPS city:', cityName);
        setCity(cityName);
      }
      pendingGpsCity.current = null;
    }
  }, [cities]);

  // Location detection state
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionMessage, setDetectionMessage] = useState<string | null>(null);

  // Apply detected location data to form fields using ref-based pending pattern
  const applyLocationToForm = useCallback((locData: LocationData) => {
    console.log('[Step8] Applying location data to form:', locData);

    // Zip code â€” no dropdown dependency
    if (locData.postalCode) setZipCode(locData.postalCode);

    // Parse formattedAddress into address lines (GPS gives full address, IP doesn't)
    if (locData.formattedAddress) {
      const parsed = locationService.parseFormattedAddress(locData.formattedAddress, locData);
      if (parsed.line1) {
        setAddressLine1(parsed.line1);
        console.log('[Step8] Address Line 1:', parsed.line1);
      }
      if (parsed.line2) {
        setAddressLine2(parsed.line2);
        console.log('[Step8] Address Line 2:', parsed.line2);
      }
    }

    // Country â€” set directly + store in ref for safety
    if (locData.countryCode) {
      pendingGpsCountry.current = locData.countryCode;
      setCountry(locData.countryCode);
      console.log('[Step8] Country set:', locData.countryCode);
    }

    // State â€” store in ref, applied when states dropdown loads
    if (locData.stateCode) {
      pendingGpsState.current = locData.stateCode;
      console.log('[Step8] Pending state (code):', locData.stateCode);
    } else if (locData.state) {
      pendingGpsState.current = locData.state;
      console.log('[Step8] Pending state (name):', locData.state);
    }

    // City â€” store in ref, applied when cities dropdown loads
    if (locData.city) {
      pendingGpsCity.current = locData.city;
      console.log('[Step8] Pending city:', locData.city);
    }
  }, []);

  // Main data loading: existing data â†’ LocationService (GPS + IP fallback) â†’ cached profile
  useEffect(() => {
    const loadData = async () => {
      if (!config.supabaseClient) return;

      const { data: { user } } = await config.supabaseClient.auth.getUser();
      if (!user) return;

      // 1. Check existing onboarding data (user-entered takes priority)
      const { data: onboardingData } = await config.supabaseClient
        .from('onboarding_data')
        .select('address_line_1, address_line_2, address_country, state, city, zip_code, residence_country')
        .eq('user_id', user.id)
        .maybeSingle();

      // If user already has saved address, use it
      if (onboardingData?.address_line_1) {
        setAddressLine1(onboardingData.address_line_1 || '');
        setAddressLine2(onboardingData.address_line_2 || '');
        setCountry(onboardingData.address_country || 'US');
        setState(onboardingData.state || '');
        setCity(onboardingData.city || '');
        setZipCode(onboardingData.zip_code || '');
        return;
      }

      // 2. Auto-detect location using LocationService (GPS â†’ IP fallback)
      setIsDetecting(true);
      setDetectionMessage('ðŸ“ Detecting your location...');
      console.log('[Step8] Detecting location via LocationService...');

      try {
        const result = await locationService.detectLocation();

        if (result.data) {
          const source = result.source === 'detected' ? 'GPS' : 'IP';
          console.log(`[Step8] Location detected via ${source}:`, result.data);
          setDetectionMessage(`ðŸ“ ${result.data.city || result.data.country || 'Location detected'}`);

          // Save to Supabase for consistency
          try {
            await locationService.saveLocationToOnboarding(user.id, result.data);
          } catch (saveErr) {
            console.warn('[Step8] Failed to save location cache:', saveErr);
          }

          // Apply to form
          applyLocationToForm(result.data);

          // Clear message after 2s
          setTimeout(() => setDetectionMessage(null), 2000);
          setIsDetecting(false);
          return;
        }
      } catch (err) {
        console.warn('[Step8] Location detection failed:', err);
      }

      setIsDetecting(false);
      setDetectionMessage(null);

      // 3. Fallback: cached enriched profile
      try {
        const { data: enrichedProfile } = await config.supabaseClient
          .from('user_enriched_profiles')
          .select('address')
          .eq('user_id', user.id)
          .maybeSingle();

        if (enrichedProfile?.address) {
          const addr = enrichedProfile.address as {
            line1?: string; line2?: string; city?: string; state?: string;
            country?: string; countryCode?: string; zipCode?: string;
          };
          console.log('[Step8] Using cached enriched profile:', addr);
          if (addr.line1) setAddressLine1(addr.line1);
          if (addr.line2) setAddressLine2(addr.line2);
          if (addr.countryCode) {
            pendingGpsCountry.current = addr.countryCode;
            setCountry(addr.countryCode);
          } else if (addr.country) {
            const code = locationService.mapCountryToIsoCode(addr.country);
            pendingGpsCountry.current = code;
            setCountry(code);
          }
          if (addr.state) pendingGpsState.current = addr.state;
          if (addr.city) pendingGpsCity.current = addr.city;
          if (addr.zipCode) setZipCode(addr.zipCode);
          return;
        }
      } catch (err) {
        console.warn('[Step8] Enriched profile check failed:', err);
      }

      // 4. Last resort: residence_country from Step 6
      if (onboardingData?.residence_country) {
        const code = locationService.mapCountryToIsoCode(onboardingData.residence_country);
        console.log('[Step8] Using residence_country fallback:', code);
        pendingGpsCountry.current = code;
        setCountry(code);
      }
    };

    loadData();

    // Cleanup on unmount
    return () => {
      locationService.cancel();
    };
  }, []);

  // Validation functions
  const validateAddressLine1 = (value: string): string | undefined => {
    if (!value.trim()) return 'Address is required';
    if (value.trim().length < 5) return 'Address is too short';
    if (value.trim().length > 100) return 'Address is too long';
    // Check for basic address format (should contain letters and numbers)
    if (!/[a-zA-Z]/.test(value)) return 'Please enter a valid address';
    return undefined;
  };

  const validateZipCode = (value: string): string | undefined => {
    if (!value.trim()) return 'ZIP code is required';
    // Allow 5 or 6 digit ZIP codes
    if (!/^\d{5,6}$/.test(value.trim())) return 'ZIP code must be 5 or 6 digits';
    return undefined;
  };

  const validateCountry = (value: string): string | undefined => {
    if (!value) return 'Please select a country';
    return undefined;
  };

  const validateState = (value: string): string | undefined => {
    if (!value) return 'Please select a state';
    return undefined;
  };

  const validateCity = (value: string): string | undefined => {
    if (!value) return 'Please select a city';
    return undefined;
  };

  // Handle field blur (mark as touched)
  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    
    // Validate the field on blur
    let error: string | undefined;
    switch (field) {
      case 'addressLine1':
        error = validateAddressLine1(addressLine1);
        break;
      case 'zipCode':
        error = validateZipCode(zipCode);
        break;
      case 'country':
        error = validateCountry(country);
        break;
      case 'state':
        error = validateState(state);
        break;
      case 'city':
        error = validateCity(city);
        break;
    }
    
    setFieldErrors(prev => ({ ...prev, [field]: error }));
  };

  // Validate all fields
  const validateAllFields = (): boolean => {
    const errors: FieldErrors = {
      addressLine1: validateAddressLine1(addressLine1),
      country: validateCountry(country),
      state: validateState(state),
      city: validateCity(city),
      zipCode: validateZipCode(zipCode),
    };
    
    setFieldErrors(errors);
    setTouched({
      addressLine1: true,
      country: true,
      state: true,
      city: true,
      zipCode: true,
    });
    
    return !Object.values(errors).some(e => e !== undefined);
  };

  const handleContinue = async () => {
    // Validate all fields first
    if (!validateAllFields()) {
      setError('Please fix the errors above');
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

    const { error: upsertError } = await config.supabaseClient
      .from('onboarding_data')
      .upsert({
        user_id: user.id,
        address_line_1: addressLine1.trim(),
        address_line_2: addressLine2.trim() || null,
        address_country: country,
        state: state,
        city: city,
        zip_code: zipCode.trim(),
        current_step: 8,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

    if (upsertError) {
      setError('Failed to save data');
      setLoading(false);
      return;
    }

    navigate('/onboarding/step-9');
  };

  const handleBack = () => {
    navigate('/onboarding/step-7');
  };

  const isValid = addressLine1.trim() && country && state && city && zipCode.trim();

  return (
    <div 
      className="bg-slate-50 min-h-screen"
      style={{ fontFamily: "'Manrope', sans-serif" }}
    >
      <div className="onboarding-shell relative flex min-h-screen w-full flex-col bg-white max-w-[500px] mx-auto shadow-xl overflow-hidden border-x border-slate-100">
        
        {/* Sticky Header */}
        <header className="flex items-center px-4 pt-6 pb-4 bg-white/95 backdrop-blur-sm sticky top-0 z-10">
          <button 
            onClick={handleBack}
            className="flex items-center gap-1 text-slate-900 hover:text-[#2b8cee] transition-colors"
          >
            <BackIcon />
            <span className="text-base font-bold tracking-tight">Back</span>
          </button>
          <div className="flex-1" />
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col px-6 pb-48 overflow-y-auto">
          {/* Header Section - Center Aligned */}
          <div className="mb-8 text-center">
            <h1 className="text-slate-900 text-[22px] font-bold leading-tight tracking-tight mb-3">
              Enter your address
            </h1>
            <p className="text-slate-500 text-[14px] font-normal leading-relaxed">
              Please provide your primary residence address.
            </p>
            
            {/* Location Detection Status */}
            {(isDetecting || detectionMessage) && (
              <div className={`mt-4 py-2 px-4 rounded-full inline-flex items-center gap-2 text-sm font-medium transition-all ${
                isDetecting 
                  ? 'bg-blue-50 text-blue-600 animate-pulse' 
                  : 'bg-green-50 text-green-600'
              }`}>
                {isDetecting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>{detectionMessage || 'Detecting your location...'}</span>
                  </>
                ) : (
                  <span>{detectionMessage}</span>
                )}
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Form Card 1: Street Address */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5 mb-6 space-y-5">
            {/* Address Line 1 */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-900" htmlFor="address1">
                Address line 1
              </label>
              <input
                id="address1"
                type="text"
                value={addressLine1}
                onChange={(e) => {
                  setAddressLine1(e.target.value);
                  // Clear error when user starts typing
                  if (touched.addressLine1) {
                    setFieldErrors(prev => ({ ...prev, addressLine1: validateAddressLine1(e.target.value) }));
                  }
                }}
                onBlur={() => handleBlur('addressLine1')}
                placeholder="Street address"
                className={`w-full h-12 px-4 rounded-lg border bg-white text-slate-900 placeholder:text-slate-400 text-base focus:outline-none focus:ring-2 transition-all ${
                  touched.addressLine1 && fieldErrors.addressLine1
                    ? 'border-red-400 focus:ring-red-200 focus:border-red-400'
                    : 'border-gray-200 focus:ring-[#2b8cee]/20 focus:border-[#2b8cee]'
                }`}
              />
              {/* Error or Helper Text */}
              {touched.addressLine1 && fieldErrors.addressLine1 ? (
                <p className="text-red-500 text-xs font-normal leading-tight mt-1">
                  {fieldErrors.addressLine1}
                </p>
              ) : (
                <div className="flex items-start gap-1.5 mt-1.5">
                  <InfoIcon />
                  <p className="text-slate-400 text-xs font-normal leading-tight">
                    Use your street address, not a P.O. Box.
                  </p>
                </div>
              )}
            </div>

            {/* Address Line 2 */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-baseline">
                <label className="block text-sm font-medium text-slate-900" htmlFor="address2">
                  Address line 2
                </label>
                <span className="text-xs text-slate-400">Optional</span>
              </div>
              <input
                id="address2"
                type="text"
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)}
                placeholder="Apt, suite, unit, etc."
                className="w-full h-12 px-4 rounded-lg border border-gray-200 bg-white text-slate-900 placeholder:text-slate-400 text-base focus:outline-none focus:ring-2 focus:ring-[#2b8cee]/20 focus:border-[#2b8cee] transition-all"
              />
            </div>
          </div>

          {/* Form Card 2: Region Details */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5 space-y-5 mb-4">
            {/* Country */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-900" htmlFor="country">
                Country
              </label>
              <div className="relative">
                <select
                  id="country"
                  value={country}
                  onChange={(e) => {
                    setCountry(e.target.value);
                    setState('');
                    setCity('');
                  }}
                  className="w-full h-12 px-4 pr-10 rounded-lg border border-gray-200 bg-white text-slate-900 text-base focus:outline-none focus:ring-2 focus:ring-[#2b8cee]/20 focus:border-[#2b8cee] transition-all appearance-none"
                >
                  <option value="">Select country...</option>
                  {countries.map((c) => (
                    <option key={c.isoCode} value={c.isoCode}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <ChevronDownIcon />
                </div>
              </div>
            </div>

            {/* State & City Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* State */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-900" htmlFor="state">
                  State
                </label>
                <div className="relative">
                  <select
                    id="state"
                    value={state}
                    onChange={(e) => {
                      setState(e.target.value);
                      setCity('');
                    }}
                    disabled={!country || loadingStates}
                    className="w-full h-12 px-4 pr-10 rounded-lg border border-gray-200 bg-white text-slate-900 text-base focus:outline-none focus:ring-2 focus:ring-[#2b8cee]/20 focus:border-[#2b8cee] transition-all appearance-none disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    <option value="">{loadingStates ? 'Loading...' : 'Select'}</option>
                    {states.map((s) => (
                      <option key={s.isoCode} value={s.isoCode}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <ChevronDownIcon />
                  </div>
                </div>
              </div>

              {/* City */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-900" htmlFor="city">
                  City
                </label>
                <div className="relative">
                  <select
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    disabled={!state || loadingCities}
                    className="w-full h-12 px-4 pr-10 rounded-lg border border-gray-200 bg-white text-slate-900 text-base focus:outline-none focus:ring-2 focus:ring-[#2b8cee]/20 focus:border-[#2b8cee] transition-all appearance-none disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    <option value="">{loadingCities ? 'Loading...' : 'Select'}</option>
                    {cities.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <ChevronDownIcon />
                  </div>
                </div>
              </div>
            </div>

            {/* ZIP Code */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-900" htmlFor="zip">
                ZIP code
              </label>
              <input
                id="zip"
                type="text"
                value={zipCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setZipCode(value);
                  // Update validation on change
                  if (touched.zipCode) {
                    setFieldErrors(prev => ({ ...prev, zipCode: validateZipCode(value) }));
                  }
                }}
                onBlur={() => handleBlur('zipCode')}
                inputMode="numeric"
                placeholder="00000"
                className={`w-full h-12 px-4 rounded-lg border bg-white text-slate-900 placeholder:text-slate-400 text-base focus:outline-none focus:ring-2 transition-all ${
                  touched.zipCode && fieldErrors.zipCode
                    ? 'border-red-400 focus:ring-red-200 focus:border-red-400'
                    : 'border-gray-200 focus:ring-[#2b8cee]/20 focus:border-[#2b8cee]'
                }`}
              />
              {/* Error or Helper Text */}
              {touched.zipCode && fieldErrors.zipCode ? (
                <p className="text-red-500 text-xs font-normal leading-tight mt-1">
                  {fieldErrors.zipCode}
                </p>
              ) : (
                <p className="text-slate-400 text-xs font-normal leading-tight mt-1">
                  Enter 5 or 6 digit ZIP code
                </p>
              )}
            </div>
          </div>
        </main>

        {/* Fixed Footer - Hidden when main footer is visible */}
        {!isFooterVisible && (
          <div className="fixed bottom-0 left-0 right-0 z-20 w-full max-w-[500px] mx-auto bg-white/80 backdrop-blur-md border-t border-slate-100 p-4 flex flex-col gap-3" data-onboarding-footer>
            {/* Continue Button */}
            <button
              onClick={handleContinue}
              disabled={!isValid || loading}
              className={`
                flex w-full cursor-pointer items-center justify-center rounded-full h-14 px-5 text-base font-bold tracking-wide transition-all active:scale-[0.98]
                ${isValid && !loading
                  ? 'bg-[#2b8cee] hover:bg-[#2070c0] text-white shadow-lg shadow-[#2b8cee]/20'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }
              `}
            >
              {loading ? 'Saving...' : 'Continue'}
            </button>
            
            {/* Back Button */}
            <button
              onClick={handleBack}
              className="flex w-full cursor-pointer items-center justify-center rounded-full bg-transparent py-2 text-slate-500 text-sm font-bold hover:text-slate-800 transition-colors"
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default OnboardingStep8;
