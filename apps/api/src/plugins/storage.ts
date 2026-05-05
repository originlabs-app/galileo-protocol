import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";

export interface StorageService {
  upload(key: string, buffer: Buffer, contentType: string): Promise<string>;
  delete(key: string): Promise<void>;
  resolveKey(url: string): string | null;
  /** Whether R2/S3 is configured (false = local filesystem fallback) */
  isCloudStorage: boolean;
}

declare module "fastify" {
  interface FastifyInstance {
    storage: StorageService;
  }
}

/**
 * Build a local filesystem storage service (dev/test fallback).
 */
function buildLocalStorage(uploadsDir: string): StorageService {
  return {
    isCloudStorage: false,

    async upload(
      key: string,
      buffer: Buffer,
      _contentType: string,
    ): Promise<string> {
      const filePath = path.join(uploadsDir, key);
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, buffer);
      return `/uploads/${key}`;
    },

    async delete(key: string): Promise<void> {
      const filePath = path.join(uploadsDir, key);
      try {
        await unlink(filePath);
      } catch {
        // File may not exist — ignore
      }
    },

    resolveKey(url: string): string | null {
      const prefix = "/uploads/";
      if (!url.startsWith(prefix)) {
        return null;
      }

      return decodeURIComponent(url.slice(prefix.length));
    },
  };
}

/**
 * Build an R2/S3 storage service.
 */
function buildCloudStorage(
  client: S3Client,
  bucket: string,
  publicUrl: string,
): StorageService {
  const normalizedPublicUrl = publicUrl.replace(/\/+$/, "");

  return {
    isCloudStorage: true,

    async upload(
      key: string,
      buffer: Buffer,
      contentType: string,
    ): Promise<string> {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        }),
      );
      return `${publicUrl}/${key}`;
    },

    async delete(key: string): Promise<void> {
      await client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: key,
        }),
      );
    },

    resolveKey(url: string): string | null {
      const prefix = `${normalizedPublicUrl}/`;
      if (!url.startsWith(prefix)) {
        return null;
      }

      return decodeURIComponent(url.slice(prefix.length));
    },
  };
}

export default fp(async (fastify: FastifyInstance) => {
  const accountId = config.R2_ACCOUNT_ID;
  const accessKeyId = config.R2_ACCESS_KEY_ID;
  const secretAccessKey = config.R2_SECRET_ACCESS_KEY;
  const bucket = config.R2_BUCKET_NAME;

  let storage: StorageService;

  if (accountId && accessKeyId && secretAccessKey && bucket) {
    const client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    const publicUrl =
      config.R2_PUBLIC_URL || `https://${bucket}.${accountId}.r2.dev`;
    storage = buildCloudStorage(client, bucket, publicUrl);

    fastify.log.info("Storage: R2 cloud storage configured");
  } else {
    const uploadsDir = path.resolve(process.cwd(), "uploads");
    storage = buildLocalStorage(uploadsDir);

    if (config.NODE_ENV !== "test") {
      fastify.log.info(
        { uploadsDir },
        "Storage: local filesystem fallback (set R2_* env vars for cloud storage)",
      );
    }
  }

  fastify.decorate("storage", storage);
});
