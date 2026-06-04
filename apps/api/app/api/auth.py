from datetime import timedelta

from fastapi import APIRouter, HTTPException, status
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
async def register(payload: RegisterRequest, session: SessionDep) -> AuthResponse:
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
    return build_auth_response(user)


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
async def login(payload: LoginRequest, session: SessionDep) -> AuthResponse:
    email = payload.email.strip().lower()
    result = await session.execute(select(User).where(func.lower(User.email) == email))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    return build_auth_response(user)


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
