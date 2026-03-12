/**
 * HushhTechFooter — Reusable bottom navigation bar
 * Floating dark rounded bar with center Hushh logo and 4 nav tabs.
 *
 * Usage:
 *   <HushhTechFooter
 *     activeTab={HushhFooterTab.HOME}
 *     onTabChange={(tab) => navigate(tab)}
 *     onLogoClick={() => navigate('/')}
 *   />
 */
import React from "react";
import { useNavigate } from "react-router-dom";
import hushhLogo from "../images/Hushhogo.png";

/** Enum for footer navigation tabs */
export enum HushhFooterTab {
  HOME = "home",
  FUND_A = "fund_a",
  COMMUNITY = "community",
  PROFILE = "profile",
}

interface HushhTechFooterProps {
  /** Currently active tab */
  activeTab?: HushhFooterTab;
  /** Callback when a tab is tapped */
  onTabChange?: (tab: HushhFooterTab) => void;
  /** Callback when center logo is tapped */
  onLogoClick?: () => void;
  /** Extra classes on root container */
  className?: string;
}

/** Tab configuration */
const TABS = [
  { id: HushhFooterTab.HOME, icon: "home", label: "Home" },
  { id: HushhFooterTab.FUND_A, icon: null, label: "Fund A" },
  { id: HushhFooterTab.COMMUNITY, icon: "groups", label: "Comm" },
  { id: HushhFooterTab.PROFILE, icon: "person", label: "Profile" },
];

/** Fund A has a custom icon (gold circle with line) */
const FundAIcon: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  const color = isActive ? "#C1A87D" : "#9CA3AF";
  return (
    <div
      className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
      style={{ borderColor: color }}
    >
      <div className="w-[1px] h-2" style={{ backgroundColor: color }} />
    </div>
  );
};

/** Default route map for each tab */
const TAB_ROUTES: Record<HushhFooterTab, string> = {
  [HushhFooterTab.HOME]: "/",
  [HushhFooterTab.FUND_A]: "/discover-fund-a",
  [HushhFooterTab.COMMUNITY]: "/community",
  [HushhFooterTab.PROFILE]: "/profile",
};

const HushhTechFooter: React.FC<HushhTechFooterProps> = ({
  activeTab,
  onTabChange,
  onLogoClick,
  className = "",
}) => {
  const navigate = useNavigate();
  const leftTabs = TABS.slice(0, 2);
  const rightTabs = TABS.slice(2);

  /** Handle tab click — use parent callback if provided, else navigate */
  const handleTabClick = (tabId: HushhFooterTab) => {
    if (onTabChange) {
      onTabChange(tabId);
    } else {
      navigate(TAB_ROUTES[tabId]);
    }
  };

  /** Handle logo click — use parent callback if provided, else go home */
  const handleLogoClick = () => {
    if (onLogoClick) {
      onLogoClick();
    } else {
      navigate("/");
    }
  };

  const renderTab = (tab: (typeof TABS)[number]) => {
    const isActive = activeTab === tab.id;

    // Text color: active = white (or gold for Fund A), inactive = gray
    const textColor =
      isActive && tab.id === HushhFooterTab.FUND_A
        ? "text-[#C1A87D]"
        : isActive
          ? "text-white"
          : "text-gray-500 group-hover:text-gray-300";

    const iconColor =
      isActive && tab.id === HushhFooterTab.FUND_A
        ? "text-[#C1A87D]"
        : isActive
          ? "text-white"
          : "text-gray-400 group-hover:text-white";

    return (
      <button
        key={tab.id}
        onClick={() => handleTabClick(tab.id)}
        className="flex flex-col items-center gap-1 group cursor-pointer bg-transparent border-none outline-none"
        aria-label={tab.label}
        tabIndex={0}
      >
        {tab.id === HushhFooterTab.FUND_A ? (
          <FundAIcon isActive={isActive} />
        ) : (
          <span
            className={`material-symbols-outlined text-xl transition-colors ${iconColor}`}
          >
            {tab.icon}
          </span>
        )}
        <span
          className={`text-[0.55rem] font-bold tracking-widest uppercase transition-colors ${textColor}`}
        >
          {tab.label}
        </span>
      </button>
    );
  };

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-4 pointer-events-none ${className}`}
    >
      <div className="relative max-w-md mx-auto pointer-events-auto">
        <div className="h-[72px] bg-[#050505] rounded-[2rem] flex items-center justify-between px-8 relative shadow-2xl">
          {/* Center Hushh logo button */}
          <div className="absolute left-1/2 -top-6 -translate-x-1/2 z-10">
            <button
              onClick={handleLogoClick}
              className="w-16 h-16 rounded-full flex items-center justify-center border-[3px] border-[#2A2A2A] shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:scale-105 transition-transform overflow-hidden"
              style={{
                background:
                  "radial-gradient(134.19% 134.19% at 50% 0%, #3C3C3C 0%, #1C1C1C 100%)",
              }}
              aria-label="Hushh Home"
              tabIndex={0}
            >
              <img
                src={hushhLogo}
                alt="Hushh"
                className="w-9 h-9 object-contain"
              />
            </button>
          </div>

          {/* Left nav items */}
          <div className="flex items-center gap-8">
            {leftTabs.map(renderTab)}
          </div>

          {/* Spacer for center button */}
          <div className="w-8" />

          {/* Right nav items */}
          <div className="flex items-center gap-8">
            {rightTabs.map(renderTab)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HushhTechFooter;
