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
