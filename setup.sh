#!/bin/bash

# JobFlow Setup Script
# Run this to get everything running

set -e

echo "🔧 Setting up JobFlow..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check for .env file
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  No .env file found. Creating from .env.example...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Please edit .env and add your API keys before continuing!${NC}"
    echo -e "${YELLOW}⚠️  At minimum, you need one of: OPENAI_API_KEY or ANTHROPIC_API_KEY${NC}"
fi

# Install dependencies
echo -e "${GREEN}📦 Installing dependencies...${NC}"
npm install

# Install backend dependencies
echo -e "${GREEN}📦 Installing backend dependencies...${NC}"
cd backend && npm install && cd ..

# Install frontend dependencies
echo -e "${GREEN}📦 Installing frontend dependencies...${NC}"
cd frontend && npm install && cd ..

# Setup database
# Prisma's CLI loads .env from its own working directory, so we link the
# repo-root .env into backend/ when running prisma so the schema can resolve
# DATABASE_URL. Without this the db push silently fails ("Environment variable
# not found: DATABASE_URL") even though the script's `set -e` doesn't catch it.
echo -e "${GREEN}🗄️  Setting up database...${NC}"
if [ ! -e backend/.env ]; then
    ln -s ../.env backend/.env
fi
cd backend && npx prisma db push && cd ..

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "To start JobFlow:"
echo "  npm run dev        # Start backend (port 4000) + frontend (port 3000)"
echo ""
echo "Then open:"
echo "  Frontend:  http://localhost:3000"
echo "  Backend:  http://localhost:4000"
echo ""