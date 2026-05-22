$root = $PSScriptRoot
$dest = "$root\.deploy\carnauba\entrega-260406"

# Load .env if present
$envFile = "$root\.env"
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.+)$') {
      [System.Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), 'Process')
    }
  }
}

Remove-Item "$root\.deploy" -Recurse -Force -ErrorAction SilentlyContinue
New-Item -Path $dest -ItemType Directory -Force | Out-Null

# Uncomment base href for production deploy
$indexContent = Get-Content "$root\index.html" -Raw
$indexContent = $indexContent -replace '<!--\s*(<base href="/carnauba/entrega-260406/">)\s*-->', '$1'
Set-Content "$dest\index.html" $indexContent -NoNewline

Copy-Item "$root\app.jsx",
          "$root\cronograma-itens.jsx",
          "$root\drawer-header.jsx",
          "$root\item-modal.jsx",
          "$root\month-card.jsx",
          "$root\novo-item-drawer.jsx" -Destination $dest

Copy-Item "$root\design-system" -Destination "$dest\design-system" -Recurse

Set-Location "$root\carnauba-api"
npx wrangler pages deploy ..\.deploy --project-name=clientes-mobiliar3d --branch=main --commit-dirty=true
