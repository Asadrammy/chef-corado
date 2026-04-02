import { Metadata } from "next"
import { generateMeta } from "@/lib/utils"

export const metadata: Metadata = generateMeta({
  title: "Account Settings",
  description: "Manage your account settings and preferences",
})

export default function AccountSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Account Settings</h3>
        <p className="text-sm text-muted-foreground">
          Update your account settings here. Click save when you're done.
        </p>
      </div>
      
      <div className="space-y-4">
        <div className="p-6 border rounded-lg">
          <h4 className="text-md font-medium mb-2">Profile Information</h4>
          <p className="text-sm text-muted-foreground">
            This is where you can manage your account settings and preferences.
          </p>
        </div>
        
        <div className="p-6 border rounded-lg">
          <h4 className="text-md font-medium mb-2">Security</h4>
          <p className="text-sm text-muted-foreground">
            Manage your password and security settings.
          </p>
        </div>
        
        <div className="p-6 border rounded-lg">
          <h4 className="text-md font-medium mb-2">Data & Privacy</h4>
          <p className="text-sm text-muted-foreground">
            Control your data and privacy preferences.
          </p>
        </div>
      </div>
    </div>
  )
}
