#!/usr/bin/env python3
"""
segment_scenes.py

Tier-0 ingestion step: split a converted markdown manuscript into
chapter- and scene-level chunks using formatting heuristics only. No AI.

Detects, in priority order:
  1. Markdown headings that look like chapter titles (# Chapter 3, ## Ch. 3,
     # Three, # Prologue, # Epilogue).
  2. Explicit scene-break markers on their own line (***, * * *, #, ---,
     or three-plus consecutive asterisks/hashes/dashes).
  3. Falls back to treating the whole document as one chapter with no
     scene breaks if neither pattern is found — this is a real, expected
     outcome for inconsistently formatted manuscripts, not an error.

Output is a JSON array so downstream steps (Tier-1 model extraction, or a
human reviewing the split before it goes further) can consume it without
re-parsing markdown. Nothing here writes to GitHub; that happens in
extract_capsules.py after the model tier runs, and only as draft Issues,
per docs/adr/0004-manuscript-ingestion-and-bring-your-own-ai.md.

Usage:
    python3 segment_scenes.py <input-markdown> <output-json>
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

CHAPTER_HEADING_RE = re.compile(
    r"""^\s{0,3}\#{1,3}\s*
        (chapter\s+\S+|ch\.?\s*\d+|prologue|epilogue|part\s+\S+|\d+\s*[:.]?\s*.*|
         one|two|three|four|five|six|seven|eight|nine|ten|
         eleven|twelve|thirteen|fourteen|fifteen)
    """,
    re.IGNORECASE | re.VERBOSE,
)

# Any line that is 3+ repeats of one of these characters, alone on its line
# (allowing surrounding whitespace), counts as an explicit scene break.
SCENE_BREAK_RE = re.compile(r"^\s*([*#\-~=])\1{2,}\s*$|^\s*(\*\s*){3,}$")

# pandoc's gfm writer backslash-escapes a bare "***" line (e.g. "\*\*\*")
# because unescaped it would parse as <hr> or bold-italic rather than the
# literal scene-break glyph the author typed. Confirmed via local smoke
# test against a DOCX fixture: without this normalization, every
# pandoc-converted scene break is silently missed. Strip the escaping
# backslash from these punctuation runs before matching, but only for
# exactly the characters SCENE_BREAK_RE cares about, so we don't touch
# escaped punctuation that's part of real prose.
_ESCAPED_BREAK_CHAR_RE = re.compile(r"\\([*#\-~=])")

PAGE_MARKER_RE = re.compile(r"^<!--\s*page:\d+\s*-->$")


def is_chapter_heading(line: str) -> bool:
    return bool(CHAPTER_HEADING_RE.match(line.strip()))


def is_scene_break(line: str) -> bool:
    stripped = line.strip()
    if not stripped:
        return False
    normalized = _ESCAPED_BREAK_CHAR_RE.sub(r"\1", stripped)
    return bool(SCENE_BREAK_RE.match(normalized))


def segment(markdown_text: str) -> list[dict]:
    lines = markdown_text.split("\n")

    chapters: list[dict] = []
    current_chapter_title = "Untitled (no chapter headings detected)"
    current_scenes: list[list[str]] = [[]]

    def flush_chapter():
        scenes = [
            "\n".join(s).strip() for s in current_scenes if "\n".join(s).strip()
        ]
        if scenes:
            chapters.append({"title": current_chapter_title, "scenes": scenes})

    for raw_line in lines:
        line = raw_line
        if PAGE_MARKER_RE.match(line.strip()):
            continue  # page markers are conversion artifacts, not content
        if is_chapter_heading(line):
            flush_chapter()
            current_chapter_title = line.strip().lstrip("#").strip()
            current_scenes = [[]]
            continue
        if is_scene_break(line):
            current_scenes.append([])
            continue
        current_scenes[-1].append(line)

    flush_chapter()

    if not chapters:
        # Nothing matched at all (e.g. no headings, no scene breaks) — the
        # whole document is one chapter, one scene. Documented fallback,
        # not a bug: manuscripts with inconsistent formatting are common.
        whole = markdown_text.strip()
        chapters = [{"title": "Untitled manuscript", "scenes": [whole] if whole else []}]

    return chapters


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__)
        return 1

    input_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])

    if not input_path.exists():
        print(f"Input file not found: {input_path}", file=sys.stderr)
        return 1

    markdown_text = input_path.read_text(encoding="utf-8")
    chapters = segment(markdown_text)

    scene_count = sum(len(c["scenes"]) for c in chapters)
    result = {
        "chapterCount": len(chapters),
        "sceneCount": scene_count,
        "chapters": chapters,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(result, indent=2), encoding="utf-8")

    print(
        f"Segmented {input_path} -> {len(chapters)} chapter(s), "
        f"{scene_count} scene(s) -> {output_path}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
