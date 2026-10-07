import React, { useEffect, useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";

import { getMasterBappBulanan, getMasterDetailBapp } from "../services/dashboardService";

import "./BappDashboard.css";
import SearchableSelect from "../components/dashboard/SearchableSelect";

/* =========================================================
   TYPES
========================================================= */

interface BappMonthlyRow {
  id: number;
  periode_bulan: string;
  status_bapp: string;
  jumlah_bapp: number | string;
  nominal: number | string;
  unit: string;
  created_at?: string;
}

interface BappDetailRow {
  id: number;
  periode_bulan: string;
  divisi: string;
  departemen: string;
  layanan: string;
  status: string;
  revenue: number | string;
  unit: string;
  keterangan: string;
  text?: string;
  created_at?: string;
}

/* =========================================================
   HELPERS
========================================================= */

const parseNumber = (value: unknown): number => {
  if (value === null || value === undefined || value === "") return 0;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  let text = String(value).trim().replace(/\s/g, "").replace(/Rp/gi, "");
  if (!text) return 0;

  const hasDot = text.includes(".");
  const hasComma = text.includes(",");

  if (hasDot && hasComma) {
    if (text.lastIndexOf(",") > text.lastIndexOf(".")) {
      text = text.replace(/\./g, "").replace(",", ".");
    } else {
      text = text.replace(/,/g, "");
    }
  } else if (hasDot) {
    const parts = text.split(".");
    if (parts.length > 2) {
      text = text.replace(/\./g, "");
    } else if (parts.length === 2 && parts[1].length === 3) {
      text = text.replace(".", "");
    }
  } else if (hasComma) {
    const parts = text.split(",");
    if (parts.length > 2) {
      text = text.replace(/,/g, "");
    } else if (parts.length === 2 && parts[1].length === 3) {
      text = text.replace(",", "");
    } else {
      text = text.replace(",", ".");
    }
  }

  const result = Number(text);
  return Number.isFinite(result) ? result : 0;
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(value);

const formatRupiah = (value: number) =>
  `Rp ${new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(value)}`;

const formatCompactRupiah = (value: number): string => {
  const absolute = Math.abs(value);

  if (absolute >= 1_000_000_000_000) {
    return `Rp ${(value / 1_000_000_000_000).toFixed(1)} T`;
  }

  if (absolute >= 1_000_000_000) {
    return `Rp ${(value / 1_000_000_000).toFixed(1)} M`;
  }

  if (absolute >= 1_000_000) {
    return `Rp ${(value / 1_000_000).toFixed(0)} jt`;
  }

  if (absolute >= 1_000) {
    return `Rp ${(value / 1_000).toFixed(0)} rb`;
  }

  return formatRupiah(value);
};

const parseDate = (value: string): Date | null => {
  if (!value) return null;

  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return date;

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  return null;
};

const getYear = (value: string): string => {
  const date = parseDate(value);
  return date ? String(date.getFullYear()) : "";
};

const getMonthKey = (value: string): string => {
  const date = parseDate(value);
  if (!date) return "";

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const formatMonth = (value: string): string => {
  const date = parseDate(value);
  if (!date) return value;

  return date.toLocaleDateString("id-ID", {
    month: "short",
    year: "numeric",
  });
};

const monthSortValue = (value: string): number => {
  const date = parseDate(value);
  return date ? date.getFullYear() * 100 + date.getMonth() : 0;
};

const uniqueSorted = (values: string[]) => Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, "id-ID"));

const uniqueMonthKeys = (rows: BappMonthlyRow[]) => Array.from(new Set(rows.map((row) => getMonthKey(row.periode_bulan)).filter(Boolean))).sort();

const statusKey = (value: string) => value.trim().toLowerCase();

const isDone = (value: string) => statusKey(value) === "done";
const isOnProcess = (value: string) => statusKey(value) === "on proses" || statusKey(value) === "on process" || statusKey(value) === "on_progress";
const isNoProcess = (value: string) => statusKey(value) === "no proses" || statusKey(value) === "not proses" || statusKey(value) === "not process";

/* =========================================================
   COMPONENT
========================================================= */

const BappDashboard: React.FC = () => {
  const [monthlyRows, setMonthlyRows] = useState<BappMonthlyRow[]>([]);
  const [detailRows, setDetailRows] = useState<BappDetailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedUnit, setSelectedUnit] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");

  /* =========================================================
     FETCH
  ========================================================= */

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [monthlyData, detailData] = await Promise.all([getMasterBappBulanan(), getMasterDetailBapp()]);

        if (!mounted) return;

        setMonthlyRows(Array.isArray(monthlyData) ? monthlyData : []);
        setDetailRows(Array.isArray(detailData) ? detailData : []);
      } catch (err) {
        console.error("BAPP dashboard error:", err);

        if (mounted) {
          setError(err instanceof Error ? err.message : "Gagal memuat data dashboard BAPP.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  /* =========================================================
     FILTER OPTIONS
  ========================================================= */

  const unitOptions = useMemo(() => {
    return uniqueSorted([...monthlyRows.map((row) => row.unit), ...detailRows.map((row) => row.unit)]);
  }, [monthlyRows, detailRows]);

  const monthOptions = useMemo(() => {
    return uniqueMonthKeys(monthlyRows).map((key) => {
      const [year, month] = key.split("-").map(Number);
      return new Date(year, month - 1, 1).toLocaleDateString("id-ID", {
        month: "long",
      });
    });
  }, [monthlyRows]);

  const yearOptions = useMemo(() => {
    return Array.from(new Set(monthlyRows.map((row) => getYear(row.periode_bulan)).filter(Boolean))).sort((a, b) => Number(a) - Number(b));
  }, [monthlyRows]);

  const monthNumberByName = useMemo(() => {
    const result: Record<string, number> = {};

    monthlyRows.forEach((row) => {
      const date = parseDate(row.periode_bulan);
      if (!date) return;

      const name = date.toLocaleDateString("id-ID", {
        month: "long",
      });

      result[name.toLowerCase()] = date.getMonth();
    });

    return result;
  }, [monthlyRows]);

  const selectedMonthNumber = selectedMonth ? monthNumberByName[selectedMonth.toLowerCase()] : undefined;

  const matchesPeriod = (periode: string) => {
    const date = parseDate(periode);
    if (!date) return false;

    if (selectedYear && String(date.getFullYear()) !== selectedYear) {
      return false;
    }

    if (selectedMonthNumber !== undefined && date.getMonth() !== selectedMonthNumber) {
      return false;
    }

    return true;
  };

  const matchesUnit = (unit: string) => !selectedUnit || unit === selectedUnit;

  /* =========================================================
     FILTERED DATA
  ========================================================= */

  const filteredMonthlyRows = useMemo(() => {
    return monthlyRows.filter((row) => matchesPeriod(row.periode_bulan) && matchesUnit(row.unit));
  }, [monthlyRows, selectedUnit, selectedMonth, selectedYear, selectedMonthNumber]);

  const filteredDetailRows = useMemo(() => {
    return detailRows.filter((row) => matchesPeriod(row.periode_bulan) && matchesUnit(row.unit));
  }, [detailRows, selectedUnit, selectedMonth, selectedYear, selectedMonthNumber]);

  /* =========================================================
     KPI
  ========================================================= */

  const kpis = useMemo(() => {
    const totalBapp = filteredMonthlyRows.reduce((sum, row) => sum + parseNumber(row.jumlah_bapp), 0);

    const totalNominal = filteredMonthlyRows.reduce((sum, row) => sum + parseNumber(row.nominal), 0);

    const doneRows = filteredMonthlyRows.filter((row) => isDone(row.status_bapp));

    const onProcessRows = filteredMonthlyRows.filter((row) => isOnProcess(row.status_bapp));

    const noProcessRows = filteredMonthlyRows.filter((row) => isNoProcess(row.status_bapp));

    const doneCount = doneRows.reduce((sum, row) => sum + parseNumber(row.jumlah_bapp), 0);

    const onProcessCount = onProcessRows.reduce((sum, row) => sum + parseNumber(row.jumlah_bapp), 0);

    const noProcessCount = noProcessRows.reduce((sum, row) => sum + parseNumber(row.jumlah_bapp), 0);

    const doneNominal = doneRows.reduce((sum, row) => sum + parseNumber(row.nominal), 0);

    const onProcessNominal = onProcessRows.reduce((sum, row) => sum + parseNumber(row.nominal), 0);

    const noProcessNominal = noProcessRows.reduce((sum, row) => sum + parseNumber(row.nominal), 0);

    const totalRevenue = filteredDetailRows.reduce((sum, row) => sum + parseNumber(row.revenue), 0);

    return {
      totalBapp,
      totalNominal,
      totalRevenue,
      doneCount,
      onProcessCount,
      noProcessCount,
      doneNominal,
      onProcessNominal,
      noProcessNominal,
      donePercentage: totalBapp > 0 ? (doneCount / totalBapp) * 100 : 0,
      onProcessPercentage: totalBapp > 0 ? (onProcessCount / totalBapp) * 100 : 0,
      noProcessPercentage: totalBapp > 0 ? (noProcessCount / totalBapp) * 100 : 0,
    };
  }, [filteredMonthlyRows, filteredDetailRows]);

  /* =========================================================
     CHART 1 - NOMINAL BAPP BY STATUS / MONTH
  ========================================================= */

  const nominalStatusByMonth = useMemo(() => {
    const map = new Map<
      string,
      {
        sort: number;
        label: string;
        done: number;
        onProcess: number;
        noProcess: number;
      }
    >();

    filteredMonthlyRows.forEach((row) => {
      const key = getMonthKey(row.periode_bulan);
      if (!key) return;

      const existing = map.get(key) ?? {
        sort: monthSortValue(row.periode_bulan),
        label: formatMonth(row.periode_bulan),
        done: 0,
        onProcess: 0,
        noProcess: 0,
      };

      const nominal = parseNumber(row.nominal);

      if (isDone(row.status_bapp)) {
        existing.done += nominal;
      } else if (isOnProcess(row.status_bapp)) {
        existing.onProcess += nominal;
      } else if (isNoProcess(row.status_bapp)) {
        existing.noProcess += nominal;
      }

      map.set(key, existing);
    });

    return Array.from(map.values()).sort((a, b) => a.sort - b.sort);
  }, [filteredMonthlyRows]);

  const nominalStatusChartOption = useMemo(
    () => ({
      animation: true,
      animationDuration: 850,
      animationEasing: "cubicOut",
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "shadow",
          shadowStyle: {
            color: "rgba(120, 150, 190, 0.08)",
          },
        },
        backgroundColor: "#172436",
        borderColor: "#344a63",
        borderWidth: 1,
        textStyle: {
          color: "#e8eef6",
          fontSize: 10,
        },
        extraCssText: "box-shadow:0 14px 32px rgba(0,0,0,.35);border-radius:9px;",
        formatter: (params: any[]) => {
          if (!params?.length) return "";

          let html = `
            <div style="font-weight:700;color:#f2f6fb;margin-bottom:7px;">
              ${params[0].axisValue}
            </div>
          `;

          params.forEach((item) => {
            html += `
              <div style="display:flex;justify-content:space-between;gap:20px;margin:4px 0;">
                <span style="color:#9fb0c3;">${item.marker}${item.seriesName}</span>
                <strong style="color:#f2f6fb;">${formatCompactRupiah(Number(item.value) || 0)}</strong>
              </div>
            `;
          });

          return html;
        },
      },
      legend: {
        top: 0,
        left: 0,
        itemWidth: 10,
        itemHeight: 8,
        itemGap: 16,
        textStyle: {
          color: "#aebed0",
          fontSize: 9,
        },
      },
      grid: {
        left: 52,
        right: 18,
        top: 42,
        bottom: 65,
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: nominalStatusByMonth.map((item) => item.label),
        axisLine: {
          lineStyle: {
            color: "rgba(148, 163, 184, 0.25)",
          },
        },
        axisTick: {
          show: false,
        },
        axisLabel: {
          interval: 0,
          rotate: 30,
          fontSize: 8,
          color: "#aebed0",
          margin: 14,
          align: "right",
        },
      },
      yAxis: {
        type: "value",
        axisLine: {
          show: false,
        },
        axisTick: {
          show: false,
        },
        axisLabel: {
          fontSize: 9,
          color: "#9aacc0",
          formatter: (value: number) => {
            if (value >= 1_000_000_000_000) {
              return `${(value / 1_000_000_000_000).toFixed(1)} T`;
            }
            if (value >= 1_000_000_000) {
              return `${(value / 1_000_000_000).toFixed(0)} M`;
            }
            if (value >= 1_000_000) {
              return `${(value / 1_000_000).toFixed(0)} jt`;
            }
            return formatNumber(value);
          },
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: "rgba(126, 150, 178, 0.12)",
            type: "dashed",
          },
        },
      },
      series: [
        {
          name: "Done",
          type: "bar",
          stack: "total",
          barMaxWidth: 32,
          data: nominalStatusByMonth.map((item) => item.done),
          itemStyle: {
            borderRadius: [7, 7, 0, 0],
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "#72dfa6" },
                { offset: 0.5, color: "#38b978" },
                { offset: 1, color: "#19784f" },
              ],
            },
            shadowBlur: 8,
            shadowColor: "rgba(52, 211, 136, .18)",
          },
        },
        {
          name: "On Proses",
          type: "bar",
          stack: "total",
          barMaxWidth: 32,
          data: nominalStatusByMonth.map((item) => item.onProcess),
          itemStyle: {
            borderRadius: [7, 7, 0, 0],

            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,

              colorStops: [
                { offset: 0, color: "#ffd978" },
                { offset: 0.5, color: "#efa938" },
                { offset: 1, color: "#b86e16" },
              ],
            },
          },
        },
        {
          name: "No Proses",
          type: "bar",
          stack: "total",
          barMaxWidth: 32,
          data: nominalStatusByMonth.map((item) => item.noProcess),
          itemStyle: {
            borderRadius: [3, 3, 0, 0],
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "#ff8f8f" },
                { offset: 0.5, color: "#e85b67" },
                { offset: 1, color: "#a83243" },
              ],
            },
          },
        },
      ],
    }),
    [nominalStatusByMonth],
  );

  /* =========================================================
     CHART 2 - BAPP BY UNIT
  ========================================================= */

  const bappByUnit = useMemo(() => {
    const map = new Map<string, number>();

    filteredMonthlyRows.forEach((row) => {
      const unit = row.unit || "Tidak diketahui";
      map.set(unit, (map.get(unit) ?? 0) + parseNumber(row.jumlah_bapp));
    });

    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredMonthlyRows]);

  const bappUnitChartOption = useMemo(
    () => ({
      animation: true,
      animationDuration: 900,
      tooltip: {
        trigger: "item",
        backgroundColor: "#172436",
        borderColor: "#344a63",
        borderWidth: 1,
        textStyle: {
          color: "#e8eef6",
          fontSize: 10,
        },
        extraCssText: "box-shadow:0 14px 32px rgba(0,0,0,.35);border-radius:9px;",
        formatter: (params: any) => {
          return `
            <div style="font-weight:700;color:#f2f6fb;margin-bottom:5px;">
              ${params.name}
            </div>
            <div style="color:#9fb0c3;">
              Jumlah BAPP:
              <strong style="color:#f2f6fb;">${formatNumber(Number(params.value) || 0)}</strong>
            </div>
            <div style="color:#9fb0c3;margin-top:3px;">
              Persentase:
              <strong style="color:#f2f6fb;">${Number(params.percent).toFixed(1)}%</strong>
            </div>
          `;
        },
      },
      legend: {
        bottom: 2,
        left: "center",
        itemWidth: 9,
        itemHeight: 9,
        itemGap: 14,
        textStyle: {
          color: "#aebed0",
          fontSize: 9,
        },
      },
      series: [
        {
          name: "Jumlah BAPP",
          type: "pie",
          radius: ["46%", "72%"],
          center: ["50%", "48%"],
          avoidLabelOverlap: true,
          itemStyle: {
            borderColor: "#1a293b",
            borderWidth: 3,
            borderRadius: 5,
          },
          label: {
            show: true,
            color: "#d9e2ec",
            fontSize: 9,
            fontWeight: 600,
            formatter: "{d}%",
          },
          labelLine: {
            show: false,
          },
          data: bappByUnit.map((item, index) => ({
            ...item,
            itemStyle: {
              borderColor: "#1a293b",
              borderWidth: 3,
              borderRadius: 5,
              color:
                index === 0
                  ? {
                      type: "linear",
                      x: 0,
                      y: 0,
                      x2: 1,
                      y2: 1,
                      colorStops: [
                        { offset: 0, color: "#ffd477" },
                        { offset: 0.5, color: "#efa938" },
                        { offset: 1, color: "#c77c1b" },
                      ],
                    }
                  : {
                      type: "linear",
                      x: 0,
                      y: 0,
                      x2: 1,
                      y2: 1,
                      colorStops: [
                        { offset: 0, color: "#8eb8ff" },
                        { offset: 0.5, color: "#4e86dc" },
                        { offset: 1, color: "#285aa7" },
                      ],
                    },
            },
          })),
        },
      ],
    }),
    [bappByUnit],
  );

  /* =========================================================
     CHART 3 - REVENUE BY LAYANAN
  ========================================================= */

  const revenueByLayanan = useMemo(() => {
    const map = new Map<string, number>();

    filteredDetailRows.forEach((row) => {
      const layanan = row.layanan || "Tidak diketahui";
      map.set(layanan, (map.get(layanan) ?? 0) + parseNumber(row.revenue));
    });

    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredDetailRows]);

  const revenueChartOption = useMemo(
    () => ({
      animation: true,
      animationDuration: 900,
      animationEasing: "cubicOut",
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "shadow",
          shadowStyle: {
            color: "rgba(80, 150, 255, 0.07)",
          },
        },
        backgroundColor: "#172436",
        borderColor: "#344a63",
        borderWidth: 1,
        textStyle: {
          color: "#e8eef6",
          fontSize: 10,
        },
        extraCssText: "box-shadow:0 14px 32px rgba(0,0,0,.35);border-radius:9px;",
        formatter: (params: any[]) => {
          const item = params?.[0];
          if (!item) return "";

          return `
            <div style="color:#9fb0c3;font-size:10px;margin-bottom:5px;">
              ${item.name}
            </div>
            <div style="color:#f2f6fb;font-size:13px;font-weight:700;">
              ${formatRupiah(Number(item.value) || 0)}
            </div>
          `;
        },
      },
      grid: {
        left: 50,
        right: 25,
        top: 18,
        bottom: 80,
        containLabel: true,
      },
      xAxis: {
        type: "category",
        boundaryGap: true,
        data: revenueByLayanan.map((item) => item.name),
        axisLine: {
          lineStyle: {
            color: "rgba(148, 163, 184, 0.18)",
            width: 1,
          },
        },
        axisTick: {
          show: false,
        },
        axisLabel: {
          interval: 0,
          rotate: 45,
          fontSize: 9,
          color: "#9eafc2",
          margin: 12,
          align: "right",
          width: 80,
          overflow: "truncate",
          hideOverlap: true,
          formatter: (value: string) => value,
        },
      },
      yAxis: {
        type: "value",
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          fontSize: 9,
          color: "#9aacc0",
          formatter: (value: number) => {
            if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(0)} M`;
            if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)} jt`;
            return formatNumber(value);
          },
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: "rgba(126, 150, 178, .12)",
            type: "dashed",
          },
        },
      },
      series: [
        {
          name: "Revenue",
          type: "bar",
          data: revenueByLayanan.map((item) => item.value),
          barMaxWidth: 28,
          barMinHeight: 3,
          itemStyle: {
            borderRadius: [7, 7, 2, 2],
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "#82b5ff" },
                { offset: 0.5, color: "#4d8fe8" },
                { offset: 1, color: "#225da8" },
              ],
            },
            shadowBlur: 8,
            shadowColor: "rgba(57, 132, 235, .2)",
          },
          emphasis: {
            focus: "series",
            itemStyle: {
              shadowBlur: 17,
              shadowColor: "rgba(80, 155, 255, .4)",
              color: {
                type: "linear",
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: "#b2d2ff" },
                  { offset: 1, color: "#3d83e2" },
                ],
              },
            },
          },
        },
      ],
    }),
    [revenueByLayanan],
  );
  
  /* =========================================================
     TABLE
  ========================================================= */

  const tableRows = useMemo(() => {
    return [...filteredDetailRows].sort((a, b) => monthSortValue(b.periode_bulan) - monthSortValue(a.periode_bulan)).slice(0, 10);
  }, [filteredDetailRows]);

  /* =========================================================
     RESET
  ========================================================= */

  const resetFilters = () => {
    setSelectedUnit("");
    setSelectedMonth("");
    setSelectedYear("");
  };

  const hasFilter = Boolean(selectedUnit || selectedMonth || selectedYear);

  /* =========================================================
     RENDER STATES
  ========================================================= */

  if (loading) {
    return (
      <div className="bapp-state">
        <div className="bapp-spinner" />
        <span>Memuat data BAPP...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bapp-state bapp-state-error">
        <div>
          <h3>Gagal Memuat Dashboard BAPP</h3>
          <p>{error}</p>
          <button type="button" onClick={() => window.location.reload()}>
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  /* =========================================================
     MAIN UI
  ========================================================= */

  return (
    <div className="bapp-page">
      <header className="bapp-header">
        <div className="bapp-header-copy">
          <div className="bapp-title-row">
            <h1>Dashboard Detail BAPP</h1>
            <span className="bapp-live-badge">
              <span className="bapp-live-dot" />
              Data Terhubung
            </span>
          </div>

          <p>Monitoring BAPP, nominal, status, dan revenue layanan</p>

          <span className="bapp-source">
            Sumber data: <strong>master_bapp_bulanan</strong> &amp; <strong>master_detail_bapp</strong>
          </span>
        </div>
      </header>

      {/* =====================================================
          FILTER
      ====================================================== */}

      <section className="bapp-filter-card">
        <div className="bapp-filter-heading">
          <div>
            <span className="bapp-section-kicker">FILTER DATA</span>
            <h2>Parameter Dashboard</h2>
          </div>

          <button type="button" className={`reset-filter ${hasFilter ? "is-active" : ""}`} onClick={resetFilters}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />
              <path d="M3 21v-5h5" />
            </svg>

            <span>Reset Filter</span>
          </button>
        </div>

        <div className="bapp-filter-grid">
          <div className="bapp-filter-item">
            <label>Unit</label>
            <SearchableSelect value={selectedUnit} options={unitOptions} placeholder="Semua Unit" searchPlaceholder="Cari unit..." onChange={setSelectedUnit} />
          </div>

          <div className="bapp-filter-item">
            <label>Bulan</label>
            <SearchableSelect value={selectedMonth} options={monthOptions} placeholder="Semua Bulan" searchPlaceholder="Cari bulan..." onChange={setSelectedMonth} />
          </div>

          <div className="bapp-filter-item">
            <label>Tahun</label>
            <SearchableSelect value={selectedYear} options={yearOptions} placeholder="Semua Tahun" searchPlaceholder="Cari tahun..." onChange={setSelectedYear} />
          </div>
        </div>
      </section>

      {/* =====================================================
          KPI
      ====================================================== */}

      <section className="bapp-kpi-grid">
        <article className="bapp-kpi-card kpi-blue">
          <div className="bapp-kpi-top">
            <span className="bapp-kpi-label">Jumlah BAPP</span>
            <span className="bapp-kpi-icon">▦</span>
          </div>
          <strong>{formatNumber(kpis.totalBapp)}</strong>
          <span className="bapp-kpi-sub">{formatCompactRupiah(kpis.totalNominal)}</span>
        </article>

        <article className="bapp-kpi-card kpi-green">
          <div className="bapp-kpi-top">
            <span className="bapp-kpi-label">BAPP Done</span>
            <span className="bapp-kpi-icon">✓</span>
          </div>
          <strong>
            {formatNumber(kpis.doneCount)} <small>({kpis.donePercentage.toFixed(2)}%)</small>
          </strong>
          <span className="bapp-kpi-sub">{formatCompactRupiah(kpis.doneNominal)}</span>
        </article>

        <article className="bapp-kpi-card kpi-amber">
          <div className="bapp-kpi-top">
            <span className="bapp-kpi-label">BAPP On Proses</span>
            <span className="bapp-kpi-icon">◷</span>
          </div>
          <strong>
            {formatNumber(kpis.onProcessCount)} <small>({kpis.onProcessPercentage.toFixed(2)}%)</small>
          </strong>
          <span className="bapp-kpi-sub">{formatCompactRupiah(kpis.onProcessNominal)}</span>
        </article>

        <article className="bapp-kpi-card kpi-red">
          <div className="bapp-kpi-top">
            <span className="bapp-kpi-label">BAPP No Proses</span>
            <span className="bapp-kpi-icon">!</span>
          </div>
          <strong>
            {formatNumber(kpis.noProcessCount)} <small>({kpis.noProcessPercentage.toFixed(2)}%)</small>
          </strong>
          <span className="bapp-kpi-sub">{formatCompactRupiah(kpis.noProcessNominal)}</span>
        </article>
      </section>

      {/* =====================================================
          CHARTS
      ====================================================== */}

      <section className="bapp-chart-grid">
        <article className="bapp-chart-card">
          <div className="bapp-chart-header">
            <div>
              <span className="bapp-chart-kicker">BAPP MONITORING</span>
              <h3>Nominal BAPP per Status per Bulan</h3>
            </div>
          </div>

          <div className="bapp-chart-body bapp-chart-large">
            {nominalStatusByMonth.length > 0 ? (
              <ReactECharts option={nominalStatusChartOption} style={{ height: "100%", width: "100%" }} notMerge lazyUpdate />
            ) : (
              <div className="bapp-empty-chart">Tidak ada data untuk filter yang dipilih.</div>
            )}
          </div>
        </article>

        <article className="bapp-chart-card">
          <div className="bapp-chart-header">
            <div>
              <span className="bapp-chart-kicker">DISTRIBUSI</span>
              <h3>Jumlah BAPP per Unit</h3>
            </div>
          </div>

          <div className="bapp-chart-body bapp-chart-large">
            {bappByUnit.length > 0 ? <ReactECharts option={bappUnitChartOption} style={{ height: "100%", width: "100%" }} notMerge lazyUpdate /> : <div className="bapp-empty-chart">Tidak ada data untuk filter yang dipilih.</div>}
          </div>
        </article>
      </section>

      <article className="bapp-chart-card bapp-revenue-card">
        <div className="bapp-chart-header">
          <div>
            <span className="bapp-chart-kicker">REVENUE ANALYSIS</span>
            <h3>Revenue BAPP per Layanan</h3>
          </div>

          <span className="bapp-chart-total">
            Total Revenue: <strong>{formatCompactRupiah(kpis.totalRevenue)}</strong>
          </span>
        </div>

        <div className="bapp-chart-body bapp-revenue-chart">
          {revenueByLayanan.length > 0 ? <ReactECharts option={revenueChartOption} style={{ height: "100%", width: "100%" }} notMerge lazyUpdate /> : <div className="bapp-empty-chart">Tidak ada data untuk filter yang dipilih.</div>}
        </div>
      </article>

      {/* =====================================================
          TABLE
      ====================================================== */}

      <section className="bapp-table-card">
        <div className="bapp-table-header">
          <div>
            <span className="bapp-chart-kicker">DETAIL DATA</span>
            <h3>Detail BAPP</h3>
          </div>

          <span className="bapp-table-count">Menampilkan {tableRows.length} data</span>
        </div>

        <div className="bapp-table-wrapper">
          <table className="bapp-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Bulan</th>
                <th>Divisi</th>
                <th>Departemen</th>
                <th>Layanan</th>
                <th>Status</th>
                <th>Unit</th>
                <th>Revenue</th>
              </tr>
            </thead>

            <tbody>
              {tableRows.length > 0 ? (
                tableRows.map((row, index) => (
                  <tr key={`${row.id}-${index}`}>
                    <td>{index + 1}</td>
                    <td>{formatMonth(row.periode_bulan)}</td>
                    <td title={row.divisi}>{row.divisi || "-"}</td>
                    <td title={row.departemen}>{row.departemen || "-"}</td>
                    <td title={row.layanan}>{row.layanan || "-"}</td>
                    <td>
                      <span className={`bapp-status-pill ${isDone(row.status) ? "done" : isOnProcess(row.status) ? "process" : "no-process"}`}>{row.status || "-"}</span>
                    </td>
                    <td>{row.unit || "-"}</td>
                    <td className="bapp-money-cell">{formatRupiah(parseNumber(row.revenue))}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="bapp-table-empty">
                    Tidak ada data yang sesuai dengan filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};;

export default BappDashboard;
