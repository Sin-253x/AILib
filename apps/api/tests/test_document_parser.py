import pytest

from app.services.document_parser import (
    DocumentParseError,
    parse_uploaded_document,
)


# ======================== 代码解释 ========================
# 1. 整体功能：
#    验证文档上传解析服务能处理文本文件并拒绝不安全或无效输入。
#
# 2. 关键部分拆解：
#    - test_parse_text_upload_extracts_title_and_content：验证 TXT 文件解析。
#    - test_parse_markdown_upload_accepts_markdown_extension：验证 Markdown 扩展名。
#    - test_parse_upload_rejects_empty_content：验证空文件被拒绝。
#    - test_parse_upload_rejects_unsupported_extension：验证不支持的文件类型被拒绝。
#    - test_parse_upload_rejects_oversized_file：验证大小限制。
#
# 3. 重要概念与库：
#    - pytest：提供异常断言和轻量单元测试能力。
#    - 上传解析：把文件名、MIME 类型、字节内容转换成可保存的文档字段。
#
# 4. 潜在问题与改进建议：
#    - 当前测试只覆盖文本类文件；后续接入 PDF 时应增加专门解析测试。
#
# 5. 修改指南：
#    - 如果支持新的文件类型，建议先补这里的测试，再扩展解析服务。
# ========================================================
def test_parse_text_upload_extracts_title_and_content() -> None:
    parsed = parse_uploaded_document(
        filename="research-note.txt",
        content_type="text/plain",
        content_bytes=b"First line\nSecond line",
        max_size_bytes=1024,
    )

    assert parsed.title == "research-note"
    assert parsed.content == "First line\nSecond line"
    assert parsed.source_filename == "research-note.txt"
    assert parsed.source_mime_type == "text/plain"
    assert parsed.source_size_bytes == 22


def test_parse_markdown_upload_accepts_markdown_extension() -> None:
    parsed = parse_uploaded_document(
        filename="guide.md",
        content_type="text/markdown",
        content_bytes=b"# Heading\n\nBody",
        max_size_bytes=1024,
    )

    assert parsed.title == "guide"
    assert parsed.content.startswith("# Heading")


def test_parse_upload_rejects_empty_content() -> None:
    with pytest.raises(DocumentParseError, match="empty"):
        parse_uploaded_document(
            filename="empty.txt",
            content_type="text/plain",
            content_bytes=b"   \n\t",
            max_size_bytes=1024,
        )


def test_parse_upload_rejects_unsupported_extension() -> None:
    with pytest.raises(DocumentParseError, match="Unsupported"):
        parse_uploaded_document(
            filename="archive.zip",
            content_type="application/zip",
            content_bytes=b"content",
            max_size_bytes=1024,
        )


def test_parse_upload_rejects_oversized_file() -> None:
    with pytest.raises(DocumentParseError, match="too large"):
        parse_uploaded_document(
            filename="large.txt",
            content_type="text/plain",
            content_bytes=b"x" * 11,
            max_size_bytes=10,
        )


# ======================== 代码解释 ========================
# 1. 整体功能：
#    验证上传解析服务会把 PDF 和 DOCX 文件分发给专用解析器。
#
# 2. 关键部分拆解：
#    - monkeypatch：替换底层二进制解析函数，避免测试依赖复杂样本文档。
#    - parse_uploaded_document：仍然覆盖真实的扩展名、大小和空内容校验流程。
#
# 3. 重要概念与库：
#    - PDF/DOCX：知识库常见办公文档格式，需要和纯文本分别解析。
#    - 单元测试隔离：这里测试分发和清洗逻辑，不测试第三方库本身。
#
# 4. 潜在问题与改进建议：
#    - 后续可增加真实 PDF/DOCX fixture 覆盖第三方解析库兼容性。
#
# 5. 修改指南：
#    - 如果新增 PPTX 等格式，建议按同样方式先增加分发测试。
# ========================================================
def test_parse_pdf_upload_uses_pdf_extractor(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.services import document_parser

    monkeypatch.setattr(document_parser, "_extract_pdf_text", lambda _: "PDF knowledge base text")

    parsed = parse_uploaded_document(
        filename="research.pdf",
        content_type="application/pdf",
        content_bytes=b"%PDF-1.4 fake bytes for unit dispatch",
        max_size_bytes=1024,
    )

    assert parsed.title == "research"
    assert parsed.content == "PDF knowledge base text"
    assert parsed.source_filename == "research.pdf"


def test_parse_docx_upload_uses_docx_extractor(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.services import document_parser

    monkeypatch.setattr(document_parser, "_extract_docx_text", lambda _: "DOCX knowledge base text")

    parsed = parse_uploaded_document(
        filename="notes.docx",
        content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        content_bytes=b"fake docx bytes for unit dispatch",
        max_size_bytes=1024,
    )

    assert parsed.title == "notes"
    assert parsed.content == "DOCX knowledge base text"
    assert parsed.source_filename == "notes.docx"
