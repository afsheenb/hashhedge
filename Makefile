# HashHedge Development Makefile

# Configuration
PROJECT_NAME := hashhedge
HOST_UID := $(shell id -u)
HOST_GID := $(shell id -g)

# Detect if running inside a Docker container
ifndef INSIDE_DOCKER_CONTAINER
	INSIDE_DOCKER_CONTAINER = 0
endif

# Default goal
.DEFAULT_GOAL := help

# Help target
help:
	@echo "\033[34mHashHedge Development Commands:\033[39m"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[32m%-20s\033[39m - %s\n", $$1, $$2}'

# Build all services
build: ## Build all Docker images
ifeq ($(INSIDE_DOCKER_CONTAINER), 0)
	@HOST_UID=$(HOST_UID) HOST_GID=$(HOST_GID) docker-compose -f docker-compose.yml build --no-cache
else
	@echo "This command is for host machine only"
endif

# Start development environment
start: ## Start all services in detached mode
ifeq ($(INSIDE_DOCKER_CONTAINER), 0)
	@HOST_UID=$(HOST_UID) HOST_GID=$(HOST_GID) docker-compose -f docker-compose.yml up -d
else
	@echo "This command is for host machine only"
endif

# Stop development environment
stop: ## Stop all services
ifeq ($(INSIDE_DOCKER_CONTAINER), 0)
	@HOST_UID=$(HOST_UID) HOST_GID=$(HOST_GID) docker-compose -f docker-compose.yml down
else
	@echo "This command is for host machine only"
endif

# Restart services
restart: stop start ## Stop and restart all services

# Rebuild and restart a specific service
rebuild-%: ## Rebuild and restart a specific service (e.g., make rebuild-backend)
ifeq ($(INSIDE_DOCKER_CONTAINER), 0)
	@HOST_UID=$(HOST_UID) HOST_GID=$(HOST_GID) docker-compose -f docker-compose.yml up -d --build $*
else
	@echo "This command is for host machine only"
endif

# SSH into a service container
ssh-%: ## SSH into a specific service container (e.g., make ssh-backend)
ifeq ($(INSIDE_DOCKER_CONTAINER), 0)
	@docker exec -it $(PROJECT_NAME)-$* /bin/sh
else
	@echo "This command is for host machine only"
endif

# View logs for a service
logs-%: ## View logs for a specific service (e.g., make logs-backend)
ifeq ($(INSIDE_DOCKER_CONTAINER), 0)
	@docker logs -f $(PROJECT_NAME)-$*
else
	@echo "This command is for host machine only"
endif

# Run tests
test: ## Run tests for all services
ifeq ($(INSIDE_DOCKER_CONTAINER), 0)
	@docker-compose -f docker-compose.yml run --rm backend go test ./...
	@docker-compose -f docker-compose.yml run --rm frontend npm test
	@docker-compose -f docker-compose.yml run --rm aspd just test
else
	@echo "This command is for host machine only"
endif

# Test aspd specific tests
test-aspd: ## Run tests for aspd
ifeq ($(INSIDE_DOCKER_CONTAINER), 0)
	@docker-compose -f docker-compose.yml run --rm aspd just test-unit
	@docker-compose -f docker-compose.yml run --rm aspd just test-integration
else
	@echo "This command is for host machine only"
endif

# Clean Docker resources
clean: ## Remove all containers, networks, and volumes
ifeq ($(INSIDE_DOCKER_CONTAINER), 0)
	@docker-compose -f docker-compose.yml down -v --rmi all
	@docker system prune -f
else
	@echo "This command is for host machine only"
endif

.PHONY: help build start stop restart rebuild-% ssh-% logs-% test test-aspd clean
