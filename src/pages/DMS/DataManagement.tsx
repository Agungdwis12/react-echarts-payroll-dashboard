import { useEffect, useRef, useState, type FormEvent } from "react";
import { Database, Search, X, RefreshCw, ChevronLeft, ChevronRight, LoaderCircle, AlertCircle, Plus, Pencil, Trash2, ChevronDown } from "lucide-react";

import { payrollApi, type DataManagementTable, type DataManagementRowsResponse, type DataManagementColumn } from "../../services/api";
type FormValues = Record<string, string>;
type DialogMode = "create" | "edit";

function getInputType(column: DataManagementColumn): string {
  const type = column.type.toLowerCase();
  if (type.includes("bool")) return "checkbox";
  if (type.includes("timestamp") || type.includes("time")) return "datetime-local";
  if (type.includes("date")) return "date";
  if (["int", "numeric", "decimal", "double", "real", "float"].some((part) => type.includes(part))) return "number";
  return "text";
}

function getSelectOptions(tableName: string, columnName: string): string[] | null {
  if (tableName.toLowerCase() === "master_bapp_bulanan" && columnName.toLowerCase() === "status_bapp") {
    return ["Not Proses", "On Proses", "Done"];
  }

  return null;
}

function toInputValue(value: unknown, column: DataManagementColumn): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  let result = String(value);
  const type = column.type.toLowerCase();
  if ((type.includes("timestamp") || type.includes("time")) && result) {
    const date = new Date(result);
    if (!Number.isNaN(date.getTime())) result = date.toISOString().slice(0, 16);
    else result = result.slice(0, 16);
  } else if (type.includes("date") && result) {
    result = result.slice(0, 10);
  }
  return result;
}

function buildPayload(columns: DataManagementColumn[], values: FormValues): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const column of columns) {
    if (column.primary_key || column.name.toLowerCase() === "id") continue;
    const raw = values[column.name] ?? "";
    const type = column.type.toLowerCase();
    if (raw.trim() === "") {
      payload[column.name] = null;
    } else if (type.includes("bool")) {
      payload[column.name] = raw === "true";
    } else if (["int", "numeric", "decimal", "double", "real", "float"].some((part) => type.includes(part))) {
      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) throw new Error(`Kolom ${column.name} harus berupa angka.`);
      payload[column.name] = parsed;
    } else {
      payload[column.name] = raw;
    }
  }
  return payload;
}

export default function DataManagement() {
  const [tables, setTables] = useState<DataManagementTable[]>([]);
  const [selectedTable, setSelectedTable] = useState("");
  const [data, setData] = useState<DataManagementRowsResponse | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [loadingTables, setLoadingTables] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dialogMode, setDialogMode] = useState<DialogMode | null>(null);
  const [editingRow, setEditingRow] = useState<Record<string, unknown> | null>(null);
  const [formValues, setFormValues] = useState<FormValues>({});
  const [saving, setSaving] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);
  const [mutationError, setMutationError] = useState("");
  const [tableDropdownOpen, setTableDropdownOpen] = useState(false);
  const tableDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  // Tutup dropdown jika pengguna mengklik di luar dropdown yang terbuka.
  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;

      if (tableDropdownOpen && !tableDropdownRef.current?.contains(target)) {
        setTableDropdownOpen(false);
      }

      if (statusDropdownOpen && !statusDropdownRef.current?.contains(target)) {
        setStatusDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [tableDropdownOpen, statusDropdownOpen]);

  // Pencarian hanya dijalankan saat tombol Cari ditekan atau Enter dikirim.

  // =======================================================
  // LOAD AVAILABLE TABLES
  // =======================================================

  useEffect(() => {
    let cancelled = false;

    async function loadTables() {
      setLoadingTables(true);
      setError("");

      try {
        const response = await payrollApi.getManagementTables();

        if (cancelled) return;

        setTables(response.tables);

        if (response.tables.length > 0) {
          setSelectedTable((current) => (response.tables.some((table) => table.table_name === current) ? current : response.tables[0].table_name));
        } else {
          setSelectedTable("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Gagal mengambil daftar tabel.");
        }
      } finally {
        if (!cancelled) {
          setLoadingTables(false);
        }
      }
    }

    void loadTables();

    return () => {
      cancelled = true;
    };
  }, []);

  // =======================================================
  // LOAD TABLE ROWS
  // =======================================================

  useEffect(() => {
    if (!selectedTable) {
      setData(null);
      return;
    }

    let cancelled = false;

    async function loadRows() {
      setLoadingData(true);
      setError("");

      try {
        const response = await payrollApi.getManagementRows(selectedTable, search, page, pageSize);

        if (!cancelled) {
          setData(response);
        }
      } catch (err) {
        if (!cancelled) {
          setData(null);
          setError(err instanceof Error ? err.message : "Gagal mengambil data tabel.");
        }
      } finally {
        if (!cancelled) {
          setLoadingData(false);
        }
      }
    }

    void loadRows();

    return () => {
      cancelled = true;
    };
  }, [selectedTable, search, page, pageSize, refreshKey]);

  // =======================================================
  // HELPERS
  // =======================================================

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextSearch = searchInput.trim();
    setPage(1);
    setSearch(nextSearch);
  }

  function clearSearch() {
    setSearchInput("");
    setSearch("");
    setPage(1);
  }

  function handleTableChange(tableName: string) {
    setTableDropdownOpen(false);
    setSelectedTable(tableName);
    setSearch("");
    setSearchInput("");
    setPage(1);
    setData(null);
    setNotice("");
    closeDialog();
  }

  function formatValue(value: unknown, columnName?: string): string {
    if (value === null || value === undefined || value === "") {
      return "—";
    }

    if (typeof value === "object") {
      return JSON.stringify(value);
    }

    const text = String(value);

    // Format kolom created_at dan updated_at
    if (columnName && ["created_at", "updated_at"].includes(columnName.toLowerCase()) && text) {
      const date = new Date(text);

      if (!Number.isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");

        return `${year}-${month}-${day} ${hours}:${minutes}`;
      }
    }

    return text;
  }

  // Warnai bagian teks yang cocok dengan kata kunci pencarian.
  // Pencocokan tidak membedakan huruf besar dan kecil.
  function renderHighlightedValue(value: unknown) {
    const text = formatValue(value);
    const keyword = search.trim();

    if (!keyword || text === "—") {
      return text;
    }

    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = text.split(new RegExp(`(${escapedKeyword})`, "gi"));

    return parts.map((part, index) =>
      part.toLocaleLowerCase() === keyword.toLocaleLowerCase() ? (
        <mark key={`${index}-${part}`} className="rounded bg-amber-200 px-0.5 font-semibold text-amber-950 ring-1 ring-inset ring-amber-300">
          {part}
        </mark>
      ) : (
        <span key={`${index}-${part}`}>{part}</span>
      ),
    );
  }

  const columns = data?.columns ?? [];
  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.total_pages ?? 0;
  const selectedTableInfo = tables.find((table) => table.table_name === selectedTable);
  const initialTableLoading = loadingTables || (Boolean(selectedTable) && loadingData && data === null);
  const editableColumns = columns.filter((column) => !column.primary_key && column.name.toLowerCase() !== "id");

  function closeDialog() {
    setStatusDropdownOpen(false);
    setDialogMode(null);
    setEditingRow(null);
    setFormValues({});
    setMutationError("");
  }

  function openCreateDialog() {
    setStatusDropdownOpen(false);
    const values: FormValues = {};
    editableColumns.forEach((column) => {
      values[column.name] = "";
    });
    setEditingRow(null);
    setFormValues(values);
    setMutationError("");
    setDialogMode("create");
  }

  function openEditDialog(row: Record<string, unknown>) {
    setStatusDropdownOpen(false);
    const values: FormValues = {};
    editableColumns.forEach((column) => {
      values[column.name] = toInputValue(row[column.name], column);
    });
    setEditingRow(row);
    setFormValues(values);
    setMutationError("");
    setDialogMode("edit");
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTable || !dialogMode) return;

    const missingRequired = editableColumns.find((column) => !column.nullable && (formValues[column.name] ?? "").trim() === "");
    if (missingRequired) {
      setMutationError(`Kolom "${missingRequired.name}" wajib diisi.`);
      return;
    }

    setSaving(true);
    setMutationError("");
    setError("");
    setNotice("");
    try {
      const payload = buildPayload(editableColumns, formValues);
      if (dialogMode === "create") {
        await payrollApi.createManagementRow(selectedTable, payload);
        setNotice("Data berhasil ditambahkan.");
        setPage(1);
        setSearch("");
        setSearchInput("");
      } else {
        const recordId: unknown = editingRow?.id;
        if (typeof recordId !== "string" && typeof recordId !== "number") {
          throw new Error("ID data tidak ditemukan atau format ID tidak valid. Pastikan API mengembalikan kolom id berupa teks atau angka.");
        }
        await payrollApi.updateManagementRow(selectedTable, recordId, payload);
        setNotice("Data berhasil diperbarui.");
      }
      closeDialog();
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : "Gagal menyimpan data.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row: Record<string, unknown>) {
    if (!selectedTable) return;
    const recordId = row.id as string | number | undefined;
    if (recordId === null || recordId === undefined) {
      setError("ID data tidak ditemukan. Pastikan API mengembalikan kolom id.");
      return;
    }
    if (!window.confirm(`Hapus data ID ${recordId} dari tabel ${selectedTable}? Tindakan ini tidak dapat dibatalkan.`)) return;

    setDeletingId(recordId);
    setError("");
    setNotice("");
    try {
      await payrollApi.deleteManagementRow(selectedTable, recordId);
      setNotice(`Data ID ${recordId} berhasil dihapus.`);
      if (rows.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        setRefreshKey((value) => value + 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus data.");
    } finally {
      setDeletingId(null);
    }
  }

  // State loading mencakup pengambilan daftar tabel saat halaman pertama kali dibuka.

  // =======================================================
  // UI
  // =======================================================

  return (
    <section className="space-y-2.5 text-[11px]">
      {/* PAGE HEADER */}
      <div className="space-y-0">
        <p className="text-[10px] font-semibold leading-3 tracking-wide text-blue-300">PAYROLL OPERATIONS</p>
        <h1 className="mt-0.5 text-base font-bold leading-5 tracking-tight text-slate-100">Data Management</h1>
        <p className="mt-0.5 max-w-2xl text-[11px] leading-4 text-slate-400">Lihat dan kelola data payroll yang tersimpan di database.</p>
      </div>

      {/* ERROR MESSAGE */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-300">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {notice && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-[#344661] bg-[#17243a] p-2.5 text-xs text-blue-100">
          <p>{notice}</p>
          <button type="button" onClick={() => setNotice("")} aria-label="Tutup pesan">
            <X size={14} />
          </button>
        </div>
      )}

      {/* FILTER PANEL */}

      <div className="rounded-xl border border-[#253148] bg-[#111827] p-3">
        {/* BARIS 1: PILIH TABEL DAN CARI DATA */}
        <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2 lg:gap-4">
          {/* PILIH TABEL */}
          <div className="min-w-0">
            <label htmlFor="table-select" className="mb-1 block text-[11px] font-semibold text-slate-300">
              Pilih tabel database
            </label>

            <div ref={tableDropdownRef} className="relative">
              <button
                id="table-select"
                type="button"
                disabled={loadingTables || tables.length === 0}
                aria-haspopup="listbox"
                aria-expanded={tableDropdownOpen}
                onClick={() => setTableDropdownOpen((open) => !open)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setTableDropdownOpen(false);
                }}
                className={`flex min-h-8 w-full items-center justify-between gap-2 rounded-lg border bg-[#111827] px-2.5 py-1.5 text-left text-[11px] text-slate-300 outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  tableDropdownOpen ? "border-blue-400 ring-2 ring-blue-500/20" : "border-[#344661] hover:border-blue-400/60 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                }`}
              >
                <span className="min-w-0 truncate">
                  {loadingTables ? "Memuat tabel..." : tables.length === 0 ? "Tidak ada tabel tersedia" : selectedTableInfo ? `${selectedTableInfo.label} (${selectedTableInfo.table_name})` : "Pilih tabel"}
                </span>

                <ChevronDown size={14} aria-hidden="true" className={`shrink-0 text-blue-300 transition-transform duration-200 ${tableDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {tableDropdownOpen && tables.length > 0 && (
                <ul role="listbox" aria-label="Pilih tabel database" className="absolute left-0 top-full z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-[#344661] bg-[#111827] py-1 shadow-lg">
                  {tables.map((table) => {
                    const selected = selectedTable === table.table_name;

                    return (
                      <li key={table.table_name}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={selected}
                          onClick={() => handleTableChange(table.table_name)}
                          className={`w-full px-2.5 py-1.5 text-left text-[11px] transition-colors ${selected ? "bg-[#17243a] font-semibold text-blue-100" : "text-slate-300 hover:bg-[#1b2b43] hover:text-blue-100"}`}
                        >
                          {table.label} <span className="text-slate-400">({table.table_name})</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* DATA TABEL */}
            <div className="mt-1.5 flex items-center justify-between gap-2 rounded-lg bg-[#0b1424] px-2.5 py-1.5">
              <div className="min-w-0">
                <h2 className="text-[11px] font-semibold text-slate-200">Data Tabel</h2>
                <p className="mt-0.5 truncate text-[10px] text-slate-400">
                  {initialTableLoading || (loadingData && data === null)
                    ? "Sedang memuat data tabel..."
                    : loadingData
                      ? "Memperbarui hasil data..."
                      : search
                        ? `${total.toLocaleString("id-ID")} hasil untuk “${search}”`
                        : `${total.toLocaleString("id-ID")} baris data`}
                </p>
              </div>
              <Database size={16} className="shrink-0 text-slate-400" />
            </div>
          </div>

          {/* CARI DATA */}

          <div className="min-w-0">
            <label htmlFor="management-search" className="mb-1 block text-[11px] font-semibold text-slate-300">
              Cari data
            </label>

            <form onSubmit={handleSearch} className="flex w-full gap-2">
              <div className="relative min-w-0 flex-1">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />

                <input
                  id="management-search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Masukkan kata kunci pencarian..."
                  aria-label="Cari data di semua kolom"
                  className="min-h-8 w-full rounded-lg border border-[#344661] bg-[#0b1424] py-1.5 pl-8 pr-8 text-[11px] text-slate-200 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                />

                {searchInput && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    aria-label="Hapus pencarian"
                    title="Hapus pencarian"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-[#1b2b43] hover:text-white"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <button
                type="submit"
                className="inline-flex min-h-8 shrink-0 items-center justify-center gap-1 rounded-lg bg-[#315b91] px-2.5 text-[11px] font-semibold text-white transition hover:bg-[#3b6da9] focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:ring-offset-1"
              >
                <Search size={14} />
                Cari
              </button>
            </form>

            {/* KONTROL TABEL */}
            <div className="mt-2 flex flex-wrap items-center justify-end gap-1.5 border-t border-[#253148] pt-2">
              <div className="flex items-center gap-2">
                <label htmlFor="page-size" className="whitespace-nowrap text-xs text-slate-400">
                  Baris per halaman
                </label>

                <select
                  id="page-size"
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value));
                    setPage(1);
                  }}
                  className="h-8 rounded-lg border border-[#344661] bg-[#111827] px-2 text-[11px] text-slate-300 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => setRefreshKey((value) => value + 1)}
                disabled={loadingData}
                className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-[#344661] bg-[#111827] px-2.5 text-[11px] font-medium text-slate-300 transition hover:bg-[#1b2b43] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw size={13} className={loadingData ? "animate-spin" : ""} />
                Refresh
              </button>

              <button
                type="button"
                onClick={openCreateDialog}
                disabled={!selectedTable || !data || loadingData}
                className="inline-flex h-8 items-center justify-center gap-1 rounded-lg bg-[#315b91] px-2.5 text-[11px] font-semibold text-white transition hover:bg-[#3b6da9] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus size={13} />
                Tambah Data
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="overflow-hidden rounded-lg border border-[#253148] bg-[#111827]">
        <div
          className="
    relative min-h-56 overflow-x-auto
    [scrollbar-width:thin]
    [scrollbar-color:#64748b_#111827]
    [&::-webkit-scrollbar]:h-[9px]
    [&::-webkit-scrollbar-track]:bg-[#111827]
    [&::-webkit-scrollbar-thumb]:rounded-full
    [&::-webkit-scrollbar-thumb]:bg-[#64748b]
    [&::-webkit-scrollbar-thumb:hover]:bg-[#94a3b8]
  "
          aria-busy={loadingData}
        >
          {" "}
          {/* Saat data pertama kali dimuat, tampilkan skeleton agar tabel tidak terlihat kosong. */}
          {initialTableLoading || (loadingData && columns.length === 0) ? (
            <div className="min-w-160 animate-pulse p-3" role="status" aria-live="polite">
              <div className="mb-3 flex items-center gap-2 rounded-lg bg-[#17243a] px-3 py-2 text-xs text-blue-100">
                <LoaderCircle size={15} className="shrink-0 animate-spin" />
                <div>
                  <p className="font-semibold">{loadingTables && !selectedTable ? "Menyiapkan tabel database" : "Sedang mengambil data"}</p>
                  <p className="mt-0.5 text-[10px] text-blue-300">Mohon tunggu sebentar, data sedang disiapkan dan dimuat dari database.</p>
                </div>
              </div>
              <div className="mb-2 grid grid-cols-5 gap-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={`head-${index}`} className="h-7 rounded-md bg-[#253148]" />
                ))}
              </div>
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, rowIndex) => (
                  <div key={`row-${rowIndex}`} className="grid grid-cols-5 gap-2">
                    {Array.from({ length: 5 }).map((__, columnIndex) => (
                      <div key={`cell-${rowIndex}-${columnIndex}`} className="h-6 rounded-md bg-[#17243a]" />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Saat data lama masih tersedia, pertahankan tabel dan beri indikator loading di atasnya. */}
              {loadingData && (
                <div className="absolute inset-0 z-10 flex items-start justify-center bg-[#111827]/65 pt-8 backdrop-blur-[1px]" role="status" aria-live="polite">
                  <div className="flex items-center gap-2 rounded-full border border-[#344661] bg-[#111827] px-3 py-2 text-xs font-medium text-blue-100 shadow-md">
                    <LoaderCircle size={15} className="animate-spin" />
                    Memperbarui data...
                  </div>
                </div>
              )}

              <table className="w-full border-collapse text-left text-[11px]">
                <thead className="bg-[#17243a]">
                  <tr>
                    {columns.map((column) => (
                      <th key={column.name} className="whitespace-nowrap border-b border-[#344661] px-2.5 py-1.5 text-[10px] font-semibold text-slate-200">
                        {column.name}
                        {column.primary_key && <span className="ml-1 text-xs text-blue-300">(PK)</span>}
                      </th>
                    ))}
                    <th className="whitespace-nowrap border-b border-[#344661] px-2.5 py-1.5 text-[10px] font-semibold text-slate-200">Aksi</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#253148]">
                  {!loadingData && rows.length === 0 && (
                    <tr>
                      <td colSpan={Math.max(columns.length + 1, 1)} className="px-3 py-7 text-center">
                        <div className="mx-auto flex max-w-sm flex-col items-center">
                          <div className="mb-2 rounded-full bg-[#17243a] p-2.5">{error ? <AlertCircle size={18} className="text-red-500" /> : <Search size={18} className="text-slate-400" />}</div>
                          <p className="font-medium text-slate-300">{error ? "Data belum berhasil dimuat" : search ? "Data tidak ditemukan" : "Belum ada data"}</p>
                          <p className="mt-0.5 text-[10px] text-slate-400">
                            {error
                              ? "Periksa koneksi lalu tekan Refresh untuk mencoba kembali."
                              : search
                                ? `Tidak ada data yang cocok dengan kata kunci “${search}”. Coba kata kunci lain atau hapus pencarian.`
                                : "Tabel ini belum memiliki data untuk ditampilkan."}
                          </p>
                          {!error && search && (
                            <button type="button" onClick={clearSearch} className="mt-2 rounded-lg border border-[#344661] px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-[#1b2b43]">
                              Hapus pencarian
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}

                  {rows.map((row, index) => (
                    <tr key={String(row.id ?? index)} className="transition-colors hover:bg-[#1b2b43]/40">
                      {columns.map((column) => (
                        <td key={column.name} title={formatValue(row[column.name], column.name)} className="max-w-[200px] whitespace-nowrap border-b border-[#253148] px-2.5 py-1.5 text-[10px] text-slate-300">
                          <span className="block max-w-[200px] truncate">{renderHighlightedValue(["created_at", "updated_at"].includes(column.name.toLowerCase()) ? formatValue(row[column.name], column.name) : row[column.name])}</span>
                        </td>
                      ))}
                      <td className="whitespace-nowrap border-b border-[#253148] px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center gap-2">
                            {/* BUTTON EDIT - GREEN */}
                            <button
                              type="button"
                              onClick={() => openEditDialog(row)}
                              className="
      inline-flex h-8 items-center justify-center gap-1.5
      rounded-lg border border-emerald-400/60
      bg-emerald-500/15 px-3
      text-[11px] font-bold text-emerald-300
      transition-all duration-200
      hover:border-emerald-300
      hover:bg-emerald-500/25
      hover:text-emerald-200
      active:scale-[0.97]
      focus:outline-none focus:ring-2 focus:ring-emerald-400/30
    "
                            >
                              <Pencil size={13} strokeWidth={2.3} />
                              Edit
                            </button>

                            {/* BUTTON HAPUS - BRIGHT RED */}
                            <button
                              type="button"
                              onClick={() => void handleDelete(row)}
                              disabled={deletingId !== null}
                              className="
      inline-flex h-8 items-center justify-center gap-1.5
      rounded-lg border border-red-400/60
      bg-red-500/15 px-3
      text-[11px] font-bold text-red-300
      transition-all duration-200
      hover:border-red-300
      hover:bg-red-500/25
      hover:text-red-200
      active:scale-[0.97]
      disabled:cursor-not-allowed disabled:opacity-40
      focus:outline-none focus:ring-2 focus:ring-red-400/30
    "
                            >
                              {deletingId === row.id ? <LoaderCircle size={13} className="animate-spin" /> : <Trash2 size={13} strokeWidth={2.3} />}
                              Hapus
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>

        {/* PAGINATION */}
        <div className="flex flex-col gap-1.5 border-t border-[#253148] px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-slate-400">
            {initialTableLoading || (loadingData && data === null)
              ? "Memuat informasi baris..."
              : total === 0
                ? "Tidak ada baris"
                : `Menampilkan ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} dari ${total.toLocaleString("id-ID")} baris`}
          </p>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1 || loadingData}
              className="inline-flex items-center gap-1 rounded-md border border-[#344661] px-2 py-1 text-[11px] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={14} />
              Sebelumnya
            </button>

            <span className="px-1.5 text-[11px] text-slate-400">
              {page} / {Math.max(totalPages, 1)}
            </span>

            <button
              type="button"
              onClick={() => setPage((current) => Math.min(Math.max(totalPages, 1), current + 1))}
              disabled={page >= totalPages || loadingData || totalPages === 0}
              className="inline-flex items-center gap-1 rounded-md border border-[#344661] px-2 py-1 text-[11px] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Berikutnya
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {dialogMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm sm:p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="crud-dialog-title"
            className="
              max-h-[86vh] w-full max-w-lg overflow-y-auto
              rounded-xl border border-[#344661] bg-[#111827]
              shadow-2xl shadow-black/40
              [scrollbar-width:thin]
              [scrollbar-color:#64748b_#111827]
              [&::-webkit-scrollbar]:w-[7px]
              [&::-webkit-scrollbar-track]:bg-[#111827]
              [&::-webkit-scrollbar-thumb]:rounded-full
              [&::-webkit-scrollbar-thumb]:bg-[#475569]
              [&::-webkit-scrollbar-thumb:hover]:bg-[#94a3b8]
            "
          >
            <div className="sticky top-0 z-20 flex items-start justify-between border-b border-[#253148] bg-[#111827]/95 px-3 py-2.5 backdrop-blur">
              <div>
                <h2 id="crud-dialog-title" className="text-sm font-bold text-slate-100">
                  {dialogMode === "create" ? "Tambah Data" : "Edit Data"}
                </h2>
                <p className="mt-0.5 text-[10px] text-slate-400">Tabel: {selectedTableInfo?.label ?? selectedTable}. ID dikelola oleh database.</p>
              </div>
              <button type="button" onClick={closeDialog} disabled={saving} aria-label="Tutup form" className="rounded-md p-1.5 text-slate-400 transition hover:bg-[#1b2b43] hover:text-slate-100">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={(event) => void handleSave(event)} className="space-y-3 px-3 py-3">
              {mutationError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-[11px] text-red-300">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <p>{mutationError}</p>
                </div>
              )}

              {editableColumns.length === 0 ? (
                <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">Tidak ada kolom yang dapat diisi pada tabel ini.</p>
              ) : (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {editableColumns.map((column) => {
                    const inputType = getInputType(column);
                    const selectOptions = getSelectOptions(selectedTable, column.name);

                    if (selectOptions) {
                      const selectedStatus = formValues[column.name] ?? "";
                      const isOpen = statusDropdownOpen;

                      return (
                        <div key={column.name} ref={statusDropdownRef} className="relative min-w-0">
                          <label className="mb-1 block text-[10px] font-semibold text-slate-300">
                            {column.name}
                            {!column.nullable && <span className="ml-1 text-red-600">*</span>}
                          </label>

                          <button
                            type="button"
                            aria-haspopup="listbox"
                            aria-expanded={isOpen}
                            onClick={() => setStatusDropdownOpen((open) => !open)}
                            onKeyDown={(event) => {
                              if (event.key === "Escape") setStatusDropdownOpen(false);
                            }}
                            className={`flex h-8 w-full items-center justify-between rounded-md border px-2.5 text-left text-[11px] font-medium outline-none transition-colors focus:ring-2 focus:ring-blue-500/20 ${
                              isOpen ? "border-blue-400 bg-[#111827] text-slate-300 ring-2 ring-blue-500/20" : "border-[#344661] bg-[#111827] text-slate-300 hover:border-blue-400/60"
                            }`}
                          >
                            <span>{selectedStatus || "Pilih status BAPP"}</span>
                            <ChevronDown size={16} aria-hidden="true" className={`shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180 text-blue-400" : "text-slate-400"}`} />
                          </button>

                          {isOpen && (
                            <ul
                              role="listbox"
                              aria-label="Pilihan status BAPP"
                              className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-md border border-[#344661] bg-[#111827] py-1 shadow-lg [scrollbar-width:thin] [scrollbar-color:#64748b_#111827]"
                            >
                              {selectOptions.map((option) => {
                                const selected = selectedStatus === option;

                                return (
                                  <li key={option}>
                                    <button
                                      type="button"
                                      role="option"
                                      aria-selected={selected}
                                      onClick={() => {
                                        setFormValues((current) => ({
                                          ...current,
                                          [column.name]: option,
                                        }));
                                        setStatusDropdownOpen(false);
                                      }}
                                      className={`w-full px-2.5 py-1.5 text-left text-[11px] transition-colors ${selected ? "bg-[#263f68] font-semibold text-blue-100" : "text-slate-300 hover:bg-[#1b2b43] hover:text-blue-100"}`}
                                    >
                                      {option}
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      );
                    }

                    if (inputType === "checkbox") {
                      return (
                        <label key={column.name} className="flex items-center gap-2.5 rounded-lg border border-[#253148] px-2.5 py-2 text-[11px] font-medium text-slate-300">
                          <input
                            type="checkbox"
                            checked={formValues[column.name] === "true"}
                            onChange={(event) =>
                              setFormValues((current) => ({
                                ...current,
                                [column.name]: event.target.checked ? "true" : "false",
                              }))
                            }
                            className="h-3.5 w-3.5 rounded border-[#344661] text-blue-300 focus:ring-blue-400"
                          />
                          {column.name}
                        </label>
                      );
                    }

                    return (
                      <div key={column.name} className="min-w-0">
                        <label htmlFor={`crud-${column.name}`} className="mb-1 block text-[10px] font-semibold text-slate-300">
                          {column.name}
                          {!column.nullable && <span className="ml-1 text-red-600">*</span>}
                        </label>

                        <input
                          id={`crud-${column.name}`}
                          type={inputType}
                          step={inputType === "number" ? "any" : undefined}
                          value={formValues[column.name] ?? ""}
                          required={!column.nullable}
                          onChange={(event) =>
                            setFormValues((current) => ({
                              ...current,
                              [column.name]: event.target.value,
                            }))
                          }
                          className="h-8 w-full rounded-md border border-[#344661] bg-[#0b1424] px-2.5 text-[11px] text-slate-200 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                        />

                        <p className="mt-1 text-[11px] text-slate-400">
                          Tipe: {column.type}
                          {column.nullable ? " · Opsional" : " · Wajib diisi"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex flex-col-reverse gap-2 border-t border-[#253148] pt-3 sm:flex-row sm:justify-end">
                <button type="button" onClick={closeDialog} disabled={saving} className="h-8 rounded-lg border border-[#344661] px-3 text-[11px] font-semibold text-slate-300 transition hover:bg-[#1b2b43] disabled:opacity-50">
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving || editableColumns.length === 0}
                  className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-[#315b91] px-3 text-[11px] font-semibold text-white transition hover:bg-[#3b6da9] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving && <LoaderCircle size={13} className="animate-spin" />}
                  {saving ? "Menyimpan..." : dialogMode === "create" ? "Simpan Data" : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
