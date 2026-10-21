import React, { useEffect, useMemo,useRef, useState } from "react";
import ReactECharts from "echarts-for-react";
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
  option: Record<string, unknown>;
  empty: string;
}


interface ResponsiveEChartProps {
  option: Record<string, unknown>;
}

const ResponsiveEChart: React.FC<ResponsiveEChartProps> = ({ option }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(0);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;

      if (width !== undefined) {
        setChartWidth(width);
      }
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const responsiveOption = useMemo(() => {
    const xAxis = option.xAxis as
      | {
          data?: unknown[];
          axisLabel?: Record<string, unknown>;
        }
      | undefined;

    const labelCount = Array.isArray(xAxis?.data) ? xAxis.data.length : 0;

    const spacePerLabel = labelCount > 0 ? chartWidth / labelCount : chartWidth;

    const rotate = chartWidth === 0 || spacePerLabel < 58 ? 30 : 0;

    return {
      ...option,
      grid: {
        ...(option.grid as Record<string, unknown>),
        bottom: rotate > 0 ? 48 : 28,
      },
      xAxis: {
        ...xAxis,
        axisLabel: {
          ...xAxis?.axisLabel,
          interval: 0,
          rotate,
          hideOverlap: true,
          margin: 10,
        },
      },
    };
  }, [option, chartWidth]);

  return (
    <div ref={containerRef} className="h-full w-full min-w-0">
      <ReactECharts option={responsiveOption} style={{ width: "100%", height: "100%" }} notMerge lazyUpdate opts={{ renderer: "canvas" }} />
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

const uniqueSorted = (values: Array<string | null | undefined>): string[] => [...new Set(values.filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b, "id"));

const gradient = (start: string, middle: string, end: string) => ({
  type: "linear",
  x: 0,
  y: 0,
  x2: 0,
  y2: 1,
  colorStops: [
    { offset: 0, color: start },
    { offset: 0.48, color: middle },
    { offset: 1, color: end },
  ],
});

const TOOLTIP_STYLE = {
  backgroundColor: "#202f42",
  borderColor: "rgba(255,255,255,0.12)",
  borderWidth: 1,
  padding: [8, 10],
  textStyle: {
    color: "#eef4fa",
    fontSize: 10,
  },
  extraCssText: "box-shadow: 0 12px 30px rgba(0,0,0,.35); border-radius: 10px;",
};

const CHART_AXIS_LABEL = {
  color: "#b8c6d6",
  fontSize: 9,
  fontWeight: 500,
};

const CHART_GRID = {
  left: 48,
  right: 12,
  top: 18,
  bottom: 48,
  containLabel: true,
};

const chartBase = (monthlyData: MonthlyPoint[]) => ({
  animation: true,
  animationDuration: 750,
  animationEasing: "cubicOut" as const,
  grid: CHART_GRID,
  tooltip: {
    ...TOOLTIP_STYLE,
    trigger: "axis",
    axisPointer: { type: "shadow" },
  },
  xAxis: {
    type: "category",
    data: monthlyData.map((item) => item.label),
    axisTick: { show: false },
    axisLine: {
      lineStyle: { color: "rgba(255,255,255,0.16)" },
    },
    axisLabel: {
      ...CHART_AXIS_LABEL,
      interval: 0,
      rotate: 35,
      margin: 10,
    },
    splitLine: { show: false },
  },
  yAxis: {
    type: "value",
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: {
      ...CHART_AXIS_LABEL,
      formatter: (value: number) => {
        const absValue = Math.abs(value);

        if (absValue >= 1_000_000_000_000) {
          return `${(value / 1_000_000_000_000).toLocaleString("id-ID", {
            maximumFractionDigits: 1,
          })} triliun`;
        }

        if (absValue >= 1_000_000_000) {
          return `${(value / 1_000_000_000).toLocaleString("id-ID", {
            maximumFractionDigits: 1,
          })} miliar`;
        }

        if (absValue >= 1_000_000) {
          return `${(value / 1_000_000).toLocaleString("id-ID", {
            maximumFractionDigits: 1,
          })} juta`;
        }

        if (absValue >= 1_000) {
          return `${(value / 1_000).toLocaleString("id-ID", {
            maximumFractionDigits: 1,
          })} Ribu`;
        }

        return value.toLocaleString("id-ID");
      },
    },
    splitLine: {
      lineStyle: {
        color: "rgba(255,255,255,0.075)",
        width: 1,
      },
    },
  },
});

const createBarChart = (monthlyData: MonthlyPoint[], name: string, values: number[], colors: [string, string, string], formatter?: (value: number) => string) => {
  const base = chartBase(monthlyData);

  return {
    ...base,
    tooltip: {
      ...base.tooltip,
      valueFormatter: (value: number) => (formatter ? formatter(Number(value)) : formatNumber(Number(value))),
    },
    series: [
      {
        name,
        type: "bar",
        data: values,
        barMaxWidth: 26,
        barMinHeight: 3,
        itemStyle: {
          borderRadius: [5, 5, 1, 1],
          color: gradient(colors[0], colors[1], colors[2]),
          shadowBlur: 6,
          shadowColor: `${colors[1]}30`,
        },
        emphasis: {
          focus: "series",
          itemStyle: {
            shadowBlur: 12,
            shadowColor: `${colors[0]}55`,
          },
        },
      },
    ],
  };
};

const createComparisonBarChart = (
  labels: string[],
  years: string[],
  comparisonData: ComparisonMonthlyPoint[],
  metric: "transaksi" | "sdm" | "nominal",
  name: string,
  colors: Array<[string, string, string]>,
  formatter?: (value: number) => string,
) => {
  const axisData: MonthlyPoint[] = labels.map((label, index) => ({
    month: String(index + 1),
    label,
    transaksi: 0,
    sdm: 0,
    nominal: 0,
    sla: 0,
  }));
  const base = chartBase(axisData);

  return {
    ...base,
    legend: {
      show: true,
      top: 0,
      right: 4,
      textStyle: { color: "#b8c6d6", fontSize: 9 },
      itemWidth: 10,
      itemHeight: 7,
    },
    grid: { ...CHART_GRID, top: 30, bottom: 38 },
    tooltip: {
      ...base.tooltip,
      valueFormatter: (value: number) => (value == null ? "Tidak ada data" : formatter ? formatter(Number(value)) : formatNumber(Number(value))),
    },
    series: years.map((year, index) => ({
      name: `${name} ${year}`,
      type: "bar",
      data: comparisonData.map((item) => item.values[year]?.[metric] ?? null),
      barMaxWidth: 18,
      barGap: "0%",
      barCategoryGap: "35%",
      itemStyle: {
        borderRadius: [4, 4, 0, 0],
        color: gradient(colors[index % colors.length][0], colors[index % colors.length][1], colors[index % colors.length][2]),
      },
      emphasis: { focus: "series" },
      connectNulls: false,
    })),
  };
};

const createComparisonSlaChart = (labels: string[], years: string[], comparisonData: ComparisonMonthlyPoint[]) => {
  const axisData: MonthlyPoint[] = labels.map((label, index) => ({
    month: String(index + 1),
    label,
    transaksi: 0,
    sdm: 0,
    nominal: 0,
    sla: 0,
  }));

  const base = chartBase(axisData);
  const barColors = [
    ["#f8d477", "#e8b94f", "#c9952e"],
    ["#ffad70", "#fb923c", "#ea580c"],
  ];

  return {
    ...base,

    legend: {
      show: true,
      top: 0,
      right: 4,
      textStyle: {
        color: "#b8c6d6",
        fontSize: 9,
      },
      itemWidth: 10,
      itemHeight: 7,
    },

    grid: {
      ...CHART_GRID,
      top: 30,
      bottom: 38,
    },

    yAxis: {
      ...base.yAxis,
      min: 0,
      max: 100,
      interval: 20,
      axisLabel: {
        ...CHART_AXIS_LABEL,
        formatter: (value: number) => `${value}%`,
      },
    },

    tooltip: {
      ...base.tooltip,
      trigger: "axis",
      axisPointer: {
        type: "shadow",
      },
      valueFormatter: (value: number | null) => (value == null ? "Tidak ada data" : `${Math.round(Number(value))}%`),
    },

    series: years.map((year, index) => ({
      name: `SLA ${year}`,
      type: "bar",

      data: comparisonData.map((item) => {
        const value = item.values[year]?.sla;

        return value == null ? null : Number(value.toFixed(2));
      }),

      barMaxWidth: 22,
      barGap: "0%",
      barCategoryGap: "35%",

      itemStyle: {
        borderRadius: [4, 4, 0, 0],
        color: gradient(barColors[index % barColors.length][0], barColors[index % barColors.length][1], barColors[index % barColors.length][2]),
      },

      emphasis: {
        focus: "series",
      },

      connectNulls: false,
    })),
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

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        setLoading(true);
        setError("");

        const result = await getMasterDetailDivisi();

        if (active) {
          setData((result || []) as PayrollRow[]);
        }
      } catch (err) {
        console.error("Gagal memuat data kinerja layanan:", err);

        if (active) {
          setError("Gagal mengambil data dashboard.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      active = false;
    };
  }, []);

  const unitOptions = useMemo(() => uniqueSorted(data.map((item) => item.unit)), [data]);

  const unitScopedData = useMemo(() => (unit ? data.filter((item) => item.unit === unit) : data), [data, unit]);

  const divisiOptions = useMemo(() => uniqueSorted(unitScopedData.map((item) => item.divisi)), [unitScopedData]);

  const departemenOptions = useMemo(() => {
    const source = divisi ? unitScopedData.filter((item) => item.divisi === divisi) : unitScopedData;

    return uniqueSorted(source.map((item) => item.departemen));
  }, [unitScopedData, divisi]);

  const layananOptions = useMemo(() => {
    let source = unitScopedData;

    if (divisi) {
      source = source.filter((item) => item.divisi === divisi);
    }

    if (departemen) {
      source = source.filter((item) => item.departemen === departemen);
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

          return (!unit || item.unit === unit) && (!divisi || item.divisi === divisi) && (!departemen || item.departemen === departemen) && (!layanan || item.layanan === layanan) && monthMatch && yearMatch;
        })
        .sort((a, b) => getMonthTimestamp(a.periode_bulan) - getMonthTimestamp(b.periode_bulan)),
    [data, unit, divisi, departemen, layanan, bulan, tahun],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [unit, divisi, departemen, layanan, bulan, tahun]);

  const totalTransaksi = useMemo(() => filteredData.reduce((sum, item) => sum + parseNumber(item.jumlah_transaksi), 0), [filteredData]);

  const totalLayanan = useMemo(() => new Set(filteredData.map((item) => item.layanan).filter(Boolean)).size, [filteredData]);

  const totalSDM = useMemo(() => filteredData.reduce((sum, item) => sum + parseNumber(item.sdm_diproses), 0), [filteredData]);

  const totalNominal = useMemo(() => filteredData.reduce((sum, item) => sum + parseNumber(item.total_thp), 0), [filteredData]);

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
      const key = item.periode_bulan;

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
      .sort(([a], [b]) => getMonthTimestamp(a) - getMonthTimestamp(b))
      .map(([month, value]) => ({
        month,
        label: formatMonth(month),
        transaksi: value.transaksi,
        sdm: value.sdm,
        nominal: value.nominal,
        sla: value.slaCount > 0 ? value.slaTotal / value.slaCount : 0,
      }));
  }, [filteredData]);

  const isYearComparison = tahun.length === 2;
  const comparisonYears = useMemo(() => [...tahun].sort((a, b) => Number(a) - Number(b)), [tahun]);
  const comparisonLabels = MONTHS.map((month) => month.slice(0, 3));

  const comparisonMonthlyData = useMemo<ComparisonMonthlyPoint[]>(() => {
    const result: ComparisonMonthlyPoint[] = MONTHS.map((month) => ({
      label: month.slice(0, 3),
      values: Object.fromEntries(
        comparisonYears.map((year) => [
          year,
          {
            transaksi: null,
            sdm: null,
            nominal: null,
            sla: null,
          },
        ]),
      ) as ComparisonMonthlyPoint["values"],
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
      const yearMap = aggregate.get(year)!;
      if (!yearMap.has(monthIndex)) yearMap.set(monthIndex, { transaksi: 0, sdm: 0, nominal: 0, slaTotal: 0, slaCount: 0 });
      const current = yearMap.get(monthIndex)!;
      current.transaksi += parseNumber(item.jumlah_transaksi);
      current.sdm += parseNumber(item.sdm_diproses);
      current.nominal += parseNumber(item.total_thp);
      current.slaTotal += normalizeSLA(item.sla_tercapai);
      current.slaCount += 1;
    });

    result.forEach((point, monthIndex) => {
      comparisonYears.forEach((year) => {
        const current = aggregate.get(year)?.get(monthIndex);
        if (!current) return;
        point.values[year] = {
          transaksi: current.transaksi,
          sdm: current.sdm,
          nominal: current.nominal,
          sla: current.slaCount ? current.slaTotal / current.slaCount : null,
        };
      });
    });

    return result;
  }, [filteredData, comparisonYears]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedData = filteredData.slice(startIndex, startIndex + PAGE_SIZE);

  const startRow = filteredData.length === 0 ? 0 : startIndex + 1;
  const endRow = Math.min(startIndex + PAGE_SIZE, filteredData.length);
const displayedMonthlyData = useMemo(() => {
  // Jika user memilih tahun tertentu,
  // tampilkan semua bulan yang tersedia untuk tahun tersebut.
  if (tahun.length > 0) {
    return monthlyData;
  }

  // Default dashboard: tampilkan 8 bulan terakhir.
  return monthlyData.slice(-8);
}, [monthlyData, tahun]);
  const transactionChartOption = useMemo(
    () =>
      isYearComparison
        ? createComparisonBarChart(comparisonLabels, comparisonYears, comparisonMonthlyData, "transaksi", "Transaksi", [
            ["#9ac5ff", "#78adf8", "#4f8edc"],
            ["#4f8edc", "#2868bd", "#1d4f91"],
          ])
        : createBarChart(
            displayedMonthlyData,
            "Jumlah Transaksi",
            displayedMonthlyData.map((item) => item.transaksi),
            ["#78adf8", "#4f8edc", "#2868bd"],
          ),
    [isYearComparison, comparisonLabels, comparisonYears, comparisonMonthlyData, displayedMonthlyData],
  );

  const sdmChartOption = useMemo(
    () =>
      isYearComparison
        ? createComparisonBarChart(comparisonLabels, comparisonYears, comparisonMonthlyData, "sdm", "SDM", [
            ["#9be7eb", "#79d8df", "#55b8c4"],
            ["#55b8c4", "#278d99", "#176b75"],
          ])
        : createBarChart(
            displayedMonthlyData,
            "SDM Diproses",
            displayedMonthlyData.map((item) => item.sdm),
            ["#79d8df", "#55b8c4", "#278d99"],
          ),
    [isYearComparison, comparisonLabels, comparisonYears, comparisonMonthlyData, displayedMonthlyData],
  );

  const nominalChartOption = useMemo(
    () =>
      isYearComparison
        ? createComparisonBarChart(
            comparisonLabels,
            comparisonYears,
            comparisonMonthlyData,
            "nominal",
            "Nominal",
            [
              ["#a8e8c5", "#83d6aa", "#55b985"],
              ["#55b985", "#26835c", "#176343"],
            ],
            formatNominalTooltip,
          )
        : createBarChart(
            displayedMonthlyData,
            "Total Nominal",
            displayedMonthlyData.map((item) => item.nominal),
            ["#83d6aa", "#55b985", "#26835c"],
            formatNominalTooltip,
          ),
    [isYearComparison, comparisonLabels, comparisonYears, comparisonMonthlyData, displayedMonthlyData],
  );

  const slaChartOption = useMemo(() => {
    if (isYearComparison) {
      return createComparisonSlaChart(comparisonLabels, comparisonYears, comparisonMonthlyData);
    }

    const base = chartBase(displayedMonthlyData);
    return {
      ...base,
      yAxis: {
        ...base.yAxis,
        min: 0,
        max: 100,
        interval: 20,
        axisLabel: { ...CHART_AXIS_LABEL, formatter: (value: number) => `${value}%` },
      },
      tooltip: {
        ...base.tooltip,
        valueFormatter: (value: number) => `${Math.round(Number(value))}%`,
      },
      series: [
        {
          name: "SLA Tercapai",
          type: "bar",
          data: displayedMonthlyData.map((item) => Math.min(Math.max(Math.round(item.sla), 0), 100)),
          barMaxWidth: 26,
          barMinHeight: 3,
          itemStyle: {
            borderRadius: [5, 5, 1, 1],
            color: gradient("#f1c66d", "#d9a441", "#a87925"),
            shadowBlur: 6,
            shadowColor: "rgba(217,164,65,0.2)",
          },
          emphasis: { focus: "series", itemStyle: { shadowBlur: 12, shadowColor: "rgba(217,164,65,0.35)" } },
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
      option: transactionChartOption,
      empty: "Tidak ada data transaksi",
    },
    {
      title: isYearComparison ? "Perbandingan SDM Diproses" : "Tren SDM Diproses per Bulan",
      subtitle: isYearComparison ? `Jumlah SDM diproses: ${comparisonYears.join(" vs ")}` : "Jumlah SDM yang diproses setiap bulan",
      icon: <Users size={15} />,
      theme: "cyan",
      option: sdmChartOption,
      empty: "Tidak ada data SDM",
    },
    {
      title: isYearComparison ? "Perbandingan Total Nominal" : "Total Nominal per Bulan",
      subtitle: isYearComparison ? `Total nominal bulanan: ${comparisonYears.join(" vs ")}` : "Akumulasi nominal setiap bulan dalam rupiah",
      icon: <CircleDollarSign size={15} />,
      theme: "green",
      option: nominalChartOption,
      empty: "Tidak ada data nominal",
    },
    {
      title: isYearComparison ? "Perbandingan Pencapaian SLA" : "Pencapaian SLA per Bulan",
      subtitle: isYearComparison ? `Persentase SLA bulanan: ${comparisonYears.join(" vs ")}` : "Persentase pencapaian SLA setiap bulan",
      icon: <Activity size={15} />,
      theme: "orange",
      option: slaChartOption,
      empty: "Tidak ada data SLA",
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
    <div className="w-full min-w-0 space-y-3 font-sans text-slate-100">
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

        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,250px),1fr))] gap-2">
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
        {chartConfigs.map((chart) => {
          const colors = CHART_THEMES[chart.theme];

          return (
            <div key={chart.title} className={`${PANEL_CLASS} flex h-[350px] min-w-0 flex-col overflow-hidden border-t-2 ${colors.border}`}>
              <div className="flex min-h-[52px] items-center gap-2 border-b border-slate-300/[0.08] bg-white/[0.01] px-3">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${colors.icon}`}>{chart.icon}</div>

                <div className="min-w-0">
                  <h3 className="text-[11px] font-bold text-slate-100">{chart.title}</h3>
                  <p className="mt-0.5 text-[9px] text-slate-400">{chart.subtitle}</p>
                </div>
              </div>

              <div className="min-h-0 flex-1 p-1.5">
                {monthlyData.length > 0 ? (
                  <ResponsiveEChart option={chart.option} />
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
          {" "}
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
                      <td className="whitespace-nowrap border-b border-r border-slate-300/[0.05] px-3 py-2.5 text-slate-300">{item.divisi || "-"}</td>
                      <td className="whitespace-nowrap border-b border-r border-slate-300/[0.05] px-3 py-2.5 text-slate-300">{item.departemen || "-"}</td>
                      <td className="whitespace-nowrap border-b border-r border-slate-300/[0.05] px-3 py-2.5 text-slate-300">{item.layanan || "-"}</td>{" "}
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
