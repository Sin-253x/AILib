from dataclasses import dataclass
from pathlib import Path

# ======================== 代码解释 ========================
# 1. 整体功能：
#    解析上传的文本类文档，把文件字节转换成可保存的文档内容和来源元数据。
#
# 2. 关键部分拆解：
#    - ParsedDocument：保存解析后的标题、正文和来源信息。
#    - parse_uploaded_document：执行扩展名、大小、编码和空内容校验。
#    - _decode_text：兼容 UTF-8 和 UTF-8 BOM 文本。
#
# 3. 重要概念与库：
#    - dataclass：用轻量结构承载解析结果。
#    - pathlib.Path：安全提取文件扩展名和无后缀标题。
#    - UTF-8：当前阶段支持的文本上传编码。
#
# 4. 潜在问题与改进建议：
#    - 当前不解析 PDF；后续可接入专门 PDF 解析库并补充测试。
#    - 当前整篇保存正文；向量化阶段需要继续切分为 chunks。
#
# 5. 修改指南：
#    - 如果要支持新扩展名，建议先更新 SUPPORTED_TEXT_EXTENSIONS 和对应测试。
# ========================================================
SUPPORTED_TEXT_EXTENSIONS = {".txt", ".md", ".markdown"}


class DocumentParseError(ValueError):
    """Raised when an uploaded document cannot be accepted or parsed."""


@dataclass(frozen=True)
class ParsedDocument:
    title: str
    content: str
    source_filename: str
    source_mime_type: str | None
    source_size_bytes: int


def _decode_text(content_bytes: bytes) -> str:
    try:
        return content_bytes.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise DocumentParseError("File must be valid UTF-8 text") from exc


def parse_uploaded_document(
    *,
    filename: str,
    content_type: str | None,
    content_bytes: bytes,
    max_size_bytes: int,
) -> ParsedDocument:
    source_size_bytes = len(content_bytes)
    if source_size_bytes > max_size_bytes:
        raise DocumentParseError("Uploaded file is too large")

    source_path = Path(filename)
    extension = source_path.suffix.lower()
    if extension not in SUPPORTED_TEXT_EXTENSIONS:
        raise DocumentParseError("Unsupported file type")

    content = _decode_text(content_bytes).strip()
    if not content:
        raise DocumentParseError("Uploaded file is empty")

    title = source_path.stem.strip() or "Untitled document"
    return ParsedDocument(
        title=title[:200],
        content=content,
        source_filename=source_path.name,
        source_mime_type=content_type,
        source_size_bytes=source_size_bytes,
    )
