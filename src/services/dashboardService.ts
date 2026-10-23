const API_URL = import.meta.env.VITE_API_URL || "/api";

const fetchDashboardData = async (endpoint: string) => {
  const response = await fetch(`${API_URL}/${endpoint}`, {
    method: "GET",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Cache-Control": "no-cache",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${endpoint}: ${response.status}`);
  }

  const result = await response.json();

  if (result.success === false) {
    throw new Error(result.message || `Failed to fetch ${endpoint}`);
  }

  return result.data;
};

/* DASHBOARD PAYROLL */
export const getMasterDetailDivisi = () => fetchDashboardData("master-detail-divisi");

/* DASHBOARD BAPP - MASTER BULANAN */
export const getMasterBappBulanan = () => fetchDashboardData("master-bapp-bulanan");

/* DASHBOARD BAPP - DETAIL */
export const getMasterDetailBapp = () => fetchDashboardData("master-detail-bapp");

/* DASHBOARD TARGET & COST */
export const getGpm = () => fetchDashboardData("gpm");

export const getTarget = () => fetchDashboardData("target");

export const getDetailCost = () => fetchDashboardData("detail-cost");
