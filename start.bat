@echo off
:: Set the title for the command window for easy identification
title Galactic Trader Launcher

echo =================================
echo  Galactic Trader Launcher
echo =================================
echo.

:: 1. Change directory to the script's location. This is the most important part.
cd /d "%~dp0"
echo Running from: %cd%
echo.

:: 2. Check if Node.js/npm is installed and available in the system's PATH.
echo Checking for npm...
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: The 'npm' command was not found.
    echo Please make sure Node.js is installed and that its command prompt is in your system's PATH.
    echo.
    pause
    exit /b 1
)
echo OK - npm found.
echo.

:: 3. Check if the required project file 'package.json' is in this folder.
echo Checking for project files...
if not exist "package.json" (
    echo ERROR: Cannot find 'package.json' in this directory.
    echo Please make sure this .bat file is in the SAME folder as your game's files.
    echo.
    pause
    exit /b 1
)
echo OK - package.json found.
echo.

:: 4. Start the npm server in a NEW, separate command window.
echo Starting the game server in a new window... (This window will stay open)
start "Galactic Trader Server" cmd /k "npm start"

:: 5. Wait for a few seconds to give the server time to start up.
echo Waiting 1 seconds for the server to initialize...
timeout /t 1 /nobreak >nul

:: 6. Open the game's URL in the user's default web browser.
echo Launching game in browser at http://127.0.0.1:8080
start "" "http://127.0.0.1:8080"

echo.
echo ====================================================================
echo  LAUNCH COMPLETE! The server is running in a separate window.
echo  You can keep this launcher window open or close it.
echo ====================================================================
echo.

:: 7. Pause to keep this window open so you can read all the messages.
pause