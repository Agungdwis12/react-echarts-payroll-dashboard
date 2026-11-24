import React, { useCallback, useEffect, useMemo, useState } from "react";
import ReactApexChart from "react-apexcharts";
import { Activity, BarChart3, Check, ChevronLeft, ChevronRight, FileSpreadsheet, PieChart, RefreshCw, TrendingUp, X, Building2, XCircle } from "lucide-react";
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

const formatMonth = (value: string): string => {
  const date = parseDate(value);
  if (!date) return value;

  return date.toLocaleDateString("id-ID", {
    month: "short",
    year: "numeric",
  });
};

const normalizeText = (value: string | null | undefined): string => (value ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("id-ID");

const formatDisplayText = (value: string | null | undefined): string => {
  const text = (value ?? "").trim().replace(/\s+/g, " ");

  if (!text) return "";

  const titleCase = text.toLocaleLowerCase("id-ID").replace(/(^|[\s/-])([\p{L}\p{N}])/gu, (_, separator, character) => separator + character.toLocaleUpperCase("id-ID"));

  // Pertahankan penulisan singkatan yang umum digunakan.
  const acronyms: Record<string, string> = {
    bapp: "BAPP",
    sdm: "SDM",
    hr: "HR",
    it: "IT",
    ess: "ESS",
    gpm: "GPM",
  };

  return titleCase.replace(/\b(bapp|sdm|hr|it|ess|gpm)\b/gi, (match) => acronyms[match.toLocaleLowerCase("id-ID")] ?? match);
};

const uniqueSorted = (values: string[]) => {
  const uniqueMap = new Map<string, string>();

  values.forEach((value) => {
    if (!value?.trim()) return;

    const normalized = normalizeText(value);

    if (!uniqueMap.has(normalized)) {
      uniqueMap.set(normalized, formatDisplayText(value));
    }
  });

  return [...uniqueMap.values()].sort((a, b) => a.localeCompare(b, "id-ID"));
};

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
   RESPONSIVE APEXCHART
========================================================= */

interface ResponsiveApexChartProps {
  option: Record<string, any>;
  className?: string;
}

const ResponsiveApexChart: React.FC<ResponsiveApexChartProps> = ({ option, className = "h-full w-full" }) => {
  const chartType = option.chart?.type ?? "bar";

  return (
    <div className={className}>
      <ReactApexChart options={option} series={option.series ?? []} type={chartType} height="100%" width="100%" />
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

  /* FETCH DATA: initial load + refresh every 30 seconds */
  useEffect(() => {
    let mounted = true;
    let isFetching = false;

    const loadData = async (showLoading = false) => {
      if (isFetching) return;
      isFetching = true;

      try {
        if (showLoading && mounted) setLoading(true);
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
        isFetching = false;
        if (mounted && showLoading) setLoading(false);
      }
    };

    void loadData(true);

    const intervalId = window.setInterval(() => {
      void loadData(false);
    }, 30_000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadData(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
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

  const matchesUnit = useCallback((unit: string) => !selectedUnit || normalizeText(unit) === normalizeText(selectedUnit), [selectedUnit]);

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

  const nominalStatusChartData = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

    type MonthlyStatusTotal = {
      done: number;
      onProcess: number;
      noProcess: number;
    };

    const totalsByYearMonth = new Map<string, MonthlyStatusTotal>();
    filteredMonthlyRows.forEach((row) => {
      const date = parseDate(row.periode_bulan);
      if (!date) return;

      const year = String(date.getFullYear());
      const month = date.getMonth();
      const key = `${year}-${String(month + 1).padStart(2, "0")}`;

      const current = totalsByYearMonth.get(key) ?? {
        done: 0,
        onProcess: 0,
        noProcess: 0,
      };

      const nominal = parseNumber(row.nominal);

      if (isDone(row.status_bapp)) {
        current.done += nominal;
      } else if (isOnProcess(row.status_bapp)) {
        current.onProcess += nominal;
      } else if (isNoProcess(row.status_bapp)) {
        current.noProcess += nominal;
      }

      totalsByYearMonth.set(key, current);
    });

    const isYearComparison = selectedYears.length > 1;

    // Saat lebih dari satu tahun dipilih, sumbu X menjadi Jan–Des.
    // Setiap tahun memiliki satu grup bar sendiri; status tetap ditumpuk
    // di dalam grup tahun tersebut agar perbandingan per bulan terlihat jelas.
    if (isYearComparison) {
      const years = [...selectedYears].sort((a, b) => Number(a) - Number(b));
      const selectedMonthIndexes =
        selectedMonths.length > 0
          ? monthOptions.map((month, index) => (selectedMonths.some((selected) => selected.toLocaleLowerCase("id-ID") === month.toLocaleLowerCase("id-ID")) ? index : -1)).filter((index) => index >= 0)
          : monthNames.map((_, index) => index);

      const categories = selectedMonthIndexes.map((index) => monthNames[index]);

      // Warna status dibuat konsisten untuk semua tahun agar perbandingan mudah dibaca.
      const statusColors = ["#238b57", "#d89420", "#d94b59"];

      const series = years.flatMap((year) => {
        const statusSeries = [
          { key: "done" as const, label: "Done" },
          { key: "onProcess" as const, label: "On Proses" },
          { key: "noProcess" as const, label: "No Proses" },
        ];

        return statusSeries.map((status) => ({
          name: `${year} · ${status.label}`,
          group: year,
          data: selectedMonthIndexes.map((monthIndex) => {
            const key = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
            return totalsByYearMonth.get(key)?.[status.key] ?? 0;
          }),
        }));
      });

      const hasData = years.some((year) =>
        selectedMonthIndexes.some((monthIndex) => {
          const key = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
          const value = totalsByYearMonth.get(key);
          return Boolean(value && (value.done || value.onProcess || value.noProcess));
        }),
      );

      return {
        categories,
        series,
        colors: years.flatMap(() => statusColors),
        hasData,
        isYearComparison: true,
      };
    }

    const sortedEntries = Array.from(totalsByYearMonth.entries())
      .map(([key, value]) => {
        const [year, month] = key.split("-");
        const monthIndex = Number(month) - 1;
        return {
          key,
          year,
          monthIndex,
          sort: Number(year) * 100 + Number(month),
          value,
        };
      })
      .sort((a, b) => a.sort - b.sort);

    const isPeriodFiltered = selectedMonths.length > 0 || selectedYears.length > 0;
    const visibleEntries = isPeriodFiltered ? sortedEntries : sortedEntries.slice(-8);

    const categories = visibleEntries.map((item) => (selectedYears.length === 1 ? monthNames[item.monthIndex] : `${monthNames[item.monthIndex]} '${item.year.slice(-2)}`));

    return {
      categories,
      series: [
        { name: "Done", data: visibleEntries.map((item) => item.value.done) },
        { name: "On Proses", data: visibleEntries.map((item) => item.value.onProcess) },
        { name: "No Proses", data: visibleEntries.map((item) => item.value.noProcess) },
      ],
      colors: ["#38b978", "#efa938", "#e85b67"],
      hasData: visibleEntries.length > 0,
      isYearComparison: false,
    };
  }, [filteredMonthlyRows, selectedMonths, selectedYears]);

  const nominalStatusChartOption = useMemo(
    () => ({
      chart: {
        type: "bar",
        stacked: true,
        stackType: "normal",
        toolbar: { show: false },
        background: "transparent",
        fontFamily: "inherit",
        foreColor: "#aebed0",
        animations: {
          enabled: true,
          easing: "easeinout",
          speed: 650,
        },
      },
      colors: nominalStatusChartData.colors,
      plotOptions: {
        bar: {
          horizontal: false,
          // Perlebar bar agar tidak tampak seperti lidi, tetap sisakan jarak
          // antar kelompok tahun dalam satu bulan.
          columnWidth: nominalStatusChartData.isYearComparison ? "68%" : "42%",
          borderRadius: 5,
          borderRadiusApplication: "end",
          borderRadiusWhenStacked: "last",
        },
      },
      dataLabels: { enabled: false },
      // Garis tepi tipis memberi pemisah visual antarbar yang warnanya sama.
      stroke: {
        show: nominalStatusChartData.isYearComparison,
        width: nominalStatusChartData.isYearComparison ? 1.2 : 0,
        colors: nominalStatusChartData.isYearComparison ? nominalStatusChartData.series.map((_, index) => (Math.floor(index / 3) % 2 === 0 ? "#172638" : "#31445b")) : ["transparent"],
      },
      grid: {
        borderColor: "rgba(126, 150, 178, 0.12)",
        strokeDashArray: 4,
        padding: { left: 8, right: 8, top: 0, bottom: 0 },
      },
      xaxis: {
        categories: nominalStatusChartData.categories,
        axisBorder: { show: true, color: "rgba(148, 163, 184, 0.25)" },
        axisTicks: { show: false },
        labels: {
          rotate: 0,
          rotateAlways: false,
          trim: false,
          hideOverlappingLabels: false,
          style: { colors: "#aebed0", fontSize: "9px" },
        },
      },
      yaxis: {
        labels: {
          style: { colors: "#9aacc0", fontSize: "9px" },
          formatter: (value: number) => {
            if (value >= 1_000_000_000_000) return `${(value / 1_000_000_000_000).toFixed(1)} T`;
            if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} M`;
            if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)} jt`;
            return formatNumber(value);
          },
        },
      },
      legend: {
        // Saat membandingkan tahun, legend enam series diganti legend status
        // tunggal di luar chart agar tidak tampil dobel per tahun.
        show: !nominalStatusChartData.isYearComparison,
        position: "top",
        horizontalAlign: "right",
        fontSize: "9px",
        labels: { colors: "#aebed0" },
        markers: { width: 8, height: 8, radius: 12, offsetX: -2 },
        itemMargin: { horizontal: 8, vertical: 2 },
        onItemClick: { toggleDataSeries: true },
        onItemHover: { highlightDataSeries: true },
      },
      tooltip: {
        theme: "dark",
        shared: true,
        intersect: false,
        ...(nominalStatusChartData.isYearComparison
          ? {
              // Tooltip ringkas: judul hanya nama bulan, lalu nominal per status
              // untuk masing-masing tahun. Tidak menampilkan total/jumlah.
              custom: ({ series, dataPointIndex, w }: any) => {
                const yearGroups: Array<{ year: string; values: number[] }> = [];
                for (let index = 0; index < w.globals.seriesNames.length; index += 3) {
                  const firstName = String(w.globals.seriesNames[index] ?? "");
                  const year = firstName.split("·")[0].trim();
                  const values = [0, 1, 2].map((offset) => Number(series[index + offset]?.[dataPointIndex] ?? 0));
                  yearGroups.push({ year, values });
                }

                const statusLabels = ["Done", "On Proses", "No Proses"];
                const statusColors = ["#238b57", "#d89420", "#d94b59"];
                const month = String(w.globals.labels[dataPointIndex] ?? "");

                const yearCards = yearGroups
                  .map(({ year, values }) => {
                    const rows = values
                      .map(
                        (_, index) => `
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:9px;padding:5px 0;border-top:1px solid rgba(148,163,184,.10)">
                      <span style="display:flex;align-items:center;gap:7px;color:#cbd5e1;font-size:10px">
                        <span style="width:7px;height:7px;flex:0 0 7px;border-radius:50%;background:${statusColors[index]};display:inline-block"></span>
                        ${statusLabels[index]}
                      </span>
                      <strong style="color:#e8eef6;font-size:10px;white-space:nowrap">${formatCompactRupiah(values[index])}</strong>
                    </div>
                  `,
                      )
                      .join("");

                    return `
                    <section style="min-width:0;flex:1;background:rgba(15,25,40,.52);border:1px solid rgba(148,163,184,.14);border-radius:8px;padding:7px 8px">
                      <strong style="display:block;color:#f1f5f9;font-size:11px;margin-bottom:5px">${year}</strong>
                      ${rows}
                    </section>
                  `;
                  })
                  .join("");

                return `
                  <div style="width:264px;max-width:calc(100vw - 28px);padding:8px 9px;background:#101b2a;border:0;border-radius:8px;box-shadow:none">
                    <div style="font-size:11px;font-weight:700;color:#f8fafc;margin-bottom:7px">${month}</div>
                    <div style="display:flex;gap:6px;align-items:stretch">${yearCards}</div>
                  </div>
                `;
              },
            }
          : {
              y: {
                formatter: (value: number) => formatCompactRupiah(Number(value) || 0),
              },
            }),
      },
      fill: { opacity: 1 },
      series: nominalStatusChartData.series,
      responsive: [
        {
          breakpoint: 600,
          options: {
            plotOptions: {
              bar: {
                columnWidth: nominalStatusChartData.isYearComparison ? "66%" : "58%",
              },
            },
            xaxis: {
              labels: {
                rotate: 0,
                style: { fontSize: "8px" },
              },
            },
            legend: {
              fontSize: "8px",
              itemMargin: { horizontal: 5, vertical: 2 },
            },
          },
        },
      ],
    }),
    [nominalStatusChartData],
  );

  /* =========================================================
     CHART 2: JUMLAH BAPP PER UNIT
  ========================================================= */

  const bappByUnit = useMemo(() => {
    const map = new Map<string, { name: string; value: number }>();

    filteredMonthlyRows.forEach((row) => {
      const rawUnit = row.unit || "Tidak diketahui";
      const key = normalizeText(rawUnit);
      const existing = map.get(key);

      if (existing) {
        existing.value += parseNumber(row.jumlah_bapp);
      } else {
        map.set(key, {
          name: formatDisplayText(rawUnit),
          value: parseNumber(row.jumlah_bapp),
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }, [filteredMonthlyRows]);

  const bappUnitChartOption = useMemo(
    () => ({
      chart: {
        type: "donut",
        background: "transparent",
        fontFamily: "inherit",
        foreColor: "#aebed0",
        toolbar: { show: false },
        animations: { enabled: true, speed: 650 },
      },
      colors: ["#4e86dc", "#e85b67", "#31b99b", "#8b69dd", "#efa938", "#299bd0", "#a3a3a3"],
      labels: bappByUnit.map((item) => item.name),
      stroke: {
        show: true,
        colors: ["#1a293b"],
        width: 3,
      },
      dataLabels: {
        enabled: true,
        formatter: (value: number) => `${value.toFixed(1)}%`,
        style: {
          fontSize: "9px",
          fontWeight: 600,
          colors: ["#f2f6fb"],
        },
        dropShadow: { enabled: false },
      },
      plotOptions: {
        pie: {
          expandOnClick: true,
          donut: {
            size: "62%",
            background: "transparent",
            labels: {
              show: true,
              name: {
                show: true,
                color: "#9fb0c3",
                fontSize: "10px",
                offsetY: -4,
              },
              value: {
                show: true,
                color: "#f2f6fb",
                fontSize: "17px",
                fontWeight: 700,
                offsetY: 4,
                formatter: (value: string) => formatNumber(Number(value) || 0),
              },
              total: {
                show: true,
                showAlways: true,
                label: "Total BAPP",
                color: "#9fb0c3",
                fontSize: "9px",
                formatter: (w: any) => formatNumber(w.globals.seriesTotals.reduce((sum: number, value: number) => sum + value, 0)),
              },
            },
          },
        },
      },
      legend: {
        show: true,
        position: "bottom",
        horizontalAlign: "center",
        fontSize: "9px",
        labels: { colors: "#aebed0" },
        markers: { width: 8, height: 8, radius: 12, offsetX: -2 },
        itemMargin: { horizontal: 8, vertical: 3 },
        onItemClick: { toggleDataSeries: true },
        onItemHover: { highlightDataSeries: true },
      },
      tooltip: {
        theme: "dark",
        y: {
          formatter: (value: number) => formatNumber(Number(value) || 0),
          title: { formatter: (seriesName: string) => `${seriesName}:` },
        },
      },
      fill: { opacity: 1 },
      series: bappByUnit.map((item) => item.value),
      responsive: [
        {
          breakpoint: 600,
          options: {
            legend: {
              fontSize: "8px",
              itemMargin: { horizontal: 5, vertical: 2 },
            },
            plotOptions: { pie: { donut: { size: "58%" } } },
          },
        },
      ],
    }),
    [bappByUnit],
  );

  /* =========================================================
     CHART 3: REVENUE PER LAYANAN
  ========================================================= */

  const revenueByLayanan = useMemo(() => {
    const map = new Map<string, { name: string; value: number }>();

    filteredDetailRows.forEach((row) => {
      const rawLayanan = row.layanan || "Tidak diketahui";
      const key = normalizeText(rawLayanan);
      const existing = map.get(key);

      if (existing) {
        existing.value += parseNumber(row.revenue);
      } else {
        map.set(key, {
          name: formatDisplayText(rawLayanan),
          value: parseNumber(row.revenue),
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }, [filteredDetailRows]);

  const revenueChartOption = useMemo(
    () => ({
      chart: {
        type: "bar",
        background: "transparent",
        toolbar: { show: false },
        fontFamily: "inherit",
        foreColor: "#aebed0",
        animations: { enabled: true, easing: "easeinout", speed: 650 },
      },
      colors: ["#22b8cf"],
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: "48%",
          borderRadius: 6,
          borderRadiusApplication: "end",
        },
      },
      dataLabels: { enabled: false },
      stroke: { show: false, width: 0 },
      grid: {
        borderColor: "rgba(126, 150, 178, 0.12)",
        strokeDashArray: 4,
        padding: { left: 8, right: 8, top: 0, bottom: 0 },
      },
      xaxis: {
        categories: revenueByLayanan.map((item) => item.name),
        axisBorder: { show: true, color: "rgba(148, 163, 184, 0.18)" },
        axisTicks: { show: false },
        labels: {
          rotate: -30,
          rotateAlways: false,
          trim: false,
          style: { colors: "#9eafc2", fontSize: "9px" },
        },
      },
      yaxis: {
        labels: {
          style: { colors: "#9aacc0", fontSize: "9px" },
          formatter: (value: number) => {
            if (value >= 1_000_000_000_000) return `${(value / 1_000_000_000_000).toFixed(1)} T`;
            if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} M`;
            if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)} jt`;
            return formatNumber(value);
          },
        },
      },
      legend: { show: false },
      tooltip: {
        theme: "dark",
        y: {
          formatter: (value: number) => formatRupiah(Number(value) || 0),
          title: { formatter: () => "Revenue:" },
        },
      },
      fill: { opacity: 1 },
      series: [{ name: "Revenue", data: revenueByLayanan.map((item) => item.value) }],
      responsive: [
        {
          breakpoint: 600,
          options: {
            plotOptions: { bar: { columnWidth: "62%" } },
            xaxis: {
              labels: {
                rotate: -45,
                style: { fontSize: "8px" },
              },
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
      <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-3 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-500/20 border-t-blue-400" />

        <div>
          <p className="text-sm font-semibold text-slate-200">Memuat Dashboard BAPP</p>
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

          <h2 className="text-base font-bold text-slate-100">Dashboard BAPP Gagal Dimuat</h2>

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
          <div className="flex items-center">
            <div>
              <span className="mb-0.5 block text-[8px] font-extrabold tracking-[1px] text-blue-300">FILTER DATA</span>
              <h2 className="text-xs font-bold leading-tight text-slate-100">Parameter Dashboard</h2>
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

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
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
              className={`relative flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-slate-300/[0.12] border-t-2 ${item.theme.border} bg-gradient-to-br from-[#1d2a3b] via-[#1b2839] to-[#192638] p-2 shadow-[0_6px_16px_rgba(0,0,0,0.12)]`}
            >
              {/* Decorative glow */}
              <div className={`pointer-events-none absolute -right-3 -top-3 h-12 w-12 rounded-full blur-xl ${item.theme.glow}`} />

              {/* Card header */}
              <div className="relative flex items-center justify-between gap-1.5">
                <span className="min-w-0 truncate text-[9px] font-bold tracking-wide text-slate-400">{item.title}</span>

                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${item.theme.icon}`}>
                  <Icon size={12} />
                </span>
              </div>

              {/* Main value */}
              <div className="relative mt-1.5 min-w-0">
                <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0">
                  <strong className="break-words text-lg font-extrabold leading-none tracking-tight text-white">{item.value}</strong>

                  {typeof item.percentage === "number" && (
                    <span className={`text-[9px] font-semibold leading-none ${item.title === "BAPP DONE" ? "text-emerald-300" : item.title === "BAPP ON PROSES" ? "text-amber-300" : "text-rose-300"}`}>{item.percentage.toFixed(2)}%</span>
                  )}
                </div>

                <p className="mt-1 text-[10px] font-medium leading-tight text-slate-400">{item.detail}</p>
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
            subtitle: nominalStatusChartData.isYearComparison
              ? "Perbandingan nominal setiap bulan antar tahun yang dipilih"
              : hasFilter
                ? "Akumulasi nominal BAPP berdasarkan status pada periode yang dipilih"
                : "Akumulasi nominal BAPP berdasarkan status dalam 8 bulan terbaru",
            icon: <BarChart3 size={15} />,
            theme: "green",
            option: nominalStatusChartOption,
            empty: "Tidak ada data BAPP untuk filter yang dipilih.",
            hasData: nominalStatusChartData.hasData,
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

            {chart.id === "nominal-status" && nominalStatusChartData.isYearComparison && (
              <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 px-3 pt-2">
                {[
                  { label: "Done", color: "#238b57" },
                  { label: "On Proses", color: "#d89420" },
                  { label: "No Proses", color: "#d94b59" },
                ].map((item) => (
                  <span key={item.label} className="inline-flex items-center gap-1.5 text-[10px] text-slate-300">
                    <span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: item.color }} />
                    {item.label}
                  </span>
                ))}
              </div>
            )}
            <div className={`${chart.layout === "full" ? "h-[300px] p-[7px_10px_0] max-[768px]:h-[280px]" : "h-[285px] p-[5px_8px_5px] max-[768px]:h-[265px]"}`}>
              {chart.hasData ? <ResponsiveApexChart option={chart.option} /> : <div className="flex h-full w-full items-center justify-center px-3 text-center text-[11px] text-slate-500">{chart.empty}</div>}
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

                    <td className="whitespace-nowrap border-b border-r border-slate-300/[0.05] px-3 py-2.5 text-slate-300">{formatDisplayText(row.divisi) || "-"}</td>

                    <td className="whitespace-nowrap border-b border-r border-slate-300/[0.05] px-3 py-2.5 text-slate-300">{formatDisplayText(row.departemen) || "-"}</td>

                    <td className="whitespace-nowrap border-b border-r border-slate-300/[0.05] px-3 py-2.5 text-slate-300">{formatDisplayText(row.unit) || "-"}</td>

                    <td className="whitespace-nowrap border-b border-r border-slate-300/[0.05] px-3 py-2.5 text-slate-300">{formatDisplayText(row.layanan) || "-"}</td>

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
                        {formatDisplayText(row.status) || "-"}
                      </span>
                    </td>

                    <td title={row.keterangan || "-"} className="max-w-[230px] truncate border-b border-r border-slate-300/[0.05] px-3 py-2.5 text-slate-300">
                      {row.keterangan || "-"}
                    </td>

                    <td
                      className={`whitespace-nowrap border-b border-slate-300/[0.05] px-3 py-2.5 text-right font-semibold tabular-nums ${
                        isNoProcess(row.status) ? "text-rose-300" : isOnProcess(row.status) ? "text-amber-300" : isDone(row.status) ? "text-emerald-300" : "text-slate-300"
                      }`}
                    >
                      {formatRupiah(parseNumber(row.revenue))}
                    </td>
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
