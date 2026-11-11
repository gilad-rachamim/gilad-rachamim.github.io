# חיבור דף הפייסבוק "החדשות ב-3 דקות" לשרת kelim-news – מפתח קבוע לדף (Page Access Token שלא פג).
# גילעד מריץ ומדביק את ה-App secret (מהגדרות האפליקציה kelim-news ← בסיסי ← הצג). הסוד לא נשמר בשום קובץ.
# צריך קודם מפתח משתמש זמני בקובץ ~/.claude/secrets/kelim-news-fb-user-short.txt (מ-Graph API Explorer).
$ErrorActionPreference = 'Stop'
$APP = '2368121130670220'
$PAGE = '1431876290011865'
$V = 'v27.0'
$shortFile = "$env:USERPROFILE\.claude\secrets\kelim-news-fb-user-short.txt"
$short = $null
if (Test-Path $shortFile) { $short = (Get-Content $shortFile -Raw).Trim() }
if (-not $short) {
  # בלי קובץ: גילעד לוחץ על כפתור ההעתקה ליד ה-Access Token ב-Graph API Explorer
  Write-Host ''
  Write-Host 'שלב 1: מחכה שתעתיקו את ה-Access Token (כפתור ההעתקה ליד המפתח ב-Graph API Explorer)...' -ForegroundColor Yellow
  Set-Clipboard ' '
  for ($i = 0; $i -lt 600 -and -not $short; $i++) {
    $c = (Get-Clipboard -Raw) ; if ($c) { $c = $c.Trim() }
    if ($c -match '^EAA[A-Za-z0-9]{50,}$') { $short = $c } else { Start-Sleep 1 }
  }
  Set-Clipboard ' '
  if (-not $short) { Write-Host 'לא הועתק מפתח תוך 10 דקות.' -ForegroundColor Red; Read-Host 'Enter לסגירה'; exit 1 }
  Write-Host 'המפתח התקבל. שלב 2:' -ForegroundColor Green
}

Write-Host ''
Write-Host 'מחכה שתעתיקו את ה-App secret (לחיצה כפולה עליו ואז Ctrl+C)...' -ForegroundColor Yellow
Set-Clipboard ' '
$secret = $null
for ($i = 0; $i -lt 600 -and -not $secret; $i++) {
  $c = (Get-Clipboard -Raw) ; if ($c) { $c = $c.Trim() }
  if ($c -match '^[0-9a-f]{32}$') { $secret = $c } else { Start-Sleep 1 }
}
Set-Clipboard ' '
if (-not $secret) { Write-Host 'לא הועתק סוד תוך 10 דקות.' -ForegroundColor Red; Read-Host 'Enter לסגירה'; exit 1 }
Write-Host 'הסוד התקבל, ממשיכים...' -ForegroundColor Green

# 1. מפתח משתמש ארוך (60 יום)
$long = Invoke-RestMethod "https://graph.facebook.com/$V/oauth/access_token?grant_type=fb_exchange_token&client_id=$APP&client_secret=$secret&fb_exchange_token=$short"
# 2. מפתח הדף – כשמגיע ממפתח משתמש ארוך, הוא לא פג
$pages = Invoke-RestMethod "https://graph.facebook.com/$V/me/accounts?fields=id,name,access_token&limit=100&access_token=$($long.access_token)"
$p = $pages.data | Where-Object { $_.id -eq $PAGE }
if (-not $p) { Write-Host 'הדף "החדשות ב-3 דקות" לא נמצא ברשימה. צריך לאשר אותו בחלון של פייסבוק.' -ForegroundColor Red; exit 1 }
Write-Host "נמצא הדף: $($p.name)" -ForegroundColor Green

# 3. שמירה בשרת כסוד
Push-Location $PSScriptRoot
$env:NODE_OPTIONS = '--dns-result-order=ipv4first'
$ok = $false
for ($i = 0; $i -lt 4 -and -not $ok; $i++) {
  $out = $p.access_token | npx wrangler secret put FB_PAGE_TOKEN 2>&1 | Out-String
  if ($out -match 'Success') { $ok = $true } else { Start-Sleep 10 }
}
Pop-Location
Remove-Item "$env:USERPROFILE\.claude\secrets\kelim-news-fb-user-short.txt" -ErrorAction SilentlyContinue
$secret = $null
if ($ok) { Write-Host '✅ הדף מחובר לשרת. אפשר לסגור את החלון הזה.' -ForegroundColor Green; Set-Content "$env:USERPROFILE\.claude\secrets\kelim-news-fb-done.txt" (Get-Date) }
else { Write-Host 'השמירה בשרת לא הצליחה (רשת). הריצו שוב.' -ForegroundColor Red }
Read-Host 'Enter לסגירה'
