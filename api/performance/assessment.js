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

    if (period && !/^\d{4}-\d{2}$/.test(period)) {
      return res.status(400).json({
        success: false,
        message: "Invalid period format. Use YYYY-MM.",
      });
    }

    const selectedPeriod = period ? `${period}-01` : null;

    const result = await pool.query(
      `
      SELECT
        v.*,
        p.employee_id,
        p.image_url
      FROM vw_performance_assessment v
      LEFT JOIN performance_employee_photos p
        ON LOWER(TRIM(v.employee_name)) =
           LOWER(TRIM(p.employee_name))
      WHERE $1::DATE IS NULL
         OR v.period_month = $1::DATE
      ORDER BY
        v.ranking ASC,
        v.employee_name ASC
      `,
      [selectedPeriod],
    );

    return res.status(200).json({
      success: true,
      total: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error("Performance assessment API error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch performance assessment data",
      error: error.message,
      code: error.code,
    });
  }
}
