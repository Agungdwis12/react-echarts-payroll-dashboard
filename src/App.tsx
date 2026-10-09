import "./App.css";

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import DashboardLayout from "./components/dashboard/DashboardLayout";

import PayrollDashboard from "./pages/KinerjaLayananDivisi";
import BappDashboard from "./pages/BappDashboard";
import CostDashboard from "./pages/CostDashboard";
import ExecutiveBusinessDashboard from "./pages/ExecutiveBusinessDashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard/payroll" element={<PayrollDashboard />} />

          <Route path="/dashboard/bapp" element={<BappDashboard />} />

          <Route path="/dashboard/cost" element={<CostDashboard />} />

          <Route path="/dashboard/executive" element={<ExecutiveBusinessDashboard />} />
        </Route>

        <Route path="/" element={<Navigate to="/dashboard/payroll" replace />} />

        <Route path="*" element={<Navigate to="/dashboard/payroll" replace />} />
      </Routes>
    </BrowserRouter>
  );
}



export default App;
