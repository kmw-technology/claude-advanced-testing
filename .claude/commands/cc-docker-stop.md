# Docker Environment stoppen

Stoppt die Docker-Container.

## Verwendung

**Argument:** $ARGUMENTS

**Modi:**
- `(leer)` — Alle Container stoppen (Daten bleiben erhalten)
- `--clean` — Stoppen + Images und Build-Cache entfernen
- `--frontend` — Nur Frontend stoppen
- `--backend` — Nur Backend stoppen

---

## Ablauf

### 1. Aktuellen Status zeigen

```bash
docker compose ps
```

### 2. Je nach Modus ausführen

#### Standard (leer):
```bash
docker compose down
```

#### --clean:
```bash
docker compose down --rmi local --remove-orphans
docker builder prune -f
```
**Hinweis:** Beim nächsten Start werden Images neu gebaut.

#### --frontend / --backend:
```bash
docker compose stop <service>
```

### 3. Bestätigung

```bash
docker compose ps -a
```

Zeige dem User den finalen Status.
