/**
 * HushhTechBackHeader — Reusable sticky header with back button
 * Left: square back arrow button. Right: configurable action button (e.g. FAQs).
 *
 * Usage:
 *   <HushhTechBackHeader
 *     onBackClick={() => navigate(-1)}
 *     rightLabel="FAQs"
 *     onRightClick={() => navigate('/faqs')}
 *   />
 *
 *   // Without right button:
 *   <HushhTechBackHeader onBackClick={() => navigate(-1)} showRightButton={false} />
 */
import React from "react";

interface HushhTechBackHeaderProps {
  /** Callback when back arrow is clicked */
  onBackClick?: () => void;
  /** Label for the right-side button */
  rightLabel?: string;
  /** Callback when right button is clicked */
  onRightClick?: () => void;
  /** Whether to show the right button (default: true) */
  showRightButton?: boolean;
  /** Extra classes on the root container */
  className?: string;
}

const HushhTechBackHeader: React.FC<HushhTechBackHeaderProps> = ({
  onBackClick,
  rightLabel = "FAQs",
  onRightClick,
  showRightButton = true,
  className = "",
}) => {
  return (
    <header
      className={`px-6 py-6 flex justify-between items-center sticky top-0 bg-white/95 backdrop-blur-md z-40 ${className}`}
    >
      {/* Back button */}
      <button
        onClick={onBackClick}
        className="w-10 h-10 border border-black flex items-center justify-center hover:bg-gray-50 transition-colors"
        aria-label="Go back"
        tabIndex={0}
      >
        <span className="material-symbols-outlined text-gray-900 text-[20px] font-light">
          west
        </span>
      </button>

      {/* Right action button */}
      {showRightButton && (
        <button
          onClick={onRightClick}
          className="px-5 py-2 border border-black text-[11px] font-bold tracking-widest uppercase text-gray-900 hover:bg-black hover:text-white transition-colors"
          aria-label={rightLabel}
          tabIndex={0}
        >
          {rightLabel}
        </button>
      )}
    </header>
  );
};

export default HushhTechBackHeader;
