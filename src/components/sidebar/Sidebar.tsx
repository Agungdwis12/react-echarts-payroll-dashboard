import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, FileBarChart, Wallet, ChartNoAxesCombined } from "lucide-react";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
    
      {/* =========================
                HEADER
      ========================= */}

      <div className="sidebar-logo">
        <div className="logo-icon">
          <img src="/logo.svg" alt="Infomedia Logo" />
        </div>

        <div className="logo-text">
          <span>INFOMEDIA</span>
          <strong>NUSANTARA</strong>
        </div>

        <button type="button" className="sidebar-toggle" onClick={onToggle} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          {collapsed ? "›" : "‹"}
        </button>
      </div>

      {/* =========================
          MENU
      ========================= */}

      <div className="sidebar-section">
        <p className="sidebar-title">MENU</p>

        <nav className="sidebar-menu">
          <NavLink to="/dashboard/payroll" className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`} title="Dashboard Payroll">
            <span className="sidebar-icon">
              <LayoutDashboard size={18} strokeWidth={1.8} />
            </span>

            <span className="sidebar-link-text">Dashboard Payroll</span>
          </NavLink>

          <NavLink to="/dashboard/bapp" className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`} title="BAPP & Revenue">
            <span className="sidebar-icon">
              <FileBarChart size={18} strokeWidth={1.8} />
            </span>

            <span className="sidebar-link-text">BAPP & Revenue</span>
          </NavLink>

          <NavLink to="/dashboard/cost" className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`} title="Target & Cost">
            <span className="sidebar-icon">
              <Wallet size={18} strokeWidth={1.8} />
            </span>

            <span className="sidebar-link-text">Target & Cost</span>
          </NavLink>

          <NavLink to="/dashboard/executive" className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`} title="Executive Dashboard">
            <span className="sidebar-icon">
              <ChartNoAxesCombined size={18} strokeWidth={1.8} />
            </span>

            <span className="sidebar-link-text">Executive Dashboard</span>
          </NavLink>
        </nav>
      </div>

      {/* =========================
          USER
      ========================= */}

      <div className="sidebar-bottom">
        <div className="sidebar-user">
          <div className="user-avatar">U</div>

          <div className="user-info">
            <span className="user-name">Payroll User</span>

            <span className="user-role">Payroll Operation</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
