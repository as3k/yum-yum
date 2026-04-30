import HeaderControls from "@/components/header-controls"
import FridgeScanner from "@/components/fridge-scanner"

export default function FridgePage() {
  return (
    <div className="max-w-2xl mx-auto px-4 pt-8 pb-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">What's in my fridge?</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Snap a photo to find recipes you can make now</p>
        </div>
        <HeaderControls />
      </div>
      <FridgeScanner />
    </div>
  )
}
