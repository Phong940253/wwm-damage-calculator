import { toPng } from "html-to-image";

export async function exportElementToPNG(
  elementId: string,
  fileName = "gear-bonus.png"
) {
  const node = document.getElementById(elementId);
  if (!node) return;

  const dataUrl = await toPng(node, {
    backgroundColor: "#0b0b10",
    pixelRatio: 2,
  });

  const link = document.createElement("a");
  link.download = fileName;
  link.href = dataUrl;
  link.click();
}
