/**
 * Profile Page — UI / Presentation
 * Tailwind design matching home, fund-a, community pages.
 * All logic in logic.ts via useProfileLogic().
 */
import React from 'react';
import HushhTechBackHeader from '../../components/hushh-tech-back-header/HushhTechBackHeader';
import HushhTechCta, { HushhTechCtaVariant } from '../../components/hushh-tech-cta/HushhTechCta';
import HushhLogo from '../../components/images/Hushhogo.png';
import { useProfileLogic } from './logic';

/* ── section label (reusable) ── */
const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10px] tracking-[0.18em] uppercase text-neutral-400 font-medium">
    {children}
  </p>
);

const ProfilePage: React.FC = () => {
  const {
    onboardingStatus,
    primaryCTA,
    handleDiscoverFundA,
  } = useProfileLogic();

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* header — back arrow to go home */}
      <HushhTechBackHeader />

      {/* scrollable content */}
      <main className="flex-1 flex flex-col items-center justify-center px-5 py-2 sm:px-6 md:px-8">
        <div className="w-full max-w-[440px] flex flex-col items-center gap-8">

          {/* pill badge */}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-4 py-1">
            <span className="material-symbols-rounded text-[16px] text-neutral-500">person</span>
            <span className="text-[11px] tracking-[0.14em] uppercase text-neutral-500 font-medium">
              profile
            </span>
          </span>

          {/* logo */}
          <img
            src={HushhLogo}
            alt="hushh logo"
            className="h-[100px] md:h-[120px] object-contain"
          />

          {/* headline */}
          <div className="text-center space-y-3">
            <h1
              className="text-[32px] md:text-[38px] leading-[1.08] tracking-tight text-neutral-900"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              investing in the future.
            </h1>
            <p className="text-[15px] md:text-[17px] leading-relaxed text-neutral-500 max-w-[360px] mx-auto">
              the ai-powered berkshire hathaway. we combine ai and human expertise to invest in exceptional businesses for long-term value creation.
            </p>
          </div>

          {/* action buttons */}
          <div className="w-full space-y-3 mt-2">
            <HushhTechCta
              onClick={primaryCTA.action}
              variant={HushhTechCtaVariant.BLACK}
              disabled={onboardingStatus.loading}
            >
              {onboardingStatus.loading ? 'loading...' : primaryCTA.text}
            </HushhTechCta>
            <HushhTechCta
              onClick={handleDiscoverFundA}
              variant={HushhTechCtaVariant.WHITE}
            >
              discover fund a
            </HushhTechCta>
          </div>

          {/* trust indicators */}
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <SectionLabel>sec registered</SectionLabel>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-rounded text-[14px] text-neutral-400">lock</span>
              <SectionLabel>bank level security</SectionLabel>
            </div>
          </div>

          {/* tagline */}
          <p className="text-[12px] text-neutral-400 tracking-wide text-center mt-2">
            secure. private. ai-powered.
          </p>
        </div>
      </main>

    </div>
  );
};

export default ProfilePage;
