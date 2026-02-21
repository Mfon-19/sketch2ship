"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpenText,
  FolderOpen,
  SendHorizontal,
  SlidersHorizontal,
  SquarePen,
  UserRound,
  NotebookPen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/components/providers/WorkspaceProvider";

const navItems = [
  { href: "/", label: "Overview", icon: BookOpenText, exact: true },
  {
    href: "/projects",
    label: "Projects",
    icon: FolderOpen,
    pathMatch: "/projects",
  },
  { href: "/mission-control", label: "Shipments", icon: SendHorizontal },
  { href: "/settings", label: "Settings", icon: SlidersHorizontal },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { updateWorkspace } = useWorkspace();

  const handleNewEntry = () => {
    const now = new Date().toISOString();
    const id = crypto.randomUUID?.() ?? `id-${Date.now()}`;

    updateWorkspace((w) => ({
      ...w,
      notebooks: [
        {
          id,
          title: "Daily Log",
          content: "<p></p>",
          createdAt: now,
          updatedAt: now,
        },
        ...w.notebooks,
      ],
    }));
    router.push("/");
  };

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[272px] flex-col border-r border-[#e2ddd3] bg-[#f4f1ea] md:flex">
      <div className="flex h-full flex-col p-5">
        <div className="mb-7 flex items-center gap-3 px-1">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#d5d0c6] bg-[#ece8de] text-[#605b54]">
            <NotebookPen className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-serif text-[2rem] font-bold leading-[1.05] tracking-tight text-[#2e2b27]">
              Sketch2Ship
            </h1>
            <p className="text-[11px] uppercase tracking-[0.24em] text-[#8b867f]">
              Journal
            </p>
          </div>
        </div>

        <button
          onClick={handleNewEntry}
          className="flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#2f2f2f] text-[1rem] font-medium text-[#f9f6ee] shadow-[0_2px_0_rgba(0,0,0,0.08)] transition hover:bg-black"
        >
          <SquarePen className="h-5 w-5" />
          New Entry
        </button>

        <nav className="mt-7 flex flex-1 flex-col gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              "exact" in item && item.exact
                ? pathname === item.href
                : "pathMatch" in item && item.pathMatch
                  ? pathname.startsWith(item.pathMatch)
                  : pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-[1.05rem] transition",
                  isActive
                    ? "bg-[#e6e2da] font-semibold text-[#2f2c28]"
                    : "text-[#6f6a63] hover:bg-[#ece8df] hover:text-[#2f2c28]"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex items-center gap-3 border-t border-[#e2ddd3] pt-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d5d0c6] bg-[#dcd8d0] text-[#7c7770]">
            <UserRound className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[1rem] font-medium text-[#2f2c28]">
              Alex Designer
            </p>
            <p className="truncate text-[0.88rem] text-[#7f7a72]">
              Pro Account
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
