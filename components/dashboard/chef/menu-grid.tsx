"use client"

import { MenuCard } from "@/components/dashboard/chef/menu-card"
import type { Menu } from "@/components/dashboard/chef/menu-types"

interface MenuGridProps {
  menus: Menu[]
  onEdit: (menu: Menu) => void
  onDelete: (menu: Menu) => void
  deletingMenuId?: string | null
}

export function MenuGrid({ menus, onEdit, onDelete, deletingMenuId }: MenuGridProps) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {menus.map((menu) => (
        <MenuCard
          key={menu.id}
          menu={menu}
          onEdit={onEdit}
          onDelete={onDelete}
          isDeleting={deletingMenuId === menu.id}
        />
      ))}
    </div>
  )
}
