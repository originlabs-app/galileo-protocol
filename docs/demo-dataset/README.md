# Demo Dataset

This dataset supports local product walkthroughs. It is safe by default: it
upserts a fictitious luxury brand and demo products without resetting the
database.

## Command

```bash
DATABASE_URL=postgresql://galileo:galileo@localhost:55433/galileo_dev \
pnpm db:seed:demo
```

Set `DEMO_ASSET_BASE_URL` or `API_URL` when seeding a deployed environment so
product image URLs point at the deployed API:

```bash
API_URL="https://<api.example>" pnpm db:seed:demo
```

The seed also creates a Maison Aurum brand operator so the dashboard workspace
label matches the demo products:

| Variable | Default |
|----------|---------|
| `DEMO_OPERATOR_EMAIL` | `operator@maison-aurum.example` |
| `DEMO_OPERATOR_PASSWORD` | `demo-operator-password-change-me` |

Set `DEMO_OPERATOR_PASSWORD` explicitly outside local development. Do not reuse
the local default for a public environment.

After seeding, verify the dataset:

```bash
pnpm demo:dataset:check
```

The check confirms the Maison Aurum brand, operator, 5 demo products, DRAFT
status, passports, materials, GS1 links, and primary image metadata.

## Brand

| Field | Value |
|-------|-------|
| Name | Maison Aurum |
| Slug | `maison-aurum-demo` |
| DID | `did:galileo:brand:maison-aurum-demo` |

## Products

| Product | Category | GTIN | Serial | Demo role |
|---------|----------|------|--------|-----------|
| Aurum Chronographe Abyssal | Watches | `3760401230013` | `AUR-WATCH-001` | Flagship proof product |
| Aurum Sac Meridian | Leather Goods | `3760401230020` | `AUR-BAG-018` | Leather goods identity and editorial passport |
| Aurum Bague Celeste | Jewelry | `3760401230037` | `AUR-RING-104` | Certificate and resale assurance story |
| Aurum Nuit Marine | Fragrances | `3760401230044` | `AUR-SCENT-07` | Batch, refill, and authenticity story |
| Aurum Lunettes Horizon | Eyewear | `3760401230051` | `AUR-EYE-221` | Accessory repair and service-center story |

## Notes

- Products are created as `DRAFT` so the demo can show brand-side minting.
- Materials are stored in passport authoring metadata.
- Each product has a primary image URL in `Product.imageUrl` plus matching
  passport media metadata, so the dashboard and scanner can show coherent demo
  visuals.
- Demo visuals are versioned API assets under `apps/api/demo-assets/`. Replace
  them with approved brand-safe assets when a real pilot brand is onboarded.
- The seed is idempotent: running it again updates existing demo records and
  does not delete user-created products.
