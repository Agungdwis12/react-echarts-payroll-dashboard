import { NavLink, Outlet } from "react-router-dom";
import { UploadCloud, Database, History } from "lucide-react";

const tabs = [
  {
    label: "Import Data",
    path: "/dashboard/dms/import",
    icon: UploadCloud,
  },
  {
    label: "Data Management",
    path: "/dashboard/dms/management",
    icon: Database,
  },
  {
    label: "Riwayat Pembaruan",
    path: "/dashboard/dms/history",
    icon: History,
  },
];

export default function DMSLayout() {
  return (
    <div className="min-w-0 space-y-4 text-slate-200">
      {/* HEADER DMS */}
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <h1 className="text-lg font-extrabold tracking-tight text-slate-50 sm:text-xl">Data Management System</h1>
          <p className="mt-1 text-[11px] text-slate-400">Pengelolaan data terpusat untuk mendukung pembaruan dan pemantauan dashboard.</p>
        </div>
      </header>

      {/* DMS TABS */}
      <nav aria-label="Navigasi DMS" className="flex flex-wrap items-center gap-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;

          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                [
                  "inline-flex h-[34px] items-center gap-1.5",
                  "rounded-md border px-2.5",
                  "text-xs font-medium",
                  "transition-colors duration-150",
                  "focus:outline-none focus:ring-2 focus:ring-blue-400/30",
                  isActive ? "border-blue-400/50 bg-[#263f68] text-blue-100 shadow-sm shadow-blue-500/10" : "border-[#253148] bg-[#111827]/70 text-slate-400 hover:border-slate-600 hover:bg-[#182235] hover:text-slate-200",
                ].join(" ")
              }
            >
              <Icon size={14} strokeWidth={2} />
              {tab.label}
            </NavLink>
          );
        })}
      </nav>

      {/* ACTIVE DMS PAGE */}
      <main className="min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
