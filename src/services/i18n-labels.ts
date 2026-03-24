/**
 * Bidirectional label mapping for English ↔ German form labels.
 * Enables element locator to find inputs regardless of UI language.
 */

const LABEL_GROUPS: string[][] = [
  ["username", "Benutzername", "Nutzername", "Anmeldename"],
  ["password", "Passwort", "Kennwort"],
  ["email", "E-Mail", "E-Mail-Adresse", "Email"],
  ["first name", "Vorname"],
  ["last name", "Nachname", "Familienname"],
  ["name", "Name", "Vollständiger Name"],
  ["phone", "Telefon", "Telefonnummer", "Handynummer", "Mobilnummer"],
  ["address", "Adresse", "Straße", "Straße und Hausnummer"],
  ["city", "Stadt", "Ort", "Wohnort"],
  ["zip", "PLZ", "Postleitzahl", "zip code", "postal code"],
  ["country", "Land"],
  ["company", "Firma", "Unternehmen", "Firmenname"],
  ["message", "Nachricht", "Mitteilung", "Ihre Nachricht"],
  ["search", "Suche", "Suchen", "Suchbegriff"],
  ["submit", "Absenden", "Senden", "Einreichen", "Bestätigen"],
  ["login", "Anmelden", "Einloggen", "sign in"],
  ["register", "Registrieren", "Konto erstellen", "sign up"],
  ["cancel", "Abbrechen", "Stornieren"],
  ["save", "Speichern", "Sichern"],
  ["delete", "Löschen", "Entfernen"],
  ["comment", "Kommentar", "Anmerkung"],
  ["date", "Datum"],
  ["birthdate", "Geburtsdatum", "Geburtstag", "date of birth"],
  ["description", "Beschreibung"],
  ["title", "Titel"],
  ["subject", "Betreff"],
  ["website", "Webseite", "Homepage"],
];

/**
 * Normalizes a label for comparison: lowercase, trimmed, trailing colon removed.
 */
function normalize(label: string): string {
  return label.trim().replace(/:$/, "").toLowerCase();
}

/**
 * Given a label, returns all alternative labels from the same group.
 * If the label isn't in any group, returns just the original label.
 *
 * Example: getAlternativeLabels("Password") → ["Password", "Passwort", "Kennwort"]
 * Example: getAlternativeLabels("Passwort") → ["Passwort", "password", "Kennwort"]
 */
export function getAlternativeLabels(label: string): string[] {
  const normalized = normalize(label);

  for (const group of LABEL_GROUPS) {
    const matchIndex = group.findIndex((g) => normalize(g) === normalized);
    if (matchIndex !== -1) {
      // Return original label first, then all others from the group
      const alternatives = group.filter((_, i) => i !== matchIndex);
      return [label, ...alternatives];
    }
  }

  return [label];
}

/**
 * Checks if two labels match, accounting for case and trailing colons.
 */
export function isLabelMatch(actual: string, target: string): boolean {
  return normalize(actual) === normalize(target);
}
