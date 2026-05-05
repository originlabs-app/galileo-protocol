"use client";

import { type ProductMaterial } from "@galileo/shared";
import { MinusCircle, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const EMPTY_MATERIAL: ProductMaterial = {
  name: "",
  percentage: 0,
};

interface ProductMaterialsEditorProps {
  materials: ProductMaterial[];
  onChange: (materials: ProductMaterial[]) => void;
  disabled?: boolean;
  idPrefix?: string;
}

export function ProductMaterialsEditor({
  materials,
  onChange,
  disabled = false,
  idPrefix = "product-material",
}: ProductMaterialsEditorProps) {
  function updateMaterial(
    index: number,
    field: keyof ProductMaterial,
    value: string,
  ) {
    onChange(
      materials.map((material, materialIndex) => {
        if (materialIndex !== index) {
          return material;
        }

        if (field === "percentage") {
          return {
            ...material,
            percentage: Number.isFinite(Number(value)) ? Number(value) : 0,
          };
        }

        return {
          ...material,
          name: value,
        };
      }),
    );
  }

  function addMaterial() {
    onChange([...materials, EMPTY_MATERIAL]);
  }

  function removeMaterial(index: number) {
    onChange(materials.filter((_, materialIndex) => materialIndex !== index));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <Label>Materials</Label>
          <p className="text-sm text-muted-foreground">
            Capture the composition that should travel with the passport draft.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addMaterial}
          disabled={disabled}
        >
          <PlusCircle className="size-4" />
          Add material
        </Button>
      </div>

      {materials.length === 0 ? (
        <div className="rounded-lg border border-dashed px-4 py-5 text-sm text-muted-foreground">
          No materials added yet.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {materials.map((material, index) => {
            const rowNumber = index + 1;
            const nameId = `${idPrefix}-name-${rowNumber}`;
            const percentageId = `${idPrefix}-percentage-${rowNumber}`;

            return (
              <div
                key={`${idPrefix}-${rowNumber}`}
                className="rounded-lg border border-border/70 p-4"
              >
                <div className="grid gap-4 md:grid-cols-[1fr_180px_auto] md:items-end">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor={nameId}>{`Material name ${rowNumber}`}</Label>
                    <Input
                      id={nameId}
                      value={material.name}
                      placeholder="Calfskin"
                      onChange={(event) =>
                        updateMaterial(index, "name", event.target.value)
                      }
                      disabled={disabled}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor={percentageId}>{`Material percentage ${rowNumber}`}</Label>
                    <Input
                      id={percentageId}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      max="100"
                      step="0.1"
                      value={material.percentage}
                      onChange={(event) =>
                        updateMaterial(index, "percentage", event.target.value)
                      }
                      disabled={disabled}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="justify-self-start text-muted-foreground hover:text-destructive"
                    onClick={() => removeMaterial(index)}
                    disabled={disabled}
                    aria-label={`Remove material ${rowNumber}`}
                  >
                    <MinusCircle className="size-4" />
                    Remove
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
