# חיבור ערוץ הווטסאפ "החדשות ב-3 דקות" לשרת kelim-news דרך Whapi.Cloud (מסלול חינמי).
# גילעד מעתיק את ה-API Token מלוח הבקרה של Whapi (כפתור ההעתקה), והסקריפט קולט אותו מהלוח.
# המפתח לא נשמר בשום קובץ – רק כסוד בשרת (WHAPI_TOKEN). מזהה הערוץ נשמר דרך /config?waid=
$ErrorActionPreference = 'Stop'
$INVITE = '0029VbDZRl3JUM2XQTeLRv41'
$KEYLINE = (Get-Content "$env:USERPROFILE\.claude\secrets\kelim-news.txt" -TotalCount 1).Trim()
$ADMIN = ($KEYLINE -split '=')[-1]

Write-Host ''
Write-Host 'מחכה שתעתיקו את ה-API Token של Whapi (כפתור ההעתקה ליד המפתח)...' -ForegroundColor Yellow
Set-Clipboard ' '
$tok = $null
for ($i = 0; $i -lt 900 -and -not $tok; $i++) {
  $c = (Get-Clipboard -Raw); if ($c) { $c = $c.Trim() }
  if ($c -match '^[A-Za-z0-9_\-]{20,100}$') { $tok = $c } else { Start-Sleep 1 }
}
Set-Clipboard ' '
if (-not $tok) { Write-Host 'לא הועתק מפתח תוך 15 דקות.' -ForegroundColor Red; Read-Host 'Enter לסגירה'; exit 1 }
Write-Host 'המפתח התקבל, מחפש את הערוץ...' -ForegroundColor Green

$h = @{ Authorization = "Bearer $tok" }
$res = Invoke-RestMethod 'https://gate.whapi.cloud/newsletters?count=100' -Headers $h
$list = @($res.newsletters) + @($res.data) | Where-Object { $_ }
$ch = $list | Where-Object { ($_ | ConvertTo-Json -Depth 5 -Compress) -match $INVITE } | Select-Object -First 1
if (-not $ch) { $ch = $list | Where-Object { "$($_.name)" -match '3' -and "$($_.name)" -match 'דקות' } | Select-Object -First 1 }
if (-not $ch) {
  Write-Host 'הערוץ לא נמצא. הערוצים שראיתי:' -ForegroundColor Red
  $list | ForEach-Object { Write-Host " - $($_.name)  $($_.id)" }
  Read-Host 'Enter לסגירה'; exit 1
}
Write-Host "נמצא הערוץ: $($ch.name)  ($($ch.id))" -ForegroundColor Green

Push-Location $PSScriptRoot
$env:NODE_OPTIONS = '--dns-result-order=ipv4first'
$ok = $false
for ($i = 0; $i -lt 4 -and -not $ok; $i++) {
  $out = $tok | npx wrangler secret put WHAPI_TOKEN 2>&1 | Out-String
  if ($out -match 'Success') { $ok = $true } else { Start-Sleep 10 }
}
Pop-Location
$tok = $null
$cfg = Invoke-RestMethod "https://kelim-news.gilad4049.workers.dev/config?key=$ADMIN&waid=$([uri]::EscapeDataString($ch.id))"
if ($ok -and $cfg.ok) {
  Write-Host '✅ הערוץ מחובר לשרת. אפשר לסגור את החלון הזה.' -ForegroundColor Green
  Set-Content "$env:USERPROFILE\.claude\secrets\kelim-news-wa-done.txt" "$(Get-Date) $($ch.id)"
} else { Write-Host 'השמירה בשרת לא הצליחה (רשת). הריצו שוב.' -ForegroundColor Red }
Read-Host 'Enter לסגירה'
