/**
 * Profile Page — UI / Presentation (Revamped)
 * Apple iOS colors, Playfair Display headings, proper English capitalization.
 * Matches Home + Fund A + Community design language.
 * Logic stays in logic.ts via useProfileLogic().
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import HushhTechBackHeader from '../../components/hushh-tech-back-header/HushhTechBackHeader';
import HushhTechCta, { HushhTechCtaVariant } from '../../components/hushh-tech-cta/HushhTechCta';
import HushhTechFooter, { HushhFooterTab } from '../../components/hushh-tech-footer/HushhTechFooter';
import HushhLogo from '../../components/images/Hushhogo.png';
import { useProfileLogic } from './logic';

/* ── Playfair heading style ── */
const playfair = { fontFamily: "'Playfair Display', serif" };

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const {
    onboardingStatus,
    primaryCTA,
    handleDiscoverFundA,
  } = useProfileLogic();

  return (
    <div className="flex flex-col min-h-screen bg-white selection:bg-hushh-blue selection:text-white">
      {/* header */}
      <HushhTechBackHeader />

      {/* scrollable content */}
      <main className="flex-1 flex flex-col items-center justify-center px-5 py-2 sm:px-6 md:px-8">
        <div className="w-full max-w-[440px] flex flex-col items-center gap-8">

          {/* pill badge */}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-hushh-blue/20 bg-hushh-blue/5 px-4 py-1">
            <span className="material-symbols-rounded text-[16px] text-hushh-blue">person</span>
            <span className="text-[11px] tracking-[0.14em] uppercase text-hushh-blue font-medium">
              Profile
            </span>
          </span>

          {/* logo */}
          <img
            src={HushhLogo}
            alt="Hushh Logo"
            className="h-[100px] md:h-[120px] object-contain"
          />

          {/* headline */}
          <div className="text-center space-y-3">
            <h1
              className="text-[32px] md:text-[38px] leading-[1.08] tracking-tight text-gray-900 font-serif"
              style={playfair}
            >
              Investing in the{' '}
              <span className="text-gray-400 italic font-light">Future.</span>
            </h1>
            <p className="text-[15px] md:text-[17px] leading-relaxed text-gray-500 max-w-[360px] mx-auto">
              The AI-powered Berkshire Hathaway. We combine AI and human expertise to invest in exceptional businesses for long-term value creation.
            </p>
          </div>

          {/* action buttons */}
          <div className="w-full space-y-3 mt-2">
            <HushhTechCta
              onClick={primaryCTA.action}
              variant={HushhTechCtaVariant.BLACK}
              disabled={onboardingStatus.loading}
            >
              {onboardingStatus.loading ? 'Loading...' : primaryCTA.text}
            </HushhTechCta>
            <HushhTechCta
              onClick={handleDiscoverFundA}
              variant={HushhTechCtaVariant.WHITE}
            >
              Discover Fund A
            </HushhTechCta>
          </div>

          {/* trust indicators */}
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-ios-green animate-pulse" />
              <p className="text-[10px] tracking-[0.18em] uppercase text-gray-400 font-medium">
                SEC Registered
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-rounded text-[14px] text-hushh-blue">lock</span>
              <p className="text-[10px] tracking-[0.18em] uppercase text-gray-400 font-medium">
                Bank Level Security
              </p>
            </div>
          </div>

          {/* tagline */}
          <p className="text-[12px] text-gray-400 tracking-wide text-center mt-2">
            Secure. Private. AI-Powered.
          </p>
        </div>
      </main>

      {/* ═══ Footer Nav ═══ */}
      <HushhTechFooter
        activeTab={HushhFooterTab.PROFILE}
        onTabChange={(tab) => {
          if (tab === HushhFooterTab.HOME) navigate('/');
          if (tab === HushhFooterTab.FUND_A) navigate('/discover-fund-a');
          if (tab === HushhFooterTab.COMMUNITY) navigate('/community');
          if (tab === HushhFooterTab.PROFILE) navigate('/profile');
        }}
      />
    </div>
  );
};

export default ProfilePage;
