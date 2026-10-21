import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search, Check } from "lucide-react";
import FilterDropdown from "./FilterDropdown";

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

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  const filteredOptions = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return options;

    return options.filter((option) => option.toLowerCase().includes(keyword));
  }, [options, search]);

  const handleSelect = (option: string) => {
    onChange(option);
    setOpen(false);
    setSearch("");
  };

  const handleToggle = () => {
    if (disabled) return;

    setOpen((previous) => !previous);
    setSearch("");
  };

  return (
    <div ref={containerRef} className="w-full min-w-0">
      <FilterDropdown open={open} disabled={disabled} onClick={handleToggle} placeholder={placeholder} displayValue={value || placeholder} hasValue={Boolean(value)}>
        {/* Search input */}
        <div className="border-b border-[#2B3D52] p-1.5">
          <div className="flex items-center gap-1.5 rounded-md border border-[#2B3D52] bg-[#0d192b] px-2">
            <Search size={12} className="shrink-0 text-slate-400" />

            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setOpen(false);
                  setSearch("");
                }
              }}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="h-6 min-w-0 flex-1 bg-transparent text-[10px] text-[#D5DEE9] outline-none placeholder:text-[10px] placeholder:text-slate-500"
            />

            {search && (
              <button type="button" onClick={() => setSearch("")} aria-label="Hapus pencarian" className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-sm text-slate-400 hover:bg-slate-700 hover:text-white">
                ×
              </button>
            )}
          </div>
        </div>

        {/* Options dengan scrollbar berwarna */}
        <div
          role="listbox"
          aria-label={placeholder}
          className="max-h-60 overflow-y-auto overscroll-contain p-1 [scrollbar-width:thin] [scrollbar-color:#526780_#142238] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-[#142238] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#526780] [&::-webkit-scrollbar-thumb:hover]:bg-[#7188a5]"
        >
          {/* Pilihan default */}
          <button
            type="button"
            role="option"
            aria-selected={value === ""}
            onClick={() => handleSelect("")}
            className={`flex w-full items-start justify-between gap-1.5 rounded-md px-2.5 py-1.5 text-left text-[10px] leading-4 transition-colors ${
              value === "" ? "bg-blue-500/10 font-medium text-blue-300" : "text-[#D5DEE9] hover:bg-slate-700/50"
            }`}
          >
            <span className="min-w-0 flex-1 whitespace-normal break-words">{placeholder}</span>

            {value === "" && <Check size={12} strokeWidth={2} className="mt-0.5 shrink-0 text-blue-400" />}
          </button>

          {/* Daftar layanan */}
          {filteredOptions.map((option) => {
            const selected = value === option;

            return (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={selected}
                title={option}
                onClick={() => handleSelect(option)}
                className={`flex w-full items-start justify-between gap-1.5 rounded-md px-2.5 py-1.5 text-left text-[10px] leading-4 transition-colors ${
                  selected ? "bg-blue-500/10 font-medium text-blue-300" : "text-[#D5DEE9] hover:bg-slate-700/50"
                }`}
              >
                <span className="min-w-0 flex-1 whitespace-normal break-words">{option}</span>

                {selected && <Check size={12} strokeWidth={2} className="mt-0.5 shrink-0 text-blue-400" />}
              </button>
            );
          })}

          {/* Hasil pencarian kosong */}
          {filteredOptions.length === 0 && (
            <div className="px-2 py-3 text-center text-[10px] text-slate-400">
              Tidak ada hasil untuk <span className="font-medium text-[#D5DEE9]">"{search}"</span>
            </div>
          )}
        </div>
      </FilterDropdown>
    </div>
  );
};

export default SearchableSelect;
