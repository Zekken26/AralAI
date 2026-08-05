"use client";

import { useState, type ReactNode } from "react";

import { UserMenu } from "@/features/auth/components/user-menu";
import { Sidebar, type NavItem } from "@/components/layout/sidebar";

export function AppShell({ items, title, children }: { items: NavItem[]; title: string; children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="lg:hidden">
        {/* Mobile drawer */}
        {drawerOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setDrawerOpen(false)}
              className="absolute inset-0 bg-slate-900/40"
            />
            <div className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl">
              <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4">
                <span className="font-semibold text-slate-900">AralAI</span>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                >
                  <span className="sr-only">Close navigation</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
              </div>
              <div className="overflow-y-auto" onClick={() => setDrawerOpen(false)}>
                <Sidebar items={items} title={title} />
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white lg:block">
        <div className="flex h-14 items-center border-b border-slate-200 px-5">
          <span className="font-semibold text-slate-900">AralAI</span>
        </div>
        <div className="overflow-y-auto">
          <Sidebar items={items} title={title} />
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation"
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 lg:hidden"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <span className="lg:hidden font-semibold text-slate-900">AralAI</span>
            <span className="hidden lg:inline text-sm text-slate-500">Grade 8 Mathematics</span>
          </div>
          <UserMenu />
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-6 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
