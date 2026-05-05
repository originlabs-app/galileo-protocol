"use client";

import { useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleDownloadData() {
    setIsDownloading(true);
    setDownloadError(null);
    try {
      const res = await api<{ success: true; data: unknown }>("/auth/me/data");
      const json = JSON.stringify(res.data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `galileo-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadError(
        err instanceof ApiError ? err.message : "Export failed. Try again.",
      );
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleDeleteAccount() {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await api("/auth/me/data", {
        method: "DELETE",
        body: JSON.stringify({ confirm: "DELETE_MY_ACCOUNT" }),
      });
      setConfirmOpen(false);
      await logout();
      router.push("/login");
    } catch (err) {
      setDeleteError(
        err instanceof ApiError ? err.message : "Deletion failed. Try again.",
      );
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account and personal data.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
          <CardDescription>
            Signed in as <span className="font-medium">{user?.email}</span>
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your data (GDPR)</CardTitle>
          <CardDescription>
            Under GDPR Art.&nbsp;15 and Art.&nbsp;17, you can export a copy of
            your personal data or permanently delete your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* Download */}
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-foreground">Download my data</p>
              <p className="text-sm text-muted-foreground">
                Export your profile, brand association, and activity as JSON.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleDownloadData}
              disabled={isDownloading}
              className="shrink-0"
            >
              <Download className="mr-2 size-4" />
              {isDownloading ? "Exporting\u2026" : "Download"}
            </Button>
          </div>
          {downloadError && (
            <p className="text-sm text-destructive">{downloadError}</p>
          )}

          {/* Delete */}
          <div className="flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-foreground">Delete my account</p>
              <p className="text-sm text-muted-foreground">
                Permanently removes your personal data. Products and brand data
                are not affected.
              </p>
            </div>
            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="shrink-0"
                  disabled={isDeleting}
                >
                  <Trash2 className="mr-2 size-4" />
                  {isDeleting ? "Deleting\u2026" : "Delete account"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete your account?</DialogTitle>
                  <DialogDescription>
                    This permanently deletes your user account and personal
                    data. Your brand&apos;s products will not be affected. This
                    action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                {deleteError && (
                  <p className="text-sm text-destructive">{deleteError}</p>
                )}
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline" disabled={isDeleting}>
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Deleting\u2026" : "Yes, delete permanently"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
