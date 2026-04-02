"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Loader2, PlusCircle, UtensilsCrossed, Edit, Trash2, DollarSign, TrendingUp, Package, CheckCircle, Check, Clock, Users } from "lucide-react"
import { ImageUpload } from "@/components/ui/image-upload"

// Prevent static generation
export const dynamic = 'force-dynamic'

interface Menu {
  id: string
  title: string
  description?: string
  price: number
  menuImage?: string
  createdAt: string
  updatedAt: string
}

export default function MenusPage() {
  const [menus, setMenus] = useState<Menu[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    menuImage: "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetchMenus()
  }, [])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (dialogOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    
    return () => {
      document.body.style.overflow = ''
    }
  }, [dialogOpen])

  const fetchMenus = async () => {
    try {
      const response = await fetch("/api/menus")
      if (!response.ok) {
        throw new Error("Failed to fetch menus")
      }
      const data = await response.json()
      setMenus(data)
    } catch (err) {
      setError("Failed to load menus")
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      price: "",
      menuImage: "",
    })
    setEditingMenu(null)
    setError("")
  }

  const openDialog = (menu?: Menu) => {
    if (menu) {
      setEditingMenu(menu)
      setFormData({
        title: menu.title,
        description: menu.description || "",
        price: menu.price.toString(),
        menuImage: menu.menuImage || "",
      })
    } else {
      resetForm()
    }
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    resetForm()
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    setSuccess(false)

    try {
      const submitData = {
        title: formData.title,
        description: formData.description || undefined,
        price: parseFloat(formData.price),
        menuImage: formData.menuImage || undefined,
      }

      const url = editingMenu ? `/api/menus/${editingMenu.id}` : "/api/menus"
      const method = editingMenu ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      })

      if (!response.ok) {
        const data = await response.json()
        if (data.details) {
          setError(data.details.map((d: any) => d.message).join(", "))
        } else {
          setError(data.error || "Failed to save menu")
        }
        return
      }

      setSuccess(true)
      closeDialog()
      fetchMenus()
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError("Network error. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (menuId: string) => {
    if (!confirm("Are you sure you want to delete this menu?")) {
      return
    }

    try {
      const response = await fetch(`/api/menus/${menuId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete menu")
      }

      fetchMenus()
    } catch (err) {
      setError("Failed to delete menu")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="w-full flex-1 overflow-auto bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Dashboard Header */}
        <header className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 border-b border-gray-200 pb-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Menu Management</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Manage your menus and offerings</p>
          </div>
          <Button 
            onClick={() => openDialog()}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl px-5 py-2.5 shadow-sm hover:shadow-md transition-all duration-200"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Menu
          </Button>
        </header>

        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-300">Total Menus</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{menus.length}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                <Package className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-300">Total Dishes</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{menus.length * 3}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                <UtensilsCrossed className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-300">Active Menus</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{menus.length}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="w-full bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-green-700 text-sm">Menu {editingMenu ? "updated" : "created"} successfully!</p>
          </div>
        )}

        {error && (
          <div className="w-full bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Main Content Area */}
        <div className="space-y-6">
          {menus.length === 0 ? (
            /* Empty State with Hero Section */
            <div className="space-y-8">
              {/* Getting Started Checklist */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Getting Started</h3>
                <div className="flex flex-col gap-3">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-3 flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-300">Create Menu</span>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-3 flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-300">Add Dishes</span>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-3 flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-300">Start Booking</span>
                  </div>
                </div>
              </div>

              {/* Hero Empty State */}
              <div className="bg-gradient-to-r from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 rounded-2xl border border-gray-200 p-12 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="text-center">
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-full p-6 inline-block mb-6">
                    <UtensilsCrossed className="h-12 w-12 text-gray-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Create Your First Menu</h3>
                  <p className="text-base text-gray-500 dark:text-gray-400 mb-8 max-w-lg mx-auto">
                    Start by creating your first menu to showcase your culinary expertise and begin receiving bookings from clients
                  </p>
                  <Button 
                    onClick={() => openDialog()}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl px-8 py-3 text-base font-medium shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Create Menu
                  </Button>
                </div>
              </div>

              {/* Preview Cards with Images */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-px bg-gray-200 flex-1"></div>
                  <span className="text-sm font-medium text-gray-500">Preview</span>
                  <div className="h-px bg-gray-200 flex-1"></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  <div className="w-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02] overflow-hidden">
                    <div className="h-32 bg-gradient-to-r from-orange-400 to-red-500 rounded-t-xl flex items-center justify-center">
                      <UtensilsCrossed className="h-12 w-12 text-white" />
                    </div>
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Italian Dinner Experience</h4>
                          <div className="flex items-center mt-2">
                            <DollarSign className="h-4 w-4 text-green-600 mr-1" />
                            <span className="text-lg font-semibold text-green-600">$150.00</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" disabled className="rounded-lg">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" disabled className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex gap-2 mb-3">
                        <span className="text-xs bg-gray-100 dark:bg-gray-800 rounded-full px-2 py-1">Italian</span>
                        <span className="text-xs bg-gray-100 dark:bg-gray-800 rounded-full px-2 py-1">5 Courses</span>
                        <span className="text-xs bg-gray-100 dark:bg-gray-800 rounded-full px-2 py-1">2 Hours</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                        Authentic Italian cuisine with handmade pasta and traditional recipes passed down through generations.
                      </p>
                      <Badge variant="secondary" className="text-xs">Preview</Badge>
                    </div>
                  </div>

                  <div className="w-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02] overflow-hidden">
                    <div className="h-32 bg-gradient-to-r from-green-400 to-blue-500 rounded-t-xl flex items-center justify-center">
                      <Package className="h-12 w-12 text-white" />
                    </div>
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Farm-to-Table Experience</h4>
                          <div className="flex items-center mt-2">
                            <DollarSign className="h-4 w-4 text-green-600 mr-1" />
                            <span className="text-lg font-semibold text-green-600">$200.00</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" disabled className="rounded-lg">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" disabled className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex gap-2 mb-3">
                        <span className="text-xs bg-gray-100 dark:bg-gray-800 rounded-full px-2 py-1">Organic</span>
                        <span className="text-xs bg-gray-100 dark:bg-gray-800 rounded-full px-2 py-1">Local</span>
                        <span className="text-xs bg-gray-100 dark:bg-gray-800 rounded-full px-2 py-1">3 Hours</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                        Fresh ingredients from local farms, creating seasonal dishes that celebrate the best of what's available.
                      </p>
                      <Badge variant="secondary" className="text-xs">Preview</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Menu Grid with Section Title */
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Your Menus</span>
                <Badge variant="secondary" className="text-xs">{menus.length}</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {menus.map((menu) => (
                  <Card key={menu.id} className="w-full bg-white dark:bg-gray-900 border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02] overflow-hidden">
                    <div className="h-32 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-t-xl flex items-center justify-center">
                      {menu.menuImage ? (
                        <img src={menu.menuImage} alt={menu.title} className="h-32 w-full object-cover rounded-t-xl" />
                      ) : (
                        <UtensilsCrossed className="h-12 w-12 text-white" />
                      )}
                    </div>
                    <CardHeader className="pb-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">{menu.title}</CardTitle>
                          <div className="flex items-center mt-2">
                            <DollarSign className="h-4 w-4 text-green-600 mr-1" />
                            <span className="text-lg font-semibold text-green-600">
                              ${menu.price.toFixed(2)}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDialog(menu)}
                            className="rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(menu.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2 mb-3">
                        <span className="text-xs bg-gray-100 dark:bg-gray-800 rounded-full px-2 py-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          2 Hours
                        </span>
                        <span className="text-xs bg-gray-100 dark:bg-gray-800 rounded-full px-2 py-1 flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          4-6 People
                        </span>
                      </div>
                      {menu.description ? (
                        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
                          {menu.description}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                          No description provided
                        </p>
                      )}
                      <div className="mt-4">
                        <Badge variant="secondary" className="text-xs">
                          Created {new Date(menu.createdAt).toLocaleDateString()}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Create Menu Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-200">
            {/* Hidden Accessibility Components */}
            <DialogHeader className="sr-only">
              <DialogTitle>{editingMenu ? "Edit Menu" : "Create New Menu"}</DialogTitle>
              <DialogDescription>
                {editingMenu ? "Edit your existing menu item details including name, description, price, and categories." : "Create a new menu item for your chef profile. Add details like name, description, price, and categories."}
              </DialogDescription>
            </DialogHeader>

            {/* Visible Header */}
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingMenu ? "Edit Menu" : "Create New Menu"}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {editingMenu 
                  ? "Update your menu information for clients"
                  : "Set up your menu for clients"
                }
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                {/* Menu Name */}
                <div>
                  <Label htmlFor="title" className="text-sm font-medium text-gray-700 dark:text-gray-300">Menu Name</Label>
                  <Input
                    id="title"
                    name="title"
                    placeholder="e.g., Three-Course Italian Dinner"
                    value={formData.title}
                    onChange={handleChange}
                    required
                    className="mt-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-white transition-all duration-200"
                  />
                </div>
                
                {/* Price */}
                <div>
                  <Label htmlFor="price" className="text-sm font-medium text-gray-700 dark:text-gray-300">Price ($)</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g., 150.00"
                    value={formData.price}
                    onChange={handleChange}
                    required
                    className="mt-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-white transition-all duration-200"
                  />
                </div>
                
                {/* Description */}
                <div>
                  <Label htmlFor="description" className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Describe the dishes, ingredients, and what's included..."
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                    className="mt-1 resize-none bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-white transition-all duration-200"
                  />
                </div>

                {/* Menu Image */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Menu Image</Label>
                  <div className="mt-1">
                    <ImageUpload
                      value={formData.menuImage}
                      onChange={(url) => setFormData(prev => ({ ...prev, menuImage: url }))}
                      onRemove={() => setFormData(prev => ({ ...prev, menuImage: "" }))}
                    />
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
                  <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="ghost"
                  onClick={closeDialog}
                  className="text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-gray-200 rounded-xl px-6 py-3 transition-all duration-200"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={saving}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl px-6 py-3 w-full shadow-sm hover:shadow-md transition-all duration-200"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      {editingMenu ? "Update" : "Create"} Menu
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
