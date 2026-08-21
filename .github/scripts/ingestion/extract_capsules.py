#!/usr/bin/env python3
"""
extract_capsules.py

Tier-1 ingestion step: run a small local model (Phi-4-mini-instruct,
CPU inference via llama-cpp-python) against segmented scenes and produce
draft capsule JSON matching artifacts/mcp-server/src/capsule-schema.ts.

This is the free, zero-setup default tier described in
docs/adr/0004-manuscript-ingestion-and-bring-your-own-ai.md. It runs
entirely on the GitHub Actions runner that invokes it — no AI provider is
called, no API key is read, and nothing here costs the platform owner
anything beyond GitHub Actions minutes.

NOT YET BENCHMARKED against a real GitHub Actions runner. The prompt,
JSON-parsing, and retry logic below are written and internally consistent,
but wall-clock time per chapter has not been measured on real CI hardware.
Do one real dry run before promising a "submit and check back in N minutes"
number in any user-facing copy.

Usage:
    python3 extract_capsules.py <segmented-scenes.json> <model.gguf> <output-capsules.json>
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

CAPSULE_PROMPT_TEMPLATE = """You are extracting story capsules from a manuscript excerpt for a \
collaborative storytelling platform. A capsule is ONE atomic idea: a \
character, a plot arc beat, a planned event, or a recurring motif.

Read the scene below and propose 0-4 capsules. Prefer fewer, higher-confidence \
capsules over many speculative ones. Do not invent characters or events not \
present in the text.

Respond with ONLY a JSON array, no prose before or after. Each element must \
have exactly these fields:
  kind: one of "character", "arc-beat", "planned-event", "motif"
  title: short label, 120 characters max
  body: 1-3 sentences describing the capsule, in your own words
  role: one of "protagonist", "antagonist", "supporting", "unspecified" \
(ONLY include this field when kind is "character")
  confidence: one of "high", "medium", "low"

If the scene contains nothing worth capturing as a capsule, respond with \
an empty array: []

SCENE:
{scene_text}
"""

JSON_ARRAY_RE = re.compile(r"\[.*\]", re.DOTALL)


class MalformedModelOutputError(ValueError):
    """Raised when the model response cannot be trusted as capsule data."""


def load_model(model_path: Path):
    """Deferred import: keeps this script importable/testable (see the
    prompt-formatting and JSON-extraction unit tests) without requiring
    llama-cpp-python and a real GGUF file to be present."""
    from llama_cpp import Llama

    return Llama(
        model_path=str(model_path),
        n_ctx=4096,
        n_threads=0,  # 0 = let llama.cpp pick, matches the runner's core count
        verbose=False,
    )


def extract_json_array(raw_output: str) -> list[dict]:
    """Small open models do not reliably emit bare JSON even when told to.
    Pull the first [...] block out of whatever surrounding text shows up."""
    match = JSON_ARRAY_RE.search(raw_output)
    if not match:
        return []
    try:
        parsed = json.loads(match.group(0))
    except json.JSONDecodeError:
        return []
    if not isinstance(parsed, list):
        return []
    return parsed


def parse_model_output_strict(raw_output: str) -> list[dict]:
    """Parse model output without turning failure into a misleading success.

    ``extract_json_array`` remains a small lenient helper for callers that
    only need to inspect a response. The production workflow uses this strict
    path: malformed JSON or even one invalid candidate stops the run before
    any Issue can be filed.
    """
    match = JSON_ARRAY_RE.search(raw_output)
    if not match:
        raise MalformedModelOutputError("Model response did not contain a JSON array")
    try:
        parsed = json.loads(match.group(0))
    except json.JSONDecodeError as exc:
        raise MalformedModelOutputError("Model response contained invalid JSON") from exc
    if not isinstance(parsed, list):
        raise MalformedModelOutputError("Model response JSON was not an array")
    if any(not isinstance(candidate, dict) for candidate in parsed):
        raise MalformedModelOutputError("Model response array contained a non-object")
    invalid = [index for index, candidate in enumerate(parsed) if not validate_capsule(candidate)]
    if invalid:
        raise MalformedModelOutputError(
            "Model response contained invalid capsule candidate(s) at index "
            + ", ".join(str(index) for index in invalid)
        )
    return parsed


def validate_capsule(candidate: dict) -> bool:
    """Minimal shape check mirroring CapsuleSchema in capsule-schema.ts.
    Reject rather than repair — a malformed capsule should be dropped, not
    guessed into validity, since a human reviews every capsule that does
    make it through."""
    required = {"kind", "title", "body", "confidence"}
    if not required.issubset(candidate.keys()):
        return False
    if candidate["kind"] not in {"character", "arc-beat", "planned-event", "motif"}:
        return False
    if candidate["confidence"] not in {"high", "medium", "low"}:
        return False
    if not isinstance(candidate["title"], str) or not (1 <= len(candidate["title"]) <= 120):
        return False
    if not isinstance(candidate["body"], str) or len(candidate["body"]) < 1:
        return False
    return True


def extract_capsules_for_scene(llm, scene_text: str, chapter_title: str) -> list[dict]:
    prompt = CAPSULE_PROMPT_TEMPLATE.format(scene_text=scene_text[:6000])  # keep well under n_ctx
    response = llm.create_chat_completion(
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,  # low temperature: this is extraction, not creative generation
        max_tokens=800,
    )
    raw_text = response["choices"][0]["message"]["content"]
    candidates = parse_model_output_strict(raw_text)
    for c in candidates:
        c["sourceExcerpt"] = scene_text[:2000]
        c.setdefault("_chapterTitle", chapter_title)
    return candidates


def main() -> int:
    if len(sys.argv) != 4:
        print(__doc__)
        return 1

    segments_path = Path(sys.argv[1])
    model_path = Path(sys.argv[2])
    output_path = Path(sys.argv[3])

    if not segments_path.exists():
        print(f"Segments file not found: {segments_path}", file=sys.stderr)
        return 1
    if not model_path.exists():
        print(f"Model file not found: {model_path}", file=sys.stderr)
        return 1

    try:
        segments = json.loads(segments_path.read_text(encoding="utf-8"))
        if not isinstance(segments, dict) or not isinstance(segments.get("chapters"), list):
            raise ValueError("segments JSON must contain a chapters array")
        llm = load_model(model_path)
    except Exception as exc:
        print(f"Could not initialize capsule extraction: {exc}", file=sys.stderr)
        return 2

    all_capsules: list[dict] = []
    try:
        for chapter in segments["chapters"]:
            if not isinstance(chapter, dict) or not isinstance(chapter.get("scenes"), list):
                raise ValueError("segments JSON contains an invalid chapter")
            for scene_text in chapter["scenes"]:
                if not isinstance(scene_text, str):
                    raise ValueError("segments JSON contains a non-text scene")
                capsules = extract_capsules_for_scene(llm, scene_text, chapter["title"])
                all_capsules.extend(capsules)
                print(
                    f"  {chapter['title']}: {len(capsules)} capsule(s) from a "
                    f"{len(scene_text)}-character scene",
                )
    except MalformedModelOutputError as exc:
        print(f"Capsule extraction refused malformed model output: {exc}", file=sys.stderr)
        return 2
    except Exception as exc:
        print(f"Capsule extraction failed before Issues could be filed: {exc}", file=sys.stderr)
        return 2

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(all_capsules, indent=2), encoding="utf-8")
    print(f"Wrote {len(all_capsules)} draft capsule(s) -> {output_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
