"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Copy, Fingerprint } from "lucide-react";
import { type ProductStatus } from "@galileo/shared";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ProductPassport {
  id: string;
  digitalLink: string;
}

interface ProductEvent {
  id: string;
  createdAt: string;
}

interface Product {
  id: string;
  name: string;
  gtin: string;
  serialNumber: string;
  did: string;
  status: ProductStatus;
  passport: ProductPassport | null;
  events: ProductEvent[];
  createdAt: string;
}

interface ProductResponse {
  success: true;
  data: {
    product: Product;
  };
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function IdentityValueCard({
  label,
  value,
  copyLabel,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  copyLabel: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <Card className="border-border/70 bg-card/80">
      <CardHeader className="pb-3">
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent className="flex items-start justify-between gap-3">
        <p className="break-all font-mono text-sm text-foreground">{value}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={onCopy}
          aria-label={copyLabel}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function ProductIdentityPage() {
  const params = useParams<{ id: string }>();
  const productId = params.id;

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const fetchProduct = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api<ProductResponse>(`/products/${productId}`);
      setProduct(res.data.product);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to load product identity");
      }
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  async function handleCopy(field: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField((current) => {
        if (current !== field) return current;
        return null;
      }), 1500);
    } catch {
      setCopiedField(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-destructive">
          {error ?? "Product not found"}
        </p>
        <Button variant="outline" size="sm" asChild className="mt-4">
          <Link href="/dashboard/products">Back to Products</Link>
        </Button>
      </div>
    );
  }

  const digitalLink = product.passport?.digitalLink ?? "Unavailable";

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <Button variant="ghost" size="sm" asChild className="-ml-3">
            <Link href="/dashboard/products">
              <ArrowLeft className="size-4" />
              Back to products
            </Link>
          </Button>
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-emerald-300">
              <Fingerprint className="size-3.5" />
              Identity locked in
            </div>
            <h1 className="font-serif text-3xl text-foreground">
              {product.name}
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              GTIN and serial are now the permanent baseline for this item.
              Galileo DID and GS1 Digital Link were derived immediately from
              that identity and are ready to copy into downstream workflows.
            </p>
          </div>
        </div>

        <Button asChild>
          <Link href={`/dashboard/products/${product.id}`}>
            Continue to Product Record
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>

      <Card className="border-border/70 bg-gradient-to-br from-card via-card to-emerald-500/5">
        <CardHeader>
          <CardTitle className="font-serif text-xl">
            Permanent identity checkpoint
          </CardTitle>
          <CardDescription>
            Capture these values before moving into broader record editing.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <IdentityValueCard
            label="GTIN"
            value={product.gtin}
            copyLabel="Copy GTIN"
            copied={copiedField === "gtin"}
            onCopy={() => handleCopy("gtin", product.gtin)}
          />
          <IdentityValueCard
            label="Serial number"
            value={product.serialNumber}
            copyLabel="Copy serial number"
            copied={copiedField === "serial"}
            onCopy={() => handleCopy("serial", product.serialNumber)}
          />
          <IdentityValueCard
            label="Galileo DID"
            value={product.did}
            copyLabel="Copy DID"
            copied={copiedField === "did"}
            onCopy={() => handleCopy("did", product.did)}
          />
          <IdentityValueCard
            label="GS1 Digital Link"
            value={digitalLink}
            copyLabel="Copy GS1 Digital Link"
            copied={copiedField === "digital-link"}
            onCopy={() => handleCopy("digital-link", digitalLink)}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg">
              What became permanent
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              GTIN plus serial now define the item&apos;s immutable identity in
              the Phase 1 workspace.
            </p>
            <p>
              The DID and GS1 Digital Link shown above are deterministic outputs
              of that identity, so the same item resolves to the same canonical
              references everywhere.
            </p>
            <p>
              Descriptive fields such as name, category, imagery, and
              description can still be refined in the product record.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg">Record snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground">Status</span>
              <span className="font-medium text-foreground">{product.status}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground">Created</span>
              <span className="text-foreground">
                {formatDateTime(product.createdAt)}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground">Logged events</span>
              <span className="text-foreground">{product.events.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
