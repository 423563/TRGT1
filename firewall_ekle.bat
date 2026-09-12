@echo off
:: Yönetici olarak çalıştır
net session >nul 2>&1
if %errorLevel% neq 0 (
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo Firewall kurali ekleniyor...
netsh advfirewall firewall add rule name="Binance Futures Filtre Port 3000" dir=in action=allow protocol=TCP localport=3000

echo.
echo Kural basariyla eklendi!
echo Artik telefon/tabletten http://172.31.3.69:3000 adresine girebilirsiniz.
echo.
pause
