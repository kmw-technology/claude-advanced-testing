# Docker Logs anzeigen

Zeigt Logs der Docker-Container an und analysiert Fehler.

## Verwendung

**Argument:** $ARGUMENTS

**Modi:**
- `(leer)` — Übersicht aller Services (letzte 20 Zeilen je Service)
- `--frontend` — Nur Frontend-Logs
- `--backend` — Nur Backend-Logs
- `--errors` — Nur Fehler aus allen Services
- `--follow <service>` — Live-Logs eines Services

---

## Ablauf

### 1. Container-Status prüfen

```bash
docker compose ps -a
```

### 2. Je nach Modus Logs anzeigen

#### Standard (leer):
Zeige die letzten 20 Zeilen jedes Services:
```bash
docker compose logs --tail=20
```

#### --frontend / --backend:
```bash
docker compose logs --tail=50 <service>
```

#### --errors:
```bash
docker compose logs --tail=100 2>&1 | grep -iE "(error|exception|fatal|fail|panic|crash)"
```

#### --follow:
```bash
docker compose logs -f --tail=30 <service>
```
**Hinweis:** Follow-Modus blockiert — Ctrl+C zum Beenden.

### 3. Analyse

Bei Fehlern:
- Identifiziere die Ursache
- Schlage eine Lösung vor
- Frage ob der Fix angewendet werden soll

Typische Fehlerquellen:
- **Frontend**: Build-Fehler, fehlende Dependencies → `docker compose build frontend`
- **Backend**: Migration-Fehler, Connection-Strings → Logs prüfen
- **Allgemein**: Port-Konflikte → `docker compose down` und neu starten
