from pathlib import Path
import tempfile
import unittest

from tools.validate_markdown_links import (
    extract_links,
    find_broken_links,
    is_local_target,
    normalize_target,
)


class ValidateMarkdownLinksTests(unittest.TestCase):
    def test_extract_links(self) -> None:
        text = "[Local](docs/a.md) and [Web](https://example.com)"
        self.assertEqual(extract_links(text), ["docs/a.md", "https://example.com"])

    def test_local_target_filtering(self) -> None:
        self.assertTrue(is_local_target("docs/a.md"))
        self.assertFalse(is_local_target("https://example.com"))
        self.assertFalse(is_local_target("#section"))

    def test_normalize_target_removes_anchor(self) -> None:
        self.assertEqual(normalize_target("docs/a.md#intro"), "docs/a.md")

    def test_find_broken_links(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / "docs").mkdir()
            (root / "docs" / "ok.md").write_text("# ok\n", encoding="utf-8")
            (root / "README.md").write_text(
                "[Good](docs/ok.md)\n[Bad](docs/missing.md)\n",
                encoding="utf-8",
            )

            failures = find_broken_links(root)

            self.assertEqual(len(failures), 1)
            self.assertEqual(str(failures[0].source), "README.md")
            self.assertEqual(failures[0].target, "docs/missing.md")


if __name__ == "__main__":
    unittest.main()
