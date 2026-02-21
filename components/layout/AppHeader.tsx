"use client";

import { Search, Bell, Share2, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Breadcrumbs, BreadcrumbItem } from "./Breadcrumbs";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  breadcrumbs?: BreadcrumbItem[];
  status?: { label: string; variant?: "default" | "success" };
  showActions?: boolean;
  searchPlaceholder?: string;
  className?: string;
}

export function AppHeader({
  breadcrumbs = [],
  status,
  showActions = false,
  searchPlaceholder = "Search...",
  className,
}: AppHeaderProps) {
  return (
    <header
      className={cn(
        "flex h-14 items-center justify-between gap-4 border-b border-zinc-200 bg-white px-6",
        className
      )}
    >
      <div className="flex items-center gap-6">
        {breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} />}
        {status && (
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                status.variant === "success" ? "bg-green-500" : "bg-zinc-400"
              )}
            />
            <span className="text-sm text-zinc-600">{status.label}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {status?.label === "In Progress" && (
          <span className="text-xs text-zinc-500">Last synced 2m ago</span>
        )}
        {showActions && (
          <>
            <Button variant="outline" size="sm">
              <Share2 className="mr-1 h-4 w-4" />
              Share
            </Button>
            <Button variant="outline" size="sm">
              <Download className="mr-1 h-4 w-4" />
              Export
            </Button>
            <Button size="sm" className="bg-zinc-800 hover:bg-zinc-700">
              <RefreshCw className="mr-1 h-4 w-4" />
              Regenerate
            </Button>
          </>
        )}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder={searchPlaceholder}
            className="w-48 pl-9"
          />
        </div>
        <Button variant="ghost" size="icon">
          <Bell className="h-4 w-4" />
        </Button>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-sm font-medium text-zinc-700">
          JD
        </div>
      </div>
    </header>
  );
}
