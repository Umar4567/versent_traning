# Setup environment variables in Vercel
# This script sets up the required environment variables for the Vercel deployment

Write-Host "Setting up Vercel environment variables..." -ForegroundColor Cyan

# Check if Vercel CLI is installed
try {
    vercel --version | Out-Null
} catch {
    Write-Host "Vercel CLI not found. Installing..." -ForegroundColor Yellow
    npm install -g vercel
}

# Load .env file
$envPath = ".\.env"
$env_vars = @{}

if (Test-Path $envPath) {
    Get-Content $envPath | ForEach-Object {
        if ($_ -match "^([^=]+)=(.*)$") {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            $env_vars[$key] = $value
        }
    }
}

# Variables to set in Vercel (add more as needed)
$varsToSet = @(
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "VITE_POLLINATIONS_API_KEY",
    "OPENAI_API_KEY"
)

Write-Host ""
Write-Host "Setting environment variables in Vercel..." -ForegroundColor Cyan
Write-Host "(You may be prompted to select your project)" -ForegroundColor Gray
Write-Host ""

foreach ($varName in $varsToSet) {
    if ($env_vars.ContainsKey($varName)) {
        $value = $env_vars[$varName]
        Write-Host "Setting $varName..." -ForegroundColor Green
        # Using echo to pipe the value to vercel env add
        $value | vercel env add $varName
    } else {
        Write-Host "Warning: $varName not found in .env file" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Environment variables setup complete!" -ForegroundColor Green
Write-Host "Redeploy your project to apply changes." -ForegroundColor Cyan
Write-Host ""
Write-Host "You can redeploy with:" -ForegroundColor Gray
Write-Host "  vercel --prod" -ForegroundColor White
