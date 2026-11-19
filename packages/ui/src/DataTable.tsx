"use client";

import React, { useMemo, useState } from "react";
import { ArrowUpDown, Search } from "lucide-react";
import { cn, EmptyState, Input, SkeletonBlock } from "./primitives";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  sortable?: boolean;
  align?: "left" | "right";
  sortValue?: (row: T) => string | number;
  render: (row: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  rows: T[];
  columns: DataTableColumn<T>[];
  getRowKey: (row: T) => string;
  loading?: boolean;
  searchPlaceholder?: string;
  searchFilter?: (row: T, query: string) => boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  onRowClick?: (row: T) => void;
  pageSize?: number;
}

export function DataTable<T>({
  rows,
  columns,
  getRowKey,
  loading = false,
  searchPlaceholder = "Filter records...",
  searchFilter,
  emptyTitle = "No records found",
  emptyDescription = "Create your first entry or adjust filters to view items.",
  emptyAction,
  onRowClick,
  pageSize = 15,
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = q && searchFilter ? rows.filter((r) => searchFilter(r, q)) : rows;
    if (sortKey) {
      const col = columns.find((c) => c.key === sortKey);
      if (col?.sortValue) {
        const dir = sortDir === "asc" ? 1 : -1;
        list = [...list].sort((a, b) => {
          const av = col.sortValue!(a);
          const bv = col.sortValue!(b);
          if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
          return String(av).localeCompare(String(bv)) * dir;
        });
      }
    }
    return list;
  }, [rows, query, searchFilter, sortKey, sortDir, columns]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const toggleSort = (key: string): void => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  if (loading) {
    return (
      <div className="space-y-2 p-4">
        <SkeletonBlock className="h-9 w-full" />
        <SkeletonBlock className="h-10 w-full" />
        <SkeletonBlock className="h-10 w-full" />
        <SkeletonBlock className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {searchFilter && (
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#64748b]" aria-hidden="true" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="pl-9"
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
      ) : (
        <div className="overflow-x-auto rounded-[10px] border border-[#dce3ee] bg-white">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    scope="col"
                    className={cn(
                      "px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[#475569]",
                      col.align === "right" && "text-right"
                    )}
                  >
                    {col.sortable && col.sortValue ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className="inline-flex items-center gap-1 hover:text-[#0f172a]"
                      >
                        {col.header}
                        <ArrowUpDown className="h-3 w-3" aria-hidden="true" />
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef2f7]">
              {paged.map((row) => (
                <tr
                  key={getRowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    "transition-colors",
                    onRowClick && "cursor-pointer hover:bg-[#f8fafc]"
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "px-4 py-3 align-middle text-[#0f172a]",
                        col.align === "right" && "text-right bp-tabular"
                      )}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[#e2e8f0] bg-[#f8fafc] px-4 py-2 text-xs text-[#64748b]">
              <span className="bp-tabular">
                Showing {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)} of {filtered.length}
              </span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded border border-[#cbd5e1] bg-white px-2.5 py-1 text-xs font-medium text-[#334155] disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded border border-[#cbd5e1] bg-white px-2.5 py-1 text-xs font-medium text-[#334155] disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
