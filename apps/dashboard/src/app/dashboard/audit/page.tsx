"use client";

import { useState, type FormEvent } from "react";
import { Download } from "lucide-react";
import { API_URL } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type ExportFormat = "json" | "csv";

export default function AuditExportPage() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [resource, setResource] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleExport(e: FormEvent) {
    e.preventDefault();
    setIsExporting(true);
    setErrorMessage(null);

    try {
      const params = new URLSearchParams({ format });
      if (fromDate) params.set("from", new Date(fromDate).toISOString());
      if (toDate) {
        // include the full end-of-day for the selected date
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        params.set("to", end.toISOString());
      }
      if (resource.trim()) params.set("resource", resource.trim());

      const response = await fetch(
        `${API_URL}/audit-log/export?${params.toString()}`,
        { credentials: "include", headers: { "X-Galileo-Client": "dashboard" } },
      );

      if (!response.ok) {
        const body = (await response.json()) as { error?: { message?: string } };
        setErrorMessage(
          body.error?.message ?? `Export failed (${response.status})`,
        );
        return;
      }

      if (format === "csv") {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } else {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }
    } catch {
      setErrorMessage("Network error — could not reach the API");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-2xl">Audit log export</CardTitle>
          <CardDescription>
            Export audit trail entries for compliance review. Use the date range
            to narrow the export window.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleExport}>
          <CardContent className="flex flex-col gap-6">
            {errorMessage && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {errorMessage}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="from-date">From date</Label>
                <Input
                  id="from-date"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  max={toDate || undefined}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="to-date">To date</Label>
                <Input
                  id="to-date"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  min={fromDate || undefined}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="resource-filter">
                Resource type{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="resource-filter"
                type="text"
                placeholder="e.g. product, webhook, auth"
                value={resource}
                onChange={(e) => setResource(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="export-format">Export format</Label>
              <Select
                value={format}
                onValueChange={(v) => setFormat(v as ExportFormat)}
              >
                <SelectTrigger id="export-format" className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={isExporting}>
                <Download className="size-4" />
                {isExporting ? "Exporting…" : "Export audit log"}
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
