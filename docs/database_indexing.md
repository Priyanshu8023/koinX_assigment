# Database Indexing Strategy

This document details the database indexing strategy implemented for the KoinX Transaction Reconciliation Engine to ensure optimal query performance, scalability, and memory efficiency under high-volume transaction workloads.

## Index Overview

To prevent full-collection scans in MongoDB, we define targeted compound indexes. All collections are partitioned and queried primarily using a unique `runId` (the scope of each execution).

---

## 1. Transactions Collections (`user_transactions` & `exchange_transactions`)

Both transaction ledger collections share identical schemas and indexing strategies.

### A. Candidate Match Index
```typescript
{ runId: 1, asset: 1, type: 1, timestamp: 1 }
```

* **Purpose**: Optimizes lookup queries executed by the **Matching Engine**.
* **Query Match**:
  ```javascript
  { runId: "RUN-0001", asset: "BTC", type: "BUY" }
  ```
* **Performance Impact**:
  * Scopes searches first by `runId` to prevent scanning other clients' uploads.
  * Groups by `asset` and `type` to narrow candidates to a small subset.
  * Incorporates `timestamp` to allow binary range searches on the date.
  * Reduces query complexity from $O(N)$ (collection scan) to $O(\log N)$ (index scan).

### B. Ingestion & Quality Index
```typescript
{ runId: 1, isValid: 1, isDuplicate: 1 }
```

* **Purpose**: Used during report generation and ingestion metrics compilation.
* **Query Match**:
  * Loading clean dataset for matching:
    ```javascript
    { runId: "RUN-0001", isValid: true, isDuplicate: false }
    ```
  * Getting invalid rows count:
    ```javascript
    { runId: "RUN-0001", isValid: false }
    ```
* **Performance Impact**: Allows MongoDB to serve these queries directly from the index RAM without fetching raw document structures from disk storage.

---

## 2. Reconciliation Results (`reconciliation_results`)

### A. Categorized Report Index
```typescript
{ runId: 1, category: 1 }
```

* **Purpose**: Optimizes paginated report queries and user-facing metrics.
* **Query Match**:
  * Getting unmatched records:
    ```javascript
    { runId: "RUN-0001", category: "unmatched_exchange" }
    ```
  * Paginated report views:
    ```javascript
    { runId: "RUN-0001" }
    ```
* **Performance Impact**: Ensures that pulling subsets of matched or unmatched transaction sets executes with minimal delay.

---

## 3. Reconciliation Runs (`reconciliation_runs`)

### A. Unique Run Identifier
```typescript
{ runId: 1 } (Unique: true)
```

* **Purpose**: Primary index key for run metadata lookup.
* **Performance Impact**: Enforces uniqueness at the database level and optimizes dashboard updates.
