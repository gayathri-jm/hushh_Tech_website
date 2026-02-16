interface LocationPermissionModalProps {
  isOpen: boolean;
  onRequestLocation: () => void;
  onSkip: () => void;
  isDetecting: boolean;
}

export default function LocationPermissionModal({
  isOpen,
  onRequestLocation,
  onSkip,
  isDetecting
}: LocationPermissionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Location Icon */}
        <div className="flex justify-center mb-6">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg"
            style={{ backgroundColor: '#2F80ED' }}
          >
            <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-black text-center mb-3">
          Enable Location
        </h2>

        {/* Description */}
        <p className="text-slate-600 text-center mb-4 leading-relaxed">
          We'll detect your location to automatically fill in your country and region.
          This helps us comply with investment regulations.
        </p>

        {/* How it works */}
        <div className="bg-slate-50 rounded-xl p-4 mb-6">
          <p className="text-xs text-slate-500 font-medium mb-2">How it works:</p>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-xs font-bold mt-0.5" style={{ color: '#2F80ED' }}>1.</span>
              <p className="text-xs text-slate-600">Tap "Detect My Location" below</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-xs font-bold mt-0.5" style={{ color: '#2F80ED' }}>2.</span>
              <p className="text-xs text-slate-600">Allow location access when prompted by your browser</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-xs font-bold mt-0.5" style={{ color: '#2F80ED' }}>3.</span>
              <p className="text-xs text-slate-600">Your country will be filled in automatically</p>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          {/* CTA Button */}
          <button
            onClick={onRequestLocation}
            disabled={isDetecting}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 text-white rounded-xl font-semibold text-lg active:scale-[0.98] transition-all shadow-lg disabled:opacity-50 disabled:cursor-wait"
            style={{ backgroundColor: isDetecting ? '#9BBEF5' : '#2F80ED' }}
            onMouseEnter={(e) => { if (!isDetecting) (e.target as HTMLElement).style.backgroundColor = '#2570D4'; }}
            onMouseLeave={(e) => { if (!isDetecting) (e.target as HTMLElement).style.backgroundColor = '#2F80ED'; }}
          >
            {isDetecting ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Detecting...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span>Detect My Location</span>
              </>
            )}
          </button>

          {/* Skip Button */}
          <button
            onClick={onSkip}
            disabled={isDetecting}
            className="w-full px-6 py-3 text-slate-600 hover:text-black font-medium text-base transition-colors disabled:opacity-50"
          >
            Select Manually Instead →
          </button>
        </div>

        {/* Privacy Note */}
        <p className="text-xs text-slate-400 text-center mt-6">
          🔒 Your location is only used to auto-fill your country. We don't track your movements.
        </p>
      </div>
    </div>
  );
}
