const API_BASE_URL = (import.meta.env.VITE_FASTAPI_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

// =========================================================
// GENERIC API REQUEST
// =========================================================

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const responseText = await response.text();
  let data: unknown = responseText;

  try {
    data = responseText ? JSON.parse(responseText) : null;
  } catch {
    // Pertahankan response sebagai teks jika bukan JSON.
  }

  if (!response.ok) {
    let detail = `Request gagal (${response.status})`;

    if (typeof data === "object" && data !== null && "detail" in data) {
      const rawDetail = (data as { detail?: unknown }).detail;

      if (typeof rawDetail === "string") {
        detail = rawDetail;
      } else if (rawDetail !== undefined && rawDetail !== null) {
        detail = JSON.stringify(rawDetail);
      }
    } else if (typeof data === "string" && data.trim()) {
      detail = data;
    }

    throw new Error(detail);
  }

  return data as T;
}

// =========================================================
// DATA MANAGEMENT TYPES
// =========================================================

export type DataManagementColumn = {
  name: string;
  type: string;
  nullable: boolean;
  primary_key: boolean;
};

export type DataManagementTable = {
  table_name: string;
  label: string;
  columns: DataManagementColumn[];
};

export type DataManagementTablesResponse = {
  tables: DataManagementTable[];
};

export type DataManagementRowsResponse = {
  table_name: string;
  columns: DataManagementColumn[];
  rows: Record<string, unknown>[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
};

export type DataManagementMutationResponse = {
  message: string;
  id: string | number;
};

export type DataManagementRecord = Record<string, unknown>;

// =========================================================
// PAYROLL IMPORT TYPES
// =========================================================

export type PayrollImportPreviewResponse = {
  status?: string;
  filename?: string;
  table?: string;
  table_name?: string;
  write_performed?: boolean;
  total_rows?: number;
  total_columns?: number;
  columns?: string[];
  column_names?: string[];
  preview?: Record<string, unknown>[] | string;
  errors?: string[];
  message?: string;
};

export type PayrollImportResultResponse = {
  status?: string;
  message?: string;
  table?: string;
  table_name?: string;
  rows_imported?: number;
  total_rows?: number;
};

// =========================================================
// ACTIVITY LOG TYPES
// =========================================================

export type ActivityType = "IMPORT" | "CREATE" | "UPDATE" | "DELETE";

export type ActivityStatus = "SUCCESS" | "FAILED";

export type ActivityLog = {
  id: number;
  activity_type: ActivityType;
  table_name: string;
  description: string | null;
  file_name: string | null;
  total_rows: number;
  success_rows: number;
  failed_rows: number;
  status: ActivityStatus;
  error_message: string | null;
  performed_by: string | null;
  created_at: string;
};

export type ActivityLogsResponse = {
  logs: ActivityLog[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
};

export type ActivityLogFilters = {
  search?: string;
  activity_type?: ActivityType | "";
  status?: ActivityStatus | "";
  page?: number;
  page_size?: number;
};

// =========================================================
// PAYROLL API
// =========================================================

export const payrollApi = {
  // -------------------------------------------------------
  // DATABASE HEALTH
  // -------------------------------------------------------

  health: () => request<unknown>("/api/database/health"),

  // -------------------------------------------------------
  // PAYROLL IMPORT - SINGLE TABLE
  // Hanya tabel yang dipilih yang akan diganti.
  // -------------------------------------------------------

  previewTable: (file: File, tableName: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("table_name", tableName);

    return request<PayrollImportPreviewResponse>("/api/import/preview-table", {
      method: "POST",
      body: formData,
    });
  },

  confirmTable: (file: File, tableName: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("table_name", tableName);

    return request<PayrollImportResultResponse>("/api/import/confirm-table", {
      method: "POST",
      body: formData,
    });
  },

  // -------------------------------------------------------
  // PAYROLL IMPORT - LEGACY ALL-TABLE ENDPOINTS
  // Dipertahankan jika masih digunakan halaman lain.
  // -------------------------------------------------------

  previewReplace: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    return request<unknown>("/api/import/preview-replace", {
      method: "POST",
      body: formData,
    });
  },

  confirmReplace: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    return request<unknown>("/api/import/confirm-replace?confirmation=REPLACE%20PAYROLL%20DATA", {
      method: "POST",
      body: formData,
    });
  },

  // -------------------------------------------------------
  // DATA MANAGEMENT - GET TABLES
  // -------------------------------------------------------

  getManagementTables: () => request<DataManagementTablesResponse>("/api/data-management/tables"),

  // -------------------------------------------------------
  // DATA MANAGEMENT - GET TABLE ROWS
  // -------------------------------------------------------

  getManagementRows: (tableName: string, search = "", page = 1, pageSize = 10) => {
    const params = new URLSearchParams({
      search,
      page: String(page),
      page_size: String(pageSize),
    });

    return request<DataManagementRowsResponse>(`/api/data-management/${encodeURIComponent(tableName)}?${params.toString()}`);
  },

  // -------------------------------------------------------
  // DATA MANAGEMENT - CREATE ROW
  // POST /api/data-management/{table_name}
  // -------------------------------------------------------

  createManagementRow: (tableName: string, payload: DataManagementRecord) =>
    request<DataManagementMutationResponse>(`/api/data-management/${encodeURIComponent(tableName)}`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // -------------------------------------------------------
  // DATA MANAGEMENT - UPDATE ROW
  // PUT /api/data-management/{table_name}/{record_id}
  // -------------------------------------------------------

  updateManagementRow: (tableName: string, recordId: string | number, payload: DataManagementRecord) =>
    request<DataManagementMutationResponse>(`/api/data-management/${encodeURIComponent(tableName)}/${encodeURIComponent(String(recordId))}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  // -------------------------------------------------------
  // DATA MANAGEMENT - DELETE ROW
  // DELETE /api/data-management/{table_name}/{record_id}
  // -------------------------------------------------------

  deleteManagementRow: (tableName: string, recordId: string | number) =>
    request<DataManagementMutationResponse>(`/api/data-management/${encodeURIComponent(tableName)}/${encodeURIComponent(String(recordId))}`, {
      method: "DELETE",
    }),

  // -------------------------------------------------------
  // ACTIVITY LOGS - RIWAYAT PEMBARUAN
  // GET /api/activity-logs
  // -------------------------------------------------------

  getActivityLogs: (filters: ActivityLogFilters = {}) => {
    const params = new URLSearchParams({
      search: filters.search ?? "",
      activity_type: filters.activity_type ?? "",
      status: filters.status ?? "",
      page: String(filters.page ?? 1),
      page_size: String(filters.page_size ?? 20),
    });

    return request<ActivityLogsResponse>(`/api/activity-logs?${params.toString()}`);
  },
};
