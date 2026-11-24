import React, { useEffect, useMemo, useState } from "react";
import Chart from "react-apexcharts";
import ApexCharts from "apexcharts";
import type { ApexOptions } from "apexcharts";
import { getGpm, getTarget, getDetailCost } from "../services/dashboardService";
import MultiSelect from "../components/dashboard/MultiSelect";
import { Target, TrendingUp, Gauge, Wallet, ChartNoAxesCombined, PieChart, ReceiptText, ChevronLeft, ChevronRight, RefreshCw, XCircle } from "lucide-react";

type GpmRow = {
  id?: number;
  periode_bulan: string;
  revenue_payroll_bapp: number | string | null;
  cost_payroll: number | string | null;
};

type TargetRow = {
  id?: number;
  periode_bulan: string;
  nominal_target_sustain: number | string | null;
  nominal_target_scaling: number | string | null;
  realisasi_sustain: number | string | null;
  realisasi_scaling: number | string | null;
};

type CostRow = {
  periode_bulan: string;
  beban_jarkom: number | string | null;
  beban_jasnaker: number | string | null;
  beban_kerjasama_pihak_ketiga: number | string | null;
  beban_lain_lain: number | string | null;
  beban_mandatory_gedung: number | string | null;
  depresiasi: number | string | null;
  total: number | string | null;
};

type MonthlyData = {
  key: string;
  periode_bulan: string;
  label: string;
  targetRevenue: number;
  realisasiRevenue: number;
  revenue: number;
  cost: number;
  achievement: number | null;
  gpm: number | null;
};

const MONTH_NAMES = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

const parseNumber = (value: unknown): number => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (value === null || value === undefined || value === "") {
    return 0;
  }

  let str = String(value).trim().replace(/\s/g, "").replace(/^Rp/i, "");

  // Format Indonesia: 12.456.452.904 atau 12.456.452,50
  if (str.includes(",")) {
    str = str.replace(/\./g, "").replace(",", ".");
  } else {
    // Format angka dengan pemisah ribuan titik:
    // 12.456.452.904 -> 12456452904
    // Angka desimal API 12456452904.00 tetap dipertahankan.
    const parts = str.split(".");
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      str = str.replace(/\./g, "");
    }
  }

  const parsed = Number(str);
  return Number.isFinite(parsed) ? parsed : 0;
};

const MONTH_MAP: Record<string, number> = {
  jan: 0,
  januari: 0,
  january: 0,
  feb: 1,
  februari: 1,
  february: 1,
  mar: 2,
  maret: 2,
  march: 2,
  apr: 3,
  april: 3,
  mei: 4,
  may: 4,
  jun: 5,
  juni: 5,
  june: 5,
  jul: 6,
  juli: 6,
  july: 6,
  agu: 7,
  agt: 7,
  agustus: 7,
  aug: 7,
  august: 7,
  sep: 8,
  september: 8,
  okt: 9,
  oktober: 9,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  des: 11,
  desember: 11,
  dec: 11,
  december: 11,
};

type SlashDateOrder = "DMY" | "MDY";

const parseDate = (value: string | Date | null | undefined, slashDateOrder: SlashDateOrder = "DMY"): Date | null => {
  if (!value) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return new Date(value.getFullYear(), value.getMonth(), 1);
  }

  const text = String(value).trim();
  if (!text) return null;

  // Format nama bulan: Jan-26, Feb-26, Januari 2026, dan sejenisnya.
  const monthTextMatch = text.match(/^([A-Za-z]+)[\s-]+(\d{2,4})$/);
  if (monthTextMatch) {
    const month = MONTH_MAP[monthTextMatch[1].toLowerCase()];
    let year = Number(monthTextMatch[2]);

    if (month !== undefined) {
      if (year < 100) year += 2000;
      return new Date(year, month, 1);
    }
  }

  // Format tanggal dengan garis miring.
  // TARGET dan DETAIL COST memakai MM/DD/YYYY dari sumber datanya,
  // sedangkan GPM memakai DD/MM/YYYY.
  const slashDateMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashDateMatch) {
    const first = Number(slashDateMatch[1]);
    const second = Number(slashDateMatch[2]);
    const year = Number(slashDateMatch[3]);
    const month = slashDateOrder === "MDY" ? first : second;
    const day = slashDateOrder === "MDY" ? second : first;

    if (month >= 1 && month <= 12 && day >= 1 && day <= new Date(year, month, 0).getDate()) {
      return new Date(year, month - 1, 1);
    }
    return null;
  }

  // Format ISO YYYY-MM-DD atau YYYY-MM.
  // Ambil tahun dan bulan langsung agar tidak terkena pergeseran timezone.
  const isoMatch = text.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?(?:[T\s].*)?$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    if (month >= 1 && month <= 12) {
      return new Date(year, month - 1, 1);
    }
    return null;
  }

  // Fallback untuk format tanggal lain yang valid.
  const fallbackDate = new Date(text);
  if (!Number.isNaN(fallbackDate.getTime())) {
    return new Date(fallbackDate.getFullYear(), fallbackDate.getMonth(), 1);
  }

  return null;
};

// Normalisasi periode dari PostgreSQL. Untuk DATE/TIMESTAMP ISO,
// ambil YYYY-MM langsung dari string agar tidak bergeser karena timezone
// atau terpengaruh aturan parsing tanggal slash dari endpoint lain.
const parsePeriodDate = (value: string | Date | null | undefined, slashDateOrder: SlashDateOrder = "DMY"): Date | null => {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return new Date(value.getFullYear(), value.getMonth(), 1);
  }

  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return null;

  // ISO timestamp berzona waktu dikonversi ke tanggal lokal browser.
  // 2025-12-31T17:00:00.000Z = 1 Januari 2026 pukul 00:00 WIB.
  const hasTimezone = /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(text);

  if (hasTimezone) {
    const timestamp = new Date(text);
    if (Number.isNaN(timestamp.getTime())) return null;
    return new Date(timestamp.getFullYear(), timestamp.getMonth(), 1);
  }

  // DATE PostgreSQL dalam bentuk YYYY-MM-DD dibaca langsung tanpa timezone.
  const isoDateMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoDateMatch) {
    const year = Number(isoDateMatch[1]);
    const month = Number(isoDateMatch[2]);
    const day = Number(isoDateMatch[3]);

    if (month >= 1 && month <= 12 && day >= 1 && day <= new Date(year, month, 0).getDate()) {
      return new Date(year, month - 1, 1);
    }
    return null;
  }

  // Periode tanpa hari: YYYY-MM.
  const isoMonthMatch = text.match(/^(\d{4})-(\d{1,2})$/);
  if (isoMonthMatch) {
    const year = Number(isoMonthMatch[1]);
    const month = Number(isoMonthMatch[2]);
    if (month >= 1 && month <= 12) return new Date(year, month - 1, 1);
    return null;
  }

  return parseDate(text, slashDateOrder);
};

// Kunci periode tunggal agar filter, label tabel, dan opsi tahun selalu
// membaca bulan/tahun dari nilai periode yang sama.
const getPeriodKey = (value: string | Date | null | undefined, slashDateOrder: SlashDateOrder = "DMY"): string | null => {
  const date = parsePeriodDate(value, slashDateOrder);
  if (!date) return null;

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};


const getYear = (value: string | Date, slashDateOrder: SlashDateOrder = "DMY"): number | null => {
  const key = getPeriodKey(value, slashDateOrder);
  return key ? Number(key.split("-")[0]) : null;
};

const getMonthYearLabel = (value: string): string => {
  const key = getPeriodKey(value, "DMY");
  if (!key) return value;

  const [year, month] = key.split("-");
  return `${MONTH_NAMES[Number(month) - 1].slice(0, 3)} ${year}`;
};

const formatRupiah = (value: number): string => {
  return `Rp ${new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(value)}`;
};

const formatCompactRupiah = (value: number): string => {
  if (!Number.isFinite(value)) return "Rp 0";

  const absolute = Math.abs(value);

  if (absolute >= 1_000_000_000_000) {
    return `Rp ${(value / 1_000_000_000_000).toFixed(2).replace(".", ",")} Triliun`;
  }

  if (absolute >= 1_000_000_000) {
    return `Rp ${(value / 1_000_000_000).toFixed(2).replace(".", ",")} Miliar`;
  }

  if (absolute >= 1_000_000) {
    return `Rp ${(value / 1_000_000).toFixed(2).replace(".", ",")} Juta`;
  }

  if (absolute >= 1_000) {
    return `Rp ${(value / 1_000).toFixed(2).replace(".", ",")} Ribu`;
  }

  return `Rp ${value.toLocaleString("id-ID")}`;
};

const formatChartValue = (value: number): string => {
  const absolute = Math.abs(value);
  const compact = (number: number, digits = 1) =>
    number.toLocaleString("id-ID", {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits,
    });

  // Gunakan singkatan yang konsisten dan pertahankan angka desimal
  // agar label sumbu tidak kehilangan informasi nominal.
  if (absolute >= 1_000_000_000_000) {
    return `Rp ${compact(value / 1_000_000_000_000, 2)} T`;
  }
  if (absolute >= 1_000_000_000) {
    return `Rp ${compact(value / 1_000_000_000, 2)} M`;
  }
  if (absolute >= 1_000_000) {
    return `Rp ${compact(value / 1_000_000, 1)} jt`;
  }
  if (absolute >= 1_000) {
    return `Rp ${compact(value / 1_000, 1)} rb`;
  }
  return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
};

const chartBaseTextColor = "#8292a6";
const chartAxisLine = "rgba(194, 210, 228, 0.12)";
const chartSplitLine = "rgba(194, 210, 228, 0.07)";

/* =========================================================
   COMPONENT
========================================================= */

const CostDashboard: React.FC = () => {
  const REVENUE_TARGET_CHART_ID = "cost-dashboard-revenue-target";
  const REVENUE_COST_CHART_ID = "cost-dashboard-revenue-cost";
  const [hiddenRevenueTargetSeries, setHiddenRevenueTargetSeries] = useState<string[]>([]);
  const [hiddenRevenueCostSeries, setHiddenRevenueCostSeries] = useState<string[]>([]);

  const toggleChartSeries = (chartId: string, seriesName: string, setHiddenSeries: React.Dispatch<React.SetStateAction<string[]>>) => {
    ApexCharts.exec(chartId, "toggleSeries", seriesName);
    setHiddenSeries((current) => (current.includes(seriesName) ? current.filter((name) => name !== seriesName) : [...current, seriesName]));
  };
  const [gpmData, setGpmData] = useState<GpmRow[]>([]);
  const [targetData, setTargetData] = useState<TargetRow[]>([]);
  const [detailCostData, setDetailCostData] = useState<CostRow[]>([]);

  // Array kosong berarti semua bulan atau tahun.
  const [selectedMonth, setSelectedMonth] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  /* =========================================================
     FETCH DATA
  ========================================================= */

  useEffect(() => {
    let isMounted = true;
    let isFirstLoad = true;
    let isFetching = false;

    const loadData = async () => {
      // Hindari request bertumpuk jika request sebelumnya belum selesai.
      if (isFetching) return;
      isFetching = true;

      try {
        if (isMounted && isFirstLoad) setLoading(true);
        if (isMounted) setError("");

        // Ambil ulang data langsung dari endpoint yang terhubung ke Aiven.
        const [gpm, target, detailCost] = await Promise.all([getGpm(), getTarget(), getDetailCost()]);

        if (!isMounted) return;

        setGpmData(Array.isArray(gpm) ? gpm : []);
        setTargetData(Array.isArray(target) ? target : []);
        setDetailCostData(
          Array.isArray(detailCost)
            ? [...detailCost].sort((a, b) => {
                const keyA = getPeriodKey(a.periode_bulan, "MDY") ?? "";
                const keyB = getPeriodKey(b.periode_bulan, "MDY") ?? "";
                return keyA.localeCompare(keyB);
              })
            : [],
        );
      } catch (err) {
        console.error("Gagal refresh Dashboard Target & Cost:", err);
        if (isMounted) {
          // Jangan menghapus data lama jika refresh berkala gagal.
          setError((previousError) => (isFirstLoad ? "Gagal mengambil data Dashboard Target & Cost." : previousError));
        }
      } finally {
        isFetching = false;
        if (isMounted && isFirstLoad) {
          setLoading(false);
          isFirstLoad = false;
        }
      }
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void loadData();
      }
    };

    void loadData();

    // Sinkronkan dashboard secara berkala dengan data terbaru di database.
    const refreshInterval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadData();
      }
    }, 30_000);

    // Saat user kembali ke tab dashboard, langsung ambil data terbaru.
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      isMounted = false;
      window.clearInterval(refreshInterval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

  /* =========================================================
     YEAR OPTIONS
  ========================================================= */

  const years = useMemo(() => {
    const yearSet = new Set<number>();

    gpmData.forEach((row) => {
      const year = getYear(row.periode_bulan, "DMY");
      if (year) yearSet.add(year);
    });

    targetData.forEach((row) => {
      const year = getYear(row.periode_bulan, "MDY");
      if (year) yearSet.add(year);
    });

    detailCostData.forEach((row) => {
      const year = getYear(row.periode_bulan, "MDY");
      if (year) yearSet.add(year);
    });

    return Array.from(yearSet).sort((a, b) => b - a);
  }, [gpmData, targetData, detailCostData]);

  /* =========================================================
     FILTER GPM
  ========================================================= */

  const filteredGpm = useMemo(() => {
    return gpmData.filter((row) => {
      const periodKey = getPeriodKey(row.periode_bulan, "DMY");
      if (!periodKey) return false;

      const [yearText, monthText] = periodKey.split("-");
      const monthName = MONTH_NAMES[Number(monthText) - 1];

      const monthMatch = selectedMonth.length === 0 || selectedMonth.includes(monthName);
      const yearMatch = selectedYear.length === 0 || selectedYear.includes(yearText);

      return monthMatch && yearMatch;
    });
  }, [gpmData, selectedMonth, selectedYear]);

  /* =========================================================
     FILTER TARGET
  ========================================================= */

  const filteredTarget = useMemo(() => {
    return targetData.filter((row) => {
      const periodKey = getPeriodKey(row.periode_bulan, "MDY");
      if (!periodKey) return false;

      const [yearText, monthText] = periodKey.split("-");
      const monthName = MONTH_NAMES[Number(monthText) - 1];

      const monthMatch = selectedMonth.length === 0 || selectedMonth.includes(monthName);
      const yearMatch = selectedYear.length === 0 || selectedYear.includes(yearText);

      return monthMatch && yearMatch;
    });
  }, [targetData, selectedMonth, selectedYear]);

  /* =========================================================
     FILTER DETAIL COST
  ========================================================= */

  const filteredDetailCost = useMemo(() => {
    return detailCostData.filter((row) => {
      const periodKey = getPeriodKey(row.periode_bulan, "MDY");
      if (!periodKey) return false;

      const [yearText, monthText] = periodKey.split("-");
      const monthName = MONTH_NAMES[Number(monthText) - 1];

      const monthMatch = selectedMonth.length === 0 || selectedMonth.includes(monthName);
      const yearMatch = selectedYear.length === 0 || selectedYear.includes(yearText);

      return monthMatch && yearMatch;
    });
  }, [detailCostData, selectedMonth, selectedYear]);

  /* =========================================================
     MONTHLY DATA: TARGET & REVENUE
  ========================================================= */

  const monthlyData = useMemo<MonthlyData[]>(() => {
    const monthMap = new Map<
      string,
      {
        periode_bulan: string;
        targetRevenue: number;
        realisasiRevenue: number;
        revenue: number;
        cost: number;
      }
    >();

    targetData.forEach((row) => {
      const date = parsePeriodDate(row.periode_bulan, "MDY");

      if (!date) return;

      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      const current = monthMap.get(key) ?? {
        periode_bulan: row.periode_bulan,
        targetRevenue: 0,
        realisasiRevenue: 0,
        revenue: 0,
        cost: 0,
      };

      current.targetRevenue = parseNumber(row.nominal_target_sustain) + parseNumber(row.nominal_target_scaling);

      current.realisasiRevenue = parseNumber(row.realisasi_sustain) + parseNumber(row.realisasi_scaling);

      monthMap.set(key, current);
    });

    gpmData.forEach((row) => {
      const date = parsePeriodDate(row.periode_bulan, "DMY");

      if (!date) return;

      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      const current = monthMap.get(key) ?? {
        periode_bulan: row.periode_bulan,
        targetRevenue: 0,
        realisasiRevenue: 0,
        revenue: 0,
        cost: 0,
      };

      current.revenue = parseNumber(row.revenue_payroll_bapp);
      current.cost = parseNumber(row.cost_payroll);

      monthMap.set(key, current);
    });

    return Array.from(monthMap.entries())
      .filter(([key]) => {
        const [yearText, monthText] = key.split("-");
        const month = Number(monthText);

        const monthMatch = selectedMonth.length === 0 || selectedMonth.includes(MONTH_NAMES[month - 1]);

        const yearMatch = selectedYear.length === 0 || selectedYear.includes(yearText);

        return monthMatch && yearMatch;
      })
      .map(([key, row]) => ({
        key,
        periode_bulan: row.periode_bulan,
        label: `${MONTH_NAMES[Number(key.split("-")[1]) - 1].slice(0, 3)} ${key.split("-")[0]}`,
        targetRevenue: row.targetRevenue,
        realisasiRevenue: row.realisasiRevenue,
        revenue: row.revenue,
        cost: row.cost,
        achievement: row.targetRevenue > 0 ? (row.realisasiRevenue / row.targetRevenue) * 100 : null,
        gpm: row.revenue > 0 ? ((row.revenue - row.cost) / row.revenue) * 100 : null,
      }))
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [targetData, gpmData, selectedMonth, selectedYear]);

  /* =========================================================
     KPI
  ========================================================= */

  const kpi = useMemo(() => {
    const targetRevenue = filteredTarget.reduce((sum, row) => sum + parseNumber(row.nominal_target_sustain) + parseNumber(row.nominal_target_scaling), 0);

    const realisasiRevenue = filteredTarget.reduce((sum, row) => sum + parseNumber(row.realisasi_sustain) + parseNumber(row.realisasi_scaling), 0);

    const revenue = filteredGpm.reduce((sum, row) => sum + parseNumber(row.revenue_payroll_bapp), 0);

    const cost = filteredGpm.reduce((sum, row) => sum + parseNumber(row.cost_payroll), 0);

    const achievement = targetRevenue > 0 ? (realisasiRevenue / targetRevenue) * 100 : 0;

    const gpm = revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0;

    const costRatio = revenue > 0 ? (cost / revenue) * 100 : 0;

    return {
      targetRevenue,
      realisasiRevenue,
      achievement,
      gpm,
      revenue,
      cost,
      costRatio,
    };
  }, [filteredTarget, filteredGpm]);

  /* =========================================================
     TARGET PERFORMANCE: TARGET VS REALISASI
  ========================================================= */

  const targetProgress = useMemo(() => {
    if (filteredTarget.length === 0) return null;

    const targetSustain = filteredTarget.reduce((sum, row) => sum + parseNumber(row.nominal_target_sustain), 0);
    const realisasiSustain = filteredTarget.reduce((sum, row) => sum + parseNumber(row.realisasi_sustain), 0);
    const targetScaling = filteredTarget.reduce((sum, row) => sum + parseNumber(row.nominal_target_scaling), 0);
    const realisasiScaling = filteredTarget.reduce((sum, row) => sum + parseNumber(row.realisasi_scaling), 0);

    return {
      sustain: {
        target: targetSustain,
        realisasi: realisasiSustain,
        percentage: targetSustain > 0 ? (realisasiSustain / targetSustain) * 100 : 0,
      },
      scaling: {
        target: targetScaling,
        realisasi: realisasiScaling,
        percentage: targetScaling > 0 ? (realisasiScaling / targetScaling) * 100 : 0,
      },
    };
  }, [filteredTarget]);

  /* =========================================================
     COST SUMMARY: BREAKDOWN PER KATEGORI
  ========================================================= */

  const costSummary = useMemo(() => {
    const summary = {
      beban_jarkom: 0,
      beban_jasnaker: 0,
      beban_kerjasama_pihak_ketiga: 0,
      beban_lain_lain: 0,
      beban_mandatory_gedung: 0,
      depresiasi: 0,
      total: 0,
    };

    filteredDetailCost.forEach((row) => {
      summary.beban_jarkom += parseNumber(row.beban_jarkom);
      summary.beban_jasnaker += parseNumber(row.beban_jasnaker);

      summary.beban_kerjasama_pihak_ketiga += parseNumber(row.beban_kerjasama_pihak_ketiga);

      summary.beban_lain_lain += parseNumber(row.beban_lain_lain);

      summary.beban_mandatory_gedung += parseNumber(row.beban_mandatory_gedung);

      summary.depresiasi += parseNumber(row.depresiasi);
      summary.total += parseNumber(row.total);
    });

    const components = [
      {
        name: "Beban Jarkom",
        value: summary.beban_jarkom,
      },
      {
        name: "Beban Jasnaker",
        value: summary.beban_jasnaker,
      },
      {
        name: "Beban Kerjasama Pihak Ketiga",
        value: summary.beban_kerjasama_pihak_ketiga,
      },
      {
        name: "Beban Lain-lain",
        value: summary.beban_lain_lain,
      },
      {
        name: "Beban Mandatory Gedung",
        value: summary.beban_mandatory_gedung,
      },
      {
        name: "Depresiasi",
        value: summary.depresiasi,
      },
    ]
      .filter((item) => item.value !== 0)
      .sort((a, b) => b.value - a.value)
      .map((item) => ({
        ...item,
        percentage: summary.total !== 0 ? (item.value / summary.total) * 100 : 0,
      }));

    return {
      ...summary,
      components,
    };
  }, [filteredDetailCost]);

  /* =========================================================
     APEXCHARTS: TARGET VS REALISASI REVENUE
     Tampilan chart diperbarui; ukuran container dashboard tetap.
  ========================================================= */

  const revenueTargetSeries = useMemo(
    () => [
      {
        name: "Target Revenue",
        type: "column" as const,
        data: monthlyData.map((item) => item.targetRevenue),
      },
      {
        name: "Realisasi Revenue",
        type: "column" as const,
        data: monthlyData.map((item) => item.realisasiRevenue),
      },
      {
        name: "Achievement",
        type: "line" as const,
        data: monthlyData.map((item) => item.achievement),
      },
    ],
    [monthlyData],
  );

  const revenueTargetOptions = useMemo<ApexOptions>(() => {
    // Skala nominal dibuat rapat dan konsisten: maksimum hanya sedikit
    // di atas nilai tertinggi, bukan dikalikan 6 sehingga ruang kosong berlebihan.
    const maxNominal = Math.max(0, ...monthlyData.flatMap((item) => [item.targetRevenue, item.realisasiRevenue]));
    const safeMax = maxNominal > 0 ? maxNominal : 1;
    const rawStep = safeMax / 5;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const normalizedStep = rawStep / magnitude;
    const niceFactor = normalizedStep <= 1 ? 1 : normalizedStep <= 2 ? 2 : normalizedStep <= 2.5 ? 2.5 : normalizedStep <= 5 ? 5 : 10;
    const nominalStep = niceFactor * magnitude;
    const nominalAxisMax = Math.ceil(safeMax / nominalStep) * nominalStep + nominalStep;
    const nominalTickAmount = Math.round(nominalAxisMax / nominalStep);

    return {
      chart: {
        id: "cost-dashboard-revenue-target",
        type: "line",
        height: 270,
        background: "transparent",
        foreColor: chartBaseTextColor,
        fontFamily: "inherit",
        toolbar: { show: false },
        zoom: { enabled: false },
        parentHeightOffset: 0,
        redrawOnParentResize: true,
        redrawOnWindowResize: true,
        animations: {
          enabled: true,
          speed: 700,
          animateGradually: { enabled: true, delay: 80 },
          dynamicAnimation: { enabled: true, speed: 350 },
        },
      },
      theme: { mode: "dark" },
      colors: ["#3B82F6", "#00D3A7", "#FFB020"],
      stroke: {
        width: [0, 0, 3.5],
        curve: ["straight", "straight", "smooth"],
        lineCap: "round",
        dashArray: [0, 0, 0],
      },
      fill: {
        type: "solid",
        opacity: 1,
      },
      plotOptions: {
        bar: {
          columnWidth: "54%",
          borderRadius: 6,
          borderRadiusApplication: "end",
          borderRadiusWhenStacked: "last",
        },
      },
      dataLabels: { enabled: false },
      markers: {
        size: [0, 0, 4],
        strokeWidth: 2,
        strokeColors: "#172638",
        colors: ["#FFB020"],
        hover: { size: 6 },
      },
      xaxis: {
        categories: monthlyData.map((item) => item.label),
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: {
          style: { colors: chartBaseTextColor, fontSize: "11px", fontWeight: 500 },
          rotate: 0,
          rotateAlways: false,
          hideOverlappingLabels: false,
          trim: false,
        },
        tooltip: { enabled: false },
      },
      yaxis: [
        {
          min: 0,
          max: nominalAxisMax,
          tickAmount: nominalTickAmount,
          forceNiceScale: false,
          // Kedua seri nominal harus berada pada sumbu kiri yang sama.
          seriesName: ["Target Revenue", "Realisasi Revenue"],
          labels: {
            formatter: (value: number) => formatChartValue(value),
            minWidth: 66,
            maxWidth: 74,
            offsetX: -1,
            style: { colors: chartBaseTextColor, fontSize: "10px" },
          },
          title: {
            text: "Nominal Revenue",
            style: { color: chartBaseTextColor, fontSize: "10px", fontWeight: 500 },
          },
        },
        {
          seriesName: "Achievement",
          opposite: true,
          min: 0,
          max: Math.max(100, Math.ceil(Math.max(...monthlyData.map((item) => item.achievement ?? 0), 100) / 20) * 20),
          tickAmount: 5,
          labels: {
            formatter: (value: number) => `${value.toFixed(0)}%`,
            style: { colors: "#FFC65C", fontSize: "10px" },
          },
          title: {
            text: "Achievement",
            style: { color: "#FFB020", fontSize: "10px", fontWeight: 600 },
          },
        },
      ],
      grid: {
        borderColor: "rgba(148,163,184,0.13)",
        strokeDashArray: 3,
        padding: { left: 2, right: 4, top: 4, bottom: 0 },
      },
      legend: { show: false },
      tooltip: {
        theme: "dark",
        shared: true,
        intersect: false,
        followCursor: true,
        y: [
          { formatter: (value: number) => (Number.isFinite(value) ? formatRupiah(value) : "-") },
          { formatter: (value: number) => (Number.isFinite(value) ? formatRupiah(value) : "-") },
          {
            formatter: (value: number | null) => (value == null || !Number.isFinite(value) ? "-" : `${value.toLocaleString("id-ID", { maximumFractionDigits: 2 })}%`),
          },
        ],
      },
      responsive: [
        {
          breakpoint: 640,
          options: {
            chart: { height: 270 },
            xaxis: {
              labels: {
                rotate: -35,
                rotateAlways: true,
                hideOverlappingLabels: false,
                trim: false,
                style: { fontSize: "9px" },
              },
            },
            yaxis: [{ labels: { style: { fontSize: "9px" } } }, { labels: { style: { fontSize: "9px" } } }],
            grid: { padding: { left: 2, right: 2, top: 0, bottom: 0 } },
          },
        },
      ],
      noData: {
        text: "Tidak ada data",
        style: { color: chartBaseTextColor, fontSize: "12px" },
      },
    };
  }, [monthlyData]);

  /* =========================================================
     APEXCHARTS: REVENUE VS COST PAYROLL & GPM
  ========================================================= */

  const revenueCostData = useMemo(() => monthlyData.filter((item) => item.revenue !== 0 || item.cost !== 0), [monthlyData]);

  const revenueCostSeries = useMemo(
    () => [
      {
        name: "Revenue Payroll BAPP",
        type: "column" as const,
        data: revenueCostData.map((item) => item.revenue),
      },
      {
        name: "Cost Payroll",
        type: "column" as const,
        data: revenueCostData.map((item) => item.cost),
      },
      {
        name: "GPM",
        type: "area" as const,
        data: revenueCostData.map((item) => item.gpm),
      },
    ],
    [revenueCostData],
  );

  const revenueCostGpmBounds = useMemo(() => {
    const values = revenueCostData.map((item) => item.gpm).filter((value): value is number => value != null && Number.isFinite(value));
    const dataMin = values.length ? Math.min(...values) : 0;
    const dataMax = values.length ? Math.max(...values) : 100;
    const min = Math.min(0, Math.floor(dataMin / 10) * 10);
    const max = Math.max(100, Math.ceil(dataMax / 10) * 10);
    return { min, max: max === min ? min + 10 : max };
  }, [revenueCostData]);

  const revenueCostOptions = useMemo<ApexOptions>(
    () => ({
      chart: {
        id: "cost-dashboard-revenue-cost",
        type: "line",
        height: 270,
        background: "transparent",
        foreColor: chartBaseTextColor,
        fontFamily: "inherit",
        toolbar: { show: false },
        zoom: { enabled: false },
        parentHeightOffset: 0,
        redrawOnParentResize: true,
        redrawOnWindowResize: true,
        animations: { enabled: true, speed: 700 },
      },
      theme: { mode: "dark" },
      colors: ["#00D3A7", "#FF7058", "#A78BFA"],
      stroke: {
        width: [0, 0, 3.5],
        curve: "smooth",
        lineCap: "round",
      },
      fill: {
        type: ["solid", "solid", "solid"],
        opacity: [1, 1, 0.16],
      },
      plotOptions: {
        bar: {
          columnWidth: "46%",
          borderRadius: 5,
          borderRadiusApplication: "end",
        },
      },
      dataLabels: { enabled: false },
      markers: {
        size: [0, 0, 4],
        strokeWidth: 2,
        strokeColors: "#172638",
        hover: { size: 6 },
      },
      xaxis: {
        categories: revenueCostData.map((item) => item.label),
        axisBorder: { color: chartAxisLine },
        axisTicks: { show: false },
        labels: {
          style: { colors: chartBaseTextColor, fontSize: "10px", fontWeight: 500 },
          rotate: -35,
          rotateAlways: false,
          hideOverlappingLabels: true,
        },
      },
      yaxis: [
        {
          min: 0,
          // Revenue dan Cost menggunakan skala nominal yang identik.
          seriesName: ["Revenue Payroll BAPP", "Cost Payroll"],
          labels: {
            formatter: (value: number) => formatChartValue(value),
            minWidth: 66,
            maxWidth: 74,
            offsetX: -1,
            style: { colors: chartBaseTextColor, fontSize: "10px" },
          },
          title: {
            text: "Nominal",
            style: { color: chartBaseTextColor, fontSize: "10px", fontWeight: 500 },
          },
        },
        {
          seriesName: "GPM",
          opposite: true,
          min: revenueCostGpmBounds.min,
          max: revenueCostGpmBounds.max,
          tickAmount: 5,
          labels: {
            formatter: (value: number) => `${value.toFixed(0)}%`,
            style: { colors: "#C4B5FD", fontSize: "10px" },
          },
          title: {
            text: "GPM",
            style: { color: "#A78BFA", fontSize: "10px", fontWeight: 600 },
          },
        },
      ],
      grid: {
        borderColor: chartSplitLine,
        strokeDashArray: 4,
        padding: { left: 2, right: 4, top: 4, bottom: 0 },
      },
      legend: { show: false },
      tooltip: {
        theme: "dark",
        shared: true,
        intersect: false,
        followCursor: true,
        y: [
          { formatter: (value: number) => (Number.isFinite(value) ? formatRupiah(value) : "-") },
          { formatter: (value: number) => (Number.isFinite(value) ? formatRupiah(value) : "-") },
          {
            formatter: (value: number | null) => (value == null || !Number.isFinite(value) ? "-" : `${value.toLocaleString("id-ID", { maximumFractionDigits: 2 })}%`),
          },
        ],
      },
      responsive: [
        {
          breakpoint: 640,
          options: {
            chart: { height: 270 },
            xaxis: {
              labels: {
                rotate: -45,
                rotateAlways: false,
                style: { fontSize: "9px" },
              },
            },
            yaxis: [{ labels: { style: { fontSize: "9px" } } }, { labels: { style: { fontSize: "9px" } } }],
            grid: { padding: { left: 2, right: 2, top: 0, bottom: 0 } },
          },
        },
      ],
      noData: {
        text: "Tidak ada data",
        style: { color: chartBaseTextColor, fontSize: "12px" },
      },
    }),
    [revenueCostData, revenueCostGpmBounds],
  );

  /* =========================================================
     APEXCHARTS: BIAYA PER KATEGORI
  ========================================================= */

  const costCategorySeries = useMemo(
    () => [
      {
        name: "Nominal Biaya",
        data: costSummary.components.map((item) => item.value),
      },
    ],
    [costSummary],
  );

  const costCategoryOptions = useMemo<ApexOptions>(() => {
    // Sisakan ruang di sisi kanan agar label persentase tampil di luar batang
    // dan tidak terpotong oleh batas area plot.
    const maxCategoryValue = Math.max(0, ...costSummary.components.map((item) => item.value));
    const categoryAxisMax = maxCategoryValue > 0 ? maxCategoryValue * 1.28 : 1;

    return {
      chart: {
        type: "bar",
        height: 200,
        width: "100%",
        background: "transparent",
        foreColor: chartBaseTextColor,
        fontFamily: "inherit",
        toolbar: { show: false },
        parentHeightOffset: 0,
        redrawOnParentResize: true,
        redrawOnWindowResize: true,
        animations: { enabled: true, speed: 650 },
      },
      theme: { mode: "dark" },
      colors: ["#FFB020"],
      plotOptions: {
        bar: {
          horizontal: true,
          barHeight: "58%",
          borderRadius: 5,
          borderRadiusApplication: "end",
          distributed: true,
          // Untuk horizontal bar, posisi top menempatkan data label di ujung kanan batang.
          dataLabels: { position: "top" },
        },
      },
      fill: {
        type: "solid",
        opacity: 1,
      },
      dataLabels: {
        enabled: true,
        // Mulai teks setelah ujung batang, bukan menumpuk di atas batang.
        textAnchor: "start",
        offsetX: 12,
        background: { enabled: false },
        style: {
          colors: ["#ffffff"],
          fontSize: "12px",
          fontWeight: 700,
        },
        formatter: (_value: number, opts?: { dataPointIndex?: number }) => {
          const index = opts?.dataPointIndex ?? -1;
          const percentage = costSummary.components[index]?.percentage;

          return percentage == null ? "" : `${percentage.toFixed(1)}%`;
        },
      },
      xaxis: {
        min: 0,
        max: categoryAxisMax,
        tickAmount: 5,
        categories: costSummary.components.map((item) => item.name),
        labels: {
          formatter: (value: string) => {
            const amount = Number(value);
            if (!Number.isFinite(amount)) return "";
            if (Math.abs(amount) >= 1_000_000) {
              return `Rp ${Math.round(amount / 1_000_000).toLocaleString("id-ID")} jt`;
            }
            return `Rp ${Math.round(amount / 1_000).toLocaleString("id-ID")} rb`;
          },
          style: { colors: chartBaseTextColor, fontSize: "9px" },
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          style: { colors: "#d8e0eb", fontSize: "11px", fontWeight: 500 },
          // Tambah ruang untuk label terpanjang tanpa mengunci minWidth,
          // sehingga ApexCharts tetap bisa menyesuaikan area plot.
          maxWidth: 245,
          offsetX: 0,
        },
      },
      grid: {
        borderColor: chartSplitLine,
        strokeDashArray: 4,
        // Geser area batang ke kanan supaya label kategori punya ruang sendiri.
        padding: { left: 28, right: 12, top: -6, bottom: -6 },
      },
      legend: { show: false },
      tooltip: {
        theme: "dark",
        y: {
          formatter: (value: number, opts?: { dataPointIndex?: number }) => {
            const index = opts?.dataPointIndex ?? -1;
            const percentage = costSummary.components[index]?.percentage ?? 0;
            return `${formatRupiah(value)} (${percentage.toFixed(1)}%)`;
          },
        },
      },
      noData: {
        text: "Tidak ada data",
        style: { color: chartBaseTextColor, fontSize: "12px" },
      },
    };
  }, [costSummary]);

  const totalPages = Math.max(1, Math.ceil(filteredDetailCost.length / pageSize));
  const paginatedDetailCost = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredDetailCost.slice(startIndex, startIndex + pageSize);
  }, [filteredDetailCost, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  /* =========================================================
     RESET FILTER
  ========================================================= */

  const resetFilters = () => {
    setSelectedMonth([]);
    setSelectedYear([]);
    setCurrentPage(1);
  };

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-3 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-500/20 border-t-blue-400" />

        <div>
          <p className="text-sm font-semibold text-slate-200">Memuat Dashboard Cost & Target</p>
          <p className="mt-1 text-[11px] text-slate-400">Sedang mengambil dan menyiapkan data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] w-full items-center justify-center px-4 py-8">
        <div className="w-full max-w-md rounded-2xl border border-rose-400/20 bg-gradient-to-br from-[#1d2a3b] to-[#172538] p-6 text-center shadow-[0_12px_28px_rgba(0,0,0,0.18)]">
          {/* Error icon */}
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-rose-400/20 bg-rose-400/10">
            <XCircle size={22} className="text-rose-400" />
          </div>

          <h2 className="text-base font-bold text-slate-100">Dashboard Cost & Target Gagal Dimuat</h2>

          <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-slate-400">Data dashboard belum berhasil diambil. Periksa koneksi internet atau coba muat ulang halaman.</p>

          <div className="mt-4 rounded-lg border border-rose-400/10 bg-rose-400/[0.05] p-3 text-left">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-rose-300">Detail Error</p>
            <p className="break-words text-[11px] leading-relaxed text-slate-300">{error}</p>
          </div>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg border border-blue-400/30 bg-blue-500/15 px-4 py-2.5 text-xs font-semibold text-blue-200 transition hover:border-blue-400/50 hover:bg-blue-500/25"
          >
            <RefreshCw size={13} />
            Coba Muat Ulang
          </button>
        </div>
      </div>
    );
  }

  /* =========================================================
     MAIN UI
  ========================================================= */

  return (
    <div className="cost-dashboard-compact-tooltip min-w-0 w-full space-y-3 pb-6 text-slate-200">
      <style>{`
        .cost-dashboard-compact-tooltip .apexcharts-tooltip {
          background: #000000 !important;
          color: #e2e8f0 !important;
          border: 1px solid rgba(148, 163, 184, 0.22) !important;
          border-radius: 8px !important;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.28) !important;
          padding: 0 !important;
          min-width: 0 !important;
          max-width: 280px !important;
          overflow: hidden !important;
          font-family: inherit !important;
        }
        .cost-dashboard-compact-tooltip .apexcharts-tooltip-title {
          background: #000000 !important;
          color: #f1f5f9 !important;
          border-bottom: 1px solid rgba(148, 163, 184, 0.16) !important;
          margin: 0 !important;
          padding: 4px 8px !important;
          font-size: 11px !important;
          font-weight: 700 !important;
          line-height: 1.1 !important;
        }
        .cost-dashboard-compact-tooltip .apexcharts-tooltip-series-group {
          padding: 4px 8px !important;
          margin: 0 !important;
          min-height: 0 !important;
          line-height: 1.1 !important;
          align-items: center !important;
          gap: 5px !important;
        }
        .cost-dashboard-compact-tooltip .apexcharts-tooltip-marker {
          width: 8px !important;
          height: 8px !important;
          margin-right: 5px !important;
          flex: 0 0 8px !important;
        }
        .cost-dashboard-compact-tooltip .apexcharts-tooltip-text,
        .cost-dashboard-compact-tooltip .apexcharts-tooltip-text-y-label,
        .cost-dashboard-compact-tooltip .apexcharts-tooltip-text-y-value,
        .cost-dashboard-compact-tooltip .apexcharts-tooltip-y-group {
          color: #e2e8f0 !important;
          font-size: 11px !important;
          line-height: 1.1 !important;
          padding-top: 0 !important;
          padding-bottom: 0 !important;
          margin: 0 !important;
        }
        .cost-dashboard-compact-tooltip .apexcharts-tooltip-text-y-value {
          color: #f8fafc !important;
          font-weight: 700 !important;
        }
      `}</style>
      {/* HEADER */}
      <header className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <h1 className="text-lg font-extrabold tracking-tight text-slate-50 sm:text-xl">Dashboard Target &amp; Cost</h1>
          <p className="mt-1 text-[11px] text-slate-400">Monitoring target, revenue, dan cost payroll.</p>
          <p className="mt-1.5 text-[10px] text-slate-500">
            Sumber data: <strong className="font-semibold text-slate-400">gpm</strong>, <strong className="font-semibold text-slate-400">target</strong>, dan <strong className="font-semibold text-slate-400">detail_cost</strong>
          </p>
        </div>

        <div className="flex w-fit shrink-0 items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/[0.08] px-3 py-1.5 text-[10px] font-semibold text-emerald-300">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          Data Terhubung
        </div>
      </header>

      {/* FILTER */}
      <section className="relative z-30 mb-4 rounded-[15px] border border-slate-400/15 bg-[linear-gradient(145deg,#1b2b40,#172538)] p-3 shadow-[0_12px_28px_rgba(0,0,0,0.16)] sm:p-[17px_18px_18px]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center">
            <div>
              <span className="mb-0.5 block text-[8px] font-extrabold tracking-[1px] text-blue-300">FILTER DATA</span>
              <h2 className="text-xs font-bold leading-tight text-slate-100">Parameter Dashboard</h2>
            </div>
          </div>

          <button
            type="button"
            className="inline-flex h-8 items-center justify-center gap-2 self-start rounded-lg border border-slate-500/25 bg-white/[0.035] px-3 text-[10px] font-semibold text-slate-400 transition hover:border-blue-400/50 hover:bg-blue-500/10 hover:text-blue-100 sm:self-auto"
            onClick={resetFilters}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />
              <path d="M3 21v-5h5" />
            </svg>

            <span>Reset Filter</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:max-w-[600px]">
          <div className="relative min-w-0">
            <label className="mb-1 block text-[10px] font-bold text-slate-300/80">Bulan</label>

            <MultiSelect value={selectedMonth} options={MONTH_NAMES} placeholder="Semua Bulan" searchPlaceholder="Cari bulan..." onChange={setSelectedMonth} />
          </div>
          <div className="relative min-w-0">
            <label className="mb-1 block text-[10px] font-bold text-slate-300/80">Tahun</label>

            <MultiSelect value={selectedYear} options={years.map((year) => String(year))} placeholder="Semua Tahun" searchPlaceholder="Cari tahun..." onChange={setSelectedYear} />
          </div>
        </div>
      </section>

      {/* KPI */}
      <section className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {/* TARGET REVENUE */}
        <article className="group relative flex min-h-[88px] min-w-0 flex-col justify-between overflow-hidden rounded-lg border border-slate-300/[0.12] border-t-2 border-t-blue-400 bg-gradient-to-br from-[#1d2a3b] via-[#1b2839] to-[#192638] p-2 shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition duration-200 hover:-translate-y-0.5">
          <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-blue-400/[0.08] blur-2xl" />
          <div className="relative flex items-center justify-between gap-1.5">
            <span className="min-w-0 truncate text-[9px] font-bold tracking-wide text-slate-400">Target Revenue</span>
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-400/10 text-blue-300">
              <Target size={13} />
            </span>
          </div>
          <div className="relative mt-1 min-w-0">
            <strong className="block break-words text-base font-extrabold leading-tight tracking-tight text-slate-100" title={formatCompactRupiah(kpi.targetRevenue)}>
              {formatCompactRupiah(kpi.targetRevenue)}
            </strong>
            <p className="mt-0.5 truncate text-[9px] font-medium text-slate-400">Target Sustain + Scaling</p>
          </div>
        </article>

        {/* REALISASI REVENUE */}
        <article className="group relative flex min-h-[88px] min-w-0 flex-col justify-between overflow-hidden rounded-lg border border-slate-300/[0.12] border-t-2 border-t-emerald-400 bg-gradient-to-br from-[#1d2a3b] via-[#1b2839] to-[#192638] p-2 shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition duration-200 hover:-translate-y-0.5">
          <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-emerald-400/[0.08] blur-2xl" />
          <div className="relative flex items-center justify-between gap-1.5">
            <span className="min-w-0 truncate text-[9px] font-bold tracking-wide text-slate-400">Realisasi Revenue</span>
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-400/10 text-emerald-300">
              <TrendingUp size={13} />
            </span>
          </div>
          <div className="relative mt-1 min-w-0">
            <strong className="block break-words text-base font-extrabold leading-tight tracking-tight text-slate-100" title={formatCompactRupiah(kpi.realisasiRevenue)}>
              {formatCompactRupiah(kpi.realisasiRevenue)}
            </strong>
            <p className="mt-0.5 truncate text-[9px] font-medium text-slate-400">Realisasi Sustain + Scaling</p>
          </div>
        </article>

        {/* REVENUE ACHIEVEMENT */}
        <article className="group relative flex min-h-[88px] min-w-0 flex-col justify-between overflow-hidden rounded-lg border border-slate-300/[0.12] border-t-2 border-t-cyan-400 bg-gradient-to-br from-[#1d2a3b] via-[#1b2839] to-[#192638] p-2 shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition duration-200 hover:-translate-y-0.5">
          <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-cyan-400/[0.08] blur-2xl" />
          <div className="relative flex items-center justify-between gap-1.5">
            <span className="min-w-0 truncate text-[9px] font-bold tracking-wide text-slate-400">Revenue Achievement</span>
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-cyan-400/10 text-cyan-300">
              <Gauge size={13} />
            </span>
          </div>
          <div className="relative mt-1 min-w-0">
            <strong className="block text-base font-extrabold leading-tight tracking-tight text-slate-100">{kpi.achievement.toFixed(1)}%</strong>
            <p className="mt-0.5 truncate text-[9px] font-medium text-slate-400">Realisasi Revenue / Target Revenue</p>
          </div>
        </article>

        {/* GPM */}
        <article className="group relative flex min-h-[88px] min-w-0 flex-col justify-between overflow-hidden rounded-lg border border-slate-300/[0.12] border-t-2 border-t-amber-400 bg-gradient-to-br from-[#1d2a3b] via-[#1b2839] to-[#192638] p-2 shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition duration-200 hover:-translate-y-0.5">
          <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-amber-400/[0.08] blur-2xl" />
          <div className="relative flex items-center justify-between gap-1.5">
            <span className="min-w-0 truncate text-[9px] font-bold tracking-wide text-slate-400">GPM</span>
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-amber-400/10 text-amber-300">
              <Wallet size={13} />
            </span>
          </div>
          <div className="relative mt-1 min-w-0">
            <strong className="block text-base font-extrabold leading-tight tracking-tight text-slate-100">{kpi.gpm.toFixed(1)}%</strong>
            <p className="mt-0.5 truncate text-[9px] font-medium text-slate-400">Revenue Payroll BAPP - Cost Payroll</p>
          </div>
        </article>
      </section>

      {/* CHART TARGET VS REALISASI */}
      <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-400/15 bg-[linear-gradient(145deg,#1c2d42,#172638)] shadow-[0_12px_28px_rgba(0,0,0,0.14)]">
        <div className="flex items-center gap-3 border-b border-slate-400/10 px-4 py-3.5 sm:px-[18px]">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-400/10 text-blue-300">
            <ChartNoAxesCombined size={17} />
          </div>

          <div className="min-w-0">
            <h3 className="m-0 text-[13px] font-bold text-slate-100">Tren Target dan Realisasi Revenue Bulanan</h3>
            <p className="mt-1 text-[10px] leading-snug text-slate-400">Perbandingan target, realisasi, dan pencapaian revenue setiap bulan</p>
          </div>
        </div>

        <div className="relative min-w-0 px-0 py-1.5">
          {monthlyData.length ? (
            <>
              <div className="pointer-events-auto absolute right-3 top-2 z-10 flex flex-nowrap items-center justify-end gap-4 whitespace-nowrap">
                {[
                  { name: "Realisasi Revenue", color: "#00D3A7" },
                  { name: "Target Revenue", color: "#3B82F6" },
                  { name: "Achievement", color: "#FFB020" },
                ].map((item) => {
                  const isHidden = hiddenRevenueTargetSeries.includes(item.name);
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => toggleChartSeries(REVENUE_TARGET_CHART_ID, item.name, setHiddenRevenueTargetSeries)}
                      aria-pressed={!isHidden}
                      className={`inline-flex shrink-0 items-center gap-1.5 text-[10px] font-semibold transition-opacity ${isHidden ? "opacity-40" : "opacity-100"}`}
                      style={{ color: "#d3deeb" }}
                    >
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                      {item.name}
                    </button>
                  );
                })}
              </div>
              <Chart options={revenueTargetOptions} series={revenueTargetSeries} type="line" height={270} width="100%" />
            </>
          ) : (
            <div className="flex min-h-[260px] items-center justify-center text-[11px] text-slate-500">Tidak ada data</div>
          )}
        </div>
      </section>

      {/* CHART REVENUE VS COST & GPM */}
      <div className="grid grid-cols-1 gap-4">
        <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-400/15 bg-[linear-gradient(145deg,#1c2d42,#172638)] shadow-[0_12px_28px_rgba(0,0,0,0.14)]">
          <div className="flex items-center gap-3 border-b border-slate-400/10 px-4 py-3.5 sm:px-[18px]">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
              <TrendingUp size={17} />
            </div>
            <div className="min-w-0">
              <h3 className="m-0 text-[13px] font-bold text-slate-100">Revenue vs Cost Payroll &amp; GPM</h3>
              <p className="mt-1 text-[10px] leading-snug text-slate-400">Tren revenue, biaya payroll, dan Gross Profit Margin per bulan</p>
            </div>
          </div>

          <div className="relative min-w-0 px-0 py-1.5">
            {monthlyData.length ? (
              <>
                <div className="pointer-events-auto absolute right-3 top-2 z-10 flex flex-nowrap items-center justify-end gap-4 whitespace-nowrap">
                  {[
                    { name: "Cost Payroll", color: "#FF7058" },
                    { name: "Revenue Payroll BAPP", color: "#00D3A7" },
                    { name: "GPM", color: "#A78BFA" },
                  ].map((item) => {
                    const isHidden = hiddenRevenueCostSeries.includes(item.name);
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => toggleChartSeries(REVENUE_COST_CHART_ID, item.name, setHiddenRevenueCostSeries)}
                        aria-pressed={!isHidden}
                        className={`inline-flex shrink-0 items-center gap-1.5 text-[10px] font-semibold transition-opacity ${isHidden ? "opacity-40" : "opacity-100"}`}
                        style={{ color: "#d3deeb" }}
                      >
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                        {item.name}
                      </button>
                    );
                  })}
                </div>
                <Chart options={revenueCostOptions} series={revenueCostSeries} type="line" height={270} width="100%" />
              </>
            ) : (
              <div className="flex min-h-[260px] items-center justify-center text-[11px] text-slate-500">Tidak ada data</div>
            )}
          </div>
        </section>
      </div>

      {/* TARGET REVENUE & BIAYA PER KATEGORI */}
      <div className="grid grid-cols-1 items-stretch gap-3 lg:grid-cols-5">
        {/* KIRI: TARGET PERFORMANCE — 40% */}
        <section className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-400/15 bg-[linear-gradient(145deg,#1c2d42,#172638)] shadow-[0_12px_28px_rgba(0,0,0,0.14)] lg:col-span-2">
          {/* HEADER */}
          <div className="flex items-center gap-3 border-b border-slate-400/10 px-4 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-400/10 text-blue-300">
              <Target size={17} />
            </div>

            <div className="min-w-0">
              <h3 className="m-0 text-[13px] font-bold text-slate-100">Pencapaian Target Revenue per Kategori</h3>
              <p className="mt-1 text-[10px] leading-snug text-slate-400">Pencapaian target revenue Sustain dan Scaling</p>
            </div>
          </div>

          {/* CONTENT */}
          {targetProgress ? (
            <div className="flex flex-1 flex-col justify-center gap-5 px-4 py-4">
              {/* SUSTAIN */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                  <strong className="text-xs font-bold text-slate-100">Sustain</strong>

                  <span className="text-right text-[10px] text-slate-400">
                    <span className="!mt-0 !inline !text-[10px] !text-emerald-300">{formatRupiah(targetProgress.sustain.realisasi)}</span>
                    {" dari "}
                    <span className="!mt-0 !inline !text-[10px] !text-slate-300">{formatRupiah(targetProgress.sustain.target)}</span>
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-slate-700/70">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300 transition-all duration-500"
                    style={{
                      width: `${Math.min(Math.max(targetProgress.sustain.percentage, 0), 100)}%`,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-500">Realisasi target Sustain</span>

                  <strong className="text-[10px] font-bold text-emerald-300">
                    {targetProgress.sustain.percentage.toLocaleString("id-ID", {
                      maximumFractionDigits: 2,
                    })}
                    % tercapai
                  </strong>
                </div>
              </div>

              {/* SCALING */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                  <strong className="text-xs font-bold text-slate-100">Scaling</strong>

                  <span className="text-right text-[10px] text-slate-400">
                    <span className="!mt-0 !inline !text-[10px] !text-blue-300">{formatRupiah(targetProgress.scaling.realisasi)}</span>
                    {" dari "}
                    <span className="!mt-0 !inline !text-[10px] !text-slate-300">{formatRupiah(targetProgress.scaling.target)}</span>
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-slate-700/70">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-300 transition-all duration-500"
                    style={{
                      width: `${Math.min(Math.max(targetProgress.scaling.percentage, 0), 100)}%`,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-500">Realisasi target Scaling</span>

                  <strong className="text-[10px] font-bold text-blue-300">
                    {targetProgress.scaling.percentage.toLocaleString("id-ID", {
                      maximumFractionDigits: 2,
                    })}
                    % tercapai
                  </strong>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[220px] flex-1 items-center justify-center px-4 text-center text-[11px] text-slate-500">Tidak ada data target untuk filter yang dipilih.</div>
          )}
        </section>

        {/* KANAN: BIAYA PER KATEGORI — 60% */}
        <section className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-400/15 bg-[linear-gradient(145deg,#1c2d42,#172638)] shadow-[0_12px_28px_rgba(0,0,0,0.14)] lg:col-span-3">
          {/* HEADER */}
          <div className="flex items-center gap-3 border-b border-slate-400/10 px-4 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10 text-amber-300">
              <PieChart size={17} />
            </div>

            <div className="min-w-0">
              <h3 className="m-0 text-[13px] font-bold text-slate-100">Biaya per Kategori</h3>
              <p className="mt-1 text-[10px] leading-snug text-slate-400">Rincian nominal dan proporsi setiap komponen biaya</p>
            </div>
          </div>

          {/* CHART */}
          <div className="block w-full min-w-0 flex-1 px-1 py-1">
            {costSummary.components.length > 0 ? (
              <div className="w-full min-w-0">
                <Chart options={costCategoryOptions} series={costCategorySeries} type="bar" height={200} width="100%" />
              </div>
            ) : (
              <div className="flex min-h-[220px] flex-1 items-center justify-center text-center text-[11px] text-slate-500">Tidak ada data untuk filter yang dipilih.</div>
            )}
          </div>
        </section>
      </div>

      {/* DETAIL COST TABLE */}
      <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-400/15 bg-[linear-gradient(145deg,#1c2d42,#172638)] shadow-[0_12px_28px_rgba(0,0,0,0.14)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-400/10 px-4 py-3.5 sm:px-[18px]">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/10 text-violet-300">
              <ReceiptText size={17} />
            </div>
            <div className="min-w-0">
              <h3 className="m-0 text-[13px] font-bold text-slate-100">Detail Cost</h3>
              <p className="mt-1 text-[10px] leading-snug text-slate-400">Rincian komponen biaya payroll berdasarkan periode</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-slate-400">Total Cost:</span>
            <strong className="font-bold text-amber-300">{formatRupiah(costSummary.total)}</strong>
          </div>
        </div>

        <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
          <table className="w-full min-w-[1150px] border-separate border-spacing-0 text-[10px] [&_thead_th]:whitespace-nowrap [&_thead_th]:border-b [&_thead_th]:border-r [&_thead_th]:border-slate-500/20 [&_thead_th]:bg-[linear-gradient(180deg,#273c58,#22344d)] [&_thead_th]:px-3 [&_thead_th]:py-3 [&_thead_th]:text-left [&_thead_th]:text-[9px] [&_thead_th]:font-bold [&_thead_th]:text-slate-300 [&_tbody_td]:whitespace-nowrap [&_tbody_td]:border-b [&_tbody_td]:border-r [&_tbody_td]:border-slate-500/10 [&_tbody_td]:px-3 [&_tbody_td]:py-2.5 [&_tbody_td]:text-slate-400 [&_tbody_tr]:bg-slate-950/20 [&_tbody_tr:nth-child(even)]:bg-slate-800/40 [&_tbody_tr:hover]:bg-blue-400/10 [&_thead_th:last-child]:border-r-0 [&_tbody_td:last-child]:border-r-0">
            <thead>
              <tr>
                <th>No.</th>
                <th>Bulan</th>
                <th>Beban Jarkom</th>
                <th>Beban Jasnaker</th>
                <th>Beban Kerjasama Pihak Ketiga</th>
                <th>Beban Lain-lain</th>
                <th>Beban Mandatory Gedung</th>
                <th>Depresiasi</th>
                <th>Total</th>
              </tr>
            </thead>

            <tbody>
              {paginatedDetailCost.length > 0 ? (
                paginatedDetailCost.map((row, index) => (
                  <tr key={`${row.periode_bulan}-${index}`}>
                    <td className="text-center text-slate-500">{(currentPage - 1) * pageSize + index + 1}</td>

                    <td className="font-medium text-slate-200">{getMonthYearLabel(row.periode_bulan)}</td>

                    <td>{formatRupiah(parseNumber(row.beban_jarkom))}</td>

                    <td>{formatRupiah(parseNumber(row.beban_jasnaker))}</td>

                    <td>{formatRupiah(parseNumber(row.beban_kerjasama_pihak_ketiga))}</td>

                    <td>{formatRupiah(parseNumber(row.beban_lain_lain))}</td>

                    <td>{formatRupiah(parseNumber(row.beban_mandatory_gedung))}</td>

                    <td>{formatRupiah(parseNumber(row.depresiasi))}</td>

                    <td className="font-bold text-blue-200">{formatRupiah(parseNumber(row.total))}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="!p-9 !text-center !text-slate-500">
                    Tidak ada data untuk filter yang dipilih.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredDetailCost.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-slate-500/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-[18px]">
            <p className="text-[10px] text-slate-400">
              Menampilkan
              <span className="font-semibold text-slate-200">
                {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredDetailCost.length)}
              </span>
              dari <span className="font-semibold text-slate-200">{filteredDetailCost.length}</span> data
            </p>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-500/25 bg-white/[0.035] px-3 text-[10px] font-semibold text-slate-300 transition hover:border-blue-400/40 hover:bg-blue-500/10 disabled:cursor-not-allowed disabled:opacity-35"
              >
                <ChevronLeft size={14} /> Sebelumnya
              </button>
              <span className="min-w-[68px] text-center text-[10px] text-slate-400">
                Halaman <strong className="text-slate-200">{currentPage}</strong> / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-500/25 bg-white/[0.035] px-3 text-[10px] font-semibold text-slate-300 transition hover:border-blue-400/40 hover:bg-blue-500/10 disabled:cursor-not-allowed disabled:opacity-35"
              >
                Berikutnya <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default CostDashboard;
