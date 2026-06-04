from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

# ======================== 代码解释 ========================
# 1. 整体功能：
#    提供密码哈希、密码校验、JWT 创建和 JWT 解析的认证安全工具。
#
# 2. 关键部分拆解：
#    - hash_password：使用 PBKDF2 生成带盐密码哈希。
#    - verify_password：用恒定时间比较校验密码。
#    - create_access_token：生成 HMAC-SHA256 签名访问令牌。
#    - decode_access_token：校验签名、解析 payload 并检查过期时间。
#
# 3. 重要概念与库：
#    - PBKDF2：标准库提供的密码派生算法，比明文或普通哈希更适合存储密码。
#    - HMAC-SHA256：用共享密钥签名 token，防止客户端篡改身份。
#    - base64url：JWT 使用的 URL 安全编码格式。
#
# 4. 潜在问题与改进建议：
#    - 标准库实现适合学习项目；生产项目可替换为 passlib、argon2 和 PyJWT。
#    - secret_key 必须足够长并通过环境变量管理，不能提交真实密钥。
#
# 5. 修改指南：
#    - 如果要调整 token 字段，建议从 create_access_token 和 decode_access_token 同步修改。
# ========================================================
PASSWORD_ALGORITHM = "pbkdf2_sha256"
PASSWORD_ITERATIONS = 260_000
JWT_ALGORITHM = "HS256"


class InvalidTokenError(ValueError):
    """Raised when an access token is malformed, expired, or has an invalid signature."""


def _base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _base64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(f"{data}{padding}")


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        PASSWORD_ITERATIONS,
    ).hex()
    return f"{PASSWORD_ALGORITHM}${PASSWORD_ITERATIONS}${salt}${digest}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        algorithm, iterations, salt, expected_digest = stored_hash.split("$", 3)
    except ValueError:
        return False

    if algorithm != PASSWORD_ALGORITHM:
        return False

    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        int(iterations),
    ).hex()
    return hmac.compare_digest(digest, expected_digest)


def create_access_token(
    subject: str,
    secret_key: str,
    expires_delta: timedelta,
) -> str:
    expire_at = datetime.now(UTC) + expires_delta
    header = {"alg": JWT_ALGORITHM, "typ": "JWT"}
    payload = {"sub": subject, "exp": int(expire_at.timestamp())}
    signing_input = ".".join(
        [
            _base64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8")),
            _base64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8")),
        ]
    )
    signature = hmac.new(
        secret_key.encode("utf-8"),
        signing_input.encode("ascii"),
        hashlib.sha256,
    ).digest()
    return f"{signing_input}.{_base64url_encode(signature)}"


def decode_access_token(token: str, secret_key: str) -> dict[str, Any]:
    try:
        encoded_header, encoded_payload, encoded_signature = token.split(".", 2)
        signing_input = f"{encoded_header}.{encoded_payload}"
        expected_signature = hmac.new(
            secret_key.encode("utf-8"),
            signing_input.encode("ascii"),
            hashlib.sha256,
        ).digest()
        provided_signature = _base64url_decode(encoded_signature)
        if not hmac.compare_digest(expected_signature, provided_signature):
            raise InvalidTokenError("Invalid token signature")

        header = json.loads(_base64url_decode(encoded_header))
        payload = json.loads(_base64url_decode(encoded_payload))
    except (ValueError, json.JSONDecodeError, TypeError) as exc:
        raise InvalidTokenError("Invalid token format") from exc

    if header.get("alg") != JWT_ALGORITHM:
        raise InvalidTokenError("Unsupported token algorithm")

    expires_at = payload.get("exp")
    if not isinstance(expires_at, int) or expires_at <= int(datetime.now(UTC).timestamp()):
        raise InvalidTokenError("Token has expired")

    if not isinstance(payload.get("sub"), str):
        raise InvalidTokenError("Token subject is missing")

    return payload
