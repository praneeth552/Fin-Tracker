.PHONY: help up down logs restart shell-frontend shell-backend build-apk clean

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
NC := \033[0m # No Color

help: ## Show this help message
	@echo "$(BLUE)FinTrackerApp Docker Commands$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(GREEN)%-20s$(NC) %s\n", $$1, $$2}'

up: ## Start all containers
	@echo "$(BLUE)Starting FinTrackerApp...$(NC)"
	docker-compose up -d
	@echo "$(GREEN)✓ Services started!$(NC)"
	@echo "Frontend (Metro): http://localhost:8081"
	@echo "Backend API: http://localhost:8080"

down: ## Stop all containers
	@echo "$(BLUE)Stopping containers...$(NC)"
	docker-compose down
	@echo "$(GREEN)✓ Containers stopped$(NC)"

logs: ## View logs from all services
	docker-compose logs -f

logs-frontend: ## View frontend logs only
	docker-compose logs -f frontend

logs-backend: ## View backend logs only
	docker-compose logs -f backend

restart: ## Restart all containers
	@echo "$(BLUE)Restarting containers...$(NC)"
	docker-compose restart
	@echo "$(GREEN)✓ Containers restarted$(NC)"

shell-frontend: ## Open shell in frontend container
	docker-compose exec frontend /bin/bash

shell-backend: ## Open shell in backend container
	docker-compose exec backend /bin/bash

build: ## Rebuild all Docker images
	@echo "$(BLUE)Rebuilding images...$(NC)"
	docker-compose build --no-cache
	@echo "$(GREEN)✓ Build complete$(NC)"

build-apk: ## Build Android APK
	@echo "$(BLUE)Building Android APK...$(NC)"
	docker-compose exec frontend bash -c "cd android && ./gradlew assembleDebug"
	@echo "$(GREEN)✓ APK built: android/app/build/outputs/apk/debug/app-debug.apk$(NC)"

build-apk-release: ## Build Android release APK
	@echo "$(BLUE)Building Android release APK...$(NC)"
	docker-compose exec frontend bash -c "cd android && ./gradlew assembleRelease"
	@echo "$(GREEN)✓ Release APK built$(NC)"

clean: ## Clean all build artifacts
	@echo "$(BLUE)Cleaning build artifacts...$(NC)"
	rm -rf android/build android/app/build
	rm -rf backend/build backend/.gradle
	@echo "$(GREEN)✓ Clean complete$(NC)"

clean-docker: ## Remove all containers, images, and volumes
	@echo "$(BLUE)Cleaning Docker artifacts...$(NC)"
	docker-compose down -v --rmi all
	@echo "$(GREEN)✓ Docker clean complete$(NC)"

install: ## Install dependencies in containers
	@echo "$(BLUE)Installing frontend dependencies...$(NC)"
	docker-compose exec frontend npm install
	@echo "$(BLUE)Installing backend dependencies...$(NC)"
	docker-compose exec backend gradle dependencies
	@echo "$(GREEN)✓ Dependencies installed$(NC)"

status: ## Show status of all containers
	docker-compose ps

# Default target
.DEFAULT_GOAL := help
