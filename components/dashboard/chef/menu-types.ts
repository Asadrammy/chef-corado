export interface MenuItem {
  id?: string
  name: string
  description?: string
  sortOrder: number
}

export interface MenuSection {
  id?: string
  title: string
  sortOrder: number
  items: MenuItem[]
}

export interface Menu {
  id: string
  title: string
  description?: string
  price: number
  currency?: string
  menuImage?: string
  cuisineType?: string
  eventType?: string
  sections: MenuSection[]
  createdAt: string
  updatedAt: string
}

export interface MenuFormData {
  title: string
  description: string
  price: string
  currency: string
  menuImage: string
  cuisineType: string
  eventType: string
  sections: MenuSection[]
}
