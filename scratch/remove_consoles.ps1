$files = Get-ChildItem -Path "src" -Recurse -Filter "*.tsx"
foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName)
    $clean = [System.Text.RegularExpressions.Regex]::Replace($content, "(\r?\n[ \t]*console\.(log|warn|error)\([^)]*\);)", "")
    if ($clean -ne $content) {
        [System.IO.File]::WriteAllText($file.FullName, $clean)
    }
}
Write-Host "Done"
