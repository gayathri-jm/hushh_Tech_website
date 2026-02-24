/**
 * Verify Identity — Premium Hushh design
 * Stripe Identity verification flow.
 */
import { useVerifyIdentityLogic } from './logic';
import HushhTechBackHeader from '../../../components/hushh-tech-back-header/HushhTechBackHeader';
import HushhTechCta, { HushhTechCtaVariant } from '../../../components/hushh-tech-cta/HushhTechCta';

function VerifyIdentityPage() {
  const {
    loading,
    startingVerification,
    onboardingData,
    verificationStatus,
    startVerification,
    skipVerification,
    goBack,
  } = useVerifyIdentityLogic();

  if (loading) {
    return (
      <div className="bg-white min-h-screen flex flex-col antialiased selection:bg-black selection:text-white">
        <HushhTechBackHeader onBackClick={goBack} rightLabel="FAQs" />
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center">
            <div className="w-14 h-14 mx-auto mb-6 rounded-full border-4 border-gray-200 border-t-black animate-spin" />
            <p className="text-sm text-gray-500 font-medium lowercase">loading...</p>
          </div>
        </div>
      </div>
    );
  }

  const items = [
    {
      icon: 'badge',
      label: 'government id',
      desc: 'passport, driver\'s license, or id card',
      verified: verificationStatus.document_verified,
    },
    {
      icon: 'photo_camera',
      label: 'selfie verification',
      desc: 'live selfie matching your id photo',
      verified: verificationStatus.selfie_verified,
    },
    {
      icon: 'mail',
      label: 'email',
      desc: onboardingData?.email?.toLowerCase() || 'your email address',
      verified: verificationStatus.email_verified,
    },
    {
      icon: 'phone_iphone',
      label: 'phone number',
      desc: onboardingData?.phone_country_code && onboardingData?.phone_number
        ? `${onboardingData.phone_country_code} ${onboardingData.phone_number}`
        : 'your phone number',
      verified: verificationStatus.phone_verified,
    },
  ];

  return (
    <div className="bg-white text-gray-900 min-h-screen antialiased flex flex-col selection:bg-black selection:text-white">
      <HushhTechBackHeader onBackClick={goBack} rightLabel="FAQs" />

      <main className="px-6 flex-grow max-w-md mx-auto w-full pb-16">
        {/* Title */}
        <section className="py-8">
          <h3 className="text-[11px] tracking-wide text-gray-500 lowercase mb-4 font-semibold">identity</h3>
          <h1 className="text-[2.75rem] leading-[1.1] font-normal text-black tracking-tight lowercase" style={{ fontFamily: "'Playfair Display', serif" }}>
            verify your
            <br />
            <span className="text-gray-400 italic font-normal">identity</span>
          </h1>
          <p className="text-sm text-gray-500 mt-4 leading-relaxed lowercase font-medium">
            complete a quick verification to secure your account and unlock all features.
          </p>
        </section>

        {/* Status alerts */}
        {verificationStatus.status === 'processing' && (
          <div className="mb-6 flex items-center gap-3 py-4 px-1 border-b border-blue-100">
            <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-blue-600 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>sync</span>
            </div>
            <p className="text-sm font-medium text-blue-700 lowercase">verification in progress. this usually takes a few minutes.</p>
          </div>
        )}
        {verificationStatus.status === 'requires_input' && (
          <div className="mb-6 flex items-center gap-3 py-4 px-1 border-b border-yellow-100">
            <div className="w-10 h-10 rounded-full bg-yellow-50 border border-yellow-200 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-yellow-600 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
            </div>
            <p className="text-sm font-medium text-yellow-700 lowercase">additional information required. please complete the verification.</p>
          </div>
        )}
        {verificationStatus.status === 'failed' && (
          <div className="mb-6 flex items-center gap-3 py-4 px-1 border-b border-red-100">
            <div className="w-10 h-10 rounded-full bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-red-500 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
            </div>
            <p className="text-sm font-medium text-red-700 lowercase">verification failed. please try again or contact support.</p>
          </div>
        )}

        {/* What will be verified */}
        <section className="space-y-0 mb-6">
          <div className="py-4">
            <h3 className="text-[11px] tracking-wide text-gray-500 lowercase font-semibold">what will be verified</h3>
          </div>
          {items.map((item) => (
            <div key={item.icon} className="py-5 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${item.verified ? 'bg-green-50 border border-green-200' : 'bg-gray-100'}`}>
                  <span className={`material-symbols-outlined text-lg ${item.verified ? 'text-green-600' : 'text-gray-700'}`} style={{ fontVariationSettings: "'FILL' 1, 'wght' 400" }}>{item.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-gray-900 lowercase block">{item.label}</span>
                  <span className="text-xs text-gray-500 font-medium lowercase">{item.desc}</span>
                </div>
                {item.verified && (
                  <span className="text-[10px] font-semibold text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded lowercase">verified</span>
                )}
              </div>
            </div>
          ))}
        </section>

        {/* Security note */}
        <div className="flex items-start gap-3 py-4 px-1 mb-6">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-gray-500 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-900 lowercase block">secure & private</span>
            <p className="text-xs text-gray-500 leading-relaxed lowercase font-medium mt-0.5">
              your documents are encrypted and processed securely. we never store raw document images.
            </p>
          </div>
        </div>

        {/* CTAs */}
        <section className="space-y-3 pb-6">
          <HushhTechCta variant={HushhTechCtaVariant.BLACK} onClick={startVerification} disabled={startingVerification}>
            {startingVerification ? 'Starting...' : verificationStatus.status === 'requires_input' ? 'Continue Verification' : 'Start Verification'}
          </HushhTechCta>
          <HushhTechCta variant={HushhTechCtaVariant.WHITE} onClick={skipVerification}>
            I'll Do This Later
          </HushhTechCta>
        </section>

        {/* Time estimate + trust */}
        <section className="flex flex-col items-center text-center gap-1 pb-8">
          <span className="text-[10px] text-gray-500 lowercase font-medium">usually takes 2-3 minutes to complete</span>
          <div className="flex items-center gap-1 mt-2">
            <span className="material-symbols-outlined text-[12px] text-gray-600">lock</span>
            <span className="text-[10px] text-gray-600 tracking-wide uppercase font-medium">stripe identity</span>
          </div>
        </section>
      </main>
    </div>
  );
}

export default VerifyIdentityPage;
