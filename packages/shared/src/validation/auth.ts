/**
 * Zod schemas for authentication input validation.
 *
 * @module validation/auth
 */

import { z } from "zod";

/** Email validation schema */
export const emailSchema = z.string().email("Invalid email address");

/** Password validation schema — minimum 8, maximum 128 characters */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters");
