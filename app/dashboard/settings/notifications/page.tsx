import { Metadata } from "next"
import { generateMeta } from "@/lib/utils"

export const metadata: Metadata = generateMeta({
  title: "Notification Settings",
  description: "Manage your notification preferences",
})

export default function NotificationSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Notification Settings</h3>
        <p className="text-sm text-muted-foreground">
          Manage your notification preferences. Click save when you're done.
        </p>
      </div>
      
      <div className="space-y-4">
        <div className="p-6 border rounded-lg">
          <h4 className="text-md font-medium mb-2">Email Notifications</h4>
          <p className="text-sm text-muted-foreground">
            Choose which email notifications you want to receive.
          </p>
        </div>
        
        <div className="p-6 border rounded-lg">
          <h4 className="text-md font-medium mb-2">Push Notifications</h4>
          <p className="text-sm text-muted-foreground">
            Enable or disable push notifications.
          </p>
        </div>
        
        <div className="p-6 border rounded-lg">
          <h4 className="text-md font-medium mb-2">In-App Notifications</h4>
          <p className="text-sm text-muted-foreground">
            Configure how you receive notifications within the app.
          </p>
        </div>
      </div>
    </div>
  )
}
