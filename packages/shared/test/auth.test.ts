import { describe, it, expect } from "vitest";
import { emailSchema, passwordSchema } from "../src/validation/auth.js";

describe("email validation schema", () => {
  it("accepts valid email", () => {
    expect(() => emailSchema.parse("user@example.com")).not.toThrow();
  });

  it("accepts email with subdomain", () => {
    expect(() => emailSchema.parse("user@mail.example.com")).not.toThrow();
  });

  it("rejects email without @", () => {
    expect(() => emailSchema.parse("userexample.com")).toThrow();
  });

  it("rejects email without domain", () => {
    expect(() => emailSchema.parse("user@")).toThrow();
  });

  it("rejects empty string", () => {
    expect(() => emailSchema.parse("")).toThrow();
  });
});

describe("password validation schema", () => {
  it("accepts password with 8 characters", () => {
    expect(() => passwordSchema.parse("12345678")).not.toThrow();
  });

  it("accepts password with more than 8 characters", () => {
    expect(() => passwordSchema.parse("MySecureP@ssword123")).not.toThrow();
  });

  it("rejects password with fewer than 8 characters", () => {
    expect(() => passwordSchema.parse("1234567")).toThrow();
  });

  it("rejects empty password", () => {
    expect(() => passwordSchema.parse("")).toThrow();
  });

  it("accepts password with exactly 128 characters", () => {
    expect(() => passwordSchema.parse("a".repeat(128))).not.toThrow();
  });

  it("rejects password exceeding 128 characters", () => {
    expect(() => passwordSchema.parse("a".repeat(129))).toThrow();
  });
});
