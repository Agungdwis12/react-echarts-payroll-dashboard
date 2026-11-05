import "./App.css";

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import DashboardLayout from "./components/dashboard/DashboardLayout";

import KinerjaLayananDashboard from "./pages/KinerjaLayananDivisi";
import BappDashboard from "./pages/BappDashboard";
import CostDashboard from "./pages/CostDashboard";
import TeamPerformance from "./pages/TeamPerformance";

// DMS pages
import DMSLayout from "./pages/DMS/DMSLayout";
import ImportData from "./pages/DMS/ImportData";
import DataManagement from "./pages/DMS/DataManagement";
import HistoryPage from "./pages/DMS/HistoryPage";


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard/kinerja-layanan" element={<KinerjaLayananDashboard />} />

          <Route path="/dashboard/bapp" element={<BappDashboard />} />

          <Route path="/dashboard/cost" element={<CostDashboard />} />

          <Route path="/dashboard/team-performance" element={<TeamPerformance />} />

          {/* DMS */}
          <Route path="/dashboard/dms" element={<DMSLayout />}>
            <Route index element={<Navigate to="/dashboard/dms/import" replace />} />

            <Route path="import" element={<ImportData />} />

            <Route path="management" element={<DataManagement />} />

            <Route path="history" element={<HistoryPage />} />
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/dashboard/kinerja-layanan" replace />} />

        <Route path="*" element={<Navigate to="/dashboard/kinerja-layanan" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
