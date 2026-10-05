import express from "express";
import cors from "cors";
import pg from "pg";

const { Pool } = pg;

const app = express();

app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    ca: process.env.DB_CA,
    rejectUnauthorized: true,
  },
});

// =========================
// TEST DATABASE
// =========================

app.get("/api/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.json({
      success: true,
      message: "Connected to Aiven PostgreSQL",
      time: result.rows[0].now,
    });
  } catch (error) {
    console.error("Database connection error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to connect to database",
      error: error.message,
      code: error.code,
    });
  }
});

// =========================
// MASTER DETAIL DIVISI
// =========================

app.get("/api/master-detail-divisi", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        periode_bulan,
        divisi,
        departemen,
        layanan,
        jumlah_transaksi,
        sdm_diproses,
        sla_tercapai,
        total_thp,
        unit,
        created_at
      FROM master_detail_divisi
      ORDER BY periode_bulan DESC, id DESC
    `);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Payroll API error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch payroll data",
      error: error.message,
      code: error.code,
    });
  }
});

// =========================
// MASTER BAPP BULANAN
// =========================

app.get("/api/master-bapp-bulanan", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        periode_bulan,
        status_bapp,
        jumlah_bapp,
        nominal,
        unit,
        created_at
      FROM master_bapp_bulanan
      ORDER BY periode_bulan DESC, id DESC
    `);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Master BAPP Bulanan API error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch master BAPP bulanan data",
      error: error.message,
      code: error.code,
    });
  }
});

// =========================
// MASTER DETAIL BAPP
// =========================

app.get("/api/master-detail-bapp", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        periode_bulan,
        divisi,
        departemen,
        layanan,
        status,
        revenue,
        unit,
        keterangan,
        text,
        created_at
      FROM master_detail_bapp
      ORDER BY periode_bulan DESC, id DESC
    `);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Master Detail BAPP API error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch master detail BAPP data",
      error: error.message,
      code: error.code,
    });
  }
});

// =========================
// GPM
// =========================

app.get("/api/gpm", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        periode_bulan,
        revenue_payroll_bapp,
        cost_payroll
      FROM gpm
      ORDER BY periode_bulan ASC
    `);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("GPM API error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch GPM data",
      error: error.message,
      code: error.code,
    });
  }
});

// =========================
// TARGET
// =========================

app.get("/api/target", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        periode_bulan,
        nominal_target_sustain,
        nominal_target_scaling,
        realisasi_sustain,
        realisasi_scaling
      FROM target
      ORDER BY periode_bulan ASC
    `);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Target API error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch target data",
      error: error.message,
      code: error.code,
    });
  }
});

// =========================
// DETAIL COST
// =========================

app.get("/api/detail-cost", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        periode_bulan,
        beban_jarkom,
        beban_jasnaker,
        beban_kerjasama_pihak_ketiga,
        beban_lain_lain,
        beban_mandatory_gedung,
        depresiasi,
        total
      FROM detail_cost
      ORDER BY periode_bulan ASC
    `);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Detail Cost API error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch detail cost data",
      error: error.message,
      code: error.code,
    });
  }
});

export default app;
