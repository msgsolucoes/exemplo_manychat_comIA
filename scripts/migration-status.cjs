const { createPool, ensureMigrationsTable, getMigrations } = require("./migration-utils.cjs");

async function main() {
  const migrations = getMigrations();
  const pool = createPool();

  try {
    await ensureMigrationsTable(pool);
    const { rows } = await pool.query("select version, name, checksum, applied_at from public.schema_migrations order by version");
    const applied = new Map(rows.map((row) => [row.version, row]));

    for (const migration of migrations) {
      const existing = applied.get(migration.version);
      const status = !existing
        ? "pendente"
        : existing.name === migration.name && existing.checksum === migration.checksum
          ? `aplicada em ${new Date(existing.applied_at).toISOString()}`
          : "DIVERGENTE (arquivo alterado)";
      console.log(`${migration.name}: ${status}`);
    }

    const knownVersions = new Set(migrations.map((migration) => migration.version));
    for (const row of rows.filter((item) => !knownVersions.has(item.version))) {
      console.log(`${row.name}: aplicada no banco, mas arquivo nao existe no repositorio`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(`Falha ao consultar migrations: ${error.message}`);
  process.exitCode = 1;
});