param(
    [switch]$KeepPostgres
)

# ======================== 代码解释 ========================
# 1. 整体功能：
#    停止由 Start-AILibLocal.ps1 启动的 AILib API、Web 和可选 PostgreSQL。
#
# 2. 关键部分拆解：
#    - Stop-ManagedProcess：只根据 .runtime/pids 中记录的 PID 停止进程。
#    - KeepPostgres：允许只停 API/Web，保留数据库继续运行。
#    - pg_ctl stop：优雅关闭本地免安装 PostgreSQL 数据库。
#
# 3. 重要概念与库：
#    - PID 文件：避免根据端口粗暴杀进程，降低误停其它服务的风险。
#    - pg_ctl：PostgreSQL 官方进程控制工具。
#
# 4. 潜在问题与改进建议：
#    - 如果用户手动启动了其它进程占用端口，本脚本不会处理，需要用户自行关闭。
#
# 5. 修改指南：
#    - 如果新增后台服务，建议新增对应 PID 文件并复用 Stop-ManagedProcess。
# ========================================================
$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$RuntimeDir = Join-Path $Root ".runtime"
$PidDir = Join-Path $RuntimeDir "pids"
$PgCtl = Join-Path $RuntimeDir "postgresql-17\bin\pg_ctl.exe"
$PgData = Join-Path $RuntimeDir "pgdata"

function Stop-ManagedProcess {
    param(
        [string]$Name,
        [string]$PidPath
    )

    if (-not (Test-Path $PidPath)) {
        Write-Host "$Name PID file not found; skipping."
        return
    }

    $pidValue = [int](Get-Content $PidPath)
    $process = Get-Process -Id $pidValue -ErrorAction SilentlyContinue
    if ($process) {
        Stop-Process -Id $pidValue -Force
        Write-Host "Stopped $Name with PID $pidValue"
    } else {
        Write-Host "$Name PID $pidValue is not running."
    }
    Remove-Item $PidPath -Force
}

Stop-ManagedProcess -Name "AILib Web" -PidPath (Join-Path $PidDir "web.pid")
Stop-ManagedProcess -Name "AILib API" -PidPath (Join-Path $PidDir "api.pid")

if (-not $KeepPostgres -and (Test-Path $PgCtl) -and (Test-Path $PgData)) {
    & $PgCtl -D $PgData stop -m fast
    Write-Host "Stopped AILib PostgreSQL runtime."
}
