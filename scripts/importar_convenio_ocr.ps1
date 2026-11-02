param(
    [Parameter(Mandatory=$true)][string]$Pdf,
    [Parameter(Mandatory=$true)][string]$Salida,
    [string]$Id = 'medico',
    [string]$Titulo = ('Convenio M' + [char]0xE9 + 'dico')
)

# Ejecutar con Windows PowerShell 5.1. Usa OCR de Windows en español, localmente.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Storage.StorageFile, Windows.Storage, ContentType=WindowsRuntime]
$null = [Windows.Data.Pdf.PdfDocument, Windows.Data.Pdf, ContentType=WindowsRuntime]
$null = [Windows.Storage.Streams.InMemoryRandomAccessStream, Windows.Storage.Streams, ContentType=WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType=WindowsRuntime]
$null = [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType=WindowsRuntime]
$null = [Windows.Globalization.Language, Windows.Globalization, ContentType=WindowsRuntime]

$script:asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 -and
    $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
} | Select-Object -First 1
$script:asAction = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and -not $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 -and
    $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncAction'
} | Select-Object -First 1

function Wait-Operation($Operation, [Type]$ResultType) {
    $task = $script:asTask.MakeGenericMethod($ResultType).Invoke($null, @($Operation))
    $task.Wait()
    return $task.Result
}

$archivo = Wait-Operation ([Windows.Storage.StorageFile]::GetFileFromPathAsync($Pdf)) ([Windows.Storage.StorageFile])
$documento = Wait-Operation ([Windows.Data.Pdf.PdfDocument]::LoadFromFileAsync($archivo)) ([Windows.Data.Pdf.PdfDocument])
$idioma = New-Object Windows.Globalization.Language('es-ES')
$motor = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($idioma)
if (-not $motor) { throw 'No está instalado el reconocimiento de texto en español de Windows.' }
$paginas = @()
for ($i = 0; $i -lt $documento.PageCount; $i++) {
    $pagina = $documento.GetPage($i)
    $stream = New-Object Windows.Storage.Streams.InMemoryRandomAccessStream
    $opciones = New-Object Windows.Data.Pdf.PdfPageRenderOptions
    $opciones.DestinationWidth = 1800
    $script:asAction.Invoke($null, @($pagina.RenderToStreamAsync($stream, $opciones))).Wait()
    $decoder = Wait-Operation ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
    $bitmap = Wait-Operation ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
    $resultado = Wait-Operation ($motor.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
    $texto = ($resultado.Lines | ForEach-Object { $_.Text }) -join "`n"
    $paginas += @{ numero = $i + 1; texto = $texto }
    Write-Output "Pagina $($i + 1)/$($documento.PageCount): $($texto.Length) caracteres"
    $bitmap.Dispose()
    $stream.Dispose()
    $pagina.Dispose()
}
$datos = @{
    id = $Id
    titulo = $Titulo
    archivo = [IO.Path]::GetFileName($Pdf)
    sha256 = (Get-FileHash -LiteralPath $Pdf -Algorithm SHA256).Hash.ToLowerInvariant()
    metodo = ('OCR de Windows (espa' + [char]0xF1 + 'ol); verificar contra el original')
    paginas = $paginas
}
$json = $datos | ConvertTo-Json -Depth 8
[IO.File]::WriteAllText($Salida, $json, (New-Object Text.UTF8Encoding($false)))
