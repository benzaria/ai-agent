param (
    [Parameter(Mandatory = $true)]
    [string]$Dir,

    [Parameter(Mandatory = $true)]
    [string]$File,

    # Renamed to avoid conflict with automatic $Args
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$_Args
)

# Resolve full path
$scriptPath = Join-Path $Dir "$File.ts"

# Validate file exists
if (-not (Test-Path $scriptPath)) {
    Write-Error "File not found: $scriptPath"
    exit 1
}

# Display command
Write-Host "Running:" -ForegroundColor Cyan
Write-Host ("node `"$scriptPath`" " + ($_Args -join ' ')) -ForegroundColor Yellow
Write-Host $_Args

# Execute
try {
    # Use splatting to pass args correctly
    & node $scriptPath @_Args
}
catch {
    Write-Error "Execution failed: $_"
    exit 1
}
