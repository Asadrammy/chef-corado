"use client";
 import { useState } from "react";
 import { useSession, signOut } from "next-auth/react";
import { UserCircleIcon, ArrowRightOnRectangleIcon, Cog6ToothIcon } from "@heroicons/react/24/outline";
 import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export default function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: session } = useSession();

  const handleSignOut = () => {
    signOut({ callbackUrl: `${window.location.origin}/login` });
  };

  const userInitial = session?.user?.name?.slice(0, 1).toUpperCase() || "U";

  return (
    <div className="relative">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-xl border border-border/60 bg-background/80 shadow-sm transition-all duration-200 hover:border-border hover:bg-muted/70 hover:shadow-md hover:-translate-y-0.5"
          >
            <Avatar className="h-6 w-6 rounded-lg">
              <AvatarImage src="" alt={session?.user?.name || ""} />
              <AvatarFallback className="bg-background text-foreground text-xs">
                {userInitial}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="w-56 rounded-2xl border-border/60 bg-popover/95 p-1.5 shadow-xl shadow-black/10 backdrop-blur-xl"
        >
          <div className="px-2 py-2">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 rounded-xl border border-border/60">
                <AvatarImage src="" alt={session?.user?.name || ""} />
                <AvatarFallback className="bg-background text-foreground">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground text-sm">
                  {session?.user?.name || "User"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {session?.user?.role || "Guest"}
                </p>
              </div>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-2 px-3 py-2 text-sm"
            >
              <Cog6ToothIcon className="h-4 w-4" />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleSignOut}
            className="flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:text-destructive"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
