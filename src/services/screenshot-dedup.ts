import { createHash } from "crypto";

/**
 * Tracks screenshot hashes to avoid storing duplicate screenshots.
 * Uses MD5 for speed — not used for security, only deduplication.
 */
export class ScreenshotDeduplicator {
  private seen = new Set<string>();

  /**
   * Computes a hash of the screenshot data.
   */
  hash(base64Data: string): string {
    return createHash("md5").update(base64Data).digest("hex");
  }

  /**
   * Checks if a screenshot with the same content has already been seen.
   */
  isDuplicate(base64Data: string): boolean {
    return this.seen.has(this.hash(base64Data));
  }

  /**
   * Adds a screenshot hash to the seen set. Returns the hash.
   */
  add(base64Data: string): string {
    const h = this.hash(base64Data);
    this.seen.add(h);
    return h;
  }

  /**
   * Checks if duplicate and adds if not. Returns { isDuplicate, hash }.
   */
  track(base64Data: string): { isDuplicate: boolean; hash: string } {
    const h = this.hash(base64Data);
    const dup = this.seen.has(h);
    this.seen.add(h);
    return { isDuplicate: dup, hash: h };
  }

  /**
   * Resets the deduplicator.
   */
  reset(): void {
    this.seen.clear();
  }

  get uniqueCount(): number {
    return this.seen.size;
  }
}
