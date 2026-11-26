import { useEffect, useState, type FormEvent } from "react";
import { AlertCircle, ChevronLeft, ChevronRight, FileUp, History, LoaderCircle, Pencil, PlusCircle, RefreshCw, Search, Trash2 } from "lucide-react";

import { payrollApi, type ActivityLog, type ActivityType, type ActivityStatus } from "../../services/api";

const PAGE_SIZE = 20;

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Waktu tidak tersedia";
  }

  return (
    date.toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }) + " WIB"
  );
}

function activityLabel(type: ActivityType): string {
  const labels: Record<ActivityType, string> = {
    IMPORT: "Import Data",
    CREATE: "Tambah Data",
    UPDATE: "Update Data",
    DELETE: "Hapus Data",
  };

  return labels[type] ?? type;
}

function ActivityIcon({ type }: { type: ActivityType }) {
  const className = "h-3.5 w-3.5";

  switch (type) {
    case "IMPORT":
      return <FileUp className={className} />;
    case "CREATE":
      return <PlusCircle className={className} />;
    case "UPDATE":
      return <Pencil className={className} />;
    case "DELETE":
      return <Trash2 className={className} />;
    default:
      return <History className={className} />;
  }
}

const statusStyles: Record<ActivityStatus, string> = {
  SUCCESS: "bg-emerald-500/10 text-emerald-300 ring-emerald-400/20",
  FAILED: "bg-red-500/10 text-red-300 ring-red-600/20",
};

const statusLabels: Record<ActivityStatus, string> = {
  SUCCESS: "Berhasil",
  FAILED: "Gagal",
};

export default function HistoryPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [activityType, setActivityType] = useState<ActivityType | "">("");

  const [status, setStatus] = useState<ActivityStatus | "">("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadLogs() {
      setLoading(true);
      setError("");

      try {
        const response = await payrollApi.getActivityLogs({
          search,
          activity_type: activityType,
          status,
          page,
          page_size: PAGE_SIZE,
        });

        if (cancelled) return;

        setLogs(response.logs);
        setTotal(response.total);
      } catch (err) {
        if (cancelled) return;

        setError(err instanceof Error ? err.message : "Gagal mengambil riwayat aktivitas.");

        setLogs([]);
        setTotal(0);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadLogs();

    return () => {
      cancelled = true;
    };
  }, [search, activityType, status, page, refreshKey]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function resetFilters() {
    setSearchInput("");
    setSearch("");
    setActivityType("");
    setStatus("");
    setPage(1);
  }

  return (
    <section className="space-y-2.5 text-[11px]">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-0">
          <p className="text-[10px] font-semibold leading-3 tracking-wide text-blue-300">PAYROLL OPERATIONS</p>
          <h1 className="mt-0.5 text-base font-bold leading-5 tracking-tight text-slate-100">Riwayat Pembaruan</h1>
          <p className="mt-0.5 max-w-2xl text-[11px] leading-4 text-slate-400">Catatan aktivitas Import, Create, Update, dan Delete pada database.</p>
        </div>

        <button
          type="button"
          onClick={() => setRefreshKey((value) => value + 1)}
          disabled={loading}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#344661] bg-[#17243a] px-2 py-1 text-[11px] font-medium text-slate-300 shadow-sm transition hover:bg-[#22334d] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Muat ulang
        </button>
      </div>

      {/* Search and filters */}
      <div className="rounded-lg border border-[#253148] bg-[#111827] p-2.5">
        <form onSubmit={submitSearch} className="grid grid-cols-1 gap-1.5 md:grid-cols-[minmax(0,1fr)_140px_140px_auto_auto]">
          {/* Search input */}
          <label className="relative block">
            <span className="sr-only">Cari riwayat aktivitas</span>

            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />

            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Cari tabel, file, atau keterangan..."
              className="w-full rounded-md border border-[#344661] bg-[#0b1424] py-1.5 pl-8 pr-2.5 text-[11px] text-slate-200 placeholder:text-slate-500 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
            />
          </label>

          {/* Activity filter */}
          <select
            value={activityType}
            onChange={(event) => {
              setActivityType(event.target.value as ActivityType | "");
              setPage(1);
            }}
            className="w-full rounded-md border border-[#344661] bg-[#0b1424] px-2 py-1.5 text-[11px] text-slate-200 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">Semua aktivitas</option>
            <option value="IMPORT">Import</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
          </select>

          {/* Status filter */}
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as ActivityStatus | "");
              setPage(1);
            }}
            className="w-full rounded-md border border-[#344661] bg-[#0b1424] px-2 py-1.5 text-[11px] text-slate-200 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">Semua status</option>
            <option value="SUCCESS">Berhasil</option>
            <option value="FAILED">Gagal</option>
          </select>

          <button type="submit" className="rounded-md bg-[#315b91] px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-[#3b6da9]">
            Cari
          </button>

          <button type="button" onClick={resetFilters} className="rounded-md border border-[#344661] bg-[#17243a] px-2.5 py-1.5 text-[11px] font-medium text-slate-300 transition hover:bg-[#22334d]">
            Reset
          </button>
        </form>

        {/* Error message */}
        {error && (
          <div className="mt-2 flex items-start gap-2 rounded-md border border-red-500/25 bg-red-500/[0.08] p-2 text-[11px] text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

            <div>
              <p className="font-semibold text-red-200">Riwayat gagal dimuat</p>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Activity table */}
        <div className="mt-2 overflow-x-auto rounded-md border border-[#253148]">
          <table className="w-full min-w-[760px] border-collapse text-left text-[11px]">
            <thead className="bg-[#17243a] text-[10px] uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-2.5 py-2 font-semibold">Waktu</th>
                <th className="px-2.5 py-2 font-semibold">Aktivitas</th>
                <th className="px-2.5 py-2 font-semibold">Tabel / File</th>
                <th className="px-2.5 py-2 font-semibold">Jumlah data</th>
                <th className="px-2.5 py-2 font-semibold">Status</th>
                <th className="px-2.5 py-2 font-semibold">Keterangan</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#253148]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-2.5 py-6 text-center text-[11px] text-slate-400">
                    <span className="inline-flex items-center gap-2">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Memuat riwayat...
                    </span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-2.5 py-6 text-center">
                    <History className="mx-auto h-5 w-5 text-slate-500" />

                    <p className="mt-1.5 text-[11px] font-medium text-slate-300">Belum ada riwayat aktivitas</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="align-top transition hover:bg-[#1b2b43]/60">
                    {/* Date */}
                    <td className="whitespace-nowrap px-2.5 py-2 text-[10px] text-slate-400">{formatDate(log.created_at)}</td>

                    {/* Activity */}
                    <td className="px-2.5 py-2">
                      <div className="flex items-center gap-1.5 font-medium text-slate-200">
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
                            log.activity_type === "IMPORT"
                              ? "bg-emerald-500/10 text-emerald-300"
                              : log.activity_type === "CREATE"
                                ? "bg-sky-500/10 text-sky-300"
                                : log.activity_type === "UPDATE"
                                  ? "bg-amber-500/10 text-amber-300"
                                  : "bg-red-500/10 text-red-300"
                          }`}
                        >
                          <ActivityIcon type={log.activity_type} />
                        </span>

                        <span className="whitespace-nowrap text-[11px]">{activityLabel(log.activity_type)}</span>
                      </div>
                    </td>

                    {/* Table and file */}
                    <td className="max-w-[200px] px-2.5 py-2">
                      <p className="break-words text-[11px] font-medium text-slate-200">{log.table_name}</p>

                      {log.file_name && <p className="mt-1 break-all text-[10px] text-slate-400">{log.file_name}</p>}
                    </td>

                    {/* Row counts */}
                    <td className="whitespace-nowrap px-2.5 py-2 text-[10px] text-slate-400">
                      <p>Total: {log.total_rows.toLocaleString("id-ID")}</p>

                      <p className="mt-0.5 text-emerald-400">Berhasil: {log.success_rows.toLocaleString("id-ID")}</p>

                      {log.failed_rows > 0 && <p className="mt-0.5 text-red-400">Gagal: {log.failed_rows.toLocaleString("id-ID")}</p>}
                    </td>

                    {/* Status */}
                    <td className="px-2.5 py-2">
                      <span className={`inline-flex whitespace-nowrap rounded-full px-1.5 py-0.5 text-[9px] font-semibold ring-1 ring-inset ${statusStyles[log.status]}`}>{statusLabels[log.status]}</span>
                    </td>

                    {/* Description and errors */}
                    <td className="max-w-[220px] px-2.5 py-2 text-[10px] text-slate-400">
                      <p className="break-words">{log.description || "—"}</p>

                      {log.error_message && <p className="mt-1 break-words text-red-400">{log.error_message}</p>}

                      {log.performed_by && <p className="mt-1 text-[9px] text-slate-400">Oleh: {log.performed_by}</p>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-2 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-slate-400">
            Menampilkan {logs.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min((page - 1) * PAGE_SIZE + logs.length, total)} dari {total.toLocaleString("id-ID")} aktivitas
          </p>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={page <= 1 || loading}
              className="inline-flex items-center gap-1 rounded-md border border-[#344661] bg-[#17243a] px-2 py-1 text-[11px] text-slate-300 transition hover:bg-[#22334d] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Sebelumnya
            </button>

            <span className="whitespace-nowrap px-1 text-[11px] text-slate-400">
              Halaman {page} / {totalPages}
            </span>

            <button
              type="button"
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              disabled={page >= totalPages || loading}
              className="inline-flex items-center gap-1 rounded-md border border-[#344661] bg-[#17243a] px-2 py-1 text-[11px] text-slate-300 transition hover:bg-[#22334d] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Berikutnya
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
