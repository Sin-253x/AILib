param(
    [switch]$OpenBrowser,
    [switch]$SkipMigrations,
    [switch]$SkipPostgres
)

# ======================== 代码解释 ========================
# 1. 整体功能：
#    在 Windows 本机启动 AILib 自用部署所需的 PostgreSQL、FastAPI API 和 Next.js Web。
#
# 2. 关键部分拆解：
#    - Read-DotEnv：读取 apps/api/.env，并让文件值覆盖当前 PowerShell 环境变量。
#    - Start-ManagedProcess：把 API/Web 作为后台进程启动，并记录 PID 到 .runtime/pids。
#    - PostgreSQL 检查：优先使用 .runtime/postgresql-17 里的免安装 PostgreSQL。
#    - Alembic 迁移：启动 API 前执行 upgrade head，保证表和 pgvector 索引存在。
#
# 3. 重要概念与库：
#    - httpOnly Cookie：本地前端和 API 都使用 127.0.0.1，避免 localhost/127.0.0.1 Cookie 域混用。
#    - 进程环境覆盖：Pydantic Settings 默认系统环境变量优先，本脚本显式用 .env 覆盖运行时环境。
#
# 4. 潜在问题与改进建议：
#    - 如果 .runtime/postgresql-17 不存在，需要先按 docs/LOCAL_DEPLOYMENT.md 准备 PostgreSQL + pgvector。
#    - 如果 3000/8000 端口被非本脚本进程占用，本脚本不会强制关闭，避免误杀用户进程。
#
# 5. 修改指南：
#    - 如果要改端口，优先修改 apps/api/.env 和根目录 .env，再同步本脚本里的默认 URL。
# ========================================================
$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$RuntimeDir = Join-Path $Root ".runtime"
$PidDir = Join-Path $RuntimeDir "pids"
$LogDir = Join-Path $Root ".logs"
$ApiEnvPath = Join-Path $Root "apps\api\.env"
$ApiPython = Join-Path $Root "apps\api\.venv\Scripts\python.exe"
$PgRoot = Join-Path $RuntimeDir "postgresql-17"
$PgData = Join-Path $RuntimeDir "pgdata"

New-Item -ItemType Directory -Force -Path $RuntimeDir, $PidDir, $LogDir | Out-Null

function Read-DotEnv {
    param([string]$Path)

    $values = @{}
    if (-not (Test-Path $Path)) {
        return $values
    }

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

function Test-PortOpen {
    param([int]$Port)

    return (Test-NetConnection -ComputerName "127.0.0.1" -Port $Port -InformationLevel Quiet)
}

function Start-ManagedProcess {
    param(
        [string]$Name,
        [string]$FilePath,
        [string[]]$ArgumentList,
        [string]$WorkingDirectory,
        [string]$PidPath,
        [string]$OutLog,
        [string]$ErrLog
    )

    if (Test-Path $PidPath) {
        $existingPid = [int](Get-Content $PidPath)
        $existing = Get-Process -Id $existingPid -ErrorAction SilentlyContinue
        if ($existing) {
            Write-Host "$Name already running with PID $existingPid"
            return
        }
        Remove-Item $PidPath -Force
    }

    $process = Start-Process `
        -FilePath $FilePath `
        -ArgumentList $ArgumentList `
        -WorkingDirectory $WorkingDirectory `
        -RedirectStandardOutput $OutLog `
        -RedirectStandardError $ErrLog `
        -WindowStyle Hidden `
        -PassThru
    Set-Content -Path $PidPath -Value $process.Id -Encoding ASCII
    Write-Host "Started $Name with PID $($process.Id)"
}

$apiEnv = Read-DotEnv $ApiEnvPath
foreach ($key in $apiEnv.Keys) {
    [Environment]::SetEnvironmentVariable($key, $apiEnv[$key], "Process")
}

[Environment]::SetEnvironmentVariable("NEXT_PUBLIC_API_BASE_URL", "http://127.0.0.1:8000", "Process")

if (-not $SkipPostgres) {
    $pgCtl = Join-Path $PgRoot "bin\pg_ctl.exe"
    if (-not (Test-Path $pgCtl) -or -not (Test-Path $PgData)) {
        throw "Local PostgreSQL runtime is missing. See docs/LOCAL_DEPLOYMENT.md to prepare .runtime/postgresql-17 and .runtime/pgdata."
    }

    if (-not (Test-PortOpen 5432)) {
        & $pgCtl -D $PgData -l (Join-Path $RuntimeDir "postgres.log") -o "-h 127.0.0.1 -p 5432" start
        Start-Sleep -Seconds 3
    }
}

if (-not (Test-PortOpen 5432)) {
    throw "PostgreSQL is not reachable on 127.0.0.1:5432."
}

if (-not (Test-Path $ApiPython)) {
    throw "API virtualenv is missing at apps/api/.venv. Create it and run pip install -e `"apps/api[dev]`" first."
}

if (-not $SkipMigrations) {
    & $ApiPython -m alembic -c (Join-Path $Root "apps\api\alembic.ini") upgrade head
}

if (-not (Test-PortOpen 8000)) {
    Start-ManagedProcess `
        -Name "AILib API" `
        -FilePath $ApiPython `
        -ArgumentList @("-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000") `
        -WorkingDirectory (Join-Path $Root "apps\api") `
        -PidPath (Join-Path $PidDir "api.pid") `
        -OutLog (Join-Path $LogDir "api.out.log") `
        -ErrLog (Join-Path $LogDir "api.err.log")
} else {
    Write-Host "AILib API port 8000 is already in use; leaving it unchanged."
}

if (-not (Test-PortOpen 3000)) {
    Start-ManagedProcess `
        -Name "AILib Web" `
        -FilePath "npm.cmd" `
        -ArgumentList @("run", "dev", "--workspace", "@ailib/web", "--", "--hostname", "127.0.0.1") `
        -WorkingDirectory $Root `
        -PidPath (Join-Path $PidDir "web.pid") `
        -OutLog (Join-Path $LogDir "web.out.log") `
        -ErrLog (Join-Path $LogDir "web.err.log")
} else {
    Write-Host "AILib Web port 3000 is already in use; leaving it unchanged."
}

Start-Sleep -Seconds 2
Write-Host ""
Write-Host "AILib local deployment status:"
Write-Host "  Web: http://127.0.0.1:3000"
Write-Host "  API: http://127.0.0.1:8000"
Write-Host "  PostgreSQL: 127.0.0.1:5432"

if ($OpenBrowser) {
    Start-Process "http://127.0.0.1:3000"
}
