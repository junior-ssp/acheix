$ErrorActionPreference = "Continue"

$root = Split-Path -Parent $PSScriptRoot
$logDir = Join-Path $root "logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$intervalMinutes = 30
if ($env:ACHEIX_MONITOR_INTERVAL_MINUTES) {
  $intervalMinutes = [int]$env:ACHEIX_MONITOR_INTERVAL_MINUTES
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logFile = Join-Path $logDir "acheix-site-monitor-$stamp.log"
$urls = @("https://acheix.com.br", "https://www.acheix.com.br")

function Test-Site {
  param(
    [Parameter(Mandatory = $true)]
    [string] $Url
  )

  $checkedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 20
    "[$checkedAt] OK $Url HTTP $($response.StatusCode) $($response.StatusDescription)" | Tee-Object -FilePath $logFile -Append
  } catch {
    "[$checkedAt] ERRO $Url $($_.Exception.Message)" | Tee-Object -FilePath $logFile -Append
  }
}

"Monitor AcheiX iniciado em $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') com intervalo de $intervalMinutes minutos." | Tee-Object -FilePath $logFile -Append

while ($true) {
  foreach ($url in $urls) {
    Test-Site -Url $url
  }

  $nextRun = (Get-Date).AddMinutes($intervalMinutes).ToString("yyyy-MM-dd HH:mm:ss")
  "Proxima checagem prevista: $nextRun" | Tee-Object -FilePath $logFile -Append
  Start-Sleep -Seconds ($intervalMinutes * 60)
}
