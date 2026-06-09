from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import InvalidTokenError, decode_access_token
from app.db.session import get_session
from app.models.user import User

SessionDep = Annotated[AsyncSession, Depends(get_session)]
bearer_scheme = HTTPBearer(auto_error=False)


# ======================== 代码解释 ========================
# 1. 整体功能：
#    从 Authorization Bearer token 中解析当前登录用户。
#
# 2. 关键部分拆解：
#    - bearer_scheme：读取请求头里的 Bearer token。
#    - decode_access_token：校验 token 签名和过期时间。
#    - session.get：根据 token subject 查询用户。
#
# 3. 重要概念与库：
#    - FastAPI Depends：把认证逻辑作为路由依赖复用。
#    - HTTPBearer：解析标准 Bearer 认证头。
#
# 4. 潜在问题与改进建议：
#    - 当前只支持单一访问令牌；后续可增加 refresh token 和注销机制。
#
# 5. 修改指南：
#    - 如果要给更多接口加认证，建议在路由参数中声明 CurrentUserDep。
# ========================================================
def resolve_request_token(
    *,
    bearer_token: str | None,
    cookie_token: str | None,
) -> str | None:
    if bearer_token:
        return bearer_token
    return cookie_token


# ======================== 代码解释 ========================
# 1. 整体功能：
#    从 Authorization Bearer 或 httpOnly Cookie 中解析当前登录用户。
#
# 2. 关键部分拆解：
#    - bearer_scheme：继续兼容 API 调试工具传入 Authorization 头。
#    - request.cookies：浏览器前端优先通过 httpOnly Cookie 自动携带 token。
#    - resolve_request_token：统一选择 token 来源，Bearer 优先、Cookie 兜底。
#
# 3. 重要概念与库：
#    - FastAPI Depends：把认证逻辑作为可复用路由依赖。
#    - httpOnly Cookie：前端不用把 token 放入 localStorage。
#
# 4. 潜在问题与改进建议：
#    - 当前仍是单 token 机制；长会话建议增加 refresh token 和撤销表。
#
# 5. 修改指南：
#    - 如果 Cookie 名称变化，只需要修改 Settings.AUTH_COOKIE_NAME。
# ========================================================
async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    request: Request,
    session: SessionDep,
) -> User:
    settings = get_settings()
    token = resolve_request_token(
        bearer_token=credentials.credentials if credentials else None,
        cookie_token=request.cookies.get(settings.auth_cookie_name),
    )
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
        )

    try:
        payload = decode_access_token(token, secret_key=settings.secret_key)
        user_id = int(payload["sub"])
    except (InvalidTokenError, KeyError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
        ) from exc

    user = await session.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists",
        )
    return user


CurrentUserDep = Annotated[User, Depends(get_current_user)]
