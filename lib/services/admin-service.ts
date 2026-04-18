import { adminRepository } from "@/lib/repositories/admin-repository"

export const adminService = {
  listChefs() {
    return adminRepository.listChefs()
  },

  listBookings() {
    return adminRepository.listBookings()
  },

  listPayments() {
    return adminRepository.listPayments()
  },
}
