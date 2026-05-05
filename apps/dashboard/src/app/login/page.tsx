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
import { SiweLogin } from "@/components/siwe-login";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );
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
      await login({ email: email.trim(), password });
      router.push("/dashboard/setup");
    } catch (error) {
      if (error instanceof ApiError) {
        setServerError("Invalid email or password. Please try again.");
      } else {
        setServerError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // Don't render login form if already authenticated
  if (isAuthenticated) return null;

  return (
    <div className="dashboard-ocean-shell flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md border-cyan-200/15 bg-[linear-gradient(180deg,rgba(4,28,48,0.92),rgba(0,8,16,0.96))] shadow-[0_24px_90px_rgba(0,255,255,0.08)]">
        <CardHeader className="px-7 text-center">
          <CardTitle className="font-serif text-3xl font-semibold text-[var(--champagne)]">
            Welcome Back
          </CardTitle>
          <CardDescription>
            Sign in to your Galileo Protocol account
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="flex flex-col gap-5 px-7">
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
                  if (errors.email)
                    setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
                autoComplete="email"
                className="bg-[rgba(135,206,235,0.06)]"
              />
              {errors.email && (
                <p id="email-error" className="text-sm text-destructive">
                  {errors.email}
                </p>
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
                aria-describedby={
                  errors.password ? "password-error" : undefined
                }
                autoComplete="current-password"
                className="bg-[rgba(135,206,235,0.06)]"
              />
              {errors.password && (
                <p id="password-error" className="text-sm text-destructive">
                  {errors.password}
                </p>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-5 px-7 pt-3">
            <Button
              type="submit"
              className="w-full shadow-[0_0_30px_rgba(0,255,255,0.22)]"
              size="lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Signing in…" : "Sign In"}
            </Button>
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <SiweLogin />
            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="text-primary underline-offset-4 hover:underline"
              >
                Register
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
