param(
    [string]$SshTarget = "",
    [string]$Domain = ""
)

# ======================== 代码解释 ========================
# 1. 整体功能：
#    检查 VPS 部署 AILib 前的基础条件，包括 SSH、Docker Compose、域名端口和 HTTPS。
#
# 2. 关键部分拆解：
#    - SshTarget：可选的 SSH 目标，例如 root@1.2.3.4，用于远程检查 Docker。
#    - Domain：可选域名，例如 kb.example.com，用于检查 DNS、80 和 443。
#    - Test-NetConnection：在本机检查远程端口是否可达。
#
# 3. 重要概念与库：
#    - Docker Compose plugin：生产部署依赖 `docker compose`，不是旧版 `docker-compose`。
#    - DNS A 记录：Caddy 签发 HTTPS 前必须能从公网解析到服务器。
#
# 4. 潜在问题与改进建议：
#    - 本脚本只做部署前检查，不会修改服务器配置。
#
# 5. 修改指南：
#    - 如果部署到非 Linux 主机，调整 SSH 检查命令即可。
# ========================================================
$ErrorActionPreference = "Continue"

if ($SshTarget) {
    Write-Host "Checking remote Docker on $SshTarget ..."
    ssh $SshTarget "uname -a && docker --version && docker compose version"
}

if ($Domain) {
    Write-Host "Checking DNS for $Domain ..."
    Resolve-DnsName $Domain -ErrorAction Continue | Format-Table -AutoSize

    Write-Host "Checking ports for $Domain ..."
    Test-NetConnection -ComputerName $Domain -Port 80 | Select-Object ComputerName,RemotePort,TcpTestSucceeded
    Test-NetConnection -ComputerName $Domain -Port 443 | Select-Object ComputerName,RemotePort,TcpTestSucceeded

    Write-Host "Checking HTTPS response ..."
    try {
        Invoke-WebRequest -Uri "https://$Domain" -UseBasicParsing -TimeoutSec 10 |
            Select-Object StatusCode, StatusDescription
    } catch {
        Write-Host "HTTPS check failed: $($_.Exception.Message)"
    }
}

if (-not $SshTarget -and -not $Domain) {
    Write-Host "Usage examples:"
    Write-Host "  powershell -File scripts/deploy/check-server.ps1 -SshTarget root@1.2.3.4"
    Write-Host "  powershell -File scripts/deploy/check-server.ps1 -Domain kb.example.com"
}
