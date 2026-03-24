# Operations & Security Rules

> Alles was Claude bei operativen Aktionen beachten muss.

---

## Umgebungen

| Umgebung | Daten | Claude darf |
|----------|-------|-------------|
| **Development** | Fake/Test | Frei arbeiten |
| **Staging** | Anonymisierte Kopie | Nach Aufforderung |
| **Production** | ECHTE DATEN | NUR mit Backup + Approval |

**Erkennung:** Hostname/Port/Config prüfen. Im Zweifel: fragen.

---

## Goldene Regeln (Production)

1. KEIN Production-Zugriff OHNE Backup
2. KEIN Production-Zugriff OHNE explizite Genehmigung
3. KEINE direkte DB-Manipulation (nur Application-Layer)
4. KEINE Secrets im Code oder Config-Dateien
5. KEIN Deployment außerhalb vereinbarter Zeitfenster ohne Genehmigung
6. BEI FEHLER: Sofort Rollback + Lessons Learned dokumentieren

---

## Claude DARF:

- Development frei nutzen
- Tests schreiben und ausführen
- Code analysieren und ändern (gemäß Risk-Matrix in CRITICAL-THINKING.md)
- Dokumentation erstellen und aktualisieren

## Claude DARF NICHT (ohne Genehmigung):

- Production-Datenbank ändern (DELETE, UPDATE, DROP, TRUNCATE)
- Production-Server neustarten
- Backups löschen
- Force-Push auf main/master
- Secrets im Code speichern
- Audit-Logs löschen

---

## Gefährliche Patterns erkennen

Bei diesen Patterns → STOPP + ask_first:

| Kategorie | Patterns |
|-----------|----------|
| **Datenbank** | DROP TABLE, TRUNCATE, DELETE FROM, ALTER TABLE DROP |
| **Dateisystem** | rm -rf, del /s, Remove-Item -Recurse |
| **Git** | push --force, reset --hard |
| **Docker** | docker rm, docker volume rm |
| **Kontext** | "production", "prod", "live", "echte Daten" |

---

## Audit-Trail Anforderungen

Alle folgenden Aktionen MÜSSEN geloggt werden:
- Datenzugriff (wer, wann, was)
- Datenänderung (vorher/nachher)
- Login/Logout
- Admin-Operationen
- Deployments

---

## Incident Response

Bei einem Sicherheitsvorfall:

1. **STOPP** — Keine weiteren Änderungen
2. **Dokumentieren** — Was ist passiert? Wann? Wer ist betroffen?
3. **User informieren** — Sofort, nicht erst nach dem Fix
4. **Beheben** — Root Cause finden und fixen
5. **Lessons Learned** — In LESSONS-LEARNED.md dokumentieren
6. **Prävention** — Check/Hook hinzufügen damit es nicht wieder passiert
