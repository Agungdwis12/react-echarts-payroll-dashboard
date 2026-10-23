import React, { useEffect, useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
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

const parseDate = (value: string): Date | null => {
  if (!value) return null;

  const date = new Date(value);

  if (!Number.isNaN(date.getTime())) {
    return date;
  }

  const match = value.match(/^(\d{4})[-/](\d{1,2})/);

  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);

    if (year && month >= 1 && month <= 12) {
      return new Date(year, month - 1, 1);
    }
  }

  return null;
};

const getMonthNumber = (value: string): number | null => {
  const date = parseDate(value);
  return date ? date.getMonth() + 1 : null;
};

const getYear = (value: string): number | null => {
  const date = parseDate(value);
  return date ? date.getFullYear() : null;
};

const getMonthYearLabel = (value: string): string => {
  const date = parseDate(value);

  if (!date) return value;

  return `${MONTH_NAMES[date.getMonth()].slice(0, 3)} ${date.getFullYear()}`;
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

  if (absolute >= 1_000_000_000_000) {
    return `Rp ${(value / 1_000_000_000_000).toFixed(0)} T`;
  }

  if (absolute >= 1_000_000_000) {
    return `Rp ${(value / 1_000_000_000).toFixed(0)} M`;
  }

  if (absolute >= 1_000_000) {
    return `Rp ${(value / 1_000_000).toFixed(0)} Jt`;
  }

  if (absolute >= 1_000) {
    return `Rp ${(value / 1_000).toFixed(0)} Rb`;
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
        setDetailCostData(Array.isArray(detailCost) ? detailCost : []);
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

    [...gpmData, ...targetData, ...detailCostData].forEach((row) => {
      const year = getYear(row.periode_bulan);

      if (year) {
        yearSet.add(year);
      }
    });

    return Array.from(yearSet).sort((a, b) => b - a);
  }, [gpmData, targetData, detailCostData]);

  /* =========================================================
     FILTER GPM
  ========================================================= */

  const filteredGpm = useMemo(() => {
    return gpmData.filter((row) => {
      const month = getMonthNumber(row.periode_bulan);
      const year = getYear(row.periode_bulan);

      const monthMatch = selectedMonth.length === 0 || (month !== null && selectedMonth.includes(MONTH_NAMES[month - 1]));

      const yearMatch = selectedYear.length === 0 || (year !== null && selectedYear.includes(String(year)));

      return monthMatch && yearMatch;
    });
  }, [gpmData, selectedMonth, selectedYear]);

  /* =========================================================
     FILTER TARGET
  ========================================================= */

  const filteredTarget = useMemo(() => {
    return targetData.filter((row) => {
      const month = getMonthNumber(row.periode_bulan);
      const year = getYear(row.periode_bulan);

      const monthMatch = selectedMonth.length === 0 || (month !== null && selectedMonth.includes(MONTH_NAMES[month - 1]));

      const yearMatch = selectedYear.length === 0 || (year !== null && selectedYear.includes(String(year)));

      return monthMatch && yearMatch;
    });
  }, [targetData, selectedMonth, selectedYear]);

  /* =========================================================
     FILTER DETAIL COST
  ========================================================= */

  const filteredDetailCost = useMemo(() => {
    return detailCostData.filter((row) => {
      const month = getMonthNumber(row.periode_bulan);
      const year = getYear(row.periode_bulan);

      const monthMatch = selectedMonth.length === 0 || (month !== null && selectedMonth.includes(MONTH_NAMES[month - 1]));

      const yearMatch = selectedYear.length === 0 || (year !== null && selectedYear.includes(String(year)));

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
      const date = parseDate(row.periode_bulan);

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
      const date = parseDate(row.periode_bulan);

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
        label: getMonthYearLabel(row.periode_bulan),
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
     CHART: TARGET VS REALISASI REVENUE
  ========================================================= */

  const revenueTargetOption = useMemo(() => {
    const labels = monthlyData.map((item) => item.label);

    const achievementData = monthlyData.map((item) => (item.targetRevenue > 0 ? (item.realisasiRevenue / item.targetRevenue) * 100 : null));

    return {
      backgroundColor: "transparent",

      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "shadow",
          shadowStyle: {
            color: "rgba(255, 255, 255, 0.04)",
          },
        },
        backgroundColor: "#182638",
        borderColor: "rgba(194, 210, 228, 0.14)",
        textStyle: {
          color: "#e8eef5",
          fontSize: 10,
        },
        formatter: (params: any[]) => {
          if (!params?.length) return "";

          const title = params[0]?.axisValue ?? "";

          const rows = params
            .map((item) => {
              const rawValue = item.value;

              const value = typeof rawValue === "number" && Number.isFinite(rawValue) ? rawValue : null;

              const formattedValue =
                value === null
                  ? "-"
                  : item.seriesName === "Achievement (%)"
                    ? `${value.toLocaleString("id-ID", {
                        maximumFractionDigits: 2,
                      })}%`
                    : formatRupiah(value);

              return `${item.marker} ${item.seriesName}: <b>${formattedValue}</b>`;
            })
            .join("<br/>");

          return `<b>${title}</b><br/>${rows}`;
        },
      },

      legend: {
        top: 8,
        right: 10,
        data: ["Target Revenue", "Realisasi Revenue", "Achievement (%)"],
        textStyle: {
          color: "#8292a6",
          fontSize: 9,
        },
        itemWidth: 12,
        itemHeight: 7,
        itemGap: 14,
      },

      grid: {
        left: 58,
        right: 58,
        top: 48,
        bottom: 42,
        containLabel: true,
      },

      xAxis: {
        type: "category",
        data: labels,
        axisLine: {
          lineStyle: {
            color: chartAxisLine,
          },
        },
        axisTick: {
          show: false,
        },
        axisLabel: {
          color: chartBaseTextColor,
          fontSize: 9,
          margin: 10,
          hideOverlap: true,
        },
      },

      yAxis: [
        {
          type: "value",
          min: 0,
          axisLabel: {
            color: chartBaseTextColor,
            fontSize: 9,
            formatter: (value: number) => formatChartValue(value),
          },
          axisLine: {
            show: false,
          },
          axisTick: {
            show: false,
          },
          splitLine: {
            show: true,
            lineStyle: {
              color: chartSplitLine,
              type: "solid",
            },
          },
        },
        {
          type: "value",
          position: "right",
          min: 0,
          max: (value: { max: number }) => Math.max(100, Math.ceil(value.max / 20) * 20),
          interval: 20,
          axisLabel: {
            color: chartBaseTextColor,
            fontSize: 9,
            formatter: (value: number) => `${value.toFixed(0)}%`,
          },
          axisLine: {
            show: false,
          },
          axisTick: {
            show: false,
          },
          splitLine: {
            show: false,
          },
        },
      ],

      series: [
        {
          name: "Target Revenue",
          type: "bar",
          yAxisIndex: 0,
          barMaxWidth: 24,
          barGap: "0%",
          barCategoryGap: "40%",
          itemStyle: {
            borderRadius: [4, 4, 0, 0],
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "#6f96e8" },
                { offset: 1, color: "#334f88" },
              ],
            },
          },
          emphasis: {
            focus: "series",
          },
          data: monthlyData.map((item) => item.targetRevenue),
        },
        {
          name: "Realisasi Revenue",
          type: "bar",
          yAxisIndex: 0,
          barMaxWidth: 24,
          itemStyle: {
            borderRadius: [4, 4, 0, 0],
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "#61c8a0" },
                { offset: 1, color: "#28775c" },
              ],
            },
          },
          emphasis: {
            focus: "series",
          },
          data: monthlyData.map((item) => item.realisasiRevenue),
        },
        {
          name: "Achievement (%)",
          type: "line",
          yAxisIndex: 1,
          z: 10,
          smooth: false,
          connectNulls: false,
          showSymbol: true,
          symbol: "circle",
          symbolSize: 7,
          lineStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 1,
              y2: 0,
              colorStops: [
                { offset: 0, color: "#F9D976" },
                { offset: 0.5, color: "#F5B544" },
                { offset: 1, color: "#F08A35" },
              ],
            },
            width: 3,
            cap: "round",
            shadowColor: "rgba(245, 181, 68, 0.25)",
            shadowBlur: 6,
          },
          itemStyle: {
            color: "#F5B544",
            borderColor: "#FFFFFF",
            borderWidth: 1.5,
          },
          emphasis: {
            focus: "series",
            scale: 1.3,
          },
          data: achievementData,
        },
      ],
    };
  }, [monthlyData]);

  /* =========================================================
     CHART: REVENUE VS COST & GPM
  ========================================================= */

  const revenueCostOption = useMemo(() => {
    const validData = monthlyData.filter((item) => Number(item.revenue) !== 0 || Number(item.cost) !== 0);

    const labels = validData.map((item) => item.label);

    const gpmSeriesData = validData.map((item) => (item.revenue > 0 ? ((item.revenue - item.cost) / item.revenue) * 100 : null));

    return {
      backgroundColor: "transparent",

      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "shadow",
          shadowStyle: {
            color: "rgba(255, 255, 255, 0.04)",
          },
        },
        backgroundColor: "#182638",
        borderColor: "rgba(194, 210, 228, 0.14)",
        textStyle: {
          color: "#e8eef5",
          fontSize: 10,
        },
        formatter: (params: any[]) => {
          if (!params?.length) return "";

          const title = params[0]?.axisValue ?? "";

          const rows = params.map((item) => {
            const rawValue = item.value;

            const value = typeof rawValue === "number" && Number.isFinite(rawValue) ? rawValue : null;

            const formattedValue =
              value === null
                ? "-"
                : item.seriesName === "GPM (%)"
                  ? `${value.toLocaleString("id-ID", {
                      maximumFractionDigits: 2,
                    })}%`
                  : formatRupiah(value);

            return `${item.marker} ${item.seriesName}: <b>${formattedValue}</b>`;
          });

          return `<b>${title}</b><br/>${rows.join("<br/>")}`;
        },
      },

      legend: {
        top: 8,
        right: 10,
        data: ["Revenue Payroll BAPP", "Cost Payroll", "GPM (%)"],
        textStyle: {
          color: "#8292a6",
          fontSize: 9,
        },
        itemWidth: 12,
        itemHeight: 7,
        itemGap: 14,
      },

      grid: {
        left: 58,
        right: 58,
        top: 48,
        bottom: 42,
        containLabel: true,
      },

      xAxis: {
        type: "category",
        data: labels,
        axisLine: {
          lineStyle: {
            color: chartAxisLine,
          },
        },
        axisTick: {
          show: false,
        },
        axisLabel: {
          color: chartBaseTextColor,
          fontSize: 9,
          hideOverlap: true,
        },
      },

      yAxis: [
        {
          type: "value",
          min: 0,
          axisLabel: {
            color: chartBaseTextColor,
            fontSize: 9,
            formatter: (value: number) => formatChartValue(value),
          },
          axisLine: {
            show: false,
          },
          axisTick: {
            show: false,
          },
          splitLine: {
            show: true,
            lineStyle: {
              color: chartSplitLine,
              type: "solid",
            },
          },
        },
        {
          type: "value",
          position: "right",
          scale: true,
          axisLabel: {
            color: chartBaseTextColor,
            fontSize: 9,
            formatter: (value: number) => `${value.toFixed(0)}%`,
          },
          axisLine: {
            show: false,
          },
          axisTick: {
            show: false,
          },
          splitLine: {
            show: false,
          },
        },
      ],

      series: [
        {
          name: "Revenue Payroll BAPP",
          type: "bar",
          yAxisIndex: 0,
          barMaxWidth: 22,
          barGap: "0%",
          barCategoryGap: "35%",
          itemStyle: {
            borderRadius: [4, 4, 0, 0],
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "#6EE7A0" },
                { offset: 1, color: "#219663" },
              ],
            },
          },
          emphasis: {
            focus: "series",
          },
          data: validData.map((item) => item.revenue),
        },
        {
          name: "Cost Payroll",
          type: "bar",
          yAxisIndex: 0,
          barMaxWidth: 22,
          itemStyle: {
            borderRadius: [4, 4, 0, 0],
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "#F4B95F" },
                { offset: 1, color: "#B87527" },
              ],
            },
          },
          emphasis: {
            focus: "series",
          },
          data: validData.map((item) => item.cost),
        },
        {
          name: "GPM (%)",
          type: "line",
          yAxisIndex: 1,
          z: 10,
          smooth: false,
          connectNulls: false,
          showSymbol: true,
          symbol: "circle",
          symbolSize: 7,
          lineStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 1,
              y2: 0,
              colorStops: [
                { offset: 0, color: "#93C5FD" },
                { offset: 0.5, color: "#3B82F6" },
                { offset: 1, color: "#2563EB" },
              ],
            },
            width: 3,
            cap: "round",
          },
          itemStyle: {
            color: "#60A5FA",
            borderColor: "#FFFFFF",
            borderWidth: 1.5,
            shadowColor: "rgba(59, 130, 246, 0.45)",
            shadowBlur: 8,
          },
          emphasis: {
            focus: "series",
            scale: 1.3,
          },
          data: gpmSeriesData,
        },
      ],
    };
  }, [monthlyData]);

  /* =========================================================
     CHART: BIAYA PER KATEGORI
  ========================================================= */

  const costByCategoryOption = useMemo(() => {
    const items = costSummary.components;

    return {
      backgroundColor: "transparent",

      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "shadow",
        },
        backgroundColor: "#182638",
        borderColor: "rgba(194, 210, 228, 0.14)",
        textStyle: {
          color: "#e8eef5",
          fontSize: 10,
        },
        formatter: (params: any[]) => {
          const item = params?.[0];

          if (!item) return "";

          const source = items[item.dataIndex];

          if (!source) return "";

          return `<b>${source.name}</b><br/>` + `${item.marker} ${formatRupiah(source.value)}<br/>` + `${source.percentage.toFixed(1)}% dari total`;
        },
      },

      grid: {
        left: 8,
        right: 42,
        top: 12,
        bottom: 22,
        containLabel: true,
      },

      xAxis: {
        type: "value",
        min: 0,
        axisLine: {
          show: false,
        },
        axisTick: {
          show: false,
        },
        axisLabel: {
          color: chartBaseTextColor,
          fontSize: 9,
          margin: 8,
          hideOverlap: true,
          formatter: (value: number) => formatChartValue(value),
        },
        splitLine: {
          lineStyle: {
            color: chartSplitLine,
          },
        },
      },

      yAxis: {
        type: "category",
        inverse: true,
        data: items.map((item) => item.name),
        axisLine: {
          show: false,
        },
        axisTick: {
          show: false,
        },
        axisLabel: {
          color: "#b8c6d8",
          fontSize: 10,
          width: 145,
          overflow: "truncate",
          margin: 10,
        },
      },

      series: [
        {
          name: "Biaya",
          type: "bar",
          barMaxWidth: 22,

          itemStyle: {
            borderRadius: [0, 6, 6, 0],
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 1,
              y2: 0,
              colorStops: [
                { offset: 0, color: "#FDE68A" }, // Kuning lembut
                { offset: 0.5, color: "#FBBF24" }, // Amber
                { offset: 1, color: "#F59E0B" }, // Oranye
              ],
            },
          },

          emphasis: {
            itemStyle: {
              color: "#FCD34D",
              shadowColor: "rgba(245, 158, 11, 0.25)",
              shadowBlur: 8,
            },
          },

          label: {
            show: true,
            position: "right",
            color: "#FCD34D",
            fontSize: 10,
            distance: 5,
            formatter: (params: any) => {
              const source = items[params.dataIndex];
              return source ? `${source.percentage.toFixed(1)}%` : "";
            },
          },

          data: items.map((item) => item.value),
        },
      ],
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
    <div className="min-w-0 w-full space-y-3 pb-6 text-slate-200">
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

        <div className="min-w-0 px-2 py-3 sm:px-4">
          {monthlyData.length ? (
            <ReactECharts option={revenueTargetOption} style={{ width: "100%", height: 270 }} notMerge lazyUpdate />
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

          <div className="min-w-0 px-2 py-3 sm:px-4">
            {monthlyData.length ? (
              <ReactECharts option={revenueCostOption} style={{ width: "100%", height: 270 }} notMerge lazyUpdate />
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
          <div className="flex min-w-0 flex-1 items-center px-2 py-1 sm:px-3">
            {costSummary.components.length > 0 ? (
              <ReactECharts option={costByCategoryOption} style={{ width: "100%", height: 200 }} notMerge lazyUpdate />
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
          {" "}
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
              Menampilkan{" "}
              <span className="font-semibold text-slate-200">
                {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredDetailCost.length)}
              </span>{" "}
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
