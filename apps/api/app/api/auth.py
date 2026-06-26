from datetime import timedelta

from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import func
from sqlalchemy.future import select

from app.api.deps import CurrentUserDep, SessionDep
from app.core.config import get_settings
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.schemas import AuthResponse, LoginRequest, RegisterRequest, UserRead

router = APIRouter(prefix="/auth", tags=["auth"])


# ======================== 代码解释 ========================
# 1. 整体功能：
#    把数据库用户模型转换成前端可见的用户响应。
#
# 2. 关键部分拆解：
#    - UserRead：只暴露 id、email 和 created_at，不暴露 password_hash。
#
# 3. 重要概念与库：
#    - 响应 DTO：隔离数据库内部字段和 API 输出字段。
#
# 4. 潜在问题与改进建议：
#    - 当前用户资料较少；后续可增加昵称、头像和角色字段。
#
# 5. 修改指南：
#    - 如果要让前端显示更多用户信息，建议先扩展 UserRead。
# ========================================================
def to_user_read(user: User) -> UserRead:
    return UserRead(id=user.id, email=user.email, created_at=user.created_at)


# ======================== 代码解释 ========================
# 1. 整体功能：
#    为指定用户生成登录响应，包含访问令牌和用户信息。
#
# 2. 关键部分拆解：
#    - create_access_token：把用户 id 写入 token subject。
#    - AuthResponse：返回 token 类型、token 字符串和当前用户。
#
# 3. 重要概念与库：
#    - JWT Bearer token：前端后续通过 Authorization 头访问受保护接口。
#
# 4. 潜在问题与改进建议：
#    - 当前没有 refresh token；长会话场景需要增加刷新机制。
#
# 5. 修改指南：
#    - 如果要调整登录时长，建议修改 ACCESS_TOKEN_EXPIRE_MINUTES 环境变量。
# ========================================================
# ======================== 代码解释 ========================
# 1. 整体功能：
#    把签发好的访问令牌写入浏览器 httpOnly Cookie。
#
# 2. 关键部分拆解：
#    - httponly=True：禁止前端 JavaScript 读取 Cookie 内容。
#    - max_age：让 Cookie 生命周期和 access token 过期时间保持一致。
#    - samesite/secure：通过环境变量适配本地开发和 HTTPS 生产环境。
#
# 3. 重要概念与库：
#    - Response.set_cookie：FastAPI/Starlette 设置响应 Cookie 的标准方式。
#    - httpOnly Cookie：比 localStorage 更适合保存浏览器会话 token。
#
# 4. 潜在问题与改进建议：
#    - 本项目仍返回 access_token，用于 API 工具和脚本兼容；浏览器前端优先依赖 Cookie。
#
# 5. 修改指南：
#    - 如果要改 Cookie 名称或安全策略，优先修改 Settings 中的 AUTH_COOKIE_* 配置。
# ========================================================
def set_auth_cookie(response: Response, *, token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        key=settings.auth_cookie_name,
        value=token,
        max_age=settings.access_token_expire_minutes * 60,
        path="/",
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite=settings.auth_cookie_samesite,
    )


# ======================== 代码解释 ========================
# 1. 整体功能：
#    清理认证 Cookie，用于服务端登出接口。
#
# 2. 关键部分拆解：
#    - delete_cookie：让浏览器删除同名 Cookie。
#    - samesite/secure：必须和写入时保持一致，避免部分浏览器无法匹配删除。
#
# 3. 重要概念与库：
#    - Cookie 失效：通过 Max-Age=0 或过期时间通知浏览器移除会话。
#
# 4. 潜在问题与改进建议：
#    - 当前 JWT 无服务端黑名单；登出后旧 Bearer token 在过期前仍可被脚本使用。
#
# 5. 修改指南：
#    - 如果以后加入 refresh token 或 token blacklist，应在本函数之外增加撤销逻辑。
# ========================================================
def clear_auth_cookie(response: Response) -> None:
    settings = get_settings()
    response.delete_cookie(
        key=settings.auth_cookie_name,
        path="/",
        secure=settings.auth_cookie_secure,
        samesite=settings.auth_cookie_samesite,
    )


def build_auth_response(user: User) -> AuthResponse:
    settings = get_settings()
    token = create_access_token(
        subject=str(user.id),
        secret_key=settings.secret_key,
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
    )
    return AuthResponse(access_token=token, token_type="bearer", user=to_user_read(user))


# ======================== 代码解释 ========================
# 1. 整体功能：
#    注册新用户并直接返回登录令牌。
#
# 2. 关键部分拆解：
#    - email 规范化：统一转小写并去掉首尾空白。
#    - 唯一性检查：避免重复邮箱注册。
#    - hash_password：保存安全密码哈希。
#
# 3. 重要概念与库：
#    - SQLAlchemy select：查询邮箱是否已存在。
#    - HTTP 409：表示资源冲突，即邮箱已注册。
#
# 4. 潜在问题与改进建议：
#    - 当前没有邮件验证；生产环境应增加验证流程。
#
# 5. 修改指南：
#    - 如果要增加注册字段，建议同步 RegisterRequest、User 模型和本函数。
# ========================================================
@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(
    payload: RegisterRequest,
    session: SessionDep,
    response: Response,
) -> AuthResponse:
    email = payload.email.strip().lower()
    existing_user = await session.execute(select(User).where(func.lower(User.email) == email))
    if existing_user.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered",
        )

    user = User(email=email, password_hash=hash_password(payload.password))
    session.add(user)
    await session.commit()
    await session.refresh(user)
    auth_response = build_auth_response(user)
    set_auth_cookie(response, token=auth_response.access_token)
    return auth_response


# ======================== 代码解释 ========================
# 1. 整体功能：
#    校验邮箱和密码并返回访问令牌。
#
# 2. 关键部分拆解：
#    - 用户查询：按邮箱查找账号。
#    - verify_password：校验输入密码是否匹配哈希。
#    - build_auth_response：生成标准认证响应。
#
# 3. 重要概念与库：
#    - HTTP 401：认证失败时返回未授权状态。
#
# 4. 潜在问题与改进建议：
#    - 当前错误信息不区分邮箱和密码，避免泄露账号是否存在。
#
# 5. 修改指南：
#    - 如果要加入登录限流，建议在本函数校验失败处接入计数逻辑。
# ========================================================
@router.post("/login", response_model=AuthResponse)
async def login(
    payload: LoginRequest,
    session: SessionDep,
    response: Response,
) -> AuthResponse:
    email = payload.email.strip().lower()
    result = await session.execute(select(User).where(func.lower(User.email) == email))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    auth_response = build_auth_response(user)
    set_auth_cookie(response, token=auth_response.access_token)
    return auth_response


# ======================== 代码解释 ========================
# 1. 整体功能：
#    清理浏览器中的 httpOnly 认证 Cookie，实现前端登出。
#
# 2. 关键部分拆解：
#    - Response：写入删除 Cookie 的响应头。
#    - status ok：前端只需要知道 Cookie 已被要求清理。
#
# 3. 重要概念与库：
#    - 无状态 JWT：服务端不保存 session，因此登出动作主要发生在浏览器 Cookie 层。
#
# 4. 潜在问题与改进建议：
#    - 如果引入 refresh token，应在这里同步撤销 refresh token。
#
# 5. 修改指南：
#    - 如果前端需要登出后重定向，建议在前端完成路由跳转，不放在 API 中。
# ========================================================
@router.post("/logout")
async def logout(response: Response) -> dict[str, str]:
    clear_auth_cookie(response)
    return {"status": "ok"}


# ======================== 代码解释 ========================
# 1. 整体功能：
#    返回当前 Bearer token 对应的用户信息。
#
# 2. 关键部分拆解：
#    - CurrentUserDep：复用认证依赖解析当前用户。
#    - to_user_read：隐藏密码哈希字段。
#
# 3. 重要概念与库：
#    - 受保护接口：只有携带有效 token 的请求才能访问。
#
# 4. 潜在问题与改进建议：
#    - 当前只返回基础身份信息；后续可返回用户偏好或权限。
#
# 5. 修改指南：
#    - 如果要扩展个人资料页，建议先扩展该接口响应。
# ========================================================
@router.get("/me", response_model=UserRead)
async def me(current_user: CurrentUserDep) -> UserRead:
    return to_user_read(current_user)
