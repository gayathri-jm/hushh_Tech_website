/**
 * SearchableSelect — Mobile-friendly searchable dropdown with manual typing fallback.
 *
 * Features:
 * - Type to search/filter options
 * - Select from filtered list or type a custom value
 * - Loading state with spinner
 * - Error state with retry button
 * - Works on mobile with proper keyboard handling
 */
import { useState, useRef, useEffect, useCallback } from 'react';

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  id: string;
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  loadError?: boolean;
  onRetry?: () => void;
  required?: boolean;
  autoComplete?: string;
}

export function SearchableSelect({
  id, label, value, options, onChange,
  placeholder = 'Search or type…',
  disabled = false,
  loading = false,
  loadError = false,
  onRetry,
  required = false,
  autoComplete,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Display text: show selected option label or raw value
  const displayText = options.find(o => o.value === value)?.label || value;

  // Filter options by search
  const filtered = search.trim()
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = useCallback((optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearch('');
    inputRef.current?.blur();
  }, [onChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    if (!isOpen) setIsOpen(true);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    setSearch('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearch('');
      inputRef.current?.blur();
    }
    // Allow user to submit custom typed value on Enter
    if (e.key === 'Enter' && search.trim()) {
      e.preventDefault();
      if (filtered.length > 0) {
        handleSelect(filtered[0].value);
      } else {
        // Accept custom value
        onChange(search.trim());
        setIsOpen(false);
        setSearch('');
      }
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-slate-900">{label}</label>
        <div className="w-full h-12 px-4 rounded-lg border border-gray-200 bg-slate-50 flex items-center gap-2 text-slate-400 text-base">
          <svg className="animate-spin h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Loading…</span>
        </div>
      </div>
    );
  }

  // Error state with retry
  if (loadError) {
    return (
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-slate-900">{label}</label>
        <div className="w-full rounded-lg border border-red-200 bg-red-50 p-3 flex items-center justify-between">
          <span className="text-red-600 text-sm">Failed to load</span>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="text-sm font-semibold text-[#2b8cee] hover:underline"
            >
              Retry
            </button>
          )}
        </div>
        {/* Manual fallback input */}
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={`Type ${label.toLowerCase()} manually`}
          className="w-full h-12 px-4 rounded-lg border border-gray-200 bg-white text-slate-900 placeholder:text-slate-400 text-base focus:outline-none focus:ring-2 focus:ring-[#2b8cee]/20 focus:border-[#2b8cee]"
        />
      </div>
    );
  }

  return (
    <div className="space-y-1.5 relative" ref={containerRef}>
      <label className="block text-sm font-medium text-slate-900" htmlFor={id}>{label}</label>

      {/* Input field */}
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={isOpen ? search : displayText}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={isOpen ? `Search ${label.toLowerCase()}…` : placeholder}
          disabled={disabled}
          autoComplete={autoComplete || 'off'}
          aria-required={required}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          role="combobox"
          className={`w-full h-12 px-4 pr-10 rounded-lg border bg-white text-slate-900 placeholder:text-slate-400 text-base focus:outline-none focus:ring-2 focus:ring-[#2b8cee]/20 focus:border-[#2b8cee] transition-all ${
            disabled ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'border-gray-200'
          }`}
        />
        {/* Chevron icon */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>

      {/* Dropdown list */}
      {isOpen && !disabled && (
        <ul
          role="listbox"
          className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {filtered.length === 0 ? (
            <li className="px-4 py-3 text-sm text-slate-500">
              {search.trim() ? (
                <span>
                  No results. Press <strong>Enter</strong> to use "{search.trim()}"
                </span>
              ) : (
                'No options available'
              )}
            </li>
          ) : (
            filtered.slice(0, 50).map(opt => (
              <li
                key={opt.value}
                role="option"
                aria-selected={opt.value === value}
                onClick={() => handleSelect(opt.value)}
                className={`px-4 py-3 text-sm cursor-pointer transition-colors ${
                  opt.value === value
                    ? 'bg-[#2b8cee]/10 text-[#2b8cee] font-medium'
                    : 'text-slate-900 hover:bg-slate-50 active:bg-slate-100'
                }`}
              >
                {opt.label}
              </li>
            ))
          )}
          {filtered.length > 50 && (
            <li className="px-4 py-2 text-xs text-slate-400 text-center">
              Type to narrow down {filtered.length - 50}+ more results
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
