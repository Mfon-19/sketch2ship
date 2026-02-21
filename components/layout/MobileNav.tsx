"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FolderOpen, Send, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Overview", icon: Home },
  { href: "/projects", label: "Projects", icon: FolderOpen },
  { href: "/mission-control", label: "Shipments", icon: Send },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="flex border-b border-zinc-200 bg-white md:hidden">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href ||
          (item.href.includes("/projects") && pathname.startsWith("/projects")) ||
          (item.href === "/mission-control" && pathname.startsWith("/mission-control"));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 px-3 py-3 text-xs",
              isActive ? "text-zinc-900" : "text-zinc-500"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
