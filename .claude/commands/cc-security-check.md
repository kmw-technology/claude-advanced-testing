# Security Check

Führe eine Sicherheitsanalyse des Codes durch.

## Verwendung
```
/project:cc-security-check [optional: Datei/Ordner]
```

## Anweisungen

1. **Prüfe auf diese Sicherheitsprobleme:**

### OWASP Top 10

#### A01: Broken Access Control
- [ ] Werden Berechtigungen auf API-Ebene geprüft?
- [ ] Können User auf fremde Daten zugreifen?
- [ ] Sind Admin-Funktionen geschützt?

#### A02: Cryptographic Failures
- [ ] Werden Passwörter gehasht (bcrypt/Argon2)?
- [ ] Werden sensitive Daten verschlüsselt?
- [ ] Ist TLS/HTTPS erzwungen?

#### A03: Injection
- [ ] SQL Injection möglich? (Raw SQL, String Concat)
- [ ] Command Injection? (Process.Start mit User-Input)
- [ ] LDAP/XPath Injection?

#### A04: Insecure Design
- [ ] Fehlt Rate Limiting?
- [ ] Fehlt Input Validation?
- [ ] Werden Security-Header gesetzt?

#### A05: Security Misconfiguration
- [ ] Debug-Mode in Production?
- [ ] Default-Credentials?
- [ ] Unnötige Features aktiviert?

#### A06: Vulnerable Components
- [ ] Vulnerable Dependencies?

#### A07: Authentication Failures
- [ ] Schwache Passwort-Policy?
- [ ] Keine Brute-Force Protection?
- [ ] Session-Token sicher?

#### A08: Data Integrity Failures
- [ ] Werden Updates signiert?
- [ ] CI/CD Pipeline sicher?

#### A09: Logging Failures
- [ ] Werden Security-Events geloggt?
- [ ] Werden keine sensitiven Daten geloggt?

#### A10: SSRF
- [ ] Werden URLs validiert bevor Requests gemacht werden?

### Code-Patterns suchen

```
// GEFÄHRLICH - Suche nach diesen Patterns:

// SQL Injection
$"SELECT * FROM users WHERE name = '{input}'"
FromSqlRaw($"...")

// Command Injection
Process.Start(userInput)
cmd.exe /c {userInput}

// Path Traversal
File.ReadAllText(userProvidedPath)
Path.Combine(baseDir, "../" + userInput)

// Hardcoded Secrets
password = "geheim123"
apiKey = "sk-..."
connectionString = "...Password=..."

// Logging sensitive data
_logger.Log($"User password: {password}")
```

2. **Erstelle Report:**

```
## Security Check Report

**Datum:** [Datum]
**Geprüft:** [Scope]
**Risiko-Level:** 🟢 Niedrig / 🟡 Mittel / 🔴 Hoch / 🔴🔴 Kritisch

### Zusammenfassung
[Kurze Zusammenfassung]

### Kritische Findings (🔴🔴 Sofort fixen!)

#### SEC-001: [Titel]
**Typ:** SQL Injection
**Datei:** Repository.cs:45
**CVSS:** 9.8 (Kritisch)

**Problem:**
```
var sql = $"SELECT * FROM users WHERE email = '{email}'";
```

**Fix:**
```
var sql = "SELECT * FROM users WHERE email = @email";
```

**Referenz:** OWASP A03

---

### Hohe Risiken (🔴)
[...]

### Mittlere Risiken (🟡)
[...]

### Empfehlungen
[...]

### Geprüfte Bereiche
| Bereich | Status |
|---------|--------|
| OWASP Top 10 | 🟢/🔴 |
| Dependencies | 🟢/🔴 |
| Secrets | 🟢/🔴 |
```

3. **Bei kritischen Findings:** Stoppe und frage ob sofort gefixt werden soll!
