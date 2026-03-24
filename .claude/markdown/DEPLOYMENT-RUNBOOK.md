# {{PROJECT_NAME}} - Deployment Runbook

## Zweck

Dieses Dokument enthält **Schritt-für-Schritt Anweisungen** für Deployments.
Claude MUSS dieses Dokument vor JEDEM Deployment lesen und befolgen.

---

## KRITISCHE REGELN (NIEMALS VERLETZEN!)

```
╔═══════════════════════════════════════════════════════════════════╗
║  1. KEIN Deployment OHNE Backup                                   ║
║  2. KEIN Deployment OHNE User-Approval                            ║
║  3. KEIN Deployment an Freitagen/Wochenenden ohne Genehmigung     ║
║  4. BEI FEHLER: Sofort Rollback + Lessons Learned dokumentieren!  ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

## Deployment-Typen

| Typ | Risiko | Wann |
|-----|--------|------|
| **Hotfix** | 🔴 Hoch | Kritischer Bug in Production |
| **Release** | 🟡 Mittel | Geplantes Feature-Release |
| **Patch** | 🟢 Niedrig | Kleine Bugfixes, keine DB-Änderung |

---

## 1. PRE-DEPLOYMENT CHECKLISTE

### VOR JEDEM Deployment ausführen:

```markdown
## Pre-Deployment Checklist

### Code-Qualität
- [ ] Alle Tests bestanden (Unit + Integration + E2E)
- [ ] Code Coverage ≥ 70%
- [ ] Keine Security Vulnerabilities
- [ ] Code Review abgeschlossen
- [ ] PR in main/release gemerged

### Dokumentation
- [ ] CHANGELOG.md aktualisiert
- [ ] Migration Notes (falls DB-Änderungen)
- [ ] API Breaking Changes dokumentiert

### Infrastruktur
- [ ] Target-Server erreichbar
- [ ] Genug Disk Space (> 20% frei)
- [ ] DB-Verbindung funktioniert
- [ ] Backup erstellt und verifiziert

### Genehmigungen
- [ ] User hat Deployment genehmigt
- [ ] Deployment-Zeitfenster bestätigt
- [ ] Rollback-Plan vorhanden
```

---

## 2. BACKUP-PROZEDUR (PFLICHT!)

### Database Backup

```bash
# 1. Backup erstellen
echo "Erstelle Backup..."
{{BACKUP_COMMAND}}

# 2. Backup verifizieren
echo "Verifiziere Backup..."
{{VERIFY_BACKUP_COMMAND}}

# 3. Backup-Pfad merken für Rollback
echo $BACKUP_FILE > /tmp/last_backup_path.txt
```

**NIEMALS Deployment ohne vorheriges Backup!**

---

## 3. DEPLOYMENT-ABLAUF

### Staging Deployment

1. Pre-Checks durchführen
2. Backup erstellen (auch Staging!)
3. Aktuellen Code pullen/deployen
4. Build erstellen
5. Service stoppen
6. Deploy
7. Database Migration (falls nötig)
8. Service starten
9. Health Check
10. Bei Fehler: Rollback!

### Production Deployment

**Zusätzliche Schritte:**
1. Bestätigung einholen ("yes" eingeben)
2. Maintenance Mode aktivieren
3. [Standard-Deployment-Schritte]
4. Maintenance Mode deaktivieren
5. Smoke Tests durchführen
6. Logs beobachten

---

## 4. ROLLBACK-PROZEDUR

### Bei Fehler SOFORT:

1. Service stoppen
2. Database Rollback (aus Backup)
3. Application Rollback (vorherige Version)
4. Service starten
5. Health Check
6. **LESSONS LEARNED dokumentieren!**

---

## 5. POST-DEPLOYMENT

### Smoke Tests

- [ ] Health Endpoint erreichbar
- [ ] API Version korrekt
- [ ] Database verbunden
- [ ] Kern-Funktionen arbeiten

### Monitoring

```bash
# Logs beobachten
journalctl -u {{SERVICE_NAME}} -f

# Metriken prüfen
curl http://localhost/metrics | grep -E "http_requests_total|errors"
```

---

## 6. HÄUFIGE FEHLER UND LÖSUNGEN

| Fehler | Ursache | Lösung |
|--------|---------|--------|
| Health Check 500 | DB-Verbindung fehlt | Connection String prüfen |
| Migration fehlgeschlagen | Schema-Konflikt | Backup wiederherstellen, Migration manuell prüfen |
| Service startet nicht | Port belegt | Prozess auf Port finden und killen |
| Permission Denied | Falscher User | Berechtigungen prüfen |
| Out of Memory | Speicher voll | Alte Logs löschen, Speicher erhöhen |

---

## Claude Code Integration

### Vor Deployment IMMER:

1. Dieses Dokument lesen
2. Pre-Deployment Checklist durchgehen
3. User-Approval einholen
4. Backup verifizieren

### Bei Fehler IMMER:

1. Rollback durchführen
2. Fehler in LESSONS-LEARNED.md dokumentieren
3. User informieren
4. Root Cause analysieren
