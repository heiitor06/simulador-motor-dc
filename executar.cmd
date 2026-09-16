@echo off
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    echo Preparando o ambiente Python pela primeira vez...
    python -m venv .venv
    if errorlevel 1 (
        echo Python 3.11 ou superior nao foi encontrado.
        pause
        exit /b 1
    )
    call ".venv\Scripts\python.exe" -m pip install -r requirements.txt
    if errorlevel 1 (
        echo Nao foi possivel instalar as bibliotecas.
        pause
        exit /b 1
    )
)

where npm >nul 2>nul
if errorlevel 1 (
    echo Node.js e npm nao foram encontrados.
    pause
    exit /b 1
)

cd frontend
if not exist "node_modules" (
    echo Instalando o frontend React pela primeira vez...
    call npm install
    if errorlevel 1 (
        echo Nao foi possivel instalar o frontend.
        pause
        exit /b 1
    )
)

echo Compilando o frontend...
call npm run build
if errorlevel 1 (
    echo O frontend apresentou um erro de compilacao.
    pause
    exit /b 1
)

cd ..
start "Servidor Motor DC" ".venv\Scripts\pythonw.exe" "servidor_web.py" --port 8090
timeout /t 2 /nobreak >nul
start "" "http://localhost:8090"
exit /b 0
