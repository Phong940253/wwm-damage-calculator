import { toPng } from "html-to-image";

export async function exportElementToPNG(
  elementId: string,
  fileName = "gear-bonus.png",
) {
  const node = document.getElementById(elementId);
  if (!node) return;

  try {
    let dataUrl: string;

    try {
      dataUrl = await toPng(node, {
        backgroundColor: "#0b0b10",
        pixelRatio: 2,
      });
    } catch (err) {
      // html-to-image can crash in embed-webfonts when a @font-face rule has
      // an undefined font-family (normalizeFontFamily calls .trim()).
      // Retrying with skipFonts avoids that codepath.
      console.warn(
        "PNG export failed (likely font embedding). Retrying with skipFonts...",
        err,
      );

      dataUrl = await toPng(node, {
        backgroundColor: "#0b0b10",
        pixelRatio: 2,
        skipFonts: true,
      });
    }

    const link = document.createElement("a");
    link.download = fileName;
    link.href = dataUrl;
    link.click();
  } catch (err) {
    // Avoid an "Uncaught (in promise)" error from button onClick.
    console.error("Failed to export PNG", err);
  }
}
