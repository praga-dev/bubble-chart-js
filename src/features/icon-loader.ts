/**
 * Loads an icon font using the FontFace API.
 * Silently skips loading in environments where FontFace is unavailable (e.g. Node.js test env).
 *
 * @param fontFamily - The CSS font-family name (e.g. "Material Symbols Outlined")
 * @param url - URL to the font file
 * @returns Promise that resolves when the font is loaded, or immediately if not supported
 */
export async function loadIconFont(fontFamily: string, url: string): Promise<void> {
  if (typeof FontFace === 'undefined') {
    // Not in a browser or FontFace API not available — skip silently
    return;
  }

  try {
    const font = new FontFace(fontFamily, `url(${url})`);
    await font.load();
    document.fonts.add(font);
  } catch (err) {
    console.warn(
      `bubble-chart-js: Failed to load icon font "${fontFamily}" from "${url}". ` +
      `Icons may not render correctly. Error: ${err}`
    );
  }
}

/**
 * Checks if a font family is already available in the document.
 * Returns true if loaded, false otherwise (including in non-browser environments).
 */
export function isFontLoaded(fontFamily: string): boolean {
  if (typeof document === 'undefined' || !document.fonts) return false;
  return document.fonts.check(`16px "${fontFamily}"`);
}

/**
 * Waits for the document to finish loading all fonts.
 * Safe to call in non-browser environments (resolves immediately).
 */
export async function waitForFontsReady(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts?.ready) return;
  await document.fonts.ready;
}
