import ScraperForm from "@/components/scraper-form"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

export default function AddRecipePage() {
  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-4">
      <div className="mb-5">
        <Link
          href="/recipes"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ChevronLeft size={16} />
          Recipes
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">Add Recipe</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Paste a recipe URL. The app will extract the recipe automatically.
        </p>
      </div>
      <ScraperForm />
    </div>
  )
}
