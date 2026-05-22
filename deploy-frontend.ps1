$root = $PSScriptRoot
$dest = "$root\.deploy\carnauba\entrega-260406"

Remove-Item "$root\.deploy" -Recurse -Force -ErrorAction SilentlyContinue
New-Item -Path $dest -ItemType Directory -Force | Out-Null

Copy-Item "$root\index.html",
          "$root\app.jsx",
          "$root\cronograma-itens.jsx",
          "$root\drawer-header.jsx",
          "$root\item-modal.jsx",
          "$root\month-card.jsx",
          "$root\novo-item-drawer.jsx" -Destination $dest

Copy-Item "$root\design-system" -Destination "$dest\design-system" -Recurse

Set-Location "$root\carnauba-api"
npx wrangler pages deploy ..\.deploy --project-name=clientes-mobiliar3d --commit-dirty=true
