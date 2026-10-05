import { useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts";
import SearchableSelect from "../components/dashboard/SearchableSelect";

import "./ExecutiveBusinessDashboard.css";

const API_BASE = import.meta.env.VITE_API_URL || "/api";
/* =========================================================
   TYPES
========================================================= */

interface DetailDivisiRow {
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

interface BappBulananRow {
  id: number;
  periode_bulan: string;
  status_bapp: string;
  jumlah_bapp: number | string;
  nominal: number | string;
  unit: string;
  created_at?: string;
}

interface DetailBappRow {
  id: number;
  periode_bulan: string;
  divisi: string;
  departemen: string;
  layanan: string;
  status: string;
  revenue: number | string;
  unit: string;
  keterangan?: string;
  text?: string;
  created_at?: string;
}

interface GpmRow {
  id: number;
  periode_bulan: string;
  revenue_payroll_bapp: number | string;
  cost_payroll: number | string;
}

interface TargetRow {
  id: number;
  periode_bulan: string;
  nominal_target_sustain: number | string;
  nominal_target_scaling: number | string;
  realisasi_sustain: number | string;
  realisasi_scaling: number | string;
}

interface DetailCostRow {
  periode_bulan: string;
  beban_jarkom: number | string;
  beban_jasnaker: number | string;
  beban_kerjasama_pihak_ketiga: number | string;
  beban_lain_lain: number | string;
  beban_mandatory_gedung: number | string;
  depresiasi: number | string;
  total: number | string;
}

/* =========================================================
   HELPERS
========================================================= */

function toNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  let text = String(value).trim().replace(/\s/g, "").replace(/Rp/gi, "");

  if (!text) {
    return 0;
  }

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
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(value);
}

/* =========================================================
   KPI CURRENCY FORMAT
========================================================= */

function getRupiahKPI(value: number) {
  const number = Number(value) || 0;
  const absolute = Math.abs(number);

  if (absolute >= 1_000_000_000_000) {
    return {
      value: (number / 1_000_000_000_000).toFixed(2).replace(".", ","),
      unit: "Triliun",
    };
  }

  if (absolute >= 1_000_000_000) {
    return {
      value: (number / 1_000_000_000).toFixed(2).replace(".", ","),
      unit: "Miliar",
    };
  }

  if (absolute >= 1_000_000) {
    return {
      value: (number / 1_000_000).toFixed(2).replace(".", ","),
      unit: "Juta",
    };
  }

  if (absolute >= 1_000) {
    return {
      value: (number / 1_000).toFixed(2).replace(".", ","),
      unit: "Ribu",
    };
  }

  return {
    value: number.toLocaleString("id-ID"),
    unit: "",
  };
}

function formatRupiah(value: number): string {
  const result = getRupiahKPI(value);

  if (!result.unit) {
    return `Rp ${result.value}`;
  }

  return `Rp ${result.value} ${result.unit}`;
}


function formatAxisRupiah(value: number): string {
  const number = Number(value) || 0;
  const absolute = Math.abs(number);

  if (absolute >= 1_000_000_000_000) {
    return `Rp ${(number / 1_000_000_000_000).toFixed(1).replace(".", ",")} T`;
  }

  if (absolute >= 1_000_000_000) {
    return `Rp ${(number / 1_000_000_000).toFixed(1).replace(".", ",")} M`;
  }

  if (absolute >= 1_000_000) {
    return `Rp ${(number / 1_000_000).toFixed(1).replace(".", ",")} Jt`;
  }

  if (absolute >= 1_000) {
    return `Rp ${(number / 1_000).toFixed(1).replace(".", ",")} Rb`;
  }

  return formatNumber(number);
}

/* =========================================================
   DATE HELPERS
========================================================= */

function parsePeriod(value: string): Date | null {
  if (!value) {
    return null;
  }

  const match = value.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?/);

  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3] || 1);

    return new Date(year, month - 1, day);
  }

  const slashMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (slashMatch) {
    return new Date(Number(slashMatch[3]), Number(slashMatch[2]) - 1, Number(slashMatch[1]));
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function getMonthKey(value: string): string {
  const date = parsePeriod(value);

  if (!date) {
    return "";
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getYear(value: string): string {
  const date = parsePeriod(value);

  return date ? String(date.getFullYear()) : "";
}

function formatMonth(value: string): string {
  const date = parsePeriod(value);

  if (!date) {
    return value;
  }

  return date.toLocaleDateString("id-ID", {
    month: "short",
    year: "numeric",
  });
}

function monthSortValue(value: string): number {
  const date = parsePeriod(value);

  return date ? date.getFullYear() * 100 + date.getMonth() : 0;
}

/* =========================================================
   TEXT HELPERS
========================================================= */

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, "id-ID"));
}

function normalizeSla(value: unknown): number {
  const number = toNumber(value);

  if (number > 1) {
    return number;
  }

  return number * 100;
}

/* =========================================================
   STATUS
========================================================= */

function getStatusCategory(value: unknown): string {
  const status = normalizeText(value);

  /*
    IMPORTANT:
    Not Process harus dicek sebelum On Process.
  */

  if (
    status === "not process" ||
    status === "not processed" ||
    status === "no process" ||
    status === "no processed" ||
    status === "not proses" ||
    status === "no proses" ||
    status.includes("not process") ||
    status.includes("no process") ||
    status.includes("belum proses") ||
    status.includes("belum")
  ) {
    return "Not Process";
  }

  if (status === "on process" || status === "on processing" || status === "on proses" || status === "processing" || status === "process" || status === "proses" || status.includes("on process")) {
    return "On Process";
  }

  if (status === "done" || status === "completed" || status === "complete" || status === "selesai" || status.includes("done") || status.includes("completed") || status.includes("selesai")) {
    return "Done";
  }

  return value ? String(value) : "Unknown";
}

/* =========================================================
   COMPONENT
========================================================= */

export default function ExecutiveBusinessDashboard() {
  const [detailDivisi, setDetailDivisi] = useState<DetailDivisiRow[]>([]);

  const [bappBulanan, setBappBulanan] = useState<BappBulananRow[]>([]);

  const [detailBapp, setDetailBapp] = useState<DetailBappRow[]>([]);

  const [gpmData, setGpmData] = useState<GpmRow[]>([]);

  const [targetData, setTargetData] = useState<TargetRow[]>([]);

  const [detailCost, setDetailCost] = useState<DetailCostRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* =========================================================
     FILTER
  ========================================================= */

  const [unit, setUnit] = useState("");
  const [departemen, setDepartemen] = useState("");
  const [layanan, setLayanan] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");

  /* =========================================================
     FETCH
  ========================================================= */

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const [detailDivisiResponse, bappBulananResponse, detailBappResponse, gpmResponse, targetResponse, detailCostResponse] = await Promise.all([
          fetch(`${API_BASE}/master-detail-divisi`),
          fetch(`${API_BASE}/master-bapp-bulanan`),
          fetch(`${API_BASE}/master-detail-bapp`),
          fetch(`${API_BASE}/gpm`),
          fetch(`${API_BASE}/target`),
          fetch(`${API_BASE}/detail-cost`),
        ]);

        if (!detailDivisiResponse.ok || !bappBulananResponse.ok || !detailBappResponse.ok || !gpmResponse.ok || !targetResponse.ok || !detailCostResponse.ok) {
          throw new Error("Gagal mengambil salah satu sumber data dashboard.");
        }

        const [detailDivisiJson, bappBulananJson, detailBappJson, gpmJson, targetJson, detailCostJson] = await Promise.all([
          detailDivisiResponse.json(),
          bappBulananResponse.json(),
          detailBappResponse.json(),
          gpmResponse.json(),
          targetResponse.json(),
          detailCostResponse.json(),
        ]);

        if (!mounted) {
          return;
        }

        setDetailDivisi(Array.isArray(detailDivisiJson?.data) ? detailDivisiJson.data : []);

        setBappBulanan(Array.isArray(bappBulananJson?.data) ? bappBulananJson.data : []);

        setDetailBapp(Array.isArray(detailBappJson?.data) ? detailBappJson.data : []);

        setGpmData(Array.isArray(gpmJson?.data) ? gpmJson.data : []);

        setTargetData(Array.isArray(targetJson?.data) ? targetJson.data : []);

        setDetailCost(Array.isArray(detailCostJson?.data) ? detailCostJson.data : []);
      } catch (err) {
        console.error("Executive dashboard error:", err);

        if (mounted) {
          setError(err instanceof Error ? err.message : "Gagal memuat Executive Dashboard.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  /* =========================================================
     FILTER OPTIONS
  ========================================================= */

  const unitOptions = useMemo(() => {
    return uniqueSorted([...detailDivisi.map((row) => row.unit), ...bappBulanan.map((row) => row.unit), ...detailBapp.map((row) => row.unit)]);
  }, [detailDivisi, bappBulanan, detailBapp]);

  const departemenOptions = useMemo(() => {
    return uniqueSorted(detailDivisi.filter((row) => !unit || row.unit === unit).map((row) => row.departemen));
  }, [detailDivisi, unit]);

  const layananOptions = useMemo(() => {
    return uniqueSorted(detailDivisi.filter((row) => (!unit || row.unit === unit) && (!departemen || row.departemen === departemen)).map((row) => row.layanan));
  }, [detailDivisi, unit, departemen]);

  const monthOptions = useMemo(() => {
    const months = Array.from(new Set([...detailDivisi, ...bappBulanan, ...detailBapp, ...gpmData, ...targetData, ...detailCost].map((row) => getMonthKey(row.periode_bulan)).filter(Boolean))).sort();

    return months.map((key) => {
      const [year, month] = key.split("-").map(Number);

      return new Date(year, month - 1, 1).toLocaleDateString("id-ID", {
        month: "long",
      });
    });
  }, [detailDivisi, bappBulanan, detailBapp, gpmData, targetData, detailCost]);

  const yearOptions = useMemo(() => {
    return uniqueSorted([
      ...detailDivisi.map((row) => getYear(row.periode_bulan)),
      ...bappBulanan.map((row) => getYear(row.periode_bulan)),
      ...detailBapp.map((row) => getYear(row.periode_bulan)),
      ...gpmData.map((row) => getYear(row.periode_bulan)),
      ...targetData.map((row) => getYear(row.periode_bulan)),
      ...detailCost.map((row) => getYear(row.periode_bulan)),
    ]);
  }, [detailDivisi, bappBulanan, detailBapp, gpmData, targetData, detailCost]);

  const monthNumber = useMemo(() => {
    const result: Record<string, number> = {};

    [...detailDivisi, ...bappBulanan, ...detailBapp, ...gpmData, ...targetData, ...detailCost].forEach((row) => {
      const date = parsePeriod(row.periode_bulan);

      if (!date) {
        return;
      }

      const monthName = date
        .toLocaleDateString("id-ID", {
          month: "long",
        })
        .toLowerCase();

      result[monthName] = date.getMonth();
    });

    return result;
  }, [detailDivisi, bappBulanan, detailBapp, gpmData, targetData, detailCost]);

  const selectedMonthNumber = selectedMonth ? monthNumber[selectedMonth.toLowerCase()] : undefined;

  function matchesPeriod(periode: string): boolean {
    const date = parsePeriod(periode);

    if (!date) {
      return false;
    }

    if (selectedYear && String(date.getFullYear()) !== selectedYear) {
      return false;
    }

    if (selectedMonthNumber !== undefined && date.getMonth() !== selectedMonthNumber) {
      return false;
    }

    return true;
  }

  /* =========================================================
     FILTERED DATA
  ========================================================= */

  const filteredDetailDivisi = useMemo(() => {
    return detailDivisi.filter((row) => {
      if (!matchesPeriod(row.periode_bulan)) {
        return false;
      }

      if (unit && row.unit !== unit) {
        return false;
      }

      if (departemen && row.departemen !== departemen) {
        return false;
      }

      if (layanan && row.layanan !== layanan) {
        return false;
      }

      return true;
    });
  }, [detailDivisi, unit, departemen, layanan, selectedMonth, selectedYear, selectedMonthNumber]);

  const filteredBappBulanan = useMemo(() => {
    return bappBulanan.filter((row) => {
      if (!matchesPeriod(row.periode_bulan)) {
        return false;
      }

      if (unit && row.unit !== unit) {
        return false;
      }

      return true;
    });
  }, [bappBulanan, unit, selectedMonth, selectedYear, selectedMonthNumber]);

  const filteredGpm = useMemo(() => {
    return gpmData.filter((row) => matchesPeriod(row.periode_bulan));
  }, [gpmData, selectedMonth, selectedYear, selectedMonthNumber]);

  const filteredTarget = useMemo(() => {
    return targetData.filter((row) => matchesPeriod(row.periode_bulan));
  }, [targetData, selectedMonth, selectedYear, selectedMonthNumber]);

  const filteredCost = useMemo(() => {
    return detailCost.filter((row) => matchesPeriod(row.periode_bulan));
  }, [detailCost, selectedMonth, selectedYear, selectedMonthNumber]);

  /* =========================================================
     KPI
  ========================================================= */

  const { totalRevenue, totalCost, totalGpm, gpmPercentage } = useMemo(() => {
    const revenue = filteredGpm.reduce((sum, row) => sum + toNumber(row.revenue_payroll_bapp), 0);

    const cost = filteredGpm.reduce((sum, row) => sum + toNumber(row.cost_payroll), 0);

    const gpm = revenue - cost;

    const percentage = revenue !== 0 ? (gpm / revenue) * 100 : 0;

    return {
      totalRevenue: revenue,
      totalCost: cost,
      totalGpm: gpm,
      gpmPercentage: percentage,
    };
  }, [filteredGpm]);

  /* =========================================================
     CHART 1
     TARGET VS REALISASI REVENUE
  ========================================================= */

  const targetRevenueData = useMemo(() => {
    const map = new Map<
      string,
      {
        label: string;
        sort: number;
        target: number;
        realisasi: number;
      }
    >();

    filteredTarget.forEach((row) => {
      const key = getMonthKey(row.periode_bulan);

      if (!key) {
        return;
      }

      const date = parsePeriod(row.periode_bulan);

      if (!date) {
        return;
      }

      const existing = map.get(key) ?? {
        label: formatMonth(row.periode_bulan),
        sort: monthSortValue(row.periode_bulan),
        target: 0,
        realisasi: 0,
      };

      existing.target += toNumber(row.nominal_target_sustain) + toNumber(row.nominal_target_scaling);

      existing.realisasi += toNumber(row.realisasi_sustain) + toNumber(row.realisasi_scaling);

      map.set(key, existing);
    });

    return Array.from(map.values()).sort((a, b) => a.sort - b.sort);
  }, [filteredTarget]);

  /* =========================================================
     CHART 2
     GPM TREND
  ========================================================= */

  const gpmTrendData = useMemo(() => {
    return [...filteredGpm]
      .sort((a, b) => monthSortValue(a.periode_bulan) - monthSortValue(b.periode_bulan))
      .map((row) => {
        const revenue = toNumber(row.revenue_payroll_bapp);

        const cost = toNumber(row.cost_payroll);

        return {
          label: formatMonth(row.periode_bulan),
          revenue,
          cost,
          gpm: revenue - cost,
        };
      });
  }, [filteredGpm]);

  /* =========================================================
     CHART 3
     BAPP PERFORMANCE
  ========================================================= */

  const bappPerformanceData = useMemo(() => {
    const map = new Map<
      string,
      {
        label: string;
        sort: number;
        done: number;
        onProcess: number;
        notProcess: number;
      }
    >();

    filteredBappBulanan.forEach((row) => {
      const key = getMonthKey(row.periode_bulan);

      if (!key) {
        return;
      }

      const existing = map.get(key) ?? {
        label: formatMonth(row.periode_bulan),
        sort: monthSortValue(row.periode_bulan),
        done: 0,
        onProcess: 0,
        notProcess: 0,
      };

      const value = toNumber(row.jumlah_bapp);

      const status = getStatusCategory(row.status_bapp);

      if (status === "Done") {
        existing.done += value;
      } else if (status === "On Process") {
        existing.onProcess += value;
      } else if (status === "Not Process") {
        existing.notProcess += value;
      }

      map.set(key, existing);
    });

    return Array.from(map.values()).sort((a, b) => a.sort - b.sort);
  }, [filteredBappBulanan]);

  /* =========================================================
     CHART 4
     COST COMPOSITION
  ========================================================= */

  const costCompositionData = useMemo(() => {
    const summary = {
      jarkom: 0,
      jasnaker: 0,
      pihakKetiga: 0,
      lainLain: 0,
      mandatory: 0,
      depresiasi: 0,
    };

    filteredCost.forEach((row) => {
      summary.jarkom += toNumber(row.beban_jarkom);

      summary.jasnaker += toNumber(row.beban_jasnaker);

      summary.pihakKetiga += toNumber(row.beban_kerjasama_pihak_ketiga);

      summary.lainLain += toNumber(row.beban_lain_lain);

      summary.mandatory += toNumber(row.beban_mandatory_gedung);

      summary.depresiasi += toNumber(row.depresiasi);
    });

    return [
      {
        name: "Beban Jarkom",
        value: summary.jarkom,
      },
      {
        name: "Beban Jasnaker",
        value: summary.jasnaker,
      },
      {
        name: "Kerjasama Pihak Ketiga",
        value: summary.pihakKetiga,
      },
      {
        name: "Beban Lain-lain",
        value: summary.lainLain,
      },
      {
        name: "Mandatory Gedung",
        value: summary.mandatory,
      },
      {
        name: "Depresiasi",
        value: summary.depresiasi,
      },
    ]
      .filter((item) => item.value !== 0)
      .sort((a, b) => b.value - a.value);
  }, [filteredCost]);

  /* =========================================================
     CHART 5
     PAYROLL OPERATIONAL
  ========================================================= */

  const payrollTrendData = useMemo(() => {
    const map = new Map<
      string,
      {
        label: string;
        sort: number;
        transaksi: number;
        slaTotal: number;
        slaCount: number;
      }
    >();

    filteredDetailDivisi.forEach((row) => {
      const key = getMonthKey(row.periode_bulan);

      if (!key) {
        return;
      }

      const existing = map.get(key) ?? {
        label: formatMonth(row.periode_bulan),
        sort: monthSortValue(row.periode_bulan),
        transaksi: 0,
        slaTotal: 0,
        slaCount: 0,
      };

      existing.transaksi += toNumber(row.jumlah_transaksi);

      const sla = normalizeSla(row.sla_tercapai);

      existing.slaTotal += sla;
      existing.slaCount += 1;

      map.set(key, existing);
    });

    return Array.from(map.values())
      .sort((a, b) => a.sort - b.sort)
      .map((item) => ({
        label: item.label,
        transaksi: item.transaksi,
        sla: item.slaCount > 0 ? item.slaTotal / item.slaCount : 0,
      }));
  }, [filteredDetailDivisi]);

  /* =========================================================
     CHART REFS
  ========================================================= */

  const targetChartRef = useRef<echarts.EChartsType | null>(null);

  const gpmChartRef = useRef<echarts.EChartsType | null>(null);

  const bappChartRef = useRef<echarts.EChartsType | null>(null);

  const costChartRef = useRef<echarts.EChartsType | null>(null);

  const payrollChartRef = useRef<echarts.EChartsType | null>(null);

  /* =========================================================
     CHART 1 OPTION
  ========================================================= */

  const targetChartOption = useMemo(
    () => ({
      animation: true,
      animationDuration: 800,

      tooltip: {
        trigger: "axis",

        backgroundColor: "#172436",
        borderColor: "#344a63",
        borderWidth: 1,

        textStyle: {
          color: "#e8eef6",
          fontSize: 11,
        },

        formatter: (params: any[]) => {
          if (!params?.length) {
            return "";
          }

          let html = `
              <div
                style="
                  font-weight:700;
                  color:#f8fafc;
                  margin-bottom:7px;
                "
              >
                ${params[0].axisValue}
              </div>
            `;

          params.forEach((item) => {
            html += `
                <div
                  style="
                    display:flex;
                    justify-content:space-between;
                    gap:22px;
                    margin:5px 0;
                  "
                >
                  <span style="color:#9fb0c3;">
                    ${item.marker}
                    ${item.seriesName}
                  </span>

                  <strong style="color:#f8fafc;">
                    ${formatRupiah(Number(item.value) || 0)}
                  </strong>
                </div>
              `;
          });

          return html;
        },
      },

      legend: {
        top: 0,
        left: 0,

        textStyle: {
          color: "#aebed0",
          fontSize: 10,
        },
      },

      grid: {
        left: 58,
        right: 24,
        top: 42,
        bottom: 45,
        containLabel: true,
      },

      xAxis: {
        type: "category",

        data: targetRevenueData.map((item) => item.label),

        axisLine: {
          lineStyle: {
            color: "rgba(148,163,184,.22)",
          },
        },

        axisTick: {
          show: false,
        },

        axisLabel: {
          color: "#9aacc0",
          fontSize: 9,
        },
      },

      yAxis: {
        type: "value",

        axisLabel: {
          color: "#9aacc0",
          fontSize: 9,

          formatter: (value: number) => formatAxisRupiah(value),
        },

        splitLine: {
          lineStyle: {
            color: "rgba(126,150,178,.12)",
            type: "dashed",
          },
        },
      },

      series: [
        {
          name: "Target Revenue",
          type: "bar",

          barMaxWidth: 28,

          data: targetRevenueData.map((item) => item.target),

          itemStyle: {
            borderRadius: [7, 7, 2, 2],

            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              {
                offset: 0,
                color: "#93c5fd",
              },
              {
                offset: 0.5,
                color: "#3b82f6",
              },
              {
                offset: 1,
                color: "#1d4ed8",
              },
            ]),

            shadowBlur: 8,
            shadowColor: "rgba(59,130,246,.22)",
            shadowOffsetY: 3,
          },
        },

        {
          name: "Realisasi Revenue",
          type: "line",

          smooth: true,

          data: targetRevenueData.map((item) => item.realisasi),

          symbol: "circle",
          symbolSize: 7,

          lineStyle: {
            width: 3,

            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              {
                offset: 0,
                color: "#16a34a",
              },
              {
                offset: 0.5,
                color: "#22c55e",
              },
              {
                offset: 1,
                color: "#86efac",
              },
            ]),
          },

          itemStyle: {
            color: "#22c55e",
            borderColor: "#ecfdf5",
            borderWidth: 2,
          },

          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              {
                offset: 0,
                color: "rgba(34,197,94,.20)",
              },
              {
                offset: 1,
                color: "rgba(34,197,94,.01)",
              },
            ]),
          },
        },
      ],
    }),
    [targetRevenueData],
  );

  /* =========================================================
     CHART 2 OPTION
  ========================================================= */

  const gpmChartOption = useMemo(
    () => ({
      animation: true,
      animationDuration: 800,

      tooltip: {
        trigger: "axis",

        backgroundColor: "#172436",
        borderColor: "#344a63",

        textStyle: {
          color: "#e8eef6",
          fontSize: 11,
        },

        formatter: (params: any[]) => {
          if (!params?.length) {
            return "";
          }

          let html = `
            <div
              style="
                font-weight:700;
                color:#f8fafc;
                margin-bottom:7px;
              "
            >
              ${params[0].axisValue}
            </div>
          `;

          params.forEach((item) => {
            html += `
              <div
                style="
                  display:flex;
                  justify-content:space-between;
                  gap:22px;
                  margin:5px 0;
                "
              >
                <span style="color:#9fb0c3;">
                  ${item.marker}
                  ${item.seriesName}
                </span>

                <strong style="color:#f8fafc;">
                  ${formatRupiah(Number(item.value) || 0)}
                </strong>
              </div>
            `;
          });

          return html;
        },
      },

      legend: {
        top: 0,
        left: 0,

        textStyle: {
          color: "#aebed0",
          fontSize: 10,
        },
      },

      grid: {
        left: 58,
        right: 24,
        top: 42,
        bottom: 45,
        containLabel: true,
      },

      xAxis: {
        type: "category",

        data: gpmTrendData.map((item) => item.label),

        axisLabel: {
          color: "#9aacc0",
          fontSize: 9,
        },

        axisLine: {
          lineStyle: {
            color: "rgba(148,163,184,.22)",
          },
        },
      },

      yAxis: {
        type: "value",

        axisLabel: {
          color: "#9aacc0",
          fontSize: 9,

          formatter: (value: number) => formatAxisRupiah(value),
        },

        splitLine: {
          lineStyle: {
            color: "rgba(126,150,178,.12)",
            type: "dashed",
          },
        },
      },

      series: [
        {
          name: "Revenue",
          type: "line",
          smooth: true,

          data: gpmTrendData.map((item) => item.revenue),

          symbol: "circle",
          symbolSize: 6,

          lineStyle: {
            width: 3,

            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              {
                offset: 0,
                color: "#60a5fa",
              },
              {
                offset: 0.5,
                color: "#3b82f6",
              },
              {
                offset: 1,
                color: "#93c5fd",
              },
            ]),
          },

          itemStyle: {
            color: "#3b82f6",
            borderColor: "#eff6ff",
            borderWidth: 2,
          },
        },

        {
          name: "Cost",
          type: "line",
          smooth: true,

          data: gpmTrendData.map((item) => item.cost),

          symbol: "circle",
          symbolSize: 6,

          lineStyle: {
            width: 3,

            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              {
                offset: 0,
                color: "#f87171",
              },
              {
                offset: 0.5,
                color: "#ef4444",
              },
              {
                offset: 1,
                color: "#fca5a5",
              },
            ]),
          },

          itemStyle: {
            color: "#ef4444",
            borderColor: "#fff1f2",
            borderWidth: 2,
          },
        },

        {
          name: "GPM",
          type: "line",
          smooth: true,

          data: gpmTrendData.map((item) => item.gpm),

          symbol: "circle",
          symbolSize: 7,

          lineStyle: {
            width: 3,

            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              {
                offset: 0,
                color: "#a78bfa",
              },
              {
                offset: 0.5,
                color: "#8b5cf6",
              },
              {
                offset: 1,
                color: "#c4b5fd",
              },
            ]),
          },

          itemStyle: {
            color: "#8b5cf6",
            borderColor: "#f5f3ff",
            borderWidth: 2,
          },

          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              {
                offset: 0,
                color: "rgba(139,92,246,.16)",
              },
              {
                offset: 1,
                color: "rgba(139,92,246,.01)",
              },
            ]),
          },
        },
      ],
    }),
    [gpmTrendData],
  );

  /* =========================================================
     CHART 3 OPTION
  ========================================================= */

  const bappChartOption = useMemo(
    () => ({
      animation: true,
      animationDuration: 800,

      tooltip: {
        trigger: "axis",

        backgroundColor: "#172436",
        borderColor: "#344a63",

        textStyle: {
          color: "#e8eef6",
          fontSize: 11,
        },

        formatter: (params: any[]) => {
          if (!params?.length) {
            return "";
          }

          let html = `
            <div
              style="
                font-weight:700;
                color:#f8fafc;
                margin-bottom:7px;
              "
            >
              ${params[0].axisValue}
            </div>
          `;

          params.forEach((item) => {
            html += `
              <div
                style="
                  display:flex;
                  justify-content:space-between;
                  gap:20px;
                  margin:5px 0;
                "
              >
                <span style="color:#9fb0c3;">
                  ${item.marker}
                  ${item.seriesName}
                </span>

                <strong style="color:#f8fafc;">
                  ${formatNumber(Number(item.value) || 0)}
                </strong>
              </div>
            `;
          });

          return html;
        },
      },

      legend: {
        top: 0,
        left: 0,

        textStyle: {
          color: "#aebed0",
          fontSize: 10,
        },
      },

      grid: {
        left: 45,
        right: 20,
        top: 42,
        bottom: 45,
        containLabel: true,
      },

      xAxis: {
        type: "category",

        data: bappPerformanceData.map((item) => item.label),

        axisLabel: {
          color: "#9aacc0",
          fontSize: 9,
        },

        axisLine: {
          lineStyle: {
            color: "rgba(148,163,184,.22)",
          },
        },
      },

      yAxis: {
        type: "value",

        axisLabel: {
          color: "#9aacc0",
          fontSize: 9,

          formatter: (value: number) => formatNumber(value),
        },

        splitLine: {
          lineStyle: {
            color: "rgba(126,150,178,.12)",
            type: "dashed",
          },
        },
      },

      series: [
        {
          name: "Done",
          type: "bar",
          stack: "bapp",

          barMaxWidth: 30,

          data: bappPerformanceData.map((item) => item.done),

          itemStyle: {
            borderRadius: [6, 6, 0, 0],

            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              {
                offset: 0,
                color: "#86efac",
              },
              {
                offset: 0.5,
                color: "#22c55e",
              },
              {
                offset: 1,
                color: "#15803d",
              },
            ]),

            shadowBlur: 8,
            shadowColor: "rgba(34,197,94,.18)",
            shadowOffsetY: 3,
          },
        },

        {
          name: "On Process",
          type: "bar",
          stack: "bapp",

          barMaxWidth: 30,

          data: bappPerformanceData.map((item) => item.onProcess),

          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              {
                offset: 0,
                color: "#f3fba2",
              },
              {
                offset: 0.5,
                color: "#fff643",
              },
              {
                offset: 1,
                color: "#fbff00",
              },
            ]),
          },
        },

        {
          name: "Not Process",
          type: "bar",
          stack: "bapp",

          barMaxWidth: 30,

          data: bappPerformanceData.map((item) => item.notProcess),

          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              {
                offset: 0,
                color: "#fca5a5",
              },
              {
                offset: 0.5,
                color: "#ef4444",
              },
              {
                offset: 1,
                color: "#b91c1c",
              },
            ]),
          },
        },
      ],
    }),
    [bappPerformanceData],
  );

  /* =========================================================
     CHART 4 OPTION
  ========================================================= */

 const costChartOption = useMemo(
   () => ({
     animation: true,
     animationDuration: 800,

     tooltip: {
       trigger: "item",

       backgroundColor: "#172436",
       borderColor: "#344a63",

       textStyle: {
         color: "#e8eef6",
         fontSize: 11,
       },

       formatter: (params: any) => {
         return `
          <div
            style="
              font-weight:700;
              color:#f8fafc;
              margin-bottom:6px;
            "
          >
            ${params.name}
          </div>

          <div style="color:#f8fafc;">
            ${formatRupiah(Number(params.value) || 0)}
          </div>

          <div
            style="
              color:#9fb0c3;
              margin-top:3px;
            "
          >
            ${Number(params.percent).toFixed(1)}%
          </div>
        `;
       },
     },

     legend: {
       bottom: 2,
       left: "center",

       width: "90%",

       itemWidth: 16,
       itemHeight: 9,

       itemGap: 6,

       textStyle: {
         color: "#9aacc0",
         fontSize: 8,
       },
     },

     series: [
       {
         name: "Cost Composition",
         type: "pie",

         radius: ["42%", "68%"],

         center: ["50%", "43%"],

         avoidLabelOverlap: true,

         itemStyle: {
           borderColor: "#14263a",
           borderWidth: 3,
           borderRadius: 5,
         },

         /*
          * Hide labels outside the donut.
          * Detail is shown through tooltip.
          */
         label: {
           show: false,
         },

         labelLine: {
           show: false,
         },

         emphasis: {
           scale: true,
           scaleSize: 5,

           label: {
             show: false,
           },

           itemStyle: {
             shadowBlur: 12,
             shadowOffsetX: 0,
             shadowColor: "rgba(0, 0, 0, 0.25)",
           },
         },

         data: costCompositionData.map((item, index) => {
           const gradients = [
             ["#fca5a5", "#ef4444", "#b91c1c"],
             ["#fdba74", "#f97316", "#c2410c"],
             ["#fde68a", "#eab308", "#a16207"],
             ["#c4b5fd", "#8b5cf6", "#6d28d9"],
             ["#93c5fd", "#3b82f6", "#1d4ed8"],
             ["#86efac", "#22c55e", "#15803d"],
           ];

           const colors = gradients[index % gradients.length];

           return {
             ...item,

             itemStyle: {
               borderColor: "#14263a",
               borderWidth: 3,
               borderRadius: 5,

               color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [
                 {
                   offset: 0,
                   color: colors[0],
                 },
                 {
                   offset: 0.5,
                   color: colors[1],
                 },
                 {
                   offset: 1,
                   color: colors[2],
                 },
               ]),
             },
           };
         }),
       },
     ],
   }),
   [costCompositionData],
 );

  /* =========================================================
     CHART 5 OPTION
  ========================================================= */

  const payrollChartOption = useMemo(
    () => ({
      animation: true,
      animationDuration: 800,

      tooltip: {
        trigger: "axis",

        backgroundColor: "#172436",
        borderColor: "#344a63",

        textStyle: {
          color: "#e8eef6",
          fontSize: 11,
        },

        formatter: (params: any[]) => {
          if (!params?.length) {
            return "";
          }

          const month = params[0].axisValue;

          let html = `
              <div
                style="
                  font-weight:700;
                  color:#f8fafc;
                  margin-bottom:7px;
                "
              >
                ${month}
              </div>
            `;

          params.forEach((item) => {
            const value = item.seriesName === "SLA Tercapai" ? `${Number(item.value).toFixed(1)}%` : formatNumber(Number(item.value) || 0);

            html += `
                <div
                  style="
                    display:flex;
                    justify-content:space-between;
                    gap:20px;
                    margin:5px 0;
                  "
                >
                  <span style="color:#9fb0c3;">
                    ${item.marker}
                    ${item.seriesName}
                  </span>

                  <strong style="color:#f8fafc;">
                    ${value}
                  </strong>
                </div>
              `;
          });

          return html;
        },
      },

      legend: {
        top: 0,
        left: 0,

        textStyle: {
          color: "#aebed0",
          fontSize: 10,
        },
      },

      grid: {
        left: 45,
        right: 55,
        top: 42,
        bottom: 45,
        containLabel: true,
      },

      xAxis: {
        type: "category",

        data: payrollTrendData.map((item) => item.label),

        axisLabel: {
          color: "#9aacc0",
          fontSize: 9,
        },

        axisLine: {
          lineStyle: {
            color: "rgba(148,163,184,.22)",
          },
        },
      },

      yAxis: [
        {
          type: "value",

          name: "Transaksi",

          nameTextStyle: {
            color: "#71869d",
            fontSize: 9,
          },

          axisLabel: {
            color: "#9aacc0",
            fontSize: 9,

            formatter: (value: number) => formatNumber(value),
          },

          splitLine: {
            lineStyle: {
              color: "rgba(126,150,178,.12)",
              type: "dashed",
            },
          },
        },

        {
          type: "value",

          min: 0,
          max: 100,

          name: "SLA",

          nameTextStyle: {
            color: "#71869d",
            fontSize: 9,
          },

          axisLabel: {
            color: "#9aacc0",
            fontSize: 9,

            formatter: "{value}%",
          },

          splitLine: {
            show: false,
          },
        },
      ],

      series: [
        {
          name: "Jumlah Transaksi",
          type: "bar",

          data: payrollTrendData.map((item) => item.transaksi),

          barMaxWidth: 30,

          itemStyle: {
            borderRadius: [7, 7, 2, 2],

            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              {
                offset: 0,
                color: "#93c5fd",
              },
              {
                offset: 0.5,
                color: "#3b82f6",
              },
              {
                offset: 1,
                color: "#1d4ed8",
              },
            ]),

            shadowBlur: 8,
            shadowColor: "rgba(59,130,246,.18)",
            shadowOffsetY: 3,
          },
        },

        {
          name: "SLA Tercapai",
          type: "line",

          yAxisIndex: 1,

          smooth: true,

          data: payrollTrendData.map((item) => item.sla),

          symbol: "circle",
          symbolSize: 7,

          lineStyle: {
            width: 3,

            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              {
                offset: 0,
                color: "#86efac",
              },
              {
                offset: 0.5,
                color: "#22c55e",
              },
              {
                offset: 1,
                color: "#16a34a",
              },
            ]),
          },

          itemStyle: {
            color: "#22c55e",
            borderColor: "#f0fdf4",
            borderWidth: 2,
          },
        },
      ],
    }),
    [payrollTrendData],
  );

  /* =========================================================
     RESIZE
  ========================================================= */

  useEffect(() => {
    const charts = [targetChartRef.current, gpmChartRef.current, bappChartRef.current, costChartRef.current, payrollChartRef.current].filter(Boolean);

    const resize = () => {
      charts.forEach((chart) => {
        chart?.resize();
      });
    };

    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
    };
  });

  /* =========================================================
     RESET
  ========================================================= */

  const resetFilters = () => {
    setUnit("");
    setDepartemen("");
    setLayanan("");
    setSelectedMonth("");
    setSelectedYear("");
  };

  const hasFilter = Boolean(unit || departemen || layanan || selectedMonth || selectedYear);

  /* =========================================================
     LOADING
  ========================================================= */

if (loading) {
  return (
    <div className="bapp-state">
      <div className="bapp-spinner" />
      <span>Mengambil data dari database...</span>
    </div>
  );
}



  /* =========================================================
     ERROR
  ========================================================= */

  if (error) {
    return (
      <div className="executive-dashboard-error">
        <div className="executive-error-card">
          <strong>Gagal Memuat Dashboard</strong>

          <span>{error}</span>

          <button type="button" onClick={() => window.location.reload()}>
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="executive-page">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="executive-header">
        <div className="executive-header-copy">
          <div className="executive-title-row">
            <h1>Executive Business Dashboard</h1>

            <span className="executive-live-badge">
              <span className="executive-live-dot" />
              Data Terhubung
            </span>
          </div>

          <p>Executive monitoring untuk revenue, cost, GPM, BAPP, dan payroll operational performance</p>

          <span className="executive-source">
            Sumber data:
            <strong>master_detail_divisi</strong>,<strong>master_bapp_bulanan</strong>,<strong>master_detail_bapp</strong>,<strong>gpm</strong>,<strong>target</strong>,<strong>detail_cost</strong>
          </span>
        </div>
      </header>

      {/* =====================================================
          FILTER
      ===================================================== */}

      <section className="executive-filter-card">
        <div className="executive-filter-heading">
          <div>
            <span className="executive-section-kicker">FILTER DATA</span>

            <h2>Parameter Dashboard</h2>
          </div>

          <button type="button" className={`executive-reset-filter ${hasFilter ? "is-active" : ""}`} onClick={resetFilters}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />
              <path d="M3 21v-5h5" />
            </svg>

            <span>Reset Filter</span>
          </button>
        </div>

        <div className="executive-filter-grid">
          <div className="executive-filter-item">
            <label>Unit</label>

            <SearchableSelect
              value={unit}
              options={unitOptions}
              placeholder="Semua Unit"
              searchPlaceholder="Cari unit..."
              onChange={(value) => {
                setUnit(value);
                setDepartemen("");
                setLayanan("");
              }}
            />
          </div>

          <div className="executive-filter-item">
            <label>Departemen</label>

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

          <div className="executive-filter-item">
            <label>Layanan</label>

            <SearchableSelect value={layanan} options={layananOptions} placeholder="Semua Layanan" searchPlaceholder="Cari layanan..." onChange={setLayanan} />
          </div>

          <div className="executive-filter-item">
            <label>Bulan</label>

            <SearchableSelect value={selectedMonth} options={monthOptions} placeholder="Semua Bulan" searchPlaceholder="Cari bulan..." onChange={setSelectedMonth} />
          </div>

          <div className="executive-filter-item">
            <label>Tahun</label>

            <SearchableSelect value={selectedYear} options={yearOptions} placeholder="Semua Tahun" searchPlaceholder="Cari tahun..." onChange={setSelectedYear} />
          </div>
        </div>
      </section>

      {/* =====================================================
          KPI
      ===================================================== */}

      <section className="executive-kpi-grid">
        {/* REVENUE */}

        <article className="executive-kpi-card">
          <span className="executive-kpi-label">Total Revenue</span>

          <strong className="executive-kpi-value">
            <span>Rp {getRupiahKPI(totalRevenue).value}</span>

            {getRupiahKPI(totalRevenue).unit && <small>{getRupiahKPI(totalRevenue).unit}</small>}
          </strong>

          <span className="executive-kpi-subtitle">Revenue Payroll &amp; BAPP</span>
        </article>

        {/* COST */}

        <article className="executive-kpi-card">
          <span className="executive-kpi-label">Total Cost</span>

          <strong className="executive-kpi-value">
            <span>Rp {getRupiahKPI(totalCost).value}</span>

            {getRupiahKPI(totalCost).unit && <small>{getRupiahKPI(totalCost).unit}</small>}
          </strong>

          <span className="executive-kpi-subtitle">Cost Payroll</span>
        </article>

        {/* GPM */}

        <article className="executive-kpi-card">
          <span className="executive-kpi-label">GPM</span>

          <strong className="executive-kpi-value">
            <span>Rp {getRupiahKPI(totalGpm).value}</span>

            {getRupiahKPI(totalGpm).unit && <small>{getRupiahKPI(totalGpm).unit}</small>}
          </strong>

          <span className="executive-kpi-subtitle">Revenue - Cost</span>
        </article>

        {/* GPM % */}

        <article className="executive-kpi-card">
          <span className="executive-kpi-label">GPM %</span>

          <strong className="executive-kpi-value executive-kpi-percent">{gpmPercentage.toFixed(1).replace(".", ",")}%</strong>

          <span className="executive-kpi-subtitle">Gross Profit Margin</span>
        </article>
      </section>

      {/* =====================================================
          CHART 1
      ===================================================== */}

      <section className="executive-chart-grid">
        <article className="executive-chart-card">
          <div className="executive-chart-header">
            <div>
              <span className="executive-chart-kicker">REVENUE PERFORMANCE</span>

              <h3>Target vs Realisasi Revenue</h3>
            </div>
          </div>

          <div className="executive-chart-body executive-chart-large">
            {targetRevenueData.length > 0 ? (
              <div
                ref={(element) => {
                  if (!element) {
                    return;
                  }

                  const chart = echarts.init(element);

                  targetChartRef.current = chart;

                  chart.setOption(targetChartOption, true);
                }}
                className="executive-echart"
              />
            ) : (
              <div className="executive-empty-chart">Tidak ada data untuk filter yang dipilih.</div>
            )}
          </div>
        </article>

        {/* =====================================================
            CHART 2
        ===================================================== */}

        <article className="executive-chart-card">
          <div className="executive-chart-header">
            <div>
              <span className="executive-chart-kicker">PROFITABILITY</span>

              <h3>Revenue, Cost &amp; GPM Trend</h3>
            </div>
          </div>

          <div className="executive-chart-body executive-chart-large">
            {gpmTrendData.length > 0 ? (
              <div
                ref={(element) => {
                  if (!element) {
                    return;
                  }

                  const chart = echarts.init(element);

                  gpmChartRef.current = chart;

                  chart.setOption(gpmChartOption, true);
                }}
                className="executive-echart"
              />
            ) : (
              <div className="executive-empty-chart">Tidak ada data untuk filter yang dipilih.</div>
            )}
          </div>
        </article>
      </section>

      {/* =====================================================
          CHART 3 + CHART 4
      ===================================================== */}

      <section className="executive-chart-grid">
        <article className="executive-chart-card">
          <div className="executive-chart-header">
            <div>
              <span className="executive-chart-kicker">BAPP PERFORMANCE</span>

              <h3>BAPP Performance</h3>
            </div>
          </div>

          <div className="executive-chart-body">
            {bappPerformanceData.length > 0 ? (
              <div
                ref={(element) => {
                  if (!element) {
                    return;
                  }

                  const chart = echarts.init(element);

                  bappChartRef.current = chart;

                  chart.setOption(bappChartOption, true);
                }}
                className="executive-echart"
              />
            ) : (
              <div className="executive-empty-chart">Tidak ada data untuk filter yang dipilih.</div>
            )}
          </div>
        </article>

        <article className="executive-chart-card">
          <div className="executive-chart-header">
            <div>
              <span className="executive-chart-kicker">COST ANALYSIS</span>

              <h3>Cost Composition</h3>
            </div>
          </div>

          <div className="executive-chart-body">
            {costCompositionData.length > 0 ? (
              <div
                ref={(element) => {
                  if (!element) {
                    return;
                  }

                  const chart = echarts.init(element);

                  costChartRef.current = chart;

                  chart.setOption(costChartOption, true);
                }}
                className="executive-echart"
              />
            ) : (
              <div className="executive-empty-chart">Tidak ada data untuk filter yang dipilih.</div>
            )}
          </div>
        </article>
      </section>

      {/* =====================================================
          CHART 5
      ===================================================== */}

      <article className="executive-chart-card executive-payroll-card">
        <div className="executive-chart-header">
          <div>
            <span className="executive-chart-kicker">PAYROLL OPERATIONAL</span>

            <h3>Payroll Operational Trend</h3>
          </div>
        </div>

        <div className="executive-chart-body executive-payroll-chart">
          {payrollTrendData.length > 0 ? (
            <div
              ref={(element) => {
                if (!element) {
                  return;
                }

                const chart = echarts.init(element);

                payrollChartRef.current = chart;

                chart.setOption(payrollChartOption, true);
              }}
              className="executive-echart"
            />
          ) : (
            <div className="executive-empty-chart">Tidak ada data untuk filter yang dipilih.</div>
          )}
        </div>
      </article>

      {/* =====================================================
          INFO
      ===================================================== */}

      <section className="executive-info-card">
        <div>
          <span className="executive-info-label">DATA COVERAGE</span>

          <strong>{formatNumber(filteredDetailDivisi.length)} Payroll Records</strong>
        </div>

        <div>
          <span className="executive-info-label">BAPP</span>

          <strong>{formatNumber(filteredBappBulanan.length)} Records</strong>
        </div>

        <div>
          <span className="executive-info-label">REVENUE</span>

          <strong>{formatRupiah(totalRevenue)}</strong>
        </div>

        <div>
          <span className="executive-info-label">GPM</span>

          <strong>{gpmPercentage.toFixed(1).replace(".", ",")}%</strong>
        </div>
      </section>
    </div>
  );
}
