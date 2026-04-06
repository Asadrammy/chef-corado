export interface Menu {
  id: string
  title: string
  description?: string
  price: number
  menuImage?: string
  createdAt: string
  updatedAt: string
}

export interface MenuFormData {
  title: string
  description: string
  price: string
  menuImage: string
}
