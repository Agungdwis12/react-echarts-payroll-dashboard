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
    const result = await pool.query("SELECT NOW()");

    return res.status(200).json({
      success: true,
      message: "Connected to Aiven PostgreSQL",
      time: result.rows[0].now,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to connect to database",
      error: error.message,
      code: error.code,
    });
  }
}
