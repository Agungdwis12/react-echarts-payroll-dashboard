import { useCallback, useEffect, useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Trophy, AlertTriangle, Target, RefreshCw, Search, Download,  Crown, Users, Clock3, Award, UserCheck, XCircle } from "lucide-react";

import { getPerformanceAssessment, getPerformanceUnit, getPerformancePeriod } from "../services/dashboardService";

import FilterDropdown from "../components/dashboard/FilterDropdown";

import * as XLSX from "xlsx-js-style";// =========================================================
// TYPES
// =========================================================

type PerformanceAssessment = {
  input_id?: number;
  employee_id?: number | string;
  employee_name: string;
  image_url?: string | null;
  position?: string;
  unit_name: string;
  period_month: string;

  score_lateness: number;
  score_attendance: number;
  score_attitude: number;
  score_sla: number;
  score_payroll_accuracy: number;
  score_additional_work: number;

  lateness?: number | string;
  attendance?: number | string;
  attitude?: number | string;
  sla?: number | string;
  late_frequency?: number | string;
  attendance_days?: number | string;
  attitude_score?: number | string;
  total_sla_jobs?: number | string;
  completed_on_time?: number | string;
  total_payroll_processed?: number | string;
  incorrect_payroll?: number | string;
  additional_jobs?: number | string;

  discipline_subtotal: number;
  productivity_subtotal: number;
  final_score: number;
  predicate: string;
  ranking: number;
};

type PerformanceUnit = {
  period_month: string;
  unit_name: string;
  jumlah_karyawan: number;

  score_lateness: number;
  score_attendance: number;
  score_attitude: number;
  score_sla: number;
  score_payroll_accuracy: number;
  score_additional_work: number;

  discipline_subtotal: number;
  productivity_subtotal: number;
  final_score: number;
  predicate: string;

  jumlah_sangat_baik: number;
  jumlah_baik: number;
  jumlah_cukup: number;
  jumlah_kurang: number;
  is_total: boolean;
};

type PerformancePeriod = {
  period_month: string;
  jumlah_data: number;
  nilai_akhir_tim: number;
  nilai_akhir_unit_a: number;
  nilai_akhir_unit_b: number;
  nilai_akhir_unit_c: number;
};

type ParameterKey = "lateness" | "attendance" | "attitude" | "sla" | "payroll_accuracy" | "additional_work";

type Parameter = {
  key: ParameterKey;
  label: string;
  shortLabel: string;
  weight: number;
  scoreKey: ScoreKey;
  rawKey: keyof PerformanceAssessment;
};

type ScoreKey = "score_lateness" | "score_attendance" | "score_attitude" | "score_sla" | "score_payroll_accuracy" | "score_additional_work";


type EmployeeAvatarProps = {
  name: string;
  imageUrl?: string | null;
  className?: string;
  style?: React.CSSProperties;
};

function EmployeeAvatar({ name, imageUrl, className = "", style }: EmployeeAvatarProps) {
  return (
    <div className={`relative flex shrink-0 items-center justify-center overflow-hidden bg-[#087F68] text-xs font-bold text-white ${className}`} style={style}>
      {imageUrl && (
        <img
          src={imageUrl}
          alt={`Foto ${name}`}
          className="absolute inset-0 h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      )}

      <span>{getInitials(name)}</span>
    </div>
  );
}


// =========================================================
// CONSTANTS
// =========================================================

const PARAMETERS: Parameter[] = [
  {
    key: "lateness",
    label: "Keterlambatan",
    shortLabel: "Keterlambatan",
    weight: 20,
    scoreKey: "score_lateness",
    rawKey: "late_frequency",
  },
  {
    key: "attendance",
    label: "Kehadiran",
    shortLabel: "Kehadiran",
    weight: 20,
    scoreKey: "score_attendance",
    rawKey: "attendance_days",
  },
  {
    key: "attitude",
    label: "Attitude",
    shortLabel: "Attitude",
    weight: 10,
    scoreKey: "score_attitude",
    rawKey: "attitude_score",
  },
  {
    key: "sla",
    label: "SLA Tepat Waktu",
    shortLabel: "SLA",
    weight: 20,
    scoreKey: "score_sla",
    rawKey: "completed_on_time",
  },
  {
    key: "payroll_accuracy",
    label: "Akurasi Payroll",
    shortLabel: "Akurasi Payroll",
    weight: 20,
    scoreKey: "score_payroll_accuracy",
    rawKey: "incorrect_payroll",
  },
  {
    key: "additional_work",
    label: "Tugas Tambahan",
    shortLabel: "Tugas Tambahan",
    weight: 10,
    scoreKey: "score_additional_work",
    rawKey: "additional_jobs",
  },
];

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

// =========================================================
// HELPERS
// =========================================================

const toNumber = (value: unknown): number => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const toPercent = (value: unknown): number => {
  const number = toNumber(value);
  return Math.abs(number) <= 1 ? number * 100 : number;
};

const formatPercent = (value: unknown): string => `${toPercent(value).toFixed(2).replace(".", ",")}%`;

const formatMonth = (value: string): string => {
  if (!value) return "-";

  // ISO timestamp (contoh: 2026-09-30T17:00:00.000Z) dikonversi
  // ke waktu lokal browser agar tanggal UTC+7 tidak bergeser ke bulan sebelumnya.
  const date = value.includes("T") ? new Date(value) : new Date(`${value.slice(0, 10)}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
};

const formatRawValue = (key: ParameterKey, employee: PerformanceAssessment): string => {
  switch (key) {
    case "lateness":
      return `${toNumber(employee.late_frequency)}× telat`;
    case "attendance":
      return `${toNumber(employee.attendance_days)} hari`;
    case "attitude":
      return `${formatPercent(employee.attitude_score)} atasan`;
    case "sla":
      return `${toNumber(employee.completed_on_time)}/${toNumber(employee.total_sla_jobs)} tepat`;
    case "payroll_accuracy":
      return `${toNumber(employee.incorrect_payroll)} salah`;
    case "additional_work":
      return `${toNumber(employee.additional_jobs)} tugas`;
    default:
      return "-";
  }
};

const getScoreColor = (score: number) => {
  if (score >= 90) {
    return {
      background: "#DDF3EC",
      text: "#087F68",
      label: "Sangat Baik",
    };
  }

  if (score >= 80) {
    return {
      background: "#DCE8F8",
      text: "#245B9B",
      label: "Baik",
    };
  }

  if (score >= 70) {
    return {
      background: "#FFF0D6",
      text: "#A66A13",
      label: "Cukup",
    };
  }

  return {
    background: "#F9DEDE",
    text: "#B83232",
    label: "Kurang",
  };
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const getPreviousPeriod = (period: string): string => {
  const [year, month] = period.split("-").map(Number);
  const date = new Date(year, month - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

// =========================================================
// MAIN COMPONENT
// =========================================================

function TeamPerformance() {
  const [selectedUnit, setSelectedUnit] = useState("All Units");
  const [selectedMonth, setSelectedMonth] = useState("All");
  const [selectedYear, setSelectedYear] = useState("All");

  const [unitDropdownOpen, setUnitDropdownOpen] = useState(false);
  const [monthDropdownOpen, setMonthDropdownOpen] = useState(false);
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<PerformanceAssessment | null>(null);
  const [search, setSearch] = useState("");

  const [assessments, setAssessments] = useState<PerformanceAssessment[]>([]);
  const [previousAssessments, setPreviousAssessments] = useState<PerformanceAssessment[]>([]);
  const [units, setUnits] = useState<PerformanceUnit[]>([]);
  const [periods, setPeriods] = useState<PerformancePeriod[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =======================================================
  // FETCH API DATA
  // =======================================================

  const fetchPerformanceData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const periodData = await getPerformancePeriod();
      const safePeriodData: PerformancePeriod[] = Array.isArray(periodData) ? periodData : [];
      setPeriods(safePeriodData);

      const availablePeriods = [...new Set(safePeriodData.map((item) => item.period_month?.slice(0, 7)).filter((period): period is string => Boolean(period)))].sort((a, b) => b.localeCompare(a));

      const matchingPeriods = availablePeriods.filter((period) => {
        const [year, month] = period.split("-");
        return (selectedYear === "All" || year === selectedYear) && (selectedMonth === "All" || month === selectedMonth);
      });

      const periodsToFetch = matchingPeriods;

      if (!periodsToFetch.length) {
        setAssessments([]);
        setPreviousAssessments([]);
        setUnits([]);
        setSelectedEmployee(null);
        return;
      }

      const results: {
        assessments: PerformanceAssessment[];
        units: PerformanceUnit[];
      }[] = [];

      const batchSize = 2;

      for (let i = 0; i < periodsToFetch.length; i += batchSize) {
        const batch = periodsToFetch.slice(i, i + batchSize);

        const batchResults = await Promise.all(
          batch.map(async (period) => {
            const [assessmentData, unitData] = await Promise.all([getPerformanceAssessment(period), getPerformanceUnit(period)]);

            return {
              assessments: Array.isArray(assessmentData) ? (assessmentData as PerformanceAssessment[]) : [],
              units: Array.isArray(unitData) ? (unitData as PerformanceUnit[]) : [],
            };
          }),
        );

        results.push(...batchResults);
      }

      const allAssessments = results.flatMap((result) => result.assessments);

      // Agregasi data PIC lintas periode:
      // - skor dan final_score dirata-ratakan per PIC
      // - data aktual dijumlahkan per PIC
      const groupedAssessments = new Map<string, PerformanceAssessment[]>();
      allAssessments.forEach((employee) => {
        const key = `${employee.employee_name.trim().toLowerCase()}_${employee.unit_name}`;
        const rows = groupedAssessments.get(key) ?? [];
        rows.push(employee);
        groupedAssessments.set(key, rows);
      });

      const scoreKeys: ScoreKey[] = ["score_lateness", "score_attendance", "score_attitude", "score_sla", "score_payroll_accuracy", "score_additional_work"];

      const aggregatedAssessments: PerformanceAssessment[] = Array.from(groupedAssessments.values())
        .map((rows) => {
          const first = rows[0];
          const average = (key: keyof PerformanceAssessment) => rows.reduce((sum, row) => sum + toNumber(row[key]), 0) / rows.length;
          const total = (key: keyof PerformanceAssessment) => rows.reduce((sum, row) => sum + toNumber(row[key]), 0);
          const finalScore = average("final_score");

          return {
            ...first,
            ...Object.fromEntries(scoreKeys.map((key) => [key, average(key)])),
            discipline_subtotal: average("discipline_subtotal"),
            productivity_subtotal: average("productivity_subtotal"),
            final_score: finalScore,
            late_frequency: total("late_frequency"),
            attendance_days: total("attendance_days"),
            completed_on_time: rows.every((row) => row.completed_on_time !== null && row.completed_on_time !== undefined) ? total("completed_on_time") : undefined,
            total_sla_jobs: rows.every((row) => row.total_sla_jobs !== null && row.total_sla_jobs !== undefined) ? total("total_sla_jobs") : undefined,
            incorrect_payroll: total("incorrect_payroll"),
            total_payroll_processed: total("total_payroll_processed"),
            additional_jobs: total("additional_jobs"),
            attitude_score: average("attitude_score"),
            predicate: getScoreColor(toPercent(finalScore)).label,
            period_month: periodsToFetch.length === 1 ? periodsToFetch[0] : "ALL",
            ranking: 0,
          };
        })
        .sort((a, b) => toNumber(b.final_score) - toNumber(a.final_score))
        .map((employee, index) => ({ ...employee, ranking: index + 1 }));

      // Ringkasan unit dihitung dari PIC unik yang sudah diagregasi,
      // bukan rata-rata baris bulanan atau penjumlahan kategori bulanan.
      const groupedByUnit = new Map<string, PerformanceAssessment[]>();
      aggregatedAssessments.forEach((employee) => {
        const rows = groupedByUnit.get(employee.unit_name) ?? [];
        rows.push(employee);
        groupedByUnit.set(employee.unit_name, rows);
      });

      const makeUnitSummary = (unitName: string, rows: PerformanceAssessment[], isTotal: boolean): PerformanceUnit => {
        const average = (key: keyof PerformanceAssessment) => (rows.length ? rows.reduce((sum, row) => sum + toNumber(row[key]), 0) / rows.length : 0);
        const counts = rows.reduce(
          (acc, employee) => {
            const score = toPercent(employee.final_score);
            if (score >= 90) acc.jumlah_sangat_baik += 1;
            else if (score >= 80) acc.jumlah_baik += 1;
            else if (score >= 70) acc.jumlah_cukup += 1;
            else acc.jumlah_kurang += 1;
            return acc;
          },
          { jumlah_sangat_baik: 0, jumlah_baik: 0, jumlah_cukup: 0, jumlah_kurang: 0 },
        );
        const finalScore = average("final_score");

        return {
          period_month: periodsToFetch.length === 1 ? periodsToFetch[0] : "ALL",
          unit_name: unitName,
          jumlah_karyawan: rows.length,
          score_lateness: average("score_lateness"),
          score_attendance: average("score_attendance"),
          score_attitude: average("score_attitude"),
          score_sla: average("score_sla"),
          score_payroll_accuracy: average("score_payroll_accuracy"),
          score_additional_work: average("score_additional_work"),
          discipline_subtotal: average("discipline_subtotal"),
          productivity_subtotal: average("productivity_subtotal"),
          final_score: finalScore,
          predicate: getScoreColor(toPercent(finalScore)).label,
          ...counts,
          is_total: isTotal,
        };
      };

      const aggregatedUnits: PerformanceUnit[] = [...Array.from(groupedByUnit.entries()).map(([unitName, rows]) => makeUnitSummary(unitName, rows, false)), makeUnitSummary("Seluruh Tim", aggregatedAssessments, true)];
      let previousData: PerformanceAssessment[] = [];
      if (periodsToFetch.length === 1) {
        try {
          const previousResult = await getPerformanceAssessment(getPreviousPeriod(periodsToFetch[0]));
          previousData = Array.isArray(previousResult) ? (previousResult as PerformanceAssessment[]) : [];
        } catch (err) {
          console.warn("Data SLA bulan sebelumnya tidak tersedia:", err);
        }
      }

      setAssessments(aggregatedAssessments);
      setPreviousAssessments(previousData);
      setUnits(aggregatedUnits);
      setSelectedEmployee((current) => {
        if (!allAssessments.length) return null;
        return current ? (aggregatedAssessments.find((item) => item.employee_name === current.employee_name && item.unit_name === current.unit_name) ?? aggregatedAssessments[0]) : aggregatedAssessments[0];
      });
    } catch (err) {
      console.error("Team performance dashboard error:", err);
      setError(err instanceof Error ? err.message : "Unable to load performance data.");
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    void fetchPerformanceData();
  }, [fetchPerformanceData]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-filter-dropdown]")) {
        setUnitDropdownOpen(false);
        setMonthDropdownOpen(false);
        setYearDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // =======================================================
  // FILTERED DATA
  // =======================================================

  const dashboardAssessments = useMemo(() => assessments.filter((item) => selectedUnit === "All Units" || item.unit_name === selectedUnit), [assessments, selectedUnit]);

  const matrixAssessments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return dashboardAssessments.filter((item) => !query || item.employee_name.toLowerCase().includes(query)).map((employee, index) => ({ ...employee, ranking: index + 1 }));
  }, [dashboardAssessments, search]);

  // Total PIC mengikuti jumlah PIC unik setelah filter Unit diterapkan.
  const totalPIC = dashboardAssessments.length;

  // KPI SLA dihitung dari total pekerjaan aktual seluruh PIC, bukan dari rata-rata score_sla atau nilai weighted SLA.
  const getSlaCounts = (rows: PerformanceAssessment[]) =>
    rows.reduce(
      (totals, item) => ({
        totalJobs: totals.totalJobs + toNumber(item.total_sla_jobs),
        onTimeJobs: totals.onTimeJobs + toNumber(item.completed_on_time),
      }),
      { totalJobs: 0, onTimeJobs: 0 },
    );

  // Pastikan kedua kolom tersedia pada seluruh baris assessment.
  const hasSlaData = dashboardAssessments.length > 0 && dashboardAssessments.every((item) => item.total_sla_jobs !== null && item.total_sla_jobs !== undefined && item.completed_on_time !== null && item.completed_on_time !== undefined);

  // Data bulan sebelumnya harus mengikuti filter Unit yang sedang dipilih,
  // agar perbandingan SLA memakai populasi PIC yang sama.
  const previousDashboardAssessments = useMemo(() => previousAssessments.filter((item) => selectedUnit === "All Units" || item.unit_name === selectedUnit), [previousAssessments, selectedUnit]);

  const hasPreviousSlaData =
    previousDashboardAssessments.length > 0 && previousDashboardAssessments.every((item) => item.total_sla_jobs !== null && item.total_sla_jobs !== undefined && item.completed_on_time !== null && item.completed_on_time !== undefined);

  const currentSlaCounts = useMemo(() => getSlaCounts(dashboardAssessments), [dashboardAssessments]);

  const previousSlaCounts = useMemo(() => getSlaCounts(previousDashboardAssessments), [previousDashboardAssessments]);

  const totalJobs = currentSlaCounts.totalJobs;
  const onTimeJobs = currentSlaCounts.onTimeJobs;

  const slaPercentage = totalJobs > 0 ? (onTimeJobs / totalJobs) * 100 : 0;

  const previousSlaPercentage = selectedMonth === "All" || selectedYear === "All" ? null : hasPreviousSlaData && previousSlaCounts.totalJobs > 0 ? (previousSlaCounts.onTimeJobs / previousSlaCounts.totalJobs) * 100 : null;

  const slaChange = previousSlaPercentage === null ? null : slaPercentage - previousSlaPercentage;

  const slaTargetPercent = 90;

  const averageFinalScore = useMemo(() => {
    if (!dashboardAssessments.length) return 0;

    return dashboardAssessments.reduce((sum, item) => sum + toPercent(item.final_score), 0) / dashboardAssessments.length;
  }, [dashboardAssessments]);

  const previousAverageFinalScore = useMemo(() => {
    const filteredPrevious = previousAssessments.filter((item) => selectedUnit === "All Units" || item.unit_name === selectedUnit);

    if (!filteredPrevious.length) return null;

    return filteredPrevious.reduce((sum, item) => sum + toPercent(item.final_score), 0) / filteredPrevious.length;
  }, [previousAssessments, selectedUnit]);

  const finalScoreChange = previousAverageFinalScore === null ? null : averageFinalScore - previousAverageFinalScore;

  const topPerformers = useMemo(() => [...dashboardAssessments].sort((a, b) => toNumber(b.final_score) - toNumber(a.final_score)).slice(0, 5), [dashboardAssessments]);

  const topThreePerformers = useMemo(() => [...dashboardAssessments].sort((a, b) => toNumber(b.final_score) - toNumber(a.final_score)).slice(0, 3), [dashboardAssessments]);

  const getEmployeeChange = (employee: PerformanceAssessment) => {
    const previous = previousAssessments.find((item) => item.employee_name === employee.employee_name);

    if (!previous) return null;

    return toPercent(employee.final_score) - toPercent(previous.final_score);
  };

  const getPerfectParameterCount = (employee: PerformanceAssessment) => {
    return PARAMETERS.filter((parameter) => toPercent(employee[parameter.scoreKey]) >= 99.95).length;
  };

  const weakestParameter = useMemo(() => {
    if (!dashboardAssessments.length) return null;

    const coreParameters = PARAMETERS.filter((parameter) => parameter.key !== "additional_work");

    return coreParameters
      .map((parameter) => {
        const average = dashboardAssessments.reduce((sum, item) => sum + toPercent(item[parameter.scoreKey]), 0) / dashboardAssessments.length;

        return {
          ...parameter,
          average,
        };
      })
      .sort((a, b) => a.average - b.average)[0];
  }, [dashboardAssessments]);

  // Jumlah PIC dengan Final Score minimal 80%
  const goodPICCount = useMemo(() => dashboardAssessments.filter((item) => toPercent(item.final_score) >= 80).length, [dashboardAssessments]);

  const lowestEmployee = useMemo(() => [...dashboardAssessments].sort((a, b) => toNumber(a.final_score) - toNumber(b.final_score))[0], [dashboardAssessments]);

  // PIC dengan Final Score di bawah 80%
  const belowTargetPICCount = dashboardAssessments.filter((item) => toPercent(item.final_score) < 80).length;

  // Perubahan Final Score setiap PIC dibandingkan bulan sebelumnya.
  // Perbandingan hanya tersedia ketika satu bulan dan satu tahun dipilih.
  const performanceChanges = useMemo(() => {
    if (selectedMonth === "All" || selectedYear === "All" || !previousAssessments.length) {
      return [];
    }

    return dashboardAssessments
      .map((employee) => {
        const previous = previousAssessments.find((item) => item.employee_name.trim().toLowerCase() === employee.employee_name.trim().toLowerCase() && item.unit_name === employee.unit_name);

        if (!previous) return null;

        return {
          ...employee,
          change: toPercent(employee.final_score) - toPercent(previous.final_score),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [dashboardAssessments, previousAssessments, selectedMonth, selectedYear]);

  const biggestDecrease = [...performanceChanges].sort((a, b) => a.change - b.change)[0];

  const biggestIncrease = [...performanceChanges].sort((a, b) => b.change - a.change)[0];

  // PIC dengan frekuensi keterlambatan tertinggi
  const highestLatePIC = [...dashboardAssessments].sort((a, b) => toNumber(b.late_frequency) - toNumber(a.late_frequency))[0];

  // Total kesalahan payroll seluruh PIC
  const totalPayrollErrors = dashboardAssessments.reduce((sum, item) => sum + toNumber(item.incorrect_payroll), 0);

  // PIC dengan kesalahan payroll terbanyak
  const highestErrorPIC = [...dashboardAssessments].sort((a, b) => toNumber(b.incorrect_payroll) - toNumber(a.incorrect_payroll))[0];

  const highestErrorContribution = totalPayrollErrors > 0 && highestErrorPIC ? (toNumber(highestErrorPIC.incorrect_payroll) / totalPayrollErrors) * 100 : 0;

  // =======================================================
  // UI HELPERS
  // =======================================================

  const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => <section className={`rounded-xl border border-[#34445D] bg-[#1D304D] p-4 shadow-sm ${className}`}>{children}</section>;

  const SectionTitle = ({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) => (
    <div className="mb-3 flex min-w-0 flex-col items-stretch justify-between gap-2 sm:flex-row sm:items-center">
      <div className="min-w-0">
        <h2 className="text-xs font-bold leading-tight text-white">{title}</h2>
        {description && <p className="mt-0.5 text-[10px] text-[#A9B8CE]">{description}</p>}
      </div>
      {action}
    </div>
  );

  const unitCards = units.filter((item) => !item.is_total && (selectedUnit === "All Units" || item.unit_name === selectedUnit));

  // Opsi bulan dan tahun diambil dari periode yang tersedia di database.
  const periodOptions = useMemo<string[]>(() => {
    const availablePeriods = periods.map((item) => item.period_month?.slice(0, 7)).filter((period): period is string => Boolean(period));

    return Array.from(new Set<string>(availablePeriods)).sort((a, b) => b.localeCompare(a));
  }, [periods]);

  const yearOptions = useMemo(() => [...new Set(periodOptions.map((period) => period.slice(0, 4)))].sort((a, b) => Number(b) - Number(a)), [periodOptions]);

  const monthOptions = useMemo(() => {
    const months = periodOptions.filter((period) => selectedYear === "All" || period.startsWith(`${selectedYear}-`)).map((period) => period.slice(5, 7));
    return [...new Set(months)].sort((a, b) => Number(a) - Number(b));
  }, [periodOptions, selectedYear]);

  const selectedPeriod = useMemo(() => {
    const matching = periodOptions.filter((period) => {
      const [year, month] = period.split("-");
      return (selectedYear === "All" || year === selectedYear) && (selectedMonth === "All" || month === selectedMonth);
    });
    return matching[0] ?? periodOptions[0] ?? "";
  }, [periodOptions, selectedMonth, selectedYear]);

  const resetFilters = () => {
    setSelectedUnit("All Units");
    setSelectedMonth("All");
    setSelectedYear("All");
    setSearch("");
    setUnitDropdownOpen(false);
    setMonthDropdownOpen(false);
    setYearDropdownOpen(false);
  };

  const isFilterActive = selectedUnit !== "All Units" || selectedMonth !== "All" || selectedYear !== "All";


const handleExportMatrix = () => {
  if (!matrixAssessments.length) return;

  const headers = ["PIC", "Jabatan", "Unit", ...PARAMETERS.flatMap((parameter) => [`${parameter.label} - Skor (%)`, `${parameter.label} - Data Aktual`]), "Nilai Akhir (%)", "Predikat"];

  const rows = matrixAssessments.map((employee) => {
    const row: (string | number)[] = [employee.employee_name, employee.position || "Payroll", employee.unit_name];

    PARAMETERS.forEach((parameter) => {
      row.push(formatPercent(employee[parameter.scoreKey]), formatRawValue(parameter.key, employee));
    });

    row.push(formatPercent(employee.final_score), employee.predicate);

    return row;
  });

  const worksheet = XLSX.utils.aoa_to_sheet([["MATRIKS KINERJA PIC PAYROLL"], [`Total PIC: ${matrixAssessments.length}`], [], headers, ...rows]);

  const lastColumn = headers.length - 1;
  const lastRow = rows.length + 3;

  // Judul laporan
  worksheet["A1"].s = {
    font: {
      bold: true,
      sz: 16,
      color: { rgb: "FFFFFF" },
    },
    fill: {
      fgColor: { rgb: "14243D" },
    },
    alignment: {
      vertical: "center",
      horizontal: "left",
    },
  };

  // Baris informasi
  worksheet["A2"].s = {
    font: {
      italic: true,
      sz: 10,
      color: { rgb: "64748B" },
    },
  };

  // Header tabel
  for (let col = 0; col <= lastColumn; col++) {
    const cellAddress = XLSX.utils.encode_cell({
      r: 3,
      c: col,
    });

    if (worksheet[cellAddress]) {
      worksheet[cellAddress].s = {
        font: {
          bold: true,
          color: { rgb: "FFFFFF" },
          sz: 10,
        },
        fill: {
          fgColor: { rgb: "1E3A5F" },
        },
        alignment: {
          horizontal: "center",
          vertical: "center",
          wrapText: true,
        },
        border: {
          top: { style: "thin", color: { rgb: "34445D" } },
          bottom: { style: "medium", color: { rgb: "36B99A" } },
          left: { style: "thin", color: { rgb: "D5DFEE" } },
          right: { style: "thin", color: { rgb: "D5DFEE" } },
        },
      };
    }
  }

  // Styling isi tabel
  for (let row = 4; row <= lastRow; row++) {
    for (let col = 0; col <= lastColumn; col++) {
      const cellAddress = XLSX.utils.encode_cell({
        r: row,
        c: col,
      });

      if (!worksheet[cellAddress]) continue;

      worksheet[cellAddress].s = {
        font: {
          name: "Arial",
          sz: 10,
          color: { rgb: "1E293B" },
        },
        fill: {
          fgColor: {
            rgb: row % 2 === 0 ? "F1F5F9" : "FFFFFF",
          },
        },
        alignment: {
          vertical: "center",
          horizontal: col === 0 ? "left" : "center",
          wrapText: true,
        },
        border: {
          top: { style: "thin", color: { rgb: "E2E8F0" } },
          bottom: { style: "thin", color: { rgb: "E2E8F0" } },
          left: { style: "thin", color: { rgb: "E2E8F0" } },
          right: { style: "thin", color: { rgb: "E2E8F0" } },
        },
      };
    }
  }

  // Highlight kolom nilai akhir dan predikat
  for (let row = 4; row <= lastRow; row++) {
    [lastColumn - 1, lastColumn].forEach((col) => {
      const cellAddress = XLSX.utils.encode_cell({
        r: row,
        c: col,
      });

      if (worksheet[cellAddress]) {
        worksheet[cellAddress].s = {
          ...worksheet[cellAddress].s,
          font: {
            bold: true,
            color: { rgb: "145B4D" },
            sz: 10,
          },
          fill: {
            fgColor: { rgb: "D1FAE5" },
          },
        };
      }
    });
  }

  // Lebar kolom
  worksheet["!cols"] = [{ wch: 25 }, { wch: 18 }, { wch: 22 }, ...PARAMETERS.flatMap(() => [{ wch: 16 }, { wch: 22 }]), { wch: 18 }, { wch: 18 }];

  // Tinggi baris
  worksheet["!rows"] = [{ hpt: 30 }, { hpt: 20 }, { hpt: 8 }, { hpt: 35 }, ...rows.map(() => ({ hpt: 25 }))];

  // Filter dan freeze header
  worksheet["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: 3, c: 0 },
      e: { r: lastRow, c: lastColumn },
    }),
  };

  worksheet["!freeze"] = {
    xSplit: 3,
    ySplit: 4,
  };

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Matriks Kinerja PIC");

  XLSX.writeFile(workbook, "Matriks_Kinerja_PIC_Payroll.xlsx");
};



  // =======================================================
  // RENDER
  // =======================================================
   if (loading) {
      return (
        <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-3 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-500/20 border-t-blue-400" />

          <div>
            <p className="text-sm font-semibold text-slate-200">Memuat Dashboard Team Performance</p>
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
  
            <h2 className="text-base font-bold text-slate-100">Dashboard Team Performance Gagal Dimuat</h2>
  
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
    <div className="min-h-full w-full min-w-0 space-y-3 overflow-x-hidden rounded-2xl bg-[radial-gradient(circle_at_10%_0%,rgba(53,102,173,0.11),transparent_28%),radial-gradient(circle_at_90%_8%,rgba(48,190,132,0.06),transparent_24%),#0f1928] px-0 pb-5 pt-1 font-sans text-[#e9f0f7] sm:space-y-4 max-[768px]:rounded-none max-[768px]:pt-0">
      {/* HEADER - DISELARASKAN DENGAN DASHBOARD DETAIL BAPP */}
      <header className="mb-3 flex min-w-0 flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <h1 className="text-lg font-extrabold tracking-tight text-slate-50 sm:text-xl">Team Performance</h1>
          <p className="mt-1 text-[11px] text-slate-400">Monitoring dan evaluasi performa seluruh PIC payroll.</p>
        </div>

        <div className="flex w-fit shrink-0 items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/[0.08] px-3 py-1.5 text-[10px] font-semibold text-emerald-300">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          Data Terhubung
        </div>
      </header>

      {/* FILTER*/}
      <section className="relative z-20 mb-3 rounded-xl border border-slate-400/15 bg-[linear-gradient(145deg,#1b2b40,#172538)] p-3 shadow-[0_8px_20px_rgba(0,0,0,0.12)]">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <div>
            <span className="mb-0.5 block text-[8px] font-extrabold tracking-[1px] text-blue-300">FILTER DATA</span>
            <h2 className="text-xs font-bold leading-tight text-slate-100">Parameter Dashboard</h2>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={resetFilters}
              className={`inline-flex h-7 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-[9px] font-semibold transition hover:border-blue-400/50 hover:bg-blue-500/10 hover:text-blue-100 ${
                isFilterActive ? "border-blue-400/50 bg-blue-500/10 text-blue-100" : "border-slate-500/25 bg-white/[0.035] text-slate-400"
              }`}
            >
              <RefreshCw size={11} />
              Reset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="relative min-w-0" data-filter-dropdown>
            <label className="mb-1 block text-[10px] font-semibold text-slate-300/80">Unit</label>
            <FilterDropdown
              open={unitDropdownOpen}
              onClick={() => {
                setUnitDropdownOpen((open) => !open);
                setMonthDropdownOpen(false);
                setYearDropdownOpen(false);
              }}
              placeholder="Semua Unit"
              displayValue={selectedUnit === "All Units" ? "" : selectedUnit}
              hasValue={selectedUnit !== "All Units"}
            >
              <div className="max-h-52 overflow-y-auto p-1">
                {["All Units", ...units.filter((unit) => !unit.is_total).map((unit) => unit.unit_name)].map((unit) => (
                  <button
                    key={unit}
                    type="button"
                    onClick={() => {
                      setSelectedUnit(unit);
                      setUnitDropdownOpen(false);
                    }}
                    className={`w-full rounded-md px-2.5 py-2 text-left text-[11px] transition ${selectedUnit === unit ? "bg-blue-500/15 text-blue-200" : "text-slate-300 hover:bg-white/[0.06] hover:text-white"}`}
                  >
                    {unit === "All Units" ? "Semua Unit" : unit}
                  </button>
                ))}
              </div>
            </FilterDropdown>
          </div>

          <div className="relative min-w-0" data-filter-dropdown>
            <label className="mb-1 block text-[10px] font-semibold text-slate-300/80">Bulan</label>
            <FilterDropdown
              open={monthDropdownOpen}
              onClick={() => {
                setMonthDropdownOpen((open) => !open);
                setUnitDropdownOpen(false);
                setYearDropdownOpen(false);
              }}
              placeholder="Pilih Bulan"
              displayValue={selectedMonth === "All" ? "Semua Bulan" : (MONTHS[Number(selectedMonth) - 1] ?? "")}
              hasValue={selectedMonth !== "All"}
            >
              <div className="max-h-52 overflow-y-auto p-1">
                {["All", ...monthOptions].map((month) => (
                  <button
                    key={month}
                    type="button"
                    onClick={() => {
                      setSelectedMonth(month);
                      setMonthDropdownOpen(false);
                    }}
                    className={`w-full rounded-md px-2.5 py-2 text-left text-[11px] transition ${selectedMonth === month ? "bg-blue-500/15 text-blue-200" : "text-slate-300 hover:bg-white/[0.06] hover:text-white"}`}
                  >
                    {month === "All" ? "Semua Bulan" : MONTHS[Number(month) - 1]}
                  </button>
                ))}
              </div>
            </FilterDropdown>
          </div>

          <div className="relative min-w-0" data-filter-dropdown>
            <label className="mb-1 block text-[10px] font-semibold text-slate-300/80">Tahun</label>
            <FilterDropdown
              open={yearDropdownOpen}
              onClick={() => {
                setYearDropdownOpen((open) => !open);
                setUnitDropdownOpen(false);
                setMonthDropdownOpen(false);
              }}
              placeholder="Pilih Tahun"
              displayValue={selectedYear === "All" ? "Semua Tahun" : selectedYear}
              hasValue={selectedYear !== "All"}
            >
              <div className="max-h-52 overflow-y-auto p-1">
                {["All", ...yearOptions].map((year) => (
                  <button
                    key={year}
                    type="button"
                    onClick={() => {
                      setSelectedYear(year);
                      if (year !== "All" && selectedMonth !== "All" && !periodOptions.some((period) => period.startsWith(`${year}-`) && period.slice(5, 7) === selectedMonth)) {
                        setSelectedMonth("All");
                      }
                      setYearDropdownOpen(false);
                    }}
                    className={`w-full rounded-md px-2.5 py-2 text-left text-[11px] transition ${selectedYear === year ? "bg-blue-500/15 text-blue-200" : "text-slate-300 hover:bg-white/[0.06] hover:text-white"}`}
                  >
                    {year === "All" ? "Semua Tahun" : year}
                  </button>
                ))}
              </div>
            </FilterDropdown>
          </div>
        </div>

        {isFilterActive && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-slate-300/[0.08] pt-2">
            <span className="mr-1 text-[9px] text-slate-400">Filter aktif:</span>
            {selectedUnit !== "All Units" && <span className="rounded-md border border-blue-400/20 bg-blue-400/10 px-2 py-1 text-[9px] text-blue-200">Unit: {selectedUnit}</span>}
            {selectedMonth !== "All" && <span className="rounded-md border border-blue-400/20 bg-blue-400/10 px-2 py-1 text-[9px] text-blue-200">Bulan: {MONTHS[Number(selectedMonth) - 1]}</span>}
            {selectedYear !== "All" && <span className="rounded-md border border-blue-400/20 bg-blue-400/10 px-2 py-1 text-[9px] text-blue-200">Tahun: {selectedYear}</span>}
          </div>
        )}
      </section>

      {/* ERROR */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-300">
          <AlertTriangle size={18} />
          <div>
            <p className="font-semibold">Gagal memuat data dashboard</p>
            <p className="mt-1 text-xs">{error}</p>
          </div>
          <button onClick={fetchPerformanceData} className="ml-auto text-xs font-semibold underline">
            Coba lagi
          </button>
        </div>
      )}

      {/* LOADING */}
      {loading && (
        <div className="rounded-xl border border-[#34445D] bg-[#1D304D] p-8 text-center text-sm text-[#A9B8CE]">
          <RefreshCw size={20} className="mx-auto mb-2 animate-spin" />
          Memuat data performa...
        </div>
      )}

      {!loading && !error && (
        <>
          {/* ================= KPI SUMMARY ================= */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {/* TOTAL PIC PAYROLL */}
            <Card className="border-0 border-l-[3px] border-b-[3px] border-l-[#36B99A] border-b-[#36B99A] bg-[#1B2940] p-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[9px] font-medium text-[#A9B8CE]">Total PIC Payroll</p>
                  <h2 className="mt-1 text-lg font-bold leading-tight text-white">
                    {totalPIC}
                    <span className="ml-1 text-[10px] font-medium text-[#A9B8CE]">PIC</span>
                  </h2>
                </div>
                <div className="shrink-0 rounded-md border border-[#36B99A]/30 bg-[#36B99A]/10 p-1.5">
                  <Users size={15} className="text-[#36B99A]" />
                </div>
              </div>
              <p className="mt-1.5 truncate text-[8px] text-[#A9B8CE]">{unitCards.map((unit) => `${unit.unit_name} ${unit.jumlah_karyawan}`).join(" · ") || "Belum ada data unit"}</p>
            </Card>

            {/* SLA TEPAT WAKTU */}
            <Card className="border-0 border-l-[3px] border-b-[3px] border-l-[#38BDF8] border-b-[#38BDF8] bg-[#1B2940] p-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[9px] font-medium text-[#A9B8CE]">SLA Tepat Waktu</p>
                  <h2 className="mt-1 text-lg font-bold leading-tight text-white">{hasSlaData && totalJobs > 0 ? `${slaPercentage.toFixed(2).replace(".", ",")}%` : "-"}</h2>
                </div>
                <div className="shrink-0 rounded-md border border-[#38BDF8]/30 bg-[#38BDF8]/10 p-1.5">
                  <Clock3 size={15} className="text-[#38BDF8]" />
                </div>
              </div>
              <p className="mt-1.5 truncate text-[8px] text-[#A9B8CE]">
                {hasSlaData && totalJobs > 0 ? `${onTimeJobs.toLocaleString("id-ID")} dari ${totalJobs.toLocaleString("id-ID")} pekerjaan · Target ${slaTargetPercent}%` : "Data pekerjaan belum tersedia"}
              </p>
              {hasSlaData && totalJobs > 0 && (
                <p className="mt-1 text-[8px]">
                  {slaChange === null ? (
                    <span className="text-[#A9B8CE]">Data bulan sebelumnya belum tersedia</span>
                  ) : (
                    <span className={slaChange >= 0 ? "font-semibold text-[#36B99A]" : "font-semibold text-red-400"}>
                      {slaChange > 0 ? "▲" : slaChange < 0 ? "▼" : "–"} {Math.abs(slaChange).toFixed(2).replace(".", ",")} poin vs bulan lalu
                    </span>
                  )}
                </p>
              )}
            </Card>

            {/* RATA-RATA FINAL SCORE */}

            <Card className="border-0 border-l-[3px] border-b-[3px] border-l-[#A78BFA] border-b-[#A78BFA] bg-[#1B2940] p-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[9px] font-medium text-[#A9B8CE]">Rata-rata Final Score</p>

                  <h2 className="mt-1 text-lg font-bold leading-tight text-white">{dashboardAssessments.length > 0 ? `${averageFinalScore.toFixed(2).replace(".", ",")}%` : "-"}</h2>
                </div>

                <div className="shrink-0 rounded-md border border-[#A78BFA]/30 bg-[#A78BFA]/10 p-1.5">
                  <Award size={15} className="text-[#A78BFA]" />
                </div>
              </div>

              <p className="mt-1.5 truncate text-[8px] text-[#A9B8CE]">Rata-rata nilai akhir seluruh PIC</p>

              {/* PERBANDINGAN DENGAN PERIODE SEBELUMNYA */}
              <div className="mt-1.5">
                {finalScoreChange === null ? (
                  <p className="text-[8px] text-[#A9B8CE]">Data periode sebelumnya belum tersedia</p>
                ) : (
                  <p className={`text-[8px] font-semibold ${finalScoreChange > 0 ? "text-[#36B99A]" : finalScoreChange < 0 ? "text-red-400" : "text-[#A9B8CE]"}`}>
                    {finalScoreChange > 0 ? "▲" : finalScoreChange < 0 ? "▼" : "–"} {Math.abs(finalScoreChange).toFixed(2).replace(".", ",")} poin vs periode sebelumnya
                  </p>
                )}
              </div>
            </Card>

            {/* PIC PERFORMA BAIK */}
            <Card className="border-0 border-l-[3px] border-b-[3px] border-l-[#D6A936] border-b-[#D6A936] bg-[#1B2940] p-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[9px] font-medium text-[#A9B8CE]">PIC Performa Baik</p>

                  <h2 className="mt-1 text-lg font-bold leading-tight text-white">
                    {goodPICCount}
                    <span className="ml-1 text-[10px] font-medium text-[#A9B8CE]">PIC</span>
                  </h2>
                </div>

                <div className="shrink-0 rounded-md border border-[#D6A936]/30 bg-[#D6A936]/10 p-1.5">
                  <UserCheck size={15} className="text-[#D6A936]" />
                </div>
              </div>

              <p className="mt-1.5 truncate text-[8px] text-[#A9B8CE]">PIC dengan Final Score minimal 80%</p>
            </Card>
          </div>

          {/* ================= UNIT SUMMARY ================= */}
          <section>
            <SectionTitle title="Ringkasan Per Unit" description="Perbandingan performa dan nilai akhir setiap unit" />

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {unitCards.map((unit) => {
                const score = toPercent(unit.final_score);
                const scoreColor = getScoreColor(score);

                // Mencari parameter dengan nilai terendah
                const weakest = PARAMETERS.filter((parameter) => parameter.key !== "additional_work")
                  .map((parameter) => ({
                    label: parameter.label,
                    score: toPercent(unit[parameter.scoreKey]),
                  }))
                  .sort((a, b) => a.score - b.score)[0];

                return (
                  <Card key={unit.unit_name} className="border border-[#34445D] bg-[#1B2940] p-2.5">
                    {/* UNIT NAME & PREDICATE */}
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xs font-semibold text-white">{unit.unit_name}</h3>

                      <span
                        className="rounded-full px-2 py-0.5 text-[9px] font-semibold"
                        style={{
                          color: scoreColor.text,
                          backgroundColor: scoreColor.background,
                        }}
                      >
                        {unit.predicate || scoreColor.label}
                      </span>
                    </div>

                    {/* FINAL SCORE */}
                    <div className="mt-1.5 flex items-end justify-between gap-2">
                      <h2 className="text-lg font-bold leading-tight text-white">{formatPercent(unit.final_score)}</h2>

                      <p className="text-[9px] text-[#A9B8CE]">{unit.jumlah_karyawan} PIC</p>
                    </div>

                    {/* TREND LINE */}
                    {/* Placeholder untuk data Oktober */}
                    <div className="mt-1.5 w-full">
                      <svg viewBox="0 0 320 16" className="h-4 w-full" preserveAspectRatio="none">
                        <path d="M 4 8 L 316 8" fill="none" stroke={scoreColor.text} strokeWidth="1.8" strokeLinecap="round" />

                        <circle cx="4" cy="8" r="2" fill={scoreColor.text} />

                        <circle cx="316" cy="8" r="3.5" fill={scoreColor.text} />
                      </svg>
                    </div>

                    {/* WEAKEST PARAMETER */}
                    <div className="mt-1.5 border-t border-[#34445D] pt-1.5">
                      <p className="text-[9px] text-[#A9B8CE]">
                        Terlemah:
                        <span className="font-medium text-white">
                          {weakest?.label ?? "-"}
                          {weakest ? ` (${weakest.score.toFixed(0)}%)` : ""}
                        </span>
                      </p>
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>

          {/* PERFORMANCE MATRIX */}
          <Card>
            <SectionTitle
              title="Parameter per PIC Payroll"
              description={`Matriks skor PIC · ${matrixAssessments.length} PIC unik · Skor rata-rata dan data aktual akumulatif`}
              action={
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                  {/* SEARCH */}
                  <div className="relative w-full sm:w-auto">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#A9B8CE]" />

                    <input
                      type="text"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Cari nama PIC..."
                      className="h-9 w-full rounded-lg border border-[#34445D] bg-[#101D35] py-1.5 pl-7 pr-8 text-[10px] text-white outline-none placeholder:text-[#6F82A0] focus:border-[#36B99A] sm:h-8 sm:w-40"
                    />

                    {search && (
                      <button type="button" onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#A9B8CE] hover:text-white" title="Hapus pencarian">
                        ×
                      </button>
                    )}
                  </div>

                  {/* EXPORT EXCEL */}
                  <button
                    type="button"
                    onClick={handleExportMatrix}
                    disabled={!matrixAssessments.length}
                    className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-[#237D69] bg-[#145B4D] px-3 text-[10px] font-semibold text-[#D1FAE5] transition-colors hover:bg-[#18745F] disabled:cursor-not-allowed disabled:opacity-40 sm:h-8 sm:w-auto"
                  >
                    <Download size={13} />
                    Export Excel
                  </button>
                </div>
              }
            />

            <div className="mb-2 flex flex-wrap items-center gap-2 text-[9px] text-[#A9B8CE]">
              <span className="rounded-md bg-[#263750] px-2 py-1">{matrixAssessments.length} PIC unik</span>
              <span>Skor: rata-rata periode terpilih</span>
              <span>·</span>
              <span>Data aktual: total periode terpilih</span>
            </div>

            <div className="overflow-x-auto pb-1 [color-scheme:dark] [scrollbar-color:#34445D_#101D35] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-corner]:bg-[#101D35] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#34445D] hover:[&::-webkit-scrollbar-thumb]:bg-[#4A6082] [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-[#101D35]">
              <table className="w-full min-w-[960px] table-fixed border-collapse text-left">
                <colgroup>
                  <col style={{ width: 220 }} />
                  {PARAMETERS.map((parameter) => (
                    <col key={parameter.key} />
                  ))}
                  <col />
                </colgroup>

                <thead>
                  <tr className="border-b border-[#34445D]">
                    <th className="sticky left-0 z-10 bg-[#101D35] px-3 py-2 text-xs font-medium text-[#A9B8CE]">PIC</th>

                    {PARAMETERS.map((parameter) => (
                      <th key={parameter.key} className="bg-[#101D35] px-1 py-2 text-center">
                        <p className="text-xs font-medium leading-snug text-[#D5DFEE]">{parameter.label}</p>
                        <p className="text-xs font-medium leading-snug text-[#A9B8CE]">{parameter.weight}%</p>
                      </th>
                    ))}

                    <th className="bg-[#101D35] px-1 py-2 text-center text-xs font-medium text-[#D5DFEE]">Nilai akhir</th>
                  </tr>
                </thead>

                <tbody>
                  {matrixAssessments.map((employee) => {
                    const isSelected = selectedEmployee?.employee_name === employee.employee_name && selectedEmployee?.unit_name === employee.unit_name;

                    const finalColor = getScoreColor(toPercent(employee.final_score));

                    return (
                      <tr
                        key={`${employee.employee_name}-${employee.unit_name}`}
                        onClick={() => setSelectedEmployee(employee)}
                        className={`cursor-pointer border-b border-[#34445D] transition-colors last:border-b-0 ${isSelected ? "bg-[#294461]" : "bg-[#172A44] hover:bg-[#233B59]"}`}
                      >
                        {/* PIC */}
                        <td className={`sticky left-0 z-[1] border-l-[3px] bg-inherit px-3 py-2 ${isSelected ? "border-l-[#36B99A]" : "border-l-transparent"}`}>
                          <p className="truncate text-[13px] font-bold leading-tight text-white">{employee.employee_name}</p>
                          <p className="mt-0.5 truncate text-[11px] leading-tight text-[#A9B8CE]">
                            {employee.position || "Payroll"} · {employee.unit_name}
                          </p>
                        </td>

                        {/* PARAMETER */}
                        {PARAMETERS.map((parameter) => {
                          const score = toPercent(employee[parameter.scoreKey]);
                          const color = getScoreColor(score);

                          return (
                            <td key={parameter.key} className="p-0">
                              <div
                                className="flex h-full min-h-[48px] flex-col items-center justify-center px-1 py-1"
                                style={{
                                  backgroundColor: color.background,
                                  color: color.text,
                                }}
                              >
                                <span className="text-[13px] font-bold leading-tight">{formatPercent(employee[parameter.scoreKey])}</span>

                                <span className="text-center text-[11px] leading-tight">{formatRawValue(parameter.key, employee)}</span>
                              </div>
                            </td>
                          );
                        })}

                        {/* NILAI AKHIR */}
                        <td className="p-0">
                          <div
                            className="flex h-full min-h-[48px] flex-col items-center justify-center px-1 py-1"
                            style={{
                              backgroundColor: finalColor.background,
                              color: finalColor.text,
                            }}
                          >
                            <span className="text-[13px] font-bold leading-tight">{formatPercent(employee.final_score)}</span>

                            <span className="text-[11px] leading-tight">{employee.predicate}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {!matrixAssessments.length && (
                    <tr>
                      <td colSpan={PARAMETERS.length + 2} className="py-8 text-center text-xs text-[#A9B8CE]">
                        Tidak ada data PIC untuk filter yang dipilih.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* LEGEND */}

            <div className="mt-3 flex flex-wrap gap-4 border-t border-[#34445D] pt-3">
              {[
                { label: "Sangat Baik", color: "#34D399" },
                { label: "Baik", color: "#60A5FA" },
                { label: "Cukup", color: "#FBBF24" },
                { label: "Kurang", color: "#F87171" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded-sm shadow-sm"
                    style={{
                      backgroundColor: item.color,
                      boxShadow: `0 0 7px ${item.color}55`,
                    }}
                  />
                  <span className="text-[11px] font-medium text-[#D8E2F0]">{item.label}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* ================= TOP 3 PIC PAYROLL ================= */}
          <section className="min-w-0">
            <div className="rounded-xl border border-[#34445D] bg-[#1B2940] p-3 sm:p-4">
              {/* HEADER & KRITERIA */}
              <div className="mb-3">
                <div className="flex items-center gap-2">
                  <Trophy size={15} className="text-[#D6A936]" />
                  <h2 className="text-xs font-bold text-white">Top 3 PIC Payroll</h2>
                </div>

                <p className="mt-1 text-[10px] leading-relaxed text-[#A9B8CE]">Peringkat ditentukan berdasarkan Final Score tertinggi dari enam parameter penilaian kinerja PIC Payroll.</p>
              </div>

              {/* PARAMETER BOBOT */}
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-6">
                {[
                  { label: "Keterlambatan", weight: "20%" },
                  { label: "Kehadiran", weight: "20%" },
                  { label: "Sikap", weight: "10%" },
                  { label: "SLA Tepat Waktu", weight: "20%" },
                  { label: "Akurasi Payroll", weight: "20%" },
                  { label: "Tugas Tambahan", weight: "10%" },
                ].map((item) => (
                  <div key={item.label} className="flex min-w-0 items-center justify-between gap-1 rounded-md bg-[#263750] px-2 py-1.5">
                    <span className="truncate text-[9px] text-[#A9B8CE]">{item.label}</span>
                    <span className="shrink-0 text-[9px] font-bold text-[#36B99A]">{item.weight}</span>
                  </div>
                ))}
              </div>

              {/* DIVIDER */}
              <div className="my-3 border-t border-[#34445D]" />

              {/* TOP 3 PROFILE */}
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold text-white">Peringkat PIC Payroll</p>
                <p className="text-[9px] text-[#A9B8CE]">Berdasarkan Final Score</p>
              </div>

              <div className="grid min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {topThreePerformers.map((employee, index) => {
                  const score = toPercent(employee.final_score);
                  const scoreColor = getScoreColor(score);
                  const change = getEmployeeChange(employee);
                  const perfectCount = getPerfectParameterCount(employee);

                  const rankStyles = [
                    {
                      border: "#D6A936",
                      background: "rgba(214,169,54,0.07)",
                      badge: "#D6A936",
                      label: "JUARA 1",
                    },
                    {
                      border: "#8795A8",
                      background: "rgba(135,149,168,0.06)",
                      badge: "#8795A8",
                      label: "JUARA 2",
                    },
                    {
                      border: "#B77A4B",
                      background: "rgba(183,122,75,0.06)",
                      badge: "#B77A4B",
                      label: "JUARA 3",
                    },
                  ];

                  const rank = rankStyles[index];

                  return (
                    <div
                      key={employee.employee_name}
                      className={`relative flex min-w-0 flex-col rounded-lg border p-3 ${
                        index === 0
                          ? "sm:col-span-2 sm:mx-auto sm:w-[65%] lg:col-span-1 lg:order-2 lg:w-full lg:-translate-y-2 lg:z-10"
                          : index === 1
                            ? "sm:col-span-1 lg:order-1 lg:translate-y-1"
                            : "sm:col-span-1 lg:order-3 lg:translate-y-1"
                      }`}
                      style={{
                        borderColor: rank.border,
                        background: rank.background,
                      }}
                    >
                      {/* RANK HEADER */}
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[10px] font-bold tracking-wider" style={{ color: rank.badge }}>
                          {rank.label}
                        </span>
                        <Trophy size={15} style={{ color: rank.badge }} />
                      </div>

                      {/* PROFILE */}
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="relative shrink-0 pt-2.5">
                          <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2" style={{ color: rank.badge }}>
                            <Crown size={21} strokeWidth={2.5} fill={rank.badge} />
                          </div>

                          <EmployeeAvatar
                            name={employee.employee_name}
                            imageUrl={employee.image_url}
                            className="h-12 w-12 rounded-full border-[3px]"
                            style={{
                              borderColor: rank.border,
                            }}
                          />

                          <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#1D304D] text-[9px] font-bold text-white" style={{ backgroundColor: rank.badge }}>
                            {index + 1}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-xs font-semibold text-white">{employee.employee_name}</h3>
                          <p className="mt-0.5 truncate text-[9px] text-[#A9B8CE]">
                            {employee.position || "Payroll"} · {employee.unit_name}
                          </p>
                        </div>
                      </div>

                      {/* FINAL SCORE */}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="text-xl font-bold leading-none text-white">{formatPercent(employee.final_score)}</span>

                        <span
                          className="rounded-full px-2 py-1 text-[8px] font-bold"
                          style={{
                            color: scoreColor.text,
                            backgroundColor: scoreColor.background,
                          }}
                        >
                          {employee.predicate}
                        </span>

                        {change !== null && (
                          <span className={`text-[9px] font-semibold ${change > 0 ? "text-[#36B99A]" : change < 0 ? "text-red-400" : "text-[#A9B8CE]"}`}>
                            {change > 0 ? "▲" : change < 0 ? "▼" : "–"} {Math.abs(change).toFixed(1).replace(".", ",")} poin
                          </span>
                        )}
                      </div>

                      {/* PERFECT PARAMETERS */}
                      <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#34445D] pt-2.5">
                        <span className="text-[9px] text-[#A9B8CE]">Parameter sempurna</span>
                        <span
                          className="rounded-md px-2 py-1 text-[10px] font-bold"
                          style={{
                            color: rank.badge,
                            backgroundColor: `${rank.badge}18`,
                          }}
                        >
                          {perfectCount}/6
                        </span>
                      </div>

                      {/* PAYROLL INFORMATION */}
                      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                        <span className="text-[9px] text-[#A9B8CE]">{toNumber(employee.late_frequency)}× terlambat</span>

                        <span className="text-[9px] text-[#A9B8CE]">
                          {toNumber(employee.incorrect_payroll)} salah dari {toNumber(employee.total_payroll_processed).toLocaleString("id-ID")} data payroll
                        </span>
                      </div>
                    </div>
                  );
                })}

                {!topThreePerformers.length && <div className="col-span-full rounded-lg border border-[#34445D] p-5 text-center text-xs text-[#A9B8CE]">Belum ada data Top 3 PIC untuk periode ini.</div>}
              </div>

              {/* KETERANGAN */}
              <p className="mt-3 border-t border-[#34445D] pt-2.5 text-[9px] leading-relaxed text-[#A9B8CE]">
                <span className="font-semibold text-white">Keterangan:</span> Skor sempurna menunjukkan jumlah parameter dengan nilai 100%. Perubahan nilai menunjukkan selisih Final Score dibandingkan periode sebelumnya. Keduanya merupakan
                informasi pendukung, bukan penentu peringkat.
              </p>
            </div>
          </section>

          {/* TOP 5 LEFT + EMPLOYEE DETAIL RIGHT */}
          <div className="grid min-w-0 grid-cols-1 items-stretch gap-3 sm:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)]">
            <Card className="min-w-0 p-2.5 sm:p-3">
              <SectionTitle title="Peringkat 5 Besar PIC" description="Berdasarkan nilai akhir pada periode terpilih · klik nama untuk melihat rincian" />
              <div className="space-y-2">
                {topPerformers.map((employee, index) => {
                  const isSelected = selectedEmployee?.employee_name === employee.employee_name;
                  const score = toPercent(employee.final_score);
                  const scoreColor = getScoreColor(score);
                  return (
                    <button
                      key={employee.employee_name}
                      onClick={() => setSelectedEmployee(employee)}
                      className={`flex w-full items-center gap-1.5 rounded-lg border p-2 text-left transition ${isSelected ? "border-[#36B99A]/60 bg-[#36B99A]/10" : "border-[#34445D] bg-[#172A44] hover:border-[#52708F] hover:bg-[#233B59]"}`}
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#34445D] bg-[#263750] text-[10px] font-bold text-[#A9B8CE]">{index + 1}</div>

                      <EmployeeAvatar name={employee.employee_name} imageUrl={employee.image_url} className="h-9 w-9 rounded-full border border-[#34445D]" />

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[10px] font-semibold text-white">{employee.employee_name}</p>
                        <p className="mt-0.5 truncate text-[9px] text-[#A9B8CE]">
                          {employee.position || "Payroll"} · {employee.unit_name}
                        </p>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#34445D]">
                          <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(0, Math.min(100, score))}%`, backgroundColor: scoreColor.text }} />
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[9px] font-semibold text-white">{formatPercent(employee.final_score)}</p>
                        <span className="mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[8px] font-semibold" style={{ color: scoreColor.text, backgroundColor: scoreColor.background }}>
                          {employee.predicate}
                        </span>
                      </div>
                    </button>
                  );
                })}
                {!topPerformers.length && <p className="py-8 text-center text-xs text-[#A9B8CE]">Belum ada data ranking.</p>}
              </div>
            </Card>

            <Card className="min-w-0 p-2.5 sm:p-3">
              <SectionTitle
                title="Rincian PIC"
                description="Skor setiap parameter dibandingkan dengan rata-rata seluruh tim"
                action={selectedEmployee ? <span className="rounded-full border border-[#34445D] bg-[#101D35] px-2 py-1 text-[9px] text-[#A9B8CE]">{selectedEmployee.unit_name}</span> : undefined}
              />
              {selectedEmployee ? (
                <>
                  <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-[#34445D] bg-[#101D35] p-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <EmployeeAvatar name={selectedEmployee.employee_name} imageUrl={selectedEmployee.image_url} className="h-10 w-10 rounded-xl border border-[#34445D]" />

                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-white">{selectedEmployee.employee_name}</p>
                        <p className="mt-0.5 truncate text-[9px] text-[#A9B8CE]">
                          {selectedEmployee.position || "Payroll"} · {selectedEmployee.unit_name} · {assessments.length && assessments[0].period_month === "ALL" ? "Semua Periode" : formatMonth(selectedPeriod)}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-semibold text-[#36B99A]">{formatPercent(selectedEmployee.final_score)}</p>
                      <p className="text-[9px] text-[#A9B8CE]">{selectedEmployee.predicate}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {PARAMETERS.map((parameter) => {
                      const score = Math.max(0, Math.min(100, toPercent(selectedEmployee[parameter.scoreKey])));
                      const teamAverage = dashboardAssessments.length ? dashboardAssessments.reduce((sum, item) => sum + toPercent(item[parameter.scoreKey]), 0) / dashboardAssessments.length : 0;
                      const color = score >= 90 ? "#36B99A" : score >= 70 ? "#D49A42" : "#C17A25";
                      return (
                        <div key={parameter.key} className="grid grid-cols-[104px_minmax(0,1fr)_112px] items-center gap-2">
                          <p className="text-[8px] sm:text-[9px] font-medium text-[#DCE6F2]">{parameter.label}</p>
                          <div className="relative h-3 overflow-visible rounded-full bg-[#34445D]">
                            <div className="absolute left-0 top-0 h-3 rounded-full transition-all duration-500" style={{ width: `${score}%`, backgroundColor: color }} />
                            <div className="absolute -top-1 h-5 w-[2px] rounded-full bg-[#DCE6F2]/80" style={{ left: `${Math.max(0, Math.min(100, teamAverage))}%` }} title={`Rata-rata tim ${teamAverage.toFixed(2).replace(".", ",")}%`} />
                          </div>
                          <div className="text-right">
                            <span className="text-[8px] sm:text-[9px] font-semibold text-white">{score.toFixed(2).replace(".", ",")}%</span>
                            <span className="ml-0.5 text-[7px] sm:text-[8px] text-[#A9B8CE]">{formatRawValue(parameter.key, selectedEmployee)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#34445D] pt-3">
                    <div className="flex items-center gap-2 text-[9px] text-[#A9B8CE]">
                      <span className="h-2 w-2 rounded-full bg-[#36B99A]" /> Skor PIC <span className="ml-2 h-3 w-[2px] bg-[#DCE6F2]" /> Rata-rata seluruh tim
                    </div>
                    <p className="text-[9px] text-[#A9B8CE]">Bobot penilaian mengikuti parameter</p>
                  </div>
                </>
              ) : (
                <div className="py-10 text-center text-xs text-[#A9B8CE]">Pilih PIC dari daftar peringkat untuk melihat rincian.</div>
              )}
            </Card>
          </div>

          {/* MANAGEMENT FINDINGS */}
          <section>
            <SectionTitle
              title="Temuan untuk Management"
              description={`Ringkasan evaluasi performa · ${
                selectedMonth === "All" && selectedYear === "All"
                  ? "Semua Periode"
                  : selectedMonth === "All"
                    ? `Seluruh Bulan ${selectedYear}`
                    : `${MONTHS[Number(selectedMonth) - 1]} ${selectedYear === "All" ? "Semua Tahun" : selectedYear}`
              }`}
            />

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {/* 1. POSISI PERFORMA TIM */}
              <Card className="border-l-[3px] border-l-[#36B99A] bg-[#1B2940] p-3">
                <div className="flex items-center gap-2">
                  <TrendingUp size={14} className="text-[#36B99A]" />
                  <p className="text-[11px] font-semibold text-white">Posisi Performa Tim</p>
                </div>

                <div className="mt-2 flex items-center justify-between gap-2">
                  <h3 className="text-xl font-bold text-white">{averageFinalScore.toFixed(2).replace(".", ",")}%</h3>
                  <span className="rounded-full bg-[#36B99A]/10 px-2 py-0.5 text-[9px] text-[#36B99A]">{dashboardAssessments.length > 0 ? getScoreColor(averageFinalScore).label : "-"}</span>
                </div>

                <p className="mt-2 text-[10px] text-[#A9B8CE]">
                  {belowTargetPICCount} dari {totalPIC} PIC memiliki Final Score di bawah 80%.
                </p>

                <p className="mt-2 text-[10px] font-semibold text-white">Aksi: evaluasi PIC yang belum mencapai target performa.</p>
              </Card>

              {/* 2. PIC PERLU PERHATIAN */}
              <Card className="border-l-[3px] border-l-red-400 bg-[#1B2940] p-3">
                <div className="flex items-center gap-2">
                  <Target size={14} className="text-red-400" />
                  <p className="text-[11px] font-semibold text-white">PIC Perlu Perhatian</p>
                </div>

                {lowestEmployee ? (
                  <>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <h3 className="truncate text-sm font-semibold text-white">{lowestEmployee.employee_name}</h3>
                      <span className="shrink-0 text-base font-bold text-red-300">{formatPercent(lowestEmployee.final_score)}</span>
                    </div>

                    <p className="mt-1 text-[10px] text-[#A9B8CE]">
                      {lowestEmployee.unit_name} · {lowestEmployee.predicate}
                    </p>

                    <button onClick={() => setSelectedEmployee(lowestEmployee)} className="mt-2 text-[10px] font-semibold text-[#36B99A] hover:underline">
                      Lihat rincian PIC →
                    </button>
                  </>
                ) : (
                  <p className="mt-3 text-[10px] text-[#A9B8CE]">Belum tersedia data PIC.</p>
                )}
              </Card>

              {/* 3. PERUBAHAN TERBESAR */}
              <Card className="border-l-[3px] border-l-red-400 bg-[#1B2940] p-3">
                <div className="flex items-center gap-2">
                  <TrendingDown size={14} className="text-red-400" />
                  <p className="text-[11px] font-semibold text-white">Perubahan Terbesar</p>
                </div>

                {biggestDecrease && biggestIncrease ? (
                  <>
                    <p className="mt-2 text-[10px] text-[#A9B8CE]">Penurunan terbesar</p>
                    <p className="text-xs font-semibold text-red-300">
                      {biggestDecrease.employee_name} ({biggestDecrease.change.toFixed(2).replace(".", ",")} poin)
                    </p>

                    <p className="mt-2 text-[10px] text-[#A9B8CE]">Peningkatan terbesar</p>
                    <p className="text-xs font-semibold text-[#36B99A]">
                      {biggestIncrease.employee_name} (+
                      {biggestIncrease.change.toFixed(2).replace(".", ",")} poin)
                    </p>

                    <p className="mt-2 text-[10px] font-semibold text-white">Aksi: evaluasi penyebab perubahan performa PIC.</p>
                  </>
                ) : (
                  <p className="mt-3 text-[10px] text-[#A9B8CE]">Perbandingan tersedia jika satu bulan dan tahun dipilih serta data bulan sebelumnya tersedia.</p>
                )}
              </Card>

              {/* 4. PARAMETER INTI TERLEMAH */}
              <Card className="border-l-[3px] border-l-amber-400 bg-[#1B2940] p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className="text-amber-300" />
                  <p className="text-[11px] font-semibold text-white">Parameter Inti Terlemah</p>
                </div>

                {weakestParameter ? (
                  <>
                    <h3 className="mt-2 text-sm font-semibold text-white">{weakestParameter.label}</h3>

                    <h3 className="mt-1 text-xl font-bold text-amber-300">{weakestParameter.average.toFixed(2).replace(".", ",")}%</h3>

                    <p className="mt-2 text-[10px] text-[#A9B8CE]">Rata-rata skor parameter dari seluruh PIC.</p>

                    <p className="mt-2 text-[10px] font-semibold text-white">Aksi: fokuskan evaluasi dan peningkatan pada parameter ini.</p>
                  </>
                ) : (
                  <p className="mt-3 text-[10px] text-[#A9B8CE]">Belum tersedia data penilaian.</p>
                )}
              </Card>

              {/* 5. CATATAN ABSENSI */}
              <Card className="border-l-[3px] border-l-red-400 bg-[#1B2940] p-3">
                <div className="flex items-center gap-2">
                  <Clock3 size={14} className="text-red-300" />
                  <p className="text-[11px] font-semibold text-white">Catatan Absensi</p>
                </div>

                {highestLatePIC ? (
                  <>
                    <h3 className="mt-2 truncate text-sm font-semibold text-white">{highestLatePIC.employee_name}</h3>

                    <p className="mt-1 text-[10px] text-[#A9B8CE]">
                      Tercatat {toNumber(highestLatePIC.late_frequency)} kali terlambat · {highestLatePIC.unit_name}
                    </p>

                    <p className="mt-2 text-[10px] font-semibold text-white">Aksi: tinjau catatan keterlambatan dan validasi data absensi.</p>
                  </>
                ) : (
                  <p className="mt-3 text-[10px] text-[#A9B8CE]">Belum tersedia data keterlambatan.</p>
                )}
              </Card>

              {/* 6. KESALAHAN PAYROLL TERPUSAT */}
              <Card className="border-l-[3px] border-l-amber-400 bg-[#1B2940] p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className="text-amber-300" />
                  <p className="text-[11px] font-semibold text-white">Kesalahan Payroll Terpusat</p>
                </div>

                {highestErrorPIC && totalPayrollErrors > 0 ? (
                  <>
                    <h3 className="mt-2 truncate text-sm font-semibold text-white">{highestErrorPIC.employee_name}</h3>

                    <p className="mt-1 text-[10px] text-[#A9B8CE]">
                      {toNumber(highestErrorPIC.incorrect_payroll)} kesalahan · {highestErrorContribution.toFixed(1).replace(".", ",")}% dari total {totalPayrollErrors} kesalahan.
                    </p>

                    <p className="mt-2 text-[10px] font-semibold text-white">Aksi: evaluasi penyebab kesalahan dan lakukan pengecekan proses payroll.</p>
                  </>
                ) : (
                  <p className="mt-3 text-[10px] text-[#A9B8CE]">Belum tersedia data kesalahan payroll.</p>
                )}
              </Card>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default TeamPerformance;
