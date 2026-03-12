/**
 * Step 4 — All Business Logic
 * Country/residence detection, GPS/IP location, Supabase upsert
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import config from '../../../resources/config/config';
import { upsertOnboardingData } from '../../../services/onboarding/upsertOnboardingData';
import { useFooterVisibility } from '../../../utils/useFooterVisibility';
import { locationService, type LocationData, COUNTRY_CODE_TO_NAME } from '../../../services/location';

export const CURRENT_STEP = 4;
export const TOTAL_STEPS = 12;
export const PROGRESS_PCT = Math.round((CURRENT_STEP / TOTAL_STEPS) * 100);

export const countries = [
  'United States','Afghanistan','Albania','Algeria','Andorra','Angola','Argentina','Armenia','Australia',
  'Austria','Azerbaijan','Bahamas','Bahrain','Bangladesh','Barbados','Belarus','Belgium','Belize','Benin',
  'Bhutan','Bolivia','Bosnia and Herzegovina','Botswana','Brazil','Brunei','Bulgaria','Burkina Faso',
  'Burundi','Cambodia','Cameroon','Canada','Cape Verde','Central African Republic','Chad','Chile','China',
  'Colombia','Comoros','Congo','Costa Rica','Croatia','Cuba','Cyprus','Czech Republic','Denmark','Djibouti',
  'Dominica','Dominican Republic','East Timor','Ecuador','Egypt','El Salvador','Equatorial Guinea','Eritrea',
  'Estonia','Ethiopia','Fiji','Finland','France','Gabon','Gambia','Georgia','Germany','Ghana','Greece',
  'Grenada','Guatemala','Guinea','Guinea-Bissau','Guyana','Haiti','Honduras','Hungary','Iceland','India',
  'Indonesia','Iran','Iraq','Ireland','Israel','Italy','Jamaica','Japan','Jordan','Kazakhstan','Kenya',
  'Kiribati','North Korea','South Korea','Kuwait','Kyrgyzstan','Laos','Latvia','Lebanon','Lesotho','Liberia',
  'Libya','Liechtenstein','Lithuania','Luxembourg','Macedonia','Madagascar','Malawi','Malaysia','Maldives',
  'Mali','Malta','Marshall Islands','Mauritania','Mauritius','Mexico','Micronesia','Moldova','Monaco',
  'Mongolia','Montenegro','Morocco','Mozambique','Myanmar','Namibia','Nauru','Nepal','Netherlands',
  'New Zealand','Nicaragua','Niger','Nigeria','Norway','Oman','Pakistan','Palau','Panama',
  'Papua New Guinea','Paraguay','Peru','Philippines','Poland','Portugal','Qatar','Romania','Russia','Rwanda',
  'Saint Kitts and Nevis','Saint Lucia','Saint Vincent and the Grenadines','Samoa','San Marino',
  'Sao Tome and Principe','Saudi Arabia','Senegal','Serbia','Seychelles','Sierra Leone','Singapore',
  'Slovakia','Slovenia','Solomon Islands','Somalia','South Africa','South Sudan','Spain','Sri Lanka','Sudan',
  'Suriname','Swaziland','Sweden','Switzerland','Syria','Taiwan','Tajikistan','Tanzania','Thailand','Togo',
  'Tonga','Trinidad and Tobago','Tunisia','Turkey','Turkmenistan','Tuvalu','Uganda','Ukraine',
  'United Arab Emirates','United Kingdom','Uruguay','Uzbekistan','Vanuatu','Vatican City','Venezuela',
  'Vietnam','Yemen','Zambia','Zimbabwe',
];

export type LocationStatus = 'detecting' | 'success' | 'ip-success' | 'denied' | 'failed' | 'manual' | null;

export interface Step4Logic {
  citizenshipCountry: string; residenceCountry: string;
  isLoading: boolean; isFooterVisible: boolean;
  isDetectingLocation: boolean; locationDetected: boolean;
  locationStatus: LocationStatus; detectedLocation: string;
  userConfirmedManual: boolean; showPermissionHelp: boolean;
  showLocationModal: boolean; canContinue: boolean;
  isErrorStatus: boolean; isSuccessStatus: boolean;
  shouldShowForm: boolean; canConfirmSelection: boolean;
  handleCitizenshipChange: (v: string) => void;
  handleResidenceChange: (v: string) => void;
  handleConfirmManualSelection: () => void;
  handleRetry: () => Promise<void>;
  handleAllowLocation: () => Promise<void>;
  handleDontAllow: () => void;
  handleContinue: () => Promise<void>;
  handleBack: () => void;
  handleSkip: () => void;
  setShowPermissionHelp: (v: boolean) => void;
}

export const useStep4Logic = (): Step4Logic => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [citizenshipCountry, setCitizenshipCountry] = useState('');
  const [residenceCountry, setResidenceCountry] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const isFooterVisible = useFooterVisibility();
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationDetected, setLocationDetected] = useState(false);
  const [userManuallyChanged, setUserManuallyChanged] = useState(false);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>(null);
  const [detectedLocation, setDetectedLocation] = useState('');
  const [userConfirmedManual, setUserConfirmedManual] = useState(false);
  const [showPermissionHelp, setShowPermissionHelp] = useState(false);
  const [hasPreviousData, setHasPreviousData] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);

  const canContinue = locationDetected || userConfirmedManual;
  const isErrorStatus = locationStatus === 'denied' || locationStatus === 'failed';
  const isSuccessStatus = locationStatus === 'success' || locationStatus === 'ip-success';
  const shouldShowForm = Boolean(locationStatus || hasPreviousData);
  const canConfirmSelection = Boolean(citizenshipCountry && residenceCountry && !userConfirmedManual);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    const getCurrentUser = async () => {
      if (!config.supabaseClient) return;
      const { data: { user } } = await config.supabaseClient.auth.getUser();
      if (!user) { navigate('/login'); return; }
      setUserId(user.id);
      const { data } = await config.supabaseClient.from('onboarding_data').select('*').eq('user_id', user.id).maybeSingle();
      if (data) {
        if (data.citizenship_country) { setCitizenshipCountry(data.citizenship_country); setUserManuallyChanged(true); setHasPreviousData(true); }
        if (data.residence_country) setResidenceCountry(data.residence_country);
      }
    };
    getCurrentUser();
    return () => { locationService.cancel(); };
  }, [navigate]);

  useEffect(() => {
    if (!locationStatus && !hasPreviousData && userId) setShowLocationModal(true);
  }, [userId, locationStatus, hasPreviousData]);

  const detectLocation = async (uid: string) => {
    setIsDetectingLocation(true); setLocationStatus('detecting');
    try {
      const result = await locationService.detectLocation();
      if ((result.source === 'detected' || result.source === 'ip-detected') && result.data) {
        const locationData: LocationData = result.data;
        const countryName = COUNTRY_CODE_TO_NAME[locationData.countryCode] || locationData.country;
        if (countries.includes(countryName)) { setCitizenshipCountry(countryName); setResidenceCountry(countryName); }
        setDetectedLocation(locationData.city || locationData.state || countryName);
        setLocationDetected(true);
        setLocationStatus(result.source === 'detected' ? 'success' : 'ip-success');
        setHasPreviousData(false);
        try { await locationService.saveLocationToOnboarding(uid, locationData); } catch (e) { console.warn('[Step4] Cache failed:', e); }
      } else if (result.source === 'denied') { setLocationStatus('denied'); }
      else { setLocationStatus('failed'); }
    } catch (error) { console.error('[Step4] Location error:', error); setLocationStatus('failed'); }
    finally { setIsDetectingLocation(false); }
  };

  const handleCitizenshipChange = (value: string) => {
    setCitizenshipCountry(value); setUserManuallyChanged(true);
    if (userConfirmedManual) { setUserConfirmedManual(false); setLocationStatus('manual'); }
  };

  const handleResidenceChange = (value: string) => {
    setResidenceCountry(value); setUserManuallyChanged(true);
    if (userConfirmedManual) { setUserConfirmedManual(false); setLocationStatus('manual'); }
  };

  const handleConfirmManualSelection = () => {
    if (citizenshipCountry && residenceCountry) { setUserConfirmedManual(true); setLocationStatus('manual'); }
  };

  const handleRetry = async () => {
    setLocationDetected(false); setUserManuallyChanged(false); setUserConfirmedManual(false);
    if (userId) await detectLocation(userId);
  };

  const handleAllowLocation = async () => { if (!userId) return; setShowLocationModal(false); await detectLocation(userId); };
  const handleDontAllow = () => { setShowLocationModal(false); setLocationStatus('manual'); };

  const handleContinue = async () => {
    if (!userId || !config.supabaseClient || !canContinue) return;
    setIsLoading(true);
    try {
      await upsertOnboardingData(userId, { citizenship_country: citizenshipCountry, residence_country: residenceCountry, current_step: 4 });
      navigate('/onboarding/step-5');
    } catch (error) { console.error('Error:', error); }
    finally { setIsLoading(false); }
  };

  const handleBack = () => navigate('/onboarding/step-2');
  const handleSkip = () => navigate('/onboarding/step-5');

  return {
    citizenshipCountry, residenceCountry, isLoading, isFooterVisible,
    isDetectingLocation, locationDetected, locationStatus, detectedLocation,
    userConfirmedManual, showPermissionHelp, showLocationModal, canContinue,
    isErrorStatus, isSuccessStatus, shouldShowForm, canConfirmSelection,
    handleCitizenshipChange, handleResidenceChange, handleConfirmManualSelection,
    handleRetry, handleAllowLocation, handleDontAllow, handleContinue,
    handleBack, handleSkip, setShowPermissionHelp,
  };
};
