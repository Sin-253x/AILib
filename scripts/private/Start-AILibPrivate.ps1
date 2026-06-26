param(
    [switch]$OpenBrowser,
    [switch]$ExposePrivateNetwork,
    [switch]$NoBuild,
    [switch]$DryRun
)

# ======================== 代码解释 ========================
# 1. 整体功能：
#    一键启动 AILib 私有 Docker 部署，并在启动后验证 /api/health 是否可用。
#
# 2. 关键部分拆解：
#    - Ensure-AILibPrivateEnv：自动生成不提交 Git 的 .env.private。
#    - Test-AILibPrivateDocker：确认 Docker CLI 和 Docker daemon 可用。
#    - Invoke-AILibPrivateCompose：执行 docker compose up，默认会重新构建镜像。
#    - Wait-AILibPrivateHealth：确认 Caddy、Web、API、PostgreSQL 串起来后再输出访问地址。
#
# 3. 重要概念与库：
#    - Docker Compose：用一个命令编排四个容器。
#    - Caddy 网关：让浏览器始终走同源 /api，不直接暴露后端地址。
#    - Tailscale/ZeroTier：可选的私网访问层，本脚本只负责打开监听地址。
#
# 4. 潜在问题与改进建议：
#    - 首次构建镜像需要下载基础镜像和依赖，耗时取决于网络。
#    - 如果需要手机访问，必须使用 -ExposePrivateNetwork，并确认防火墙允许 3000 端口。
#
# 5. 修改指南：
#    - 如需增加自动备份或日志导出，建议在 Compose 启动后复用 Get-AILibPrivateComposeArgs 调用 docker compose exec。
# ========================================================
$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "AILibPrivate.Common.ps1")

Ensure-AILibPrivateEnv -ExposePrivateNetwork:$ExposePrivateNetwork

if ($DryRun) {
    $composeArgs = (Get-AILibPrivateComposeArgs) + @("up", "-d", "--build")
    Write-Host "Dry run only. The command would be:"
    Write-Host ("docker " + ($composeArgs -join " "))
    Show-AILibPrivateAccessHints
    exit 0
}

Test-AILibPrivateDocker

$upArgs = @("up", "-d")
if (-not $NoBuild) {
    $upArgs += "--build"
}

Invoke-AILibPrivateCompose -ComposeCommand $upArgs

$health = Wait-AILibPrivateHealth -TimeoutSeconds 180
Write-Host ""
Write-Host "Health:"
$health | ConvertTo-Json

Show-AILibPrivateAccessHints

if ($OpenBrowser) {
    Start-Process ("http://127.0.0.1:{0}" -f (Get-AILibPrivateWebPort))
}
