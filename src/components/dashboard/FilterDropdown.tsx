import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

interface FilterDropdownProps {
  children: ReactNode;
  open: boolean;
  disabled?: boolean;
  onClick: () => void;
  placeholder: string;
  displayValue: string;
  hasValue: boolean;
}

export default function FilterDropdown({ children, open, disabled = false, onClick, placeholder, displayValue, hasValue }: FilterDropdownProps) {
  return (
    <div className="relative w-full min-w-0">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={displayValue || placeholder}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex h-7 w-full items-center justify-between gap-1.5 rounded-lg border border-[#2B3D52] bg-[#142238] px-2.5 text-left text-[10px] leading-tight outline-none transition-colors ${
          disabled ? "cursor-not-allowed opacity-50" : open ? "border-blue-500 ring-1 ring-blue-500/30" : "hover:border-slate-500 focus:border-blue-500"
        }`}
      >
        <span className={`min-w-0 flex-1 truncate text-[11px] leading-tight ${hasValue ? "text-slate-200" : "text-slate-400"}`}>{displayValue || placeholder}</span>

        <ChevronDown size={14} className={`shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && !disabled && <div className="absolute left-0 top-full z-[100] mt-1 w-full min-w-0 overflow-hidden rounded-lg border border-[#2B3D52] bg-[#142238] shadow-xl">{children}</div>}
    </div>
  );
}
