@echo off
chcp 65001 >nul
title Albalagh Agenda
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"
