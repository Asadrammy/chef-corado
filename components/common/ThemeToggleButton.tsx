"use client";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/button";
import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";

export default function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="h-10 w-10 rounded-xl border border-border/60 bg-background/80 shadow-sm transition-all duration-200 hover:border-border hover:bg-muted/70 hover:shadow-md hover:-translate-y-0.5"
      aria-label="Toggle theme"
    >
      {theme === "light" ? (
        <MoonIcon className="h-5 w-5" />
      ) : (
        <SunIcon className="h-5 w-5" />
      )}
    </Button>
  );
}
