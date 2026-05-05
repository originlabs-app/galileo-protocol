"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Flame,
  Loader2,
  Package,
  Plus,
  X,
} from "lucide-react";
import { CATEGORIES, type ProductStatus } from "@galileo/shared";
import { api, ApiError } from "@/lib/api";
import { BatchImportDialog } from "@/components/batch-import-dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Product {
  id: string;
  name: string;
  gtin: string;
  serialNumber: string;
  status: ProductStatus;
  category: string;
  imageUrl: string | null;
  createdAt: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ProductsResponse {
  success: true;
  data: {
    products: Product[];
    pagination: Pagination;
  };
}

interface BatchMintResponse {
  success: true;
  data: {
    minted: number;
    errors: Array<{ productId: string; message: string }>;
  };
}

const CATEGORY_OPTIONS = CATEGORIES.map((value) => ({
  value,
  label: value,
}));

type SortField = "name" | "status" | "createdAt" | "updatedAt";
type SortDir = "asc" | "desc";

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: "createdAt", label: "Date created" },
  { value: "updatedAt", label: "Last updated" },
  { value: "name", label: "Name" },
  { value: "status", label: "Status" },
];

const PAGE_SIZE = 20;

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function IdentityState({ status }: { status: ProductStatus }) {
  const label = status === "DRAFT" ? "Identity locked" : "Identity active";

  return (
    <span className="inline-flex w-fit rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
      {label}
    </span>
  );
}

function ProductThumbnail({
  name,
  imageUrl,
}: {
  name: string;
  imageUrl: string | null;
}) {
  return (
    <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          className="size-full object-cover"
          loading="lazy"
        />
      ) : (
        <Package className="size-5 text-muted-foreground" aria-label={name} />
      )}
    </div>
  );
}

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
  const [sortBy, setSortBy] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedDraftProductIds, setSelectedDraftProductIds] = useState<string[]>([]);
  const [isBatchMinting, setIsBatchMinting] = useState(false);
  const [batchMintMessage, setBatchMintMessage] = useState<string | null>(null);
  const [batchMintError, setBatchMintError] = useState<string | null>(null);

  const fetchProducts = useCallback(
    async (
      currentPage: number,
      category?: string,
      currentSortBy: SortField = "createdAt",
      currentSortDir: SortDir = "desc",
    ) => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(currentPage),
          limit: String(PAGE_SIZE),
          sortBy: currentSortBy,
          sortDir: currentSortDir,
        });

        if (category) {
          params.set("category", category);
        }

        const res = await api<ProductsResponse>(
          `/products?${params.toString()}`,
        );
        setProducts(res.data.products);
        setPagination(res.data.pagination);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Failed to load products");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchProducts(page, categoryFilter, sortBy, sortDir);
  }, [page, categoryFilter, sortBy, sortDir, fetchProducts]);

  function handleCategoryChange(value: string) {
    setCategoryFilter(value);
    setPage(1);
  }

  function clearFilters() {
    setCategoryFilter(undefined);
    setPage(1);
  }

  function toggleDraftProduct(productId: string, checked: boolean) {
    setSelectedDraftProductIds((current) =>
      checked
        ? Array.from(new Set([...current, productId]))
        : current.filter((id) => id !== productId),
    );
  }

  async function handleBatchMint() {
    if (selectedDraftProductIds.length === 0) {
      return;
    }

    setIsBatchMinting(true);
    setBatchMintMessage(null);
    setBatchMintError(null);

    try {
      const res = await api<BatchMintResponse>("/products/batch-mint", {
        method: "POST",
        body: JSON.stringify({ productIds: selectedDraftProductIds }),
      });
      setSelectedDraftProductIds([]);
      setBatchMintMessage(
        `Batch mint complete: ${res.data.minted} product${res.data.minted === 1 ? "" : "s"} minted.`,
      );
      if (res.data.errors.length > 0) {
        setBatchMintError(
          `${res.data.errors.length} product${res.data.errors.length === 1 ? "" : "s"} could not be minted.`,
        );
      }
      await fetchProducts(page, categoryFilter, sortBy, sortDir);
    } catch (err) {
      setBatchMintError(
        err instanceof ApiError ? err.message : "Failed to batch mint products",
      );
    } finally {
      setIsBatchMinting(false);
    }
  }

  function handleSortChange(field: SortField) {
    if (field === sortBy) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("asc");
    }
    setPage(1);
  }

  const handleImportComplete = useCallback(() => {
    if (page !== 1) {
      setPage(1);
      return;
    }

    void fetchProducts(1, categoryFilter, sortBy, sortDir);
  }, [categoryFilter, fetchProducts, page, sortBy, sortDir]);

  if (isLoading && !pagination) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-2">
            <div className="h-7 w-32 animate-pulse rounded-md bg-muted" />
            <div className="h-4 w-72 animate-pulse rounded-md bg-muted" />
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>GTIN</TableHead>
                <TableHead>Serial Number</TableHead>
                <TableHead>Identity</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="h-4 w-36 animate-pulse rounded bg-muted" />
                      <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  </TableCell>
                  <TableCell>
                    <div className="h-6 w-28 animate-pulse rounded-full bg-muted" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => fetchProducts(page, categoryFilter)}
        >
          Retry
        </Button>
      </div>
    );
  }

  const hasProducts =
    products.length > 0 || (pagination && pagination.total > 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-foreground">
            Products
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Track the permanent identifiers created for each item before any
            downstream lifecycle workflows enter scope.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <BatchImportDialog onImportComplete={handleImportComplete} />
          <Button asChild>
            <Link href="/dashboard/products/new">
              <Plus className="size-4" />
              New Product
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={selectedDraftProductIds.length === 0 || isBatchMinting}
          onClick={handleBatchMint}
        >
          {isBatchMinting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Flame className="size-4" />
          )}
          {isBatchMinting
            ? "Minting selected"
            : `Mint selected (${selectedDraftProductIds.length})`}
        </Button>
        <Select
          value={categoryFilter ?? ""}
          onValueChange={handleCategoryChange}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={sortBy}
          onValueChange={(v) => handleSortChange(v as SortField)}
        >
          <SelectTrigger className="w-[180px]">
            <ArrowUpDown className="mr-2 size-3.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
          className="text-muted-foreground"
        >
          {sortDir === "desc" ? "Newest first" : "Oldest first"}
        </Button>

        {categoryFilter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground"
          >
            <X className="mr-1 size-3" />
            Clear filters
          </Button>
        )}
      </div>

      {(batchMintMessage || batchMintError) && (
        <div
          role="status"
          className="rounded-md border border-border bg-card px-4 py-3 text-sm"
        >
          {batchMintMessage && (
            <p className="text-foreground">{batchMintMessage}</p>
          )}
          {batchMintError && (
            <p className="text-destructive">{batchMintError}</p>
          )}
        </div>
      )}

      {hasProducts ? (
        <>
          <div className="rounded-lg border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Select</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>GTIN</TableHead>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>Identity</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow
                    key={product.id}
                    className="cursor-pointer"
                    onClick={() =>
                      router.push(`/dashboard/products/${product.id}`)
                    }
                  >
                    <TableCell onClick={(event) => event.stopPropagation()}>
                      {product.status === "DRAFT" ? (
                        <input
                          type="checkbox"
                          className="size-4 accent-primary"
                          aria-label={`Select ${product.name} for batch minting`}
                          checked={selectedDraftProductIds.includes(product.id)}
                          onChange={(event) =>
                            toggleDraftProduct(product.id, event.target.checked)
                          }
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex min-w-[240px] items-center gap-3">
                        <ProductThumbnail
                          name={product.name}
                          imageUrl={product.imageUrl}
                        />
                        <div className="flex flex-col">
                          <span>{product.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {product.category}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {product.gtin}
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {product.serialNumber}
                    </TableCell>
                    <TableCell>
                      <IdentityState status={product.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(product.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(pagination.page - 1) * pagination.limit + 1}
                {"\u2013"}
                {Math.min(
                  pagination.page * pagination.limit,
                  pagination.total,
                )}{" "}
                of {pagination.total} products
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  <ChevronLeft className="size-4" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4">
            <Package className="size-8 text-muted-foreground" />
          </div>
          <h2 className="mt-4 font-serif text-xl font-semibold text-foreground">
            No products yet
          </h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Create your first product to establish its permanent identity before
            any downstream lifecycle steps.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <BatchImportDialog onImportComplete={handleImportComplete} />
            <Button asChild>
              <Link href="/dashboard/products/new">
                <Plus className="size-4" />
                Create Product
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
