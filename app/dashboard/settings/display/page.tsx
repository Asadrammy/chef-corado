import { Metadata } from "next"
import { generateMeta } from "@/lib/utils"

export const metadata: Metadata = generateMeta({
  title: "Display Settings",
  description: "Configure your display preferences",
})

export default function DisplaySettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Display Settings</h3>
        <p className="text-sm text-muted-foreground">
          Configure your display preferences. Click save when you're done.
        </p>
      </div>
      
      <div className="space-y-4">
        <div className="p-6 border rounded-lg">
          <h4 className="text-md font-medium mb-2">Language</h4>
          <p className="text-sm text-muted-foreground">
            Select your preferred language for the interface.
          </p>
        </div>
        
        <div className="p-6 border rounded-lg">
          <h4 className="text-md font-medium mb-2">Time Zone</h4>
          <p className="text-sm text-muted-foreground">
            Set your time zone for accurate scheduling.
          </p>
        </div>
        
        <div className="p-6 border rounded-lg">
          <h4 className="text-md font-medium mb-2">Date Format</h4>
          <p className="text-sm text-muted-foreground">
            Choose your preferred date and time format.
          </p>
        </div>
      </div>
    </div>
  )
}
