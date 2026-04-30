/**
 * Backfills household data for existing users.
 * Creates one shared household for all current users (Zack + Belinda),
 * populates household_id on all existing recipes, meals, meal_plans, grocery_lists.
 *
 * Run: doppler run --config dev --project meal-prep -- npx tsx scripts/backfill-households.ts
 */
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

function randomInviteCode() {
  return Math.random().toString(36).slice(2, 7).toUpperCase()
}

async function run() {
  console.log("Starting household backfill…")

  // Get all existing users
  const existingUsers = await sql`SELECT id, email, name FROM users ORDER BY created_at`
  console.log(`Found ${existingUsers.length} users:`, existingUsers.map((u: Record<string, unknown>) => u.email))

  if (existingUsers.length === 0) {
    console.log("No users found — nothing to backfill.")
    return
  }

  // Check if household already exists
  const existing = await sql`SELECT id FROM households LIMIT 1`
  if (existing.length > 0) {
    console.log("Household already exists, skipping creation.")
    const householdId = existing[0].id

    // Still backfill null household_ids
    await backfillData(householdId)
    return
  }

  const owner = existingUsers[0]
  const inviteCode = randomInviteCode()

  // Create household
  const [household] = await sql`
    INSERT INTO households (name, invite_code, created_by)
    VALUES ('Home', ${inviteCode}, ${owner.id})
    RETURNING id
  `
  const householdId = household.id
  console.log(`✓ Created household ${householdId} (code: ${inviteCode})`)

  // Add all users as members (first as owner, rest as members)
  for (let i = 0; i < existingUsers.length; i++) {
    const u = existingUsers[i]
    const role = i === 0 ? "owner" : "member"
    await sql`
      INSERT INTO household_members (household_id, user_id, role)
      VALUES (${householdId}, ${u.id}, ${role})
      ON CONFLICT DO NOTHING
    `
    console.log(`✓ Added ${u.email} as ${role}`)
  }

  await backfillData(householdId)

  console.log("\n✅ Backfill complete.")
}

async function backfillData(householdId: string) {
  await sql`UPDATE recipes SET household_id = ${householdId} WHERE household_id IS NULL`
  console.log("✓ Backfilled recipes")

  await sql`UPDATE meals SET household_id = ${householdId} WHERE household_id IS NULL`
  console.log("✓ Backfilled meals")

  await sql`UPDATE meal_plans SET household_id = ${householdId} WHERE household_id IS NULL`
  console.log("✓ Backfilled meal_plans")

  await sql`UPDATE grocery_lists SET household_id = ${householdId} WHERE household_id IS NULL`
  console.log("✓ Backfilled grocery_lists")
}

run().catch((err) => {
  console.error("Backfill failed:", err)
  process.exit(1)
})
