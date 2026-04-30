import "dotenv/config"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

async function main() {
  await sql`
    DELETE FROM meal_plan_slots
    WHERE id NOT IN (
      SELECT MIN(id) FROM meal_plan_slots
      GROUP BY meal_plan_id, day_date, meal_type
    )
  `
  console.log("Deduped meal_plan_slots")
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
