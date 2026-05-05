import { describe, it, expect, expectTypeOf } from "vitest";
import type { User, UserPublic, UserInternal } from "../src/types/user.js";
import { Role } from "../src/types/user.js";

describe("UserPublic type", () => {
  it("has id, email, role, brandId, createdAt, updatedAt fields", () => {
    const userPublic: UserPublic = {
      id: "test-id",
      email: "user@example.com",
      role: Role.BRAND_ADMIN,
      brandId: "brand-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(userPublic.id).toBe("test-id");
    expect(userPublic.email).toBe("user@example.com");
    expect(userPublic.role).toBe(Role.BRAND_ADMIN);
    expect(userPublic.brandId).toBe("brand-1");
    expect(userPublic.createdAt).toBeInstanceOf(Date);
    expect(userPublic.updatedAt).toBeInstanceOf(Date);
  });

  it("does NOT have passwordHash or refreshToken", () => {
    const userPublic: UserPublic = {
      id: "test-id",
      email: "user@example.com",
      role: Role.VIEWER,
      brandId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Verify at runtime that these keys don't exist on the object
    expect("passwordHash" in userPublic).toBe(false);
    expect("refreshToken" in userPublic).toBe(false);
  });

  it("allows null brandId", () => {
    const userPublic: UserPublic = {
      id: "test-id",
      email: "user@example.com",
      role: Role.VIEWER,
      brandId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(userPublic.brandId).toBeNull();
  });
});

describe("UserInternal type", () => {
  it("has passwordHash and refreshToken fields", () => {
    const userInternal: UserInternal = {
      id: "test-id",
      email: "user@example.com",
      passwordHash: "$2b$12$hashedvalue",
      role: Role.ADMIN,
      brandId: null,
      refreshToken: "hashed-refresh-token",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(userInternal.passwordHash).toBe("$2b$12$hashedvalue");
    expect(userInternal.refreshToken).toBe("hashed-refresh-token");
  });

  it("allows null refreshToken", () => {
    const userInternal: UserInternal = {
      id: "test-id",
      email: "user@example.com",
      passwordHash: "$2b$12$hashedvalue",
      role: Role.OPERATOR,
      brandId: "brand-1",
      refreshToken: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(userInternal.refreshToken).toBeNull();
  });

  it("includes all UserPublic fields plus secrets", () => {
    const userInternal: UserInternal = {
      id: "test-id",
      email: "user@example.com",
      passwordHash: "$2b$12$hashedvalue",
      role: Role.BRAND_ADMIN,
      brandId: "brand-1",
      refreshToken: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // All UserPublic fields are present
    expect(userInternal.id).toBeDefined();
    expect(userInternal.email).toBeDefined();
    expect(userInternal.role).toBeDefined();
    expect(userInternal.brandId).toBeDefined();
    expect(userInternal.createdAt).toBeDefined();
    expect(userInternal.updatedAt).toBeDefined();
    // Plus secrets
    expect(userInternal.passwordHash).toBeDefined();
    expect(userInternal.refreshToken).toBeDefined();
  });
});

describe("User backward compatibility", () => {
  it("User type is an alias for UserInternal", () => {
    // User should still be usable (backward compat)
    const user: User = {
      id: "test-id",
      email: "user@example.com",
      passwordHash: "$2b$12$hashedvalue",
      role: Role.ADMIN,
      brandId: null,
      refreshToken: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(user.passwordHash).toBeDefined();
    expect(user.refreshToken).toBeDefined();
  });
});
