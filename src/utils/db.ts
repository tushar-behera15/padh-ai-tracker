// src/lib/db.ts
import { Pool } from "pg";
import "../config/env";
// Create PostgreSQL connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
        process.env.NODE_ENV === "production"
            ? { rejectUnauthorized: false }
            : false
});

// Simple query helper
async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
    const result = await pool.query(text, params);
    return result.rows as T[];
}

// Export db object
const db = {
    query
};

export default db;
