# Galileo JSON Schemas

## Schema Version Policy

This directory uses two JSON Schema versions for specific reasons:

| Version | Used By | Rationale |
|---------|---------|-----------|
| **draft-07** | DPP schemas, event schemas, extension schemas | Industry-standard version with widest tooling support |
| **2020-12** | `galileo-vc.schema.json`, `linkset-schema.json` | Required for W3C VC Data Model 2.0 and GS1 linkset conformance |

Both versions are valid and intentionally chosen. Do not migrate without RFC review.

## Directory Structure

- `dpp/` — Digital Product Passport schemas (core + material-specific extensions)
- `events/` — EPCIS lifecycle event schemas (base + 6 event types)
- `extensions/` — Optional product attribute extensions (artisan, molecular, spectral, etc.)
- `identity/` — Verifiable Credential schemas
- `contexts/` — JSON-LD context documents
- `alignment/` — GS1/CBV mapping documentation

## $id Namespace

All schemas use `https://schemas.galileoprotocol.io/` as their `$id` base URI.
