import { buildPublicMetadata } from "@/lib/public-site";

export const metadata = buildPublicMetadata({
  title: "Culinary Experiences | Chef Marketplace",
  description: "Explore chef-led tasting menus, cooking classes, private dinners, and culinary experiences.",
  path: "/experiences",
});

export default function ExperiencesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
