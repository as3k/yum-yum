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

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

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
  notes: text("notes"),
  fodmapFlags: jsonb("fodmap_flags").$type<FodmapFlag[]>().default([]),
  nutritionPerServing: jsonb("nutrition_per_serving").$type<NutritionData>(),
  addedDate: date("added_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

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

export const mealPlans = pgTable("meal_plans", {
  id: serial("id").primaryKey(),
  weekStart: date("week_start").unique().notNull(),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

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

export const meals = pgTable("meals", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
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

export const groceryLists = pgTable("grocery_lists", {
  id: serial("id").primaryKey(),
  mealPlanId: integer("meal_plan_id").references(() => mealPlans.id),
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
})
