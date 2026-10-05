const API_URL = import.meta.env.VITE_API_URL || "/api";
/* =====================================================
   DASHBOARD PAYROLL
===================================================== */

export const getMasterDetailDivisi = async () => {
  const response = await fetch(`${API_URL}/master-detail-divisi`);

  if (!response.ok) {
    throw new Error("Failed to fetch payroll data");
  }

  const result = await response.json();

  return result.data;
};

/* =====================================================
   DASHBOARD BAPP - MASTER BULANAN
===================================================== */

export const getMasterBappBulanan = async () => {
  const response = await fetch(`${API_URL}/master-bapp-bulanan`);

  if (!response.ok) {
    throw new Error("Failed to fetch master BAPP bulanan data");
  }

  const result = await response.json();

  return result.data;
};

/* =====================================================
   DASHBOARD BAPP - DETAIL
===================================================== */

export const getMasterDetailBapp = async () => {
  const response = await fetch(`${API_URL}/master-detail-bapp`);

  if (!response.ok) {
    throw new Error("Failed to fetch master detail BAPP data");
  }

  const result = await response.json();

  return result.data;
};

// =====================================================
// DASHBOARD TARGET & COST
// =====================================================

export const getGpm = async () => {
  const response = await fetch(`${API_URL}/gpm`);

  if (!response.ok) {
    throw new Error("Failed to fetch GPM data");
  }

  const result = await response.json();

  return result.data;
};

export const getTarget = async () => {
  const response = await fetch(`${API_URL}/target`);

  if (!response.ok) {
    throw new Error("Failed to fetch target data");
  }

  const result = await response.json();

  return result.data;
};

export const getDetailCost = async () => {
  const response = await fetch(`${API_URL}/detail-cost`);

  if (!response.ok) {
    throw new Error("Failed to fetch detail cost data");
  }

  const result = await response.json();

  return result.data;
};
