from fastapi import Response

from app.api.auth import clear_auth_cookie, set_auth_cookie
from app.api.deps import resolve_request_token


# ======================== 代码解释 ========================
# 1. 整体功能：
#    验证认证层会把访问令牌写入 httpOnly Cookie，并保持 Bearer token 兼容。
#
# 2. 关键部分拆解：
#    - set_auth_cookie：登录或注册成功后写入浏览器不可被 JS 读取的 Cookie。
#    - clear_auth_cookie：登出时清理同名 Cookie。
#    - resolve_request_token：优先使用 Authorization Bearer，缺失时回退 Cookie。
#
# 3. 重要概念与库：
#    - httpOnly Cookie：降低 XSS 直接窃取 token 的风险。
#    - Bearer 兼容：方便 API 调试工具和脚本继续使用 Authorization 头。
#
# 4. 潜在问题与改进建议：
#    - 本测试只验证响应头和 token 选择策略，不连接数据库。
#
# 5. 修改指南：
#    - 如果 Cookie 名称或 SameSite 策略变化，应同步调整这些断言。
# ========================================================
def test_set_auth_cookie_marks_token_http_only() -> None:
    response = Response()

    set_auth_cookie(response, token="signed-token")

    set_cookie_header = response.headers["set-cookie"]
    assert "ailib_access_token=signed-token" in set_cookie_header
    assert "HttpOnly" in set_cookie_header
    assert "SameSite=lax" in set_cookie_header


def test_clear_auth_cookie_expires_same_cookie_name() -> None:
    response = Response()

    clear_auth_cookie(response)

    set_cookie_header = response.headers["set-cookie"]
    assert "ailib_access_token=" in set_cookie_header
    assert "Max-Age=0" in set_cookie_header


def test_resolve_request_token_prefers_bearer_over_cookie() -> None:
    token = resolve_request_token(
        bearer_token="bearer-token",
        cookie_token="cookie-token",
    )

    assert token == "bearer-token"


def test_resolve_request_token_uses_cookie_when_bearer_missing() -> None:
    token = resolve_request_token(
        bearer_token=None,
        cookie_token="cookie-token",
    )

    assert token == "cookie-token"
