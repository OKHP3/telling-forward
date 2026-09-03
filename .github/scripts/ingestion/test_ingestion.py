"""Contract fixtures for the owner-controlled manuscript ingestion pipeline."""

from __future__ import annotations

import hashlib
import importlib.util
import json
import shutil
import struct
import subprocess
import sys
import zipfile
from pathlib import Path

import pytest


ROOT = Path(__file__).parent


def load_script(name: str):
    spec = importlib.util.spec_from_file_location(name, ROOT / f"{name}.py")
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def make_docx(path: Path) -> None:
    document = """<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body><w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Chapter One</w:t></w:r></w:p>
<w:p><w:r><w:t>Mae opened the locked door.</w:t></w:r></w:p>
<w:p><w:r><w:t>***</w:t></w:r></w:p>
<w:p><w:r><w:t>The bell answered from below.</w:t></w:r></w:p>
<w:sectPr/></w:body></w:document>"""
    types = """<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>"""
    rels = """<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>"""
    with zipfile.ZipFile(path, "w") as archive:
        archive.writestr("[Content_Types].xml", types)
        archive.writestr("_rels/.rels", rels)
        archive.writestr("word/document.xml", document)


def make_epub(path: Path) -> None:
    container = """<?xml version="1.0"?><container version="1.0"
xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles>
<rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
</rootfiles></container>"""
    opf = """<package xmlns="http://www.idpf.org/2007/opf" version="2.0">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Owned Fixture</dc:title>
<dc:language>en</dc:language><dc:identifier id="bookid">fixture</dc:identifier></metadata><manifest>
<item id="chapter" href="chapter.xhtml" media-type="application/xhtml+xml"/>
</manifest><spine><itemref idref="chapter"/></spine></package>"""
    chapter = """<html xmlns="http://www.w3.org/1999/xhtml"><body>
<h1>Chapter One</h1><p>Mae opened the locked door.</p><p>***</p>
<p>The bell answered from below.</p></body></html>"""
    with zipfile.ZipFile(path, "w") as archive:
        archive.writestr("mimetype", "application/epub+zip", compress_type=zipfile.ZIP_STORED)
        archive.writestr("META-INF/container.xml", container)
        archive.writestr("OEBPS/content.opf", opf)
        archive.writestr("OEBPS/chapter.xhtml", chapter)


def make_pdf(path: Path, text: str | None) -> None:
    """Write a tiny valid PDF fixture without adding a PDF-generation package."""
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        (
            b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
            + (b"/Resources << /Font << /F1 4 0 R >> >> " if text else b"")
            + b"/Contents 5 0 R >>"
        ),
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        (
            f"<< /Length {len(('BT /F1 12 Tf 72 720 Td (' + (text or '') + ') Tj ET').encode())} >>\n"
            "stream\nBT /F1 12 Tf 72 720 Td (" + (text or "") + ") Tj ET\nendstream"
        ).encode(),
    ]
    output = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for number, obj in enumerate(objects, start=1):
        offsets.append(len(output))
        output.extend(f"{number} 0 obj\n".encode() + obj + b"\nendobj\n")
    xref = len(output)
    output.extend(f"xref\n0 {len(objects) + 1}\n".encode())
    output.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        output.extend(f"{offset:010d} 00000 n \n".encode())
    output.extend(
        f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode()
    )
    path.write_bytes(output)


@pytest.mark.skipif(shutil.which("pandoc") is None, reason="pandoc is installed by the GitHub workflow")
def test_docx_and_epub_fixtures_convert_and_segment(tmp_path: Path) -> None:
    convert = load_script("convert_manuscript")
    segment = load_script("segment_scenes")
    for extension, make_fixture in (("docx", make_docx), ("epub", make_epub)):
        source = tmp_path / f"owned.{extension}"
        markdown = tmp_path / f"{extension}.md"
        make_fixture(source)
        convert.convert(source, markdown)
        result = segment.segment(markdown.read_text(encoding="utf-8"))
        assert "Mae opened the locked door." in markdown.read_text(encoding="utf-8")
        content_scenes = [
            scene
            for chapter in result
            for scene in chapter["scenes"]
            if "Mae opened the locked door." in scene
            or "The bell answered from below." in scene
        ]
        assert len(content_scenes) == 2


def test_text_pdf_converts_and_scanned_pdf_is_rejected(tmp_path: Path) -> None:
    convert = load_script("convert_manuscript")
    text_pdf = tmp_path / "owned.pdf"
    scanned_pdf = tmp_path / "scanned.pdf"
    make_pdf(text_pdf, "This is an owned text manuscript with enough words to pass the extraction floor.")
    make_pdf(scanned_pdf, None)
    output = tmp_path / "text.md"
    convert.convert(text_pdf, output)
    assert "owned text manuscript" in output.read_text(encoding="utf-8")
    with pytest.raises(convert.ScannedPdfError, match="scanned image PDF"):
        convert.convert(scanned_pdf, tmp_path / "scanned.md")


def test_malformed_model_output_fails_closed() -> None:
    extract = load_script("extract_capsules")
    assert extract.parse_model_output_strict("[]") == []
    with pytest.raises(extract.MalformedModelOutputError):
        extract.parse_model_output_strict("not JSON")
    with pytest.raises(extract.MalformedModelOutputError):
        extract.parse_model_output_strict('[{"kind":"unknown","title":"x","body":"y","confidence":"low"}]')


def test_model_integrity_accepts_matching_size_and_sha256(tmp_path: Path) -> None:
    verify = load_script("verify_model")
    model = tmp_path / "model.gguf"
    model.write_bytes(b"valid GGUF fixture")
    digest = hashlib.sha256(model.read_bytes()).hexdigest()

    result = verify.verify_model_integrity(model, model.stat().st_size, digest)

    assert result.size_bytes == len(b"valid GGUF fixture")
    assert result.sha256 == digest


def test_truncated_model_fails_before_extraction_or_issue_filing(tmp_path: Path) -> None:
    """A truncated fixture is rejected at the workflow's first model gate."""
    verify_script = ROOT / "verify_model.py"
    model = tmp_path / "truncated-model.gguf"
    model.write_bytes(b"complete model payload"[:-4])
    expected_size = len(b"complete model payload")
    expected_sha256 = hashlib.sha256(b"complete model payload").hexdigest()
    extraction_marker = tmp_path / "extraction-ran"
    issue_marker = tmp_path / "issue-filing-ran"

    result = subprocess.run(
        [
            sys.executable,
            str(verify_script),
            str(model),
            str(expected_size),
            expected_sha256,
        ],
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode == 2
    assert "model integrity mismatch" in result.stderr
    assert not extraction_marker.exists()
    assert not issue_marker.exists()

    workflow = (ROOT.parents[1] / "workflows" / "manuscript-ingestion.yml").read_text(
        encoding="utf-8",
    )
    verify_position = workflow.index("- name: Verify model weights")
    convert_position = workflow.index("- name: Convert manuscript")
    extract_position = workflow.index("- name: Extract draft capsules")
    file_position = workflow.index("- name: File capsules as draft GitHub Issues")
    assert verify_position < convert_position < extract_position < file_position


def test_workflow_caches_and_measures_dependency_install() -> None:
    workflow = (ROOT.parents[1] / "workflows" / "manuscript-ingestion.yml").read_text(
        encoding="utf-8",
    )

    cache_position = workflow.index("- name: Cache ingestion dependency wheels")
    install_position = workflow.index("- name: Install ingestion dependencies")
    contract_position = workflow.index("- name: Verify ingestion contract")
    assert cache_position < install_position < contract_position
    assert "path: ~/.cache/pip" in workflow
    assert "hashFiles('.github/scripts/ingestion/requirements.txt')" in workflow
    assert "--prefer-binary" in workflow
    assert 'echo "cache_hit=' in workflow
    assert 'echo "duration_seconds=' in workflow
    assert "$GITHUB_STEP_SUMMARY" in workflow


def test_issue_filing_contract_is_draft_and_typed() -> None:
    filing = load_script("file_capsules_as_issues")
    body = filing.build_issue_body({
        "kind": "character",
        "title": "Mae",
        "body": "A draft capsule.",
        "confidence": "high",
        "sourceExcerpt": "Mae opened the locked door.",
    })
    assert "state:draft" not in body  # state is a label, never misleading body prose
    assert "Review before promoting" in body