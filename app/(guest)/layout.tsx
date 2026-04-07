import Providers from "@/components/providers";

export default function GuestLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>)
{
  return <div className="h-full overflow-hidden"><Providers>{children}</Providers></div>;
}
