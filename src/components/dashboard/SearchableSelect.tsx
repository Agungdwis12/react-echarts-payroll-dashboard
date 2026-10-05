import React, { useEffect, useMemo, useRef, useState } from "react";

interface SearchableSelectProps {
  value: string;
  options: string[];
  placeholder: string;
  searchPlaceholder?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({ value, options, placeholder, searchPlaceholder = "Cari...", onChange, disabled = false }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* =========================================================
     CLOSE WHEN CLICK OUTSIDE
  ========================================================= */

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  /* =========================================================
     AUTO FOCUS SEARCH
  ========================================================= */

  useEffect(() => {
    if (open) {
      window.setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [open]);

  /* =========================================================
     FILTER OPTIONS
  ========================================================= */

  const filteredOptions = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return options;
    }

    return options.filter((option) => option.toLowerCase().includes(keyword));
  }, [options, search]);

  /* =========================================================
     SELECT
  ========================================================= */

  const handleSelect = (option: string) => {
    onChange(option);

    setOpen(false);
    setSearch("");
  };

  /* =========================================================
     TOGGLE
  ========================================================= */

  const handleToggle = () => {
    if (disabled) {
      return;
    }

    if (open) {
      setOpen(false);
      setSearch("");
    } else {
      setOpen(true);
    }
  };

  /* =========================================================
     KEYBOARD
  ========================================================= */

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleToggle();
    }

    if (event.key === "Escape") {
      setOpen(false);
      setSearch("");
    }
  };

  return (
    <div ref={containerRef} className={`searchable-select ${open ? "is-open" : ""} ${disabled ? "is-disabled" : ""}`}>
      {/* =====================================================
          TRIGGER
      ===================================================== */}

      <button type="button" className="searchable-select-trigger" onClick={handleToggle} onKeyDown={handleKeyDown} disabled={disabled} title={value || placeholder} aria-haspopup="listbox" aria-expanded={open}>
        <span className="searchable-select-value">{value || placeholder}</span>

        <span className="searchable-arrow" />
      </button>

      {/* =====================================================
          DROPDOWN
      ===================================================== */}

      {open && !disabled && (
        <div className="searchable-dropdown" role="listbox">
          {/* =================================================
              SEARCH
          ================================================= */}

          <div className="searchable-search">
            <span className="search-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </span>

            <input ref={inputRef} type="text" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={searchPlaceholder} aria-label={searchPlaceholder} />

            {search && (
              <button type="button" className="clear-search" onClick={() => setSearch("")} aria-label="Clear search">
                ×
              </button>
            )}
          </div>

          {/* =================================================
              OPTIONS
          ================================================= */}

          <div className="searchable-options">
            {/* ALL */}

            <button type="button" className={`searchable-option ${value === "" ? "active" : ""}`} onClick={() => handleSelect("")}>
              <span className="option-text">{placeholder}</span>

              {value === "" && <span className="option-check">✓</span>}
            </button>

            {/* OPTIONS */}

            {filteredOptions.map((option) => (
              <button type="button" key={option} className={`searchable-option ${value === option ? "active" : ""}`} onClick={() => handleSelect(option)} title={option}>
                <span className="option-text">{option}</span>

                {value === option && <span className="option-check">✓</span>}
              </button>
            ))}

            {/* NO RESULT */}

            {filteredOptions.length === 0 && (
              <div className="no-result">
                <span>Tidak ada hasil</span>

                <strong>"{search}"</strong>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
