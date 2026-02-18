import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import config from '../../resources/config/config';
import { useFooterVisibility } from '../../utils/useFooterVisibility';
import { locationService, LocationData, COUNTRY_CODE_TO_NAME } from '../../services/location';
import PermissionHelpModal from '../../components/PermissionHelpModal';
import LocationPermissionModal from '../../components/LocationPermissionModal';

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

    // Close modal first
    setShowLocationModal(false);

    // Then trigger GPS detection (will show browser permission popup)
    await detectLocation(userId);
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
      await config.supabaseClient
        .from('onboarding_data')
        .update({
          citizenship_country: citizenshipCountry,
          residence_country: residenceCountry,
          current_step: 4,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

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

  // Helper functions for status card
  const getStatusCardStyle = (status: typeof locationStatus) => {
    switch (status) {
      case 'detecting':
        return 'bg-blue-50 border-blue-200';
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'ip-success':
        return 'bg-green-50 border-green-200';
      case 'denied':
        return 'bg-amber-50 border-amber-200';
      case 'failed':
        return 'bg-red-50 border-red-200';
      case 'manual':
        return 'bg-slate-50 border-slate-200';
      default:
        return 'bg-white border-gray-200';
    }
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
        return 'Manual selection confirmed';
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
        return "You've manually selected your country. Click Continue to proceed.";
      default:
        return '';
    }
  };

  return (
    <div 
      className="bg-slate-50 min-h-screen"
      style={{ fontFamily: "'Manrope', sans-serif" }}
    >
      <div className="onboarding-shell relative flex min-h-screen w-full flex-col bg-white max-w-[500px] mx-auto shadow-xl overflow-hidden border-x border-slate-100">
        
        {/* Sticky Header */}
        <header className="flex items-center px-4 pt-4 pb-2 bg-white sticky top-0 z-10">
          <button 
            onClick={handleBack}
            aria-label="Go back"
            className="flex size-10 shrink-0 items-center justify-center text-slate-900 rounded-full hover:bg-slate-50 transition-colors"
          >
            <BackIcon />
          </button>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col px-4 sm:px-6 pb-40 sm:pb-44">
          {/* Header Section */}
          <div className="mb-8 text-center">
            <h1 className="text-slate-900 text-[22px] font-bold leading-tight tracking-tight mb-3">
              Confirm your residence
            </h1>
            <p className="text-slate-500 text-[14px] font-normal leading-relaxed">
              We need to know where you live and pay taxes to open your investment account.
            </p>

            {/* Persistent Location Status Card */}
            {locationStatus && (
              <div className={`mt-4 rounded-2xl border p-4 ${getStatusCardStyle(locationStatus)}`}>
                <div className="flex items-start gap-3">
                  {/* Icon based on status */}
                  <div className="flex-shrink-0 mt-0.5">
                    {locationStatus === 'detecting' && <SpinnerIcon />}
                    {locationStatus === 'success' && <CheckCircleIcon className="text-green-600" />}
                    {locationStatus === 'ip-success' && <CheckCircleIcon className="text-green-600" />}
                    {locationStatus === 'denied' && <AlertTriangleIcon className="text-amber-600" />}
                    {locationStatus === 'failed' && <AlertCircleIcon className="text-red-600" />}
                    {locationStatus === 'manual' && <MapPinIcon className="text-blue-600" />}
                  </div>

                  {/* Status Message */}
                  <div className="flex-1">
                    <p className="text-sm font-semibold mb-1 text-slate-900">
                      {getStatusTitle(locationStatus)}
                    </p>
                    <p className="text-xs text-slate-600">
                      {getStatusMessage(locationStatus)}
                    </p>

                    {/* Action Links */}
                    {locationStatus === 'denied' && (
                      <div className="mt-3 flex gap-3">
                        <button
                          onClick={handleRetry}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          Try Again
                        </button>
                        <button
                          onClick={handleShowPermissionHelp}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          How to Enable Location \u2192
                        </button>
                      </div>
                    )}

                    {locationStatus === 'failed' && (
                      <button
                        onClick={handleRetry}
                        className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        Retry Detection
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Only show form card if user has taken action */}
          {(locationStatus || hasPreviousData) && (
            <>
              {/* Previous Data Info - Show when GPS denied/failed but we have old data */}
              {hasPreviousData && (locationStatus === 'denied' || locationStatus === 'failed') && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2.5">
              <svg
                className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <div className="flex-1">
                <p className="text-xs text-blue-900">
                  <span className="font-semibold">Using your previously selected country.</span>
                  {' '}You can change it if needed below.
                  {locationStatus === 'denied' && ' Or enable location access to detect automatically.'}
                </p>
              </div>
            </div>
          )}

          {/* Carded Form Block */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-6 mb-8">
            {/* Country of Citizenship */}
            <div className="mb-6 relative">
              <label className="block text-slate-900 text-sm font-medium leading-normal mb-2 ml-1">
                Country of citizenship
              </label>
              <div className="relative">
                <select
                  value={citizenshipCountry}
                  onChange={(e) => handleCitizenshipChange(e.target.value)}
                  disabled={isDetectingLocation}
                  className={`w-full bg-white text-slate-900 border rounded-xl h-14 px-4 pr-10 text-base font-normal focus:outline-none focus:ring-1 transition-all cursor-pointer appearance-none ${
                    isDetectingLocation
                      ? 'disabled:bg-slate-50 disabled:cursor-wait border-gray-200'
                      : (locationStatus === 'denied' || locationStatus === 'failed') && !userManuallyChanged
                        ? 'border-amber-400 ring-2 ring-amber-200 animate-pulse-slow'
                        : 'border-gray-200 focus:border-[#2b8cee] focus:ring-[#2b8cee]'
                  }`}
                >
                  <option disabled value="">Select country</option>
                  {countries.map((country) => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-500">
                  <ChevronDownIcon />
                </div>
              </div>
            </div>

            {/* Country of Residence */}
            <div className="relative">
              <label className="block text-slate-900 text-sm font-medium leading-normal mb-2 ml-1">
                Country of residence
              </label>
              <div className="relative">
                <select
                  value={residenceCountry}
                  onChange={(e) => handleResidenceChange(e.target.value)}
                  disabled={isDetectingLocation}
                  className={`w-full bg-white text-slate-900 border rounded-xl h-14 px-4 pr-10 text-base font-normal focus:outline-none focus:ring-1 transition-all cursor-pointer appearance-none ${
                    isDetectingLocation
                      ? 'disabled:bg-slate-50 disabled:cursor-wait border-gray-200'
                      : (locationStatus === 'denied' || locationStatus === 'failed') && !userManuallyChanged
                        ? 'border-amber-400 ring-2 ring-amber-200 animate-pulse-slow'
                        : 'border-gray-200 focus:border-[#2b8cee] focus:ring-[#2b8cee]'
                  }`}
                >
                  <option disabled value="">Select country</option>
                  {countries.map((country) => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-500">
                  <ChevronDownIcon />
                </div>
              </div>
            </div>

            {/* Manual Selection Confirmation */}
            {userManuallyChanged && !userConfirmedManual && !locationDetected && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-sm text-slate-700 mb-3">
                  Ready to proceed with your selected country?
                </p>
                <button
                  onClick={handleConfirmManualSelection}
                  disabled={!citizenshipCountry || !residenceCountry}
                  className="w-full py-3 px-4 bg-[#2b8cee] text-white rounded-lg font-semibold hover:bg-[#2070c0] disabled:bg-slate-300 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                >
                  Confirm My Country Selection
                </button>
              </div>
            )}
          </div>
            </>
          )}
        </main>

        {/* Fixed Footer - Hidden when main footer is visible */}
        {!isFooterVisible && (
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
                    ? 'bg-[#2b8cee] text-white hover:bg-[#2070c0] shadow-md shadow-[#2b8cee]/20'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
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
      </div>

      {/* Permission Help Modal */}
      <PermissionHelpModal
        isOpen={showPermissionHelp}
        onClose={() => setShowPermissionHelp(false)}
      />

      {/* Location Permission Modal */}
      <LocationPermissionModal
        isOpen={showLocationModal}
        onRequestLocation={handleDetectLocation}
        onSkip={handleSkipDetection}
        isDetecting={isDetectingLocation}
      />
    </div>
  );
}
