"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useCallback } from "react";

interface BreadcrumbItem {
  id: string;
  title: string;
}

interface HeaderProps {
  pageTitle?: string;
  pageId?: string;
  breadcrumbs?: BreadcrumbItem[];
}

export function Header({ pageTitle, pageId, breadcrumbs }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [title, setTitle] = useState(pageTitle || "");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    { id: string; title: string }[]
  >([]);
  const [showSearch, setShowSearch] = useState(false);

  const isPageRoute = pathname.startsWith("/pages/");

  const handleTitleChange = useCallback(
    async (newTitle: string) => {
      setTitle(newTitle);
      if (pageId && newTitle.trim()) {
        try {
          await fetch(`/api/pages/${pageId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: newTitle }),
          });
        } catch {
          // Ignore
        }
      }
    },
    [pageId]
  );

  async function handleSearch(query: string) {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(query)}`
      );
      if (res.ok) {
        const data = await res.json();
        setSearchResults(Array.isArray(data) ? data : data.pages ?? []);
      }
    } catch {
      // Ignore
    }
  }

  function getPageDisplayTitle() {
    if (isPageRoute) return undefined;
    if (pathname === "/dashboard") return "Dashboard";
    if (pathname === "/reports") return "Reports";
    if (pathname.startsWith("/reports/")) return "Report Detail";
    if (pathname === "/projects") return "Projects";
    if (pathname.startsWith("/projects/")) return "Project Detail";
    return "NotionFlow";
  }

  const displayTitle = getPageDisplayTitle();
  const hasBreadcrumbs = breadcrumbs && breadcrumbs.length > 0;

  return (
    <header className="flex h-14 items-center gap-4 border-b border-gray-200 bg-white px-6">
      {/* Breadcrumb + Page title */}
      <div className="flex min-w-0 flex-1 items-center gap-1">
        {isPageRoute && hasBreadcrumbs && (
          <div className="flex items-center gap-1 text-sm">
            {breadcrumbs.map((crumb, i) => {
              const trailUpTo = breadcrumbs
                .slice(0, i)
                .map((b) => `${b.id}:${b.title}`)
                .join(",");
              const href = `/pages/${crumb.id}${trailUpTo ? `?trail=${encodeURIComponent(trailUpTo)}` : ""}`;
              return (
                <span key={crumb.id} className="flex items-center gap-1">
                  <Link
                    href={href}
                    className="max-w-[160px] truncate text-gray-500 hover:text-brand-600 hover:underline"
                  >
                    {crumb.title || "Untitled"}
                  </Link>
                  <span className="text-gray-300">/</span>
                </span>
              );
            })}
          </div>
        )}

        {isPageRoute ? (
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="min-w-0 flex-1 border-none bg-transparent text-lg font-semibold text-gray-900 outline-none placeholder-gray-400 focus:ring-0"
            placeholder="Untitled"
          />
        ) : (
          <h1 className="text-lg font-semibold text-gray-900">
            {displayTitle}
          </h1>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => setShowSearch(true)}
          onBlur={() => setTimeout(() => setShowSearch(false), 200)}
          placeholder="Search pages..."
          className="w-56 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm outline-none placeholder-gray-400 focus:border-brand-400 focus:bg-white"
        />
        {showSearch && searchResults.length > 0 && (
          <div className="absolute right-0 top-full z-50 mt-1 w-72 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
            {searchResults.map((result) => (
              <button
                key={result.id}
                onMouseDown={() => {
                  router.push(`/pages/${result.id}`);
                  setShowSearch(false);
                  setSearchQuery("");
                  setSearchResults([]);
                }}
                className="block w-full truncate px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                {result.title || "Untitled"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* User avatar */}
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-medium text-brand-700">
        U
      </div>
    </header>
  );
}
