import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { readProductPassportAuthoringMetadata } from "@galileo/shared";
import { buildApp } from "../src/server.js";
import type { FastifyInstance } from "fastify";
import { parseCookies, cleanDb, nextFixtureId } from "./helpers.js";

const VALID_GTIN_13 = "4006381333931";

/**
 * Build a multipart/form-data body with a single file field.
 *
 * Returns { body, contentType } ready for Fastify inject().
 */
function buildMultipartBody(
  fieldName: string,
  filename: string,
  mimeType: string,
  fileContent: Buffer,
  fields: Record<string, string> = {},
): { body: Buffer; contentType: string } {
  const boundary = "----TestBoundary" + Date.now();
  const parts: Buffer[] = [];

  for (const [name, value] of Object.entries(fields)) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="${name}"\r\n\r\n` +
          `${value}\r\n`,
      ),
    );
  }

  // File part
  parts.push(
    Buffer.from(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\n` +
        `Content-Type: ${mimeType}\r\n\r\n`,
    ),
  );
  parts.push(fileContent);
  parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

  return {
    body: Buffer.concat(parts),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

/** A tiny valid 1x1 JPEG (smallest possible). */
function tinyJpeg(): Buffer {
  // Minimal JPEG: SOI + APP0 + DQT + SOF0 + DHT + SOS + image data + EOI
  // Using a well-known minimal JPEG byte sequence
  return Buffer.from(
    "ffd8ffe000104a46494600010100000100010000" +
      "ffdb004300080606070605080707070909080a0c" +
      "140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c" +
      "20242e2720222c231c1c2837292c30313434341f" +
      "27393d38323c2e333432ffc0000b080001000101" +
      "011100ffc4001f000001050101010101010000000" +
      "0000000000102030405060708090a0bffc4004010" +
      "000201030302040305050404000001770001020300" +
      "0411051221314106135161072271143281a1082342" +
      "b1c11552d1f02433627282090a161718191a25262" +
      "728292a3435363738393a434445464748494a5354" +
      "55565758595a636465666768696a7374757677787" +
      "97a838485868788898a92939495969798999aa2a3" +
      "a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c" +
      "5c6c7c8c9cad2d3d4d5d6d7d8d9dae1e2e3e4e5" +
      "e6e7e8e9eaf1f2f3f4f5f6f7f8f9faffda00080" +
      "1010000003f00fbdfbd17ffd9",
    "hex",
  );
}

function tinyPng(): Buffer {
  return Buffer.from(
    "89504e470d0a1a0a0000000d4948445200000001" +
      "000000010802000000907753de0000000c494441" +
      "5408d763f8cfc000000002000160e52d6c000000" +
      "0049454e44ae426082",
    "hex",
  );
}

describe("POST /products/:id/upload", () => {
  let app: FastifyInstance;
  let brandAdminCookie: string;
  let viewerCookie: string;
  let adminCookie: string;
  let otherBrandAdminCookie: string;
  let testBrandId: string;
  let otherBrandId: string;
  let fixtureId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await cleanDb(app.prisma);
    fixtureId = nextFixtureId("upload");
    const testBrandSlug = `upload-test-brand-${fixtureId}`;
    const otherBrandSlug = `other-upload-brand-${fixtureId}`;
    const brandAdminEmail = `upload-ba.${fixtureId}@test.com`;
    const viewerEmail = `upload-viewer.${fixtureId}@test.com`;
    const adminEmail = `upload-admin.${fixtureId}@test.com`;
    const otherBrandAdminEmail = `upload-other-ba.${fixtureId}@test.com`;

    // Create test brand
    const brand = await app.prisma.brand.create({
      data: {
        name: "Upload Test Brand",
        slug: testBrandSlug,
        did: `did:galileo:brand:${testBrandSlug}`,
      },
    });
    testBrandId = brand.id;

    // Create another brand
    const otherBrand = await app.prisma.brand.create({
      data: {
        name: "Other Upload Brand",
        slug: otherBrandSlug,
        did: `did:galileo:brand:${otherBrandSlug}`,
      },
    });
    otherBrandId = otherBrand.id;

    // Register and login BRAND_ADMIN
    await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: brandAdminEmail, password: "password123" },
    });
    const baUser = await app.prisma.user.findUnique({
      where: { email: brandAdminEmail },
    });
    await app.prisma.user.update({
      where: { id: baUser!.id },
      data: { role: "BRAND_ADMIN", brandId: testBrandId },
    });
    const baLogin = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: brandAdminEmail, password: "password123" },
    });
    const baCookies = parseCookies(baLogin);
    brandAdminCookie = `galileo_at=${baCookies.galileo_at}`;

    // Register and login VIEWER
    await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: viewerEmail, password: "password123" },
    });
    const viewerUser = await app.prisma.user.findUnique({
      where: { email: viewerEmail },
    });
    await app.prisma.user.update({
      where: { id: viewerUser!.id },
      data: { role: "VIEWER", brandId: testBrandId },
    });
    const viewerLogin = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: viewerEmail, password: "password123" },
    });
    const viewerCookies = parseCookies(viewerLogin);
    viewerCookie = `galileo_at=${viewerCookies.galileo_at}`;

    // Register and login ADMIN (no brand)
    await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: adminEmail, password: "password123" },
    });
    const admUser = await app.prisma.user.findUnique({
      where: { email: adminEmail },
    });
    await app.prisma.user.update({
      where: { id: admUser!.id },
      data: { role: "ADMIN" },
    });
    const admLogin = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: adminEmail, password: "password123" },
    });
    const admCookies = parseCookies(admLogin);
    adminCookie = `galileo_at=${admCookies.galileo_at}`;

    // Register and login other BRAND_ADMIN (different brand)
    await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: otherBrandAdminEmail,
        password: "password123",
      },
    });
    const otherBaUser = await app.prisma.user.findUnique({
      where: { email: otherBrandAdminEmail },
    });
    await app.prisma.user.update({
      where: { id: otherBaUser!.id },
      data: { role: "BRAND_ADMIN", brandId: otherBrandId },
    });
    const otherBaLogin = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: otherBrandAdminEmail,
        password: "password123",
      },
    });
    const otherBaCookies = parseCookies(otherBaLogin);
    otherBrandAdminCookie = `galileo_at=${otherBaCookies.galileo_at}`;
  });

  /** Helper: create a DRAFT product owned by testBrandId */
  async function createDraftProduct(): Promise<string> {
    const res = await app.inject({
      method: "POST",
      url: "/products",
      headers: {
        cookie: brandAdminCookie,
        "x-galileo-client": "test",
      },
      payload: {
        gtin: VALID_GTIN_13,
        serialNumber: "UPLOAD-SN-001",
        name: "Upload Test Watch",
        category: "Watches",
      },
    });
    const json = res.json();
    expect(res.statusCode).toBe(201);
    return json.data.product.id;
  }

  it("uploads a JPEG image to a DRAFT product", async () => {
    const productId = await createDraftProduct();
    const jpeg = tinyJpeg();
    const { body, contentType } = buildMultipartBody(
      "file",
      "watch.jpg",
      "image/jpeg",
      jpeg,
      { alt: "Front-facing watch image" },
    );

    const res = await app.inject({
      method: "POST",
      url: `/products/${productId}/upload`,
      headers: {
        cookie: brandAdminCookie,
        "x-galileo-client": "test",
        "content-type": contentType,
      },
      body,
    });

    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.success).toBe(true);
    expect(json.data.upload.contentType).toBe("image/jpeg");
    expect(json.data.upload.imageCid).toBeTruthy();
    expect(json.data.upload.imageUrl).toBeTruthy();
    expect(json.data.upload.size).toBeGreaterThan(0);
    expect(json.data.upload.media.alt).toBe("Front-facing watch image");
    expect(json.data.upload.replacement.action).toBe("added");
    expect(json.data.upload.replacement.previousFileDeleted).toBeNull();
    expect(json.data.product.imageUrl).toBe(json.data.upload.imageUrl);
    expect(json.data.product.imageCid).toBe(json.data.upload.imageCid);

    const authoring = readProductPassportAuthoringMetadata(
      json.data.product.passport.metadata,
    );
    expect(authoring.media).toEqual([
      {
        kind: "image",
        url: json.data.upload.imageUrl,
        cid: json.data.upload.imageCid,
        alt: "Front-facing watch image",
        position: 0,
      },
    ]);

    const uploadedFile = await app.inject({
      method: "GET",
      url: json.data.upload.imageUrl,
    });
    expect(uploadedFile.statusCode).toBe(200);
    expect(uploadedFile.headers["content-type"]).toContain("image/jpeg");

    const updatedEvent = json.data.product.events.find(
      (event: { type: string }) => event.type === "UPDATED",
    );
    expect(updatedEvent).toBeDefined();
  });

  it("uploads a PNG image successfully", async () => {
    const productId = await createDraftProduct();
    const png = tinyPng();
    const { body, contentType } = buildMultipartBody(
      "file",
      "image.png",
      "image/png",
      png,
      { alt: "Caseback close-up" },
    );

    const res = await app.inject({
      method: "POST",
      url: `/products/${productId}/upload`,
      headers: {
        cookie: brandAdminCookie,
        "x-galileo-client": "test",
        "content-type": contentType,
      },
      body,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().data.upload.contentType).toBe("image/png");
  });

  it("rejects upload for non-DRAFT product", async () => {
    const productId = await createDraftProduct();

    // Mint the product to move it out of DRAFT
    await app.inject({
      method: "POST",
      url: `/products/${productId}/mint`,
      headers: {
        cookie: brandAdminCookie,
        "x-galileo-client": "test",
      },
    });

    const jpeg = tinyJpeg();
    const { body, contentType } = buildMultipartBody(
      "file",
      "watch.jpg",
      "image/jpeg",
      jpeg,
      { alt: "Draft-only image" },
    );

    const res = await app.inject({
      method: "POST",
      url: `/products/${productId}/upload`,
      headers: {
        cookie: brandAdminCookie,
        "x-galileo-client": "test",
        "content-type": contentType,
      },
      body,
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("BAD_REQUEST");
    expect(res.json().error.message).toContain("DRAFT");
  });

  it("rejects invalid MIME type (application/pdf)", async () => {
    const productId = await createDraftProduct();
    const pdfBytes = Buffer.from("%PDF-1.4 fake content");
    const { body, contentType } = buildMultipartBody(
      "file",
      "document.pdf",
      "application/pdf",
      pdfBytes,
      { alt: "Upload should fail" },
    );

    const res = await app.inject({
      method: "POST",
      url: `/products/${productId}/upload`,
      headers: {
        cookie: brandAdminCookie,
        "x-galileo-client": "test",
        "content-type": contentType,
      },
      body,
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("BAD_REQUEST");
    expect(res.json().error.message).toContain("Invalid file type");
  });

  it("returns 404 for upload from another brand's admin", async () => {
    const productId = await createDraftProduct();
    const jpeg = tinyJpeg();
    const { body, contentType } = buildMultipartBody(
      "file",
      "watch.jpg",
      "image/jpeg",
      jpeg,
      { alt: "Wrong brand image" },
    );

    const res = await app.inject({
      method: "POST",
      url: `/products/${productId}/upload`,
      headers: {
        cookie: otherBrandAdminCookie,
        "x-galileo-client": "test",
        "content-type": contentType,
      },
      body,
    });

    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe("NOT_FOUND");
  });

  it("rejects upload from VIEWER role", async () => {
    const productId = await createDraftProduct();
    const jpeg = tinyJpeg();
    const { body, contentType } = buildMultipartBody(
      "file",
      "watch.jpg",
      "image/jpeg",
      jpeg,
      { alt: "Viewer image" },
    );

    const res = await app.inject({
      method: "POST",
      url: `/products/${productId}/upload`,
      headers: {
        cookie: viewerCookie,
        "x-galileo-client": "test",
        "content-type": contentType,
      },
      body,
    });

    expect(res.statusCode).toBe(403);
  });

  it("rejects upload without authentication", async () => {
    const productId = await createDraftProduct();
    const jpeg = tinyJpeg();
    const { body, contentType } = buildMultipartBody(
      "file",
      "watch.jpg",
      "image/jpeg",
      jpeg,
      { alt: "Unauthenticated image" },
    );

    const res = await app.inject({
      method: "POST",
      url: `/products/${productId}/upload`,
      headers: {
        "x-galileo-client": "test",
        "content-type": contentType,
      },
      body,
    });

    expect(res.statusCode).toBe(401);
  });

  it("returns 404 for non-existent product", async () => {
    const jpeg = tinyJpeg();
    const { body, contentType } = buildMultipartBody(
      "file",
      "watch.jpg",
      "image/jpeg",
      jpeg,
      { alt: "Missing product image" },
    );

    const res = await app.inject({
      method: "POST",
      url: "/products/non-existent-id/upload",
      headers: {
        cookie: adminCookie,
        "x-galileo-client": "test",
        "content-type": contentType,
      },
      body,
    });

    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe("NOT_FOUND");
  });

  it("allows ADMIN to upload to any brand's product", async () => {
    const productId = await createDraftProduct();
    const jpeg = tinyJpeg();
    const { body, contentType } = buildMultipartBody(
      "file",
      "watch.jpg",
      "image/jpeg",
      jpeg,
      { alt: "Admin upload image" },
    );

    const res = await app.inject({
      method: "POST",
      url: `/products/${productId}/upload`,
      headers: {
        cookie: adminCookie,
        "x-galileo-client": "test",
        "content-type": contentType,
      },
      body,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().success).toBe(true);
  });

  it("produces deterministic CID for the same file content", async () => {
    const productId = await createDraftProduct();
    const jpeg = tinyJpeg();
    const { body, contentType } = buildMultipartBody(
      "file",
      "watch.jpg",
      "image/jpeg",
      jpeg,
      { alt: "Same image first upload" },
    );

    const res = await app.inject({
      method: "POST",
      url: `/products/${productId}/upload`,
      headers: {
        cookie: brandAdminCookie,
        "x-galileo-client": "test",
        "content-type": contentType,
      },
      body,
    });

    const cid1 = res.json().data.upload.imageCid;

    // Upload same content again (should produce same CID)
    const { body: body2, contentType: ct2 } = buildMultipartBody(
      "file",
      "different-name.jpg",
      "image/jpeg",
      jpeg,
      { alt: "Same image second upload" },
    );

    const res2 = await app.inject({
      method: "POST",
      url: `/products/${productId}/upload`,
      headers: {
        cookie: brandAdminCookie,
        "x-galileo-client": "test",
        "content-type": ct2,
      },
      body: body2,
    });

    const cid2 = res2.json().data.upload.imageCid;
    expect(cid1).toBe(cid2);
    // CIDv1 with raw codec + SHA-256 starts with "bafkrei"
    expect(cid1).toMatch(/^bafkrei/);
  });

  it("requires alt text for typed media authoring metadata", async () => {
    const productId = await createDraftProduct();
    const jpeg = tinyJpeg();
    const { body, contentType } = buildMultipartBody(
      "file",
      "watch.jpg",
      "image/jpeg",
      jpeg,
    );

    const res = await app.inject({
      method: "POST",
      url: `/products/${productId}/upload`,
      headers: {
        cookie: brandAdminCookie,
        "x-galileo-client": "test",
        "content-type": contentType,
      },
      body,
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("VALIDATION_ERROR");
    expect(res.json().error.message).toContain("alt");
  });

  it("replaces the primary image metadata and deletes the superseded local object", async () => {
    const productId = await createDraftProduct();
    const firstUpload = buildMultipartBody(
      "file",
      "watch.jpg",
      "image/jpeg",
      tinyJpeg(),
      { alt: "Front image" },
    );

    const firstResponse = await app.inject({
      method: "POST",
      url: `/products/${productId}/upload`,
      headers: {
        cookie: brandAdminCookie,
        "x-galileo-client": "test",
        "content-type": firstUpload.contentType,
      },
      body: firstUpload.body,
    });

    expect(firstResponse.statusCode).toBe(200);
    const firstJson = firstResponse.json();

    const secondUpload = buildMultipartBody(
      "file",
      "watch.png",
      "image/png",
      tinyPng(),
      { alt: "Updated hero image" },
    );
    const secondResponse = await app.inject({
      method: "POST",
      url: `/products/${productId}/upload`,
      headers: {
        cookie: brandAdminCookie,
        "x-galileo-client": "test",
        "content-type": secondUpload.contentType,
      },
      body: secondUpload.body,
    });

    expect(secondResponse.statusCode).toBe(200);
    const secondJson = secondResponse.json();
    expect(secondJson.data.upload.replacement.action).toBe("replaced");
    expect(secondJson.data.upload.replacement.previousImageUrl).toBe(
      firstJson.data.upload.imageUrl,
    );
    expect(secondJson.data.upload.replacement.previousImageCid).toBe(
      firstJson.data.upload.imageCid,
    );
    expect(secondJson.data.upload.replacement.previousFileDeleted).toBe(true);

    const currentAuthoring = readProductPassportAuthoringMetadata(
      secondJson.data.product.passport.metadata,
    );
    expect(currentAuthoring.media).toEqual([
      {
        kind: "image",
        url: secondJson.data.upload.imageUrl,
        cid: secondJson.data.upload.imageCid,
        alt: "Updated hero image",
        position: 0,
      },
    ]);

    const deletedUpload = await app.inject({
      method: "GET",
      url: firstJson.data.upload.imageUrl,
    });
    expect(deletedUpload.statusCode).toBe(404);

    const activeUpload = await app.inject({
      method: "GET",
      url: secondJson.data.upload.imageUrl,
    });
    expect(activeUpload.statusCode).toBe(200);
    expect(activeUpload.headers["content-type"]).toContain("image/png");
  });
});
