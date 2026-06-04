from typing import Annotated

from fastapi import Depends, HTTPException, status
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
async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    session: SessionDep,
) -> User:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
        )

    settings = get_settings()
    try:
        payload = decode_access_token(credentials.credentials, secret_key=settings.secret_key)
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
