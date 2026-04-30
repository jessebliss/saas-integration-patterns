import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "md-links-"));
fs.mkdirSync(path.join(fixtureRoot, "docs"), { recursive: true });
fs.writeFileSync(path.join(fixtureRoot, "docs", "ok.md"), "# ok\n", "utf8");
fs.writeFileSync(
  path.join(fixtureRoot, "README.md"),
  "[Good](docs/ok.md)\n[Bad](docs/missing.md)\n",
  "utf8",
);

test("fixture contains exactly one broken local markdown link", () => {
  const readme = fs.readFileSync(path.join(fixtureRoot, "README.md"), "utf8");
  const links = [...readme.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)].map((m) => m[1]);
  const broken = links.filter((target) => !fs.existsSync(path.resolve(fixtureRoot, target)));
  assert.equal(broken.length, 1);
  assert.equal(broken[0], "docs/missing.md");
});
