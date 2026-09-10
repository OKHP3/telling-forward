#!/usr/bin/env python3
"""Verify the pinned model metadata and downloaded file before Phi-4 loads.

The workflow passes the expected byte size and SHA-256 digest for the exact
Hugging Face revision it pins.  The metadata mode queries Hugging Face's model
info API only; it never downloads the model file.  The file mode deliberately
does not import llama-cpp-python: an invalid or incomplete cache entry must
fail before model initialization, manuscript extraction, or Issue filing.

Usage:
    python3 verify_model.py <model.gguf> <expected-size-bytes> <expected-sha256>
    python3 verify_model.py --verify-hf-metadata <repo> <revision> \
        <filename> <expected-size-bytes> <expected-sha256>
"""

from __future__ import annotations

import hashlib
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


SHA256_RE = re.compile(r"^[0-9a-fA-F]{64}$")
CHUNK_SIZE = 1024 * 1024
HF_MODEL_INFO_URL = "https://huggingface.co/api/models/{repo_id}?{query}"


class ModelIntegrityError(ValueError):
    """Raised when a model file is absent or differs from its contract."""


class ModelMetadataError(ValueError):
    """Base class for failures in the Hugging Face metadata gate."""


class ModelMetadataServiceError(ModelMetadataError):
    """Raised when Hugging Face cannot provide a usable metadata response."""


class ModelMetadataContractError(ModelMetadataError):
    """Raised when usable metadata does not satisfy the pinned contract."""


class ModelIntegrity:
    def __init__(self, size_bytes: int, sha256: str) -> None:
        self.size_bytes = size_bytes
        self.sha256 = sha256


class ModelMetadata:
    def __init__(self, revision: str, filename: str, size_bytes: int, sha256: str) -> None:
        self.revision = revision
        self.filename = filename
        self.size_bytes = size_bytes
        self.sha256 = sha256


def _validate_expected_contract(expected_size_bytes: int, expected_sha256: str) -> None:
    if expected_size_bytes < 1:
        raise ModelMetadataContractError("expected model size must be a positive integer")
    if not SHA256_RE.fullmatch(expected_sha256):
        raise ModelMetadataContractError(
            "expected model SHA-256 must be 64 hexadecimal characters"
        )


def _fetch_huggingface_model_info(repo_id: str, revision: str) -> dict:
    """Fetch model metadata without requesting any model file contents."""
    if not repo_id or not revision:
        raise ModelMetadataContractError("model repository and revision must not be empty")

    query = urllib.parse.urlencode({"revision": revision, "blobs": "true"})
    url = HF_MODEL_INFO_URL.format(
        repo_id=urllib.parse.quote(repo_id, safe="/"),
        query=query,
    )
    request = urllib.request.Request(
        url,
        headers={"Accept": "application/json", "User-Agent": "telling-forward-ingestion"},
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            payload = json.load(response)
    except urllib.error.HTTPError as exc:
        raise ModelMetadataServiceError(
            f"Hugging Face metadata request returned HTTP {exc.code} for "
            f"{repo_id}@{revision}; the metadata service is unavailable"
        ) from exc
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        raise ModelMetadataServiceError(
            f"could not fetch Hugging Face metadata for {repo_id}@{revision}; "
            "the metadata service is unavailable"
        ) from exc
    except (json.JSONDecodeError, TypeError, ValueError) as exc:
        raise ModelMetadataServiceError(
            f"Hugging Face metadata response was malformed for "
            f"{repo_id}@{revision}"
        ) from exc

    if not isinstance(payload, dict):
        raise ModelMetadataServiceError(
            f"Hugging Face metadata response had an unexpected shape for "
            f"{repo_id}@{revision}"
        )
    return payload


def verify_huggingface_model_metadata(
    repo_id: str,
    expected_revision: str,
    expected_filename: str,
    expected_size_bytes: int,
    expected_sha256: str,
) -> ModelMetadata:
    """Require Hugging Face metadata to match the workflow's pinned contract."""
    _validate_expected_contract(expected_size_bytes, expected_sha256)
    if not expected_filename:
        raise ModelMetadataContractError("expected model filename must not be empty")

    payload = _fetch_huggingface_model_info(repo_id, expected_revision)
    actual_revision = payload.get("sha")
    mismatches: list[str] = []
    if not isinstance(actual_revision, str):
        mismatches.append("revision is missing from Hugging Face metadata")
    elif actual_revision.lower() != expected_revision.lower():
        mismatches.append(
            f"revision {actual_revision} (expected {expected_revision}); "
            "update HF_MODEL_REVISION and the published asset contract together"
        )

    siblings = payload.get("siblings")
    asset = next(
        (
            sibling
            for sibling in siblings
            if isinstance(sibling, dict) and sibling.get("rfilename") == expected_filename
        ),
        None,
    ) if isinstance(siblings, list) else None
    if asset is None:
        mismatches.append(
            f"file {expected_filename!r} is missing from the pinned Hugging Face revision"
        )
        if mismatches:
            raise ModelMetadataContractError("model metadata mismatch: " + "; ".join(mismatches))
        raise ModelMetadataContractError(
            f"model metadata mismatch: file {expected_filename!r} is missing from "
            "the pinned Hugging Face revision"
        )

    lfs_metadata = asset.get("lfs")
    actual_size = lfs_metadata.get("size") if isinstance(lfs_metadata, dict) else None
    actual_sha256 = lfs_metadata.get("sha256") if isinstance(lfs_metadata, dict) else None
    if not isinstance(actual_size, int) or actual_size < 1:
        mismatches.append(
            f"file {expected_filename!r} has no valid published size metadata"
        )
    elif actual_size != expected_size_bytes:
        mismatches.append(
            f"size {actual_size} bytes (expected {expected_size_bytes}); "
            "refresh HF_MODEL_SIZE_BYTES for the pinned revision"
        )
    if not isinstance(actual_sha256, str) or not SHA256_RE.fullmatch(actual_sha256):
        mismatches.append(
            f"file {expected_filename!r} has no valid published SHA-256 metadata"
        )
    elif actual_sha256.lower() != expected_sha256.lower():
        mismatches.append(
            f"sha256 {actual_sha256} (expected {expected_sha256.lower()}); "
            "refresh HF_MODEL_SHA256 for the pinned revision"
        )

    if mismatches:
        raise ModelMetadataContractError("model metadata mismatch: " + "; ".join(mismatches))

    return ModelMetadata(
        revision=actual_revision,
        filename=expected_filename,
        size_bytes=actual_size,
        sha256=actual_sha256.lower(),
    )


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
    if len(sys.argv) == 7 and sys.argv[1] == "--verify-hf-metadata":
        try:
            expected_size_bytes = int(sys.argv[5])
        except ValueError:
            print("Model metadata check failed: expected model size is not an integer.", file=sys.stderr)
            return 1

        try:
            result = verify_huggingface_model_metadata(
                sys.argv[2],
                sys.argv[3],
                sys.argv[4],
                expected_size_bytes,
                sys.argv[6],
            )
        except ModelMetadataServiceError as exc:
            print(
                "Model metadata check failed: "
                f"Hugging Face metadata service unavailable: {exc}",
                file=sys.stderr,
            )
            return 2
        except ModelMetadataContractError as exc:
            print(
                "Model metadata check failed: "
                f"model metadata contract mismatch: {exc}",
                file=sys.stderr,
            )
            return 2

        print(
            f"Model metadata verified: {result.revision}, {result.filename}, "
            f"{result.size_bytes} bytes, sha256={result.sha256}",
        )
        return 0

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