import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactECharts from "echarts-for-react";
import { Activity, BarChart3, Check, ChevronLeft, ChevronRight, FileSpreadsheet, PieChart, RefreshCw, TrendingUp, X, Building2, Filter } from "lucide-react";
import { getMasterBappBulanan, getMasterDetailBapp } from "../services/dashboardService";
import SearchableSelect from "../components/dashboard/SearchableSelect";
import MultiSelect from "../components/dashboard/MultiSelect";

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

interface ChartMonth {
  sort: number;
  label: string;
  done: number;
  onProcess: number;
  noProcess: number;
}

interface ChartConfig {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  theme: "green" | "blue" | "cyan";
  option: Record<string, any>;
  empty: string;
  hasData: boolean;
  layout: "top" | "full";
  showTotalRevenue?: boolean;
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

const formatRupiah = (value: number) => `Rp ${formatNumber(value)}`;

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

  const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (dateOnlyMatch) {
    return new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]));
  }

  const timestamp = new Date(value);

  if (Number.isNaN(timestamp.getTime())) return null;

  const jakartaDate = new Date(timestamp.getTime() + 7 * 60 * 60 * 1000);

  return new Date(jakartaDate.getUTCFullYear(), jakartaDate.getUTCMonth(), jakartaDate.getUTCDate());
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

const statusKey = (value: string) => value.trim().toLowerCase();

const isDone = (value: string) => statusKey(value) === "done";

const isOnProcess = (value: string) => {
  const status = statusKey(value);

  return status === "on proses" || status === "on process" || status === "on_progress";
};

const isNoProcess = (value: string) => {
  const status = statusKey(value);

  return status === "no proses" || status === "not proses" || status === "not process";
};

const PAGE_SIZE = 10;

const monthOptions = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

/* =========================================================
   RESPONSIVE ECHART
========================================================= */

interface ResponsiveEChartProps {
  option: Record<string, any>;
  className?: string;
}

const ResponsiveEChart: React.FC<ResponsiveEChartProps> = ({ option, className = "h-full w-full" }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(0);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;

      if (typeof width === "number") {
        setChartWidth(width);
      }
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const responsiveOption = useMemo(() => {
    const xAxis = option.xAxis;

    if (!xAxis || Array.isArray(xAxis)) return option;

    const labels: string[] = Array.isArray(xAxis.data) ? xAxis.data.map((value: unknown) => String(value ?? "")) : [];

    const labelCount = labels.length;
    const spacePerLabel = labelCount > 0 ? chartWidth / labelCount : chartWidth;

    const maxLabelLength = labels.reduce((max, label) => Math.max(max, label.length), 0);

    const requiredSpace = Math.max(58, Math.min(118, maxLabelLength * 5.8));

    const rotate = chartWidth > 0 && labelCount > 1 && spacePerLabel < requiredSpace ? (maxLabelLength > 12 ? 40 : 30) : 0;

    const oldAxisLabel = xAxis.axisLabel || {};
    const oldGrid = option.grid || {};

    return {
      ...option,
      grid: {
        ...oldGrid,
        bottom: rotate > 0 ? Math.max(Number(oldGrid.bottom) || 0, maxLabelLength > 12 ? 70 : 58) : 38,
        containLabel: true,
      },
      xAxis: {
        ...xAxis,
        axisLabel: {
          ...oldAxisLabel,
          interval: 0,
          rotate,
          hideOverlap: false,
          width: undefined,
          overflow: "none",
          margin: rotate > 0 ? 10 : 8,
          align: rotate > 0 ? "right" : "center",
        },
      },
    };
  }, [option, chartWidth]);

  return (
    <div ref={containerRef} className={className}>
      <ReactECharts option={responsiveOption} style={{ height: "100%", width: "100%" }} notMerge lazyUpdate opts={{ renderer: "canvas" }} />
    </div>
  );
};

/* =========================================================
   COMPONENT
========================================================= */

const BappDashboard: React.FC = () => {
  const [monthlyRows, setMonthlyRows] = useState<BappMonthlyRow[]>([]);
  const [detailRows, setDetailRows] = useState<BappDetailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedUnit, setSelectedUnit] = useState("");
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  /* FETCH */

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

  /* FILTER OPTIONS */

  const unitOptions = useMemo(() => uniqueSorted([...monthlyRows.map((row) => row.unit), ...detailRows.map((row) => row.unit)]), [monthlyRows, detailRows]);

  const yearOptions = useMemo(() => {
    const years = [...monthlyRows.map((row) => getYear(row.periode_bulan)), ...detailRows.map((row) => getYear(row.periode_bulan))];

    return Array.from(new Set(years.filter(Boolean))).sort((a, b) => Number(a) - Number(b));
  }, [monthlyRows, detailRows]);

  /* FILTER LOGIC */

  const matchesPeriod = useCallback(
    (periode: string) => {
      const date = parseDate(periode);
      if (!date) return false;

      const monthName = date.toLocaleDateString("id-ID", { month: "long" }).toLowerCase();

      const year = String(date.getFullYear());

      const monthMatch = selectedMonths.length === 0 || selectedMonths.some((month) => month.toLowerCase() === monthName);

      const yearMatch = selectedYears.length === 0 || selectedYears.includes(year);

      return monthMatch && yearMatch;
    },
    [selectedMonths, selectedYears],
  );

  const matchesUnit = useCallback((unit: string) => !selectedUnit || unit === selectedUnit, [selectedUnit]);

  const filteredMonthlyRows = useMemo(() => monthlyRows.filter((row) => matchesPeriod(row.periode_bulan) && matchesUnit(row.unit)), [monthlyRows, matchesPeriod, matchesUnit]);

  const filteredDetailRows = useMemo(() => detailRows.filter((row) => matchesPeriod(row.periode_bulan) && matchesUnit(row.unit)), [detailRows, matchesPeriod, matchesUnit]);

  /* KPI */

  const kpis = useMemo(() => {
    const totalBapp = filteredMonthlyRows.reduce((sum, row) => sum + parseNumber(row.jumlah_bapp), 0);

    const totalNominal = filteredMonthlyRows.reduce((sum, row) => sum + parseNumber(row.nominal), 0);

    const doneRows = filteredMonthlyRows.filter((row) => isDone(row.status_bapp));

    const onProcessRows = filteredMonthlyRows.filter((row) => isOnProcess(row.status_bapp));

    const noProcessRows = filteredMonthlyRows.filter((row) => isNoProcess(row.status_bapp));

    const sumCount = (rows: BappMonthlyRow[]) => rows.reduce((sum, row) => sum + parseNumber(row.jumlah_bapp), 0);

    const sumNominal = (rows: BappMonthlyRow[]) => rows.reduce((sum, row) => sum + parseNumber(row.nominal), 0);

    const doneCount = sumCount(doneRows);
    const onProcessCount = sumCount(onProcessRows);
    const noProcessCount = sumCount(noProcessRows);

    const totalRevenue = filteredDetailRows.reduce((sum, row) => sum + parseNumber(row.revenue), 0);

    return {
      totalBapp,
      totalNominal,
      totalRevenue,
      doneCount,
      onProcessCount,
      noProcessCount,
      doneNominal: sumNominal(doneRows),
      onProcessNominal: sumNominal(onProcessRows),
      noProcessNominal: sumNominal(noProcessRows),
      donePercentage: totalBapp > 0 ? (doneCount / totalBapp) * 100 : 0,
      onProcessPercentage: totalBapp > 0 ? (onProcessCount / totalBapp) * 100 : 0,
      noProcessPercentage: totalBapp > 0 ? (noProcessCount / totalBapp) * 100 : 0,
    };
  }, [filteredMonthlyRows, filteredDetailRows]);

  /* =========================================================
     CHART 1: NOMINAL BAPP PER STATUS PER BULAN
     Default: 8 bulan terbaru.
     Filter periode aktif: semua bulan yang sesuai.
  ========================================================= */

  const nominalStatusByMonth = useMemo(() => {
    const map = new Map<string, ChartMonth>();

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

    const sortedMonths = Array.from(map.values()).sort((a, b) => a.sort - b.sort);

    const isPeriodFiltered = selectedMonths.length > 0 || selectedYears.length > 0;

    return isPeriodFiltered ? sortedMonths : sortedMonths.slice(-8);
  }, [filteredMonthlyRows, selectedMonths, selectedYears]);

  const nominalStatusChartOption = useMemo(
    () => ({
      animation: true,
      animationDuration: 700,
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
        extraCssText: "box-shadow:0 10px 25px rgba(0,0,0,.28);border-radius:9px;",
        formatter: (params: any[]) => {
          if (!params?.length) return "";

          let html = `
            <div style="font-weight:700;color:#f2f6fb;margin-bottom:6px">
              ${params[0].axisValue}
            </div>
          `;

          params.forEach((item) => {
            html += `
              <div style="display:flex;justify-content:space-between;gap:16px;margin:4px 0">
                <span style="color:#9fb0c3">${item.marker}${item.seriesName}</span>
                <strong style="color:#f2f6fb">
                  ${formatCompactRupiah(Number(item.value) || 0)}
                </strong>
              </div>
            `;
          });

          return html;
        },
      },
      legend: {
        top: 0,
        left: 2,
        itemWidth: 9,
        itemHeight: 8,
        itemGap: 12,
        textStyle: {
          color: "#aebed0",
          fontSize: 9,
        },
      },
      grid: {
        left: 22,
        right: 10,
        top: 27,
        bottom: 42,
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
        axisTick: { show: false },
        axisLabel: {
          interval: 0,
          fontSize: 9,
          color: "#aebed0",
          margin: 8,
          hideOverlap: false,
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
            if (value >= 1_000_000_000_000) {
              return `${(value / 1_000_000_000_000).toFixed(1)} T`;
            }

            if (value >= 1_000_000_000) {
              return `${(value / 1_000_000_000).toFixed(1)} M`;
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
          barMaxWidth: 30,
          data: nominalStatusByMonth.map((item) => item.done),
          itemStyle: {
            borderRadius: [5, 5, 0, 0],
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
          },
        },
        {
          name: "On Proses",
          type: "bar",
          stack: "total",
          barMaxWidth: 30,
          data: nominalStatusByMonth.map((item) => item.onProcess),
          itemStyle: {
            borderRadius: [4, 4, 0, 0],
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
          barMaxWidth: 30,
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
     CHART 2: JUMLAH BAPP PER UNIT
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
      animationDuration: 700,
      tooltip: {
        trigger: "item",
        backgroundColor: "#172436",
        borderColor: "#344a63",
        borderWidth: 1,
        textStyle: {
          color: "#e8eef6",
          fontSize: 10,
        },
        extraCssText: "border-radius:9px;",
        formatter: (params: any) => `
          <div style="font-weight:700;color:#f2f6fb;margin-bottom:5px">
            ${params.name}
          </div>
          <div style="color:#9fb0c3">
            Jumlah BAPP:
            <strong style="color:#f2f6fb">
              ${formatNumber(Number(params.value) || 0)}
            </strong>
          </div>
          <div style="color:#9fb0c3;margin-top:3px">
            Persentase:
            <strong style="color:#f2f6fb">
              ${Number(params.percent).toFixed(1)}%
            </strong>
          </div>
        `,
      },
      legend: {
        type: "scroll",
        bottom: 0,
        left: "center",
        itemWidth: 9,
        itemHeight: 9,
        itemGap: 12,
        textStyle: {
          color: "#aebed0",
          fontSize: 9,
        },
      },
      series: [
        {
          name: "Jumlah BAPP",
          type: "pie",
          radius: ["43%", "68%"],
          center: ["50%", "46%"],
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
          labelLine: { show: false },
          data: bappByUnit.map((item, index) => {
            const palette = [
              ["#8eb8ff", "#4e86dc", "#285aa7"],
              ["#ff9999", "#e85b67", "#a83243"],
              ["#8ee8cf", "#31b99b", "#167a68"],
              ["#c4a7ff", "#8b69dd", "#5b3b9d"],
              ["#ffd978", "#efa938", "#b86e16"],
              ["#7dd3fc", "#299bd0", "#17618a"],
            ];

            const colors = palette[index % palette.length];

            return {
              ...item,
              itemStyle: {
                borderColor: "#1a293b",
                borderWidth: 3,
                borderRadius: 5,
                color: {
                  type: "linear",
                  x: 0,
                  y: 0,
                  x2: 1,
                  y2: 1,
                  colorStops: [
                    { offset: 0, color: colors[0] },
                    { offset: 0.5, color: colors[1] },
                    { offset: 1, color: colors[2] },
                  ],
                },
              },
            };
          }),
        },
      ],
    }),
    [bappByUnit],
  );

  /* =========================================================
     CHART 3: REVENUE PER LAYANAN
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
      animationDuration: 700,
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
        extraCssText: "border-radius:9px;",
        formatter: (params: any[]) => {
          const item = params?.[0];
          if (!item) return "";

          return `
            <div style="color:#9fb0c3;font-size:10px;margin-bottom:5px">
              ${item.name}
            </div>
            <div style="color:#f2f6fb;font-size:13px;font-weight:700">
              ${formatRupiah(Number(item.value) || 0)}
            </div>
          `;
        },
      },
      grid: {
        left: 18,
        right: 12,
        top: 12,
        bottom: 42,
        containLabel: true,
      },
      xAxis: {
        type: "category",
        boundaryGap: true,
        data: revenueByLayanan.map((item) => item.name),
        axisLine: {
          lineStyle: {
            color: "rgba(148, 163, 184, 0.18)",
          },
        },
        axisTick: { show: false },
        axisLabel: {
          interval: 0,
          fontSize: 9,
          color: "#9eafc2",
          margin: 9,
          align: "center",
          hideOverlap: false,
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
            if (value >= 1_000_000_000_000) {
              return `${(value / 1_000_000_000_000).toFixed(1)} T`;
            }

            if (value >= 1_000_000_000) {
              return `${(value / 1_000_000_000).toFixed(1)} M`;
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
            borderRadius: [6, 6, 1, 1],
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
          },
          emphasis: {
            focus: "series",
            itemStyle: {
              shadowBlur: 12,
              shadowColor: "rgba(80, 155, 255, .3)",
            },
          },
        },
      ],
    }),
    [revenueByLayanan],
  );

  /* =========================================================
     TABLE & PAGINATION
  ========================================================= */

  const getStatusPriority = (status: string | null | undefined): number => {
    const normalizedStatus = status ?? "";

    if (isNoProcess(normalizedStatus)) return 1;
    if (isOnProcess(normalizedStatus)) return 2;
    if (isDone(normalizedStatus)) return 3;

    return 4;
  };

  const sortedTableRows = useMemo(() => [...filteredDetailRows].sort((a, b) => getStatusPriority(a.status) - getStatusPriority(b.status)), [filteredDetailRows]);

  const totalPages = Math.max(1, Math.ceil(sortedTableRows.length / PAGE_SIZE));

  const startIndex = (currentPage - 1) * PAGE_SIZE;

  const tableRows = useMemo(() => sortedTableRows.slice(startIndex, startIndex + PAGE_SIZE), [sortedTableRows, startIndex]);

  const startRow = sortedTableRows.length === 0 ? 0 : startIndex + 1;

  const endRow = Math.min(startIndex + PAGE_SIZE, sortedTableRows.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedUnit, selectedMonths, selectedYears]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  /* RESET FILTER */

  const resetFilters = () => {
    setSelectedUnit("");
    setSelectedMonths([]);
    setSelectedYears([]);
    setCurrentPage(1);
  };

  const hasFilter = Boolean(selectedUnit || selectedMonths.length > 0 || selectedYears.length > 0);

  /* =========================================================
     LOADING & ERROR
  ========================================================= */

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-xs text-slate-300">
        <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-slate-500/20 border-t-blue-400" />
        <span>Memuat data BAPP...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-center text-xs text-slate-300">
        <div className="max-w-lg rounded-xl border border-slate-500/20 bg-slate-800/70 p-5">
          <h2 className="mb-2 text-sm font-bold text-slate-100">Gagal Memuat Dashboard</h2>

          <p className="mb-4 text-[11px] text-slate-400">{error}</p>

          <button type="button" className="rounded-lg border border-blue-400/35 bg-blue-400/10 px-3 py-2 text-[11px] font-semibold text-blue-200 transition hover:bg-blue-400/20" onClick={() => window.location.reload()}>
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
    <div className="min-h-full rounded-2xl bg-[radial-gradient(circle_at_10%_0%,rgba(53,102,173,0.11),transparent_28%),radial-gradient(circle_at_90%_8%,rgba(48,190,132,0.06),transparent_24%),#0f1928] px-0 pb-5 pt-1 text-[#e9f0f7] max-[768px]:rounded-none max-[768px]:pt-0">
      {/* HEADER */}
      <header className="mb-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <h1 className="text-lg font-extrabold tracking-tight text-slate-50 sm:text-xl">Dashboard Detail BAPP</h1>
          <p className="mt-1 text-[11px] text-slate-400">Monitoring BAPP, nominal, status, dan revenue layanan.</p>
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

    <section className="relative z-20 mb-3 rounded-xl border border-slate-400/15 bg-[linear-gradient(145deg,#1b2b40,#172538)] p-3 shadow-[0_8px_20px_rgba(0,0,0,0.12)]">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-blue-400/20 bg-gradient-to-br from-blue-400/15 to-indigo-500/10 text-blue-300">
              <Filter size={15} />
            </div>

            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-blue-300">
                Filter Data
              </p>
              <h2 className="mt-0.5 text-xs font-bold text-slate-100">
                Parameter Dashboard
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={resetFilters}
            className={`inline-flex h-7 shrink-0 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-[9px] font-semibold transition hover:border-blue-400/50 hover:bg-blue-500/10 hover:text-blue-100 ${
              hasFilter ? "border-blue-400/50 bg-blue-500/10 text-blue-100" : "border-slate-500/25 bg-white/[0.035] text-slate-400"
            }`}
          >
            <RefreshCw size={11} />
            Reset
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          <div className="relative min-w-0">
            <label className="mb-1 block text-[10px] font-semibold text-slate-300/80">Unit</label>

            <SearchableSelect value={selectedUnit} options={unitOptions} placeholder="Semua Unit" searchPlaceholder="Cari unit..." onChange={setSelectedUnit} />
          </div>

          <div className="relative min-w-0">
            <label className="mb-1 block text-[10px] font-semibold text-slate-300/80">Bulan</label>

            <MultiSelect value={selectedMonths} options={monthOptions} placeholder="Semua Bulan" searchPlaceholder="Cari bulan..." onChange={setSelectedMonths} />
          </div>

          <div className="relative min-w-0">
            <label className="mb-1 block text-[10px] font-semibold text-slate-300/80">Tahun</label>

            <MultiSelect value={selectedYears} options={yearOptions} placeholder="Semua Tahun" searchPlaceholder="Cari tahun..." onChange={setSelectedYears} />
          </div>
        </div>

        {hasFilter && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-slate-300/[0.08] pt-2">
            <span className="mr-1 text-[9px] text-slate-400">Filter aktif:</span>

            {selectedUnit && <span className="rounded-md border border-blue-400/20 bg-blue-400/10 px-2 py-1 text-[9px] text-blue-200">Unit: {selectedUnit}</span>}

            {selectedMonths.length > 0 && <span className="rounded-md border border-amber-400/20 bg-amber-400/10 px-2 py-1 text-[9px] text-amber-200">{selectedMonths.length} bulan</span>}

            {selectedYears.length > 0 && <span className="rounded-md border border-amber-400/20 bg-amber-400/10 px-2 py-1 text-[9px] text-amber-200">Tahun: {selectedYears.join(", ")}</span>}
          </div>
        )}
      </section>

      {/* KPI CARDS */}
      <section className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          {
            title: "JUMLAH BAPP",
            value: formatNumber(kpis.totalBapp),
            detail: formatCompactRupiah(kpis.totalNominal),
            icon: FileSpreadsheet,
            theme: {
              border: "border-t-blue-400",
              icon: "bg-blue-400/10 text-blue-300",
              value: "text-blue-100",
              glow: "bg-blue-400/[0.06]",
            },
          },
          {
            title: "BAPP DONE",
            value: formatNumber(kpis.doneCount),
            detail: formatCompactRupiah(kpis.doneNominal),
            percentage: kpis.donePercentage,
            icon: Check,
            theme: {
              border: "border-t-emerald-400",
              icon: "bg-emerald-400/10 text-emerald-300",
              value: "text-emerald-100",
              glow: "bg-emerald-400/[0.06]",
            },
          },
          {
            title: "BAPP ON PROSES",
            value: formatNumber(kpis.onProcessCount),
            detail: formatCompactRupiah(kpis.onProcessNominal),
            percentage: kpis.onProcessPercentage,
            icon: Activity,
            theme: {
              border: "border-t-amber-400",
              icon: "bg-amber-400/10 text-amber-300",
              value: "text-amber-100",
              glow: "bg-amber-400/[0.06]",
            },
          },
          {
            title: "BAPP NO PROSES",
            value: formatNumber(kpis.noProcessCount),
            detail: formatCompactRupiah(kpis.noProcessNominal),
            percentage: kpis.noProcessPercentage,
            icon: X,
            theme: {
              border: "border-t-rose-400",
              icon: "bg-rose-400/10 text-rose-300",
              value: "text-rose-100",
              glow: "bg-rose-400/[0.06]",
            },
          },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <article
              key={item.title}
              className={`relative flex min-h-[112px] min-w-0 flex-col justify-between overflow-hidden rounded-xl border border-slate-300/[0.12] border-t-2 ${item.theme.border} bg-gradient-to-br from-[#1d2a3b] via-[#1b2839] to-[#192638] p-3 shadow-[0_6px_20px_rgba(0,0,0,0.14)]`}
            >
              {/* Decorative glow */}
              <div className={`pointer-events-none absolute -right-5 -top-5 h-20 w-20 rounded-full blur-2xl ${item.theme.glow}`} />

              {/* Card header */}
              <div className="relative flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-[9px] font-bold tracking-wide text-slate-400 sm:text-[10px]">{item.title}</span>

                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.theme.icon}`}>
                  <Icon size={16} />
                </span>
              </div>

              {/* Main value */}
              <div className="relative mt-2 min-w-0">
                <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-1">
                  <strong className={`break-words text-lg font-extrabold leading-tight tracking-tight sm:text-xl ${item.theme.value}`}>{item.value}</strong>
                  {typeof item.percentage === "number" && <span className="text-[9px] font-semibold text-slate-400">{item.percentage.toFixed(2)}%</span>}
                </div>

                <p className="mt-1 truncate text-[10px] font-medium text-slate-400">{item.detail}</p>
              </div>
            </article>
          );
        })}
      </section>
      {/* CHART CONFIGS: title, subtitle, icon, theme, option, and empty state are managed centrally */}
      {(() => {
        const chartConfigs: ChartConfig[] = [
          {
            id: "nominal-status",
            title: "Nominal BAPP per Status per Bulan",
            subtitle: hasFilter ? "Akumulasi nominal BAPP berdasarkan status pada periode yang dipilih" : "Akumulasi nominal BAPP berdasarkan status dalam 8 bulan terbaru",
            icon: <BarChart3 size={15} />,
            theme: "green",
            option: nominalStatusChartOption,
            empty: "Tidak ada data BAPP untuk filter yang dipilih.",
            hasData: nominalStatusByMonth.length > 0,
            layout: "top",
          },
          {
            id: "bapp-unit",
            title: "Jumlah BAPP per Unit",
            subtitle: "Distribusi jumlah BAPP dan proporsi setiap unit",
            icon: <PieChart size={15} />,
            theme: "blue",
            option: bappUnitChartOption,
            empty: "Tidak ada data BAPP per unit untuk filter yang dipilih.",
            hasData: bappByUnit.length > 0,
            layout: "top",
          },
          {
            id: "revenue-layanan",
            title: "Revenue BAPP per Layanan",
            subtitle: "Akumulasi revenue berdasarkan layanan",
            icon: <TrendingUp size={15} />,
            theme: "cyan",
            option: revenueChartOption,
            empty: "Tidak ada data revenue untuk filter yang dipilih.",
            hasData: revenueByLayanan.length > 0,
            layout: "full",
            showTotalRevenue: true,
          },
        ];

        const themeClasses = {
          green: {
            icon: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
          },
          blue: {
            icon: "border-blue-400/20 bg-blue-400/10 text-blue-300",
          },
          cyan: {
            icon: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
          },
        };

        const renderChart = (chart: ChartConfig) => (
          <article key={chart.id} className={`min-w-0 overflow-hidden rounded-xl border border-slate-400/15 bg-[linear-gradient(145deg,#1c2d42,#172638)] shadow-[0_8px_20px_rgba(0,0,0,0.12)] ${chart.layout === "full" ? "mb-3" : ""}`}>
            <div className={`flex min-h-[58px] items-center justify-between gap-3 border-b border-slate-500/10 px-3 py-2 ${chart.showTotalRevenue ? "max-[600px]:items-start" : ""}`}>
              <div className="flex min-w-0 items-center gap-2.5">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${themeClasses[chart.theme].icon}`}>{chart.icon}</div>

                <div className="min-w-0">
                  <h3 className="m-0 text-xs font-bold leading-tight text-slate-100">{chart.title}</h3>

                  <p className="mt-1 text-[10px] leading-snug text-slate-400">{chart.subtitle}</p>
                </div>
              </div>

              {chart.showTotalRevenue && (
                <div className="flex shrink-0 flex-wrap items-center gap-2.5">
                  <span className="text-[9px] text-slate-400">Total Revenue:</span>

                  <strong className="text-[11px] font-bold text-cyan-300">{formatRupiah(kpis.totalRevenue)}</strong>
                </div>
              )}
            </div>

            <div className={`${chart.layout === "full" ? "h-[300px] p-[7px_10px_0] max-[768px]:h-[280px]" : "h-[285px] p-[5px_8px_5px] max-[768px]:h-[265px]"}`}>
              {chart.hasData ? <ResponsiveEChart option={chart.option} /> : <div className="flex h-full w-full items-center justify-center px-3 text-center text-[11px] text-slate-500">{chart.empty}</div>}
            </div>
          </article>
        );

        return (
          <>
            <section className="mb-3 grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-3 max-[1100px]:grid-cols-1">{chartConfigs.filter((chart) => chart.layout === "top").map(renderChart)}</section>
            {chartConfigs.filter((chart) => chart.layout === "full").map(renderChart)}
          </>
        );
      })()}

      {/* DETAIL TABLE */}

      <section className="mb-3 min-w-0 overflow-hidden rounded-xl border border-slate-400/15 bg-[linear-gradient(145deg,#1c2d42,#172638)] shadow-[0_8px_20px_rgba(0,0,0,0.12)]">
        <div className="flex min-h-[48px] items-center justify-between gap-3 border-b border-slate-500/10 px-3 py-2 max-[600px]:items-start">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-violet-400/20 bg-violet-400/10 text-violet-300">
              <Building2 size={16} />
            </div>

            <div>
              <span className="mb-0.5 block text-[8px] font-extrabold tracking-[1px] text-slate-500">DETAIL DATA</span>

              <h3 className="m-0 text-xs font-bold leading-tight text-slate-100">Detail BAPP</h3>
            </div>
          </div>

          <span className="text-right text-[9px] text-slate-400">
            {formatNumber(startRow)}–{formatNumber(endRow)} dari {formatNumber(sortedTableRows.length)} data
          </span>
        </div>

        <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
          {" "}
          <table className="w-full min-w-[1000px] border-separate border-spacing-0 text-left text-[10px] text-slate-300">
            <thead>
              <tr className="bg-[#233247] text-[9px] font-bold uppercase tracking-wide text-slate-300">
                {["No.", "Bulan", "Divisi", "Departemen", "Unit", "Layanan", "Status", "Keterangan", "Revenue"].map((heading) => (
                  <th key={heading} className={`sticky top-0 z-10 whitespace-nowrap border-b border-r border-slate-300/[0.06] px-3 py-2.5 last:border-r-0 ${heading === "Revenue" ? "text-right" : "text-left"}`}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {tableRows.length > 0 ? (
                tableRows.map((row, index) => (
                  <tr key={`${row.id}-${index}`} className="transition-colors hover:bg-[#26364a]">
                    <td className="whitespace-nowrap border-b border-r border-slate-300/[0.05] px-3 py-2.5 tabular-nums text-center text-slate-500">{startIndex + index + 1}.</td>

                    <td className="whitespace-nowrap border-b border-r border-slate-300/[0.05] px-3 py-2.5 text-slate-300">{formatMonth(row.periode_bulan)}</td>

                    <td className="whitespace-nowrap border-b border-r border-slate-300/[0.05] px-3 py-2.5 text-slate-300">{row.divisi || "-"}</td>

                    <td className="whitespace-nowrap border-b border-r border-slate-300/[0.05] px-3 py-2.5 text-slate-300">{row.departemen || "-"}</td>

                    <td className="whitespace-nowrap border-b border-r border-slate-300/[0.05] px-3 py-2.5 text-slate-300">{row.unit || "-"}</td>

                    <td className="whitespace-nowrap border-b border-r border-slate-300/[0.05] px-3 py-2.5 text-slate-300">{row.layanan || "-"}</td>

                    <td className="whitespace-nowrap border-b border-r border-slate-300/[0.05] px-3 py-2.5">
                      <span
                        className={`inline-flex min-w-[62px] items-center justify-center rounded-full border px-2 py-1 text-[9px] font-bold ${
                          isDone(row.status)
                            ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                            : isOnProcess(row.status)
                              ? "border-amber-400/20 bg-amber-400/10 text-amber-300"
                              : isNoProcess(row.status)
                                ? "border-rose-400/20 bg-rose-400/10 text-rose-300"
                                : "border-slate-400/20 bg-slate-400/10 text-slate-300"
                        }`}
                      >
                        {row.status || "-"}
                      </span>
                    </td>

                    <td title={row.keterangan || "-"} className="max-w-[230px] truncate border-b border-r border-slate-300/[0.05] px-3 py-2.5 text-slate-300">
                      {row.keterangan || "-"}
                    </td>

                    <td className="whitespace-nowrap border-b border-slate-300/[0.05] px-3 py-2.5 text-right font-semibold tabular-nums text-blue-300">{formatRupiah(parseNumber(row.revenue))}</td>
                  </tr>
                ))
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

        {/* PAGINATION */}

        {sortedTableRows.length > 0 && (
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

export default BappDashboard;
