# ======================== 代码解释 ========================
# 1. 整体功能：
#    为 AILib 私有 Docker 部署脚本提供共享函数，统一处理环境文件、Docker Compose 参数、健康检查和访问地址。
#
# 2. 关键部分拆解：
#    - Ensure-AILibPrivateEnv：创建 .env.private，并自动生成 SECRET_KEY、PostgreSQL 密码和可复用的 DeepSeek Key。
#    - Get-AILibPrivateComposeArgs：集中生成 docker compose 参数，避免 Start/Status/Stop 脚本不一致。
#    - Wait-AILibPrivateHealth：轮询 Caddy 网关的 /api/health，确认 Web 到 API 再到数据库的链路可用。
#    - Show-AILibPrivateAccessHints：输出本机、局域网和 Tailscale 访问地址。
#
# 3. 重要概念与库：
#    - PowerShell dot source：多个脚本通过加载本文件复用函数。
#    - Docker Compose project name：由 compose 文件中的 name 固定为 ailib-private，避免和其它环境混淆。
#    - Tailscale IP：只在本机安装 tailscale 命令时展示，不作为强依赖。
#
# 4. 潜在问题与改进建议：
#    - 自动导入 DeepSeek Key 只读取现有 .env 和 apps/api/.env，不会联网验证密钥是否有效。
#    - PRIVATE_BIND_HOST=0.0.0.0 会开放给局域网，脚本只提醒风险，不替用户修改防火墙策略。
#
# 5. 修改指南：
#    - 新增私有部署脚本时优先复用 Get-AILibPrivateRoot、Read-AILibPrivateDotEnv 和 Invoke-AILibPrivateCompose。
# ========================================================
$script:AILibPrivateRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$script:AILibPrivateEnvPath = Join-Path $script:AILibPrivateRoot ".env.private"
$script:AILibPrivateTemplatePath = Join-Path $script:AILibPrivateRoot "deploy\private\env.private.example"
$script:AILibPrivateComposePath = Join-Path $script:AILibPrivateRoot "deploy\private\docker-compose.private.yml"

function Get-AILibPrivateRoot {
    return $script:AILibPrivateRoot
}

function Get-AILibPrivateEnvPath {
    return $script:AILibPrivateEnvPath
}

function Read-AILibPrivateDotEnv {
    param([string]$Path)

    $values = [ordered]@{}
    if (-not (Test-Path $Path)) {
        return $values
    }

    Get-Content -Path $Path -Encoding UTF8 | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#") -or $line -notmatch "^[A-Za-z_][A-Za-z0-9_]*=") {
            return
        }
        $key, $value = $line -split "=", 2
        $values[$key.Trim()] = $value.Trim()
    }
    return $values
}

function Set-AILibPrivateDotEnvValue {
    param(
        [string]$Path,
        [string]$Key,
        [string]$Value
    )

    $escapedValue = $Value -replace "\\", "\\"
    $lines = @()
    if (Test-Path $Path) {
        $lines = @(Get-Content -Path $Path -Encoding UTF8)
    }

    $found = $false
    $newLines = foreach ($line in $lines) {
        if ($line -match "^$([regex]::Escape($Key))=") {
            $found = $true
            "$Key=$escapedValue"
        } else {
            $line
        }
    }

    if (-not $found) {
        $newLines += "$Key=$escapedValue"
    }

    Set-Content -Path $Path -Value $newLines -Encoding UTF8
}

function New-AILibPrivateSecret {
    param([int]$ByteCount = 48)

    $bytes = [byte[]]::new($ByteCount)
    $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $generator.GetBytes($bytes)
        return [Convert]::ToBase64String($bytes)
    } finally {
        $generator.Dispose()
    }
}

function Get-AILibPrivateExistingDeepSeekKey {
    $candidatePaths = @(
        (Join-Path $script:AILibPrivateRoot ".env"),
        (Join-Path $script:AILibPrivateRoot "apps\api\.env")
    )

    foreach ($path in $candidatePaths) {
        $values = Read-AILibPrivateDotEnv -Path $path
        if ($values.Contains("DEEPSEEK_API_KEY") -and -not [string]::IsNullOrWhiteSpace($values["DEEPSEEK_API_KEY"])) {
            return $values["DEEPSEEK_API_KEY"]
        }
    }
    return ""
}

function Ensure-AILibPrivateEnv {
    param([switch]$ExposePrivateNetwork)

    $created = $false
    if (-not (Test-Path $script:AILibPrivateEnvPath)) {
        Copy-Item -Path $script:AILibPrivateTemplatePath -Destination $script:AILibPrivateEnvPath
        $created = $true
        Write-Host "Created .env.private from deploy/private/env.private.example"
    }

    $values = Read-AILibPrivateDotEnv -Path $script:AILibPrivateEnvPath

    if ($created -or -not $values.Contains("SECRET_KEY") -or $values["SECRET_KEY"] -like "change-this*") {
        Set-AILibPrivateDotEnvValue -Path $script:AILibPrivateEnvPath -Key "SECRET_KEY" -Value (New-AILibPrivateSecret)
    }

    if ($created -or -not $values.Contains("POSTGRES_PASSWORD") -or $values["POSTGRES_PASSWORD"] -like "change-this*") {
        Set-AILibPrivateDotEnvValue -Path $script:AILibPrivateEnvPath -Key "POSTGRES_PASSWORD" -Value (New-AILibPrivateSecret -ByteCount 24)
    }

    $values = Read-AILibPrivateDotEnv -Path $script:AILibPrivateEnvPath
    if ((-not $values.Contains("DEEPSEEK_API_KEY") -or [string]::IsNullOrWhiteSpace($values["DEEPSEEK_API_KEY"]))) {
        $existingKey = Get-AILibPrivateExistingDeepSeekKey
        if ($existingKey) {
            Set-AILibPrivateDotEnvValue -Path $script:AILibPrivateEnvPath -Key "DEEPSEEK_API_KEY" -Value $existingKey
            Write-Host "Imported DEEPSEEK_API_KEY from an existing local env file without printing it."
        }
    }

    if ($ExposePrivateNetwork) {
        Set-AILibPrivateDotEnvValue -Path $script:AILibPrivateEnvPath -Key "PRIVATE_BIND_HOST" -Value "0.0.0.0"
    }
}

function Get-AILibPrivateComposeArgs {
    return @(
        "compose",
        "--env-file", $script:AILibPrivateEnvPath,
        "--project-directory", $script:AILibPrivateRoot,
        "-f", $script:AILibPrivateComposePath
    )
}

function Invoke-AILibPrivateCompose {
    param([string[]]$ComposeCommand)

    $args = (Get-AILibPrivateComposeArgs) + $ComposeCommand
    & docker @args
}

function Test-AILibPrivateDocker {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        throw "Docker CLI is not installed or not in PATH."
    }

    & docker version --format "{{.Server.Version}}" | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Docker Desktop is not running or the Docker daemon is unavailable."
    }
}

function Get-AILibPrivateWebPort {
    $values = Read-AILibPrivateDotEnv -Path $script:AILibPrivateEnvPath
    if ($values.Contains("WEB_PORT") -and $values["WEB_PORT"] -match "^\d+$") {
        return [int]$values["WEB_PORT"]
    }
    return 3000
}

function Get-AILibPrivateBindHost {
    $values = Read-AILibPrivateDotEnv -Path $script:AILibPrivateEnvPath
    if ($values.Contains("PRIVATE_BIND_HOST") -and $values["PRIVATE_BIND_HOST"]) {
        return $values["PRIVATE_BIND_HOST"]
    }
    return "127.0.0.1"
}

function Get-AILibPrivateHealthUrl {
    $port = Get-AILibPrivateWebPort
    return "http://127.0.0.1:$port/api/health"
}

function Wait-AILibPrivateHealth {
    param([int]$TimeoutSeconds = 120)

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    $healthUrl = Get-AILibPrivateHealthUrl
    do {
        try {
            $health = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 5
            return $health
        } catch {
            Start-Sleep -Seconds 3
        }
    } while ((Get-Date) -lt $deadline)

    throw "AILib private deployment did not become healthy at $healthUrl within $TimeoutSeconds seconds."
}

function Get-AILibPrivateTailscaleIps {
    if (-not (Get-Command tailscale -ErrorAction SilentlyContinue)) {
        return @()
    }

    $output = & tailscale ip -4 2>$null
    if ($LASTEXITCODE -ne 0 -or -not $output) {
        return @()
    }
    return @($output | Where-Object { $_ -match "^\d+\.\d+\.\d+\.\d+$" })
}

function Get-AILibPrivateLanIps {
    try {
        return @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
            Where-Object {
                $_.IPAddress -notlike "127.*" -and
                $_.IPAddress -notlike "169.254.*" -and
                $_.PrefixOrigin -ne "WellKnown"
            } |
            Select-Object -ExpandProperty IPAddress -Unique)
    } catch {
        return @()
    }
}

function Show-AILibPrivateAccessHints {
    $port = Get-AILibPrivateWebPort
    $bindHost = Get-AILibPrivateBindHost

    Write-Host ""
    Write-Host "AILib private access:"
    Write-Host "  Local:     http://127.0.0.1:$port"

    if ($bindHost -eq "0.0.0.0") {
        foreach ($ip in Get-AILibPrivateTailscaleIps) {
            Write-Host "  Tailscale: http://$ip`:$port"
        }
        foreach ($ip in Get-AILibPrivateLanIps) {
            Write-Host "  LAN:       http://$ip`:$port"
        }
        Write-Host "  Note: PRIVATE_BIND_HOST=0.0.0.0 exposes the Web port beyond localhost."
    } else {
        Write-Host "  Private network: disabled. Re-run Start-AILibPrivate.ps1 -ExposePrivateNetwork to allow Tailscale/LAN devices."
    }
}
