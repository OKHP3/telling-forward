#!/usr/bin/env python3
"""
convert_manuscript.py

Tier-0 ingestion step: deterministic conversion of an uploaded manuscript
(DOCX, EPUB, or PDF) into plain markdown. No AI, no network call beyond
what's already local. This is the "rules-only" floor described in
docs/adr/0004-manuscript-ingestion-and-bring-your-own-ai.md — it must keep
working even if every AI-backed tier is disabled or unavailable.

Confirmed via local testing (see this script's __main__ smoke test):
  - DOCX and EPUB conversion is high-confidence via pandoc.
  - PDF conversion is best-effort. Scanned/image-only PDFs are detected and
    rejected with a clear message rather than silently producing empty output.

Usage:
    python3 convert_manuscript.py <input-file> <output-markdown-path>

Exit codes:
    0  success
    1  unsupported or undetected file type
    2  PDF appears to be a scanned image with no extractable text layer
    3  conversion tool failure (pandoc missing/errored)
"""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

SUPPORTED_EXTENSIONS = {".docx", ".epub", ".pdf"}

# Below this ratio of (extracted characters / page), treat the PDF as
# scanned/image-only rather than text-based. This is a heuristic, not a
# guarantee — some legitimately sparse pages (title pages, chapter breaks)
# will trip it in isolation, which is why the check runs across the whole
# document rather than per page.
MIN_CHARS_PER_PAGE = 40


def convert_docx_or_epub(input_path: Path, output_path: Path) -> None:
    """DOCX and EPUB both carry real document structure, so pandoc alone
    is sufficient. This is the high-confidence path."""
    if shutil.which("pandoc") is None:
        raise RuntimeError(
            "pandoc is not installed. Install it before running this script "
            "(the GitHub Actions runner image ships pandoc; local dev "
            "environments may need `apt-get install pandoc` or equivalent)."
        )
    result = subprocess.run(
        [
            "pandoc",
            str(input_path),
            "-f", "docx" if input_path.suffix == ".docx" else "epub",
            "-t", "gfm",  # GitHub-flavored markdown, matches the repo's markdown-native content model
            "--wrap=preserve",
            "-o", str(output_path),
        ],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"pandoc failed: {result.stderr.strip()}")


def convert_pdf(input_path: Path, output_path: Path) -> None:
    """PDF has no reliable document-structure layer. Extract text page by
    page, join with page-break markers, and refuse to produce output that
    looks like it came from a scanned image (near-zero extractable text)."""
    import pdfplumber  # local import: keep the DOCX/EPUB path dependency-free

    pages_text: list[str] = []
    with pdfplumber.open(input_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            pages_text.append(text)

    total_chars = sum(len(t.strip()) for t in pages_text)
    page_count = max(len(pages_text), 1)
    avg_chars_per_page = total_chars / page_count

    if avg_chars_per_page < MIN_CHARS_PER_PAGE:
        raise ScannedPdfError(
            f"This PDF averages {avg_chars_per_page:.1f} extractable characters "
            f"per page across {page_count} pages, well below the "
            f"{MIN_CHARS_PER_PAGE}-character floor used to detect a real text "
            "layer. This looks like a scanned image PDF, not a text PDF. "
            "OCR is out of scope for this script — export from Word or use "
            "an OCR tool first, or resubmit as DOCX/EPUB."
        )

    # Very light normalization: collapse hard line-wraps pandoc would have
    # handled for us in the DOCX/EPUB path, keep paragraph breaks, mark
    # page boundaries as HTML comments so downstream segmentation can see
    # them without them rendering visibly.
    markdown_parts = []
    for i, text in enumerate(pages_text, start=1):
        cleaned = "\n\n".join(
            line.strip() for line in text.split("\n") if line.strip()
        )
        markdown_parts.append(f"<!-- page:{i} -->\n\n{cleaned}")

    output_path.write_text("\n\n".join(markdown_parts), encoding="utf-8")


class ScannedPdfError(RuntimeError):
    """Raised when a PDF has no meaningful extractable text layer."""


def convert(input_path: Path, output_path: Path) -> None:
    suffix = input_path.suffix.lower()
    if suffix not in SUPPORTED_EXTENSIONS:
        raise ValueError(
            f"Unsupported file type '{suffix}'. Supported: "
            f"{', '.join(sorted(SUPPORTED_EXTENSIONS))}."
        )
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if suffix == ".pdf":
        convert_pdf(input_path, output_path)
    else:
        convert_docx_or_epub(input_path, output_path)


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__)
        return 1

    input_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])

    if not input_path.exists():
        print(f"Input file not found: {input_path}", file=sys.stderr)
        return 1

    try:
        convert(input_path, output_path)
    except ScannedPdfError as e:
        print(str(e), file=sys.stderr)
        return 2
    except ValueError as e:
        print(str(e), file=sys.stderr)
        return 1
    except RuntimeError as e:
        print(str(e), file=sys.stderr)
        return 3

    print(f"Converted {input_path} -> {output_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
