.PHONY: dev backend frontend install

dev:
	@echo "Starting backend and frontend..."
	@make -j2 backend frontend

backend:
	cd backend && uv run uvicorn main:app --reload --port 8000

frontend:
	cd frontend && npm run dev

install:
	cd backend && uv sync
	cd frontend && npm install
