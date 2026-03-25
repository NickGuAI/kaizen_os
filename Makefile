# Kaizen OS Makefile
# Deployment to Railway via release repository

# Configuration
APP_DIR := app
RELEASE_PROD_REPO := https://github.com/nickguyai/gehirn-kaizen-os-release.git
RELEASE_BRANCH := main

.PHONY: help install dev build test lint check clean release-prod

help:
	@echo "Kaizen OS Commands:"
	@echo "  dev          - Run development (frontend + server)"
	@echo "  build        - Build for production"
	@echo "  test         - Run tests"
	@echo "  release-prod - Build and push to production (nickguyai/gehirn-kaizen-os-release)"

# Development
install:
	cd $(APP_DIR) && npm install

dev:
	cd $(APP_DIR) && npm run dev:all

# Build
build:
	cd $(APP_DIR) && npm run build

	@echo "Build complete: $(APP_DIR)/dist/"

# Quality
test:
	cd $(APP_DIR) && npm run test:run

lint:
	cd $(APP_DIR) && npm run lint

check: test lint
	@echo "All checks passed"

# Database
db-push:
	cd $(APP_DIR) && npm run db:push

db-migrate:
	cd $(APP_DIR) && npm run db:migrate

db-studio:
	cd $(APP_DIR) && npm run db:studio

# Cleanup
clean:
	rm -rf $(APP_DIR)/dist
	rm -rf $(APP_DIR)/node_modules/.cache
	rm -rf release-tmp release-prod-tmp

# =============================================================================
# RELEASE WORKFLOW
# =============================================================================
# This pushes the app directory to a separate release repository
# Railway/Vercel connects to the release repo for auto-deploy

# Production release — pushes to gehirn-kaizen-os-release
RELEASE_PROD_TMP := release-prod-tmp

release-prod: build
	@if [ ! -d "$(RELEASE_PROD_TMP)/.git" ]; then \
		echo "Cloning prod release repo for the first time..."; \
		git clone $(RELEASE_PROD_REPO) $(RELEASE_PROD_TMP); \
	else \
		cd $(RELEASE_PROD_TMP) && git pull --ff-only origin $(RELEASE_BRANCH); \
	fi
	@echo "Preparing production release..."
	rsync -av --delete \
		--exclude '.git' \
		--exclude 'node_modules' \
		--exclude '.env*' \
		--exclude '.secrets/' \
		--exclude '/data/' \
		--exclude 'prisma/dev.db' \
		--exclude '*.log' \
		--exclude 'repomix-output.xml' \
		$(APP_DIR)/ $(RELEASE_PROD_TMP)/
	cd $(RELEASE_PROD_TMP) && git add -A
	cd $(RELEASE_PROD_TMP) && git commit -m "Release $$(date +%Y%m%d-%H%M%S)" || true
	cd $(RELEASE_PROD_TMP) && git push origin $(RELEASE_BRANCH)
	@echo ""
	@echo "✅ Production released to $(RELEASE_PROD_REPO)"
