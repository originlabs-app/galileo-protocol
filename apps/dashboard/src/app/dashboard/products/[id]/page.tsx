"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Edit3,
  ExternalLink,
  Flame,
  Loader2,
  LockKeyhole,
  QrCode,
  Save,
  X,
} from "lucide-react";
import {
  CATEGORIES,
  ETHEREUM_ADDRESS_RE,
  readProductPassportAuthoringMetadata,
  type ProductMaterial,
  type ProductMediaDescriptor,
  type ProductStatus,
} from "@galileo/shared";
import { api, ApiError } from "@/lib/api";
import { ImageUpload } from "@/components/image-upload";
import { ProductMaterialsEditor } from "@/components/product-materials-editor";
import { API_URL, SCANNER_URL } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ProductPassport {
  id: string;
  digitalLink: string;
  txHash?: string | null;
  tokenAddress?: string | null;
  chainId?: number | null;
  mintedAt?: string | null;
  metadata?: unknown;
}

interface ProductEvent {
  id: string;
  type: string;
  createdAt: string;
}

interface Product {
  id: string;
  name: string;
  gtin: string;
  serialNumber: string;
  did: string;
  description: string | null;
  category: string;
  status: ProductStatus;
  imageUrl: string | null;
  passport: ProductPassport | null;
  events: ProductEvent[];
  createdAt: string;
  updatedAt: string;
}

interface ProductResponse {
  success: true;
  data: {
    product: Product;
  };
}

const CATEGORY_OPTIONS = CATEGORIES.map((value) => ({ value, label: value }));

const EVENT_LABEL: Record<string, string> = {
  CREATED: "Identity established",
  UPDATED: "Record details updated",
  MINTED: "Lifecycle mint recorded",
  TRANSFERRED: "Ownership transfer recorded",
  VERIFIED: "Verification recorded",
  RECALLED: "Recall recorded",
};

const CHAIN_NAMES: Record<number, string> = {
  8453: "Base",
  84532: "Base Sepolia",
};

const EXPLORER_URLS: Record<number, string> = {
  8453: "https://basescan.org",
  84532: "https://sepolia.basescan.org",
};

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function IdentityField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-all font-mono text-sm text-foreground">{value}</dd>
    </div>
  );
}

function normalizeMaterials(materials: ProductMaterial[]): ProductMaterial[] {
  return materials
    .map((material) => ({
      name: material.name.trim(),
      percentage: material.percentage,
    }))
    .filter((material) => material.name.length > 0);
}

function formatMaterial(material: ProductMaterial): string {
  return `${material.name} - ${material.percentage}%`;
}

function formatShortHex(value: string): string {
  return `${value.slice(0, 10)}…${value.slice(-8)}`;
}

function buildScannerUrl(digitalLink: string): string {
  return `${SCANNER_URL}/?link=${encodeURIComponent(digitalLink)}`;
}

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const productId = params.id;

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editMaterials, setEditMaterials] = useState<ProductMaterial[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Mint state
  const [showMintDialog, setShowMintDialog] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [mintError, setMintError] = useState<string | null>(null);

  // Recall state
  const [showRecallDialog, setShowRecallDialog] = useState(false);
  const [recallReason, setRecallReason] = useState("");
  const [isRecalling, setIsRecalling] = useState(false);
  const [recallError, setRecallError] = useState<string | null>(null);

  // Transfer state
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferAddress, setTransferAddress] = useState("");
  const [transferAddressError, setTransferAddressError] = useState<string | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [isDownloadingQr, setIsDownloadingQr] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);

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
        setError("Failed to load product");
      }
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  function startEditing() {
    if (!product) {
      return;
    }

    const authoringMetadata = readProductPassportAuthoringMetadata(
      product.passport?.metadata,
    );

    setEditName(product.name);
    setEditDescription(product.description ?? "");
    setEditCategory(product.category);
    setEditMaterials(authoringMetadata.materials ?? []);
    setEditError(null);
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
    setEditError(null);
  }

  async function handleSaveEdit(event: FormEvent) {
    event.preventDefault();
    if (!product) {
      return;
    }

    setIsSaving(true);
    setEditError(null);

    try {
      const body: Record<string, string> = {};
      const currentAuthoringMetadata = readProductPassportAuthoringMetadata(
        product.passport?.metadata,
      );
      const currentMaterials = currentAuthoringMetadata.materials ?? [];
      const normalizedEditMaterials = normalizeMaterials(editMaterials);

      if (editName.trim() !== product.name) {
        body.name = editName.trim();
      }
      if ((editDescription.trim() || "") !== (product.description ?? "")) {
        body.description = editDescription.trim();
      }
      if (editCategory !== product.category) {
        body.category = editCategory;
      }

      const materialsChanged =
        JSON.stringify(normalizedEditMaterials) !==
        JSON.stringify(currentMaterials);
      const payload: Record<string, unknown> = body;

      if (materialsChanged) {
        payload.materials = normalizedEditMaterials;
      }

      if (Object.keys(payload).length === 0) {
        setIsEditing(false);
        return;
      }

      const res = await api<ProductResponse>(`/products/${productId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      setProduct(res.data.product);
      setIsEditing(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setEditError(err.message);
      } else {
        setEditError("Failed to update product");
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRecall(e: FormEvent) {
    e.preventDefault();
    setIsRecalling(true);
    setRecallError(null);
    try {
      const res = await api<ProductResponse>(`/products/${productId}/recall`, {
        method: "POST",
        body: JSON.stringify({ reason: recallReason.trim() || undefined }),
      });
      setProduct(res.data.product);
      setShowRecallDialog(false);
      setRecallReason("");
    } catch (err) {
      setRecallError(
        err instanceof ApiError ? err.message : "Failed to recall product",
      );
    } finally {
      setIsRecalling(false);
    }
  }

  function validateTransferAddress(address: string): string | null {
    if (!address.trim()) return "Wallet address is required";
    if (!ETHEREUM_ADDRESS_RE.test(address.trim()))
      return "Invalid Ethereum address (must be 0x followed by 40 hex characters)";
    return null;
  }

  async function handleTransfer(e: FormEvent) {
    e.preventDefault();
    const addrError = validateTransferAddress(transferAddress);
    if (addrError) {
      setTransferAddressError(addrError);
      return;
    }
    setIsTransferring(true);
    setTransferError(null);
    try {
      const res = await api<ProductResponse>(
        `/products/${productId}/transfer`,
        {
          method: "POST",
          body: JSON.stringify({ toAddress: transferAddress.trim() }),
        },
      );
      setProduct(res.data.product);
      setShowTransferDialog(false);
      setTransferAddress("");
    } catch (err) {
      setTransferError(
        err instanceof ApiError ? err.message : "Failed to transfer product",
      );
    } finally {
      setIsTransferring(false);
    }
  }

  async function handleMint(e: FormEvent) {
    e.preventDefault();
    setIsMinting(true);
    setMintError(null);
    try {
      const res = await api<ProductResponse>(`/products/${productId}/mint`, {
        method: "POST",
      });
      setProduct(res.data.product);
      setShowMintDialog(false);
    } catch (err) {
      setMintError(
        err instanceof ApiError ? err.message : "Failed to mint product",
      );
    } finally {
      setIsMinting(false);
    }
  }

  async function handleDownloadQr() {
    if (!product) {
      return;
    }

    setIsDownloadingQr(true);
    setQrError(null);

    try {
      const response = await fetch(`${API_URL}/products/${product.id}/qr?size=500`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to download QR code");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `galileo-qr-${product.gtin}-${product.serialNumber}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setQrError(err instanceof Error ? err.message : "Failed to download QR code");
    } finally {
      setIsDownloadingQr(false);
    }
  }

  function statusBadge(status: ProductStatus) {
    const config: Record<
      ProductStatus,
      { label: string; className: string }
    > = {
      DRAFT: {
        label: "Draft",
        className: "bg-secondary text-secondary-foreground",
      },
      MINTING: {
        label: "Minting…",
        className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      },
      ACTIVE: {
        label: "Active",
        className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      },
      TRANSFERRED: {
        label: "Transferred",
        className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
      },
      RECALLED: {
        label: "Recalled",
        className: "bg-destructive/15 text-destructive",
      },
    };
    const { label, className } = config[status] ?? {
      label: status,
      className: "",
    };
    return <Badge className={className}>{label}</Badge>;
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
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => router.push("/dashboard/products")}
        >
          Back to Products
        </Button>
      </div>
    );
  }

  const sortedEvents = [...product.events].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
  const authoringMetadata = readProductPassportAuthoringMetadata(
    product.passport?.metadata,
  );
  const productMaterials = authoringMetadata.materials ?? [];
  const productMedia = authoringMetadata.media ?? [];
  const primaryImage = productMedia.find(
    (media) => media.kind === "image" && media.position === 0,
  );
  const canAuthorDraft = product.status === "DRAFT";
  const chainId = product.passport?.chainId ?? null;
  const explorerBase = chainId ? EXPLORER_URLS[chainId] : undefined;
  const txExplorerUrl =
    explorerBase && product.passport?.txHash
      ? `${explorerBase}/tx/${product.passport.txHash}`
      : null;
  const tokenExplorerUrl =
    explorerBase && product.passport?.tokenAddress
      ? `${explorerBase}/address/${product.passport.tokenAddress}`
      : null;
  const scannerProofUrl = product.passport?.digitalLink
    ? buildScannerUrl(product.passport.digitalLink)
    : null;
  const workspaceDescription =
    product.status === "DRAFT"
      ? "Identity is locked. Use this DRAFT passport workspace to refine descriptive metadata and linked media without changing the permanent GTIN plus serial baseline."
      : "Identity is locked and the passport is live. Use this workspace to review public proof, lifecycle history, and post-mint actions.";
  const passportSectionTitle =
    product.status === "DRAFT" ? "Passport draft" : "Passport metadata";
  const passportSectionDescription =
    product.status === "DRAFT"
      ? "Mutable passport fields stay grouped separately from the immutable identity baseline."
      : "Minted passport metadata is locked for public verification.";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/products">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="flex-1 space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Passport workspace
          </p>
          <h1 className="font-serif text-2xl font-semibold text-foreground">
            {product.name}
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {workspaceDescription}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/products/${product.id}/identity`}>
              View identity checkpoint
            </Link>
          </Button>
          {canAuthorDraft && !isEditing && (
            <>
              <Button size="sm" onClick={startEditing}>
                <Edit3 className="size-4" />
                Edit passport draft
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={() => {
                  setMintError(null);
                  setShowMintDialog(true);
                }}
              >
                <Flame className="size-4" />
                Mint to blockchain
              </Button>
            </>
          )}
        </div>
      </div>

      <Card className="border-border/70 bg-muted/20">
        <CardContent className="flex flex-col gap-3 py-5 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Lifecycle status
            </p>
            <p className="text-sm text-foreground">
              {product.status === "DRAFT" &&
                "Passport draft authoring stays available only while status remains DRAFT."}
              {product.status === "MINTING" &&
                "Minting is in progress. The product is being registered on-chain."}
              {product.status === "ACTIVE" &&
                "Product is live on-chain. Transfer ownership or recall if needed."}
              {product.status === "TRANSFERRED" &&
                "Ownership has been transferred. This product is no longer under your control."}
              {product.status === "RECALLED" &&
                "This product has been permanently recalled. No further actions are available."}
            </p>
          </div>
          <div className="inline-flex items-center gap-2">
            <LockKeyhole className="size-4 text-muted-foreground" />
            {statusBadge(product.status)}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="font-serif text-lg">
              Identity baseline
            </CardTitle>
            <CardDescription>
              These identifiers are read-only and never change from this
              workspace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 text-sm">
              <IdentityField label="GTIN" value={product.gtin} />
              <IdentityField label="Serial number" value={product.serialNumber} />
              <IdentityField label="Galileo DID" value={product.did} />
              {product.passport?.digitalLink && (
                <IdentityField
                  label="GS1 Digital Link"
                  value={product.passport.digitalLink}
                />
              )}
            </dl>
          </CardContent>
        </Card>

        {isEditing ? (
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-lg">
                Edit passport draft
              </CardTitle>
              <CardDescription>
                Name, category, description, and material composition can evolve
                while the product stays in DRAFT.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSaveEdit}>
              <CardContent className="flex flex-col gap-4">
                {editError && (
                  <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {editError}
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <Label htmlFor="edit-name">Name</Label>
                  <Input
                    id="edit-name"
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="edit-category">Category</Label>
                  <Select value={editCategory} onValueChange={setEditCategory}>
                    <SelectTrigger id="edit-category" className="w-full">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editDescription}
                    onChange={(event) =>
                      setEditDescription(event.target.value)
                    }
                    rows={4}
                  />
                </div>

                <ProductMaterialsEditor
                  materials={editMaterials}
                  onChange={setEditMaterials}
                  idPrefix="edit-product-material"
                />

                <div className="flex items-center gap-2 pt-2">
                  <Button type="submit" size="sm" disabled={isSaving}>
                    {isSaving ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Save className="size-4" />
                    )}
                    {isSaving ? "Saving…" : "Save changes"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={cancelEditing}
                  >
                    <X className="size-4" />
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </form>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-lg">
                {passportSectionTitle}
              </CardTitle>
              <CardDescription>
                {passportSectionDescription}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 text-sm">
                <div className="flex flex-col gap-1">
                  <dt className="text-muted-foreground">Name</dt>
                  <dd className="text-foreground">{product.name}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-muted-foreground">Category</dt>
                  <dd className="text-foreground">{product.category}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-muted-foreground">Description</dt>
                  <dd className="text-foreground">
                    {product.description || "No description added yet."}
                  </dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-muted-foreground">Materials</dt>
                  <dd className="text-foreground">
                    {productMaterials.length > 0 ? (
                      <ul className="space-y-1">
                        {productMaterials.map((material) => (
                          <li key={formatMaterial(material)}>
                            {formatMaterial(material)}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      "No materials added yet."
                    )}
                  </dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-muted-foreground">Linked media</dt>
                  <dd className="text-foreground">
                    {primaryImage
                      ? `${primaryImage.alt} (${primaryImage.kind})`
                      : "No linked media added yet."}
                  </dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-muted-foreground">Record status</dt>
                  <dd className="text-foreground">{product.status}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-muted-foreground">Last updated</dt>
                  <dd className="text-foreground">
                    {formatDateTime(product.updatedAt)}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Linked media</CardTitle>
          <CardDescription>
            {canAuthorDraft
              ? "Media stays mutable only while the passport remains in DRAFT."
              : "Media is locked after mint to keep the public passport stable."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImageUpload
            productId={productId}
            currentImageUrl={product.imageUrl}
            currentMedia={productMedia as ProductMediaDescriptor[]}
            onUploadComplete={() => fetchProduct()}
            readOnly={!canAuthorDraft}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Record history</CardTitle>
          <CardDescription>
            Lifecycle and authoring updates stay auditable across the full
            passport lifecycle.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sortedEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events yet.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {sortedEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start justify-between gap-4 rounded-lg border border-border/70 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {EVENT_LABEL[event.type] ?? event.type}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {event.type}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(event.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {product.status === "MINTING" && (
        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-950/20">
          <CardContent className="flex items-center gap-3 py-5">
            <Loader2 className="size-5 animate-spin text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Minting in progress
              </p>
              <p className="text-xs text-muted-foreground">
                The product is being registered on-chain. This may take a few
                moments.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {(product.status === "TRANSFERRED" || product.status === "RECALLED") && (
        <Card className="border-border/70 bg-muted/20">
          <CardContent className="flex items-center gap-3 py-5">
            <LockKeyhole className="size-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {product.status === "TRANSFERRED"
                  ? "Ownership transferred"
                  : "Product recalled"}
              </p>
              <p className="text-xs text-muted-foreground">
                {product.status === "TRANSFERRED"
                  ? "This product has been transferred to a new owner. No further lifecycle actions are available."
                  : "This product has been permanently recalled. No further lifecycle actions are available."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {product.status === "ACTIVE" && (
        <Card className="border-success/30 bg-success/5">
          <CardHeader>
            <CardTitle className="font-serif text-lg">Public proof</CardTitle>
            <CardDescription>
              Use this block during demos to move from brand dashboard to public
              verification evidence.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <dl className="grid gap-3 text-sm md:grid-cols-2">
              <IdentityField
                label="Resolver link"
                value={product.passport?.digitalLink ?? "Unavailable"}
              />
              <IdentityField
                label="Chain"
                value={chainId ? (CHAIN_NAMES[chainId] ?? `Chain ${chainId}`) : "Pending"}
              />
              {product.passport?.txHash ? (
                <IdentityField
                  label="Transaction"
                  value={formatShortHex(product.passport.txHash)}
                />
              ) : null}
              {product.passport?.tokenAddress ? (
                <IdentityField
                  label="Token address"
                  value={formatShortHex(product.passport.tokenAddress)}
                />
              ) : null}
              {product.passport?.mintedAt ? (
                <IdentityField
                  label="Minted"
                  value={formatDateTime(product.passport.mintedAt)}
                />
              ) : null}
            </dl>

            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={handleDownloadQr}
                disabled={isDownloadingQr}
              >
                {isDownloadingQr ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <QrCode className="size-4" />
                )}
                {isDownloadingQr ? "Preparing QR" : "Download QR"}
              </Button>
              {product.passport?.digitalLink ? (
                <Button asChild variant="outline">
                  <a
                    href={product.passport.digitalLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="size-4" />
                    Open resolver
                  </a>
                </Button>
              ) : null}
              {scannerProofUrl ? (
                <Button asChild variant="outline">
                  <a
                    href={scannerProofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <QrCode className="size-4" />
                    Open scanner
                  </a>
                </Button>
              ) : null}
              {txExplorerUrl ? (
                <Button asChild variant="outline">
                  <a
                    href={txExplorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="size-4" />
                    Open transaction
                  </a>
                </Button>
              ) : null}
              {tokenExplorerUrl ? (
                <Button asChild variant="outline">
                  <a
                    href={tokenExplorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="size-4" />
                    Open token
                  </a>
                </Button>
              ) : null}
              {qrError && (
                <p className="basis-full text-sm text-destructive">{qrError}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {product.status === "ACTIVE" && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="font-serif text-lg">Product actions</CardTitle>
            <CardDescription>
              Lifecycle actions for active products. These are irreversible.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setTransferError(null);
                setTransferAddressError(null);
                setTransferAddress("");
                setShowTransferDialog(true);
              }}
            >
              Transfer ownership
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setRecallError(null);
                setRecallReason("");
                setShowRecallDialog(true);
              }}
            >
              Recall product
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recall confirmation dialog */}
      <Dialog open={showRecallDialog} onOpenChange={setShowRecallDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recall product</DialogTitle>
            <DialogDescription>
              This will permanently mark the product as recalled. Consumers
              scanning the QR code will see a recalled status. This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRecall} className="flex flex-col gap-4 pt-2">
            {recallError && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {recallError}
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="recall-reason">
                Reason{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="recall-reason"
                placeholder="Describe the recall reason (e.g. safety defect, contamination…)"
                value={recallReason}
                onChange={(e) => setRecallReason(e.target.value)}
                rows={3}
                maxLength={2000}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRecallDialog(false)}
                disabled={isRecalling}
              >
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={isRecalling}>
                {isRecalling ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                {isRecalling ? "Recalling…" : "Confirm recall"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Mint confirmation dialog */}
      <Dialog open={showMintDialog} onOpenChange={setShowMintDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mint to blockchain</DialogTitle>
            <DialogDescription>
              This will register the product on-chain and transition it to
              ACTIVE status. Once minted, descriptive metadata can no longer
              be edited. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleMint} className="flex flex-col gap-4 pt-2">
            {mintError && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {mintError}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowMintDialog(false)}
                disabled={isMinting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isMinting}>
                {isMinting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Flame className="size-4" />
                )}
                {isMinting ? "Minting…" : "Confirm mint"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Transfer dialog with ETH address validation */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer ownership</DialogTitle>
            <DialogDescription>
              Transfer this product to a new Ethereum wallet address. The
              recipient address must be a valid checksummed EVM address.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleTransfer} className="flex flex-col gap-4 pt-2">
            {transferError && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {transferError}
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="transfer-address">Destination wallet address</Label>
              <Input
                id="transfer-address"
                type="text"
                placeholder="0x..."
                value={transferAddress}
                onChange={(e) => {
                  setTransferAddress(e.target.value);
                  if (transferAddressError) setTransferAddressError(null);
                }}
                onBlur={(e) =>
                  setTransferAddressError(
                    validateTransferAddress(e.target.value),
                  )
                }
                aria-invalid={!!transferAddressError}
                aria-describedby={
                  transferAddressError ? "transfer-address-error" : undefined
                }
                className="font-mono"
              />
              {transferAddressError && (
                <p
                  id="transfer-address-error"
                  className="text-sm text-destructive"
                >
                  {transferAddressError}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowTransferDialog(false)}
                disabled={isTransferring}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isTransferring}>
                {isTransferring ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                {isTransferring ? "Transferring…" : "Transfer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
