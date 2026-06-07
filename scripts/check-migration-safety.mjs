import { execSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const migrationsDir = "supabase/migrations";

const destructivePatterns = [
  { pattern: /\bdrop\s+table\b/i, label: "DROP TABLE" },
  { pattern: /\bdrop\s+column\b/i, label: "DROP COLUMN" },
  { pattern: /\btruncate\b/i, label: "TRUNCATE" },
  { pattern: /\balter\s+table\b[^;]*\bdrop\b/i, label: "ALTER TABLE … DROP" },
  { pattern: /\bdrop\s+schema\b/i, label: "DROP SCHEMA" },
  { pattern: /\bdrop\s+type\b/i, label: "DROP TYPE" },
];

function listSqlFiles(dir) {
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) {
    return [];
  }

  return readdirSync(dir)
    .filter((name) => name.endsWith(".sql"))
    .map((name) => join(dir, name));
}

function getChangedSqlFiles() {
  try {
    const baseRef = process.env.GITHUB_BASE_REF
      ? `origin/${process.env.GITHUB_BASE_REF}`
      : "origin/main";

    const output = execSync(`git diff --name-only ${baseRef}...HEAD -- "${migrationsDir}"`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();

    if (!output) {
      return [];
    }

    return output
      .split("\n")
      .filter((path) => path.endsWith(".sql"));
  } catch {
    return listSqlFiles(migrationsDir);
  }
}

function scanFile(filePath) {
  const content = readFileSync(filePath, "utf8");
  const findings = [];

  for (const { pattern, label } of destructivePatterns) {
    if (pattern.test(content)) {
      findings.push(label);
    }
  }

  return findings;
}

const files = getChangedSqlFiles();

if (files.length === 0) {
  console.log("No migration SQL files to check.");
  process.exit(0);
}

const issues = [];

for (const filePath of files) {
  const findings = scanFile(filePath);

  if (findings.length > 0) {
    issues.push({ filePath, findings });
  }
}

if (issues.length === 0) {
  console.log(`Checked ${files.length} migration file(s) — no destructive statements found.`);
  process.exit(0);
}

console.error("Potentially destructive migration statements detected:\n");

for (const { filePath, findings } of issues) {
  console.error(`  ${filePath}`);
  console.error(`    → ${findings.join(", ")}`);
}

console.error(
  "\nReview these changes carefully before merging. Override only with explicit PR approval.",
);

process.exit(1);
