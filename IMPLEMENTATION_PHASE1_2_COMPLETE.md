# SampahKu Implementation — Phase 1 & 2 Complete ✅

## Backend Implementation Status: COMPLETE

### Phase 1: Database & Backend Core
✅ **1. Database Migration**
- Script ready: `migration_two_tier_gtin_off.sql`
- Run in Supabase SQL Editor before deployment

✅ **2. New Services**
- `openfoodfacts.service.ts` - Open Food Facts API integration
- Methods: `fetchProductByGtin()`, `mapToMaterialPassport()`, `getDefaultMaterialPassport()`

✅ **3. Updated Services**
- `product.service.ts` - Added GTIN prefix validation + `resolveOrCreateFromBarcode()` method
- `instances.service.ts` - Added `recordAggregateScan()` + `recordBarcodeDiscard()` for Tier 2
- `konsumen.service.ts` - Updated `getMyCollections()` (Tier 1 + Tier 2) + new aggregate stats methods
- `tps.service.ts` - Updated TPS directory stats to include Tier 2 counts

✅ **4. New Routes & Endpoints**
- `POST /instances/scan-barcode` (PETUGAS) - Scan Tier 2 GTIN with geo-fence validation
- `POST /instances/discard-barcode` (KONSUMEN) - Scan barcode to discard
- `GET /instances/:gtin/aggregate-stats` - Get Tier 2 aggregate statistics

### Phase 2: Backend Stats
✅ **Updated Services**
- TPS directory now includes Tier 2 scan event counts in stats
- Dual-counting: Tier 1 activities + Tier 2 sku_aggregates

## ⚠️ Prerequisites for Testing

### 1. Install Missing Dependency
```bash
cd backend
npm install axios
```

### 2. Run Database Migration
Execute `migration_two_tier_gtin_off.sql` in Supabase SQL Editor:
- Creates `sku_aggregates` table
- Creates `brand_gtin_prefixes` table
- Updates `activities`, `products`, `product_instances` tables with new columns
- Adds constraints and triggers

### 3. Verify Backend Compiles
```bash
cd backend
npm run build
```

## Summary of Changes

### Files Created
```
backend/src/services/openfoodfacts.service.ts (NEW)
```

### Files Updated
```
backend/src/services/product.service.ts
backend/src/services/instances.service.ts
backend/src/services/konsumen.service.ts
backend/src/services/tps.service.ts
backend/src/controllers/instances.controller.ts
backend/src/routes/instances.ts
```

## Next: Phase 3 - Frontend Updates

The following frontend components need updates:

### 1. **Dashboard.tsx** (Konsumen Wallet)
- Update stat cards to use combined Tier 1 + Tier 2 counts
- Conversion Rate: Tier 1 only (show "—" if no Tier 1 items)
- Display dual cards: Tier 1 (timeline) + Tier 2 (barcode scan)

### 2. **DetailBarcode.tsx** (NEW)
- Route: `/detail-barcode/:gtin`
- Show aggregate stats for Tier 2 GTIN
- Display scan event counts per biz_step
- Show recent activities (optional)

### 3. **PetugasScan.tsx** & **KonsumenScan.tsx** (UPDATED)
- Dual-mode: Support GS1 Digital Link (Tier 1) + Standard barcode (Tier 2)
- Call new endpoints: `/instances/scan-barcode` or `/instances/discard-barcode`

### 4. **Homepage.tsx** (Text Updates)
- "blockchain" → "hash-chain" (hero text)
- "Reward" → "Transparansi" (Cara Kerja step 3)
- TPS directory include Tier 2 stats (already backend support via tps.service.ts)

### 5. **DetailSampah.tsx**
- No changes needed (Tier 1 only)

### 6. **ManajemenPetugas.tsx** (UPDATED)
- Remove "Petugas Nonaktif" stat card
- Remove "Total Poin" stat card
- Keep: Petugas Aktif + Total Updates

## Data Flow Examples

### Example 1: Petugas Scans Tier 2 Barcode (Standard Product)
```
1. Petugas scans barcode: 8992753020012 (Aqua)
2. Backend: recordAggregateScan()
3. Resolve product: Open Food Facts API OR use cached product
4. Upsert sku_aggregates (gtin, tps_id, biz_step, count++)
5. Insert activity (Tier 2): instance_id=NULL, aggregate_id, gtin
6. Response: { activity, aggregateId }
```

### Example 2: Konsumen Discard Barcode
```
1. Konsumen scans barcode: 8992753020012
2. Backend: recordBarcodeDiscard()
3. Resolve product: Open Food Facts API OR use cached product
4. Upsert sku_aggregates (gtin, tps_id=NULL, biz_step='discarding')
5. Insert activity (Tier 2): instance_id=NULL, aggregate_id, gtin
6. Entry appears in /users/me/collections as Tier 2 card
```

### Example 3: Get Tier 2 Aggregate Stats
```
GET /instances/8992753020012/aggregate-stats

Response:
{
  "collecting": { count: 150, last_scanned_at: "2026-05-15T10:30:00Z" },
  "inspecting": { count: 120, last_scanned_at: "2026-05-15T11:45:00Z" },
  "recycling": { count: 95, last_scanned_at: "2026-05-15T14:20:00Z" },
  ...
}
```

## Testing Checklist

- [ ] Database migration runs without errors
- [ ] Backend `npm run build` passes
- [ ] Backend `npm run dev` starts without errors
- [ ] Petugas can scan barcode → creates sku_aggregates entry
- [ ] Konsumen can discard barcode → appears in wallet as Tier 2 card
- [ ] `/instances/:gtin/aggregate-stats` returns scan counts
- [ ] TPS directory shows Tier 2 counts in stats
- [ ] Hash-chain working (SHA-256 in activities.blockchain_hash)

## API Endpoint Reference

### Tier 1 (Existing)
- `POST /instances/:id/scan` - Scan QR/instance
- `GET /instances/:id/activities` - Get instance timeline

### Tier 2 (New)
- `POST /instances/scan-barcode` - Scan barcode (PETUGAS)
- `POST /instances/discard-barcode` - Discard barcode (KONSUMEN)
- `GET /instances/:gtin/aggregate-stats` - Get aggregate stats

### User Wallet (Updated)
- `GET /users/me/collections` - Get Tier 1 + Tier 2 items

## Known Limitations & Notes

1. **Off-Chain Hash**: Hash-chain is purely off-chain (SHA-256 stored in `activities.blockchain_hash`). Blockchain anchoring is optional via batch job.

2. **Tier 2 Recovery Rate**: Cannot calculate recovery rate for Tier 2 because we count scan events, not unique units. Show "—" in UI if no Tier 1 items.

3. **GTIN Prefix Validation**: Enforced via trigger on `products` table. Trigger validates GTIN prefix matches `brand_gtin_prefixes` for `source='BRAND_MANUAL'`.

4. **Identity Normalization**: `product_instances.identity_number` is source-of-truth. `BATCH-{number}` and `SERIAL-{number}` are derived via trigger.

---

**Status**: Backend implementation complete. Ready for Phase 3 frontend updates.
