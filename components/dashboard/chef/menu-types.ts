export type MenuType = "PRICED" | "SAMPLE" | "FREE_FORM"

export interface Menu {
  id: string
  title: string
  description?: string
  price?: number
  currency?: string
  menuType?: MenuType
  menuImage?: string
  cuisineType?: string
  eventType?: string
  createdAt: string
  updatedAt: string
}

export interface MenuFormData {
  title: string
  description: string
  price: string
  currency: string
  menuType: MenuType
  menuImage: string
  cuisineType: string
  eventType: string
}

export interface MenuDialogSubmitData {
  title: string
  description?: string
  price?: number
  currency: string
  menuType: MenuType
  menuImage?: string
  cuisineType?: string
  eventType?: string
}
