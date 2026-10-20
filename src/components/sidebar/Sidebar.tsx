import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, FileBarChart, Wallet, ChartNoAxesCombined } from "lucide-react";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {

const menus = [
    {
      to: "/dashboard/kinerja-layanan",
      label: "Kinerja Layanan Divisi",
      title: "Kinerja Layanan Dashboard",
      Icon: LayoutDashboard,
    },
    {
      to: "/dashboard/bapp",
      label: "BAPP & Revenue",
      title: "BAPP & Revenue",
      Icon: FileBarChart,
    },
    {
      to: "/dashboard/cost",
      label: "Target & Cost",
      title: "Target & Cost",
      Icon: Wallet,
    },
    {
      to: "/dashboard/team-performance",
      label: "Team Performance",
      title: "Team Performance Dashboard",
      Icon: ChartNoAxesCombined,
    },
  ];

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-[1000] flex h-screen flex-col overflow-hidden border-r border-[#25364d] bg-gradient-to-b from-[#101b2c] via-[#0d1828] to-[#0b1625] shadow-[8px_0_25px_rgba(0,0,0,0.12)] transition-[width] duration-300 ease-in-out
        ${collapsed ? "w-[70px] max-md:w-full" : "w-[250px] max-md:w-full"}
        max-md:inset-x-0 max-md:bottom-auto max-md:top-0 max-md:h-[60px] max-md:flex-row max-md:items-center max-md:justify-between max-md:border-r-0 max-md:border-b`}
    >
      {/* HEADER */}
      <div
        className={`flex min-h-[72px] items-center justify-between gap-2 border-b border-white/5 p-4
          ${collapsed ? "flex-col justify-center gap-2 px-0 py-3 max-md:flex-row max-md:justify-start max-md:px-3 max-md:py-0" : ""}
          max-md:h-[60px] max-md:min-h-[60px] max-md:flex-none max-md:border-b-0 max-md:py-0`}
      >
        <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center overflow-hidden rounded-[10px] max-md:h-9 max-md:w-9">
          <img src="/logo.svg" alt="Infomedia Logo" className="block h-full w-full object-contain" />
        </div>

        {!collapsed && (
          <div className="flex min-w-0 flex-1 flex-col justify-center leading-[1.15] max-md:hidden">
            <span className="text-[11px] font-medium tracking-[0.3px] text-[#8397b0]">INFOMEDIA</span>
            <strong className="overflow-hidden text-ellipsis whitespace-nowrap text-[15px] font-bold tracking-[0.3px] text-white">NUSANTARA</strong>
          </div>
        )}

        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-base text-white/75 transition-colors hover:bg-white/10 hover:text-white
            ${collapsed ? "max-md:hidden" : ""}
            max-md:hidden`}
        >
          {collapsed ? "›" : "‹"}
        </button>
      </div>

      {/* MENU */}
      <div
        className={`flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-3.5 py-5 [scrollbar-color:#34475e_transparent] [scrollbar-width:thin]
          ${collapsed ? "px-2 py-4 max-md:px-2 max-md:py-0" : ""}
          max-md:h-[60px] max-md:flex-1 max-md:flex-row max-md:items-center max-md:overflow-x-auto max-md:overflow-y-hidden max-md:px-2 max-md:py-0 max-md:[scrollbar-width:none]`}
      >
        <p
          className={`mb-2.5 ml-3 text-[10px] font-bold uppercase tracking-[0.08em] text-[#70839d]
            ${collapsed ? "hidden" : ""}
            max-md:hidden`}
        >
          MENU
        </p>

        <nav
          className={`flex w-full flex-col gap-1.5
            ${collapsed ? "max-md:w-max" : ""}
            max-md:h-full max-md:w-max max-md:flex-row max-md:items-center max-md:gap-1.5`}
        >
          {menus.map(({ to, label, title, Icon }) => (
            <NavLink
              key={to}
              to={to}
              title={title}
              className={({ isActive }) =>
                `relative flex min-h-11 flex-none items-center gap-3 rounded-[10px] px-3 text-[13px] font-semibold no-underline transition-colors duration-200
                ${
                  isActive
                    ? "bg-gradient-to-r from-[#1b417e] to-[#172f58] text-[#f2f7ff] shadow-[inset_0_0_0_1px_rgba(70,136,255,0.12),0_6px_16px_rgba(0,0,0,0.15)] before:absolute before:bottom-2.5 before:left-0 before:top-2.5 before:w-[3px] before:rounded-r before:bg-[#3f8cff]"
                    : "text-[#8397b0] hover:bg-[#17283d] hover:text-[#d9e4f0]"
                }
                ${collapsed ? "justify-center px-0 max-md:justify-start max-md:px-3" : ""}
                max-md:h-[38px] max-md:min-h-[38px] max-md:gap-2 max-md:whitespace-nowrap max-md:rounded-lg max-md:px-3 max-md:text-xs max-md:before:hidden`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`flex w-5 shrink-0 items-center justify-center text-[#8ca1bb] ${isActive ? "text-[#61a0ff]" : ""}`}>
                    <Icon size={18} strokeWidth={1.8} />
                  </span>

                  <span className={`whitespace-nowrap ${collapsed ? "hidden" : ""} max-md:inline-block`}>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* USER PROFILE */}
      <div
        className={`mt-auto flex-none border-t border-[#22334a] px-3.5 py-3
          ${collapsed ? "px-2" : ""}
          max-md:hidden`}
      >
        <div
          className={`flex min-h-14 items-center gap-2.5 rounded-[10px] border border-[#23364e] bg-[#142338] px-2.5 py-2
            ${collapsed ? "justify-center px-0" : ""}`}
        >
          <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[#263850] text-xs font-bold text-[#dce7f3]">U</div>

          {!collapsed && (
            <div className="flex min-w-0 flex-col gap-0.5 overflow-hidden">
              <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-bold text-[#edf3f9]">Payroll User</span>
              <span className="whitespace-nowrap text-[10px] text-[#71859f]">Payroll Operation</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
