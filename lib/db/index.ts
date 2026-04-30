import postgres from "postgres"
import { drizzle } from "drizzle-orm/postgres-js"
import * as schema from "./schema"

const url = process.env.DATABASE_URL!

// Disable SSL for local connections (Docker, localhost)
const isLocal = url.includes("localhost") || url.includes("127.0.0.1")
const client = postgres(url, {
  max: 1, // serverless-safe: no persistent connection pools
  ssl: isLocal ? false : "require",
})

export const db = drizzle(client, { schema })
