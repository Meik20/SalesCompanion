# SalesCompanion v2.0.1 - Firestore Exclusive

## Latest Build
- Date: April 11, 2026
- Branch: main
- Status: Production Ready
- Database: 🔥 Google Cloud Firestore (EXCLUSIVE)
- Migration: PostgreSQL & SQLite → Firestore Complete ✅
- Auto-Push: Enabled

## Key Changes in v2.0.1
- Removed all SQLite references (`sqlite3` dependency)
- Removed all PostgreSQL references  
- Firestore configured as EXCLUSIVE database
- Admin functions using Firestore only
- Emergency fallback preserved (.admin-firestore-backup.json)
- See [FIRESTORE-EXCLUSIVE-MIGRATION.md](./FIRESTORE-EXCLUSIVE-MIGRATION.md) for details

## Architecture
- Backend: Express.js + Google Cloud Firestore
- Auth: JWT HS256 (30d expiry)
- Hash: bcryptjs 2.4.3
- Cache: None (Firestore handles scaling)
- Store: Firestore collections (users, companies, usage_logs, etc)

## Breaking Changes
⚠️ **If you were using PostgreSQL or SQLite**: 
- Update your environment variables to point to Firestore
- Firestore credentials required (`GOOGLE_APPLICATION_CREDENTIALS`)
- See [FIRESTORE-EXCLUSIVE-MIGRATION.md](./FIRESTORE-EXCLUSIVE-MIGRATION.md)


