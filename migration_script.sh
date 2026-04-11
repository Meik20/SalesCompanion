# Script de migration SalesCompanion : SQLite → PostgreSQL
# Utilise ce script pour migrer tes données locales vers Railway

echo "=== MIGRATION SALESCOmpanion ==="
echo "1. Export des données SQLite..."

# Export des données depuis SQLite
sqlite3 sales_companion.db << 'EOF' > migration_data.sql
.mode insert companies
SELECT * FROM companies WHERE active=1;
.mode insert users
SELECT * FROM users;
.mode insert pipeline
SELECT * FROM pipeline;
.mode insert saved_searches
SELECT * FROM saved_searches;
.mode insert usage_logs
SELECT * FROM usage_logs;
.mode insert import_logs
SELECT * FROM import_logs;
.mode insert config
SELECT * FROM config;
EOF

echo "2. Conversion SQLite → PostgreSQL..."

# Conversion basique des inserts SQLite vers PostgreSQL
sed -i 's/INSERT INTO companies VALUES(/INSERT INTO companies (raison_sociale,sigle,niu,activite_principale,centre_rattachement,secteur,region,ville,telephone,email,adresse,dirigeant,statut_juridique,capital,rccm,date_creation,description,source_fichier,import_date,active) VALUES(/g' migration_data.sql

echo "3. Import dans Railway..."
echo "Commande à exécuter :"
echo 'psql "postgresql://postgres:HSMfPEnUeQPItxoILxysomZIuzHavZIw@maglev.proxy.rlwy.net:30184/railway" < migration_data.sql'

echo "4. Vérification..."
echo "Après import, vérifie dans Railway que les données sont présentes."

echo "=== FIN DE MIGRATION ==="