# Reconciliation Match Details Design

This document explains the design, structure, and technical rationale of the `matchDetails` field inside the `ReconciliationResult` model schema.

## What is `matchDetails`?

In financial reconciliation, identifying that two transactions match or conflict is only the first step. Auditors, developers, and support teams need to know **exactly why** a pair was grouped together, which fields matched, and which fields caused a conflict.

The `matchDetails` object stores the results of field-by-field comparisons, discrepancy metrics, and matching score weightings.

---

## Schema Structure Breakdown

```typescript
matchDetails: {
  timestampDiffSec: number | null;
  quantityDiffPct: number | null;
  matchScore: number | null;
  fieldsCompared: {
    type: { user: string; exchange: string; match: boolean } | null;
    asset: { user: string; exchange: string; match: boolean } | null;
    quantity: { user: number; exchange: number; match: boolean; diffPct: number } | null;
    priceUsd: { user: number | null; exchange: number | null; match: boolean } | null;
    fee: { user: number | null; exchange: number | null; match: boolean } | null;
  } | null;
}
```

### 1. Proximity Metrics (Fuzzy Match Analytics)
* **`timestampDiffSec`**: Stores the absolute difference (in seconds) between the user and exchange timestamps. 
  * *Example*: If User Tx is at `09:00:00Z` and Exchange Tx is at `09:00:32Z`, this field stores `32`. This verifies that the match fell within the configured time tolerance window (e.g. 300s).
* **`quantityDiffPct`**: The calculated percentage difference between the user's quantity and the exchange's quantity.
  * *Formula*: $\frac{|Qty_{user} - Qty_{exchange}|}{Qty_{user}} \times 100$
  * *Example*: User quantity `0.5` vs Exchange quantity `0.50005` gives a `0.01%` difference.

### 2. Matching Score (`matchScore`)
* **`matchScore`**: A floating-point number calculated by the matching engine to resolve multi-candidate scenarios.
* When a user transaction has multiple possible exchange transaction matches, the engine scores each candidate based on proximity (closer timestamps and closer quantities produce a score closer to `0.0`). The engine selects the candidate with the lowest (best) score.

### 3. Field-by-Field Comparisons (`fieldsCompared`)
Stores a side-by-side comparison of every core transaction attribute:
* **`type`**: Compares transaction type perspectives. (e.g., checks if user `TRANSFER_OUT` matches exchange `TRANSFER_IN`).
* **`asset`**: Compares normalized asset tickers (e.g. both are `BTC`).
* **`quantity`**: Compares quantities side-by-side, recording the exact values, the comparison outcome (`match`), and the percentage difference (`diffPct`).
* **`priceUsd`**: Compares transaction rates.
* **`fee`**: Compares service fees. (If user reports a fee of `0.0015` and exchange reports `0.002`, the transaction pair category becomes `conflicting` with this mismatch highlighted).

---

## Technical Rationale

1. **Side-by-Side UI Rendering**: By storing these comparison snapshots in the database, the frontend dashboard can render detailed comparison cards instantly (e.g., highlight the fee or price in red if they don't match) without needing to compute differences on-the-fly.
2. **Audit Immutability**: If configuration parameters (like tolerances) or raw transaction records are subsequently modified, the historical reconciliation run report remains fully auditable because its comparison snapshot is permanently stored in `matchDetails`.
3. **Decoupled Business Rules**: It separates matching decision logs from raw data.
