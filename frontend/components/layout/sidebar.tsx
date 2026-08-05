"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = {
  href: string;
  label: string;
  /** Placeholder routes are not functional in this milestone. */
  placeholder?: boolean;
};

function isActive(pathname: string, href: string): boolean {
  if (href === "/student/dashboard" || href === "/teacher/dashboard") {
    return pathname === href;
  }
  return pathname.startsWith(href);
}

export function Sidebar({ items, title }: { items: NavItem[]; title: string }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="flex h-full flex-col gap-1 p-3">
      <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </p>
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
              active ? "bg-teal-50 text-teal-800" : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            {item.label}
            {item.placeholder ? (
              <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                Soon
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
