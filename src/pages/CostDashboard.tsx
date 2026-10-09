import React, { useEffect, useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import { getGpm, getTarget, getDetailCost } from "../services/dashboardService";
import "./CostDashboard.css";

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

  const normalized = String(value).replace(/\s/g, "").replace(/\./g, "").replace(/,/g, ".");

  const parsed = Number(normalized);

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
  const absolute = Math.abs(value);

  if (absolute >= 1_000_000_000_000) {
    return `Rp ${(value / 1_000_000_000_000).toFixed(2)} Triliun`;
  }

  if (absolute >= 1_000_000_000) {
    return `Rp ${(value / 1_000_000_000).toFixed(2)} Miliar`;
  }

  if (absolute >= 1_000_000) {
    return `Rp ${(value / 1_000_000).toFixed(2)} Juta`;
  }

  if (absolute >= 1_000) {
    return `Rp ${(value / 1_000).toFixed(2)} Ribu`;
  }

  return formatRupiah(value);
};

const formatChartValue = (value: number): string => {
  const absolute = Math.abs(value);

  if (absolute >= 1_000_000_000_000) {
    return `Rp ${(value / 1_000_000_000_000).toFixed(1)} T`;
  }

  if (absolute >= 1_000_000_000) {
    return `Rp ${(value / 1_000_000_000).toFixed(1)} M`;
  }

  if (absolute >= 1_000_000) {
    return `Rp ${(value / 1_000_000).toFixed(1)} Jt`;
  }

  if (absolute >= 1_000) {
    return `Rp ${(value / 1_000).toFixed(1)} Rb`;
  }

  return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
};

const chartBaseTextColor = "#8292a6";
const chartAxisLine = "rgba(194, 210, 228, 0.12)";
const chartSplitLine = "rgba(194, 210, 228, 0.07)";

const CostDashboard: React.FC = () => {
  const [gpmData, setGpmData] = useState<GpmRow[]>([]);
  const [targetData, setTargetData] = useState<TargetRow[]>([]);
  const [detailCostData, setDetailCostData] = useState<CostRow[]>([]);

  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError("");

        const [gpm, target, detailCost] = await Promise.all([getGpm(), getTarget(), getDetailCost()]);

        setGpmData(Array.isArray(gpm) ? gpm : []);
        setTargetData(Array.isArray(target) ? target : []);
        setDetailCostData(Array.isArray(detailCost) ? detailCost : []);
      } catch (err) {
        console.error(err);
        setError("Gagal mengambil data Dashboard Target & Cost.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const years = useMemo(() => {
    const yearSet = new Set<number>();

    [...gpmData, ...targetData, ...detailCostData].forEach((row) => {
      const year = getYear(row.periode_bulan);
      if (year) yearSet.add(year);
    });

    return Array.from(yearSet).sort((a, b) => b - a);
  }, [gpmData, targetData, detailCostData]);

  const filteredGpm = useMemo(() => {
    return gpmData.filter((row) => {
      const month = getMonthNumber(row.periode_bulan);
      const year = getYear(row.periode_bulan);

      const monthMatch = selectedMonth === "all" || month === Number(selectedMonth);

      const yearMatch = selectedYear === "all" || year === Number(selectedYear);

      return monthMatch && yearMatch;
    });
  }, [gpmData, selectedMonth, selectedYear]);

  const filteredTarget = useMemo(() => {
    return targetData.filter((row) => {
      const month = getMonthNumber(row.periode_bulan);
      const year = getYear(row.periode_bulan);

      const monthMatch = selectedMonth === "all" || month === Number(selectedMonth);

      const yearMatch = selectedYear === "all" || year === Number(selectedYear);

      return monthMatch && yearMatch;
    });
  }, [targetData, selectedMonth, selectedYear]);

  const filteredDetailCost = useMemo(() => {
    return detailCostData.filter((row) => {
      const month = getMonthNumber(row.periode_bulan);
      const year = getYear(row.periode_bulan);

      const monthMatch = selectedMonth === "all" || month === Number(selectedMonth);

      const yearMatch = selectedYear === "all" || year === Number(selectedYear);

      return monthMatch && yearMatch;
    });
  }, [detailCostData, selectedMonth, selectedYear]);

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
        const year = Number(yearText);
        const month = Number(monthText);

        const monthMatch = selectedMonth === "all" || month === Number(selectedMonth);

        const yearMatch = selectedYear === "all" || year === Number(selectedYear);

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
      .sort((a, b) => b.value - a.value)
      .map((item) => ({
        ...item,
        percentage: summary.total > 0 ? (item.value / summary.total) * 100 : 0,
      }));

    return {
      ...summary,
      components,
    };
  }, [filteredDetailCost]);

  const revenueTargetOption = useMemo(() => {
    const labels = monthlyData.map((item) => item.label);

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        backgroundColor: "#182638",
        borderColor: "rgba(194,210,228,0.14)",
        textStyle: { color: "#e8eef5", fontSize: 10 },
        formatter: (params: any[]) => {
          const title = params?.[0]?.axisValue ?? "";
          const rows = params.map((item) => `${item.marker} ${item.seriesName}: ${formatRupiah(Number(item.value || 0))}`).join("<br/>");

          return `<b>${title}</b><br/>${rows}`;
        },
      },
      legend: {
        top: 8,
        right: 10,
        textStyle: { color: "#8292a6", fontSize: 9 },
      },
      grid: {
        left: 58,
        right: 20,
        top: 48,
        bottom: 42,
      },
      xAxis: {
        type: "category",
        data: labels,
        axisLine: { lineStyle: { color: chartAxisLine } },
        axisTick: { show: false },
        axisLabel: {
          color: chartBaseTextColor,
          fontSize: 9,
          margin: 10,
        },
      },
      yAxis: {
        type: "value",
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: chartBaseTextColor,
          fontSize: 9,
          formatter: (value: number) => formatChartValue(value),
        },
        splitLine: {
          lineStyle: { color: chartSplitLine },
        },
      },
      series: [
        {
          name: "Target Revenue",
          type: "bar",
          barMaxWidth: 18,
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
          data: monthlyData.map((item) => item.targetRevenue),
        },
        {
          name: "Realisasi Revenue",
          type: "bar",
          barMaxWidth: 18,
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
          data: monthlyData.map((item) => item.realisasiRevenue),
        },
      ],
    };
  }, [monthlyData]);

  const revenueCostOption = useMemo(() => {
    const labels = monthlyData.map((item) => item.label);

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        backgroundColor: "#182638",
        borderColor: "rgba(194,210,228,0.14)",
        textStyle: { color: "#e8eef5", fontSize: 10 },
        formatter: (params: any[]) => {
          const title = params?.[0]?.axisValue ?? "";
          const rows = params.map((item) => `${item.marker} ${item.seriesName}: ${formatRupiah(Number(item.value || 0))}`).join("<br/>");

          return `<b>${title}</b><br/>${rows}`;
        },
      },
      legend: {
        top: 8,
        right: 10,
        textStyle: { color: "#8292a6", fontSize: 9 },
      },
      grid: {
        left: 58,
        right: 20,
        top: 48,
        bottom: 42,
      },
      xAxis: {
        type: "category",
        data: labels,
        boundaryGap: false,
        axisLine: { lineStyle: { color: chartAxisLine } },
        axisTick: { show: false },
        axisLabel: {
          color: chartBaseTextColor,
          fontSize: 9,
          margin: 10,
        },
      },
      yAxis: {
        type: "value",
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: chartBaseTextColor,
          fontSize: 9,
          formatter: (value: number) => formatChartValue(value),
        },
        splitLine: {
          lineStyle: { color: chartSplitLine },
        },
      },
      series: [
        {
          name: "Revenue Payroll BAPP",
          type: "line",
          smooth: 0.4,
          symbol: "circle",
          symbolSize: 5,
          lineStyle: {
            width: 1.8,
            color: "#55b8c4",
            shadowColor: "rgba(85, 184, 196, 0.38)",
            shadowBlur: 9,
            shadowOffsetY: 3,
          },
          itemStyle: {
            color: "#55b8c4",
          },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(85, 184, 196, 0.24)" },
                { offset: 0.65, color: "rgba(85, 184, 196, 0.08)" },
                { offset: 1, color: "rgba(85, 184, 196, 0)" },
              ],
            },
          },
          data: monthlyData.map((item) => item.revenue),
        },
        {
          name: "Cost Payroll",
          type: "line",
          smooth: 0.4,
          symbol: "circle",
          symbolSize: 5,
          lineStyle: {
            width: 1.8,
            color: "#d9a441",
            shadowColor: "rgba(217, 164, 65, 0.36)",
            shadowBlur: 9,
            shadowOffsetY: 3,
          },
          itemStyle: {
            color: "#d9a441",
          },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(217, 164, 65, 0.20)" },
                { offset: 0.65, color: "rgba(217, 164, 65, 0.06)" },
                { offset: 1, color: "rgba(217, 164, 65, 0)" },
              ],
            },
          },
          data: monthlyData.map((item) => item.cost),
        },
      ],
    };
  }, [monthlyData]);

  const achievementOption = useMemo(() => {
    const labels = monthlyData.map((item) => item.label);

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        backgroundColor: "#182638",
        borderColor: "rgba(194,210,228,0.14)",
        textStyle: { color: "#e8eef5", fontSize: 10 },
        formatter: (params: any[]) => {
          const title = params?.[0]?.axisValue ?? "";
          const value = params?.[0]?.value;

          return `<b>${title}</b><br/>${params?.[0]?.marker ?? ""} Achievement: ${value === null || value === undefined ? "-" : `${Number(value).toFixed(1)}%`}`;
        },
      },
      grid: {
        left: 48,
        right: 22,
        top: 30,
        bottom: 42,
      },
      xAxis: {
        type: "category",
        data: labels,
        boundaryGap: false,
        axisLine: { lineStyle: { color: chartAxisLine } },
        axisTick: { show: false },
        axisLabel: {
          color: chartBaseTextColor,
          fontSize: 9,
          margin: 10,
        },
      },
      yAxis: {
        type: "value",
        min: 0,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: chartBaseTextColor,
          fontSize: 9,
          formatter: (value: number) => `${value}%`,
        },
        splitLine: {
          lineStyle: { color: chartSplitLine },
        },
      },
      series: [
        {
          name: "Revenue Achievement",
          type: "line",
          smooth: 0.4,
          symbol: "circle",
          symbolSize: 5,
          connectNulls: false,
          lineStyle: {
            width: 1.8,
            color: "#55b985",
            shadowColor: "rgba(85, 185, 133, 0.38)",
            shadowBlur: 9,
            shadowOffsetY: 3,
          },
          itemStyle: {
            color: "#55b985",
          },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(85, 185, 133, 0.23)" },
                { offset: 0.65, color: "rgba(85, 185, 133, 0.07)" },
                { offset: 1, color: "rgba(85, 185, 133, 0)" },
              ],
            },
          },
          markLine: {
            symbol: "none",
            lineStyle: {
              color: "rgba(217, 164, 65, 0.55)",
              type: "dashed",
              width: 1,
            },
            label: {
              color: "#c9aa69",
              fontSize: 9,
              formatter: "Target 100%",
            },
            data: [{ yAxis: 100 }],
          },
          data: monthlyData.map((item) => item.achievement),
        },
      ],
    };
  }, [monthlyData]);

  const costCompositionOption = useMemo(() => {
    const items = costSummary.components;

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "shadow",
        },
        backgroundColor: "#182638",
        borderColor: "rgba(194,210,228,0.14)",
        textStyle: { color: "#e8eef5", fontSize: 10 },
        formatter: (params: any[]) => {
          const item = params?.[0];
          const source = items.find((entry) => entry.name === item?.name);

          if (!source) return "";

          return `<b>${source.name}</b><br/>${item.marker} ${formatRupiah(source.value)}<br/>${source.percentage.toFixed(1)}% dari total`;
        },
      },
      grid: {
        left: 170,
        right: 65,
        top: 18,
        bottom: 24,
      },
      xAxis: {
        type: "value",
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: chartBaseTextColor,
          fontSize: 9,
          formatter: (value: number) => formatChartValue(value),
        },
        splitLine: {
          lineStyle: { color: chartSplitLine },
        },
      },
      yAxis: {
        type: "category",
        inverse: true,
        data: items.map((item) => item.name),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: "#9aaabd",
          fontSize: 9,
          width: 150,
          overflow: "truncate",
        },
      },
      series: [
        {
          name: "Cost",
          type: "bar",
          barMaxWidth: 22,
          itemStyle: {
            borderRadius: [0, 5, 5, 0],
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 1,
              y2: 0,
              colorStops: [
                { offset: 0, color: "#8f2929" },
                { offset: 0.45, color: "#c33f3f" },
                { offset: 0.75, color: "#db5757" },
                { offset: 1, color: "#ed7777" },
              ],
            },
          },
          emphasis: {
            itemStyle: {
              shadowColor: "rgba(220, 70, 70, 0.38)",
              shadowBlur: 10,
              shadowOffsetX: 3,
            },
          },
          label: {
            show: true,
            position: "right",
            color: "#d9a6a6",
            fontSize: 9,
            formatter: (params: any) => {
              const source = items[params.dataIndex];
              return source ? `${source.percentage.toFixed(1)}%` : "";
            },
          },
          data: items.map((item) => item.value),
        },
      ],
    };
  }, [costSummary.components]);

  const resetFilters = () => {
    setSelectedMonth("all");
    setSelectedYear("all");
  };

if (loading) {
  return (
    <div className="app-state app-state-loading">
      <div className="app-spinner" />
      <span>Memuat data Cost Payroll...</span>
    </div>
  );
}

if (error) {
  return (
    <div className="app-state app-state-error">
      <div className="app-state-content">
        <h2>Gagal Memuat Dashboard Cost Payroll</h2>
        <p>{error}</p>

        <button type="button" className="app-retry-button" onClick={() => window.location.reload()}>
          Coba Lagi
        </button>
      </div>
    </div>
  );
}

  return (
    <div className="cost-page">
      <header className="bapp-header">
        <div className="bapp-header-copy">
          <div className="bapp-title-row">
            <h1>Dashboard Target &amp; Cost</h1>

            <span className="bapp-live-badge">
              <span className="bapp-live-dot" />
              Data Terhubung
            </span>
          </div>

          <p>Monitoring target, revenue, dan cost payroll</p>

          <span className="bapp-source">
            Sumber data: <strong>gpm</strong> &amp; <strong>target</strong> &amp; <strong>detail_cost</strong>
          </span>
        </div>
      </header>
      {error && <div className="cost-error">{error}</div>}

      <section className="cost-filter-card">
        <div className="cost-filter-group">
          <label htmlFor="cost-month">Bulan</label>
          <select id="cost-month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}>
            <option value="all">Semua Bulan</option>
            {MONTH_NAMES.map((month, index) => (
              <option key={month} value={String(index + 1)}>
                {month}
              </option>
            ))}
          </select>
        </div>

        <div className="cost-filter-group">
          <label htmlFor="cost-year">Tahun</label>
          <select id="cost-year" value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)}>
            <option value="all">Semua Tahun</option>
            {years.map((year) => (
              <option key={year} value={String(year)}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <button type="button" className="reset-filter" onClick={resetFilters}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />
            <path d="M3 21v-5h5" />
          </svg>

          <span>Reset Filter</span>
        </button>
      </section>

      <section className="cost-kpi-grid">
        <article className="cost-kpi-card blue">
          <div className="cost-kpi-label">Target Revenue</div>
          <div className="cost-kpi-value">{formatCompactRupiah(kpi.targetRevenue)}</div>
          <div className="cost-kpi-description">Target Sustain + Scaling</div>
        </article>

        <article className="cost-kpi-card green">
          <div className="cost-kpi-label">Realisasi Revenue</div>
          <div className="cost-kpi-value">{formatCompactRupiah(kpi.realisasiRevenue)}</div>
          <div className="cost-kpi-description">Realisasi Sustain + Scaling</div>
        </article>

        <article className="cost-kpi-card cyan">
          <div className="cost-kpi-label">Revenue Achievement</div>
          <div className="cost-kpi-value">{kpi.achievement.toFixed(1)}%</div>
          <div className="cost-kpi-description">Realisasi Revenue / Target Revenue</div>
        </article>

        <article className="cost-kpi-card orange">
          <div className="cost-kpi-label">GPM</div>
          <div className="cost-kpi-value">{kpi.gpm.toFixed(1)}%</div>
          <div className="cost-kpi-description">Revenue Payroll BAPP - Cost Payroll</div>
        </article>
      </section>

      <section className="cost-chart-card chart-blue">
        <div className="cost-chart-header">
          <div>
            <h3>Target vs Realisasi Revenue</h3>
            <span>Perbandingan target dan realisasi revenue per bulan</span>
          </div>
        </div>
        <div className="cost-chart-body">{monthlyData.length ? <ReactECharts option={revenueTargetOption} style={{ width: "100%", height: 320 }} notMerge lazyUpdate /> : <div className="cost-empty-chart">Tidak ada data</div>}</div>
      </section>

      <div className="cost-chart-grid">
        <section className="cost-chart-card chart-cyan">
          <div className="cost-chart-header">
            <div>
              <h3>Revenue vs Cost Payroll</h3>
              <span>Revenue Payroll BAPP dibandingkan dengan Cost Payroll</span>
            </div>
          </div>
          <div className="cost-chart-body">{monthlyData.length ? <ReactECharts option={revenueCostOption} style={{ width: "100%", height: 320 }} notMerge lazyUpdate /> : <div className="cost-empty-chart">Tidak ada data</div>}</div>
        </section>

        <section className="cost-chart-card chart-green">
          <div className="cost-chart-header">
            <div>
              <h3>Revenue Achievement % Trend</h3>
              <span>Trend pencapaian realisasi terhadap target revenue</span>
            </div>
          </div>
          <div className="cost-chart-body">{monthlyData.length ? <ReactECharts option={achievementOption} style={{ width: "100%", height: 320 }} notMerge lazyUpdate /> : <div className="cost-empty-chart">Tidak ada data</div>}</div>
        </section>
      </div>

      <section className="cost-chart-card chart-red">
        <div className="cost-chart-header">
          <div>
            <h3>Cost Composition</h3>
            <span>Kontribusi masing-masing komponen terhadap total cost</span>
          </div>
        </div>
        <div className="cost-chart-body">
          {costSummary.components.length ? (
            <ReactECharts
              option={costCompositionOption}
              style={{
                width: "100%",
                height: Math.max(320, costSummary.components.length * 48),
              }}
              notMerge
              lazyUpdate
            />
          ) : (
            <div className="cost-empty-chart">Tidak ada data</div>
          )}
        </div>
      </section>

      <section className="cost-table-card">
        <div className="cost-table-title">
          <div>
            <h3>Detail Cost</h3>
            <span>Rincian komponen cost berdasarkan periode</span>
          </div>

          <div className="cost-table-source">
            Source: <strong>detail_cost</strong>
          </div>
        </div>

        <div className="cost-table-wrapper">
          <table className="cost-table">
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
              {filteredDetailCost.length ? (
                filteredDetailCost.map((row, index) => (
                  <tr key={`${row.periode_bulan}-${index}`}>
                    <td className="cost-number-cell">{index + 1}</td>
                    <td className="cost-month-cell">{getMonthYearLabel(row.periode_bulan)}</td>
                    <td>{formatRupiah(parseNumber(row.beban_jarkom))}</td>
                    <td>{formatRupiah(parseNumber(row.beban_jasnaker))}</td>
                    <td>{formatRupiah(parseNumber(row.beban_kerjasama_pihak_ketiga))}</td>
                    <td>{formatRupiah(parseNumber(row.beban_lain_lain))}</td>
                    <td>{formatRupiah(parseNumber(row.beban_mandatory_gedung))}</td>
                    <td>{formatRupiah(parseNumber(row.depresiasi))}</td>
                    <td className="cost-total-cell">{formatRupiah(parseNumber(row.total))}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="cost-empty-table">
                    Tidak ada data untuk filter yang dipilih.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default CostDashboard;
