#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SKIP_PREFIXES = ["http://", "https://", "mailto:", "#"];
const LINK_RE = /\[[^\]]+\]\(([^)]+)\)/g;

function collectMarkdownFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules") {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }
  return files;
}

function extractLinks(markdownText) {
  return [...markdownText.matchAll(LINK_RE)].map((m) => m[1].trim());
}

function isLocalTarget(target) {
  return Boolean(target) && !SKIP_PREFIXES.some((prefix) => target.startsWith(prefix));
}

function normalizeTarget(target) {
  return target.split("#", 1)[0].trim();
}

function findBrokenLinks(rootDir) {
  const failures = [];
  for (const mdFile of collectMarkdownFiles(rootDir)) {
    const content = fs.readFileSync(mdFile, "utf8");
    for (const rawTarget of extractLinks(content)) {
      if (!isLocalTarget(rawTarget)) {
        continue;
      }
      const target = normalizeTarget(rawTarget);
      if (!target) {
        continue;
      }
      const resolved = path.resolve(path.dirname(mdFile), target);
      if (!fs.existsSync(resolved)) {
        failures.push({
          source: path.relative(rootDir, mdFile),
          target: rawTarget,
        });
      }
    }
  }
  return failures;
}

const failures = findBrokenLinks(ROOT);
if (failures.length === 0) {
  console.log("Markdown link validation passed.");
  process.exit(0);
}

console.error("Broken markdown links found:");
for (const failure of failures) {
  console.error(`- ${failure.source}: ${failure.target}`);
}
process.exit(1);
