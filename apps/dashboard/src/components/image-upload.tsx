"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { type ProductMediaDescriptor } from "@galileo/shared";
import { Image as ImageIcon, Upload } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { API_URL } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface UploadResponse {
  success: true;
  data: {
    upload: {
      imageCid: string;
      imageUrl: string;
      media: ProductMediaDescriptor;
      replacement: {
        action: "added" | "replaced" | "unchanged";
        previousImageUrl: string | null;
        previousImageCid: string | null;
        previousFileDeleted: boolean | null;
      };
    };
  };
}

interface ImageUploadProps {
  productId: string;
  currentImageUrl?: string | null;
  currentMedia?: ProductMediaDescriptor[];
  onUploadComplete?: () => void;
}

const uploadStatusStorageKey = (productId: string) =>
  `galileo:image-upload-status:${productId}`;

function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }

  if (/^https?:\/\//.test(url)) {
    return url;
  }

  if (url.startsWith("/")) {
    return `${API_URL}${url}`;
  }

  return url;
}

export function ImageUpload({
  productId,
  currentImageUrl,
  currentMedia = [],
  onUploadComplete,
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [altText, setAltText] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const primaryImage = useMemo(
    () =>
      currentMedia.find((media) => media.kind === "image" && media.position === 0) ??
      currentMedia.find((media) => media.kind === "image"),
    [currentMedia],
  );

  useEffect(() => {
    setAltText(primaryImage?.alt ?? "");
  }, [primaryImage]);

  // Revoke object URLs created for pending file previews to avoid memory leaks
  useEffect(() => {
    if (!pendingFile || !preview) return;
    return () => {
      URL.revokeObjectURL(preview);
    };
  }, [preview, pendingFile]);

  useEffect(() => {
    if (typeof window === "undefined" || !primaryImage?.cid) {
      return;
    }

    const storedStatus = window.sessionStorage.getItem(
      uploadStatusStorageKey(productId),
    );
    if (!storedStatus) {
      return;
    }

    try {
      const parsed = JSON.parse(storedStatus) as {
        cid?: string;
        message?: string;
      };

      if (parsed.cid === primaryImage.cid && parsed.message) {
        setStatusMessage(parsed.message);
      }
    } catch {
      // Ignore malformed persisted UI state.
    } finally {
      window.sessionStorage.removeItem(uploadStatusStorageKey(productId));
    }
  }, [primaryImage?.cid, productId]);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Show preview immediately so the user can see the image before uploading
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      setPendingFile(file);
      setError(null);
      setStatusMessage(null);
      e.target.value = "";
    },
    [],
  );

  const handleUpload = useCallback(async () => {
    if (!pendingFile) return;
    const trimmedAltText = altText.trim();

    if (!trimmedAltText) {
      setError("Add alt text before uploading linked media.");
      return;
    }

    setIsUploading(true);
    setError(null);
    setStatusMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", pendingFile);
      formData.append("alt", trimmedAltText);

      const data = await api<UploadResponse>(`/products/${productId}/upload`, {
        method: "POST",
        body: formData,
      });

      let nextStatusMessage = "Linked image saved to the DRAFT passport.";
      if (data.data.upload.replacement.action === "replaced") {
        nextStatusMessage =
          data.data.upload.replacement.previousFileDeleted === false
            ? "Linked image replaced. Previous file cleanup needs manual review."
            : "Linked image replaced for this DRAFT passport.";
      } else if (data.data.upload.replacement.action === "unchanged") {
        nextStatusMessage =
          "Linked image metadata updated for this DRAFT passport.";
      }

      setStatusMessage(nextStatusMessage);
      setPendingFile(null);
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(
          uploadStatusStorageKey(productId),
          JSON.stringify({
            cid: data.data.upload.media.cid,
            message: nextStatusMessage,
          }),
        );
      }

      onUploadComplete?.();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "Upload failed");
      }
      setPreview(null);
      setPendingFile(null);
    } finally {
      setIsUploading(false);
    }
  }, [altText, pendingFile, productId, onUploadComplete]);

  const displayUrl =
    preview ??
    resolveMediaUrl(primaryImage?.url) ??
    resolveMediaUrl(currentImageUrl) ??
    null;
  const actionLabel = primaryImage ? "Replace linked image" : "Upload linked image";

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <Label>Linked media draft</Label>
        <p className="text-sm text-muted-foreground">
          Upload the primary product image and store the shared passport media
          descriptor while the record stays in DRAFT.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`media-alt-${productId}`}>Media alt text</Label>
        <Input
          id={`media-alt-${productId}`}
          value={altText}
          onChange={(event) => setAltText(event.target.value)}
          placeholder="Front-facing product image"
        />
      </div>

      {displayUrl ? (
        <div className="relative aspect-square w-full max-w-[200px] overflow-hidden rounded-lg border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={displayUrl}
            alt="Product"
            className="size-full object-cover"
          />
        </div>
      ) : (
        <div className="flex aspect-square w-full max-w-[200px] items-center justify-center rounded-lg border border-dashed">
          <ImageIcon className="size-8 text-muted-foreground" />
        </div>
      )}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isUploading}
          asChild
        >
          <label className="cursor-pointer">
            <Upload className="mr-1 size-3" />
            {pendingFile ? "Change file" : actionLabel}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
          </label>
        </Button>
        {pendingFile && (
          <Button
            type="button"
            size="sm"
            disabled={isUploading}
            onClick={handleUpload}
          >
            {isUploading ? "Uploading..." : "Upload"}
          </Button>
        )}
      </div>
      {primaryImage?.cid ? (
        <p className="text-xs text-muted-foreground">
          Current linked CID: {primaryImage.cid}
        </p>
      ) : null}
      {statusMessage ? (
        <p className="text-xs text-muted-foreground">{statusMessage}</p>
      ) : null}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
