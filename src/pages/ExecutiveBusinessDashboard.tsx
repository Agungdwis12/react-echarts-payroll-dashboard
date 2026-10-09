import { useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts";
import "./ExecutiveBusinessDashboard.css";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

/* =========================================================
   TYPES
========================================================= */

interface DetailDivisiRow {
  id?: number;
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
  id?: number;
  periode_bulan: string;
  status_bapp: string;
  jumlah_bapp: number | string;
  nominal: number | string;
  unit: string;
  created_at?: string;
}

interface GpmRow {
  id?: number;
  periode_bulan: string;
  revenue_payroll_bapp: number | string;
  cost_payroll: number | string;
  created_at?: string;
}

interface TargetRow {
  id?: number;
  periode_bulan: string;
  nominal_target_sustain: number | string;
  nominal_target_scaling: number | string;
  realisasi_sustain: number | string;
  realisasi_scaling: number | string;
  created_at?: string;
}

interface DetailCostRow {
  id?: number;
  periode_bulan: string;
  beban_jarkom: number | string;
  beban_jasnaker: number | string;
  beban_kerjasama_pihak_ketiga: number | string;
  beban_lain_lain: number | string;
  beban_mandatory_gedung: number | string;
  depresiasi: number | string;
  total: number | string;
  created_at?: string;
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

function formatDecimal(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

function formatRupiah(value: number): string {
  const absolute = Math.abs(value);

  if (absolute >= 1_000_000_000_000) {
    return `Rp ${(value / 1_000_000_000_000).toFixed(2).replace(".", ",")} T`;
  }

  if (absolute >= 1_000_000_000) {
    return `Rp ${(value / 1_000_000_000).toFixed(2).replace(".", ",")} M`;
  }

  if (absolute >= 1_000_000) {
    return `Rp ${(value / 1_000_000).toFixed(2).replace(".", ",")} jt`;
  }

  if (absolute >= 1_000) {
    return `Rp ${(value / 1_000).toFixed(2).replace(".", ",")} rb`;
  }

  return `Rp ${formatNumber(value)}`;
}

function formatAxisRupiah(value: number): string {
  const absolute = Math.abs(value);

  if (absolute >= 1_000_000_000_000) {
    return `Rp ${(value / 1_000_000_000_000).toFixed(1).replace(".", ",")} T`;
  }

  if (absolute >= 1_000_000_000) {
    return `Rp ${(value / 1_000_000_000).toFixed(1).replace(".", ",")} M`;
  }

  if (absolute >= 1_000_000) {
    return `Rp ${(value / 1_000_000).toFixed(1).replace(".", ",")} jt`;
  }

  if (absolute >= 1_000) {
    return `Rp ${(value / 1_000).toFixed(1).replace(".", ",")} rb`;
  }

  return formatNumber(value);
}

/* =========================================================
   DATE
========================================================= */

function parsePeriod(value: string): Date | null {
  if (!value) {
    return null;
  }

  const normalized = String(value).trim();

  const match = normalized.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?/);

  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3] || 1));
  }

  const slashMatch = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (slashMatch) {
    return new Date(Number(slashMatch[3]), Number(slashMatch[2]) - 1, Number(slashMatch[1]));
  }

  const date = new Date(normalized);

  return Number.isNaN(date.getTime()) ? null : date;
}

function getMonthKey(value: string): string {
  const date = parsePeriod(value);

  if (!date) {
    return "";
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthNumber(value: string): string {
  const date = parsePeriod(value);

  if (!date) {
    return "";
  }

  return String(date.getMonth() + 1).padStart(2, "0");
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
   SLA
========================================================= */

function normalizeSla(value: unknown): number {
  const number = toNumber(value);

  return number <= 1 ? number * 100 : number;
}

/* =========================================================
   API RESPONSE
========================================================= */

function extractRows<T>(response: unknown): T[] {
  if (Array.isArray(response)) {
    return response as T[];
  }

  if (response && typeof response === "object") {
    const data = response as {
      data?: unknown;
      rows?: unknown;
      result?: unknown;
    };

    if (Array.isArray(data.data)) {
      return data.data as T[];
    }

    if (Array.isArray(data.rows)) {
      return data.rows as T[];
    }

    if (Array.isArray(data.result)) {
      return data.result as T[];
    }
  }

  return [];
}

/* =========================================================
   COMPONENT
========================================================= */

export default function ExecutiveBusinessDashboard() {
  const [detailDivisi, setDetailDivisi] = useState<DetailDivisiRow[]>([]);

  const [bappBulanan, setBappBulanan] = useState<BappBulananRow[]>([]);

  const [gpmData, setGpmData] = useState<GpmRow[]>([]);

  const [targetData, setTargetData] = useState<TargetRow[]>([]);

  const [detailCost, setDetailCost] = useState<DetailCostRow[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  /* =======================================================
     FILTER
  ======================================================= */

  const [selectedMonth, setSelectedMonth] = useState("");

  const [selectedYear, setSelectedYear] = useState("");

  /* =======================================================
     CHART REFS
  ======================================================= */

  const trendChartRef = useRef<HTMLDivElement | null>(null);

  const trendChartInstance = useRef<echarts.ECharts | null>(null);

  /* =======================================================
     FETCH
  ======================================================= */

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const [detailDivisiResponse, bappResponse, gpmResponse, targetResponse, costResponse] = await Promise.all([
          fetch(`${API_BASE}/master-detail-divisi`),
          fetch(`${API_BASE}/master-bapp-bulanan`),
          fetch(`${API_BASE}/gpm`),
          fetch(`${API_BASE}/target`),
          fetch(`${API_BASE}/detail-cost`),
        ]);

        if (!detailDivisiResponse.ok || !bappResponse.ok || !gpmResponse.ok || !targetResponse.ok || !costResponse.ok) {
          throw new Error("Gagal mengambil data dashboard.");
        }

        const [detailDivisiJson, bappJson, gpmJson, targetJson, costJson] = await Promise.all([detailDivisiResponse.json(), bappResponse.json(), gpmResponse.json(), targetResponse.json(), costResponse.json()]);

        if (!mounted) {
          return;
        }

        setDetailDivisi(extractRows<DetailDivisiRow>(detailDivisiJson));

        setBappBulanan(extractRows<BappBulananRow>(bappJson));

        setGpmData(extractRows<GpmRow>(gpmJson));

        setTargetData(extractRows<TargetRow>(targetJson));

        setDetailCost(extractRows<DetailCostRow>(costJson));
      } catch (err) {
        console.error("Operational dashboard error:", err);

        if (mounted) {
          setError(err instanceof Error ? err.message : "Gagal memuat dashboard.");
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

  /* =======================================================
     MONTH OPTIONS
     
     PENTING:
     Dropdown bulan hanya berdasarkan bulan.
     Tidak ada tahun.
     
     Contoh:
     Januari
     Februari
     Maret
     ...
     
     Walaupun database punya:
     2025-08
     2026-08
     
     dropdown hanya punya:
     Agustus
  ======================================================= */

  const monthOptions = useMemo(() => {
    const months = new Set<string>();

    [...detailDivisi, ...bappBulanan, ...gpmData, ...targetData, ...detailCost].forEach((row) => {
      const month = getMonthNumber(row.periode_bulan);

      if (month) {
        months.add(month);
      }
    });

    return Array.from(months).sort((a, b) => Number(a) - Number(b));
  }, [detailDivisi, bappBulanan, gpmData, targetData, detailCost]);

  /* =======================================================
     YEAR OPTIONS
     
     Tahun tetap unik.
  ======================================================= */

  const yearOptions = useMemo(() => {
    const years = new Set<string>();

    [...detailDivisi, ...bappBulanan, ...gpmData, ...targetData, ...detailCost].forEach((row) => {
      const year = getYear(row.periode_bulan);

      if (year) {
        years.add(year);
      }
    });

    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [detailDivisi, bappBulanan, gpmData, targetData, detailCost]);

  /* =======================================================
     FILTER FUNCTION
     
     selectedMonth = "08"
     selectedYear  = "2025"
     
     Jika hanya bulan:
     semua Agustus dari seluruh tahun.
     
     Jika hanya tahun:
     semua bulan tahun tersebut.
     
     Jika keduanya:
     Agustus 2025.
  ======================================================= */

  function matchesPeriod(periode: string): boolean {
    const month = getMonthNumber(periode);

    const year = getYear(periode);

    if (!month || !year) {
      return false;
    }

    if (selectedMonth && month !== selectedMonth) {
      return false;
    }

    if (selectedYear && year !== selectedYear) {
      return false;
    }

    return true;
  }

  /* =======================================================
     FILTERED DATA
  ======================================================= */

  const filteredDetailDivisi = useMemo(() => detailDivisi.filter((row) => matchesPeriod(row.periode_bulan)), [detailDivisi, selectedMonth, selectedYear]);

  const filteredBapp = useMemo(() => bappBulanan.filter((row) => matchesPeriod(row.periode_bulan)), [bappBulanan, selectedMonth, selectedYear]);

  const filteredGpm = useMemo(() => gpmData.filter((row) => matchesPeriod(row.periode_bulan)), [gpmData, selectedMonth, selectedYear]);

  const filteredTarget = useMemo(() => targetData.filter((row) => matchesPeriod(row.periode_bulan)), [targetData, selectedMonth, selectedYear]);

  const filteredCost = useMemo(() => detailCost.filter((row) => matchesPeriod(row.periode_bulan)), [detailCost, selectedMonth, selectedYear]);

  /* =======================================================
     KPI
  ======================================================= */

  const kpi = useMemo(() => {
    const hasGpmData = filteredGpm.length > 0;

    const hasCostData = filteredCost.length > 0;

    const hasTargetData = filteredTarget.length > 0;

    const hasBappData = filteredBapp.length > 0;

    const revenue = filteredGpm.reduce((sum, row) => sum + toNumber(row.revenue_payroll_bapp), 0);

    const costPayroll = filteredGpm.reduce((sum, row) => sum + toNumber(row.cost_payroll), 0);

    const gpm = revenue - costPayroll;

    const gpmPercentage = revenue !== 0 ? (gpm / revenue) * 100 : 0;

    const operationalCost = filteredCost.reduce((sum, row) => sum + toNumber(row.total), 0);

    const targetSustain = filteredTarget.reduce((sum, row) => sum + toNumber(row.nominal_target_sustain), 0);

    const targetScaling = filteredTarget.reduce((sum, row) => sum + toNumber(row.nominal_target_scaling), 0);

    const realisasiSustain = filteredTarget.reduce((sum, row) => sum + toNumber(row.realisasi_sustain), 0);

    const realisasiScaling = filteredTarget.reduce((sum, row) => sum + toNumber(row.realisasi_scaling), 0);

    const totalTarget = targetSustain + targetScaling;

    const totalRealisasi = realisasiSustain + realisasiScaling;

    const targetAchievement = totalTarget !== 0 ? (totalRealisasi / totalTarget) * 100 : 0;

    const nominalBapp = filteredBapp.reduce((sum, row) => sum + toNumber(row.nominal), 0);

    const jumlahBapp = filteredBapp.reduce((sum, row) => sum + toNumber(row.jumlah_bapp), 0);

    return {
      revenue,
      costPayroll,
      gpmPercentage,
      operationalCost,
      targetAchievement,
      nominalBapp,
      jumlahBapp,

      targetSustain,
      targetScaling,
      realisasiSustain,
      realisasiScaling,

      hasGpmData,
      hasCostData,
      hasTargetData,
      hasBappData,
    };
  }, [filteredGpm, filteredCost, filteredTarget, filteredBapp]);

  /* =======================================================
     TREND
  ======================================================= */

  const trendData = useMemo(() => {
    const map = new Map<
      string,
      {
        label: string;
        sort: number;
        revenue: number;
        cost: number;
        gpmPercentage: number;
      }
    >();

    filteredGpm.forEach((row) => {
      const key = getMonthKey(row.periode_bulan);

      if (!key) {
        return;
      }

      const revenue = toNumber(row.revenue_payroll_bapp);

      const cost = toNumber(row.cost_payroll);

      const existing = map.get(key) ?? {
        label: formatMonth(row.periode_bulan),
        sort: monthSortValue(row.periode_bulan),
        revenue: 0,
        cost: 0,
        gpmPercentage: 0,
      };

      existing.revenue += revenue;

      existing.cost += cost;

      existing.gpmPercentage = existing.revenue !== 0 ? ((existing.revenue - existing.cost) / existing.revenue) * 100 : 0;

      map.set(key, existing);
    });

    return Array.from(map.values()).sort((a, b) => a.sort - b.sort);
  }, [filteredGpm]);

  /* =======================================================
     TARGET
  ======================================================= */

  const targetProgress = useMemo(() => {
    if (filteredTarget.length === 0) {
      return null;
    }

    const sustainTarget = kpi.targetSustain;

    const sustainRealization = kpi.realisasiSustain;

    const scalingTarget = kpi.targetScaling;

    const scalingRealization = kpi.realisasiScaling;

    return {
      sustain: {
        target: sustainTarget,
        realisasi: sustainRealization,
        percentage: sustainTarget !== 0 ? (sustainRealization / sustainTarget) * 100 : 0,
      },

      scaling: {
        target: scalingTarget,
        realisasi: scalingRealization,
        percentage: scalingTarget !== 0 ? (scalingRealization / scalingTarget) * 100 : 0,
      },
    };
  }, [filteredTarget, kpi]);

  /* =======================================================
     COST COMPOSITION
     
     Jika filteredCost kosong:
     return []
     
     sehingga chart tidak menampilkan data
     dari periode lain.
  ======================================================= */

  const costComposition = useMemo(() => {
    if (filteredCost.length === 0) {
      return [];
    }

    const result = [
      {
        name: "Jarkom",
        value: filteredCost.reduce((sum, row) => sum + toNumber(row.beban_jarkom), 0),
      },

      {
        name: "Jasnaker",
        value: filteredCost.reduce((sum, row) => sum + toNumber(row.beban_jasnaker), 0),
      },

      {
        name: "Kerjasama Pihak Ketiga",
        value: filteredCost.reduce((sum, row) => sum + toNumber(row.beban_kerjasama_pihak_ketiga), 0),
      },

      {
        name: "Lain-lain",
        value: filteredCost.reduce((sum, row) => sum + toNumber(row.beban_lain_lain), 0),
      },

      {
        name: "Mandatory Gedung",
        value: filteredCost.reduce((sum, row) => sum + toNumber(row.beban_mandatory_gedung), 0),
      },

      {
        name: "Depresiasi",
        value: filteredCost.reduce((sum, row) => sum + toNumber(row.depresiasi), 0),
      },
    ].filter((item) => item.value !== 0);

    const total = result.reduce((sum, item) => sum + item.value, 0);

    return result
      .sort((a, b) => b.value - a.value)
      .map((item) => ({
        ...item,
        percentage: total !== 0 ? (item.value / total) * 100 : 0,
      }));
  }, [filteredCost]);

  /* =======================================================
     BAPP STATUS
  ======================================================= */

  const bappStatus = useMemo(() => {
    const map = new Map<
      string,
      {
        status: string;
        jumlah: number;
        nominal: number;
      }
    >();

    filteredBapp.forEach((row) => {
      const status = String(row.status_bapp || "Unknown").trim();

      const key = status.toLowerCase();

      const existing = map.get(key) ?? {
        status,
        jumlah: 0,
        nominal: 0,
      };

      existing.jumlah += toNumber(row.jumlah_bapp);

      existing.nominal += toNumber(row.nominal);

      map.set(key, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.jumlah - a.jumlah);
  }, [filteredBapp]);

  const maxBappJumlah = useMemo(() => Math.max(...bappStatus.map((item) => item.jumlah), 1), [bappStatus]);

  /* =======================================================
     OPERATIONAL TABLE
  ======================================================= */

  const operationalRows = useMemo(() => {
    const map = new Map<
      string,
      {
        divisi: string;
        departemen: string;
        layanan: string;
        transaksi: number;
        sdm: number;
        slaTotal: number;
        slaCount: number;
        thp: number;
      }
    >();

    filteredDetailDivisi.forEach((row) => {
      const key = [row.divisi, row.departemen, row.layanan].join("|");

      const existing = map.get(key) ?? {
        divisi: row.divisi || "-",
        departemen: row.departemen || "-",
        layanan: row.layanan || "-",
        transaksi: 0,
        sdm: 0,
        slaTotal: 0,
        slaCount: 0,
        thp: 0,
      };

      existing.transaksi += toNumber(row.jumlah_transaksi);

      existing.sdm += toNumber(row.sdm_diproses);

      existing.slaTotal += normalizeSla(row.sla_tercapai);

      existing.slaCount += 1;

      existing.thp += toNumber(row.total_thp);

      map.set(key, existing);
    });

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        sla: item.slaCount !== 0 ? item.slaTotal / item.slaCount : 0,
      }))
      .sort((a, b) => b.transaksi - a.transaksi);
  }, [filteredDetailDivisi]);

  /* =======================================================
     TREND CHART
  ======================================================= */

  useEffect(() => {
    const element = trendChartRef.current;

    if (!element) {
      return;
    }

    if (trendData.length === 0) {
      if (trendChartInstance.current) {
        trendChartInstance.current.dispose();
        trendChartInstance.current = null;
      }

      element.innerHTML = "";

      return;
    }

    if (trendChartInstance.current) {
      trendChartInstance.current.dispose();
      trendChartInstance.current = null;
    }

    const chart = echarts.init(element);

    trendChartInstance.current = chart;

    chart.setOption({
      animation: true,
      animationDuration: 700,

      tooltip: {
        trigger: "axis",

        backgroundColor: "#122331",

        borderColor: "#284858",

        borderWidth: 1,

        textStyle: {
          color: "#e8f1f5",
          fontSize: 11,
        },

        formatter: (params: any[]) => {
          if (!params?.length) {
            return "";
          }

          const index = params[0].dataIndex;

          const item = trendData[index];

          if (!item) {
            return "";
          }

          return `
            <div style="
              font-weight:700;
              margin-bottom:8px;
              color:#f5fafc;
            ">
              ${item.label}
            </div>

            <div style="
              display:flex;
              justify-content:space-between;
              gap:24px;
              margin:5px 0;
            ">
              <span style="color:#8fa9b6">
                ● Revenue Payroll BAPP
              </span>

              <strong style="color:#f5fafc">
                ${formatRupiah(item.revenue)}
              </strong>
            </div>

            <div style="
              display:flex;
              justify-content:space-between;
              gap:24px;
              margin:5px 0;
            ">
              <span style="color:#8fa9b6">
                ● Cost Payroll
              </span>

              <strong style="color:#f5fafc">
                ${formatRupiah(item.cost)}
              </strong>
            </div>

            <div style="
              display:flex;
              justify-content:space-between;
              gap:24px;
              margin:5px 0;
            ">
              <span style="color:#8fa9b6">
                ● GPM
              </span>

              <strong style="color:#f5fafc">
                ${formatDecimal(item.gpmPercentage)}%
              </strong>
            </div>
          `;
        },
      },

      legend: {
        bottom: 0,
        left: "center",
        itemWidth: 10,
        itemHeight: 6,

        textStyle: {
          color: "#8ea8b5",
          fontSize: 10,
        },
      },

      grid: {
        left: 54,
        right: 48,
        top: 28,
        bottom: 48,
        containLabel: true,
      },

      xAxis: {
        type: "category",
        boundaryGap: true,

        data: trendData.map((item) => item.label),

        axisLine: {
          lineStyle: {
            color: "rgba(126,165,179,.18)",
          },
        },

        axisTick: {
          show: false,
        },

        axisLabel: {
          color: "#7893a1",
          fontSize: 9,
          margin: 12,
          hideOverlap: true,
        },
      },

      yAxis: [
        {
          type: "value",

          axisLabel: {
            color: "#7893a1",
            fontSize: 9,

            formatter: (value: number) => formatAxisRupiah(value),
          },

          splitLine: {
            lineStyle: {
              color: "rgba(126,165,179,.10)",
              type: "dashed",
            },
          },
        },

        {
          type: "value",
          min: 0,

          axisLabel: {
            color: "#7893a1",
            fontSize: 9,

            formatter: (value: number) => `${value}%`,
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
          barMaxWidth: 26,

          data: trendData.map((item) => item.revenue),

          itemStyle: {
            borderRadius: [5, 5, 0, 0],

            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              {
                offset: 0,
                color: "#56b8c7",
              },
              {
                offset: 1,
                color: "#2d7f8c",
              },
            ]),
          },
        },

        {
          name: "Cost Payroll",
          type: "bar",
          yAxisIndex: 0,
          barMaxWidth: 26,

          data: trendData.map((item) => item.cost),

          itemStyle: {
            borderRadius: [5, 5, 0, 0],

            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              {
                offset: 0,
                color: "#e9b84d",
              },
              {
                offset: 1,
                color: "#b98226",
              },
            ]),
          },
        },

        {
          name: "GPM %",
          type: "line",
          yAxisIndex: 1,
          smooth: true,
          symbol: "circle",
          symbolSize: 7,

          data: trendData.map((item) => item.gpmPercentage),

          lineStyle: {
            width: 3,
            color: "#f27d91",

            shadowBlur: 8,
            shadowColor: "rgba(242,125,145,.20)",
          },

          itemStyle: {
            color: "#f27d91",
            borderColor: "#fff4f6",
            borderWidth: 2,
          },
        },
      ],
    });

    const resize = () => {
      chart.resize();
    };

    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);

      chart.dispose();

      if (trendChartInstance.current === chart) {
        trendChartInstance.current = null;
      }
    };
  }, [trendData]);

  /* =======================================================
     RESET
  ======================================================= */

  const hasFilter = Boolean(selectedMonth) || Boolean(selectedYear);

  function resetFilters() {
    setSelectedMonth("");
    setSelectedYear("");
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="app-state app-state-loading">
        <div className="app-spinner-wrapper">
          <div className="app-spinner" />
        </div>

        <div className="app-state-loading-title">Memuat Operational Performance</div>

        <div className="app-state-loading-description">Sedang mengambil data dari database...</div>
      </div>
    );
  }

  /* =======================================================
     ERROR
  ======================================================= */

  if (error) {
    return (
      <div className="app-state app-state-error">
        <div className="app-state-content">
          <div className="app-error-icon">!</div>

          <h2>Gagal Memuat Dashboard</h2>

          <p>{error}</p>

          <button type="button" className="app-retry-button" onClick={() => window.location.reload()}>
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="operational-page">
      {/* ===================================================
          HEADER
      =================================================== */}

      <header className="operational-header">
        <div>
          <div className="operational-title-row">
            <h1>Operational Performance</h1>

            <span className="operational-live">
              <span />
              Data Terhubung
            </span>
          </div>

          <p>Monitoring operational performance, payroll, BAPP, cost, dan target</p>
        </div>
      </header>

      {/* ===================================================
          FILTER
      =================================================== */}

      <section className="operational-filter-card">
        <div className="operational-filter-title">
          <div>
            <span>FILTER DATA</span>

            <h2>Parameter Dashboard</h2>
          </div>

          <button type="button" className={hasFilter ? "operational-reset active" : "operational-reset"} onClick={resetFilters}>
            ↻ Reset Filter
          </button>
        </div>

        <div className="operational-filter-grid">
          {/* BULAN */}

          <div className="operational-filter">
            <label>Bulan</label>

            <select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}>
              <option value="">Semua Bulan</option>

              {monthOptions.map((month) => {
                const date = new Date(2000, Number(month) - 1, 1);

                const monthName = date.toLocaleDateString("id-ID", {
                  month: "long",
                });

                return (
                  <option key={month} value={month}>
                    {monthName}
                  </option>
                );
              })}
            </select>
          </div>

          {/* TAHUN */}

          <div className="operational-filter">
            <label>Tahun</label>

            <select value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)}>
              <option value="">Semua Tahun</option>

              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* ===================================================
          KPI
      =================================================== */}

      <section className="operational-kpi-grid">
        {kpi.hasGpmData && (
          <>
            <article className="operational-kpi-card revenue">
              <span className="kpi-label">Revenue Payroll BAPP</span>

              <strong>{formatRupiah(kpi.revenue)}</strong>

              <small>Revenue Payroll (BAPP)</small>
            </article>

            <article className="operational-kpi-card gpm">
              <span className="kpi-label">GPM</span>

              <strong>{formatDecimal(kpi.gpmPercentage)}%</strong>

              <small>Gross Profit Margin</small>
            </article>

            <article className="operational-kpi-card cost">
              <span className="kpi-label">Cost Payroll</span>

              <strong>{formatRupiah(kpi.costPayroll)}</strong>

              <small>Cost Payroll</small>
            </article>
          </>
        )}

        {kpi.hasCostData && (
          <article className="operational-kpi-card expense">
            <span className="kpi-label">Total Beban Operasional</span>

            <strong>{formatRupiah(kpi.operationalCost)}</strong>

            <small>Detail Cost</small>
          </article>
        )}

        {kpi.hasTargetData && (
          <article className="operational-kpi-card target">
            <span className="kpi-label">Pencapaian Target</span>

            <strong>{formatDecimal(kpi.targetAchievement)}%</strong>

            <small>Sustain + Scaling</small>
          </article>
        )}

        {kpi.hasBappData && (
          <article className="operational-kpi-card bapp">
            <span className="kpi-label">Nominal BAPP</span>

            <strong>{formatRupiah(kpi.nominalBapp)}</strong>

            <small>{formatNumber(kpi.jumlahBapp)} dokumen</small>
          </article>
        )}
      </section>

      {/* ===================================================
          ROW 1
      =================================================== */}

      <section className="operational-main-grid">
        {/* TREND */}

        <article className="operational-card trend-card">
          <div className="card-header">
            <div>
              <span>FINANCIAL PERFORMANCE</span>

              <h3>Trend Revenue vs Cost Payroll dan GPM</h3>
            </div>
          </div>

          <div className="trend-chart-wrapper">{trendData.length > 0 ? <div ref={trendChartRef} className="trend-chart" /> : <div className="operational-empty">Tidak ada data untuk filter yang dipilih.</div>}</div>
        </article>

        {/* TARGET */}

        <article className="operational-card target-card">
          <div className="card-header">
            <div>
              <span>TARGET PERFORMANCE</span>

              <h3>Target vs Realisasi</h3>
            </div>
          </div>

          {targetProgress ? (
            <div className="target-content">
              {/* SUSTAIN */}

              <div className="target-item">
                <div className="target-row">
                  <strong>Sustain</strong>

                  <span>
                    {formatRupiah(targetProgress.sustain.realisasi)} dari {formatRupiah(targetProgress.sustain.target)}
                  </span>
                </div>

                <div className="target-track">
                  <div
                    className="target-fill sustain"
                    style={{
                      width: `${Math.min(targetProgress.sustain.percentage, 100)}%`,
                    }}
                  />
                </div>

                <small>{formatDecimal(targetProgress.sustain.percentage)}% tercapai</small>
              </div>

              {/* SCALING */}

              <div className="target-item">
                <div className="target-row">
                  <strong>Scaling</strong>

                  <span>
                    {formatRupiah(targetProgress.scaling.realisasi)} dari {formatRupiah(targetProgress.scaling.target)}
                  </span>
                </div>

                <div className="target-track">
                  <div
                    className="target-fill scaling"
                    style={{
                      width: `${Math.min(targetProgress.scaling.percentage, 100)}%`,
                    }}
                  />
                </div>

                <small>{formatDecimal(targetProgress.scaling.percentage)}% tercapai</small>
              </div>
            </div>
          ) : (
            <div className="operational-empty">Tidak ada data target untuk filter yang dipilih.</div>
          )}
        </article>
      </section>

      {/* ===================================================
          ROW 2
      =================================================== */}

      <section className="operational-main-grid">
        {/* COST */}

        <article className="operational-card">
          <div className="card-header">
            <div>
              <span>COST ANALYSIS</span>

              <h3>Komposisi Beban</h3>
            </div>
          </div>

          {costComposition.length > 0 ? (
            <div className="cost-content">
              <div className="cost-stacked-bar">
                {costComposition.map((item, index) => (
                  <div
                    key={item.name}
                    className={`cost-segment cost-${index}`}
                    style={{
                      width: `${item.percentage}%`,
                    }}
                    title={`${item.name}: ${formatRupiah(item.value)}`}
                  />
                ))}
              </div>

              <div className="cost-list">
                {costComposition.map((item, index) => (
                  <div className="cost-list-item" key={item.name}>
                    <div className="cost-name">
                      <span className={`cost-dot cost-dot-${index}`} />

                      <span>{item.name}</span>
                    </div>

                    <strong>
                      {formatRupiah(item.value)}
                      {" · "}
                      {formatDecimal(item.percentage)}%
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="operational-empty">Tidak ada data cost untuk filter yang dipilih.</div>
          )}
        </article>

        {/* BAPP */}

        <article className="operational-card">
          <div className="card-header">
            <div>
              <span>BAPP PERFORMANCE</span>

              <h3>Status BAPP</h3>
            </div>
          </div>

          {bappStatus.length > 0 ? (
            <div className="bapp-status-list">
              {bappStatus.map((item, index) => {
                const percentage = (item.jumlah / maxBappJumlah) * 100;

                return (
                  <div className="bapp-status-item" key={item.status}>
                    <div className="bapp-status-top">
                      <span>{item.status}</span>

                      <strong>
                        {formatNumber(item.jumlah)} dokumen · {formatRupiah(item.nominal)}
                      </strong>
                    </div>

                    <div className="bapp-track">
                      <div
                        className={`bapp-fill bapp-color-${index}`}
                        style={{
                          width: `${percentage}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="operational-empty">Tidak ada data BAPP untuk filter yang dipilih.</div>
          )}
        </article>
      </section>

      {/* ===================================================
          OPERATIONAL TABLE
      =================================================== */}

      <section className="operational-card operational-table-card">
        <div className="card-header">
          <div>
            <span>OPERATIONAL PERFORMANCE</span>

            <h3>Kinerja Operasional</h3>
          </div>

          <div className="table-count">
            {formatNumber(Math.min(operationalRows.length, 8))} dari {formatNumber(operationalRows.length)} kombinasi
          </div>
        </div>

        {operationalRows.length > 0 ? (
          <div className="operational-table-wrapper">
            <table className="operational-table">
              <thead>
                <tr>
                  <th>Divisi</th>

                  <th>Departemen / Layanan</th>

                  <th>Transaksi</th>

                  <th>SDM Diproses</th>

                  <th>SLA Tercapai</th>

                  <th>Total THP</th>
                </tr>
              </thead>

              <tbody>
                {operationalRows.slice(0, 8).map((row, index) => (
                  <tr key={`${row.divisi}-${row.departemen}-${row.layanan}-${index}`}>
                    <td>
                      <span className="division-name">{row.divisi}</span>
                    </td>

                    <td>
                      <div className="service-name">
                        <strong>{row.departemen}</strong>

                        <span>{row.layanan}</span>
                      </div>
                    </td>

                    <td className="number-cell">{formatNumber(row.transaksi)}</td>

                    <td className="number-cell">{formatNumber(row.sdm)}</td>

                    <td>
                      <span className={`sla-value ${row.sla >= 95 ? "sla-good" : row.sla >= 90 ? "sla-warning" : "sla-danger"}`}>{formatDecimal(row.sla)}%</span>
                    </td>

                    <td className="number-cell thp-cell">{formatRupiah(row.thp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="operational-empty table-empty">Tidak ada data operational untuk filter yang dipilih.</div>
        )}
      </section>
    </div>
  );
}
