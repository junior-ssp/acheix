$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$logDir = Join-Path $root "logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$intervalMinutes = 30
if ($env:FIPE_LOOP_INTERVAL_MINUTES) {
  $intervalMinutes = [int]$env:FIPE_LOOP_INTERVAL_MINUTES
}
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$loopLog = Join-Path $logDir "fipe-loop-$stamp.log"

Set-Location $root

"Loop FIPE iniciado em $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') com intervalo de $intervalMinutes minutos." | Tee-Object -FilePath $loopLog -Append

while ($true) {
  $startedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  "[$startedAt] INICIO: npm run fipe:import:overnight" | Tee-Object -FilePath $loopLog -Append

  try {
    npm.cmd run fipe:import:overnight 2>&1 | Tee-Object -FilePath $loopLog -Append
    $finishedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "[$finishedAt] FIM: npm run fipe:import:overnight" | Tee-Object -FilePath $loopLog -Append
  } catch {
    $failedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "[$failedAt] ERRO: $($_.Exception.Message)" | Tee-Object -FilePath $loopLog -Append
  }

  $nextRun = (Get-Date).AddMinutes($intervalMinutes).ToString("yyyy-MM-dd HH:mm:ss")
  "Proxima execucao prevista: $nextRun" | Tee-Object -FilePath $loopLog -Append
  Start-Sleep -Seconds ($intervalMinutes * 60)
}
