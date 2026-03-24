# {{PROJECT_NAME}} - Design System

> Projekt-spezifische UI/UX-Entscheidungen. Standard-CSS/Framework-Patterns werden vorausgesetzt.

---

## Design-Philosophie

| Prinzip | Anwendung |
|---------|-----------|
| **Klarheit** | Keine versteckten Funktionen, klare Labels |
| **Konsistenz** | Gleiche Patterns überall, Design Tokens nutzen |
| **Zugänglichkeit** | WCAG AA, große Targets, hoher Kontrast |
| **{{DESIGN_PRINCIPLE}}** | {{DESIGN_PRINCIPLE_DESC}} |

**Zielgruppe:** {{TARGET_AUDIENCE}}

---

## Farben

### Primär

| Token | Hex | Verwendung |
|-------|-----|------------|
| `--color-primary` | `{{PRIMARY_COLOR}}` | Buttons, Links, aktive Elemente |
| `--color-primary-dark` | `{{PRIMARY_DARK}}` | Hover, Fokus |
| `--color-primary-light` | `{{PRIMARY_LIGHT}}` | Hintergründe, Badges |

### Neutral

| Token | Hex | Verwendung |
|-------|-----|------------|
| `--color-text` | `#111827` | Haupttext (Gray-900) |
| `--color-text-muted` | `#4B5563` | Labels, Sekundärtext (Gray-600) |
| `--color-text-disabled` | `#9CA3AF` | Disabled, Placeholder |
| `--color-border` | `#E5E7EB` | Standard-Rahmen |
| `--color-background` | `#F9FAFB` | Seiten-Hintergrund |
| `--color-surface` | `#FFFFFF` | Cards, Panels |

### Semantisch

| Token | Hex | Verwendung |
|-------|-----|------------|
| `--color-success` | `#059669` | Erfolg |
| `--color-warning` | `#D97706` | Warnung |
| `--color-error` | `#DC2626` | Fehler |
| `--color-info` | `#0891B2` | Information |

### Farbregeln (WICHTIG!)

1. **Kontrast:** Mind. 4.5:1 für Text, 3:1 für UI-Elemente
2. **Farbe nie allein:** Immer zusätzlich Icon oder Text
3. **KEINE graue Schrift auf weiß!** Body-Text muss mind. Gray-900 sein
   - Gray-500 NUR für: Placeholder, Disabled, Timestamps

---

## Typografie

```css
--font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
--font-family-mono: "SF Mono", "Cascadia Code", "Consolas", monospace;
```

| Token | Größe | Verwendung |
|-------|-------|------------|
| `--text-xs` | 12px | Hilfstexte, Fußnoten |
| `--text-sm` | 14px | Labels, sekundärer Text |
| `--text-base` | 16px | Body-Text (Standard) |
| `--text-lg` | 18px | Lead-Text |
| `--text-xl`..`4xl` | 20-36px | H4..H1 |

---

## Layout

| Element | Wert |
|---------|------|
| Sidebar | 260px, collapsible auf Mobile |
| Header | 60px, sticky |
| Grid | 12-Spalten, 24px Gutter |
| Max Zeilenlänge | 75 Zeichen |

### Spacing (8px Basis)

`--space-1` (4px) bis `--space-24` (96px). Standard: `--space-4` = 16px.

### Border-Radius

| Token | Wert | Für |
|-------|------|-----|
| `--radius-sm` | 4px | Badges |
| `--radius-md` | 6px | Buttons, Inputs |
| `--radius-lg` | 8px | Cards |
| `--radius-xl` | 12px | Modals |

---

## UI-Regeln

### Buttons
- **Eine Primary-Button pro Ansicht** (wichtigste Aktion)
- Button-Text = Verb ("Speichern", nicht "OK")
- Destruktiver Button = rot, rechts

### Inputs
- **Immer Label** (nie nur Placeholder)
- Pflichtfelder: Stern (*) am Label
- Mindesthöhe: 44px (Touch)

### Formulare
- Labels oben (nie links daneben)
- Standard einspaltrig
- Destruktive Aktionen links, primäre rechts

### Tables
- Sortierbare Header, Pagination bei >20 Einträgen
- Zebra-Striping (alternierend weiß/gray-50)

### Modals
- Schließen: X-Button + Escape + Overlay-Klick
- Fokus-Trap aktiv
- Kein Modal-in-Modal

### Toast-Notifications
- Position: oben rechts
- Success: 3s auto-dismiss, Error: manuell
- Max 3 gleichzeitig

---

## Icons

**{{ICON_LIBRARY}}** ({{ICON_LICENSE}}).

| Größe | Pixel | Verwendung |
|-------|-------|------------|
| sm | 16px | Buttons, Inputs |
| md | 20px | Standard |
| lg | 24px | Navigation |
