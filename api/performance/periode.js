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
    const result = await pool.query(`
      SELECT
        period_month,
        jumlah_data,
        nilai_akhir_tim,
        nilai_akhir_unit_a,
        nilai_akhir_unit_b,
        nilai_akhir_unit_c
      FROM vw_performance_period
      ORDER BY period_month ASC
    `);

    return res.status(200).json({
      success: true,
      total: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error("Performance period API error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch performance period data",
      error: error.message,
      code: error.code,
    });
  }
}
