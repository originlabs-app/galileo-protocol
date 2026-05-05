"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  const router = useRouter();
  const { register, isAuthenticated } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [brandName, setBrandName] = useState("");
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/dashboard/setup");
    }
  }, [isAuthenticated, router]);

  function validate(): boolean {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!EMAIL_REGEX.test(email.trim())) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError("");

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await register({
        email: email.trim(),
        password,
        brandName: brandName.trim() || undefined,
      });
      router.push("/dashboard/setup");
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 409) {
          setServerError("An account with this email already exists.");
        } else if (error.status === 400) {
          setServerError(error.message || "Please check your input and try again.");
        } else {
          setServerError("An unexpected error occurred. Please try again.");
        }
      } else {
        setServerError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // Don't render register form if already authenticated
  if (isAuthenticated) return null;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="font-serif text-3xl font-semibold">
            Create Account
          </CardTitle>
          <CardDescription>
            Register for Galileo Protocol to authenticate your products
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="flex flex-col gap-4">
            {serverError && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {serverError}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
                autoComplete="email"
              />
              {errors.email && (
                <p id="email-error" className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password)
                    setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? "password-error" : undefined}
                autoComplete="new-password"
              />
              {errors.password && (
                <p id="password-error" className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="brandName">Brand Name</Label>
              <Input
                id="brandName"
                type="text"
                placeholder="Your luxury brand"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                autoComplete="organization"
              />
              <p className="text-xs text-muted-foreground">
                Optional hint for the Galileo team when assigning your pilot workspace
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating account…" : "Create Account"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-primary underline-offset-4 hover:underline"
              >
                Login
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
