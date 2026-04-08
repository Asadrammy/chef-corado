import { redirect } from "next/navigation"

interface ChefRequestProposePageProps {
  params: Promise<{ requestId: string }>
}

export default async function ChefRequestProposePage({ params }: ChefRequestProposePageProps) {
  const { requestId } = await params

  redirect(`/dashboard/chef/requests/${requestId}`)
}
