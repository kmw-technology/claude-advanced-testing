# {{PROJECT_NAME}} - Docker Workflow

> Alle Services laufen über Docker Compose. Kein lokales Setup nötig.

---

## Schnellstart

```bash
cd {{DOCKER_COMPOSE_PATH}}
docker compose up
```

Öffne {{APP_URL}} — fertig.

---

## Modi

| | Dev-Modus (Standard) | Prod-Modus |
|---|---|---|
| **Command** | `docker compose up` | `docker compose --profile prod up` |
| **Frontend** | Dev-Server (Hot-Reload) | Statischer Build (nginx o.ä.) |
| **Backend** | {{BACKEND_TECH}} | {{BACKEND_TECH}} |
| **URL** | {{APP_URL}} | {{APP_URL}} |
| **Wann nutzen** | Entwicklung (Code ändern) | Testen wie Production sich verhält |

### Warum Docker-First?

- **Vollständige Integration:** Alle Services laufen immer mit — keine Mocks nötig
- **Reproduzierbar:** Jeder Entwickler hat exakt die gleiche Umgebung
- **Kein lokales Setup:** Weder Runtime noch SDK auf dem Rechner nötig
- **Hot-Reload bleibt:** Source-Code wird per Volume gemountet

---

## Port-Übersicht

| Port | Service | Zugriff |
|------|---------|---------|
| {{PORT_1}} | {{SERVICE_1}} | {{ACCESS_1}} |
| {{PORT_2}} | {{SERVICE_2}} | {{ACCESS_2}} |

---

## Befehle

### Starten

```bash
# Alle Services starten (Development mit Hot-Reload)
docker compose up

# Im Hintergrund starten
docker compose up -d

# Production-Build testen
docker compose --profile prod up
```

### Neu bauen

```bash
# Ein Service neu bauen
docker compose build {{SERVICE_NAME}}

# Alles neu bauen (ohne Cache)
docker compose build --no-cache

# Neu bauen + starten
docker compose up -d --build
```

### Stoppen

```bash
# Alle Container stoppen
docker compose down

# Stoppen + Images entfernen (Clean Slate)
docker compose down --rmi local --remove-orphans
```

### Logs

```bash
# Alle Logs
docker compose logs

# Ein Service, letzte 50 Zeilen
docker compose logs --tail=50 {{SERVICE_NAME}}

# Live-Logs
docker compose logs -f {{SERVICE_NAME}}
```

### Status

```bash
# Laufende Container
docker compose ps
```

---

## Hot-Reload

Der Dev-Container mountet die Source-Dateien als Volumes.
**Änderungen an gemounteten Dateien erscheinen sofort.**

### Was KEIN Hot-Reload auslöst

| Änderung | Aktion nötig |
|----------|-------------|
| Neue Dependency (package.json, *.csproj) | `docker compose build SERVICE && docker compose up -d SERVICE` |
| Dockerfile geändert | `docker compose build SERVICE && docker compose up -d SERVICE` |
| Backend-Code (kompilierte Sprachen) | `docker compose build backend && docker compose up -d backend` |

---

## Troubleshooting

### Port ist belegt
```bash
# Prüfen was den Port belegt
netstat -ano | findstr :{{PORT_1}}
# Oder alten Container stoppen
docker compose down
```

### Service startet nicht
```bash
# Logs des fehlerhaften Service prüfen
docker compose logs --tail=100 {{SERVICE_NAME}}
```

### Clean Slate (alles neu)
```bash
docker compose down --rmi local --volumes --remove-orphans
docker compose build --no-cache
docker compose up
```
