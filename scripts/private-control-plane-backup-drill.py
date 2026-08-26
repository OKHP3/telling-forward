"""Exercise the pilot backup encryption and key-recovery contract.

This is deliberately provider-free: it creates a synthetic SQL dump, encrypts
it with the same OpenSSL passphrase workflow selected for the pilot, decrypts
it, and verifies the bytes. It never connects to PostgreSQL or production and
never prints the passphrase or dump contents.
"""

from __future__ import annotations

import hashlib
import secrets
import subprocess
import tempfile
from pathlib import Path


OPENSSL_CIPHER = "aes-256-cbc"
OPENSSL_ITERATIONS = "600000"


def run_openssl(*args: str, passphrase: bytes) -> None:
    subprocess.run(
        ["openssl", "enc", *args, "-pass", "stdin"],
        input=passphrase,
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
    )


def main() -> None:
    synthetic_dump = (
        b"-- synthetic private control-plane dump; no production data\n"
        b"CREATE TABLE consent_records (id integer, status text);\n"
        b"INSERT INTO consent_records VALUES (7, 'revoked');\n"
        b"CREATE TABLE moderation_events (case_id text, event text);\n"
        b"INSERT INTO moderation_events VALUES ('case-fixture', 'closed');\n"
    )
    passphrase = secrets.token_bytes(32)
    expected_digest = hashlib.sha256(synthetic_dump).hexdigest()

    with tempfile.TemporaryDirectory(prefix="private-backup-drill-") as temp:
        root = Path(temp)
        source = root / "synthetic.sql"
        encrypted = root / "synthetic.sql.enc"
        restored = root / "restored.sql"
        source.write_bytes(synthetic_dump)

        run_openssl(
            "-aes-256-cbc",
            "-pbkdf2",
            "-iter",
            OPENSSL_ITERATIONS,
            "-salt",
            "-in",
            str(source),
            "-out",
            str(encrypted),
            passphrase=passphrase,
        )
        if encrypted.read_bytes() == synthetic_dump:
            raise AssertionError("encrypted archive unexpectedly matches plaintext")

        run_openssl(
            "-d",
            f"-{OPENSSL_CIPHER}",
            "-pbkdf2",
            "-iter",
            OPENSSL_ITERATIONS,
            "-in",
            str(encrypted),
            "-out",
            str(restored),
            passphrase=passphrase,
        )
        recovered = restored.read_bytes()
        if recovered != synthetic_dump:
            raise AssertionError("decrypted archive differs from synthetic dump")
        if hashlib.sha256(recovered).hexdigest() != expected_digest:
            raise AssertionError("restored archive checksum does not match")

    print("synthetic private-control-plane backup drill: PASS")
    print("archive encryption: PASS")
    print("passphrase recovery: PASS")
    print("checksum and byte-for-byte restore: PASS")


if __name__ == "__main__":
    main()