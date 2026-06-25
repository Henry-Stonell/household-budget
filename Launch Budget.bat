@echo off
:: H&L Budget Launcher
:: Opens the budget app in Microsoft Edge as a standalone app window (no browser chrome)

set "FILE=%~dp0HLBudget.html"
set "EDGE=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
set "EDGE64=C:\Program Files\Microsoft\Edge\Application\msedge.exe"

if exist "%EDGE64%" (
    start "" "%EDGE64%" --app="file:///%FILE:\=/%"
) else if exist "%EDGE%" (
    start "" "%EDGE%" --app="file:///%FILE:\=/%"
) else (
    :: Fallback: open in default browser
    start "" "%FILE%"
)
