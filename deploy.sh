#!/bin/bash
set -e
echo "=== Deploy Plataforma Operativa ==="

cd /home/juan/plataforma-ops
git pull origin main

# Backend
echo "--- Backend: dependencias + migraciones ---"
/home/juan/plataforma-ops/venv/bin/pip install -r backend/requirements.txt -q
cd backend
/home/juan/plataforma-ops/venv/bin/alembic upgrade head
cd ..
sudo systemctl restart plataforma-backend

# Frontend
echo "--- Frontend: build ---"
cd frontend
npm install --silent
npm run build
cd ..

echo "=== Deploy completado ==="
sudo systemctl status plataforma-backend --no-pager
