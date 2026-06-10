param(
    [string]$ComposeFile = "deploy/docker-compose.prod.yml",
    [string]$EnvFile = "deploy/.env.prod",
    [string]$OutputDir = "backups"
)

# ======================== 代码解释 ========================
# 1. 整体功能：
#    从生产 Docker Compose 的 postgres 容器导出 AILib 数据库备份。
#
# 2. 关键部分拆解：
#    - .env.prod：读取 POSTGRES_USER 和 POSTGRES_DB，避免命令里硬编码。
#    - docker compose exec -T：在 postgres 容器内执行 pg_dump，并把 SQL 输出到宿主机。
#    - 时间戳文件名：每次备份生成独立 SQL 文件，便于回滚。
#
# 3. 重要概念与库：
#    - pg_dump：PostgreSQL 官方逻辑备份工具。
#    - Docker volume：数据库真实数据在 volume 中，备份文件用于迁移和灾备。
#
# 4. 潜在问题与改进建议：
#    - 备份文件可能包含敏感业务数据，应限制访问权限并定期转存到安全位置。
#
# 5. 修改指南：
#    - 如果 compose 项目名或 postgres 服务名变化，需要同步修改 exec 的服务名。
# ========================================================
$ErrorActionPreference = "Stop"

function Read-DotEnv {
    param([string]$Path)

    $values = @{}
    Get-Content $Path | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#") -or $line -notmatch "^[^=]+=") {
            return
        }
        $key, $value = $line -split "=", 2
        $values[$key.Trim()] = $value.Trim()
    }
    return $values
}

if (-not (Test-Path $EnvFile)) {
    throw "Missing env file: $EnvFile"
}

$envValues = Read-DotEnv $EnvFile
$postgresUser = $envValues["POSTGRES_USER"]
$postgresDb = $envValues["POSTGRES_DB"]

if (-not $postgresUser -or -not $postgresDb) {
    throw "POSTGRES_USER and POSTGRES_DB must be set in $EnvFile"
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outputPath = Join-Path $OutputDir "ailib-$timestamp.sql"

docker compose --env-file $EnvFile -f $ComposeFile exec -T postgres pg_dump -U $postgresUser $postgresDb |
    Set-Content -Path $outputPath -Encoding UTF8

Write-Host "Database backup written to $outputPath"
