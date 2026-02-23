import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast, useClipboard } from "@chakra-ui/react";
import { useFooterVisibility } from "../../utils/useFooterVisibility";
import { ArrowLeft, User, TrendingUp, Shield, ChevronDown, Calendar, Brain, Target, Clock, Gauge, Droplets, Briefcase, Layers, Zap, Activity, ChevronUp, Edit2, Share2, Link, Copy, Check, ExternalLink, Home, Search, Globe, Coffee, Heart, Users, Newspaper } from "lucide-react";
import { FaApple, FaWhatsapp, FaLinkedin } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { SiGooglepay } from "react-icons/si";
import { HiMail } from "react-icons/hi";
import resources from "../../resources/resources";
import { generateInvestorProfile } from "../../services/investorProfile/apiClient";
import { downloadHushhGoldPass, launchGoogleWalletPass } from "../../services/walletPass";
import { InvestorProfile, FIELD_LABELS, VALUE_LABELS } from "../../types/investorProfile";
import AIDetectedPreferences from "../../components/profile/AIDetectedPreferences";
import NWSScoreBadge from "../../components/profile/NWSScoreBadge";
import { calculateNWSFromDB, NWSResult } from "../../services/networkScore/calculateNWS";
import { invokeShadowInvestigator, formatPhoneContact, ShadowProfile, SHADOW_FIELD_LABELS } from "../../services/shadowInvestigator";

// Complete country list matching Step 6 onboarding - using full country names
const COUNTRIES = [
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

interface FormState {
  name: string;
  email: string;
  age: number | "";
  phoneCountryCode: string;
  phoneNumber: string;
  organisation: string;
  // Onboarding fields
  accountType: string;
  selectedFund: string;
  referralSource: string;
  citizenshipCountry: string;
  residenceCountry: string;
  accountStructure: string;
  legalFirstName: string;
  legalLastName: string;
  addressLine1: string;
  city: string;
  state: string;
  zipCode: string;
  dateOfBirth: string;
  initialInvestmentAmount: number | "";
}

const defaultFormState: FormState = {
  name: "",
  email: "",
  age: "",
  phoneCountryCode: "+1",
  phoneNumber: "",
  organisation: "",
  accountType: "",
  selectedFund: "",
  referralSource: "",
  citizenshipCountry: "",
  residenceCountry: "",
  accountStructure: "",
  legalFirstName: "",
  legalLastName: "",
  addressLine1: "",
  city: "",
  state: "",
  zipCode: "",
  dateOfBirth: "",
  initialInvestmentAmount: "",
};

const HushhUserProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const isFooterVisible = useFooterVisibility();
  const [form, setForm] = useState<FormState>(defaultFormState);
  const [userId, setUserId] = useState<string | null>(null);
  const [investorProfile, setInvestorProfile] = useState<InvestorProfile | null>(null);
  const [profileSlug, setProfileSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasOnboardingData, setHasOnboardingData] = useState(false);
  const [isApplePassLoading, setIsApplePassLoading] = useState(false);
  const [isGooglePassLoading, setIsGooglePassLoading] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  // Shadow Investigator state
  const [shadowProfile, setShadowProfile] = useState<ShadowProfile | null>(null);
  const [shadowLoading, setShadowLoading] = useState(false);
  // NWS Score state
  const [nwsResult, setNwsResult] = useState<NWSResult | null>(null);
  const [nwsLoading, setNwsLoading] = useState(true);

  // Field options for AI-generated profile editing
  const FIELD_OPTIONS: Record<string, { value: string; label: string }[]> = {
    primary_goal: [
      { value: "capital_preservation", label: "Capital Preservation" },
      { value: "steady_income", label: "Steady Income" },
      { value: "long_term_growth", label: "Long-term Growth" },
      { value: "aggressive_growth", label: "Aggressive Growth" },
      { value: "speculation", label: "Speculation" },
    ],
    investment_horizon_years: [
      { value: "<3_years", label: "Less than 3 years" },
      { value: "3_5_years", label: "3-5 years" },
      { value: "5_10_years", label: "5-10 years" },
      { value: ">10_years", label: "More than 10 years" },
    ],
    risk_tolerance: [
      { value: "very_low", label: "Very Low" },
      { value: "low", label: "Low" },
      { value: "moderate", label: "Moderate" },
      { value: "high", label: "High" },
      { value: "very_high", label: "Very High" },
    ],
    liquidity_need: [
      { value: "low", label: "Low" },
      { value: "medium", label: "Medium" },
      { value: "high", label: "High" },
    ],
    experience_level: [
      { value: "beginner", label: "Beginner" },
      { value: "intermediate", label: "Intermediate" },
      { value: "advanced", label: "Advanced" },
    ],
    typical_ticket_size: [
      { value: "micro_<1m", label: "Micro (< $1 million)" },
      { value: "small_1m_10m", label: "Small ($1M - $10M)" },
      { value: "medium_10m_50m", label: "Medium ($10M - $50M)" },
      { value: "large_>50m", label: "Large (> $50 million)" },
    ],
    annual_investing_capacity: [
      { value: "<5m", label: "< $5 million" },
      { value: "5m_20m", label: "$5M - $20M" },
      { value: "20m_100m", label: "$20M - $100M" },
      { value: ">100m", label: "> $100 million" },
    ],
    asset_class_preference: [
      { value: "public_equities", label: "Public Equities" },
      { value: "mutual_funds_etfs", label: "Mutual Funds / ETFs" },
      { value: "fixed_income", label: "Fixed Income" },
      { value: "real_estate", label: "Real Estate" },
      { value: "startups_private_equity", label: "Startups / Private Equity" },
      { value: "crypto_digital_assets", label: "Crypto / Digital Assets" },
      { value: "cash_equivalents", label: "Cash Equivalents" },
    ],
    sector_preferences: [
      { value: "technology", label: "Technology" },
      { value: "consumer_internet", label: "Consumer Internet" },
      { value: "fintech", label: "Fintech" },
      { value: "healthcare", label: "Healthcare" },
      { value: "real_estate", label: "Real Estate" },
      { value: "energy_climate", label: "Energy & Climate" },
      { value: "industrial", label: "Industrial" },
      { value: "other", label: "Other" },
    ],
    volatility_reaction: [
      { value: "sell_to_avoid_more_loss", label: "Sell to Avoid More Loss" },
      { value: "hold_and_wait", label: "Hold and Wait" },
      { value: "buy_more_at_lower_prices", label: "Buy More at Lower Prices" },
    ],
    sustainability_preference: [
      { value: "not_important", label: "Not Important" },
      { value: "nice_to_have", label: "Nice to Have" },
      { value: "important", label: "Important" },
      { value: "very_important", label: "Very Important" },
    ],
    engagement_style: [
      { value: "very_passive_just_updates", label: "Very Passive (Just Updates)" },
      { value: "collaborative_discuss_key_decisions", label: "Collaborative (Discuss Key Decisions)" },
      { value: "hands_on_active_trader", label: "Hands-on (Active Trader)" },
    ],
  };

  // Multi-select fields
  const MULTI_SELECT_FIELDS = ["asset_class_preference", "sector_preferences"];

  // Handle updating an AI profile field
  const handleUpdateAIField = (fieldName: string, newValue: string | string[]) => {
    if (!investorProfile) return;
    
    setInvestorProfile({
      ...investorProfile,
      [fieldName]: {
        ...investorProfile[fieldName as keyof InvestorProfile],
        value: newValue,
      },
    });
    setEditingField(null);
  };

  // Handle multi-select toggle
  const handleMultiSelectToggle = (fieldName: string, optionValue: string) => {
    if (!investorProfile) return;
    
    const fieldData = investorProfile[fieldName as keyof InvestorProfile];
    const currentValues = fieldData?.value || [];
    const currentArray: string[] = Array.isArray(currentValues) 
      ? (currentValues as string[]) 
      : [currentValues as string];
    
    let newValues: string[];
    if (currentArray.includes(optionValue)) {
      newValues = currentArray.filter((v) => v !== optionValue);
    } else {
      newValues = [...currentArray, optionValue];
    }
    
    setInvestorProfile({
      ...investorProfile,
      [fieldName]: {
        ...investorProfile[fieldName as keyof InvestorProfile],
        value: newValues,
      },
    });
  };

  // Profile URL for sharing
  const profileUrl = profileSlug ? `https://hushhtech.com/investor/${profileSlug}` : "";
  const { hasCopied, onCopy } = useClipboard(profileUrl);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = resources.config.supabaseClient;
        if (!supabase) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/login");
          return;
        }

        setUserId(user.id);

        // Prefill form with user metadata
        const fullName =
          (user.user_metadata?.full_name as string) ||
          [user.user_metadata?.first_name, user.user_metadata?.last_name]
            .filter(Boolean)
            .join(" ") ||
          "";

        setForm((prev) => ({
          ...prev,
          name: fullName || prev.name,
          email: user.email || prev.email,
          organisation: (user.user_metadata?.company as string) || prev.organisation,
        }));

        // Load existing investor profile
        const { data: existingProfile } = await supabase
          .from("investor_profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (existingProfile) {
          // Always load the slug if it exists (regardless of investor_profile)
          if (existingProfile.slug) {
            setProfileSlug(existingProfile.slug);
          }
          
          // Load AI-generated profile if available
          if (existingProfile.investor_profile) {
            setInvestorProfile(existingProfile.investor_profile);
          }

          // Load shadow profile if available (for data consistency when sharing)
          if (existingProfile.shadow_profile) {
            setShadowProfile(existingProfile.shadow_profile);
            console.log('[Profile] Loaded cached shadow profile from Supabase');
          }
          
          // Prefill form from investor_profiles table
          setForm((prev) => ({
            ...prev,
            name: existingProfile.name || fullName,
            email: existingProfile.email || user.email || "",
            age: existingProfile.age || "",
            phoneCountryCode: existingProfile.phone_country_code || "+1",
            phoneNumber: existingProfile.phone_number || "",
            organisation: existingProfile.organisation || "",
          }));
        }

        // Load onboarding data
        const { data: onboardingData } = await supabase
          .from("onboarding_data")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (onboardingData) {
          // Mark that user has completed onboarding
          setHasOnboardingData(true);
          
          const calculatedAge = onboardingData.date_of_birth
            ? new Date().getFullYear() - new Date(onboardingData.date_of_birth).getFullYear()
            : "";

          // Build name from onboarding data
          const onboardingName = onboardingData.legal_first_name && onboardingData.legal_last_name
            ? `${onboardingData.legal_first_name} ${onboardingData.legal_last_name}`
            : fullName;

          setForm((prev) => ({
            ...prev,
            name: onboardingName || prev.name,
            age: calculatedAge || prev.age,
            // Pre-fill phone number from onboarding (Step 8)
            phoneCountryCode: onboardingData.phone_country_code || prev.phoneCountryCode,
            phoneNumber: onboardingData.phone_number || prev.phoneNumber,
            accountType: onboardingData.account_type || "",
            selectedFund: onboardingData.selected_fund || "",
            referralSource: onboardingData.referral_source || "",
            citizenshipCountry: onboardingData.citizenship_country || "",
            residenceCountry: onboardingData.residence_country || "",
            accountStructure: onboardingData.account_structure || "",
            legalFirstName: onboardingData.legal_first_name || "",
            legalLastName: onboardingData.legal_last_name || "",
            addressLine1: onboardingData.address_line_1 || "",
            city: onboardingData.city || "",
            state: onboardingData.state || "",
            zipCode: onboardingData.zip_code || "",
            dateOfBirth: onboardingData.date_of_birth || "",
            initialInvestmentAmount: onboardingData.initial_investment_amount || "",
          }));

          // Auto-create investor_profiles row if user completed onboarding but doesn't have one
          // This triggers the PostgreSQL slug generation trigger
          if (onboardingData.is_completed && !existingProfile) {
            const userName = onboardingName || user.email?.split('@')[0] || 'Investor';
            const userAge = typeof calculatedAge === 'number' ? calculatedAge : 30;
            
            const { data: newProfile } = await supabase
              .from("investor_profiles")
              .upsert({
                user_id: user.id,
                name: userName,
                email: user.email || "",
                age: userAge,
                phone_country_code: onboardingData.phone_country_code || "+1",
                phone_number: onboardingData.phone_number || "",
                organisation: null,
                investor_profile: null, // No AI profile yet, just basic row for slug
                user_confirmed: false,
              })
              .select("slug")
              .maybeSingle();

            // Set the slug immediately if created
            if (newProfile?.slug) {
              setProfileSlug(newProfile.slug);
            }
          }
        }
        // Load NWS score from user_financial_data (pure math, no API)
        try {
          const { data: financialData } = await supabase
            .from('user_financial_data')
            .select('balance_data, investments_data, identity_match_data, nws_score')
            .eq('user_id', user.id)
            .maybeSingle();

          if (financialData) {
            const nws = calculateNWSFromDB(financialData);
            setNwsResult(nws);
            console.log('[Profile] NWS Score calculated:', nws.score, nws.grade);

            // Persist NWS score if not already saved
            if (!financialData.nws_score || financialData.nws_score !== nws.score) {
              supabase.from('user_financial_data').update({
                nws_score: nws.score,
                nws_breakdown: nws.breakdown,
                nws_grade: nws.grade,
                nws_calculated_at: new Date().toISOString(),
              }).eq('user_id', user.id).then(() => {
                console.log('[Profile] NWS score persisted to DB');
              });
            }
          }
        } catch (nwsErr) {
          console.warn('[Profile] NWS calculation skipped:', nwsErr);
        } finally {
          setNwsLoading(false);
        }
      } catch (error) {
        console.error("Authentication check failed:", error);
        setNwsLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  const handleChange = (key: keyof FormState, value: string) => {
    if (key === "phoneNumber") {
      const digitsOnly = value.replace(/\D/g, '');
      if (digitsOnly.length > 15) return;
    }
    setForm((prev) => ({ ...prev, [key]: key === "age" || key === "initialInvestmentAmount" ? Number(value) || "" : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Only name, email, and age are required - phone is pre-filled from onboarding and optional here
    if (!form.name || !form.email || form.age === "") {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields (Name, Email, Age)",
        status: "warning",
        duration: 4000,
      });
      return;
    }

    setLoading(true);
    setShadowLoading(true);

    try {
      // Call BOTH APIs in parallel using Promise.allSettled
      const [investorResult, shadowResult] = await Promise.allSettled([
        // 1. Existing Investor Profile API
        generateInvestorProfile({
          name: form.name,
          email: form.email,
          age: typeof form.age === "number" ? form.age : Number(form.age),
          phone_country_code: form.phoneCountryCode,
          phone_number: form.phoneNumber,
          organisation: form.organisation || undefined,
        }),
        // 2. NEW Shadow Investigator API (parallel)
        // Calculate age from DOB for higher confidence score
        invokeShadowInvestigator({
          name: form.name,
          email: form.email,
          contact: formatPhoneContact(form.phoneCountryCode, form.phoneNumber),
          country: form.residenceCountry || form.citizenshipCountry || undefined,
          age: typeof form.age === 'number' ? form.age : (form.dateOfBirth 
            ? Math.floor((Date.now() - new Date(form.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
            : undefined),
          dateOfBirth: form.dateOfBirth || undefined,
        }),
      ]);

      // Handle Investor Profile result
      let investorProfileData = null;
      if (investorResult.status === 'fulfilled' && investorResult.value.success && investorResult.value.profile) {
        investorProfileData = investorResult.value.profile;
        setInvestorProfile(investorProfileData);
      } else {
        const error = investorResult.status === 'rejected' 
          ? investorResult.reason 
          : investorResult.value.error;
        console.error('[Profile] Investor profile error:', error);
      }

      // Handle Shadow Investigator result
      let shadowProfileData = null;
      if (shadowResult.status === 'fulfilled' && shadowResult.value.success && shadowResult.value.data) {
        shadowProfileData = shadowResult.value.data.structured;
        setShadowProfile(shadowProfileData);
        console.log('[Profile] Shadow profile loaded:', shadowProfileData.confidence);
      } else {
        const error = shadowResult.status === 'rejected' 
          ? shadowResult.reason 
          : shadowResult.value.error;
        console.error('[Profile] Shadow investigator error:', error);
      }

      // Save BOTH profiles to Supabase for data consistency (shared profile links)
      if (userId && (investorProfileData || shadowProfileData)) {
        const supabase = resources.config.supabaseClient;
        if (supabase) {
          const updatePayload: Record<string, unknown> = {
            user_id: userId,
            name: form.name,
            email: form.email,
            age: typeof form.age === "number" ? form.age : Number(form.age),
            phone_country_code: form.phoneCountryCode,
            phone_number: form.phoneNumber,
            organisation: form.organisation || null,
            user_confirmed: true,
            confirmed_at: new Date().toISOString(),
          };

          // Add investor_profile if available
          if (investorProfileData) {
            updatePayload.investor_profile = investorProfileData;
          }

          // Add shadow_profile if available (for public profile sharing)
          if (shadowProfileData) {
            updatePayload.shadow_profile = shadowProfileData;
          }

          const { data: upsertData } = await supabase
            .from("investor_profiles")
            .upsert(updatePayload)
            .select("slug")
            .maybeSingle();

          // Set profile slug if returned
          if (upsertData?.slug) {
            setProfileSlug(upsertData.slug);
          }
        }
      }

      // REQUIRE BOTH APIs to succeed before showing profiles
      const investorSuccess = investorResult.status === 'fulfilled' && investorResult.value.success;
      const shadowSuccess = shadowResult.status === 'fulfilled' && shadowResult.value.success;

      if (investorSuccess && shadowSuccess) {
        // Both succeeded - show success and enable profile display
        toast({
          title: "Profile Complete",
          description: "Both AI profiles generated successfully",
          status: "success",
          duration: 4000,
        });
      } else if (!investorSuccess && !shadowSuccess) {
        // Both failed
        setInvestorProfile(null);
        setShadowProfile(null);
        throw new Error("Failed to generate profiles. Please try again.");
      } else {
        // Only one succeeded - clear partial results and show warning
        setInvestorProfile(null);
        setShadowProfile(null);
        const failedApi = !investorSuccess ? "Investor Profile" : "Shadow Investigator";
        toast({
          title: "Partial Failure",
          description: `${failedApi} API failed. Please try again for complete results.`,
          status: "warning",
          duration: 5000,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate profile",
        status: "error",
        duration: 5000,
      });
    } finally {
      setLoading(false);
      setShadowLoading(false);
    }
  };

  const handleBack = () => {
    // More robust history check - use browser's history length
    // which is more reliable than React Router's internal state
    if (window.history.length > 2) {
      // There's navigation history, go back
      navigate(-1);
    } else {
      // No meaningful history (only current page or direct access), go to home
      navigate('/');
    }
  };

  const handleSave = () => {
    // Trigger form submit
    const form = document.querySelector('form');
    if (form) form.requestSubmit();
  };

  // Handle Apple Wallet pass download
  const handleAppleWalletPass = async () => {
    if (!form.name) {
      toast({
        title: "Name required",
        description: "Please enter your name to generate a wallet pass",
        status: "warning",
        duration: 3000,
      });
      return;
    }

    setIsApplePassLoading(true);
    try {
      await downloadHushhGoldPass({
        name: form.name,
        email: form.email || null,
        organisation: form.organisation || null,
        slug: profileSlug,
        userId,
        investmentAmount: typeof form.initialInvestmentAmount === "number" ? form.initialInvestmentAmount : null,
      });
      toast({
        title: "Pass Downloaded",
        description: "Your Apple Wallet pass has been downloaded",
        status: "success",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate Apple Wallet pass",
        status: "error",
        duration: 4000,
      });
    } finally {
      setIsApplePassLoading(false);
    }
  };

  // Handle Google Wallet pass
  const handleGoogleWalletPass = async () => {
    if (!form.name) {
      toast({
        title: "Name required",
        description: "Please enter your name to generate a wallet pass",
        status: "warning",
        duration: 3000,
      });
      return;
    }

    setIsGooglePassLoading(true);
    try {
      await launchGoogleWalletPass({
        name: form.name,
        email: form.email || null,
        organisation: form.organisation || null,
        slug: profileSlug,
        userId,
        investmentAmount: typeof form.initialInvestmentAmount === "number" ? form.initialInvestmentAmount : null,
      });
      toast({
        title: "Google Wallet",
        description: "Redirecting to Google Wallet...",
        status: "success",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate Google Wallet pass",
        status: "error",
        duration: 4000,
      });
    } finally {
      setIsGooglePassLoading(false);
    }
  };

  // Social share handlers
  const handleShareWhatsApp = () => {
    if (!profileUrl) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(`Check out my Hushh investor profile: ${profileUrl}`)}`, '_blank');
  };

  const handleShareX = () => {
    if (!profileUrl) return;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out my Hushh investor profile: ${profileUrl}`)}`, '_blank');
  };

  const handleShareEmail = () => {
    if (!profileUrl) return;
    window.location.href = `mailto:?subject=${encodeURIComponent('My Hushh Investor Profile')}&body=${encodeURIComponent(`Check out my investor profile: ${profileUrl}`)}`;
  };

  const handleShareLinkedIn = () => {
    if (!profileUrl) return;
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}`, '_blank');
  };

  const handleOpenProfile = () => {
    if (!profileUrl) return;
    window.open(profileUrl, '_blank');
  };

  // UI styles aligned with investor profile design system
  const inputClassName =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-[#3A63B8] focus:ring-2 focus:ring-[#3A63B8]/20";
  const selectClassName =
    "w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-10 text-sm text-slate-900 outline-none transition-all focus:border-[#3A63B8] focus:ring-2 focus:ring-[#3A63B8]/20";
  const labelClassName =
    "mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500";
  const cardClassName =
    "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5";
  const aiFieldCardTones = [
    "border-blue-100 bg-blue-50/50",
    "border-emerald-100 bg-emerald-50/50",
    "border-purple-100 bg-purple-50/45",
    "border-orange-100 bg-orange-50/45",
    "border-indigo-100 bg-indigo-50/45",
    "border-cyan-100 bg-cyan-50/45",
  ];

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.7) return "High";
    if (confidence >= 0.4) return "Medium";
    return "Low";
  };

  const getConfidenceBadgeClass = (confidence: number) => {
    if (confidence >= 0.7) {
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }
    if (confidence >= 0.4) {
      return "border-amber-200 bg-amber-50 text-amber-700";
    }
    return "border-slate-200 bg-white/80 text-slate-600";
  };

  const shadowConfidenceLabel = shadowProfile ? getConfidenceLabel(shadowProfile.confidence || 0) : "Low";
  const shadowLifestyleTags: string[] = shadowProfile
    ? [
        shadowProfile.diet ? `Diet: ${shadowProfile.diet}` : "",
        ...(shadowProfile.hobbies || []).slice(0, 3),
        ...(shadowProfile.coffeePreferences || []).slice(0, 2).map((pref) => `Coffee: ${pref}`),
        ...(shadowProfile.chaiPreferences || []).slice(0, 1).map((pref) => `Chai: ${pref}`),
        ...(shadowProfile.drinkPreferences || []).slice(0, 2),
      ].filter(Boolean)
    : [];
  const shadowBrandTags: string[] = shadowProfile ? (shadowProfile.brands || []).slice(0, 6) : [];
  const shadowKnownForTags: string[] = shadowProfile ? (shadowProfile.knownFor || []).slice(0, 4) : [];
  const shadowAssociates = shadowProfile ? (shadowProfile.associates || []).slice(0, 5) : [];

  return (
    <div
      className="min-h-screen bg-white text-slate-900"
      style={{
        fontFamily:
          "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, system-ui, sans-serif",
      }}
    >
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col bg-white pb-8 lg:border-x lg:border-slate-100 lg:shadow-[0_16px_60px_rgba(15,23,42,0.08)]">
        <header className="sticky top-24 z-20 flex items-center justify-between border-b border-slate-100 bg-white/95 px-4 py-3 backdrop-blur md:top-28 md:px-6">
          <button
            onClick={handleBack}
            className="-ml-2 rounded-full p-2 text-slate-800 transition-colors hover:bg-slate-100"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold text-slate-900">Investor Profile</h1>
          <button
            onClick={handleSave}
            className="rounded px-2 py-1 text-base font-semibold text-[#3A63B8] transition-colors hover:bg-blue-50"
          >
            Save
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex-1 space-y-6 px-4 pb-44 pt-4 sm:px-6 lg:px-8 lg:pb-52">
          <section className="relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-blue-50 to-indigo-50 px-6 py-6">
            <div className="pointer-events-none absolute -right-12 -top-14 h-44 w-44 rounded-full bg-[#3A63B8]/10 blur-2xl" />
            <div className="pointer-events-none absolute -left-10 -bottom-14 h-36 w-36 rounded-full bg-[#1A365D]/10 blur-2xl" />
            <div className="relative z-10 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-3 flex items-center">
                  <span className="rounded-full border border-[#3A63B8]/20 bg-[#3A63B8]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#3A63B8]">
                    Premium Member
                  </span>
                </div>
                <h2 className="mb-1.5 text-2xl font-bold tracking-tight text-slate-900">
                  Welcome back, {form.name?.split(' ')[0] || 'Alex'}
                </h2>
                <p className="max-w-2xl text-sm leading-relaxed text-slate-500">
                  Complete your profile to unlock personalized investment insights tailored to your financial goals.
                </p>
              </div>
              {/* NWS Score Badge */}
              <div className="ml-4 shrink-0">
                <NWSScoreBadge result={nwsResult} loading={nwsLoading} size="sm" />
              </div>
            </div>
          </section>

          {/* Your Investor Profile - Share Section */}
          {profileSlug && (
            <section className="rounded-2xl bg-gradient-to-br from-[#3A63B8] to-[#1A365D] p-5 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-white" />
                  <h3 className="text-lg font-semibold text-white">Your Investor Profile</h3>
                </div>
                <button
                  type="button"
                  onClick={handleOpenProfile}
                  className="rounded-lg bg-white/20 p-2 transition-colors hover:bg-white/30"
                  aria-label="Open profile"
                >
                  <ExternalLink className="w-4 h-4 text-white" />
                </button>
              </div>
              <p className="mb-4 text-sm text-white/90">
                Share this link to let others view your profile
              </p>

              {/* Profile URL Display */}
              <div className="mb-4 flex items-center gap-3 rounded-xl bg-white p-3">
                <Link className="w-5 h-5 flex-shrink-0 text-[#3A63B8]" />
                <span className="flex-1 truncate text-sm text-slate-700">
                  {profileUrl}
                </span>
                <button
                  type="button"
                  onClick={onCopy}
                  className="flex-shrink-0 rounded-lg p-2 transition-colors hover:bg-slate-100"
                  aria-label="Copy link"
                >
                  {hasCopied ? (
                    <Check className="w-5 h-5 text-green-500" />
                  ) : (
                    <Copy className="w-5 h-5 text-gray-400" />
                  )}
                </button>
              </div>

              {/* Share via Social */}
              <p className="mb-3 text-sm text-white/90">Share via</p>
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
                  aria-label="Share on WhatsApp"
                >
                  <FaWhatsapp className="w-5 h-5 text-white" />
                </button>
                <button
                  type="button"
                  onClick={handleShareX}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
                  aria-label="Share on X"
                >
                  <FaXTwitter className="w-5 h-5 text-white" />
                </button>
                <button
                  type="button"
                  onClick={handleShareEmail}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
                  aria-label="Share via Email"
                >
                  <HiMail className="w-5 h-5 text-white" />
                </button>
                <button
                  type="button"
                  onClick={handleShareLinkedIn}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
                  aria-label="Share on LinkedIn"
                >
                  <FaLinkedin className="w-5 h-5 text-white" />
                </button>
                <button
                  type="button"
                  onClick={onCopy}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
                  aria-label="Copy link"
                >
                  {hasCopied ? (
                    <Check className="w-5 h-5 text-white" />
                  ) : (
                    <Copy className="w-5 h-5 text-white" />
                  )}
                </button>
              </div>

              {/* Wallet Pass Buttons */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleAppleWalletPass}
                  disabled={isApplePassLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 font-semibold text-slate-900 transition-colors hover:bg-gray-50 disabled:opacity-70"
                >
                  <FaApple className="w-5 h-5" />
                  {isApplePassLoading ? "Generating..." : "Add to Apple Wallet"}
                </button>
                <button
                  type="button"
                  onClick={handleGoogleWalletPass}
                  disabled={isGooglePassLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-900 transition-colors hover:bg-gray-50 disabled:opacity-70"
                >
                  <SiGooglepay className="w-5 h-5" />
                  {isGooglePassLoading ? "Generating..." : "Add to Google Wallet"}
                </button>
              </div>
            </section>
          )}

          {/* Section Title */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Your Hushh Profile</h2>
            <p className="text-sm text-slate-500">
              Review and update your details to keep your investor profile complete.
            </p>
            <div className="h-px w-full bg-slate-200" />
          </div>

          {/* Personal Information Section */}
          <section className={cardClassName}>
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#3A63B8]">
                <User className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Personal Information</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelClassName}>
                  Full Name <span className="text-[#3A63B8]">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="e.g. Alex Smith"
                  className={inputClassName}
                />
              </div>
              <div>
                <label className={labelClassName}>
                  Email <span className="text-[#3A63B8]">*</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="alex@example.com"
                  className={inputClassName}
                />
              </div>
              <div>
                <label className={labelClassName}>
                  Age <span className="text-[#3A63B8]">*</span>
                </label>
                <input
                  type="number"
                  value={form.age}
                  onChange={(e) => handleChange("age", e.target.value)}
                  placeholder="e.g. 34"
                  className={inputClassName}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className={labelClassName}>Code</label>
                  <div className="relative">
                    <select 
                      value={form.phoneCountryCode}
                      onChange={(e) => handleChange("phoneCountryCode", e.target.value)}
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-8 text-sm text-slate-900 outline-none transition-all focus:border-[#3A63B8] focus:ring-2 focus:ring-[#3A63B8]/20"
                    >
                      <option value="+1">+1</option>
                      <option value="+44">+44</option>
                      <option value="+91">+91</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                  </div>
                </div>
                <div className="col-span-2">
                  <label className={labelClassName}>Phone Number</label>
                  <input
                    type="tel"
                    value={form.phoneNumber}
                    onChange={(e) => handleChange("phoneNumber", e.target.value)}
                    placeholder="Pre-filled from onboarding"
                    className={inputClassName}
                  />
                </div>
              </div>
              <div>
                <label className={labelClassName}>Organisation (Optional)</label>
                <input
                  type="text"
                  value={form.organisation}
                  onChange={(e) => handleChange("organisation", e.target.value)}
                  placeholder="Company Name"
                  className={inputClassName}
                />
              </div>
            </div>
          </section>

          {/* Investment Profile Section */}
          <section className={cardClassName}>
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <TrendingUp className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Investment Profile</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelClassName}>Account Type</label>
                <div className="relative">
                  <select 
                    value={form.accountType}
                    onChange={(e) => handleChange("accountType", e.target.value)}
                    className={selectClassName}
                  >
                    <option value="" disabled>Select account type</option>
                    <option value="individual">Individual</option>
                    <option value="joint">Joint</option>
                    <option value="retirement">Retirement (IRA)</option>
                    <option value="trust">Trust</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className={labelClassName}>Account Structure</label>
                <div className="relative">
                  <select 
                    value={form.accountStructure}
                    onChange={(e) => handleChange("accountStructure", e.target.value)}
                    className={selectClassName}
                  >
                    <option value="" disabled>Select structure</option>
                    <option value="discretionary">Discretionary</option>
                    <option value="non-discretionary">Non-Discretionary</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className={labelClassName}>Selected Fund</label>
                <div className="relative">
                  <select 
                    value={form.selectedFund}
                    onChange={(e) => handleChange("selectedFund", e.target.value)}
                    className={selectClassName}
                  >
                    <option value="" disabled>Choose a fund</option>
                    <option value="hushh_fund_a">Hushh Growth Fund A</option>
                    <option value="hushh_fund_b">Hushh Balanced Fund B</option>
                    <option value="hushh_fund_c">Hushh Secure Yield C</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className={labelClassName}>Initial Investment Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B7280]">$</span>
                  <input
                    type="number"
                    value={form.initialInvestmentAmount}
                    onChange={(e) => handleChange("initialInvestmentAmount", e.target.value)}
                    placeholder="5000000"
                    className={`${inputClassName} pl-8`}
                  />
                </div>
              </div>
              <div>
                <label className={labelClassName}>Referral Source</label>
                <div className="relative">
                  <select 
                    value={form.referralSource}
                    onChange={(e) => handleChange("referralSource", e.target.value)}
                    className={selectClassName}
                  >
                    <option value="" disabled>How did you hear about us?</option>
                    <option value="social_media">Social Media</option>
                    <option value="friend_family">Friend/Family</option>
                    <option value="financial_advisor">Financial Advisor</option>
                    <option value="news_article">News Article</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                </div>
              </div>
            </div>
          </section>

          {/* Legal & Residential Section */}
          <section className={cardClassName}>
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Shield className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Legal &amp; Residential</h3>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClassName}>Legal First Name</label>
                  <input
                    type="text"
                    value={form.legalFirstName}
                    onChange={(e) => handleChange("legalFirstName", e.target.value)}
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label className={labelClassName}>Legal Last Name</label>
                  <input
                    type="text"
                    value={form.legalLastName}
                    onChange={(e) => handleChange("legalLastName", e.target.value)}
                    className={inputClassName}
                  />
                </div>
              </div>
              <div>
                <label className={labelClassName}>Date of Birth</label>
                <div className="relative">
                  <input
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(e) => handleChange("dateOfBirth", e.target.value)}
                    className={inputClassName}
                  />
                  <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className={labelClassName}>Citizenship Country</label>
                <div className="relative">
                  <select 
                    value={form.citizenshipCountry}
                    onChange={(e) => handleChange("citizenshipCountry", e.target.value)}
                    className={selectClassName}
                  >
                    <option value="" disabled>Select country</option>
                    {COUNTRIES.map((country) => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className={labelClassName}>Residence Country</label>
                <div className="relative">
                  <select 
                    value={form.residenceCountry}
                    onChange={(e) => handleChange("residenceCountry", e.target.value)}
                    className={selectClassName}
                  >
                    <option value="" disabled>Select country</option>
                    {COUNTRIES.map((country) => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className={labelClassName}>Address Line 1</label>
                <input
                  type="text"
                  value={form.addressLine1}
                  onChange={(e) => handleChange("addressLine1", e.target.value)}
                  placeholder="Street address"
                  className={inputClassName}
                />
              </div>
              <div>
                <label className={labelClassName}>City</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                  className={inputClassName}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClassName}>State</label>
                  <input
                    type="text"
                    value={form.state}
                    onChange={(e) => handleChange("state", e.target.value)}
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label className={labelClassName}>Zip Code</label>
                  <input
                    type="text"
                    value={form.zipCode}
                    onChange={(e) => handleChange("zipCode", e.target.value)}
                    className={inputClassName}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* AI-Detected Preferences Section */}
          {userId && (
            <AIDetectedPreferences 
              userId={userId}
              onSave={(preferences) => {
                console.log('[Profile] AI preferences updated:', Object.keys(preferences).length);
                toast({
                  title: "Preferences Saved",
                  description: "Your preferences have been updated",
                  status: "success",
                  duration: 3000,
                });
              }}
            />
          )}

          {/* AI Generated Investor Profile Section */}
          {investorProfile && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                    <Brain className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">AI-Generated Investor Profile</h3>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/investor-profile')}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-[#3A63B8] transition-colors hover:bg-blue-50"
                  aria-label="Edit profile"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
              </div>

              <p className="mb-5 text-sm leading-snug text-slate-500">
                Based on your information, our AI has analyzed your investment preferences:
              </p>

              <div className="space-y-4">
                {Object.entries(investorProfile).map(([fieldName, fieldData]: [string, any], index) => {
                  const label = FIELD_LABELS[fieldName as keyof typeof FIELD_LABELS] || fieldName;
                  const valueText = Array.isArray(fieldData.value)
                    ? fieldData.value
                        .map((v: string) => VALUE_LABELS[v as keyof typeof VALUE_LABELS] || v)
                        .join(', ')
                    : VALUE_LABELS[fieldData.value as keyof typeof VALUE_LABELS] || fieldData.value || 'Not available';
                  const confidence = fieldData.confidence || 0;
                  const confidenceLabel = getConfidenceLabel(confidence);
                  const confidenceBadgeClass = getConfidenceBadgeClass(confidence);
                  const toneClass = aiFieldCardTones[index % aiFieldCardTones.length];
                  const isEditing = editingField === fieldName;
                  const isMultiSelect = MULTI_SELECT_FIELDS.includes(fieldName);
                  const fieldOptions = FIELD_OPTIONS[fieldName] || [];

                  const getIcon = () => {
                    switch (fieldName) {
                      case 'primary_goal':
                        return <Target className="w-5 h-5 text-[#3A63B8]" />;
                      case 'investment_horizon_years':
                        return <Clock className="w-5 h-5 text-[#3A63B8]" />;
                      case 'risk_tolerance':
                        return <Gauge className="w-5 h-5 text-[#3A63B8]" />;
                      case 'liquidity_need':
                        return <Droplets className="w-5 h-5 text-[#3A63B8]" />;
                      case 'experience_level':
                        return <Briefcase className="w-5 h-5 text-[#3A63B8]" />;
                      case 'asset_class_preference':
                        return <Layers className="w-5 h-5 text-[#3A63B8]" />;
                      case 'typical_ticket_size':
                        return <Zap className="w-5 h-5 text-[#3A63B8]" />;
                      case 'engagement_style':
                        return <Activity className="w-5 h-5 text-[#3A63B8]" />;
                      default:
                        return <TrendingUp className="w-5 h-5 text-[#3A63B8]" />;
                    }
                  };

                  const currentValues: string[] = Array.isArray(fieldData.value)
                    ? fieldData.value
                    : [fieldData.value];

                  return (
                    <div key={fieldName} className={`rounded-xl border p-4 shadow-sm ${toneClass}`}>
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-2.5">
                          {getIcon()}
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-medium ${confidenceBadgeClass}`}>
                            Confidence: {confidenceLabel}
                          </span>
                          {!isEditing && (
                            <button
                              type="button"
                              onClick={() => setEditingField(fieldName)}
                              className="rounded p-1 text-[#6B7280] transition-colors hover:bg-blue-50 hover:text-[#3A63B8]"
                              aria-label={`Edit ${label}`}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="mt-2">
                          {isMultiSelect ? (
                            <div className="space-y-2">
                              {fieldOptions.map((option) => (
                                <label key={option.value} className="flex cursor-pointer items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={currentValues.includes(option.value)}
                                    onChange={() => handleMultiSelectToggle(fieldName, option.value)}
                                    className="h-4 w-4 rounded border-gray-300 text-[#3A63B8] focus:ring-[#3A63B8]"
                                  />
                                  <span className="text-sm text-[#374151]">{option.label}</span>
                                </label>
                              ))}
                              <button
                                type="button"
                                onClick={() => setEditingField(null)}
                                className="mt-2 rounded-lg bg-[#3A63B8] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#2f539f]"
                              >
                                Done
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="relative">
                                <select
                                  value={fieldData.value}
                                  onChange={(e) => handleUpdateAIField(fieldName, e.target.value)}
                                  className="w-full appearance-none rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 pr-8 text-sm text-[#111827] outline-none focus:border-[#3A63B8] focus:ring-2 focus:ring-[#3A63B8]/20"
                                >
                                  {fieldOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                              </div>
                              <button
                                type="button"
                                onClick={() => setEditingField(null)}
                                className="px-3 py-1.5 text-sm font-medium text-[#6B7280] transition-colors hover:text-[#111827]"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                          <p className="mb-2 text-base font-bold text-slate-900">{valueText}</p>
                          {fieldData.rationale && (
                            <div className="rounded-lg border border-white/60 bg-white/65 p-3">
                              <p className="text-sm text-slate-600">
                                <span className="font-semibold text-[#3A63B8]">AI insight:</span> {fieldData.rationale}
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Shadow Investigator Deep Profile Section */}
          {shadowProfile && (
            <section className="group relative overflow-hidden rounded-[2rem] border border-indigo-100/80 bg-white/70 p-6 shadow-[0_15px_40px_rgba(31,38,135,0.1)] backdrop-blur-xl">
              <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-gradient-to-br from-indigo-400/20 to-blue-400/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 -left-16 h-72 w-72 rounded-full bg-cyan-300/10 blur-3xl" />

              <div className="relative z-10 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/50 bg-white text-[#3A63B8] shadow-lg">
                    <Brain className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold leading-tight text-slate-900">Deep Profile Intelligence</h3>
                    <p className="text-xs font-bold uppercase tracking-wide text-[#3A63B8]/90">
                      Powered by Shadow Investigator AI
                    </p>
                  </div>
                </div>
                <div className="rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-[11px] font-semibold text-slate-700 shadow-sm">
                  {Math.round((shadowProfile.confidence || 0) * 100)}% Confidence
                </div>
              </div>

              <div className="relative z-10 mt-6 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700">Identity &amp; Demographics</h4>
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                      <Check className="h-3.5 w-3.5" />
                      {shadowConfidenceLabel}
                    </span>
                  </div>

                  <div className="flex flex-col items-center gap-4">
                    <div className="w-full max-w-[320px] rounded-2xl border border-indigo-100 bg-white/70 p-5 text-center shadow-sm">
                      <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-100 to-blue-100 text-indigo-600">
                        <User className="h-5 w-5" />
                      </div>
                      <span className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-slate-500">Age</span>
                      <p className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 bg-clip-text text-4xl font-bold text-transparent">
                        {shadowProfile.age || '--'}
                      </p>
                      {shadowProfile.ageContext && (
                        <div className="mt-3 border-t border-indigo-100 pt-3">
                          <p className="text-[12px] font-medium leading-relaxed text-slate-600">{shadowProfile.ageContext}</p>
                        </div>
                      )}
                    </div>

                    <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-slate-200 bg-white/60 p-3 text-center shadow-sm">
                        <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                          <Briefcase className="h-4 w-4" />
                        </div>
                        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Occupation</span>
                        <p className="text-[12px] font-bold text-slate-800">{shadowProfile.occupation || 'Not available'}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white/60 p-3 text-center shadow-sm">
                        <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                          <Globe className="h-4 w-4" />
                        </div>
                        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Nationality</span>
                        <p className="text-[13px] font-bold text-slate-800">{shadowProfile.nationality || 'Not available'}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white/60 p-3 text-center shadow-sm">
                        <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-pink-50 text-pink-600">
                          <Heart className="h-4 w-4" />
                        </div>
                        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Status</span>
                        <p className="text-[13px] font-bold text-slate-800">{shadowProfile.maritalStatus || 'Not available'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {shadowProfile.netWorthScore > 0 && (
                  <div className="rounded-xl border-l-4 border-l-emerald-500 bg-white/65 p-5 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="text-sm font-bold uppercase tracking-wide text-slate-700">Wealth Analysis</h4>
                      <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                        Score: {shadowProfile.netWorthScore}/100
                      </span>
                    </div>
                    <div className="relative pt-1">
                      <div className="mb-2 flex justify-between px-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        <span>Low</span>
                        <span>High</span>
                        <span className="text-emerald-600">Ultra High</span>
                      </div>
                      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200 shadow-inner">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all"
                          style={{ width: `${Math.min(Math.max(shadowProfile.netWorthScore, 0), 100)}%` }}
                        />
                      </div>
                    </div>
                    {shadowProfile.netWorthContext && (
                      <p className="mt-3 rounded-lg bg-white/70 p-2 text-xs font-medium leading-relaxed text-slate-600">
                        <span className="font-bold text-emerald-700">Insight:</span> {shadowProfile.netWorthContext}
                      </p>
                    )}
                  </div>
                )}

                {shadowLifestyleTags.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="pl-1 text-xs font-bold uppercase tracking-widest text-slate-500">Lifestyle &amp; Preferences</h4>
                    <div className="flex flex-wrap gap-2.5">
                      {shadowLifestyleTags.map((tag, idx) => (
                        <span
                          key={`${tag}-${idx}`}
                          className="rounded-2xl border border-white/60 bg-white/60 px-4 py-2 text-xs font-bold text-slate-800 shadow-sm backdrop-blur-sm transition-transform hover:scale-[1.03]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {shadowBrandTags.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="pl-1 text-xs font-bold uppercase tracking-widest text-slate-500">Brands &amp; Interests</h4>
                    <div className="flex flex-wrap gap-2">
                      {shadowBrandTags.map((brand, idx) => (
                        <span
                          key={`${brand}-${idx}`}
                          className="rounded-xl border border-white/60 bg-white/60 px-4 py-2 text-xs font-bold text-slate-700 shadow-sm"
                        >
                          {brand}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {shadowKnownForTags.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="pl-1 text-xs font-bold uppercase tracking-widest text-slate-500">Known For</h4>
                    <div className="flex flex-wrap gap-2">
                      {shadowKnownForTags.map((item, idx) => (
                        <span
                          key={`${item}-${idx}`}
                          className="rounded-xl border border-white/60 bg-white/60 px-4 py-2 text-xs font-bold text-slate-700 shadow-sm"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {shadowAssociates.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-white/60 p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-indigo-500" />
                        <h4 className="text-xs font-bold uppercase tracking-wide text-slate-700">Key Network</h4>
                      </div>
                      <span className="rounded-md bg-white/70 px-2 py-0.5 text-[10px] text-slate-500">High Value Connections</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex -space-x-3">
                        {shadowAssociates.slice(0, 3).map((associate, idx) => {
                          const initials = associate.name
                            .split(' ')
                            .filter(Boolean)
                            .map((part) => part.charAt(0))
                            .join('')
                            .slice(0, 3)
                            .toUpperCase();

                          return (
                            <div
                              key={`${associate.name}-${idx}`}
                              className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-blue-600 to-indigo-700 text-[10px] font-bold text-white shadow-md"
                            >
                              {initials || 'N/A'}
                            </div>
                          );
                        })}
                        {shadowProfile.associates.length > 3 && (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[10px] font-bold text-slate-500 shadow-sm">
                            +{shadowProfile.associates.length - 3}
                          </div>
                        )}
                      </div>
                      <p className="text-sm font-bold leading-tight text-slate-800">
                        Strategic contacts and partners
                        <span className="block text-xs font-normal text-slate-500">Verified from public network signals</span>
                      </p>
                    </div>
                  </div>
                )}

                {shadowProfile.news && shadowProfile.news.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-white/60 p-4 shadow-sm">
                    <div className="mb-3 flex items-center gap-2">
                      <Newspaper className="h-4 w-4 text-indigo-500" />
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-700">Recent News &amp; Media</span>
                    </div>
                    <div className="space-y-2">
                      {shadowProfile.news.slice(0, 3).map((news, idx) => (
                        <div key={idx} className="rounded-lg border border-slate-200 bg-white/70 p-3">
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-500">{news.source}</span>
                            <span className="text-xs text-slate-400">{news.date}</span>
                          </div>
                          <p className="text-sm font-semibold text-slate-800">{news.title}</p>
                          {news.summary && <p className="mt-1 text-xs text-slate-500">{news.summary}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {shadowProfile.socialMedia && shadowProfile.socialMedia.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-white/60 p-4 shadow-sm">
                    <div className="mb-3 flex items-center gap-2">
                      <Globe className="h-4 w-4 text-cyan-500" />
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-700">Social Profiles</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {shadowProfile.socialMedia.map((social, idx) => (
                        <a
                          key={idx}
                          href={social.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
                        >
                          {social.platform}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Shadow Profile Loading State */}
          {shadowLoading && !shadowProfile && (
            <section className="relative overflow-hidden rounded-[2rem] border border-indigo-100/80 bg-white/70 p-6 shadow-[0_15px_40px_rgba(31,38,135,0.1)] backdrop-blur-xl">
              <div className="pointer-events-none absolute -right-14 -top-14 h-56 w-56 rounded-full bg-indigo-300/20 blur-3xl" />
              <div className="relative z-10">
                <div className="mb-4 flex items-center gap-3">
                  <div className="animate-spin text-[#3A63B8]">
                    <Search className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Deep Profile Search</h3>
                    <p className="text-xs text-slate-500">Analyzing public data sources...</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="h-4 animate-pulse rounded bg-slate-200/80" />
                  <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200/80" />
                  <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200/80" />
                </div>
              </div>
            </section>
          )}
        </form>

        {/* Fixed Footer - Hidden when main footer is visible */}
        {!isFooterVisible && (
          <div 
            className="fixed bottom-0 left-1/2 z-20 w-full max-w-6xl -translate-x-1/2 border-t border-slate-200 bg-white/95 px-4 pt-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] shadow-[0_-8px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:px-6 sm:pt-4 sm:pb-[calc(1rem+env(safe-area-inset-bottom,0px))] lg:px-8"
            data-onboarding-footer
          >
            <button
              type="submit"
              onClick={handleSave}
              disabled={loading}
              className="w-full rounded-xl bg-[#3A63B8] px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition-all duration-200 active:scale-[0.98] hover:bg-[#2f539f] disabled:cursor-not-allowed disabled:opacity-50 sm:px-6 sm:py-3.5 sm:text-base"
            >
              {loading 
                ? "Generating..." 
                : investorProfile 
                  ? "Update Profile" 
                  : hasOnboardingData 
                    ? "Enhance with AI" 
                    : "Generate Investor Profile"
              }
            </button>
            <p className="mt-2 px-1 text-center text-[11px] leading-snug text-slate-500 sm:mt-3 sm:px-2 sm:text-xs">
              {investorProfile 
                ? "Update your AI-generated investor profile."
                : hasOnboardingData
                  ? "Generate an AI-powered profile from your data."
                  : "These details personalise your investor profile."
              }
            </p>
            
            {/* Go to Home Button */}
            <button
              type="button"
              onClick={() => navigate('/')}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-2 text-sm font-medium text-[#3A63B8] transition-colors hover:bg-blue-50 sm:mt-3 sm:py-2.5"
            >
              <Home className="w-4 h-4" />
              Go to Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default HushhUserProfilePage;
