import { ChefMessages } from "@/components/dashboard/chef/chef-messages"

interface ChefMessageThreadPageProps {
  params: Promise<{ userId: string }>
}

export default async function ChefMessageThreadPage({ params }: ChefMessageThreadPageProps) {
  const { userId } = await params

  return <ChefMessages initialUserId={userId} />
}
