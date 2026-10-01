@echo off
chcp 65001 >nul
title naiwa-hub 本地预览
cd /d "%~dp0"

where python >nul 2>nul
if not errorlevel 1 goto usepython

where node >nul 2>nul
if not errorlevel 1 goto usenode

echo.
echo   这台电脑上既没找到 Python，也没找到 Node，没法本地预览。
echo   直接把整个文件夹拖到 Cloudflare Pages，用线上网址看就行了。
echo.
pause
exit /b

:usepython
echo.
echo   本地预览启动中……稍等两秒，浏览器会自动打开 http://127.0.0.1:8123/
echo   关掉这个黑窗口 = 停止预览。
echo.
start "" cmd /c "timeout /t 2 >nul & start http://127.0.0.1:8123/"
python -m http.server 8123 --bind 127.0.0.1
exit /b

:usenode
echo.
echo   没找到 Python，改用 Node 启动……稍等几秒浏览器会自动打开。
echo   关掉这个黑窗口 = 停止预览。
echo.
start "" cmd /c "timeout /t 3 >nul & start http://127.0.0.1:8123/"
npx --yes serve -l 8123 .
exit /b
