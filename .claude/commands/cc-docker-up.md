# Docker Development starten

Startet die Entwicklungsumgebung via Docker Compose.

## Verwendung

**Argument:** $ARGUMENTS

**Modi:**
- `(leer)` — Alle Services starten
- `--rebuild` — Alle Images neu bauen und starten
- `--frontend` — Nur Frontend neu bauen und starten
- `--backend` — Nur Backend neu bauen und starten
- `--prod` — Production-Build starten

---

## Ablauf

### 1. Voraussetzungen prüfen

```bash
docker --version
docker compose version
```

Falls Docker nicht läuft → User informieren: "Docker Desktop muss laufen!"

### 2. Aktuellen Status prüfen

```bash
docker compose ps
```

Zeige dem User welche Container laufen/gestoppt sind.

### 3. Je nach Modus ausführen

#### Standard (leer):
```bash
docker compose up -d
```

#### --rebuild:
```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```

#### --frontend:
```bash
docker compose build frontend
docker compose up -d frontend
```

#### --backend:
```bash
docker compose build backend
docker compose up -d backend
```

#### --prod:
```bash
docker compose --profile prod up -d
```

### 4. Auf Readiness warten

```bash
# Health-Check (max 30s warten)
timeout 30 bash -c 'until curl -s http://localhost:{{PORT}}/api/health > /dev/null 2>&1; do sleep 2; done'
```

### 5. Status-Report ausgeben

```markdown
## Docker Environment

| Service | Status | URL |
|---------|--------|-----|
| Frontend | ✅/❌ | http://localhost:{{FRONTEND_PORT}} |
| Backend | ✅/❌ | http://localhost:{{BACKEND_PORT}} |

Logs anzeigen: `/project:cc-docker-logs`
```

Falls ein Service fehlgeschlagen ist → Logs anzeigen und Fehler analysieren.
