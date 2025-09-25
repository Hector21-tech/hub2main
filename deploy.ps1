# Deploy Script for HUB2 Vercel Project
# Run with: .\deploy.ps1

# Replace xxxxxxxx with your actual Vercel deploy hook URL ending
$deployUrl = "https://api.vercel.com/v1/integrations/deploy/xxxxxxxx"

Write-Host "🚀 Triggering Vercel deployment for HUB2..." -ForegroundColor Yellow
Write-Host "📡 Deploy URL: $deployUrl" -ForegroundColor Gray

try {
    curl.exe -X POST $deployUrl
    Write-Host "✅ Deploy triggered successfully!" -ForegroundColor Green
    Write-Host "🔗 Check deployment status at: https://vercel.com/dashboard" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Deploy failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 Make sure you have the correct deploy hook URL" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📝 To update deploy URL, edit deploy.ps1 and replace 'xxxxxxxx' with your Vercel deploy hook ID" -ForegroundColor Gray