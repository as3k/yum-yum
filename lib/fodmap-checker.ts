export interface Violation {
  ingredient: string
  type: "fodmap" | "carb"
  reason: string
  suggestion: string
}

const FODMAP_RULES: { pattern: RegExp; reason: string; suggestion: string }[] = [
  {
    pattern: /\bgarlic\b(?!.{0,20}infused)/i,
    reason: "Garlic contains fructans (high FODMAP)",
    suggestion: "Use garlic-infused olive oil instead",
  },
  {
    pattern: /\bonion\b/i,
    reason: "Onion is high FODMAP in all forms",
    suggestion: "Omit completely — no safe substitute with same flavor",
  },
  {
    pattern: /\bshallot/i,
    reason: "Shallots are high FODMAP",
    suggestion: "Omit or use green onion tops only",
  },
  {
    pattern: /\bleek/i,
    reason: "Leeks are high FODMAP",
    suggestion: "Omit or use green onion tops only",
  },
  {
    pattern: /\b(whole milk|2% milk|skim milk|cow.?s milk|dairy milk)\b/i,
    reason: "Cow's milk contains lactose (high FODMAP) and is dairy",
    suggestion: "Use unsweetened almond milk or coconut milk",
  },
  {
    pattern: /\bbutter\b(?!.{0,10}(nut|peanut|almond|cashew|sun))/i,
    reason: "Butter is dairy",
    suggestion: "Use dairy-free butter or coconut oil",
  },
  {
    pattern: /\b(cream cheese|sour cream|ricotta|mascarpone)\b/i,
    reason: "Soft cheeses are high lactose (high FODMAP) and dairy",
    suggestion: "Use dairy-free cream cheese (Violife) or omit",
  },
  {
    pattern: /\b(heavy cream|whipping cream|half.and.half)\b/i,
    reason: "Cream is dairy",
    suggestion: "Use full-fat coconut cream",
  },
  {
    pattern:
      /\b(cheddar|mozzarella|parmesan|gouda|swiss|brie|feta|monterey jack|colby|cream cheese)\b/i,
    reason: "Cow's milk cheese is dairy",
    suggestion:
      "Use dairy-free cheese (Violife) or goat cheese if Belinda tolerates it",
  },
  {
    pattern: /\b(yogurt|greek yogurt)\b(?!.{0,15}(coconut|dairy.free|almond|soy))/i,
    reason: "Regular yogurt is dairy",
    suggestion: "Use coconut yogurt or dairy-free yogurt",
  },
  {
    pattern: /\bcashew/i,
    reason: "Cashews are high FODMAP",
    suggestion: "Use walnuts, pecans, or macadamia nuts instead",
  },
  {
    pattern: /\bpistachio/i,
    reason: "Pistachios are high FODMAP",
    suggestion: "Use walnuts or pecans instead",
  },
  {
    pattern: /\bhoney\b/i,
    reason: "Honey is high FODMAP (fructose)",
    suggestion: "Use pure maple syrup (max 1 tbsp/serving)",
  },
  {
    pattern: /\bagave\b/i,
    reason: "Agave is high FODMAP",
    suggestion: "Use pure maple syrup (max 1 tbsp/serving)",
  },
  {
    pattern: /\b(apple|pear|mango|cherry|watermelon)\b(?!.{0,10}(cider vinegar|juice))/i,
    reason: "High FODMAP fruit",
    suggestion: "Use blueberries, strawberries, kiwi, or orange instead",
  },
  {
    pattern: /\b(wheat|all.purpose flour|plain flour|regular flour)\b/i,
    reason: "Wheat/gluten is not low FODMAP unless certified gluten-free",
    suggestion: "Use certified gluten-free oat flour or rice flour",
  },
  {
    pattern: /\bregular pasta\b/i,
    reason: "Regular pasta contains wheat (not low FODMAP)",
    suggestion: "Use rice pasta or certified GF pasta",
  },
]

const CARB_RULES: { pattern: RegExp; reason: string; suggestion: string }[] = [
  {
    pattern: /\b(white sugar|granulated sugar|brown sugar|cane sugar)\b/i,
    reason: "Added sugar spikes blood sugar",
    suggestion: "Use maple syrup (1 tbsp max) or reduce/omit",
  },
  {
    pattern: /\b(all.purpose flour|white flour|plain flour)\b/i,
    reason: "White flour is high glycemic",
    suggestion: "Use almond flour or coconut flour for lower carb",
  },
  {
    pattern: /\b(bread crumbs|panko)\b/i,
    reason: "Breadcrumbs add significant carbs",
    suggestion: "Use almond flour or crushed pork rinds for coating",
  },
  {
    pattern: /\bcornstarch\b/i,
    reason: "Cornstarch adds carbs",
    suggestion: "Use arrowroot powder (similar carbs) or reduce sauce by simmering",
  },
]

export function checkViolations(ingredientTexts: string[]): Violation[] {
  const violations: Violation[] = []
  const seen = new Set<string>()

  for (const text of ingredientTexts) {
    for (const rule of FODMAP_RULES) {
      const key = `fodmap:${rule.reason}`
      if (rule.pattern.test(text) && !seen.has(key)) {
        seen.add(key)
        violations.push({
          ingredient: text,
          type: "fodmap",
          reason: rule.reason,
          suggestion: rule.suggestion,
        })
      }
    }
    for (const rule of CARB_RULES) {
      const key = `carb:${rule.reason}`
      if (rule.pattern.test(text) && !seen.has(key)) {
        seen.add(key)
        violations.push({
          ingredient: text,
          type: "carb",
          reason: rule.reason,
          suggestion: rule.suggestion,
        })
      }
    }
  }

  return violations
}
