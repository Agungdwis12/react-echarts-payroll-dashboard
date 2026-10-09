import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactECharts from "echarts-for-react";

import { getMasterDetailDivisi } from "../services/dashboardService";

import "./KinerjaLayananDivisi.css";

import SearchableSelect from "../components/dashboard/SearchableSelect";

/* =========================================================
   TYPE
========================================================= */

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

/* =========================================================
   NUMBER FORMAT
========================================================= */

const parseNumber = (value: unknown): number => {
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
};

const PAGE_SIZE = 10;

/* =========================================================
   SLA NORMALIZER
========================================================= */

const normalizeSLA = (value: unknown): number => {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  if (typeof value === "number") {
    let sla = value;

    if (sla >= 0 && sla <= 1) {
      sla *= 100;
    }

    if (sla > 100) {
      sla /= 100;
    }

    return Math.min(Math.max(sla, 0), 100);
  }

  let text = String(value).trim().replace(/\s/g, "");

  if (!text) {
    return 0;
  }

  const hasPercent = text.includes("%");

  text = text.replace("%", "");

  if (text.includes(",") && !text.includes(".")) {
    text = text.replace(",", ".");
  }

  const numericValue = Number(text);

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  let sla = numericValue;

  if (sla >= 0 && sla <= 1 && !hasPercent) {
    sla *= 100;
  }

  if (sla > 100) {
    sla /= 100;
  }

  return Math.min(Math.max(sla, 0), 100);
};

/* =========================================================
   MONTH
========================================================= */

const monthMap: Record<string, number> = {
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

const getMonthTimestamp = (value: string): number => {
  if (!value) {
    return 0;
  }

  const text = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    const date = new Date(text);

    if (!Number.isNaN(date.getTime())) {
      return date.getTime();
    }
  }

  if (/^\d{4}-\d{2}$/.test(text)) {
    const [year, month] = text.split("-").map(Number);

    return new Date(year, month - 1, 1).getTime();
  }

  const parts = text.replace(/-/g, " ").replace(/\//g, " ").split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    const first = parts[0].toLowerCase();

    const second = parts[1].toLowerCase();

    const firstMonth = monthMap[first];

    if (firstMonth !== undefined) {
      let year = Number(parts[1]);

      if (year < 100) {
        year += 2000;
      }

      return new Date(year, firstMonth, 1).getTime();
    }

    const secondMonth = monthMap[second];

    if (secondMonth !== undefined) {
      const year = Number(parts[0]);

      return new Date(year, secondMonth, 1).getTime();
    }
  }

  const fallback = new Date(text);

  return Number.isNaN(fallback.getTime()) ? 0 : fallback.getTime();
};

const formatMonth = (value: string): string => {
  const timestamp = getMonthTimestamp(value);

  if (!timestamp) {
    return value;
  }

  const date = new Date(timestamp);

  return date.toLocaleDateString("id-ID", {
    month: "short",
    year: "numeric",
  });
};

/* =========================================================
   FORMATTERS
========================================================= */

const formatNumber = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(value);

const formatRupiah = (value: number) =>
  `Rp ${new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(value)}`;

const formatCompactRupiah = (value: number) => {
  if (value >= 1_000_000_000_000) {
    return `Rp ${(value / 1_000_000_000_000).toFixed(2)} T`;
  }

  if (value >= 1_000_000_000) {
    return `Rp ${(value / 1_000_000_000).toFixed(2)} M`;
  }

  if (value >= 1_000_000) {
    return `Rp ${(value / 1_000_000).toFixed(2)} Jt`;
  }

  if (value >= 1_000) {
    return `Rp ${(value / 1_000).toFixed(2)} Rb`;
  }

  return formatRupiah(value);
};

/* =========================================================
   GLOBAL MULTI SELECT
   Dipakai untuk Bulan & Tahun
========================================================= */

interface MultiSelectProps {
  value: string[];
  options: string[];
  placeholder?: string;
  searchPlaceholder?: string;
  onChange: (value: string[]) => void;
}

const MultiSelect: React.FC<MultiSelectProps> = ({ value, options, placeholder = "Semua", searchPlaceholder = "Cari...", onChange }) => {
  const [open, setOpen] = useState(false);

  const [search, setSearch] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const filteredOptions = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return options;
    }

    return options.filter((option) => option.toLowerCase().includes(keyword));
  }, [options, search]);

  const toggleOption = (option: string) => {
    if (value.includes(option)) {
      onChange(value.filter((item) => item !== option));
      return;
    }

    onChange([...value, option]);
  };

  const selectAll = () => {
    onChange([...options]);
  };

  const clearAll = () => {
    onChange([]);
  };

  const displayValue = () => {
    if (value.length === 0) {
      return placeholder;
    }

    if (value.length === 1) {
      return value[0];
    }

    return `${value.length} dipilih`;
  };

  return (
    <div ref={wrapperRef} className={`multi-select ${open ? "is-open" : ""}`}>
      {" "}
      <button type="button" className="multi-select-trigger" onClick={() => setOpen((prev) => !prev)}>
        <span className="multi-select-value">{displayValue()}</span>

        <span className="multi-select-arrow" />
      </button>
      {open && (
        <div className="multi-select-dropdown">
          <div className="multi-select-search">
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={searchPlaceholder} autoFocus />
          </div>

          <div className="multi-select-actions">
            <button type="button" onClick={selectAll}>
              Pilih Semua
            </button>

            <button type="button" onClick={clearAll}>
              Hapus Semua
            </button>
          </div>

          <div className="multi-select-options">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const checked = value.includes(option);

                return (
                  <label key={option} className={`multi-select-option ${checked ? "is-selected" : ""}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggleOption(option)} />

                    <span className="multi-select-checkbox">
                      {checked && (
                        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m5 12 4 4L19 6" />
                        </svg>
                      )}
                    </span>

                    <span className="multi-select-label">{option}</span>
                  </label>
                );
              })
            ) : (
              <div className="multi-select-empty">Tidak ada data</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* =========================================================
   COMPONENT
========================================================= */

const KinerjaLayananDivisi: React.FC = () => {
  const [data, setData] = useState<PayrollRow[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  /* =====================================================
       FILTER STATE
    ===================================================== */

  const [divisi, setDivisi] = useState("");

  const [departemen, setDepartemen] = useState("");

  const [layanan, setLayanan] = useState("");

  const [unit, setUnit] = useState("");

  /* MULTI SELECT */
  const [bulan, setBulan] = useState<string[]>([]);

  /* MULTI SELECT */
  const [tahun, setTahun] = useState<string[]>([]);

  /* button nexttable */
  const [currentPage, setCurrentPage] = useState(1);

  /* =====================================================
       LOAD DATA
    ===================================================== */

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError("");

        const result = await getMasterDetailDivisi();

        setData(result || []);
      } catch (err) {
        console.error(err);

        setError("Gagal mengambil data dashboard.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  /* =====================================================
       UNIT SCOPED DATA
    ===================================================== */

  const unitScopedData = useMemo(() => {
    if (!unit) {
      return data;
    }

    return data.filter((item) => item.unit === unit);
  }, [data, unit]);

  /* =====================================================
       DIVISI OPTIONS
    ===================================================== */

  const divisiOptions = useMemo(() => {
    return [...new Set(unitScopedData.map((item) => item.divisi).filter(Boolean))].sort();
  }, [unitScopedData]);

  /* =====================================================
       DEPARTEMEN OPTIONS
    ===================================================== */

  const departemenOptions = useMemo(() => {
    let sourceData = unit ? unitScopedData : data;

    if (divisi) {
      sourceData = sourceData.filter((item) => item.divisi === divisi);
    }

    return [...new Set(sourceData.map((item) => item.departemen).filter(Boolean))].sort();
  }, [data, unit, unitScopedData, divisi]);

  /* =====================================================
       LAYANAN OPTIONS
    ===================================================== */

  const layananOptions = useMemo(() => {
    let sourceData = unit ? unitScopedData : data;

    if (divisi) {
      sourceData = sourceData.filter((item) => item.divisi === divisi);
    }

    if (departemen) {
      sourceData = sourceData.filter((item) => item.departemen === departemen);
    }

    return [...new Set(sourceData.map((item) => item.layanan).filter(Boolean))].sort();
  }, [data, unit, unitScopedData, divisi, departemen]);

  /* =====================================================
       UNIT OPTIONS
    ===================================================== */

  const unitOptions = useMemo(() => {
    return [...new Set(data.map((item) => item.unit).filter(Boolean))].sort();
  }, [data]);

  /* =====================================================
       MONTH OPTIONS
    ===================================================== */

  const monthOptions = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  const monthFilterMap: Record<string, number> = {
    Januari: 1,
    Februari: 2,
    Maret: 3,
    April: 4,
    Mei: 5,
    Juni: 6,
    Juli: 7,
    Agustus: 8,
    September: 9,
    Oktober: 10,
    November: 11,
    Desember: 12,
  };

  /* =====================================================
       YEAR OPTIONS
    ===================================================== */

  const yearOptions = useMemo(() => {
    return [
      ...new Set(
        data
          .map((item) => {
            const timestamp = getMonthTimestamp(item.periode_bulan);

            if (!timestamp) {
              return "";
            }

            return String(new Date(timestamp).getFullYear());
          })
          .filter(Boolean),
      ),
    ].sort((a, b) => Number(a) - Number(b));
  }, [data]);

  /* =====================================================
       FILTERED DATA
       
       Filter:
       Unit
       + Divisi
       + Departemen
       + Layanan
       + Multiple Bulan
       + Multiple Tahun
    ===================================================== */

  const filteredData = useMemo(() => {
    return data
      .filter((item) => {
        const timestamp = getMonthTimestamp(item.periode_bulan);

        const date = timestamp ? new Date(timestamp) : null;

        const itemMonth = date ? date.getMonth() + 1 : null;

        const itemYear = date ? String(date.getFullYear()) : "";

        const monthMatch = bulan.length === 0 || bulan.some((selectedMonth) => monthFilterMap[selectedMonth] === itemMonth);

        const yearMatch = tahun.length === 0 || tahun.includes(itemYear);

        return (!unit || item.unit === unit) && (!divisi || item.divisi === divisi) && (!departemen || item.departemen === departemen) && (!layanan || item.layanan === layanan) && monthMatch && yearMatch;
      })
      .sort((a, b) => getMonthTimestamp(a.periode_bulan) - getMonthTimestamp(b.periode_bulan));
  }, [data, unit, divisi, departemen, layanan, bulan, tahun]);

  /* =================================================
   TABLE PAGINATION
================================================= */

  const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));

  const startIndex = (currentPage - 1) * PAGE_SIZE;

  const paginatedData = filteredData.slice(startIndex, startIndex + PAGE_SIZE);

  const startRow = filteredData.length === 0 ? 0 : startIndex + 1;

  const endRow = Math.min(startIndex + PAGE_SIZE, filteredData.length);

  /* Kembali ke halaman pertama ketika filter berubah */
  useEffect(() => {
    setCurrentPage(1);
  }, [unit, divisi, departemen, layanan, bulan, tahun]);

  /* =====================================================
       KPI
    ===================================================== */

  const totalTransaksi = useMemo(() => filteredData.reduce((sum, item) => sum + parseNumber(item.jumlah_transaksi), 0), [filteredData]);

  const totalLayanan = useMemo(() => new Set(filteredData.map((item) => item.layanan).filter(Boolean)).size, [filteredData]);

  const totalSDM = useMemo(() => filteredData.reduce((sum, item) => sum + parseNumber(item.sdm_diproses), 0), [filteredData]);

  const totalNominal = useMemo(() => filteredData.reduce((sum, item) => sum + parseNumber(item.total_thp), 0), [filteredData]);

  /* =====================================================
       MONTHLY DATA
    ===================================================== */

  const monthlyData = useMemo(() => {
    const map = new Map<
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

      if (!map.has(key)) {
        map.set(key, {
          transaksi: 0,
          sdm: 0,
          nominal: 0,
          slaTotal: 0,
          slaCount: 0,
        });
      }

      const current = map.get(key)!;

      current.transaksi += parseNumber(item.jumlah_transaksi);

      current.sdm += parseNumber(item.sdm_diproses);

      current.nominal += parseNumber(item.total_thp);

      const sla = normalizeSLA(item.sla_tercapai);

      current.slaTotal += sla;

      current.slaCount += 1;
    });

    return [...map.entries()]
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

  /* =====================================================
       NOMINAL PER LAYANAN
    ===================================================== */

  const nominalByLayanan = useMemo(() => {
    const map = new Map<string, number>();

    filteredData.forEach((item) => {
      const name = item.layanan || "Lainnya";

      map.set(name, (map.get(name) || 0) + parseNumber(item.total_thp));
    });

    const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);

    const top8 = sorted.slice(0, 8);

    const otherTotal = sorted.slice(8).reduce((sum, [, value]) => sum + value, 0);

    const result = top8.map(([name, value]) => ({
      name,
      value,
    }));

    if (otherTotal > 0) {
      result.push({
        name: "Lainnya",
        value: otherTotal,
      });
    }

    return result;
  }, [filteredData]);

  /* =====================================================
       RESET FILTER
    ===================================================== */

  const resetFilter = () => {
    setUnit("");
    setDivisi("");
    setDepartemen("");
    setLayanan("");
    setBulan([]);
    setTahun([]);
  };

  /* =====================================================
       CHART - TRANSACTION
    ===================================================== */

  const transactionChartOption = useMemo(
    () => ({
      animation: true,
      animationDuration: 700,
      animationEasing: "cubicOut",

      tooltip: {
        trigger: "axis",

        axisPointer: {
          type: "shadow",

          shadowStyle: {
            color: "rgba(91, 141, 239, 0.08)",
          },
        },

        backgroundColor: "#202f42",

        borderColor: "rgba(255,255,255,0.12)",

        borderWidth: 1,

        textStyle: {
          color: "#eef4fa",
          fontSize: 10,
        },

        extraCssText: "box-shadow: 0 12px 30px rgba(0,0,0,.35); border-radius: 8px;",

        valueFormatter: (value: number) => formatNumber(value),
      },

      grid: {
        left: 58,
        right: 20,
        top: 25,
        bottom: 58,
        containLabel: true,
      },

      xAxis: {
        type: "category",

        data: monthlyData.map((item) => item.label),

        axisLine: {
          show: true,

          lineStyle: {
            color: "rgba(255,255,255,0.16)",
          },
        },

        axisTick: {
          show: false,
        },

        axisLabel: {
          interval: 0,
          rotate: 35,
          fontSize: 9,
          fontWeight: 500,
          color: "#b8c6d6",
          margin: 10,
        },

        splitLine: {
          show: false,
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
          fontWeight: 500,
          color: "#b8c6d6",

          formatter: (value: number) => {
            if (value >= 1_000_000) {
              return `${(value / 1_000_000).toFixed(1)} jt`;
            }

            if (value >= 1_000) {
              return `${Math.round(value / 1_000)} rb`;
            }

            return value;
          },
        },

        splitLine: {
          show: true,

          lineStyle: {
            color: "rgba(255,255,255,0.08)",
            width: 1,
            type: "solid",
          },
        },
      },

      series: [
        {
          name: "Jumlah Transaksi",
          type: "bar",

          data: monthlyData.map((item) => item.transaksi),

          barMaxWidth: 30,
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
                {
                  offset: 0,
                  color: "#78adf8",
                },
                {
                  offset: 0.45,
                  color: "#4f8edc",
                },
                {
                  offset: 1,
                  color: "#2868bd",
                },
              ],
            },

            shadowBlur: 8,

            shadowColor: "rgba(79,142,220,0.20)",
          },

          emphasis: {
            focus: "series",

            itemStyle: {
              shadowBlur: 16,

              shadowColor: "rgba(91,141,239,0.35)",

              color: {
                type: "linear",

                x: 0,
                y: 0,
                x2: 0,
                y2: 1,

                colorStops: [
                  {
                    offset: 0,
                    color: "#9ac2ff",
                  },
                  {
                    offset: 1,
                    color: "#3f7fd4",
                  },
                ],
              },
            },
          },

          label: {
            show: false,
          },
        },
      ],
    }),
    [monthlyData],
  );

  /* =====================================================
       CHART - SDM
    ===================================================== */

  const sdmChartOption = useMemo(
    () => ({
      animation: true,
      animationDuration: 750,
      animationEasing: "cubicOut",

      tooltip: {
        trigger: "axis",

        axisPointer: {
          type: "shadow",

          shadowStyle: {
            color: "rgba(85,184,196,0.08)",
          },
        },

        backgroundColor: "#202f42",

        borderColor: "rgba(255,255,255,0.12)",

        borderWidth: 1,

        textStyle: {
          color: "#eef4fa",
          fontSize: 10,
        },

        extraCssText: "box-shadow: 0 12px 30px rgba(0,0,0,.35); border-radius: 8px;",

        valueFormatter: (value: number) => formatNumber(value),
      },

      grid: {
        left: 58,
        right: 20,
        top: 25,
        bottom: 58,
        containLabel: true,
      },

      xAxis: {
        type: "category",

        data: monthlyData.map((item) => item.label),

        axisLine: {
          show: true,

          lineStyle: {
            color: "rgba(255,255,255,0.16)",
          },
        },

        axisTick: {
          show: false,
        },

        axisLabel: {
          interval: 0,
          rotate: 35,
          fontSize: 9,
          fontWeight: 500,
          color: "#b8c6d6",
          margin: 10,
        },

        splitLine: {
          show: false,
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
          fontWeight: 500,
          color: "#b8c6d6",

          formatter: (value: number) => {
            if (value >= 1_000_000) {
              return `${(value / 1_000_000).toFixed(1)} jt`;
            }

            if (value >= 1_000) {
              return `${Math.round(value / 1_000)} rb`;
            }

            return value;
          },
        },

        splitLine: {
          show: true,

          lineStyle: {
            color: "rgba(255,255,255,0.08)",
            width: 1,
            type: "solid",
          },
        },
      },

      series: [
        {
          name: "SDM Diproses",

          type: "bar",

          data: monthlyData.map((item) => item.sdm),

          barMaxWidth: 30,
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
                {
                  offset: 0,
                  color: "#79d8df",
                },
                {
                  offset: 0.45,
                  color: "#55b8c4",
                },
                {
                  offset: 1,
                  color: "#278d99",
                },
              ],
            },

            shadowBlur: 8,

            shadowColor: "rgba(85,184,196,0.20)",
          },

          emphasis: {
            focus: "series",

            itemStyle: {
              shadowBlur: 16,

              shadowColor: "rgba(85,184,196,0.35)",

              color: {
                type: "linear",

                x: 0,
                y: 0,
                x2: 0,
                y2: 1,

                colorStops: [
                  {
                    offset: 0,
                    color: "#9be7ec",
                  },
                  {
                    offset: 1,
                    color: "#3ea7b3",
                  },
                ],
              },
            },
          },

          label: {
            show: false,
          },
        },
      ],
    }),
    [monthlyData],
  );

  /* =====================================================
       CHART - NOMINAL
    ===================================================== */

  const nominalChartOption = useMemo(() => {
    const chartData = nominalByLayanan.slice().reverse();

    return {
      animation: true,
      animationDuration: 800,
      animationEasing: "cubicOut",

      tooltip: {
        trigger: "axis",

        axisPointer: {
          type: "shadow",

          shadowStyle: {
            color: "rgba(85,185,133,0.08)",
          },
        },

        backgroundColor: "#202f42",

        borderColor: "rgba(255,255,255,0.12)",

        borderWidth: 1,

        textStyle: {
          color: "#eef4fa",
          fontSize: 10,
        },

        extraCssText: "box-shadow: 0 12px 30px rgba(0,0,0,.35); border-radius: 8px;",

        formatter: (params: any) => {
          const item = params?.[0];

          if (!item) {
            return "";
          }

          return `
                <div style="color:#aebdce;font-size:10px;margin-bottom:5px;">
                  ${item.name}
                </div>
                <div style="color:#f1f5f9;font-size:12px;font-weight:700;">
                  ${formatRupiah(item.value)}
                </div>
              `;
        },
      },

      grid: {
        left: 58,
        right: 20,
        top: 25,
        bottom: 58,
        containLabel: true,
      },

      xAxis: {
        type: "value",

        axisLine: {
          show: false,
        },

        axisTick: {
          show: false,
        },

        axisLabel: {
          fontSize: 9,
          fontWeight: 500,
          color: "#b8c6d6",

          formatter: (value: number) => {
            if (value >= 1_000_000_000_000) {
              return `${(value / 1_000_000_000_000).toFixed(1)} T`;
            }

            if (value >= 1_000_000_000) {
              return `${(value / 1_000_000_000).toFixed(0)} M`;
            }

            if (value >= 1_000_000) {
              return `${(value / 1_000_000).toFixed(0)} Jt`;
            }

            if (value >= 1_000) {
              return `${(value / 1_000).toFixed(0)} Rb`;
            }

            return value;
          },
        },

        splitLine: {
          show: true,

          lineStyle: {
            color: "rgba(255,255,255,0.08)",
            width: 1,
            type: "solid",
          },
        },
      },

      yAxis: {
        type: "category",

        data: chartData.map((item) => item.name),

        axisLine: {
          show: false,
        },

        axisTick: {
          show: false,
        },

        axisLabel: {
          fontSize: 9,
          fontWeight: 500,
          color: "#c0ccda",

          width: 100,

          overflow: "truncate",

          formatter: (value: string) => (value.length > 18 ? `${value.substring(0, 18)}...` : value),
        },
      },

      series: [
        {
          name: "Nominal",

          type: "bar",

          data: chartData.map((item) => item.value),

          barMaxWidth: 18,
          barMinHeight: 4,

          itemStyle: {
            borderRadius: [0, 7, 7, 0],

            color: {
              type: "linear",

              x: 0,
              y: 0,
              x2: 1,
              y2: 0,

              colorStops: [
                {
                  offset: 0,
                  color: "#287a55",
                },
                {
                  offset: 0.5,
                  color: "#55b985",
                },
                {
                  offset: 1,
                  color: "#8bd6ae",
                },
              ],
            },

            shadowBlur: 8,

            shadowColor: "rgba(85,185,133,0.20)",
          },

          emphasis: {
            focus: "series",

            itemStyle: {
              shadowBlur: 16,

              shadowColor: "rgba(85,185,133,0.35)",

              color: {
                type: "linear",

                x: 0,
                y: 0,
                x2: 1,
                y2: 0,

                colorStops: [
                  {
                    offset: 0,
                    color: "#37946a",
                  },
                  {
                    offset: 1,
                    color: "#9ae0b8",
                  },
                ],
              },
            },
          },

          label: {
            show: true,

            position: "right",

            color: "#b9c9d9",

            fontSize: 8,

            fontWeight: 600,

            formatter: (params: any) => {
              const value = Number(params.value);

              if (value >= 1_000_000_000_000) {
                return `Rp ${(value / 1_000_000_000_000).toFixed(1)} T`;
              }

              if (value >= 1_000_000_000) {
                return `Rp ${(value / 1_000_000_000).toFixed(0)} M`;
              }

              if (value >= 1_000_000) {
                return `Rp ${(value / 1_000_000).toFixed(0)} Jt`;
              }

              if (value >= 1_000) {
                return `Rp ${(value / 1_000).toFixed(0)} Rb`;
              }

              return `Rp ${value.toLocaleString("id-ID")}`;
            },
          },
        },
      ],
    };
  }, [nominalByLayanan]);

  /* =====================================================
       CHART - SLA
    ===================================================== */

  const slaChartOption = useMemo(
    () => ({
      animation: true,

      animationDuration: 750,

      animationEasing: "cubicOut",

      tooltip: {
        trigger: "axis",

        axisPointer: {
          type: "shadow",

          shadowStyle: {
            color: "rgba(217,164,65,0.08)",
          },
        },

        backgroundColor: "#202f42",

        borderColor: "rgba(255,255,255,0.12)",

        borderWidth: 1,

        textStyle: {
          color: "#eef4fa",
          fontSize: 10,
        },

        extraCssText: "box-shadow: 0 12px 30px rgba(0,0,0,.35); border-radius: 8px;",

        valueFormatter: (value: number) => `${Math.round(value)}%`,
      },

      grid: {
        left: 58,
        right: 20,
        top: 25,
        bottom: 58,
        containLabel: true,
      },

      xAxis: {
        type: "category",

        data: monthlyData.map((item) => item.label),

        axisLine: {
          show: true,

          lineStyle: {
            color: "rgba(255,255,255,0.16)",
          },
        },

        axisTick: {
          show: false,
        },

        axisLabel: {
          interval: 0,
          rotate: 35,
          fontSize: 9,
          fontWeight: 500,
          color: "#b8c6d6",
          margin: 10,
        },

        splitLine: {
          show: false,
        },
      },

      yAxis: {
        type: "value",

        min: 0,

        max: 100,

        interval: 20,

        axisLine: {
          show: false,
        },

        axisTick: {
          show: false,
        },

        axisLabel: {
          fontSize: 9,
          fontWeight: 600,
          color: "#b8c6d6",

          formatter: (value: number) => `${value}%`,
        },

        splitLine: {
          show: true,

          lineStyle: {
            color: "rgba(255,255,255,0.08)",
            width: 1,
            type: "solid",
          },
        },
      },

      series: [
        {
          name: "SLA Tercapai",

          type: "bar",

          data: monthlyData.map((item) => Math.min(Math.max(Math.round(item.sla), 0), 100)),

          barMaxWidth: 29,

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
                {
                  offset: 0,
                  color: "#f1c66d",
                },
                {
                  offset: 0.45,
                  color: "#d9a441",
                },
                {
                  offset: 1,
                  color: "#a87925",
                },
              ],
            },

            shadowBlur: 8,

            shadowColor: "rgba(217,164,65,0.20)",
          },

          emphasis: {
            focus: "series",

            itemStyle: {
              shadowBlur: 16,

              shadowColor: "rgba(217,164,65,0.35)",

              color: {
                type: "linear",

                x: 0,
                y: 0,
                x2: 0,
                y2: 1,

                colorStops: [
                  {
                    offset: 0,
                    color: "#f7d88f",
                  },
                  {
                    offset: 1,
                    color: "#d9a441",
                  },
                ],
              },
            },
          },

          label: {
            show: false,
          },
        },
      ],
    }),
    [monthlyData],
  );

  /* =====================================================
       RENDER
    ===================================================== */

  if (loading) {
    return (
      <div className="app-state app-state-loading">
        <div className="app-spinner" />

        <span>Memuat data Payroll...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-state app-state-error">
        <div className="app-state-content">
          <h2>Gagal Memuat Dashboard Payroll</h2>

          <p>{error}</p>

          <button type="button" className="app-retry-button" onClick={() => window.location.reload()}>
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="payroll-page">
      {/* =================================================
             HEADER
        ================================================= */}
      <header className="bapp-header">
        <div className="bapp-header-copy">
          <div className="bapp-title-row">
            <h1>Dashboard Kinerja Layanan Divisi</h1>

            <span className="bapp-live-badge">
              <span className="bapp-live-dot" />
              Data Terhubung
            </span>
          </div>

          <p>Monitoring kinerja layanan berdasarkan divisi</p>

          <span className="bapp-source">
            Sumber data: <strong>master_detail_divisi</strong>
          </span>
        </div>
      </header>
      {/* =================================================
             FILTER
        ================================================= */}
      <section className="payroll-filter-card">
        <div className="bapp-filter-heading">
          <div>
            <span className="bapp-section-kicker">FILTER DATA</span>

            <h2>Parameter Dashboard</h2>
          </div>

          <button type="button" className="reset-filter" onClick={resetFilter}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />
              <path d="M3 21v-5h5" />
            </svg>

            <span>Reset Filter</span>
          </button>
        </div>

        <div className="filter-grid">
          {/* UNIT */}

          <div className="filter-field">
            <label>Unit</label>

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

          {/* DIVISI */}

          <div className="filter-field">
            <label>Divisi</label>

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

          {/* DEPARTEMEN */}

          <div className="filter-field">
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

          {/* LAYANAN */}

          <div className="filter-field">
            <label>Layanan</label>

            <SearchableSelect value={layanan} options={layananOptions} placeholder="Semua Layanan" searchPlaceholder="Cari layanan..." onChange={setLayanan} />
          </div>

          {/* BULAN MULTI */}

          <div className="filter-field">
            <label>Bulan</label>

            <MultiSelect value={bulan} options={monthOptions} placeholder="Semua Bulan" searchPlaceholder="Cari bulan..." onChange={setBulan} />
          </div>

          {/* TAHUN MULTI */}

          <div className="filter-field">
            <label>Tahun</label>

            <MultiSelect value={tahun} options={yearOptions} placeholder="Semua Tahun" searchPlaceholder="Cari tahun..." onChange={setTahun} />
          </div>
        </div>
      </section>
      {/* =================================================
             KPI
        ================================================= */}
      <section className="kpi-grid">
        <div className="kpi-card kpi-blue">
          <div className="kpi-icon">▦</div>

          <div className="kpi-content">
            <span>Jumlah Transaksi</span>

            <strong>{formatNumber(totalTransaksi)}</strong>
          </div>
        </div>

        <div className="kpi-card kpi-cyan">
          <div className="kpi-icon">▤</div>

          <div className="kpi-content">
            <span>Jumlah Layanan</span>

            <strong>{formatNumber(totalLayanan)}</strong>
          </div>
        </div>

        <div className="kpi-card kpi-green">
          <div className="kpi-icon">♟</div>

          <div className="kpi-content">
            <span>Jumlah SDM Diproses</span>

            <strong>{formatNumber(totalSDM)}</strong>
          </div>
        </div>

        <div className="kpi-card kpi-orange">
          <div className="kpi-icon">Rp</div>

          <div className="kpi-content">
            <span>Total Nominal</span>

            <strong>{formatCompactRupiah(totalNominal)}</strong>
          </div>
        </div>
      </section>
      {/* =================================================
             CHARTS
        ================================================= */}
      <section className="chart-grid">
        {/* TRANSACTION */}

        <div className="chart-card chart-blue">
          <div className="chart-header">
            <h3>Tren Jumlah Transaksi per Bulan</h3>
          </div>

          <div className="chart-body">
            {monthlyData.length > 0 ? (
              <ReactECharts
                option={transactionChartOption}
                style={{
                  width: "100%",
                  height: "100%",
                }}
                notMerge
                lazyUpdate
              />
            ) : (
              <div className="empty-chart">Tidak ada data transaksi</div>
            )}
          </div>
        </div>

        {/* SDM */}

        <div className="chart-card chart-cyan">
          <div className="chart-header">
            <h3>Tren SDM Diproses per Bulan</h3>
          </div>

          <div className="chart-body">
            {monthlyData.length > 0 ? (
              <ReactECharts
                option={sdmChartOption}
                style={{
                  width: "100%",
                  height: "100%",
                }}
                notMerge
                lazyUpdate
              />
            ) : (
              <div className="empty-chart">Tidak ada data SDM</div>
            )}
          </div>
        </div>

        {/* NOMINAL */}

        <div className="chart-card chart-green">
          <div className="chart-header">
            <h3>Total Nominal per Layanan (Rp)</h3>
          </div>

          <div className="chart-body">
            {nominalByLayanan.length > 0 ? (
              <ReactECharts
                option={nominalChartOption}
                style={{
                  width: "100%",
                  height: "100%",
                }}
                notMerge
                lazyUpdate
              />
            ) : (
              <div className="empty-chart">Tidak ada data nominal</div>
            )}
          </div>
        </div>

        {/* SLA */}

        <div className="chart-card chart-orange">
          <div className="chart-header">
            <h3>Pencapaian SLA per Bulan (%)</h3>
          </div>

          <div className="chart-body">
            {monthlyData.length > 0 ? (
              <ReactECharts
                option={slaChartOption}
                style={{
                  width: "100%",
                  height: "100%",
                }}
                notMerge
                lazyUpdate
              />
            ) : (
              <div className="empty-chart">Tidak ada data SLA</div>
            )}
          </div>
        </div>
      </section>
      {/* =================================================
             TABLE
        ================================================= */}
      {/* =================================================
    TABLE
================================================= */}
      <section className="table-card">
        <div className="table-header">
          <div>
            <h3>Detail Kinerja Layanan</h3>

            <span>
              Menampilkan {formatNumber(startRow)}–{formatNumber(endRow)} dari {formatNumber(filteredData.length)} data
            </span>
          </div>

          <div className="table-total">
            Total Nominal: <strong>{formatRupiah(totalNominal)}</strong>
          </div>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>No.</th>
                <th>Bulan</th>
                <th>Divisi</th>
                <th>Departemen</th>
                <th>Layanan</th>
                <th>Jumlah Transaksi</th>
                <th>SDM Diproses</th>
                <th>SLA Tercapai</th>
                <th>Total Nominal</th>
              </tr>
            </thead>

            <tbody>
              {paginatedData.length > 0 ? (
                paginatedData.map((item, index) => {
                  const sla = normalizeSLA(item.sla_tercapai);
                  const rowNumber = startIndex + index + 1;

                  return (
                    <tr key={item.id}>
                      <td className="number-cell">{rowNumber}.</td>

                      <td>{formatMonth(item.periode_bulan)}</td>

                      <td>{item.divisi || "-"}</td>

                      <td>{item.departemen || "-"}</td>

                      <td>
                        <span className="service-badge">{item.layanan || "-"}</span>
                      </td>

                      <td className="numeric-cell">{formatNumber(parseNumber(item.jumlah_transaksi))}</td>

                      <td className="numeric-cell">{formatNumber(parseNumber(item.sdm_diproses))}</td>

                      <td>
                        <span className={`sla-badge ${sla >= 98 ? "sla-good" : sla >= 90 ? "sla-warning" : "sla-danger"}`}>{Math.round(sla)}%</span>
                      </td>

                      <td className="nominal">{formatRupiah(parseNumber(item.total_thp))}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="empty-table">
                    Tidak ada data yang sesuai dengan filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {filteredData.length > 0 && (
          <div className="table-pagination">
            <button type="button" className="pagination-button" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => page - 1)}>
              ← Sebelumnya
            </button>

            <span className="pagination-info">
              Halaman {currentPage} dari {totalPages}
            </span>

            <button type="button" className="pagination-button" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((page) => page + 1)}>
              Berikutnya →
            </button>
          </div>
        )}
      </section>{" "}
    </div>
  );
};

export default KinerjaLayananDivisi;
