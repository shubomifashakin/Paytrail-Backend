# ADR 001: Conflict Resolution Strategy for Sync Push

## Status

Accepted

## Context

Our application is designed to be **offline-first**, allowing users to interact with their data locally even without an internet connection. Users can optionally back up their data to the cloud (our own database) for persistence and cross-device access.

A typical flow involves:

- Pulling cloud data to a new device upon login
- Working with a fully synced local copy
- Pushing changes back to the cloud

However, in some edge cases, the **initial pull may fail** (maybe due to network issues, our server is down or something else). In this scenario, the user is notified that their device is not fully synced. Despite this, we allow them to continue using the app offline in order to preserve usability.

This introduces a **conflict risk**: if the user modifies data locally that already exists in the cloud, their changes may overwrite newer or more complete data.

## Decision

We implemented a **"last-write-wins with conflict awareness"** strategy for sync pushes. The key principles are:

1. **User Notification**  
   If the initial pull fails, we display a disclaimer:  
   _"Sync failed. Changes made in this failed state will be saved locally and may overwrite cloud data when synced. For safety, fix the sync issue first."_

2. **Push Logic**  
   When the user pushes data to the cloud, we process it in a transactional batch using `prisma.$transaction`.

3. **Conflict Resolution Rules**  
   For each record:
   - **If the record exists in the database**:
     - Compare `updatedAt` timestamps.
     - If the incoming record is **older**, discard it.
     - If it's **newer**, apply the update.
   - **If the record does not exist**, but a **conflicting unique constraint** (e.g., same `name`, `emoji`, `color`, `budgetPeriod` etc) is found:
     - Compare timestamps.
     - If the incoming record is newer, delete the conflicting one and insert the new one.
     - If the existing one is newer, discard the incoming record.
   - **If no conflict is found**, insert or upsert the record.

4. **Tables Covered**
   - `budgets`
   - `categories`
   - `payment_methods`
   - `transactions`

5. **Operations Supported**
   - `create`
   - `update`
   - `delete`

## Consequences

- Users can continue using the app even if initial sync fails.
- Data integrity is preserved by timestamp-based conflict resolution.
- Unique constraints are respected with intelligent conflict detection.
- In rare cases, newer server data may be overwritten if the user proceeds without a successful pull.
- Requires clear communication to users about sync state and potential risks.

## Alternatives Considered

- **Blocking usage until pull succeeds**: Rejected to preserve offline-first usability.

## Future Considerations

- Learn about more modern conflict resolution strategies, such as **per-record versioning** or **CRDTs**
