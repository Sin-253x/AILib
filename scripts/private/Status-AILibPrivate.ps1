# ======================== 代码解释 ========================
# 1. 整体功能：
#    查看 AILib 私有 Docker 部署的容器状态、健康检查结果和可访问地址。
#
# 2. 关键部分拆解：
#    - docker compose ps：展示 gateway/web/api/postgres 四个容器的运行状态。
#    - /api/health：从浏览器同源入口检查 API、数据库和 RAG provider 状态。
#    - Show-AILibPrivateAccessHints：根据 PRIVATE_BIND_HOST 输出本机或私网访问地址。
#
# 3. 重要概念与库：
#    - 网关健康检查：比直接访问 API 更接近真实浏览器路径。
#    - Docker Compose 状态：用于判断容器是否启动、重启或退出。
#
# 4. 潜在问题与改进建议：
#    - 如果 gateway 未启动，/api/health 会失败，但 API 容器可能仍在运行，需要结合 compose ps 一起看。
#
# 5. 修改指南：
#    - 如需查看日志，可在本脚本中追加 docker compose logs --tail 100 api web gateway。
# ========================================================
$ErrorActionPreference = "Continue"

. (Join-Path $PSScriptRoot "AILibPrivate.Common.ps1")

if (-not (Test-Path (Get-AILibPrivateEnvPath))) {
    Write-Host ".env.private does not exist. Run scripts/private/Start-AILibPrivate.ps1 first."
    exit 1
}

Test-AILibPrivateDocker

Write-Host "Containers:"
Invoke-AILibPrivateCompose -ComposeCommand @("ps")

Write-Host ""
Write-Host "Health through gateway:"
try {
    Invoke-RestMethod -Uri (Get-AILibPrivateHealthUrl) -TimeoutSec 5 | ConvertTo-Json
} catch {
    Write-Host "Health unavailable: $($_.Exception.Message)"
}

Show-AILibPrivateAccessHints
