# חיבור מפתח Gemini (פרויקט tirgum-1 ב-AI Studio) לשרת kelim-tirgum.
# גילעד לוחץ "Create key" ואז על כפתור ההעתקה ליד המפתח. הסקריפט קולט אותו מהלוח, שומר אותו כסוד בשרת,
# ושומר עותק ב-~/.claude/secrets/kelim-tirgum-gemini.txt (לא בריפו). המפתח לא מודפס.
$ErrorActionPreference = 'Stop'
Write-Host ''
Write-Host 'מחכה שתעתיקו את המפתח החדש מ-AI Studio (כפתור ההעתקה ליד המפתח)...' -ForegroundColor Yellow
Set-Clipboard ' '
$key = $null
for ($i = 0; $i -lt 3600 -and -not $key; $i++) {
  $c = (Get-Clipboard -Raw); if ($c) { $c = $c.Trim() }
  if ($c -match '^(AIza[0-9A-Za-z_\-]{30,}|AQ\.[0-9A-Za-z_\-\.]{20,})$') { $key = $c } else { Start-Sleep 1 }
}
Set-Clipboard ' '
if (-not $key) { Write-Host 'לא הועתק מפתח תוך שעה.' -ForegroundColor Red; exit 1 }
$sec = "$env:USERPROFILE\.claude\secrets\kelim-tirgum-gemini.txt"
[IO.File]::WriteAllText($sec, $key)
Write-Host 'המפתח התקבל ונשמר. שומר אותו בשרת...' -ForegroundColor Green
Set-Location $PSScriptRoot
$env:NODE_OPTIONS = '--dns-result-order=ipv4first'
for ($t = 1; $t -le 4; $t++) {
  $key | npx wrangler secret put GEMINI_KEYS
  if ($LASTEXITCODE -eq 0) { Write-Host 'הסוד נשמר בשרת kelim-tirgum.' -ForegroundColor Green; exit 0 }
  Start-Sleep 10
}
Write-Host 'שמירת הסוד בשרת נכשלה. המפתח שמור בקובץ, אפשר להריץ שוב.' -ForegroundColor Red
exit 1
