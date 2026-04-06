"use client";
import { useSidebar } from "@/components/ui/sidebar";

export default function Backdrop() {
  const { openMobile, setOpenMobile } = useSidebar();

  return (
    <>
      {openMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setOpenMobile(false)}
        />
      )}
    </>
  );
}
