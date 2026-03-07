# Kaizen OS Makefile
# Deployment to Railway via release repository

# Configuration
APP_DIR := app
RELEASE_REPO ?= git@github-release:nickguyai/gehirn-kaizen-os-release.git
RELEASE_BRANCH := main

.PHONY: help install dev build test lint check clean release-init release

help:
	@echo "Kaizen OS Commands:"
	@echo "  dev          - Run development (frontend + server)"
	@echo "  build        - Build for production"
	@echo "  test         - Run tests"
	@echo "  release-init - Initialize release repo (one-time)"
	@echo "  release      - Build and push to Railway"

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
	rm -rf release-tmp

# =============================================================================
# RELEASE WORKFLOW
# =============================================================================
# This pushes the app directory to a separate release repository
# Railway/Vercel connects to the release repo for auto-deploy

RELEASE_TMP := release-tmp

release-init:
	@if [ -z "$(RELEASE_REPO)" ] || [ "$(RELEASE_REPO)" = "git@github.com:YOUR_ORG/kaizen-os-release.git" ]; then \
		echo "Error: Set RELEASE_REPO first"; \
		echo "  make release-init RELEASE_REPO=git@github.com:yourorg/kaizen-release.git"; \
		exit 1; \
	fi
	@echo "Initializing release repo: $(RELEASE_REPO)"
	rm -rf $(RELEASE_TMP)
	mkdir -p $(RELEASE_TMP)
	cd $(RELEASE_TMP) && git init
	cd $(RELEASE_TMP) && git remote add origin $(RELEASE_REPO)
	@echo "Release repo initialized at $(RELEASE_TMP)/"
	@echo "Run 'make release' to push"

release: build
	@if [ ! -d "$(RELEASE_TMP)/.git" ]; then \
		echo "Error: Run 'make release-init' first"; \
		exit 1; \
	fi
	@echo "Preparing release..."
	rsync -av --delete \
		--exclude '.git' \
		--exclude 'node_modules' \
		--exclude '.env*' \
		--exclude '.secrets/' \
		--exclude '/data/' \
		--exclude 'prisma/dev.db' \
		--exclude '*.log' \
		--exclude 'repomix-output.xml' \
		$(APP_DIR)/ $(RELEASE_TMP)/
	cd $(RELEASE_TMP) && git add -A
	cd $(RELEASE_TMP) && git commit -m "Release $$(date +%Y%m%d-%H%M%S)" || true
	cd $(RELEASE_TMP) && git push -u origin $(RELEASE_BRANCH) --force
	@echo ""
	@echo "✅ Released to $(RELEASE_REPO)"
