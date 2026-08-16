import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const sql = neon(databaseUrl);
const migrationsDir = join(process.cwd(), "migrations");
const files = (await readdir(migrationsDir))
  .filter((file) => /^\d+_.+\.sql$/.test(file))
  .sort();
const appliedRows = await sql.query(
  "SELECT version FROM schema_migrations ORDER BY version"
);
const applied = new Set(appliedRows.map((row) => Number(row.version)));

function splitMigration(source) {
  const statements = [];
  let current = "";
  let quote = null;
  let dollarTag = null;
  let lineComment = false;
  let blockComment = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (lineComment) {
      current += char;
      if (char === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      current += char;
      if (char === "*" && next === "/") {
        current += next;
        index += 1;
        blockComment = false;
      }
      continue;
    }
    if (dollarTag) {
      if (source.startsWith(dollarTag, index)) {
        current += dollarTag;
        index += dollarTag.length - 1;
        dollarTag = null;
      } else {
        current += char;
      }
      continue;
    }
    if (quote) {
      current += char;
      if (char === quote) {
        if (next === quote) {
          current += next;
          index += 1;
        } else {
          quote = null;
        }
      }
      continue;
    }
    if (char === "-" && next === "-") {
      current += `${char}${next}`;
      index += 1;
      lineComment = true;
      continue;
    }
    if (char === "/" && next === "*") {
      current += `${char}${next}`;
      index += 1;
      blockComment = true;
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      current += char;
      continue;
    }
    if (char === "$") {
      const match = source.slice(index).match(/^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/);
      if (match) {
        dollarTag = match[0];
        current += dollarTag;
        index += dollarTag.length - 1;
        continue;
      }
    }
    if (char === ";") {
      const statement = current.trim();
      if (statement) statements.push(`${statement};`);
      current = "";
      continue;
    }
    current += char;
  }

  if (current.trim()) statements.push(current.trim());
  return statements.filter(
    (statement) => !/^(?:BEGIN|COMMIT);?$/i.test(statement)
  );
}

for (const file of files) {
  const version = Number(file.match(/^(\d+)_/)?.[1]);
  if (applied.has(version)) continue;

  const source = await readFile(join(migrationsDir, file), "utf8");
  const statements = splitMigration(source);
  await sql.transaction((transaction) =>
    statements.map((statement) => transaction.query(statement))
  );
  console.log(`Applied ${file}`);
}
