@echo off
title Sistema Roleta Brasileira - API Rest & Scraper
color 0A

echo ============================================================
echo 🎰 INICIANDO SISTEMA ROLETA BRASILEIRA (API + SCRAPER)
echo ============================================================
echo.
echo  [1/2] Iniciando Servidor API RESTful (npm run dev)...
start "Roleta API Rest (Porta 3000)" cmd /k "npm run dev"

echo.
echo  [2/2] Aguardando 3 segundos e iniciando Scraper (npm run scraper)...
timeout /t 3 /nobreak >nul
start "Roleta Scraper Puppeteer" cmd /k "npm run scraper"

echo.
echo ============================================================
echo  ✅ Sistema iniciado com sucesso em janelas separadas!
echo  🌐 Painel de Exibição: http://localhost:3000
echo  📡 API Rest Endpoint: http://localhost:3000/api/historico
echo ============================================================
echo.
pause
