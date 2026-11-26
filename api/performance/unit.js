import pg from "pg";

const { Pool } = pg;

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

export default async function handler(req, res) {
  try {
    const { period } = req.query;
    const selectedPeriod = period ? `${period}-01` : null;

    const result = await pool.query(
      `
      SELECT
        period_month,
        unit_name,
        jumlah_karyawan,
        score_lateness,
        score_attendance,
        score_attitude,
        score_sla,
        score_payroll_accuracy,
        score_additional_work,
        discipline_subtotal,
        productivity_subtotal,
        final_score,
        predicate,
        jumlah_sangat_baik,
        jumlah_baik,
        jumlah_cukup,
        jumlah_kurang,
        is_total
      FROM vw_performance_unit
      WHERE $1::DATE IS NULL
         OR period_month = $1::DATE
      ORDER BY is_total ASC, unit_name ASC
      `,
      [selectedPeriod],
    );

    return res.status(200).json({
      success: true,
      total: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error("Performance unit API error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch performance unit data",
      error: error.message,
      code: error.code,
    });
  }
}
