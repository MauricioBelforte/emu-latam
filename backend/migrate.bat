@echo off
echo Executing Nakama Migrations...
nakama.exe migrate up --config local.yml
pause
