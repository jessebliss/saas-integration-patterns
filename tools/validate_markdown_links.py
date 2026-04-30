#!/usr/bin/env python3
"""Validate local markdown links in repository docs."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import re
import sys

LINK_RE = re.compile(r"\[[^\]]+\]\(([^)]+)\)")
SKIP_PREFIXES = ("http://", "https://", "mailto:", "#")


@dataclass(frozen=True)
class BrokenLink:
    source: Path
    target: str


def extract_links(markdown_text: str) -> list[str]:
    return [match.group(1).strip() for match in LINK_RE.finditer(markdown_text)]


def is_local_target(target: str) -> bool:
    return bool(target) and not target.startswith(SKIP_PREFIXES)


def normalize_target(target: str) -> str:
    return target.split("#", 1)[0].strip()


def collect_markdown_files(root: Path) -> list[Path]:
    return sorted(root.rglob("*.md"))


def find_broken_links(root: Path) -> list[BrokenLink]:
    failures: list[BrokenLink] = []
    for md_file in collect_markdown_files(root):
        content = md_file.read_text(encoding="utf-8")
        for raw_target in extract_links(content):
            if not is_local_target(raw_target):
                continue
            target = normalize_target(raw_target)
            if not target:
                continue
            resolved = (md_file.parent / target).resolve()
            if not resolved.exists():
                failures.append(BrokenLink(source=md_file.relative_to(root), target=raw_target))
    return failures


def main() -> int:
    repo_root = Path(__file__).resolve().parents[1]
    failures = find_broken_links(repo_root)
    if not failures:
        print("Markdown link validation passed.")
        return 0

    print("Broken markdown links found:")
    for failure in failures:
        print(f"- {failure.source}: {failure.target}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
