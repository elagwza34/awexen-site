type PdfBlock =
  | { kind: "title" | "heading" | "text"; text: string }
  | { kind: "table"; columns: string[]; rows: string[][] };

const pageWidth = 595;
const pageHeight = 842;
const margin = 36;
const contentWidth = pageWidth - margin * 2;
const encoder = new TextEncoder();

// Browsers shape Arabic in Canvas, including mixed Arabic, English and numbers.
// The browser print action remains available for a selectable-text document.
export async function downloadCalculatorPdf(reference: string, lang: "ar" | "en", blocks: PdfBlock[]) {
  const rtl = lang === "ar";
  const sample = blocks.flatMap((block) => block.kind === "table" ? [...block.columns, ...block.rows.flat()] : [block.text]).join(" ");
  await Promise.allSettled([400, 700, 900].map((weight) => document.fonts.load(`${weight} 12px Cairo`, sample)));
  const canvas = document.createElement("canvas");
  canvas.width = pageWidth * 2;
  canvas.height = pageHeight * 2;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("PDF rendering is unavailable");
  context.scale(2, 2);
  context.direction = rtl ? "rtl" : "ltr";
  context.textAlign = "start";
  context.textBaseline = "top";

  let y = margin;
  let pageNumber = 0;
  const images: Uint8Array[] = [];
  const setFont = (size: number, weight: number) => {
    context.font = `${weight} ${size}px Cairo, Tahoma, sans-serif`;
  };
  const draw = (value: string, x: number, top: number) => context.fillText(value, rtl ? pageWidth - x : x, top);
  const beginPage = () => {
    pageNumber++;
    context.fillStyle = "#fff";
    context.fillRect(0, 0, pageWidth, pageHeight);
    context.fillStyle = "#a73c13";
    setFont(15, 900);
    draw("AWEXEN", margin, margin);
    context.fillRect(margin, margin + 23, contentWidth, 2);
    context.fillStyle = "#525252";
    setFont(9, 400);
    draw(`${reference}  ·  ${pageNumber}`, margin, pageHeight - margin + 5);
    y = margin + 36;
  };
  const finishPage = () => {
    const base64 = canvas.toDataURL("image/jpeg", .94).split(",")[1];
    if (!base64) throw new Error("PDF page rendering failed");
    images.push(Uint8Array.from(atob(base64), (char) => char.charCodeAt(0)));
  };
  const needsPage = (height: number) => y + height > pageHeight - margin;
  const nextPage = () => { finishPage(); beginPage(); };
  const wrap = (value: string, width: number) => value.split(/\r?\n/).flatMap((paragraph) => {
    const lines: string[] = [];
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      if (line && context.measureText(`${line} ${word}`).width > width) {
        lines.push(line);
        line = "";
      }
      if (context.measureText(word).width > width) {
        for (const char of word) {
          if (context.measureText(line + char).width > width) {
            lines.push(line);
            line = "";
          }
          line += char;
        }
      } else {
        line += line ? ` ${word}` : word;
      }
    }
    return [...lines, line];
  });

  beginPage();
  for (const block of blocks) {
    if (block.kind !== "table") {
      const size = block.kind === "title" ? 22 : block.kind === "heading" ? 14 : 10.5;
      const weight = block.kind === "text" ? 400 : 700;
      const lineHeight = size * 1.53;
      setFont(size, weight);
      const lines = wrap(block.text, contentWidth);
      if (block.kind === "heading" && needsPage(lineHeight + 24)) nextPage();
      for (const line of lines) {
        if (needsPage(lineHeight)) nextPage();
        setFont(size, weight);
        context.fillStyle = "#191919";
        draw(line, margin, y);
        y += lineHeight;
      }
      y += 5;
      continue;
    }
    const lineHeight = 15;
    const columns = block.columns.length;
    const firstWidth = contentWidth * .37;
    const widths = [firstWidth, ...Array<number>(columns - 1).fill((contentWidth - firstWidth) / (columns - 1))];
    const measureRow = (row: string[], header = false) => {
      setFont(9, header ? 700 : 400);
      return row.map((value, index) => wrap(value, widths[index] - 10));
    };
    const headerLines = measureRow(block.columns, true);
    const heightFor = (cells: string[][]) => Math.max(...cells.map((lines) => lines.length)) * lineHeight + 8;
    const renderRow = (cells: string[][], header = false) => {
      const height = heightFor(cells);
      context.fillStyle = header ? "#f1e7e0" : "#fff";
      context.fillRect(margin, y, contentWidth, height);
      context.fillStyle = "#191919";
      setFont(9, header ? 700 : 400);
      let x = margin + 5;
      cells.forEach((lines, index) => {
        lines.forEach((line, lineIndex) => draw(line, x, y + 4 + lineIndex * lineHeight));
        x += widths[index];
      });
      y += height;
      context.fillStyle = "#ddd";
      context.fillRect(margin, y - 1, contentWidth, 1);
    };
    if (needsPage(heightFor(headerLines) + lineHeight + 8)) nextPage();
    renderRow(headerLines, true);
    for (const row of block.rows) {
      const cells = measureRow(row);
      if (needsPage(heightFor(cells))) {
        nextPage();
        renderRow(headerLines, true);
      }
      let remaining = cells;
      while (remaining.some((cell) => cell.length)) {
        const capacity = Math.max(1, Math.floor((pageHeight - margin - y - 8) / lineHeight));
        renderRow(remaining.map((cell) => cell.slice(0, capacity)));
        remaining = remaining.map((cell) => cell.slice(capacity));
        if (remaining.some((cell) => cell.length)) {
          nextPage();
          renderRow(headerLines, true);
        }
      }
    }
    y += 12;
  }
  finishPage();
  const parts = createPdf(images, canvas.width, canvas.height);
  const url = URL.createObjectURL(new Blob(parts, { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${reference.replace(/[^a-z\d_-]/gi, "") || "AWEXEN-estimate"}.pdf`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function createPdf(images: Uint8Array[], pixelWidth: number, pixelHeight: number) {
  const parts: ArrayBuffer[] = [];
  const offsets: number[] = [0];
  let length = 0;
  const append = (value: string | Uint8Array) => {
    const bytes = typeof value === "string" ? encoder.encode(value) : value;
    parts.push(Uint8Array.from(bytes).buffer);
    length += bytes.length;
  };
  const object = (...values: (string | Uint8Array)[]) => {
    const id = offsets.length;
    offsets.push(length);
    append(`${id} 0 obj\n`);
    values.forEach(append);
    append("\nendobj\n");
  };
  append("%PDF-1.4\n");
  object("<< /Type /Catalog /Pages 2 0 R >>");
  const pageRefs = images.map((_, index) => `${3 + index * 3} 0 R`).join(" ");
  object(`<< /Type /Pages /Count ${images.length} /Kids [${pageRefs}] >>`);
  images.forEach((image, index) => {
    const pageId = 3 + index * 3;
    const content = `q ${pageWidth} 0 0 ${pageHeight} 0 0 cm /PageImage Do Q\n`;
    object(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /PageImage ${pageId + 2} 0 R >> >> /Contents ${pageId + 1} 0 R >>`);
    object(`<< /Length ${content.length} >>\nstream\n${content}endstream`);
    object(`<< /Type /XObject /Subtype /Image /Width ${pixelWidth} /Height ${pixelHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.length} >>\nstream\n`, image, "\nendstream");
  });
  const indexOffset = length;
  append(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`);
  offsets.slice(1).forEach((offset) => append(`${String(offset).padStart(10, "0")} 00000 n \n`));
  append(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${indexOffset}\n%%EOF\n`);
  return parts;
}

export type { PdfBlock };
