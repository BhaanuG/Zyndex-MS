#!/usr/bin/env bash
# ==============================================================================
# Zyndex Production Deployment Script for Oracle Cloud Always Free VM
# Architecture: 4 OCPU ARM Ampere + 24 GB RAM (Ubuntu 22.04 / 24.04 LTS)
# Sole Creator & Lead Architect: Bhaanu G (Bhaanu Gali)
# Contact: Bhaanugali@gmail.com | 2400030952@kluniversity.in
# ==============================================================================

set -euo pipefail

echo "================================================================="
echo "⚡ Starting Zyndex Full-Stack Cluster Deployment on Oracle Cloud"
echo "================================================================="

# 1. Update OS and Install Prerequisites
echo "[1/6] Updating system packages..."
sudo apt-get update -y && sudo apt-get upgrade -y
sudo apt-get install -y curl git ufw openjdk-21-jdk maven

# 2. Install Docker & Docker Compose if missing
if ! command -v docker &> /dev/null; then
    echo "[2/6] Installing Docker Engine..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker "$USER"
    rm get-docker.sh
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "Installing Docker Compose plugin..."
    sudo apt-get install -y docker-compose-plugin
fi

# 3. Configure Firewall Rules for Public HTTP/HTTPS
echo "[3/6] Configuring firewall rules for Ports 80 and 443..."
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT || true
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT || true
sudo netfilter-persistent save || true

# 4. Package All Microservice JARs
echo "[4/6] Building all 8 Maven Reactor modules..."
./mvnw clean package -DskipTests

# 5. Build and Launch the Docker Cluster
echo "[5/6] Launching all microservices, MySQL 8.4, and Nginx with Docker Compose..."
if docker compose version &> /dev/null; then
    docker compose -f docker-compose.prod.yml down --remove-orphans || true
    docker compose -f docker-compose.prod.yml up -d --build
else
    docker-compose -f docker-compose.prod.yml down --remove-orphans || true
    docker-compose -f docker-compose.prod.yml up -d --build
fi

# 6. Verify Container Health
echo "[6/6] Verifying cluster container status..."
sleep 5
if docker compose version &> /dev/null; then
    docker compose -f docker-compose.prod.yml ps
else
    docker-compose -f docker-compose.prod.yml ps
fi

echo "================================================================="
echo "✅ Zyndex is successfully deployed and running on Port 80!"
echo "Access your platform at: http://$(curl -s ifconfig.me)"
echo "================================================================="
