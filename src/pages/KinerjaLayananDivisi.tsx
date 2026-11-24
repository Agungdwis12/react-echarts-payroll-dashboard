import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactApexChart from "react-apexcharts";
import ApexCharts from "apexcharts";
import type { ApexAxisChartSeries, ApexOptions } from "apexcharts";
import { Activity, ChevronLeft, ChevronRight, CircleDollarSign, Database, FileSpreadsheet, Layers3, RefreshCw, TrendingUp, Users, XCircle } from "lucide-react";

import SearchableSelect from "../components/dashboard/SearchableSelect";
import MultiSelect from "../components/dashboard/MultiSelect";
import { getMasterDetailDivisi } from "../services/dashboardService";

interface PayrollRow {
  id: number;
  periode_bulan: string;
  divisi: string;
  departemen: string;
  layanan: string;
  jumlah_transaksi: number | string;
  sdm_diproses: number | string;
  sla_tercapai: number | string;
  total_thp: number | string;
  unit: string;
  created_at?: string;
}

interface MonthlyPoint {
  month: string;
  label: string;
  transaksi: number;
  sdm: number;
  nominal: number;
  sla: number;
}

interface ComparisonMonthlyPoint {
  label: string;
  values: Record<
    string,
    {
      transaksi: number | null;
      sdm: number | null;
      nominal: number | null;
      sla: number | null;
    }
  >;
}

type ChartTheme = "blue" | "cyan" | "green" | "orange";

interface ChartConfig {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  theme: ChartTheme;
  options: ApexOptions;
  series: ApexAxisChartSeries;
  empty: string;
  chartType?: "bar" | "line";
}

interface ResponsiveApexChartProps {
  options: ApexOptions;
  series: ApexAxisChartSeries;
  type?: "bar" | "line";
}

const ResponsiveApexChart: React.FC<ResponsiveApexChartProps> = ({ options, series, type = "bar" }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(0);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width !== undefined) setChartWidth(width);
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const labelCount = Array.isArray(options.xaxis?.categories) ? options.xaxis.categories.length : 0;

  const spacePerLabel = labelCount > 0 ? chartWidth / labelCount : chartWidth;

  const rotateLabels = chartWidth === 0 || spacePerLabel < 58;

  const responsiveOptions = useMemo<ApexOptions>(
    () => ({
      ...options,
      xaxis: {
        ...options.xaxis,
        labels: {
          ...options.xaxis?.labels,
          rotate: rotateLabels ? -35 : 0,
          rotateAlways: rotateLabels,
          trim: false,
          hideOverlappingLabels: true,
          style: {
            colors: "#b8c6d6",
            fontSize: "9px",
            fontWeight: 500,
            ...(options.xaxis?.labels?.style || {}),
          },
        },
      },
    }),
    [options, rotateLabels],
  );

  return (
    <div ref={containerRef} className="h-full w-full min-w-0">
      <ReactApexChart options={responsiveOptions} series={series} type={type} width="100%" height="100%" />
    </div>
  );
};

const PAGE_SIZE = 10;

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

const MONTH_MAP: Record<string, number> = {
  jan: 0,
  januari: 0,
  feb: 1,
  februari: 1,
  mar: 2,
  maret: 2,
  apr: 3,
  april: 3,
  mei: 4,
  may: 4,
  jun: 5,
  juni: 5,
  jul: 6,
  juli: 6,
  aug: 7,
  agustus: 7,
  sep: 8,
  september: 8,
  okt: 9,
  oktober: 9,
  nov: 10,
  november: 10,
  des: 11,
  desember: 11,
  dec: 11,
};

const MONTH_FILTER_MAP: Record<string, number> = Object.fromEntries(MONTHS.map((month, index) => [month, index + 1]));

const PANEL_CLASS = "rounded-xl border border-slate-300/[0.12] bg-gradient-to-br from-[#1d2a3b] via-[#1b2839] to-[#192638] shadow-[0_6px_20px_rgba(0,0,0,0.14)]";

const LABEL_CLASS = "mb-1 block text-[10px] font-bold tracking-wide text-slate-300/80";

const KPI_THEMES = {
  blue: {
    card: "border border-l-4 border-blue-400/25 border-l-blue-400 from-[#1d2c42] to-[#1b293b]",
    icon: "bg-blue-400/15 text-blue-300",
    glow: "bg-blue-400/[0.06]",
    line: "from-blue-400 to-blue-600",
  },
  cyan: {
    card: "border border-l-4 border-cyan-400/25 border-l-cyan-400 from-[#1d2e3b] to-[#1b2a38]",
    icon: "bg-cyan-400/15 text-cyan-300",
    glow: "bg-cyan-400/[0.06]",
    line: "from-cyan-400 to-teal-600",
  },
  green: {
    card: "border border-l-4 border-emerald-400/25 border-l-emerald-400 from-[#1e302d] to-[#1b2b2b]",
    icon: "bg-emerald-400/15 text-emerald-300",
    glow: "bg-emerald-400/[0.06]",
    line: "from-emerald-400 to-green-700",
  },
  orange: {
    card: "border border-l-4 border-amber-400/25 border-l-amber-400 from-[#302b22] to-[#29271f]",
    icon: "bg-amber-400/15 text-amber-300",
    glow: "bg-amber-400/[0.06]",
    line: "from-amber-400 to-orange-600",
  },
} as const;

const CHART_THEMES: Record<ChartTheme, { border: string; icon: string; label: string }> = {
  blue: {
    border: "border-t-blue-400",
    icon: "bg-blue-400/10 text-blue-300",
    label: "text-blue-300",
  },
  cyan: {
    border: "border-t-cyan-400",
    icon: "bg-cyan-400/10 text-cyan-300",
    label: "text-cyan-300",
  },
  green: {
    border: "border-t-emerald-400",
    icon: "bg-emerald-400/10 text-emerald-300",
    label: "text-emerald-300",
  },
  orange: {
    border: "border-t-amber-400",
    icon: "bg-amber-400/10 text-amber-300",
    label: "text-amber-300",
  },
};

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

const formatNumber = (value: number): string =>
  new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(value);

const formatRupiah = (value: number): string => `Rp ${formatNumber(value)}`;

const formatCompactRupiah = (value: number): string => {
  if (value >= 1_000_000_000_000) {
    return `Rp ${(value / 1_000_000_000_000).toLocaleString("id-ID", {
      maximumFractionDigits: 2,
    })} T`;
  }

  if (value >= 1_000_000_000) {
    return `Rp ${(value / 1_000_000_000).toLocaleString("id-ID", {
      maximumFractionDigits: 2,
    })} M`;
  }

  if (value >= 1_000_000) {
    return `Rp ${(value / 1_000_000).toLocaleString("id-ID", {
      maximumFractionDigits: 2,
    })} Jt`;
  }

  if (value >= 1_000) {
    return `Rp ${(value / 1_000).toLocaleString("id-ID", {
      maximumFractionDigits: 2,
    })} Rb`;
  }

  return formatRupiah(value);
};

const formatNominalTooltip = (value: number): string => {
  if (value >= 1_000_000_000_000) {
    return `Rp ${(value / 1_000_000_000_000).toLocaleString("id-ID", {
      maximumFractionDigits: 2,
    })} triliun`;
  }

  if (value >= 1_000_000_000) {
    return `Rp ${(value / 1_000_000_000).toLocaleString("id-ID", {
      maximumFractionDigits: 2,
    })} Miliar`;
  }

  if (value >= 1_000_000) {
    return `Rp ${(value / 1_000_000).toLocaleString("id-ID", {
      maximumFractionDigits: 2,
    })} juta`;
  }

  return formatRupiah(value);
};

const normalizeSLA = (value: unknown): number => {
  if (value === null || value === undefined || value === "") return 0;

  if (typeof value === "number") {
    let sla = value;

    if (sla >= 0 && sla <= 1) sla *= 100;
    if (sla > 100) sla /= 100;

    return Math.min(Math.max(sla, 0), 100);
  }

  let text = String(value).trim().replace(/\s/g, "");
  if (!text) return 0;

  const hasPercent = text.includes("%");
  text = text.replace("%", "");

  if (text.includes(",") && !text.includes(".")) {
    text = text.replace(",", ".");
  }

  const numericValue = Number(text);
  if (!Number.isFinite(numericValue)) return 0;

  let sla = numericValue;

  if (sla >= 0 && sla <= 1 && !hasPercent) sla *= 100;
  if (sla > 100) sla /= 100;

  return Math.min(Math.max(sla, 0), 100);
};

const getMonthTimestamp = (value: string): number => {
  if (!value) return 0;

  const text = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    const date = new Date(text);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }

  if (/^\d{4}-\d{2}$/.test(text)) {
    const [year, month] = text.split("-").map(Number);
    return new Date(year, month - 1, 1).getTime();
  }

  const parts = text.replace(/-/g, " ").replace(/\//g, " ").split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    const first = parts[0].toLowerCase();
    const second = parts[1].toLowerCase();
    const firstMonth = MONTH_MAP[first];

    if (firstMonth !== undefined) {
      let year = Number(parts[1]);
      if (year < 100) year += 2000;

      return Number.isFinite(year) ? new Date(year, firstMonth, 1).getTime() : 0;
    }

    const secondMonth = MONTH_MAP[second];

    if (secondMonth !== undefined) {
      const year = Number(parts[0]);

      return Number.isFinite(year) ? new Date(year, secondMonth, 1).getTime() : 0;
    }
  }

  const fallback = new Date(text);
  return Number.isNaN(fallback.getTime()) ? 0 : fallback.getTime();
};

const formatMonth = (value: string): string => {
  const timestamp = getMonthTimestamp(value);
  if (!timestamp) return value || "-";

  return new Date(timestamp).toLocaleDateString("id-ID", {
    month: "short",
    year: "numeric",
  });
};

const normalizeText = (value: string | null | undefined): string => (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();

const formatDisplayText = (value: string | null | undefined): string => {
  const text = (value ?? "").trim().replace(/\s+/g, " ");

  if (!text) return "";

  // Ubah seluruh teks menjadi Title Case.
  return text.toLocaleLowerCase("id-ID").replace(/(^|[\s/-])([\p{L}\p{N}])/gu, (_, separator, character) => separator + character.toLocaleUpperCase("id-ID"));
};

const uniqueSorted = (values: Array<string | null | undefined>): string[] => {
  const uniqueMap = new Map<string, string>();

  values.forEach((value) => {
    if (!value?.trim()) return;

    const normalized = normalizeText(value);

    if (!uniqueMap.has(normalized)) {
      uniqueMap.set(normalized, formatDisplayText(value));
    }
  });

  return [...uniqueMap.values()].sort((a, b) => a.localeCompare(b, "id"));
};

const getComparisonColors = (years: string[], comparisonData: ComparisonMonthlyPoint[], metric: "transaksi" | "sdm" | "nominal" | "sla", latestColor: string, olderColors: string[]): string[] => {
  const yearsWithData = years.filter((year) => comparisonData.some((point) => point.values[year]?.[metric] != null));
  const latestYear = [...yearsWithData].sort((a, b) => Number(b) - Number(a))[0] ?? "";
  const olderYears = years.filter((year) => year !== latestYear);

  return years.map((year) => {
    if (year === latestYear) return latestColor;
    const olderIndex = olderYears.indexOf(year);
    return olderColors[Math.min(Math.max(olderIndex, 0), olderColors.length - 1)] ?? latestColor;
  });
};

const getComboComparisonColors = (years: string[], comparisonData: ComparisonMonthlyPoint[]): string[] => {
  const yearsWithData = years.filter((year) =>
    comparisonData.some((point) => {
      const value = point.values[year];
      return value != null && (value.sdm != null || value.nominal != null);
    }),
  );
  const latestYear = [...yearsWithData].sort((a, b) => Number(b) - Number(a))[0] ?? "";
  const olderYears = years.filter((year) => year !== latestYear);
  const sdmOlder = ["#CFFAFE", "#A5F3FC", "#67E8F9", "#22D3EE"];
  // Semua garis nominal memakai satu warna hijau yang konsisten untuk setiap tahun.
  const nominalColor = "#22C55E";

  return years.flatMap((year) => {
    if (year === latestYear) return ["#0891B2", nominalColor];
    const index = Math.min(Math.max(olderYears.indexOf(year), 0), sdmOlder.length - 1);
    return [sdmOlder[index], nominalColor];
  });
};

const CHART_AXIS_COLOR = "#b8c6d6";
const CHART_GRID_COLOR = "rgba(255,255,255,0.12)";

const compactAxisValue = (value: number): string => {
  const absValue = Math.abs(value);

  if (absValue >= 1_000_000_000_000) {
    return `${(value / 1_000_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} triliun`;
  }
  if (absValue >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} miliar`;
  }
  if (absValue >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} juta`;
  }
  if (absValue >= 1_000) {
    return `${(value / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} Ribu`;
  }
  return value.toLocaleString("id-ID");
};

const chartBaseOptions = (categories: string[], comparison = false, percent = false): ApexOptions => ({
  chart: {
    type: "bar",
    height: "100%",
    width: "100%",
    background: "transparent",
    foreColor: CHART_AXIS_COLOR,
    toolbar: { show: false },
    zoom: { enabled: false },
    animations: {
      enabled: true,
      speed: 750,
      easing: "easeout",
      animateGradually: { enabled: true, delay: 80 },
      dynamicAnimation: { enabled: true, speed: 350 },
    },
    parentHeightOffset: 0,
  },
  theme: { mode: "dark" },
  colors: ["#2563EB", "#1d4f91"],
  plotOptions: {
    bar: {
      horizontal: false,
      columnWidth: comparison ? "62%" : categories.length > 8 ? "78%" : "58%",
      borderRadius: 5,
      borderRadiusApplication: "end",
      borderRadiusWhenStacked: "last",
      dataLabels: { position: "top" },
    },
  },
  dataLabels: { enabled: false },
  stroke: { show: false, width: 0 },
  fill: {
    type: "solid",
    opacity: 1,
  },
  grid: {
    show: true,
    borderColor: CHART_GRID_COLOR,
    strokeDashArray: 0,
    padding: {
      left: 8,
      right: 8,
      top: comparison ? 0 : 4,
      bottom: 0,
    },
    xaxis: { lines: { show: false } },
    yaxis: { lines: { show: true } },
  },
  xaxis: {
    categories,
    axisBorder: { show: true, color: "rgba(255,255,255,0.16)" },
    axisTicks: { show: false },
    labels: {
      show: true,
      rotate: -35,
      rotateAlways: false,
      trim: false,
      hideOverlappingLabels: true,
      offsetY: 2,
      style: { colors: CHART_AXIS_COLOR, fontSize: "9px", fontWeight: 500 },
    },
    tooltip: { enabled: false },
  },
  yaxis: {
    min: percent ? 0 : undefined,
    max: percent ? 100 : undefined,
    tickAmount: percent ? 5 : 5,
    forceNiceScale: !percent,
    labels: {
      formatter: (value: number) => (percent ? `${Math.round(value)}%` : compactAxisValue(value)),
      style: { colors: CHART_AXIS_COLOR, fontSize: "9px", fontWeight: 500 },
      minWidth: 0,
      maxWidth: 76,
    },
  },
  legend: {
    show: comparison,
    position: "top",
    horizontalAlign: "right",
    fontSize: "9px",
    labels: { colors: CHART_AXIS_COLOR },
    markers: {
      size: 4,
      strokeWidth: 2,
    },
    itemMargin: { horizontal: 6, vertical: 0 },
    offsetY: 16,
  },
  tooltip: {
    theme: "dark",
    style: {
      fontSize: "11px",
      fontFamily: "inherit",
    },
    shared: true,
    intersect: false,
    followCursor: true,
    x: { show: true },
    y: {
      formatter: (value: number) => formatNumber(Number(value)),
    },
    marker: { show: true },
    fillSeriesColor: false,
  },
  states: {
    hover: { filter: { type: "lighten", value: 0.08 } },
    active: { filter: { type: "none", value: 0 } },
  },
  noData: {
    text: "Tidak ada data",
    align: "center",
    verticalAlign: "middle",
    style: { color: "#64748b", fontSize: "10px" },
  },
});

const createBarChart = (monthlyData: MonthlyPoint[], name: string, values: number[], color: string, formatter?: (value: number) => string): { options: ApexOptions; series: ApexAxisChartSeries } => {
  const options = chartBaseOptions(monthlyData.map((item) => item.label));
  return {
    options: {
      ...options,
      colors: [color],
      tooltip: {
        ...options.tooltip,
        y: {
          formatter: (value: number) => (formatter ? formatter(Number(value)) : formatNumber(Number(value))),
        },
      },
    },
    series: [{ name, data: values }],
  };
};

const createComparisonBarChart = (
  labels: string[],
  years: string[],
  comparisonData: ComparisonMonthlyPoint[],
  metric: "transaksi" | "sdm" | "nominal",
  name: string,
  latestColor: string,
  olderColors: string[],
  formatter?: (value: number) => string,
): { options: ApexOptions; series: ApexAxisChartSeries } => {
  const options = chartBaseOptions(labels, true);
  const seriesColors = getComparisonColors(years, comparisonData, metric, latestColor, olderColors);
  return {
    options: {
      ...options,
      colors: seriesColors,
      plotOptions: {
        ...options.plotOptions,
        bar: {
          ...options.plotOptions?.bar,
          columnWidth: years.length <= 2 ? "58%" : years.length <= 4 ? "48%" : "38%",
          borderRadius: 4,
        },
      },
      tooltip: {
        ...options.tooltip,
        y: {
          formatter: (value: number) => (value == null ? "Tidak ada data" : formatter ? formatter(Number(value)) : formatNumber(Number(value))),
        },
      },
    },
    series: years.map((year) => ({
      name: `${name} ${year}`,
      data: comparisonData.map((item) => item.values[year]?.[metric] ?? null),
    })),
  };
};

const createComparisonSlaChart = (labels: string[], years: string[], comparisonData: ComparisonMonthlyPoint[]): { options: ApexOptions; series: ApexAxisChartSeries } => {
  const options = chartBaseOptions(labels, true, true);
  const seriesColors = getComparisonColors(years, comparisonData, "sla", "#F59E0B", ["#FDE68A", "#FCD34D", "#FBBF24", "#FCD34D"]);
  return {
    options: {
      ...options,
      colors: seriesColors,
      plotOptions: {
        ...options.plotOptions,
        bar: { ...options.plotOptions?.bar, columnWidth: years.length <= 2 ? "58%" : years.length <= 4 ? "48%" : "38%", borderRadius: 4 },
      },
      tooltip: {
        ...options.tooltip,
        y: {
          formatter: (value: number) => (value == null ? "Tidak ada data" : `${Math.round(Number(value))}%`),
        },
      },
    },
    series: years.map((year) => ({
      name: `SLA ${year}`,
      data: comparisonData.map((item) => {
        const value = item.values[year]?.sla;
        return value == null ? null : Number(value.toFixed(2));
      }),
    })),
  };
};

const createSdmNominalComboChart = (
  displayedData: MonthlyPoint[],
  comparisonLabels: string[],
  comparisonYears: string[],
  comparisonData: ComparisonMonthlyPoint[],
  isYearComparison: boolean,
): { options: ApexOptions; series: ApexAxisChartSeries } => {
  const categories = isYearComparison ? comparisonLabels : displayedData.map((item) => item.label);
  const years = isYearComparison ? comparisonYears : [""];

  const sdmSeriesNames = years.map((year) => (year ? `SDM ${year}` : "SDM Diproses"));
  const nominalSeriesNames = years.map((year) => (year ? `Nominal ${year}` : "Total Nominal"));

  const series = years.flatMap((year) => {
    const sdmValues = isYearComparison ? comparisonData.map((item) => item.values[year]?.sdm ?? null) : displayedData.map((item) => item.sdm);
    const nominalValues = isYearComparison ? comparisonData.map((item) => item.values[year]?.nominal ?? null) : displayedData.map((item) => item.nominal);

    return [
      { name: year ? `SDM ${year}` : "SDM Diproses", type: "column", data: sdmValues },
      { name: year ? `Nominal ${year}` : "Total Nominal", type: "line", data: nominalValues },
    ];
  }) as ApexAxisChartSeries;

  const baseOptions = chartBaseOptions(categories, isYearComparison);
  // Tahun terbaru yang benar-benar memiliki data memakai warna solid.
  // Tahun sebelumnya memakai variasi warna lebih lembut, konsisten untuk SDM dan nominal.
  const seriesColors = isYearComparison ? getComboComparisonColors(years, comparisonData) : ["#0891B2", "#22C55E"];

  return {
    options: {
      ...baseOptions,
      chart: {
        ...baseOptions.chart,
        type: "line",
        width: "100%",
        redrawOnParentResize: true,
        redrawOnWindowResize: true,
        // Chart hanya untuk melihat data: nonaktifkan zoom, pan, dan selection.
        toolbar: { show: false },
        zoom: { enabled: false },
        selection: { enabled: false },
        animations: {
          enabled: true,
          speed: 650,
          easing: "easeinout",
          animateGradually: { enabled: true, delay: 45 },
          dynamicAnimation: { enabled: true, speed: 400 },
        },
      },
      colors: seriesColors,
      plotOptions: {
        ...baseOptions.plotOptions,
        bar: {
          ...baseOptions.plotOptions?.bar,
          horizontal: false,
          // Perlebar batang per kategori agar seri yang memiliki data tidak tampak terlalu renggang.
          // Lebar bertambah bertahap mengikuti jumlah tahun yang dibandingkan.
          columnWidth: !isYearComparison ? "52%" : years.length <= 2 ? "58%" : years.length <= 4 ? "68%" : "76%",
          borderRadius: 4,
          borderRadiusApplication: "end",
          hideZeroBarsWhenGrouped: true,
        },
      },
      stroke: {
        curve: "straight",
        width: years.flatMap(() => [0, 3]),
        dashArray: years.flatMap(() => [0, 0]),
        lineCap: "round",
      },
      markers: {
        size: years.flatMap(() => [0, 5]),
        strokeWidth: 2,
        strokeColors: "#192638",
        hover: { size: 7 },
      },
      fill: {
        type: "solid",
        opacity: years.flatMap(() => [1, 1]),
      },
      yaxis: [
        {
          seriesName: sdmSeriesNames,
          title: {
            text: "Jumlah SDM",
            style: { color: CHART_AXIS_COLOR, fontSize: "10px", fontWeight: 500 },
          },
          min: 0,
          forceNiceScale: true,
          labels: {
            formatter: (value: number) => formatNumber(value),
            style: { colors: "#b8c6d6", fontSize: "9px" },
          },
        },
        {
          seriesName: nominalSeriesNames,
          opposite: true,
          title: {
            text: "Total Nominal (Rp)",
            style: { color: CHART_AXIS_COLOR, fontSize: "10px", fontWeight: 600 },
          },
          min: 0,
          forceNiceScale: true,
          labels: {
            formatter: (value: number) => formatCompactRupiah(value),
            style: { colors: "#b8c6d6", fontSize: "9px" },
          },
        },
      ],
      tooltip: {
        ...baseOptions.tooltip,
        shared: true,
        intersect: false,
        y: {
          formatter: (value, opts) => {
            const seriesIndex = opts?.seriesIndex ?? -1;
            const seriesName = String((series[seriesIndex] as { name?: string })?.name ?? "");
            return seriesName.startsWith("SDM") ? formatNumber(Number(value ?? 0)) : formatNominalTooltip(Number(value ?? 0));
          },
        },
      },
      legend: {
        ...baseOptions.legend,
        show: true,
        position: "top",
        horizontalAlign: "right",
        fontSize: "10px",
        itemMargin: { horizontal: 8, vertical: 3 },
      },
    },
    series,
  };
};

interface KpiCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  theme: ChartTheme;
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, icon, theme }) => {
  const colors = KPI_THEMES[theme];

  return (
    <div className={`group relative min-w-0 overflow-hidden rounded-xl border bg-gradient-to-br p-3 shadow-[0_6px_16px_rgba(0,0,0,0.12)] transition duration-200 hover:-translate-y-0.5 ${colors.card}`}>
      <div className={`pointer-events-none absolute -right-9 -top-10 h-24 w-24 rounded-full blur-xl ${colors.glow}`} />

      <div className="relative z-10 flex min-h-[60px] items-center gap-2">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${colors.icon}`}>{icon}</div>

        <div className="min-w-0 flex-1">
          <p className="mb-1 text-[9px] font-semibold tracking-wide text-slate-300/80">{title}</p>
          <p className="truncate text-base font-extrabold leading-tight text-slate-100" title={value}>
            {value}
          </p>
        </div>
      </div>

      <div className={`absolute bottom-0 left-0 h-[2px] w-full bg-gradient-to-r opacity-80 ${colors.line}`} />
    </div>
  );
};

const KinerjaLayananDivisi: React.FC = () => {
  const [data, setData] = useState<PayrollRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [unit, setUnit] = useState("");
  const [divisi, setDivisi] = useState("");
  const [departemen, setDepartemen] = useState("");
  const [layanan, setLayanan] = useState("");
  const [bulan, setBulan] = useState<string[]>([]);
  const [tahun, setTahun] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hiddenChartSeries, setHiddenChartSeries] = useState<Record<string, string[]>>({});

  useEffect(() => {
    let active = true;
    let isFirstLoad = true;

    const loadData = async () => {
      try {
        if (active && isFirstLoad) {
          setLoading(true);
        }

        setError("");

        const result = await getMasterDetailDivisi();

        if (active) {
          setData((result || []) as PayrollRow[]);
        }
      } catch (err) {
        console.error("Gagal memuat data kinerja layanan:", err);

        if (active && isFirstLoad) {
          setError("Gagal mengambil data dashboard.");
        }
      } finally {
        if (active && isFirstLoad) {
          setLoading(false);
          isFirstLoad = false;
        }
      }
    };

    // Ambil data saat dashboard pertama kali dibuka.
    void loadData();

    // Perbarui data setiap 30 detik.
    const intervalId = window.setInterval(() => {
      void loadData();
    }, 30_000);

    // Refresh ketika pengguna kembali ke tab dashboard.
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadData();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const unitOptions = useMemo(() => uniqueSorted(data.map((item) => item.unit)), [data]);

  const unitScopedData = useMemo(() => (unit ? data.filter((item) => normalizeText(item.unit) === normalizeText(unit)) : data), [data, unit]);

  const divisiOptions = useMemo(() => uniqueSorted(unitScopedData.map((item) => item.divisi)), [unitScopedData]);

  const departemenOptions = useMemo(() => {
    const source = divisi ? unitScopedData.filter((item) => normalizeText(item.divisi) === normalizeText(divisi)) : unitScopedData;

    return uniqueSorted(source.map((item) => item.departemen));
  }, [unitScopedData, divisi]);

  const layananOptions = useMemo(() => {
    let source = unitScopedData;

    if (divisi) {
      source = source.filter((item) => normalizeText(item.divisi) === normalizeText(divisi));
    }

    if (departemen) {
      source = source.filter((item) => normalizeText(item.departemen) === normalizeText(departemen));
    }

    return uniqueSorted(source.map((item) => item.layanan));
  }, [unitScopedData, divisi, departemen]);

  const yearOptions = useMemo(
    () =>
      uniqueSorted(
        data.map((item) => {
          const timestamp = getMonthTimestamp(item.periode_bulan);
          return timestamp ? String(new Date(timestamp).getFullYear()) : "";
        }),
      ).sort((a, b) => Number(a) - Number(b)),
    [data],
  );

  const filteredData = useMemo(
    () =>
      data
        .filter((item) => {
          const timestamp = getMonthTimestamp(item.periode_bulan);
          const date = timestamp ? new Date(timestamp) : null;
          const itemMonth = date ? date.getMonth() + 1 : null;
          const itemYear = date ? String(date.getFullYear()) : "";

          const monthMatch = bulan.length === 0 || bulan.some((selectedMonth) => MONTH_FILTER_MAP[selectedMonth] === itemMonth);

          const yearMatch = tahun.length === 0 || tahun.includes(itemYear);

          return (
            (!unit || normalizeText(item.unit) === normalizeText(unit)) &&
            (!divisi || normalizeText(item.divisi) === normalizeText(divisi)) &&
            (!departemen || normalizeText(item.departemen) === normalizeText(departemen)) &&
            (!layanan || normalizeText(item.layanan) === normalizeText(layanan)) &&
            monthMatch &&
            yearMatch
          );
        })
        .sort((a, b) => getMonthTimestamp(a.periode_bulan) - getMonthTimestamp(b.periode_bulan)),
    [data, unit, divisi, departemen, layanan, bulan, tahun],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [unit, divisi, departemen, layanan, bulan, tahun]);

  const totalTransaksi = useMemo(() => filteredData.reduce((sum, item) => sum + parseNumber(item.jumlah_transaksi), 0), [filteredData]);

  const totalLayanan = useMemo(() => new Set(filteredData.map((item) => normalizeText(item.layanan)).filter(Boolean)).size, [filteredData]);

  const totalSDM = useMemo(() => filteredData.reduce((sum, item) => sum + parseNumber(item.sdm_diproses), 0), [filteredData]);

  const totalNominal = useMemo(() => filteredData.reduce((sum, item) => sum + parseNumber(item.total_thp), 0), [filteredData]);

  // Agregasi chart utama: seluruh tanggal pada bulan dan tahun yang sama
  // digabung menjadi satu titik bulanan. Tanggal asli di database tidak diubah.
  const monthlyData = useMemo<MonthlyPoint[]>(() => {
    const monthlyMap = new Map<
      string,
      {
        transaksi: number;
        sdm: number;
        nominal: number;
        slaTotal: number;
        slaCount: number;
      }
    >();

    filteredData.forEach((item) => {
      const timestamp = getMonthTimestamp(item.periode_bulan);
      if (!timestamp) return;

      const date = new Date(timestamp);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, {
          transaksi: 0,
          sdm: 0,
          nominal: 0,
          slaTotal: 0,
          slaCount: 0,
        });
      }

      const current = monthlyMap.get(key);
      if (!current) return;

      current.transaksi += parseNumber(item.jumlah_transaksi);
      current.sdm += parseNumber(item.sdm_diproses);
      current.nominal += parseNumber(item.total_thp);
      current.slaTotal += normalizeSLA(item.sla_tercapai);
      current.slaCount += 1;
    });

    return [...monthlyMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, value]) => ({
        month,
        label: formatMonth(month),
        transaksi: value.transaksi,
        sdm: value.sdm,
        nominal: value.nominal,
        sla: value.slaCount > 0 ? value.slaTotal / value.slaCount : 0,
      }));
  }, [filteredData]);

  const isYearComparison = tahun.length > 1;
  const comparisonYears = useMemo(() => [...tahun].sort((a, b) => Number(a) - Number(b)), [tahun]);

  // Pilihan bulan yang eksplisit selalu menjadi acuan chart.
  // Jika bulan tidak dipilih, gunakan 8 bulan terbaru dari tahun paling baru
  // yang dipilih (atau tahun paling baru yang tersedia pada mode default).
  const comparisonMonthIndexes = useMemo(() => {
    // Jika bulan dipilih secara manual, ikuti pilihan bulan tersebut.
    if (bulan.length > 0) {
      return MONTHS.map((month, index) => (bulan.includes(month) ? index : -1)).filter((index) => index >= 0);
    }

    // Mode perbandingan: tampilkan semua bulan yang tersedia
    // pada seluruh tahun yang dipilih (misalnya 2025 dan 2026).
    if (comparisonYears.length > 1) {
      const availableMonths = new Set<number>();

      filteredData.forEach((item) => {
        const timestamp = getMonthTimestamp(item.periode_bulan);
        if (!timestamp) return;

        const date = new Date(timestamp);
        const itemYear = String(date.getFullYear());

        if (comparisonYears.includes(itemYear)) {
          availableMonths.add(date.getMonth());
        }
      });

      return [...availableMonths].sort((a, b) => a - b);
    }

    return [];
  }, [filteredData, comparisonYears, bulan]);
  const comparisonLabels = useMemo(() => comparisonMonthIndexes.map((monthIndex) => MONTHS[monthIndex].slice(0, 3)), [comparisonMonthIndexes]);

  // Agregasi per bulan kalender untuk setiap tahun pada mode perbandingan.
  const comparisonMonthlyData = useMemo<ComparisonMonthlyPoint[]>(() => {
    const result: ComparisonMonthlyPoint[] = comparisonMonthIndexes.map((monthIndex) => ({
      label: MONTHS[monthIndex].slice(0, 3),
      values: Object.fromEntries(comparisonYears.map((year) => [year, { transaksi: null, sdm: null, nominal: null, sla: null }])) as ComparisonMonthlyPoint["values"],
    }));

    const aggregate = new Map<string, Map<number, { transaksi: number; sdm: number; nominal: number; slaTotal: number; slaCount: number }>>();

    filteredData.forEach((item) => {
      const timestamp = getMonthTimestamp(item.periode_bulan);
      if (!timestamp) return;

      const date = new Date(timestamp);
      const year = String(date.getFullYear());
      const monthIndex = date.getMonth();

      if (!comparisonYears.includes(year)) return;

      if (!aggregate.has(year)) aggregate.set(year, new Map());
      const yearData = aggregate.get(year)!;

      if (!yearData.has(monthIndex)) {
        yearData.set(monthIndex, {
          transaksi: 0,
          sdm: 0,
          nominal: 0,
          slaTotal: 0,
          slaCount: 0,
        });
      }

      const current = yearData.get(monthIndex)!;
      current.transaksi += parseNumber(item.jumlah_transaksi);
      current.sdm += parseNumber(item.sdm_diproses);
      current.nominal += parseNumber(item.total_thp);
      current.slaTotal += normalizeSLA(item.sla_tercapai);
      current.slaCount += 1;
    });

    result.forEach((point, resultIndex) => {
      const monthIndex = comparisonMonthIndexes[resultIndex];
      comparisonYears.forEach((year) => {
        const current = aggregate.get(year)?.get(monthIndex);
        if (!current) return;

        point.values[year] = {
          transaksi: current.transaksi,
          sdm: current.sdm,
          nominal: current.nominal,
          sla: current.slaCount > 0 ? current.slaTotal / current.slaCount : null,
        };
      });
    });

    return result;
  }, [filteredData, comparisonYears, comparisonMonthIndexes]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedData = filteredData.slice(startIndex, startIndex + PAGE_SIZE);

  const startRow = filteredData.length === 0 ? 0 : startIndex + 1;
  const endRow = Math.min(startIndex + PAGE_SIZE, filteredData.length);
  const displayedMonthlyData = useMemo(() => {
    const latestAvailableYear = monthlyData.length ? monthlyData[monthlyData.length - 1].month.slice(0, 4) : "";

    const chartYear = tahun.length === 1 ? tahun[0] : latestAvailableYear;

    let result = monthlyData.filter((item) => item.month.startsWith(`${chartYear}-`));

    // Jika bulan dipilih, tampilkan hanya bulan yang dipilih.
    if (bulan.length > 0) {
      const selectedMonthIndexes = new Set(bulan.map((month) => MONTH_FILTER_MAP[month]));

      result = result.filter((item) => {
        const monthIndex = Number(item.month.slice(5, 7));
        return selectedMonthIndexes.has(monthIndex);
      });

      return result;
    }

    // Jika satu tahun dipilih, tampilkan seluruh bulan pada tahun tersebut.
    if (tahun.length === 1) {
      return result;
    }

    // Default: tampilkan 8 bulan terbaru.
    return result.slice(-8);
  }, [monthlyData, tahun, bulan]);

  const transactionChart = useMemo(
    () =>
      isYearComparison
        ? createComparisonBarChart(comparisonLabels, comparisonYears, comparisonMonthlyData, "transaksi", "Transaksi", "#2563EB", ["#BFDBFE", "#93C5FD", "#60A5FA", "#3B82F6"])
        : createBarChart(
            displayedMonthlyData,
            "Jumlah Transaksi",
            displayedMonthlyData.map((item) => item.transaksi),
            "#2563EB",
          ),
    [isYearComparison, comparisonLabels, comparisonYears, comparisonMonthlyData, displayedMonthlyData],
  );

  const sdmNominalChart = useMemo(
    () => createSdmNominalComboChart(displayedMonthlyData, comparisonLabels, comparisonYears, comparisonMonthlyData, isYearComparison),
    [displayedMonthlyData, comparisonLabels, comparisonYears, comparisonMonthlyData, isYearComparison],
  );

  const slaChart = useMemo(() => {
    if (isYearComparison) {
      return createComparisonSlaChart(comparisonLabels, comparisonYears, comparisonMonthlyData);
    }

    const baseOptions = chartBaseOptions(
      displayedMonthlyData.map((item) => item.label),
      false,
      true,
    );
    return {
      options: {
        ...baseOptions,
        colors: ["#F59E0B"],
        tooltip: {
          ...baseOptions.tooltip,
          y: { formatter: (value: number) => `${Math.round(Number(value))}%` },
        },
      },
      series: [
        {
          name: "SLA Tercapai",
          data: displayedMonthlyData.map((item) => Math.min(Math.max(Math.round(item.sla), 0), 100)),
        },
      ],
    };
  }, [isYearComparison, comparisonLabels, comparisonYears, comparisonMonthlyData, displayedMonthlyData]);

  const chartConfigs: ChartConfig[] = [
    {
      title: isYearComparison ? "Perbandingan Transaksi per Bulan" : "Tren Jumlah Transaksi per Bulan",
      subtitle: isYearComparison ? `Jumlah transaksi bulanan: ${comparisonYears.join(" vs ")}` : "Jumlah transaksi pada setiap bulan",
      icon: <TrendingUp size={15} />,
      theme: "blue",
      options: transactionChart.options,
      series: transactionChart.series,
      empty: "Tidak ada data transaksi",
    },
    {
      title: isYearComparison ? "Perbandingan Pencapaian SLA" : "Pencapaian SLA per Bulan",
      subtitle: isYearComparison ? `Persentase SLA bulanan: ${comparisonYears.join(" vs ")}` : "Persentase pencapaian SLA setiap bulan",
      icon: <Activity size={15} />,
      theme: "orange",
      options: slaChart.options,
      series: slaChart.series,
      empty: "Tidak ada data SLA",
    },
    {
      title: isYearComparison ? "Perbandingan SDM dan Nominal" : "Tren SDM Diproses dan Total Nominal",
      subtitle: isYearComparison ? `Batang menunjukkan SDM dan garis menunjukkan nominal per tahun (${comparisonYears.join(" vs ")})` : "Batang menunjukkan jumlah SDM dan garis menunjukkan total nominal",
      icon: <Users size={15} />,
      theme: "cyan",
      options: sdmNominalChart.options,
      series: sdmNominalChart.series,
      chartType: "line",
      empty: "Tidak ada data SDM dan nominal",
    },
  ];

  const resetFilter = () => {
    setUnit("");
    setDivisi("");
    setDepartemen("");
    setLayanan("");
    setBulan([]);
    setTahun([]);
    setCurrentPage(1);
  };

  const toggleChartSeries = (chartId: string, seriesName: string) => {
    const hidden = hiddenChartSeries[chartId] ?? [];
    const isCurrentlyHidden = hidden.includes(seriesName);

    // Gunakan aksi eksplisit agar status legenda dan visibilitas seri selalu sinkron.
    ApexCharts.exec(chartId, isCurrentlyHidden ? "showSeries" : "hideSeries", seriesName);

    setHiddenChartSeries((current) => {
      const currentHidden = current[chartId] ?? [];

      return {
        ...current,
        [chartId]: isCurrentlyHidden ? currentHidden.filter((name) => name !== seriesName) : [...currentHidden, seriesName],
      };
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-3 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-500/20 border-t-blue-400" />

        <div>
          <p className="text-sm font-semibold text-slate-200">Memuat Dashboard Kinerja Layanan Divisi</p>
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

          <h2 className="text-base font-bold text-slate-100">Dashboard Kinerja Layanan Divisi Gagal Dimuat</h2>

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

  return (
    <div className="kinerja-compact-tooltip w-full min-w-0 space-y-3 font-sans text-slate-100">
      <style>{`
  .kinerja-compact-tooltip .apexcharts-tooltip {
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

  .kinerja-compact-tooltip .apexcharts-tooltip-title {
    background: #000000 !important;
    color: #f1f5f9 !important;
    border-bottom: 1px solid rgba(148, 163, 184, 0.16) !important;
    margin: 0 !important;
    padding: 4px 8px !important;
    font-size: 11px !important;
    font-weight: 700 !important;
    line-height: 1.1 !important;
  }

  .kinerja-compact-tooltip .apexcharts-tooltip-series-group {
    padding: 4px 8px !important;
    margin: 0 !important;
    min-height: 0 !important;
    line-height: 1.1 !important;
    align-items: center !important;
    gap: 5px !important;
  }

  .kinerja-compact-tooltip .apexcharts-tooltip-marker {
    width: 8px !important;
    height: 8px !important;
    margin-right: 5px !important;
    flex: 0 0 8px !important;
  }

  .kinerja-compact-tooltip .apexcharts-tooltip-text,
  .kinerja-compact-tooltip .apexcharts-tooltip-text-y-label,
  .kinerja-compact-tooltip .apexcharts-tooltip-text-y-value,
  .kinerja-compact-tooltip .apexcharts-tooltip-y-group {
    color: #e2e8f0 !important;
    font-size: 11px !important;
    line-height: 1.1 !important;
    padding-top: 0 !important;
    padding-bottom: 0 !important;
    margin: 0 !important;
  }

  .kinerja-compact-tooltip .apexcharts-tooltip-text-y-value {
    color: #f8fafc !important;
    font-weight: 700 !important;
  }
`}</style>
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <h1 className="text-lg font-extrabold tracking-tight text-slate-50 sm:text-xl">Dashboard Kinerja Layanan Divisi</h1>
          <p className="mt-1 text-[11px] text-slate-400">Monitoring kinerja layanan, produktivitas SDM, dan pencapaian SLA.</p>
        </div>

        <div className="flex w-fit shrink-0 items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/[0.08] px-3 py-1.5 text-[10px] font-semibold text-emerald-300">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          Data Terhubung
        </div>
      </header>
      <section className={`${PANEL_CLASS} relative z-20 p-3`}>
        <div className="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center">
            <div>
              <span className="mb-0.5 block text-[8px] font-extrabold tracking-[1px] text-blue-300">FILTER DATA</span>
              <h2 className="text-xs font-bold leading-tight text-slate-100">Parameter Dashboard</h2>
            </div>
          </div>

          <button
            type="button"
            onClick={resetFilter}
            className="inline-flex h-8 items-center justify-center gap-2 self-start rounded-lg border border-slate-400/20 bg-slate-300/[0.04] px-3 text-[10px] font-semibold text-slate-300 transition hover:border-blue-400/40 hover:bg-blue-400/10 hover:text-blue-200 sm:self-auto"
          >
            <RefreshCw size={12} />
            Reset Filter
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <div className="relative min-w-0">
            <label className={LABEL_CLASS}>Unit</label>
            <SearchableSelect
              value={unit}
              options={unitOptions}
              placeholder="Semua Unit"
              searchPlaceholder="Cari unit..."
              onChange={(value) => {
                setUnit(value);
                setDivisi("");
                setDepartemen("");
                setLayanan("");
              }}
            />
          </div>
          <div className="relative min-w-0">
            <label className={LABEL_CLASS}>Divisi</label>
            <SearchableSelect
              value={divisi}
              options={divisiOptions}
              placeholder="Semua Divisi"
              searchPlaceholder="Cari divisi..."
              onChange={(value) => {
                setDivisi(value);
                setDepartemen("");
                setLayanan("");
              }}
            />
          </div>
          <div className="relative min-w-0">
            <label className={LABEL_CLASS}>Departemen</label>
            <SearchableSelect
              value={departemen}
              options={departemenOptions}
              placeholder="Semua Departemen"
              searchPlaceholder="Cari departemen..."
              onChange={(value) => {
                setDepartemen(value);
                setLayanan("");
              }}
            />
          </div>
          <div className="relative min-w-0">
            <label className={LABEL_CLASS}>Layanan</label>
            <SearchableSelect value={layanan} options={layananOptions} placeholder="Semua Layanan" searchPlaceholder="Cari layanan..." onChange={setLayanan} />
          </div>
          <div className="relative min-w-0">
            <label className={LABEL_CLASS}>Bulan</label>
            <MultiSelect value={bulan} options={MONTHS} placeholder="Semua Bulan" searchPlaceholder="Cari bulan..." onChange={setBulan} />
          </div>
          <div className="relative min-w-0">
            <label className={LABEL_CLASS}>Tahun</label>
            <MultiSelect value={tahun} options={yearOptions} placeholder="Semua Tahun" searchPlaceholder="Cari tahun..." onChange={setTahun} />
          </div>
        </div>

        {(unit || divisi || departemen || layanan || bulan.length > 0 || tahun.length > 0) && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-300/[0.08] pt-2.5">
            <span className="mr-1 text-[10px] text-slate-400">Filter aktif:</span>

            {unit && <span className="rounded-md border border-blue-400/20 bg-blue-400/10 px-2 py-1 text-[9px] text-blue-200">Unit: {unit}</span>}
            {divisi && <span className="rounded-md border border-blue-400/20 bg-blue-400/10 px-2 py-1 text-[9px] text-blue-200">Divisi: {divisi}</span>}
            {departemen && <span className="rounded-md border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 text-[9px] text-cyan-200">Departemen: {departemen}</span>}
            {layanan && <span className="rounded-md border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 text-[9px] text-cyan-200">Layanan: {layanan}</span>}
            {bulan.length > 0 && <span className="rounded-md border border-amber-400/20 bg-amber-400/10 px-2 py-1 text-[9px] text-amber-200">{bulan.length} bulan</span>}
            {tahun.length > 0 && <span className="rounded-md border border-amber-400/20 bg-amber-400/10 px-2 py-1 text-[9px] text-amber-200">Tahun: {tahun.join(", ")}</span>}
          </div>
        )}
      </section>
      {/* KPI */}
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <KpiCard title="JUMLAH TRANSAKSI" value={formatNumber(totalTransaksi)} icon={<Activity size={17} />} theme="blue" />
        <KpiCard title="JUMLAH LAYANAN" value={formatNumber(totalLayanan)} icon={<Layers3 size={17} />} theme="cyan" />
        <KpiCard title="SDM DIPROSES" value={formatNumber(totalSDM)} icon={<Users size={17} />} theme="green" />
        <KpiCard title="TOTAL NOMINAL" value={formatCompactRupiah(totalNominal)} icon={<CircleDollarSign size={17} />} theme="orange" />
      </section>

      {/* Charts */}
      <section className="grid grid-cols-1 items-stretch gap-3 lg:grid-cols-2">
        {chartConfigs.map((chart, index) => {
          const colors = CHART_THEMES[chart.theme];
          const chartId = `kinerja-chart-${index}`;

          const seriesColors = (chart.options.colors as string[] | undefined) ?? [];

          const hiddenSeries = hiddenChartSeries[chartId] ?? [];

          const chartOptions = {
            ...chart.options,
            chart: {
              ...chart.options.chart,
              id: chartId,
            },
            legend: {
              ...chart.options.legend,
              show: false,
            },
          };

          return (
            <div key={chart.title} className={`${PANEL_CLASS} flex h-[350px] min-w-0 flex-col overflow-hidden border-t-2 ${colors.border} ${chart.chartType === "line" ? "lg:col-span-2" : ""}`}>
              <div className="flex min-h-[52px] items-center justify-between gap-3 border-b border-slate-300/[0.08] bg-white/[0.01] px-3">
                <div className="flex min-w-0 items-center gap-2">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${colors.icon}`}>{chart.icon}</div>

                  <div className="min-w-0">
                    <h3 className="text-[11px] font-bold text-slate-100">{chart.title}</h3>
                    <p className="mt-0.5 text-[9px] text-slate-400">{chart.subtitle}</p>
                  </div>
                </div>
              </div>

              <div className="relative min-h-0 flex-1 p-1">
                {monthlyData.length > 0 ? (
                  <>
                    <div className="pointer-events-auto absolute right-3 top-2 z-10 flex max-w-[75%] flex-wrap items-center justify-end gap-x-4 gap-y-2">
                      {chart.series.map((series, seriesIndex) => {
                        const seriesName = String(series.name ?? `Series ${seriesIndex + 1}`);
                        const isHidden = hiddenSeries.includes(seriesName);

                        return (
                          <button
                            key={seriesName}
                            type="button"
                            onClick={() => toggleChartSeries(chartId, seriesName)}
                            aria-pressed={!isHidden}
                            className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-1 py-0.5 text-[10px] font-semibold transition-all duration-200 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-300 ${isHidden ? "opacity-40 line-through" : "opacity-100"}`}
                            style={{ color: "#d3deeb" }}
                          >
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{
                                backgroundColor: seriesColors[seriesIndex] ?? "#b8c6d6",
                              }}
                            />
                            {seriesName}
                          </button>
                        );
                      })}
                    </div>

                    <ResponsiveApexChart options={chartOptions} series={chart.series} type={chart.chartType ?? "bar"} />
                  </>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-[10px] text-slate-500">
                    <Database size={21} className="opacity-50" />
                    {chart.empty}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </section>

      {/* Detail table */}
      <section className={`${PANEL_CLASS} min-w-0 overflow-hidden`}>
        <div className="flex flex-col justify-between gap-2 border-b border-slate-300/[0.08] bg-white/[0.01] p-3 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-400/10 text-blue-300">
                <FileSpreadsheet size={14} />
              </div>
              <h3 className="text-xs font-bold text-slate-100">Detail Kinerja Layanan</h3>
            </div>

            <p className="mt-1.5 text-[9px] text-slate-400">
              Menampilkan {formatNumber(startRow)}–{formatNumber(endRow)} dari {formatNumber(filteredData.length)} data
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[9px] text-slate-400">Total Nominal :</span>
            <strong className="text-[11px] font-bold text-emerald-300">{formatRupiah(totalNominal)}</strong>
          </div>
        </div>

        <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
          <table className="w-full border-collapse text-left text-[10px]">
            <thead>
              <tr className="bg-[#233247] text-[9px] font-bold uppercase tracking-wide text-slate-300">
                {["No.", "Bulan", "Divisi", "Departemen", "Layanan", "Jumlah Transaksi", "SDM Diproses", "SLA Tercapai", "Total Nominal"].map((heading) => (
                  <th key={heading} className="whitespace-nowrap border-b border-r border-slate-300/[0.06] px-3 py-2.5 last:border-r-0">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {paginatedData.length > 0 ? (
                paginatedData.map((item, index) => {
                  const sla = normalizeSLA(item.sla_tercapai);
                  const rowNumber = startIndex + index + 1;

                  const slaClass = sla >= 98 ? "border-emerald-400/15 bg-emerald-400/10 text-emerald-300" : sla >= 90 ? "border-amber-400/15 bg-amber-400/10 text-amber-300" : "border-red-400/15 bg-red-400/10 text-red-300";

                  return (
                    <tr key={`${item.id}-${item.periode_bulan}-${rowNumber}`} className="transition-colors hover:bg-[#26364a]">
                      <td className="whitespace-nowrap border-b border-r border-slate-300/[0.05] px-3 py-2.5 tabular-nums text-slate-500">{rowNumber}.</td>
                      <td className="whitespace-nowrap border-b border-r border-slate-300/[0.05] px-3 py-2.5 text-slate-300">{formatMonth(item.periode_bulan)}</td>
                      <td className="whitespace-nowrap border-b border-r border-slate-300/[0.05] px-3 py-2.5 text-slate-300">{formatDisplayText(item.divisi) || "-"}</td>
                      <td className="whitespace-nowrap border-b border-r border-slate-300/[0.05] px-3 py-2.5 text-slate-300">{formatDisplayText(item.departemen) || "-"}</td>
                      <td className="whitespace-nowrap border-b border-r border-slate-300/[0.05] px-3 py-2.5 text-slate-300">{formatDisplayText(item.layanan) || "-"}</td>
                      <td className="whitespace-nowrap border-b border-r border-slate-300/[0.05] px-3 py-2.5 text-right tabular-nums text-slate-300">{formatNumber(parseNumber(item.jumlah_transaksi))}</td>
                      <td className="whitespace-nowrap border-b border-r border-slate-300/[0.05] px-3 py-2.5 text-right tabular-nums text-slate-300">{formatNumber(parseNumber(item.sdm_diproses))}</td>
                      <td className="border-b border-r border-slate-300/[0.05] px-3 py-2.5">
                        <span className={`inline-flex min-w-[45px] items-center justify-center rounded-md border px-2 py-1 text-[9px] font-bold ${slaClass}`}>{Math.round(sla)}%</span>
                      </td>
                      <td className="whitespace-nowrap border-b border-slate-300/[0.05] px-3 py-2.5 text-right font-semibold tabular-nums text-emerald-300">{formatRupiah(parseNumber(item.total_thp))}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-xs text-slate-500">
                    Tidak ada data yang sesuai dengan filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredData.length > 0 && (
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-500/15 px-[18px] py-3">
            <span className="text-[10px] text-slate-400">
              Halaman <span className="font-semibold text-slate-200">{currentPage}</span> dari <span className="font-semibold text-slate-200">{totalPages}</span>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                className="inline-flex h-7 items-center gap-1 rounded-lg border border-slate-400/15 bg-slate-300/[0.03] px-2.5 text-[9px] font-semibold text-slate-300 transition hover:border-blue-400/30 hover:bg-blue-400/10 hover:text-blue-200 disabled:cursor-not-allowed disabled:opacity-35"
              >
                <ChevronLeft size={12} />
                Sebelumnya
              </button>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                className="inline-flex h-7 items-center gap-1 rounded-lg border border-blue-400/25 bg-gradient-to-r from-blue-500/15 to-indigo-500/15 px-2.5 text-[9px] font-semibold text-blue-200 transition hover:border-blue-400/45 hover:from-blue-500/25 hover:to-indigo-500/25 disabled:cursor-not-allowed disabled:opacity-35"
              >
                Berikutnya
                <ChevronRight size={12} />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default KinerjaLayananDivisi;
