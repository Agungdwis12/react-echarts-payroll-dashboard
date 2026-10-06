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
        id,
        periode_bulan,
        nominal_target_sustain,
        nominal_target_scaling,
        realisasi_sustain,
        realisasi_scaling
      FROM target
      ORDER BY periode_bulan ASC
    `);

    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Target API error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch target data",
      error: error.message,
      code: error.code,
    });
  }
}
