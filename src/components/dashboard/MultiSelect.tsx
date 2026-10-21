import { useEffect, useRef, useState } from "react";
import { Check, Search } from "lucide-react";
import FilterDropdown from "./FilterDropdown";

interface MultiSelectProps {
  value: string[];
  options: string[];
  placeholder?: string;
  searchPlaceholder?: string;
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

export default function MultiSelect({ value, options, placeholder = "Pilih opsi", searchPlaceholder = "Cari...", onChange, disabled = false }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = options.filter((option) => option.toLowerCase().includes(search.trim().toLowerCase()));

  const allSelected = options.length > 0 && options.every((option) => value.includes(option));

  const displayValue = value.length === 0 ? placeholder : value.length === 1 ? value[0] : `${value.length} opsi dipilih`;

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

  const toggleOption = (option: string) => {
    if (value.includes(option)) {
      onChange(value.filter((item) => item !== option));
    } else {
      onChange([...value, option]);
    }
  };

  const toggleAll = () => {
    if (allSelected) {
      onChange(value.filter((item) => !options.includes(item)));
    } else {
      onChange([...new Set([...value, ...options])]);
    }
  };

  return (
    <div ref={containerRef} className="w-full min-w-0">
      <FilterDropdown
        open={open}
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((previous) => !previous);
          setSearch("");
        }}
        placeholder={placeholder}
        displayValue={displayValue}
        hasValue={value.length > 0}
      >
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

        {/* Select all / clear all */}
        <div className="flex items-center justify-between gap-2 border-b border-[#2B3D52] px-2.5 py-1.5">
          <button type="button" onClick={toggleAll} className="text-[10px] font-medium text-blue-400 hover:text-blue-300">
            {allSelected ? "Batalkan Semua" : "Pilih Semua"}
          </button>

          <button type="button" onClick={() => onChange([])} className="text-[10px] text-red-400 transition-colors hover:text-red-300">
            Hapus Semua
          </button>
        </div>

        {/* Options */}
        <div className="max-h-52 overflow-y-auto p-1">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => {
              const selected = value.includes(option);

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggleOption(option)}
                  className={`flex w-full items-center gap-1.5 rounded-md px-2.5 py-1.5 text-left text-[10px] leading-tight transition ${selected ? "text-slate-200" : "text-slate-300 hover:bg-slate-700/50"}`}
                >
                  <span className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${selected ? "border-blue-500 bg-blue-500 text-white" : "border-slate-500"}`}>{selected && <Check size={10} />}</span>

                  <span className="break-words">{option}</span>
                </button>
              );
            })
          ) : (
            <p className="px-2 py-3 text-center text-[10px] text-slate-400">Data tidak ditemukan</p>
          )}
        </div>

        {/* Selected count */}
        <div className="border-t border-[#2B3D52] px-2.5 py-1.5 text-[10px] text-slate-400">{value.length} opsi dipilih</div>
      </FilterDropdown>
    </div>
  );
}
