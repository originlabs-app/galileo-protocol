"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CATEGORIES,
  type ProductMaterial,
  validateGtin,
} from "@galileo/shared";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { ProductMaterialsEditor } from "@/components/product-materials-editor";
import { Button } from "@/components/ui/button";
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
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

const CATEGORY_OPTIONS = CATEGORIES.map((value) => ({ value, label: value }));

interface FormErrors {
  name?: string;
  gtin?: string;
  serialNumber?: string;
  category?: string;
}

interface CreateProductResponse {
  success: true;
  data: {
    product: { id: string };
  };
}

export default function NewProductPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [gtin, setGtin] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [materials, setMaterials] = useState<ProductMaterial[]>([]);

  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validateField(
    field: keyof FormErrors,
    value: string,
  ): string | undefined {
    switch (field) {
      case "name":
        return value.trim() ? undefined : "Name is required";
      case "gtin":
        if (!value.trim()) return "GTIN is required";
        if (!validateGtin(value.trim()))
          return "Invalid GTIN: check digit verification failed";
        return undefined;
      case "serialNumber":
        return value.trim() ? undefined : "Serial number is required";
      case "category":
        return value ? undefined : "Category is required";
      default:
        return undefined;
    }
  }

  function handleBlur(field: keyof FormErrors, value: string) {
    const error = validateField(field, value);
    setErrors((prev) => ({ ...prev, [field]: error }));
  }

  function validateForm(): boolean {
    const newErrors: FormErrors = {
      name: validateField("name", name),
      gtin: validateField("gtin", gtin),
      serialNumber: validateField("serialNumber", serialNumber),
      category: validateField("category", category),
    };
    setErrors(newErrors);
    return Object.values(newErrors).every((e) => !e);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError("");

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const effectiveBrandId = user?.brandId ?? user?.brand?.id;
      const normalizedMaterials = materials
        .map((material) => ({
          name: material.name.trim(),
          percentage: material.percentage,
        }))
        .filter((material) => material.name.length > 0);

      const res = await api<CreateProductResponse>("/products", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          gtin: gtin.trim(),
          serialNumber: serialNumber.trim(),
          category,
          description: description.trim() || undefined,
          materials:
            normalizedMaterials.length > 0 ? normalizedMaterials : undefined,
          brandId: effectiveBrandId,
        }),
      });

      router.push(`/dashboard/products/${res.data.product.id}/identity`);
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else {
        setServerError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-2xl">
            Create New Product
          </CardTitle>
          <CardDescription>
            Register a new product with its GTIN and serial number to create a
            digital passport.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="flex flex-col gap-6">
            {serverError && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {serverError}
              </div>
            )}

            {/* Name */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Product name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name)
                    setErrors((prev) => ({ ...prev, name: undefined }));
                }}
                onBlur={(e) => handleBlur("name", e.target.value)}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "name-error" : undefined}
              />
              {errors.name && (
                <p id="name-error" className="text-sm text-destructive">
                  {errors.name}
                </p>
              )}
            </div>

            {/* GTIN */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="gtin">GTIN</Label>
              <Input
                id="gtin"
                type="text"
                placeholder="13 or 14 digit GTIN"
                value={gtin}
                onChange={(e) => {
                  setGtin(e.target.value);
                  if (errors.gtin)
                    setErrors((prev) => ({ ...prev, gtin: undefined }));
                }}
                onBlur={(e) => handleBlur("gtin", e.target.value)}
                aria-invalid={!!errors.gtin}
                aria-describedby={errors.gtin ? "gtin-error" : undefined}
              />
              {errors.gtin && (
                <p id="gtin-error" className="text-sm text-destructive">
                  {errors.gtin}
                </p>
              )}
            </div>

            {/* Serial Number */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="serialNumber">Serial Number</Label>
              <Input
                id="serialNumber"
                type="text"
                placeholder="Unique serial number"
                value={serialNumber}
                onChange={(e) => {
                  setSerialNumber(e.target.value);
                  if (errors.serialNumber)
                    setErrors((prev) => ({
                      ...prev,
                      serialNumber: undefined,
                    }));
                }}
                onBlur={(e) => handleBlur("serialNumber", e.target.value)}
                aria-invalid={!!errors.serialNumber}
                aria-describedby={
                  errors.serialNumber ? "serialNumber-error" : undefined
                }
              />
              {errors.serialNumber && (
                <p
                  id="serialNumber-error"
                  className="text-sm text-destructive"
                >
                  {errors.serialNumber}
                </p>
              )}
            </div>

            {/* Category */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={category}
                onValueChange={(value) => {
                  setCategory(value);
                  if (errors.category)
                    setErrors((prev) => ({ ...prev, category: undefined }));
                }}
              >
                <SelectTrigger
                  id="category"
                  className="w-full"
                  aria-invalid={!!errors.category}
                  aria-describedby={
                    errors.category ? "category-error" : undefined
                  }
                >
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <p id="category-error" className="text-sm text-destructive">
                  {errors.category}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="description">
                Description{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Product description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <ProductMaterialsEditor
              materials={materials}
              onChange={setMaterials}
              idPrefix="create-product-material"
            />

            <div className="rounded-lg border border-border/70 bg-muted/30 px-4 py-4 text-sm text-muted-foreground">
              Linked media stays in the same passport draft. Once identity is
              created, the next workspace exposes the DRAFT-only media controls
              for image upload and alt text authoring.
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating…" : "Create Product"}
              </Button>
              <Button variant="outline" type="button" asChild>
                <Link href="/dashboard/products">Cancel</Link>
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
