import {
  pgTable,
  pgEnum,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  date,
  jsonb,
  uuid,
  primaryKey,
  unique,
  numeric,
} from "drizzle-orm/pg-core"

export const mealTypeEnum = pgEnum("meal_type", ["breakfast", "lunch", "dinner", "snack"])
export const costEstimateEnum = pgEnum("cost_estimate", ["budget", "moderate", "splurge"])

export interface Ingredient {
  name: string
  quantity?: string
  unit?: string
  notes?: string
}

export interface Instruction {
  step: number
  text: string
}

export interface FodmapFlag {
  ingredient: string
  type: "fodmap" | "carb"
  suggestion?: string
  skipped: boolean
}

export interface NutritionData {
  calories: number
  carbsG: number
  fiberG: number
  fatG: number
  proteinG: number
}

// ── Households ────────────────────────────────────────────────────────────────

export const households = pgTable("households", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  inviteCode: text("invite_code").unique().notNull(),
  createdBy: uuid("created_by"),  // FK set below via lazy ref
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const householdMembers = pgTable(
  "household_members",
  {
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").default("member").notNull(), // 'owner' | 'member'
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.householdId, t.userId] })]
)

// ── Users ─────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").default("user").notNull(), // 'user' | 'admin'
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// ── Waitlist ──────────────────────────────────────────────────────────────────

export const waitlist = pgTable("waitlist", {
  id: serial("id").primaryKey(),
  email: text("email").unique().notNull(),
  name: text("name"),
  message: text("message"),
  status: text("status").default("pending").notNull(), // 'pending' | 'approved' | 'rejected'
  inviteToken: text("invite_token").unique(),
  tokenExpiresAt: timestamp("token_expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  approvedAt: timestamp("approved_at"),
})

// ── Recipes ───────────────────────────────────────────────────────────────────

export const recipes = pgTable("recipes", {
  id: serial("id").primaryKey(),
  slug: text("slug").unique().notNull(),
  title: text("title").notNull(),
  mealType: mealTypeEnum("meal_type").notNull(),
  tags: text("tags").array().default([]),
  description: text("description"),
  prepTimeMin: integer("prep_time_min"),
  cookTimeMin: integer("cook_time_min"),
  totalTimeMin: integer("total_time_min"),
  servings: integer("servings"),
  costEstimate: costEstimateEnum("cost_estimate").default("budget"),
  sourceUrl: text("source_url"),
  imageUrl: text("image_url"),
  ingredients: jsonb("ingredients").$type<Ingredient[]>().default([]),
  instructions: jsonb("instructions").$type<Instruction[]>().default([]),
  storageNotes: text("storage_notes"),
  maxStorageDays: integer("max_storage_days"),
  notes: text("notes"),
  fodmapFlags: jsonb("fodmap_flags").$type<FodmapFlag[]>().default([]),
  nutritionPerServing: jsonb("nutrition_per_serving").$type<NutritionData>(),
  addedDate: date("added_date"),
  householdId: uuid("household_id").references(() => households.id, { onDelete: "cascade" }),
  isCommunity: boolean("is_community").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// ── Community cookbook ────────────────────────────────────────────────────────

export const communityRecipes = pgTable(
  "community_recipes",
  {
    id: serial("id").primaryKey(),
    sourceRecipeId: integer("source_recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    publishedBy: uuid("published_by")
      .notNull()
      .references(() => users.id),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id),
    forkCount: integer("fork_count").default(0).notNull(),
    publishedAt: timestamp("published_at").defaultNow().notNull(),
  },
  (t) => [unique().on(t.sourceRecipeId)]
)

// ── User recipe interactions ───────────────────────────────────────────────────

export const userRecipeFavorites = pgTable(
  "user_recipe_favorites",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    recipeId: integer("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.recipeId] })]
)

export const userRecipeRatings = pgTable(
  "user_recipe_ratings",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    recipeId: integer("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    review: text("review"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [unique().on(t.userId, t.recipeId)]
)

// ── Meal plans ────────────────────────────────────────────────────────────────

export const mealPlans = pgTable(
  "meal_plans",
  {
    id: serial("id").primaryKey(),
    weekStart: date("week_start").notNull(),
    householdId: uuid("household_id").references(() => households.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [unique().on(t.householdId, t.weekStart)]
)

export const mealPlanSlots = pgTable(
  "meal_plan_slots",
  {
    id: serial("id").primaryKey(),
    mealPlanId: integer("meal_plan_id")
      .notNull()
      .references(() => mealPlans.id, { onDelete: "cascade" }),
    dayDate: date("day_date").notNull(),
    mealType: mealTypeEnum("meal_type").notNull(),
    recipeId: integer("recipe_id").references(() => recipes.id),
    notes: text("notes"),
  },
  (t) => [unique().on(t.mealPlanId, t.dayDate, t.mealType)]
)

// ── Meals (composite meal definitions) ────────────────────────────────────────

export const meals = pgTable("meals", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  householdId: uuid("household_id").references(() => households.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const mealRecipes = pgTable(
  "meal_recipes",
  {
    id: serial("id").primaryKey(),
    mealId: integer("meal_id").notNull().references(() => meals.id, { onDelete: "cascade" }),
    recipeId: integer("recipe_id").notNull().references(() => recipes.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").default(0).notNull(),
  },
  (t) => [unique().on(t.mealId, t.recipeId)]
)

// ── Grocery ───────────────────────────────────────────────────────────────────

export const groceryLists = pgTable("grocery_lists", {
  id: serial("id").primaryKey(),
  mealPlanId: integer("meal_plan_id").references(() => mealPlans.id),
  householdId: uuid("household_id").references(() => households.id, { onDelete: "cascade" }),
  weekStart: date("week_start").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const groceryItems = pgTable("grocery_items", {
  id: serial("id").primaryKey(),
  groceryListId: integer("grocery_list_id")
    .notNull()
    .references(() => groceryLists.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  quantity: text("quantity"),
  unit: text("unit"),
  category: text("category"),
  checked: boolean("checked").default(false).notNull(),
  checkedAt: timestamp("checked_at"),
  recipeIds: integer("recipe_ids").array().default([]),
  pricePerUnit: numeric("price_per_unit", { precision: 10, scale: 2 }),
  estimatedTotal: numeric("estimated_total", { precision: 10, scale: 2 }),
})

// ── User preferences ──────────────────────────────────────────────────────────

export const userPreferences = pgTable("user_preferences", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  calorieTarget: integer("calorie_target"),
  weeklyBudgetTarget: numeric("weekly_budget_target", { precision: 10, scale: 2 }),
  breakfastTime: text("breakfast_time").default("08:00"),
  lunchTime: text("lunch_time").default("12:30"),
  snackTime: text("snack_time").default("15:00"),
  dinnerTime: text("dinner_time").default("18:30"),
  reminderLeadMin: integer("reminder_lead_min").default(30),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// ── Fridge scans ──────────────────────────────────────────────────────────────

export const fridgeScans = pgTable("fridge_scans", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  ingredients: jsonb("ingredients").$type<string[]>().notNull().default([]),
  scannedAt: timestamp("scanned_at").defaultNow().notNull(),
})

// ── Push subscriptions ────────────────────────────────────────────────────────

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [unique().on(t.userId, t.endpoint)]
)
