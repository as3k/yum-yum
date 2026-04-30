/**
 * Multi-tenant schema migration — adds households, household_members, waitlist,
 * community_recipes and alters existing tables with new columns.
 * Run against dev branch: doppler run --config dev --project meal-prep -- tsx scripts/migrate-multi-tenant.ts
 */
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

async function run() {
  console.log("Running multi-tenant migration…")

  await sql`
    -- New tables
    CREATE TABLE IF NOT EXISTS "households" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "name" text NOT NULL,
      "invite_code" text NOT NULL,
      "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      CONSTRAINT "households_invite_code_unique" UNIQUE("invite_code")
    )
  `
  console.log("✓ households")

  await sql`
    CREATE TABLE IF NOT EXISTS "household_members" (
      "household_id" uuid NOT NULL REFERENCES "households"("id") ON DELETE CASCADE,
      "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "role" text DEFAULT 'member' NOT NULL,
      "joined_at" timestamp DEFAULT now() NOT NULL,
      CONSTRAINT "household_members_household_id_user_id_pk" PRIMARY KEY("household_id","user_id")
    )
  `
  console.log("✓ household_members")

  await sql`
    CREATE TABLE IF NOT EXISTS "waitlist" (
      "id" serial PRIMARY KEY NOT NULL,
      "email" text NOT NULL,
      "name" text,
      "message" text,
      "status" text DEFAULT 'pending' NOT NULL,
      "invite_token" text,
      "token_expires_at" timestamp,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "approved_at" timestamp,
      CONSTRAINT "waitlist_email_unique" UNIQUE("email"),
      CONSTRAINT "waitlist_invite_token_unique" UNIQUE("invite_token")
    )
  `
  console.log("✓ waitlist")

  await sql`
    CREATE TABLE IF NOT EXISTS "community_recipes" (
      "id" serial PRIMARY KEY NOT NULL,
      "source_recipe_id" integer NOT NULL REFERENCES "recipes"("id") ON DELETE CASCADE,
      "published_by" uuid NOT NULL REFERENCES "users"("id"),
      "household_id" uuid NOT NULL REFERENCES "households"("id"),
      "fork_count" integer DEFAULT 0 NOT NULL,
      "published_at" timestamp DEFAULT now() NOT NULL,
      CONSTRAINT "community_recipes_source_recipe_id_unique" UNIQUE("source_recipe_id")
    )
  `
  console.log("✓ community_recipes")

  // Alter existing tables
  await sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" text DEFAULT 'user' NOT NULL`
  console.log("✓ users.role")

  await sql`ALTER TABLE "recipes" ADD COLUMN IF NOT EXISTS "household_id" uuid REFERENCES "households"("id") ON DELETE CASCADE`
  await sql`ALTER TABLE "recipes" ADD COLUMN IF NOT EXISTS "is_community" boolean DEFAULT false NOT NULL`
  console.log("✓ recipes.household_id, is_community")

  await sql`ALTER TABLE "meals" ADD COLUMN IF NOT EXISTS "household_id" uuid REFERENCES "households"("id") ON DELETE CASCADE`
  console.log("✓ meals.household_id")

  // meal_plans: drop old week_start unique, add household_id, add composite unique
  await sql`ALTER TABLE "meal_plans" ADD COLUMN IF NOT EXISTS "household_id" uuid REFERENCES "households"("id") ON DELETE CASCADE`
  await sql`
    DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'meal_plans_week_start_unique' AND conrelid = 'meal_plans'::regclass
      ) THEN
        ALTER TABLE "meal_plans" DROP CONSTRAINT "meal_plans_week_start_unique";
      END IF;
    END $$
  `
  await sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'meal_plans_household_id_week_start_unique' AND conrelid = 'meal_plans'::regclass
      ) THEN
        ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_household_id_week_start_unique" UNIQUE("household_id","week_start");
      END IF;
    END $$
  `
  console.log("✓ meal_plans.household_id, constraint updated")

  await sql`ALTER TABLE "grocery_lists" ADD COLUMN IF NOT EXISTS "household_id" uuid REFERENCES "households"("id") ON DELETE CASCADE`
  console.log("✓ grocery_lists.household_id")

  await sql`ALTER TABLE "grocery_items" ADD COLUMN IF NOT EXISTS "price_per_unit" numeric(10,2)`
  await sql`ALTER TABLE "grocery_items" ADD COLUMN IF NOT EXISTS "estimated_total" numeric(10,2)`
  console.log("✓ grocery_items.price_per_unit, estimated_total")

  await sql`ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "weekly_budget_target" numeric(10,2)`
  console.log("✓ user_preferences.weekly_budget_target")

  console.log("\n✅ Migration complete.")
}

run().catch((err) => {
  console.error("Migration failed:", err)
  process.exit(1)
})
