import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../sidebar/Sidebar";

const DashboardLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen w-full overflow-hidden bg-[#0d1727]">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((prev) => !prev)} />

      <main
        className={`h-screen min-w-0 overflow-x-hidden overflow-y-auto bg-[radial-gradient(circle_at_75%_-15%,rgba(35,78,145,0.22),transparent_30%),linear-gradient(180deg,#101c2e_0%,#0d1828_100%)] px-7 pb-10 pt-6 transition-[width,margin-left] duration-300 ease-in-out
          ${collapsed ? "ml-[70px] w-[calc(100%-70px)]" : "ml-[250px] w-[calc(100%-250px)]"}
          max-md:ml-0 max-md:mt-[60px] max-md:h-[calc(100dvh-60px)] max-md:w-full max-md:px-[14px] max-md:pb-6 max-md:pt-4
          max-[480px]:px-[10px] max-[480px]:pb-5 max-[480px]:pt-3`}
      >
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
