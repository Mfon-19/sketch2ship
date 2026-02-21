"use client";

import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { MobileNav } from "@/components/layout/MobileNav";

function isStandaloneRoute(pathname: string): boolean {
  if (pathname === "/") {
    return true;
  }

  return /^\/projects\/[^/]+\/(spec|roadmap)$/.test(pathname);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (isStandaloneRoute(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <main className="flex flex-1 flex-col md:ml-[272px]">
        <MobileNav />
        <div className="flex-1">{children}</div>
      </main>
    </div>
  );
}
