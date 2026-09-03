#!/usr/bin/env python3
"""Verify a downloaded model file before it reaches the Phi-4 loader.

The workflow passes the expected byte size and SHA-256 digest for the exact
Hugging Face revision it pins.  This script deliberately does not import
llama-cpp-python: an invalid or incomplete cache entry must fail before model
initialization, manuscript extraction, or Issue filing.

Usage:
    python3 verify_model.py <model.gguf> <expected-size-bytes> <expected-sha256>
"""

from __future__ import annotations

import hashlib
import re
import sys
from dataclasses import dataclass
from pathlib import Path


SHA256_RE = re.compile(r"^[0-9a-fA-F]{64}$")
CHUNK_SIZE = 1024 * 1024


class ModelIntegrityError(ValueError):
    """Raised when a model file is absent or differs from its contract."""


@dataclass(frozen=True)
class ModelIntegrity:
    size_bytes: int
    sha256: str


def verify_model_integrity(
    model_path: Path,
    expected_size_bytes: int,
    expected_sha256: str,
) -> ModelIntegrity:
    """Hash the model once and require both size and digest to match."""
    if expected_size_bytes < 1:
        raise ModelIntegrityError("expected model size must be a positive integer")
    if not SHA256_RE.fullmatch(expected_sha256):
        raise ModelIntegrityError("expected model SHA-256 must be 64 hexadecimal characters")
    if not model_path.is_file():
        raise ModelIntegrityError(f"model file not found: {model_path}")

    digest = hashlib.sha256()
    size_bytes = 0
    with model_path.open("rb") as model_file:
        while chunk := model_file.read(CHUNK_SIZE):
            size_bytes += len(chunk)
            digest.update(chunk)

    actual_sha256 = digest.hexdigest()
    mismatches: list[str] = []
    if size_bytes != expected_size_bytes:
        mismatches.append(f"size {size_bytes} bytes (expected {expected_size_bytes})")
    if actual_sha256.lower() != expected_sha256.lower():
        mismatches.append(f"sha256 {actual_sha256} (expected {expected_sha256.lower()})")
    if mismatches:
        raise ModelIntegrityError("model integrity mismatch: " + "; ".join(mismatches))

    return ModelIntegrity(size_bytes=size_bytes, sha256=actual_sha256)


def main() -> int:
    if len(sys.argv) != 4:
        print(__doc__, file=sys.stderr)
        return 1

    model_path = Path(sys.argv[1])
    try:
        expected_size_bytes = int(sys.argv[2])
    except ValueError:
        print("Model integrity check failed: expected model size is not an integer.", file=sys.stderr)
        return 1

    try:
        result = verify_model_integrity(
            model_path,
            expected_size_bytes,
            sys.argv[3],
        )
    except ModelIntegrityError as exc:
        print(f"Model integrity check failed: {exc}", file=sys.stderr)
        return 2

    print(
        f"Model integrity verified: {result.size_bytes} bytes, "
        f"sha256={result.sha256}",
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())