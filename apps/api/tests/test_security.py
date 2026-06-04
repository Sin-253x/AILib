from datetime import UTC, datetime, timedelta

import pytest

from app.core.security import (
    InvalidTokenError,
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


# ======================== 代码解释 ========================
# 1. 整体功能：
#    验证认证安全工具能正确哈希密码、校验密码并生成解析访问令牌。
#
# 2. 关键部分拆解：
#    - test_hash_password_verifies_original_password_only：确认密码哈希不会明文存储。
#    - test_access_token_roundtrip_contains_subject_and_expiration：确认 token 能往返解析。
#    - test_decode_access_token_rejects_expired_token：确认过期 token 会被拒绝。
#
# 3. 重要概念与库：
#    - pytest：用于编写后端自动化测试。
#    - JWT：登录后携带用户身份的签名令牌。
#
# 4. 潜在问题与改进建议：
#    - 当前测试聚焦安全工具；后续可增加 API 集成测试覆盖完整登录流程。
#
# 5. 修改指南：
#    - 如果调整 token 字段或密码哈希格式，建议同步更新这些测试断言。
# ========================================================
def test_hash_password_verifies_original_password_only() -> None:
    stored_hash = hash_password("correct-password")

    assert stored_hash != "correct-password"
    assert verify_password("correct-password", stored_hash)
    assert not verify_password("wrong-password", stored_hash)


def test_access_token_roundtrip_contains_subject_and_expiration() -> None:
    token = create_access_token(
        subject="42",
        secret_key="test-secret",
        expires_delta=timedelta(minutes=5),
    )

    payload = decode_access_token(token, secret_key="test-secret")

    assert payload["sub"] == "42"
    assert datetime.fromtimestamp(payload["exp"], tz=UTC) > datetime.now(UTC)


def test_decode_access_token_rejects_expired_token() -> None:
    token = create_access_token(
        subject="42",
        secret_key="test-secret",
        expires_delta=timedelta(seconds=-1),
    )

    with pytest.raises(InvalidTokenError):
        decode_access_token(token, secret_key="test-secret")
