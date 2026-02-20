import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import config from '../../resources/config/config';
import { upsertOnboardingData } from '../../services/onboarding/upsertOnboardingData';
import { useFooterVisibility } from '../../utils/useFooterVisibility';
import { locationService, LocationData, COUNTRY_CODE_TO_NAME } from '../../services/location';
import PermissionHelpModal from '../../components/PermissionHelpModal';
import { OnboardingStepProgress } from '../../components/onboarding/OnboardingStepProgress';

// Back arrow icon
const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

// Chevron down icon for select
const ChevronDownIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

// Status card icons
const SpinnerIcon = () => (
  <svg className="animate-spin h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const CheckCircleIcon = ({ className }: { className?: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

const AlertTriangleIcon = ({ className }: { className?: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
    <line x1="12" y1="9" x2="12" y2="13"></line>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);

const AlertCircleIcon = ({ className }: { className?: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
  </svg>
);

const MapPinIcon = ({ className }: { className?: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
    <circle cx="12" cy="10" r="3"></circle>
  </svg>
);

const GlobeIcon = ({ className }: { className?: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="2" y1="12" x2="22" y2="12"></line>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
  </svg>
);

const HomeIcon = ({ className }: { className?: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 9.5L12 3l9 6.5"></path>
    <path d="M5 10.5V21h14V10.5"></path>
  </svg>
);

// United States first, then all other countries alphabetically
const countries = [
  'United States',
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Argentina', 'Armenia', 'Australia',
  'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium',
  'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei',
  'Bulgaria', 'Burkina Faso', 'Burundi', 'Cambodia', 'Cameroon', 'Canada', 'Cape Verde',
  'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo',
  'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Denmark', 'Djibouti', 'Dominica',
  'Dominican Republic', 'East Timor', 'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea',
  'Eritrea', 'Estonia', 'Ethiopia', 'Fiji', 'Finland', 'France', 'Gabon', 'Gambia', 'Georgia',
  'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana',
  'Haiti', 'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland',
  'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'North Korea',
  'South Korea', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia',
  'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Macedonia', 'Madagascar', 'Malawi',
  'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico',
  'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar',
  'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria',
  'Norway', 'Oman', 'Pakistan', 'Palau', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru',
  'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis',
  'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Sao Tome and Principe',
  'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia',
  'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'South Sudan', 'Spain', 'Sri Lanka',
  'Sudan', 'Suriname', 'Swaziland', 'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Tajikistan',
  'Tanzania', 'Thailand', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan',
  'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'Uruguay',
  'Uzbekistan', 'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'
];

export default function OnboardingStep4() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [citizenshipCountry, setCitizenshipCountry] = useState('');
  const [residenceCountry, setResidenceCountry] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const isFooterVisible = useFooterVisibility();

  // GPS location detection state
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationDetected, setLocationDetected] = useState(false);
  const [userManuallyChanged, setUserManuallyChanged] = useState(false);
  const [locationStatus, setLocationStatus] = useState<'detecting' | 'success' | 'ip-success' | 'denied' | 'failed' | 'manual' | null>(null);
  const [detectedLocation, setDetectedLocation] = useState<string>('');
  const [userConfirmedManual, setUserConfirmedManual] = useState(false);
  const [showPermissionHelp, setShowPermissionHelp] = useState(false);
  const [hasPreviousData, setHasPreviousData] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);

  // Continue button should only be enabled if:
  // 1. Location has been detected (GPS success), OR
  // 2. User has explicitly confirmed manual selection
  const canContinue = locationDetected || userConfirmedManual;

  useEffect(() => {
    // Scroll to top on component mount
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const getCurrentUser = async () => {
      if (!config.supabaseClient) return;
      
      const { data: { user } } = await config.supabaseClient.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }
      setUserId(user.id);

      // Load existing data if any
      const { data: onboardingData } = await config.supabaseClient
        .from('onboarding_data')
        // Select * to remain compatible across schema revisions (some environments removed gps_location_data).
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (onboardingData) {
        // If user already has data, use it (but still detect fresh GPS)
        if (onboardingData.citizenship_country) {
          setCitizenshipCountry(onboardingData.citizenship_country);
          setUserManuallyChanged(true); // User already has data, allow continue
          setHasPreviousData(true); // Track that we loaded previous data
        }
        if (onboardingData.residence_country) {
          setResidenceCountry(onboardingData.residence_country);
        }

        // NOTE: We no longer skip GPS detection even if cached.
        // Always detect fresh GPS location in real-time every time user visits Step 6
      }

      // Don't auto-detect location on page load - let user trigger it with button
      // This gives better UX and higher permission grant rate
    };

    getCurrentUser();

    // Cleanup
    return () => {
      locationService.cancel();
    };
  }, [navigate]);

  // Show modal on first visit (no location status, no previous data)
  useEffect(() => {
    if (!locationStatus && !hasPreviousData && userId) {
      setShowLocationModal(true);
    }
  }, [userId, locationStatus, hasPreviousData]);

  // Location detection function using location service
  // Tries GPS first, then falls back to IP-based geolocation
  const detectLocation = async (uid: string) => {
    setIsDetectingLocation(true);
    setLocationStatus('detecting');

    try {
      const result = await locationService.detectLocation();

      // GPS-based detection succeeded
      if (result.source === 'detected' && result.data) {
        const locationData: LocationData = result.data;
        console.log('[Step4] GPS location detected:', locationData);

        const countryName = COUNTRY_CODE_TO_NAME[locationData.countryCode] || locationData.country;

        if (countries.includes(countryName)) {
          setCitizenshipCountry(countryName);
          setResidenceCountry(countryName);
        }

        const locationText = locationData.city || locationData.state || countryName;
        setDetectedLocation(locationText);
        setLocationDetected(true);
        setLocationStatus('success');
        setHasPreviousData(false);

        // Save location data for later steps
        try {
          await locationService.saveLocationToOnboarding(uid, locationData);
        } catch (saveErr) {
          // Location detection succeeded; caching is best-effort.
          console.warn('[Step4] Failed to cache location:', saveErr);
        }

      // IP-based detection succeeded (GPS was unavailable/denied but IP worked)
      } else if (result.source === 'ip-detected' && result.data) {
        const locationData: LocationData = result.data;
        console.log('[Step4] IP-based location detected:', locationData);

        const countryName = COUNTRY_CODE_TO_NAME[locationData.countryCode] || locationData.country;

        if (countries.includes(countryName)) {
          setCitizenshipCountry(countryName);
          setResidenceCountry(countryName);
        }

        const locationText = locationData.city || locationData.state || countryName;
        setDetectedLocation(locationText);
        setLocationDetected(true);
        setLocationStatus('ip-success');
        setHasPreviousData(false);

        // Save IP location data for later steps
        try {
          await locationService.saveLocationToOnboarding(uid, locationData);
        } catch (saveErr) {
          // Location detection succeeded; caching is best-effort.
          console.warn('[Step4] Failed to cache IP location:', saveErr);
        }

      // Both GPS and IP failed with explicit denial
      } else if (result.source === 'denied') {
        console.log('[Step4] Location permission denied, IP also failed');
        setLocationStatus('denied');

      // Everything failed
      } else {
        console.log('[Step4] All location detection failed:', result.error);
        setLocationStatus('failed');
      }
    } catch (error) {
      console.error('[Step4] Location detection error:', error);
      setLocationStatus('failed');
    } finally {
      setIsDetectingLocation(false);
    }
  };

  // Handle manual country change
  const handleCitizenshipChange = (value: string) => {
    setCitizenshipCountry(value);
    setUserManuallyChanged(true);
    // Reset confirmation when user changes selection
    if (userConfirmedManual) {
      setUserConfirmedManual(false);
      setLocationStatus('manual');
    }
  };

  const handleResidenceChange = (value: string) => {
    setResidenceCountry(value);
    setUserManuallyChanged(true);
    // Reset confirmation when user changes selection
    if (userConfirmedManual) {
      setUserConfirmedManual(false);
      setLocationStatus('manual');
    }
  };

  // Handle manual selection confirmation
  const handleConfirmManualSelection = () => {
    if (citizenshipCountry && residenceCountry) {
      setUserConfirmedManual(true);
      setLocationStatus('manual');
    }
  };

  // Handle retry GPS detection
  const handleRetry = async () => {
    setLocationDetected(false);
    setUserManuallyChanged(false);
    setUserConfirmedManual(false);
    setLocationStatus('detecting');

    if (userId) {
      await detectLocation(userId);
    }
  };

  // Handle permission help modal
  const handleShowPermissionHelp = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowPermissionHelp(true);
  };

  // Handle user clicking "Detect My Location" button
  const handleDetectLocation = async () => {
    if (!userId) return;

    // Trigger GPS detection (browser permission popup), then reveal status UI.
    await detectLocation(userId);
    setShowLocationModal(false);
  };

  // Handle user skipping location detection
  const handleSkipDetection = () => {
    // Close modal and show manual selection
    setShowLocationModal(false);
    setLocationStatus('manual');
  };

  const handleContinue = async () => {
    if (!userId || !config.supabaseClient || !canContinue) return;

    setIsLoading(true);
    try {
      await upsertOnboardingData(userId, {
        citizenship_country: citizenshipCountry,
        residence_country: residenceCountry,
        current_step: 4,
      });

      navigate('/onboarding/step-5');
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/onboarding/step-2');
  };

  // Get button text based on state
  const getButtonText = () => {
    if (isLoading) return 'Saving...';
    if (isDetectingLocation) return 'Detecting location...';
    return 'Continue';
  };

  const getStatusTitle = (status: typeof locationStatus) => {
    switch (status) {
      case 'detecting':
        return 'Detecting your location...';
      case 'success':
        return `Location detected: ${detectedLocation}`;
      case 'ip-success':
        return `Location detected: ${detectedLocation}`;
      case 'denied':
        return 'Location access denied';
      case 'failed':
        return 'Could not detect location';
      case 'manual':
        return userConfirmedManual ? 'Manual selection confirmed' : 'Select your country manually';
      default:
        return '';
    }
  };

  const getStatusMessage = (status: typeof locationStatus) => {
    switch (status) {
      case 'detecting':
        return "We're detecting your location to pre-fill your country...";
      case 'success':
        return "We've automatically filled in your country based on your GPS location. You can change it if needed.";
      case 'ip-success':
        return "We've detected your approximate location based on your network. You can change it if needed.";
      case 'denied':
        return 'Location access was not available. Please select your country manually below.';
      case 'failed':
        return "We couldn't determine your location. Please select your country manually below.";
      case 'manual':
        return userConfirmedManual
          ? "You've manually selected your country. Click Continue to proceed."
          : 'Choose your country of citizenship and residence below, then confirm your selection.';
      default:
        return '';
    }
  };

  const isErrorStatus = locationStatus === 'denied' || locationStatus === 'failed';
  const isSuccessStatus = locationStatus === 'success' || locationStatus === 'ip-success';
  const shouldShowForm = Boolean(locationStatus || hasPreviousData);
  const canConfirmSelection = Boolean(citizenshipCountry && residenceCountry && !userConfirmedManual);

  return (
    <div
      className="min-h-screen bg-slate-50"
      style={{ fontFamily: "'Manrope', sans-serif" }}
    >
      <div className="onboarding-shell relative flex min-h-screen w-full flex-col bg-white max-w-[500px] mx-auto shadow-xl overflow-hidden border-x border-slate-100">
        {/* Sticky Header */}
        <header className="sticky top-0 z-20 flex items-center bg-white/90 px-4 pt-4 pb-2 backdrop-blur-sm sm:px-6 sm:pt-5">
          <button
            onClick={handleBack}
            aria-label="Go back"
            className="flex size-10 shrink-0 items-center justify-center rounded-full text-slate-900 transition-colors hover:bg-slate-100"
          >
            <BackIcon />
          </button>
        </header>

        <OnboardingStepProgress currentStep={4} totalSteps={12} visibleSteps={12} />

        {/* Main Content */}
        <main className="relative flex-1 overflow-y-auto px-4 pb-40 sm:px-6 sm:pb-48">
          <div
            className={`transition-all duration-300 ${
              showLocationModal ? 'pointer-events-none scale-[0.98] blur-[3px] opacity-70' : ''
            }`}
          >
            <div className="mb-10 mt-2 px-1 text-center">
              <h1 className="mb-3 text-2xl font-bold leading-tight text-slate-900">
                Confirm your residence
              </h1>
              <p className="mx-auto max-w-[300px] text-sm leading-relaxed text-slate-500">
                We need to know where you live and pay taxes to open your investment account.
              </p>
            </div>

            <div className="mb-8 space-y-3">
              {locationStatus === 'detecting' && (
                <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 shadow-sm">
                  <SpinnerIcon />
                  <p className="truncate text-xs font-medium text-slate-600">{getStatusTitle(locationStatus)}</p>
                </div>
              )}

              {isErrorStatus && (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 shadow-sm">
                  <div className="flex min-w-0 items-center gap-2 overflow-hidden">
                    {locationStatus === 'denied' ? (
                      <AlertTriangleIcon className="h-5 w-5 shrink-0 text-red-500" />
                    ) : (
                      <AlertCircleIcon className="h-5 w-5 shrink-0 text-red-500" />
                    )}
                    <p className="truncate text-xs font-medium text-slate-600">{getStatusTitle(locationStatus)}</p>
                  </div>
                  <button
                    onClick={handleRetry}
                    className="shrink-0 whitespace-nowrap text-xs font-semibold text-[#3A63B8] transition-colors hover:underline"
                  >
                    Retry
                  </button>
                </div>
              )}

              {locationStatus === 'denied' && (
                <button
                  onClick={handleShowPermissionHelp}
                  className="ml-1 text-xs font-semibold text-[#3A63B8] transition-colors hover:underline"
                >
                  How to enable location
                </button>
              )}

              {hasPreviousData && isErrorStatus && (
                <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 shadow-sm">
                  <CheckCircleIcon className="h-[18px] w-[18px] shrink-0 text-[#3A63B8]" />
                  <p className="flex-1 truncate text-xs text-slate-700">
                    <span className="font-semibold text-[#3A63B8]">Using previous selection.</span> Change if needed.
                  </p>
                </div>
              )}

              {isSuccessStatus && (
                <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 shadow-sm">
                  <CheckCircleIcon className="h-[18px] w-[18px] shrink-0 text-[#3A63B8]" />
                  <p className="truncate text-xs text-slate-700">
                    <span className="font-semibold text-[#3A63B8]">Location detected:</span> {detectedLocation}
                  </p>
                </div>
              )}

              {locationStatus === 'manual' && !userConfirmedManual && (
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm">
                  <MapPinIcon className="h-[18px] w-[18px] shrink-0 text-slate-500" />
                  <p className="truncate text-xs text-slate-600">{getStatusMessage(locationStatus)}</p>
                </div>
              )}
            </div>

            {shouldShowForm && (
              <div className="space-y-6 rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 opacity-80">
                    <GlobeIcon className="text-slate-600" />
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-800">
                      Country of citizenship
                    </label>
                  </div>

                  <div className="relative">
                    <select
                      value={citizenshipCountry}
                      onChange={(e) => handleCitizenshipChange(e.target.value)}
                      disabled={isDetectingLocation}
                      className={`w-full appearance-none rounded-lg border bg-white py-3 pl-3 pr-8 text-sm font-medium text-slate-900 outline-none transition-shadow focus:border-[#3A63B8] focus:ring-1 focus:ring-[#3A63B8] ${
                        isDetectingLocation
                          ? 'cursor-wait border-slate-200 bg-slate-50'
                          : isErrorStatus && !userManuallyChanged
                            ? 'border-red-300 ring-1 ring-red-200'
                            : 'border-slate-200'
                      }`}
                    >
                      <option disabled value="">
                        Select country
                      </option>
                      {countries.map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5">
                      <ChevronDownIcon />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 opacity-80">
                    <HomeIcon className="text-slate-600" />
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-800">
                      Country of residence
                    </label>
                  </div>

                  <div className="relative">
                    <select
                      value={residenceCountry}
                      onChange={(e) => handleResidenceChange(e.target.value)}
                      disabled={isDetectingLocation}
                      className={`w-full appearance-none rounded-lg border bg-white py-3 pl-3 pr-8 text-sm font-medium text-slate-900 outline-none transition-shadow focus:border-[#3A63B8] focus:ring-1 focus:ring-[#3A63B8] ${
                        isDetectingLocation
                          ? 'cursor-wait border-slate-200 bg-slate-50'
                          : isErrorStatus && !userManuallyChanged
                            ? 'border-red-300 ring-1 ring-red-200'
                            : 'border-slate-200'
                      }`}
                    >
                      <option disabled value="">
                        Select country
                      </option>
                      {countries.map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5">
                      <ChevronDownIcon />
                    </div>
                  </div>
                </div>

                {!locationDetected && (
                  <div className="border-t border-slate-100 pt-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="whitespace-nowrap text-xs text-slate-500">
                        {userConfirmedManual ? 'Selection confirmed.' : 'Ready to proceed?'}
                      </p>
                      <button
                        onClick={handleConfirmManualSelection}
                        disabled={!canConfirmSelection}
                        className={`whitespace-nowrap rounded-full px-5 py-2 text-xs font-semibold transition-all active:scale-[0.98] ${
                          userConfirmedManual
                            ? 'cursor-default bg-emerald-100 text-emerald-700'
                            : canConfirmSelection
                              ? 'bg-[#3A63B8] text-white shadow-sm hover:bg-[#2e4f94]'
                              : 'cursor-not-allowed bg-slate-200 text-slate-400'
                        }`}
                      >
                        {userConfirmedManual ? 'Confirmed' : 'Confirm Selection'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        {/* Fixed Footer - Hidden when main footer is visible */}
        {!isFooterVisible && !showLocationModal && (
          <div
            className="fixed bottom-0 left-0 right-0 z-50 w-full max-w-[500px] mx-auto border-t border-slate-100 bg-white/90 backdrop-blur-md px-4 sm:px-6 pt-4 sm:pt-5 pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-[0_-4px_20px_rgba(0,0,0,0.04)]"
            data-onboarding-footer
          >
            {/* Buttons */}
            <div className="flex flex-col gap-3 sm:gap-4">
              {/* Continue Button */}
              <button
                onClick={handleContinue}
                disabled={!canContinue || isLoading || isDetectingLocation}
                data-onboarding-cta
                className={`flex w-full h-11 sm:h-12 cursor-pointer items-center justify-center rounded-full px-6 text-sm sm:text-base font-semibold transition-all active:scale-[0.98] ${
                  canContinue && !isLoading && !isDetectingLocation
                    ? 'bg-[#3A63B8] text-white hover:bg-[#2e4f94] shadow-sm'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isDetectingLocation && (
                  <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {getButtonText()}
              </button>

              {/* Back Button */}
              <button
                onClick={handleBack}
                className="flex w-full cursor-pointer items-center justify-center rounded-full bg-transparent py-2 text-slate-500 text-sm font-semibold hover:text-slate-800 transition-colors"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {showLocationModal && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/10 p-3 backdrop-blur-[2px] sm:p-4">
            <div
              className="relative w-full max-w-[360px] rounded-[32px] border border-white/40 bg-white/70 p-5 text-center shadow-[0_20px_60px_-10px_rgba(15,23,42,0.35)] backdrop-blur-[20px] sm:p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-24 rounded-t-[32px] bg-gradient-to-b from-white/35 to-transparent" />

              <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.85)_0%,rgba(255,255,255,0.12)_32%,rgba(58,99,184,0.45)_70%,rgba(58,99,184,0.92)_100%)] shadow-[0_15px_35px_rgba(58,99,184,0.3),inset_0_0_20px_rgba(255,255,255,0.5)]">
                <MapPinIcon className="h-7 w-7 text-[#3A63B8]" />
              </div>

              <h2 className="relative mb-2 text-[20px] font-bold tracking-tight text-slate-900">Enable Location</h2>
              <p className="relative mb-5 text-[13px] leading-snug text-slate-600">
                We&apos;ll detect your location to auto-fill your region for regulatory compliance.
              </p>

              <div className="relative mb-5 rounded-xl border border-white/50 bg-white/35 p-4 text-left backdrop-blur-md">
                <h3 className="mb-3 pl-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#3A63B8]/80">
                  How it works
                </h3>
                <div className="space-y-2.5 pl-1">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#3A63B8]/10 text-[9px] font-bold text-[#3A63B8]">
                      1
                    </span>
                    <span className="text-[12px] font-medium text-slate-700">Tap &quot;Detect My Location&quot; below</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#3A63B8]/10 text-[9px] font-bold text-[#3A63B8]">
                      2
                    </span>
                    <span className="text-[12px] font-medium text-slate-700">Allow access when prompted</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#3A63B8]/10 text-[9px] font-bold text-[#3A63B8]">
                      3
                    </span>
                    <span className="text-[12px] font-medium text-slate-700">Auto-fill country and region</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleDetectLocation}
                disabled={isDetectingLocation || !userId}
                className="group relative mb-3 flex w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-b from-[#4a74d4] to-[#2d4d91] px-5 py-3.5 text-[15px] font-semibold text-white shadow-[0_10px_20px_rgba(58,99,184,0.35),inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-1px_0_rgba(0,0,0,0.2)] transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDetectingLocation ? (
                  <>
                    <svg className="h-[18px] w-[18px] animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Detecting...</span>
                  </>
                ) : (
                  <>
                    <MapPinIcon className="h-[18px] w-[18px]" />
                    <span>Detect My Location</span>
                  </>
                )}
              </button>

              <button
                onClick={handleSkipDetection}
                disabled={isDetectingLocation}
                className="mb-5 text-[13px] font-medium text-slate-500 transition-colors hover:text-[#3A63B8] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Select Manually Instead
              </button>

              <div className="flex items-start gap-2 border-t border-slate-200/60 pt-3 text-left">
                <svg
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <p className="text-[10px] leading-tight text-slate-400">
                  Your location is only used to auto-fill your country. We do not track your movements.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Permission Help Modal */}
      <PermissionHelpModal
        isOpen={showPermissionHelp}
        onClose={() => setShowPermissionHelp(false)}
      />
    </div>
  );
}

