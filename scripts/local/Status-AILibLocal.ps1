# ======================== 代码解释 ========================
# 1. 整体功能：
#    查看 AILib 本地部署的端口、健康检查和后台 PID 状态。
#
# 2. 关键部分拆解：
#    - Test-Port：检查 3000、8000、5432 是否可连接。
#    - /health：读取 FastAPI 对数据库的健康检查结果。
#    - PID 文件：展示脚本托管的 API/Web 进程是否仍在运行。
#
# 3. 重要概念与库：
#    - 健康检查：API online 不等于数据库可用，必须看 /health 的 database 字段。
#    - Test-NetConnection：Windows PowerShell 原生端口检测工具。
#
# 4. 潜在问题与改进建议：
#    - 如果 API 端口被其它服务占用，端口会显示 open，但 /health 可能失败。
#
# 5. 修改指南：
#    - 如果端口变化，修改本脚本中的端口列表和健康检查 URL。
# ========================================================
$ErrorActionPreference = "Continue"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$PidDir = Join-Path $Root ".runtime\pids"

function Test-Port {
    param([int]$Port)

    $open = Test-NetConnection -ComputerName "127.0.0.1" -Port $Port -InformationLevel Quiet
    [pscustomobject]@{
        Port = $Port
        Open = $open
    }
}

function Get-PidStatus {
    param(
        [string]$Name,
        [string]$PidPath
    )

    if (-not (Test-Path $PidPath)) {
        return [pscustomobject]@{ Name = $Name; Pid = ""; Running = $false }
    }

    $pidValue = [int](Get-Content $PidPath)
    $running = [bool](Get-Process -Id $pidValue -ErrorAction SilentlyContinue)
    [pscustomobject]@{ Name = $Name; Pid = $pidValue; Running = $running }
}

Write-Host "Ports:"
@(3000, 8000, 5432) | ForEach-Object { Test-Port $_ } | Format-Table -AutoSize

Write-Host "Managed processes:"
@(
    Get-PidStatus -Name "AILib Web" -PidPath (Join-Path $PidDir "web.pid")
    Get-PidStatus -Name "AILib API" -PidPath (Join-Path $PidDir "api.pid")
) | Format-Table -AutoSize

Write-Host "API health:"
try {
    Invoke-RestMethod -Uri "http://127.0.0.1:8000/health" -TimeoutSec 5 | ConvertTo-Json
} catch {
    Write-Host "API health unavailable: $($_.Exception.Message)"
}
