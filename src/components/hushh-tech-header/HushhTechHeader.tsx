/**
 * HushhTechHeader — Reusable sticky header with hamburger menu
 * Left: Hushh logo + brand name. Right: hamburger menu button.
 * Opens HushhTechNavDrawer when hamburger is clicked.
 */
import React, { useState } from "react";
import hushhLogo from "../images/Hushhogo.png";
import HushhTechNavDrawer from "../hushh-tech-nav-drawer/HushhTechNavDrawer";

interface HushhTechHeaderProps {
  /** Whether the header is fixed to top (default: false) */
  fixed?: boolean;
  /** Extra classes on the root container */
  className?: string;
}

const HushhTechHeader: React.FC<HushhTechHeaderProps> = ({
  fixed = false,
  className = "",
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const positionClasses = fixed
    ? "fixed top-0 left-0 right-0 z-50"
    : "relative z-10";

  return (
    <>
      <header
        className={`${positionClasses} bg-white px-6 py-4 flex justify-between items-center transition-all duration-300 ${className}`}
      >
        {/* Logo + Brand */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 border border-gray-200 rounded-xl flex items-center justify-center shrink-0 bg-white overflow-hidden">
            <img
              src={hushhLogo}
              alt="Hushh Logo"
              className="w-7 h-7 object-contain"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-[14px] font-semibold tracking-[0.05em] text-gray-900 font-sans">
              Hushh
            </span>
            <span className="text-[11px] font-normal tracking-[0.05em] text-gray-500 font-sans">
              Technologies
            </span>
          </div>
        </div>

        {/* Hamburger menu button */}
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center hover:bg-indigo-600 transition-colors"
          aria-label="Open menu"
          tabIndex={0}
        >
          <span className="material-symbols-outlined text-white !text-[1.2rem]">
            menu
          </span>
        </button>
      </header>

      {/* Navigation Drawer */}
      <HushhTechNavDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </>
  );
};

export default HushhTechHeader;
