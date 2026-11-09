import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, ChevronDown, Database, FileSpreadsheet, LoaderCircle, ShieldAlert, UploadCloud, X, RotateCcw, Table2, ScanSearch, DatabaseZap, FileCheck2 } from "lucide-react";

import { payrollApi, type DataManagementTable, type PayrollImportPreviewResponse, type PayrollImportResultResponse } from "../../services/api";

type Stage = "idle" | "preview" | "done";

const theme = {
  panel: "border-[#22314b] bg-[#111c30]",
  input: "border-[#2b3b56] bg-[#0b1424] text-slate-200",
  muted: "text-slate-400",
  blue: "text-blue-400",
  button: "bg-blue-500 hover:bg-blue-600 text-white",
};

function asRows(preview: PayrollImportPreviewResponse | null): Record<string, unknown>[] {
  return Array.isArray(preview?.preview) ? preview.preview.filter((row): row is Record<string, unknown> => !!row && typeof row === "object" && !Array.isArray(row)) : [];
}

function cell(value: unknown): string {
  return value == null || value === "" ? "—" : typeof value === "object" ? JSON.stringify(value) : String(value);
}

export default function ImportPayroll() {
  const [file, setFile] = useState<File | null>(null);
  const [tables, setTables] = useState<DataManagementTable[]>([]);
  const [selectedTable, setSelectedTable] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [preview, setPreview] = useState<PayrollImportPreviewResponse | null>(null);
  const [result, setResult] = useState<PayrollImportResultResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<"validate" | "confirm" | null>(null);
  const [loadingTables, setLoadingTables] = useState(true);
  const [connection, setConnection] = useState<"checking" | "connected" | "error">("checking");
  const [isDragging, setIsDragging] = useState(false);
  const [tableDropdownOpen, setTableDropdownOpen] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const rows = useMemo(() => asRows(preview), [preview]);

  const columns = useMemo(() => (preview?.columns?.length ? preview.columns : preview?.column_names?.length ? preview.column_names : rows[0] ? Object.keys(rows[0]) : []), [preview, rows]);

  const selectedLabel = tables.find((table) => table.table_name === selectedTable)?.label ?? selectedTable;

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const [_, response] = await Promise.all([payrollApi.health(), payrollApi.getManagementTables()]);

        if (!cancelled) {
          setConnection("connected");
          setTables(response.tables);
          setSelectedTable(response.tables[0]?.table_name ?? "");
        }
      } catch (err) {
        if (!cancelled) {
          setConnection("error");
          setError(err instanceof Error ? err.message : "Gagal memuat daftar tabel.");
        }
      } finally {
        if (!cancelled) setLoadingTables(false);
      }
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, []);

  function selectFile(nextFile: File | null) {
    if (nextFile && !/\.(csv|xlsx)$/i.test(nextFile.name)) {
      setError("Format file belum didukung. Gunakan file .csv atau .xlsx.");
      return;
    }

    setFile(nextFile);
    setStage("idle");
    setPreview(null);
    setResult(null);
    setError("");
  }

  function reset(clearFile = true) {
    if (loading) return;
    if (clearFile) setFile(null);

    setStage("idle");
    setPreview(null);
    setResult(null);
    setError("");
    setIsDragging(false);
    setTableDropdownOpen(false);
    setShowConfirmation(false);
  }

  async function loadPreview(fileToUse: File, tableName: string) {
    if (loading) return;
    setLoading(true);
    setLoadingAction("validate");
    setError("");
    setStage("idle");
    setPreview(null);
    setResult(null);

    try {
      const response = await payrollApi.previewTable(fileToUse, tableName);

      setPreview(response);
      setStage("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Validasi file gagal.");
    } finally {
      setLoading(false);
      setLoadingAction(null);
    }
  }

  function changeTable(tableName: string) {
    setSelectedTable(tableName);
    setPreview(null);
    setResult(null);
    setStage("idle");
    setError("");
    setShowConfirmation(false);
    // Validasi dan preview hanya dijalankan setelah tombol diklik.
  }

  function confirmImport() {
    if (!file || !selectedTable || loading) return;
    setShowConfirmation(true);
  }

  async function executeImport() {
    if (!file || !selectedTable) return;

    setLoading(true);
    setLoadingAction("confirm");
    setError("");

    try {
      const response = await payrollApi.confirmTable(file, selectedTable);

      setResult(response);
      setStage("done");
      setShowConfirmation(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import gagal.");
      setShowConfirmation(false);
    } finally {
      setLoading(false);
      setLoadingAction(null);
    }
  }

  const canPreview = !!file && !!selectedTable && !loading && !loadingTables && stage !== "done";

  const canConfirm = !loading && !!file && !!selectedTable && preview?.status !== "error" && !preview?.errors?.length;

  return (
    <div className="mx-auto min-w-0 max-w-[1600px] space-y-2.5 text-[11px] text-slate-200">
      <style>{`
        @keyframes importFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      {/* HEADER */}
      <header className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div className="space-y-0">
          <p className="text-[10px] font-semibold leading-3 tracking-wide text-blue-300">PAYROLL OPERATIONS</p>
          <h1 className="mt-0.5 text-base font-bold leading-5 tracking-tight text-slate-100">Import Payroll Data</h1>
          <p className="mt-0.5 max-w-2xl text-[11px] leading-4 text-slate-400">Upload file, pilih tabel tujuan, lalu periksa preview sebelum mengganti data.</p>
        </div>

        {/* DATABASE STATUS */}
        <div
          className={`inline-flex w-fit items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] ${
            connection === "connected" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : connection === "error" ? "border-red-500/20 bg-red-500/10 text-red-400" : "border-amber-500/20 bg-amber-500/10 text-amber-400"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${connection === "connected" ? "bg-emerald-400" : connection === "error" ? "bg-red-400" : "animate-pulse bg-amber-400"}`} />

          {connection === "connected" ? "Database terhubung" : connection === "error" ? "Database bermasalah" : "Memeriksa database"}
        </div>
      </header>

      {/* UPLOAD PANEL */}
      <section className={`space-y-2.5 rounded-xl border p-3 sm:p-3 ${theme.panel}`}>
        {/* SECTION TITLE */}
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-blue-400/20 bg-blue-500/10 text-blue-400">
            <FileSpreadsheet size={14} />
          </div>

          <div>
            <h2 className="text-xs font-semibold text-slate-100">Pilih file dan tabel tujuan</h2>
            <p className="mt-0.5 text-[10px] text-slate-400">File yang sama dapat digunakan untuk tabel tujuan yang berbeda.</p>
          </div>
        </div>

        {/* FILE AND TABLE */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.15fr_0.95fr]">
          {/* FILE UPLOAD */}
          <div className="min-w-0">
            <label className="mb-1.5 block text-[11px] font-medium text-slate-300">File CSV atau Excel</label>

            <label
              onDragOver={(e) => {
                e.preventDefault();
                if (!loading && stage !== "done") {
                  setIsDragging(true);
                }
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);

                if (!loading && stage !== "done") {
                  selectFile(e.dataTransfer.files?.[0] ?? null);
                }
              }}
              className={`group relative flex min-h-[230px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed px-3 py-5 text-center transition-all duration-200 ${
                isDragging ? "border-blue-400 bg-blue-500/15 ring-2 ring-blue-500/20" : file ? "border-blue-400/50 bg-blue-500/[0.08]" : "border-[#344661] bg-[#0b1424] hover:border-blue-400/60 hover:bg-blue-500/[0.06]"
              } ${loading || stage === "done" ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <input
                type="file"
                accept=".csv,.xlsx"
                disabled={loading || stage === "done"}
                onChange={(e) => {
                  selectFile(e.target.files?.[0] ?? null);
                  e.currentTarget.value = "";
                }}
                className="sr-only"
              />

              {file ? (
                <>
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg border border-blue-400/20 bg-blue-500/10 text-blue-400 transition-transform group-hover:scale-105">
                    <FileCheck2 size={18} />
                  </div>

                  <span className="max-w-full break-all text-[11px] font-semibold text-blue-200">{file.name}</span>

                  <span className="mt-1 text-[11px] text-slate-400">
                    {(file.size / 1024).toLocaleString("id-ID", {
                      maximumFractionDigits: 1,
                    })}{" "}
                    KB · Klik untuk mengganti file
                  </span>

                  <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400">
                    <CheckCircle2 size={12} />
                    File siap divalidasi
                  </span>
                </>
              ) : (
                <>
                  <div
                    className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg border transition-all ${
                      isDragging ? "border-blue-400/40 bg-blue-500/20 text-blue-300" : "border-[#30435f] bg-[#17243a] text-blue-400 group-hover:border-blue-400/40 group-hover:bg-blue-500/10"
                    }`}
                  >
                    <UploadCloud size={18} />
                  </div>

                  <span className="text-[11px] font-semibold text-slate-200">{isDragging ? "Lepaskan file untuk mengunggah" : "Tarik file ke sini atau klik untuk memilih"}</span>

                  <span className="mt-1 text-[10px] text-slate-500">Format yang didukung: .CSV dan .XLSX</span>
                </>
              )}
            </label>

            {file && stage !== "done" && (
              <button type="button" onClick={() => selectFile(null)} className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-slate-400 transition-colors hover:text-red-400">
                <X size={12} />
                Hapus file
              </button>
            )}
          </div>

          {/* TABLE SELECTOR */}
          <div className="min-w-0">
            <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-slate-300">
              <Table2 size={14} className="text-blue-400" />
              Tabel tujuan
            </label>

            <div className="relative">
              <button
                type="button"
                disabled={loadingTables || loading || stage === "done" || tables.length === 0}
                aria-haspopup="listbox"
                aria-expanded={tableDropdownOpen}
                onClick={() => setTableDropdownOpen((open) => !open)}
                className={`flex min-h-9 w-full items-center justify-between gap-3 rounded-lg border px-2.5 py-1.5 text-left text-[11px] transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 ${
                  tableDropdownOpen ? "border-blue-400 bg-[#172943] ring-2 ring-blue-500/10" : "border-[#30415c] bg-[#0b1424] hover:border-blue-400/60"
                }`}
              >
                <span className="min-w-0 truncate font-medium text-slate-200">{loadingTables ? "Memuat tabel..." : tables.length === 0 ? "Tidak ada tabel tersedia" : selectedLabel.toUpperCase()}</span>

                <ChevronDown size={15} className={`shrink-0 text-slate-400 transition-transform duration-200 ${tableDropdownOpen ? "rotate-180 text-blue-400" : ""}`} />
              </button>

              {tableDropdownOpen && !loadingTables && tables.length > 0 && (
                <>
                  <button type="button" aria-label="Tutup daftar tabel" className="fixed inset-0 z-10 cursor-default" onClick={() => setTableDropdownOpen(false)} />

                  <ul role="listbox" aria-label="Pilih tabel tujuan" className="absolute z-20 mt-1.5 max-h-52 w-full overflow-y-auto rounded-lg border border-[#30415c] bg-[#111c30] p-1.5 shadow-xl shadow-black/30">
                    {tables.map((table) => {
                      const isSelected = table.table_name === selectedTable;

                      return (
                        <li key={table.table_name} role="option" aria-selected={isSelected}>
                          <button
                            type="button"
                            onClick={() => {
                              setTableDropdownOpen(false);

                              if (table.table_name !== selectedTable) {
                                void changeTable(table.table_name);
                              }
                            }}
                            className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-[11px] transition-colors ${
                              isSelected ? "bg-blue-500/15 font-semibold text-blue-200" : "text-slate-300 hover:bg-[#1c2b42] hover:text-white"
                            }`}
                          >
                            <span className="min-w-0 truncate">
                              {table.label}
                              <span className="ml-1 text-[10px] text-slate-500">({table.table_name})</span>
                            </span>

                            {isSelected && <CheckCircle2 size={14} className="shrink-0 text-blue-400" />}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>

            <p className="mt-1 text-[10px] text-slate-500">Hanya tabel yang dipilih yang akan diganti.</p>

            {selectedTable && (
              <div className="mt-2 flex items-start gap-2 rounded-lg border border-blue-400/20 bg-blue-500/[0.07] px-2.5 py-2">
                <Database size={14} className="mt-0.5 shrink-0 text-blue-400" />

                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400">Tujuan saat ini</p>
                  <p className="mt-0.5 break-words text-[11px] font-semibold text-blue-200">{selectedLabel}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex flex-wrap items-center gap-2 border-t border-[#26364f] pt-2.5">
          <button
            type="button"
            disabled={!canPreview}
            onClick={() => {
              if (file) void loadPreview(file, selectedTable);
            }}
            className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[11px] font-semibold shadow-sm transition-all duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${theme.button}`}
          >
            {loading && loadingAction === "validate" ? <LoaderCircle size={14} className="animate-spin" /> : <ScanSearch size={14} />}
            {loading && loadingAction === "validate" ? "Memvalidasi file..." : "Validasi & Preview"}
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => reset(true)}
            className="group inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#30415c] bg-[#172338] px-2.5 text-[11px] font-medium text-slate-300 transition-all duration-200 hover:-translate-y-0.5 hover:border-rose-400/50 hover:bg-rose-500/10 hover:text-rose-200 active:translate-y-0 disabled:opacity-40"
          >
            <RotateCcw size={13} className="transition-transform duration-500 group-hover:-rotate-180" />
            Reset
          </button>

          {file && <span className="ml-auto text-[10px] text-slate-500">File sudah dipilih</span>}
        </div>
      </section>

      {/* ERROR MESSAGE */}
      {error && (
        <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-red-500/25 bg-red-500/[0.08] p-3 text-xs text-red-300">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />

          <div className="min-w-0">
            <p className="font-semibold text-red-200">Operasi gagal</p>
            <p className="mt-1 break-words leading-5">{error}</p>
          </div>

          <button type="button" aria-label="Tutup pesan error" onClick={() => setError("")} className="ml-auto rounded p-1 text-red-300/70 transition-colors hover:bg-red-500/10 hover:text-red-200">
            <X size={14} />
          </button>
        </div>
      )}

      {/* PREVIEW */}
      {stage === "preview" && preview && (
        <section className="space-y-3" style={{ animation: "importFadeIn 260ms ease-out both" }}>
          <div className={`space-y-2.5 rounded-xl border p-3 ${theme.panel}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <FileCheck2 size={16} className="text-blue-400" />
                  <h2 className="text-xs font-semibold text-slate-100">Preview Data Import</h2>
                </div>

                <p className="mt-1 text-[11px] text-slate-400">
                  File: <strong className="text-slate-300">{file?.name}</strong>
                  {" · "}
                  Tabel: <strong className="text-slate-300">{selectedLabel}</strong>
                </p>
              </div>

              <span className="rounded-md border border-emerald-400/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-400">Preview tersedia</span>
            </div>

            {/* SUMMARY */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="rounded-lg border border-[#2a3a54] bg-[#0b1424] p-3">
                <p className="text-[11px] text-slate-400">Total baris</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-slate-100">{(preview.total_rows ?? rows.length).toLocaleString("id-ID")}</p>
              </div>

              <div className="rounded-lg border border-[#2a3a54] bg-[#0b1424] p-3">
                <p className="text-[11px] text-slate-400">Total kolom</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-slate-100">{(preview.total_columns ?? columns.length).toLocaleString("id-ID")}</p>
              </div>

              <div className="rounded-lg border border-[#2a3a54] bg-[#0b1424] p-3">
                <p className="text-[11px] text-slate-400">Status</p>
                <p className="mt-1 text-sm font-semibold text-emerald-400">{preview.status ?? "Preview tersedia"}</p>
              </div>
            </div>

            {preview.message && <p className="rounded-lg border border-[#2a3a54] bg-[#0b1424] p-2.5 text-xs text-slate-300">{preview.message}</p>}

            {/* VALIDATION ERRORS */}
            {!!preview.errors?.length && (
              <div className="rounded-lg border border-red-500/25 bg-red-500/[0.07] p-3 text-xs text-red-300">
                <p className="flex items-center gap-2 font-semibold text-red-200">
                  <AlertCircle size={14} />
                  Validasi gagal
                </p>

                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {preview.errors.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* PREVIEW TABLE */}
            {rows.length > 0 && columns.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-[#2a3a54]">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2a3a54] bg-[#17243a] px-3 py-2">
                  <p className="text-[11px] text-slate-300">
                    Contoh <strong className="text-blue-300">{Math.min(rows.length, 10)}</strong> baris pertama
                  </p>

                  <span className="text-[10px] text-slate-500">Scroll untuk melihat kolom lainnya</span>
                </div>

                <div className="max-h-[320px] overflow-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead className="sticky top-0 z-[1] bg-[#1b2a41]">
                      <tr>
                        <th className="sticky left-0 border-b border-[#344660] bg-[#1b2a41] px-2.5 py-2 text-[10px] font-semibold text-slate-300">No.</th>

                        {columns.map((column) => (
                          <th key={column} className="whitespace-nowrap border-b border-[#344660] px-2.5 py-2 text-[10px] font-semibold text-slate-300">
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {rows.slice(0, 10).map((row, i) => (
                        <tr key={i} className={`transition-colors hover:bg-blue-500/[0.06] ${i % 2 ? "bg-[#111c30]" : "bg-[#0e192a]"}`}>
                          <td className={`sticky left-0 border-b border-[#25354d] px-3 py-2 text-[10px] text-slate-500 ${i % 2 ? "bg-[#111c30]" : "bg-[#0e192a]"}`}>{i + 1}</td>

                          {columns.map((column) => (
                            <td key={column} title={cell(row[column])} className="max-w-xs whitespace-nowrap border-b border-[#25354d] px-2.5 py-1.5 text-[11px] text-slate-300">
                              <div className="max-w-[200px] truncate">{cell(row[column])}</div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="rounded-lg border border-amber-400/20 bg-amber-500/[0.07] p-3 text-xs text-amber-300">Sample data tidak tersedia. Periksa respons validasi backend.</p>
            )}
          </div>

          {/* CONFIRM WARNING */}
          <div className="flex items-start gap-2.5 rounded-lg border border-amber-400/20 bg-amber-500/[0.07] p-3 text-xs text-amber-200">
            <ShieldAlert size={17} className="mt-0.5 shrink-0 text-amber-400" />
            <p className="leading-5">
              Data lama pada tabel <strong>{selectedLabel}</strong> akan diganti setelah konfirmasi. Tabel lainnya tidak diubah.
            </p>
          </div>

          <button
            type="button"
            disabled={!canConfirm}
            onClick={confirmImport}
            className="group inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-400/25 bg-emerald-500 px-3 text-[11px] font-semibold text-white shadow-sm shadow-emerald-950/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-400 hover:shadow-md hover:shadow-emerald-950/30 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <DatabaseZap size={14} className="transition-transform duration-200 group-hover:scale-110" />
            Konfirmasi Import
          </button>
        </section>
      )}

      {/* IMPORT SUCCESS */}
      {stage === "done" && (
        <section className="rounded-xl border border-emerald-500/25 bg-[#111c30] p-3">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-400/20 bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 size={20} />
            </div>

            <div className="min-w-0">
              <h2 className="text-xs font-semibold text-emerald-300">Import berhasil</h2>

              <p className="mt-1 text-xs text-slate-400">
                Tabel tujuan: <strong className="text-slate-200">{result?.table_name ?? result?.table ?? selectedTable}</strong>
              </p>
            </div>
          </div>

          <p className="mt-2 text-[11px] leading-4 text-slate-300">{result?.message ?? `Import ke ${selectedLabel} berhasil.`}</p>

          <button
            type="button"
            onClick={() => reset(false)}
            className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-lg border border-blue-400/30 bg-blue-500/10 px-3 text-xs font-semibold text-blue-300 transition-colors hover:border-blue-400/50 hover:bg-blue-500/20 hover:text-blue-200"
          >
            <RotateCcw size={13} />
            Pilih Tabel Lain dengan File yang Sama
          </button>

          <p className="mt-2 text-[10px] text-slate-500">File tetap tersimpan. Pilih tabel baru untuk membuat preview berikutnya.</p>
        </section>
      )}

      {/* CONFIRMATION MODAL */}
      {showConfirmation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-3 py-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !loading) {
              setShowConfirmation(false);
            }
          }}
        >
          <section role="dialog" aria-modal="true" aria-labelledby="import-confirmation-title" className="w-full max-w-md overflow-hidden rounded-xl border border-[#344762] bg-[#111c30] shadow-2xl shadow-black/40">
            {/* MODAL HEADER */}
            <div className="flex items-start gap-3 border-b border-[#293a53] px-3 py-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-blue-400/20 bg-blue-500/10 text-blue-400">
                <ShieldAlert size={18} />
              </div>

              <div className="min-w-0 flex-1">
                <h2 id="import-confirmation-title" className="text-sm font-semibold text-slate-100">
                  Konfirmasi Import Data
                </h2>

                <p className="mt-1 text-[11px] text-slate-400">Periksa kembali tabel tujuan sebelum melanjutkan.</p>
              </div>

              <button
                type="button"
                aria-label="Tutup dialog"
                disabled={loading}
                onClick={() => setShowConfirmation(false)}
                className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-[#26364e] hover:text-white disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>

            {/* MODAL CONTENT */}
            <div className="space-y-2.5 px-3 py-3">
              <div className="rounded-lg border border-blue-400/20 bg-blue-500/[0.08] px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-400">Tabel tujuan</p>

                <p className="mt-1 break-words text-xs font-semibold text-blue-100">{selectedLabel}</p>

                <p className="mt-0.5 break-all text-[11px] text-slate-400">{selectedTable}</p>
              </div>

              <p className="text-[11px] leading-4 text-slate-300">Seluruh data lama pada tabel ini akan diganti dengan data dari file yang dipilih. Tabel lain tidak akan diubah.</p>

              <div className="flex items-start gap-2 rounded-lg border border-amber-400/20 bg-amber-500/[0.07] px-2.5 py-2">
                <ShieldAlert size={14} className="mt-0.5 shrink-0 text-amber-400" />

                <p className="text-[11px] leading-5 text-amber-200">Pastikan file dan tabel tujuan sudah benar. Tindakan ini akan mengganti isi tabel yang dipilih.</p>
              </div>
            </div>

            {/* MODAL ACTIONS */}
            <div className="flex flex-col-reverse gap-2 border-t border-[#293a53] bg-[#0d1728] px-3 py-2.5 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={loading}
                onClick={() => setShowConfirmation(false)}
                className="h-8 rounded-lg border border-[#344762] bg-[#17243a] px-3 text-[11px] font-semibold text-slate-300 transition-colors hover:bg-[#22334d] hover:text-white disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={loading || !file || !selectedTable}
                onClick={() => void executeImport()}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-3 text-[11px] font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-400 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading && loadingAction === "confirm" ? <LoaderCircle size={14} className="animate-spin" /> : <DatabaseZap size={14} />}
                {loading && loadingAction === "confirm" ? "Sedang mengimpor data..." : "Ya, Import Data"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
