import { Metadata } from "next"
import { generateMeta } from "@/lib/utils"

export const metadata: Metadata = generateMeta({
  title: "Appearance Settings",
  description: "Customize the appearance of your dashboard",
})

export default function AppearanceSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Appearance Settings</h3>
        <p className="text-sm text-muted-foreground">
          Customize the appearance of your dashboard. Click save when you're done.
        </p>
      </div>
      
      <div className="space-y-4">
        <div className="p-6 border rounded-lg">
          <h4 className="text-md font-medium mb-2">Theme</h4>
          <p className="text-sm text-muted-foreground">
            Choose your preferred theme (light/dark mode).
          </p>
        </div>
        
        <div className="p-6 border rounded-lg">
          <h4 className="text-md font-medium mb-2">Font Size</h4>
          <p className="text-sm text-muted-foreground">
            Adjust the font size for better readability.
          </p>
        </div>
        
        <div className="p-6 border rounded-lg">
          <h4 className="text-md font-medium mb-2">Layout</h4>
          <p className="text-sm text-muted-foreground">
            Customize the layout and spacing of your dashboard.
          </p>
        </div>
      </div>
    </div>
  )
}
