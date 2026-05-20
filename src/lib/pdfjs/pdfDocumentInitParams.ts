import { version as pdfjsDistVersion } from "pdfjs-dist";

export function getPdfJsCmapAndStandardFontUrls(): {
  cMapUrl: string;
  standardFontDataUrl: string;
} {
  const v = pdfjsDistVersion.trim();
  return {
    cMapUrl: `https://unpkg.com/pdfjs-dist@${v}/cmaps/`,
    standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${v}/standard_fonts/`,
  };
}
