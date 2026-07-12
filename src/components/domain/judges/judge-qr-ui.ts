import type { EventQrPrintGroup } from "@/components/domain/events/qr/EventQrCard";

export function downloadSvgAsPng(svg: SVGSVGElement, fileName: string) {
  const svgData = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);
  const image = new Image();
  const canvas = document.createElement("canvas");
  const exportSize = 512;
  canvas.width = exportSize;
  canvas.height = exportSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    URL.revokeObjectURL(objectUrl);
    return;
  }
  image.onload = () => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, exportSize, exportSize);
    ctx.drawImage(image, 0, 0, exportSize, exportSize);
    URL.revokeObjectURL(objectUrl);
    const pngUrl = canvas.toDataURL("image/png");
    const anchor = document.createElement("a");
    anchor.href = pngUrl;
    anchor.download = fileName;
    anchor.click();
  };
  image.src = objectUrl;
}

export function triggerEventQrPrint(preset: EventQrPrintGroup | "all") {
  document.body.dataset.eventQrPrint = preset;
  window.print();
  window.setTimeout(() => {
    delete document.body.dataset.eventQrPrint;
  }, 500);
}
