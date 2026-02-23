@echo off
echo Stopping all Node processes...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM vite.exe 2>nul

echo Clearing Vite cache...
rd /s /q node_modules\.vite 2>nul
del /q node_modules\.vite-temp\*.mjs 2>nul

echo Waiting 3 seconds...
timeout /t 3 /nobreak >nul

echo Starting dev server...
npm run dev
