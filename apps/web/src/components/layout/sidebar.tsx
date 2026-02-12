"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface PageItem {
  id: string;
  title: string;
  category: { id: string; name: string } | null;
}

interface Category {
  id: string;
  name: string;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [pages, setPages] = useState<PageItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );
  const [creatingPage, setCreatingPage] = useState(false);

  useEffect(() => {
    fetchPages();
  }, []);

  async function fetchPages() {
    try {
      const res = await fetch("/api/pages");
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.pages ?? [];
        setPages(list);
        // Extract unique categories from pages
        const catMap = new Map<string, string>();
        for (const p of list) {
          if (p.category?.id && p.category?.name) {
            catMap.set(p.category.id, p.category.name);
          }
        }
        setCategories(
          Array.from(catMap.entries()).map(([id, name]) => ({ id, name }))
        );
      }
    } catch {
      // Ignore fetch errors in sidebar
    }
  }

  async function handleNewPage() {
    setCreatingPage(true);
    try {
      const res = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Untitled",
          content: "[]",
          authorId: session?.user?.id ?? "unknown",
        }),
      });
      if (res.ok) {
        const newPage = await res.json();
        setPages((prev) => [newPage, ...prev]);
        router.push(`/pages/${newPage.id}`);
      }
    } catch {
      // Ignore
    } finally {
      setCreatingPage(false);
    }
  }

  async function handleLogout() {
    const { signOut } = await import("next-auth/react");
    signOut({ callbackUrl: "/login" });
  }

  function toggleCategory(id: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  const pagesByCategory = new Map<string | null, PageItem[]>();
  for (const page of pages) {
    const key = page.category?.id ?? null;
    if (!pagesByCategory.has(key)) {
      pagesByCategory.set(key, []);
    }
    pagesByCategory.get(key)!.push(page);
  }

  return (
    <aside className="flex h-screen w-[280px] flex-col border-r border-gray-200 bg-gray-50">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b border-gray-200 px-4">
        <span className="text-lg font-bold text-gray-900">NotionFlow</span>
      </div>

      {/* Navigation */}
      <nav className="space-y-1 px-3 pt-3">
        <Link
          href="/dashboard"
          className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
            isActive("/dashboard")
              ? "bg-brand-50 font-medium text-brand-700"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <span className="w-5 text-center">&#9632;</span>
          Dashboard
        </Link>
        <Link
          href="/reports"
          className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
            isActive("/reports")
              ? "bg-brand-50 font-medium text-brand-700"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <span className="w-5 text-center">&#9776;</span>
          Reports
        </Link>
      </nav>

      {/* New Page */}
      <div className="px-3 pt-4">
        <button
          onClick={handleNewPage}
          disabled={creatingPage}
          className="flex w-full items-center gap-2 rounded-md border border-dashed border-gray-300 px-2 py-1.5 text-sm text-gray-500 hover:border-brand-400 hover:text-brand-600 disabled:opacity-50"
        >
          <span className="w-5 text-center text-lg leading-none">+</span>
          {creatingPage ? "Creating..." : "New Page"}
        </button>
      </div>

      {/* Pages List */}
      <div className="mt-4 flex-1 overflow-y-auto px-3">
        <div className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Pages
        </div>
        <div className="space-y-0.5">
          {pages.slice(0, 30).map((page) => (
            <Link
              key={page.id}
              href={`/pages/${page.id}`}
              className={`block truncate rounded-md px-2 py-1 text-sm ${
                pathname === `/pages/${page.id}`
                  ? "bg-brand-50 font-medium text-brand-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {page.title || "Untitled"}
            </Link>
          ))}
          {pages.length === 0 && (
            <p className="px-2 py-1 text-xs text-gray-400">No pages yet</p>
          )}
        </div>

        {/* Categories */}
        {categories.length > 0 && (
          <div className="mt-4">
            <div className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Categories
            </div>
            <div className="space-y-0.5">
              {categories.map((cat) => {
                const catPages = pagesByCategory.get(cat.id) || [];
                const isExpanded = expandedCategories.has(cat.id);
                return (
                  <div key={cat.id}>
                    <button
                      onClick={() => toggleCategory(cat.id)}
                      className="flex w-full items-center gap-1 rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
                    >
                      <span className="w-4 text-xs text-gray-400">
                        {isExpanded ? "\u25BC" : "\u25B6"}
                      </span>
                      <span className="truncate">{cat.name}</span>
                      <span className="ml-auto text-xs text-gray-400">
                        {catPages.length}
                      </span>
                    </button>
                    {isExpanded && catPages.length > 0 && (
                      <div className="ml-4 space-y-0.5">
                        {catPages.map((page) => (
                          <Link
                            key={page.id}
                            href={`/pages/${page.id}`}
                            className={`block truncate rounded-md px-2 py-1 text-sm ${
                              pathname === `/pages/${page.id}`
                                ? "bg-brand-50 font-medium text-brand-700"
                                : "text-gray-500 hover:bg-gray-100"
                            }`}
                          >
                            {page.title || "Untitled"}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* User / Logout */}
      <div className="border-t border-gray-200 p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600">
            U
          </span>
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
