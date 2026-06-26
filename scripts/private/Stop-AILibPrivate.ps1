param(
    [switch]$DeleteData
)

# ======================== 代码解释 ========================
# 1. 整体功能：
#    停止 AILib 私有 Docker 部署，默认保留 PostgreSQL 数据卷。
#
# 2. 关键部分拆解：
#    - docker compose down：停止并移除私有部署容器和网络。
#    - DeleteData：显式传入后才删除 private-postgres-data 数据卷。
#
# 3. 重要概念与库：
#    - Docker volume：PostgreSQL 数据保存在 volume 中，容器删除后仍可保留。
#    - 显式数据删除：避免误删个人知识库文档和向量索引。
#
# 4. 潜在问题与改进建议：
#    - DeleteData 会清空本地知识库，执行前应先确认已经备份。
#
# 5. 修改指南：
#    - 如需增加备份流程，应在 DeleteData 前调用 pg_dump 或 docker compose exec postgres。
# ========================================================
$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "AILibPrivate.Common.ps1")

if (-not (Test-Path (Get-AILibPrivateEnvPath))) {
    Write-Host ".env.private does not exist; nothing to stop."
    exit 0
}

Test-AILibPrivateDocker

$downArgs = @("down")
if ($DeleteData) {
    $downArgs += "-v"
}

Invoke-AILibPrivateCompose -ComposeCommand $downArgs

if ($DeleteData) {
    Write-Host "Stopped AILib private deployment and deleted Docker volumes."
} else {
    Write-Host "Stopped AILib private deployment. PostgreSQL data volume is preserved."
}
