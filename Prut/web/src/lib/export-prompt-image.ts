/**
 * Generates a styled PNG image card for a prompt.
 * Uses Canvas API - no external dependencies needed.
 */

interface ExportPromptOptions {
  title: string;
  prompt: string;
  category?: string;
  useCase?: string;
}

export async function exportPromptAsImage({ title, prompt, category, useCase }: ExportPromptOptions): Promise<void> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const width = 1080;
  const height = 1350;
  const padding = 80;
  const contentWidth = width - padding * 2;

  canvas.width = width;
  canvas.height = height;

  // Background
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, width, height);

  // Subtle gradient overlay
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "rgba(245, 158, 11, 0.05)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Border
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.lineWidth = 2;
  ctx.roundRect(20, 20, width - 40, height - 40, 24);
  ctx.stroke();

  // Category badge
  let yPos = padding + 20;
  if (category) {
    ctx.font = "bold 24px sans-serif";
    ctx.fillStyle = "rgba(245, 158, 11, 0.8)";
    const badgeText = category;
    const badgeWidth = ctx.measureText(badgeText).width + 32;
    ctx.fillStyle = "rgba(245, 158, 11, 0.1)";
    ctx.roundRect(padding, yPos - 8, badgeWidth, 40, 20);
    ctx.fill();
    ctx.strokeStyle = "rgba(245, 158, 11, 0.3)";
    ctx.lineWidth = 1;
    ctx.roundRect(padding, yPos - 8, badgeWidth, 40, 20);
    ctx.stroke();
    ctx.fillStyle = "rgba(245, 158, 11, 0.9)";
    ctx.font = "bold 22px sans-serif";
    ctx.fillText(badgeText, padding + 16, yPos + 20);
    yPos += 60;
  }

  // Title
  ctx.font = "bold 48px sans-serif";
  ctx.fillStyle = "#e2e8f0";
  ctx.textAlign = "right";
  const titleLines = wrapText(ctx, title, contentWidth);
  for (const line of titleLines.slice(0, 2)) {
    ctx.fillText(line, width - padding, yPos + 48);
    yPos += 60;
  }
  yPos += 10;

  // Use case
  if (useCase) {
    ctx.font = "400 28px sans-serif";
    ctx.fillStyle = "#94a3b8";
    const useCaseLines = wrapText(ctx, useCase, contentWidth);
    for (const line of useCaseLines.slice(0, 2)) {
      ctx.fillText(line, width - padding, yPos + 28);
      yPos += 40;
    }
    yPos += 20;
  }

  // Separator
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, yPos);
  ctx.lineTo(width - padding, yPos);
  ctx.stroke();
  yPos += 30;

  // Prompt text
  ctx.font = "400 26px sans-serif";
  ctx.fillStyle = "#cbd5e1";
  const promptLines = wrapText(ctx, prompt, contentWidth);
  const maxLines = Math.min(promptLines.length, 25);
  for (let i = 0; i < maxLines; i++) {
    ctx.fillText(promptLines[i], width - padding, yPos + 26);
    yPos += 38;
  }
  if (promptLines.length > maxLines) {
    ctx.fillStyle = "#64748b";
    ctx.fillText("...", width - padding, yPos + 26);
  }

  // Footer branding
  const footerY = height - padding;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.beginPath();
  ctx.moveTo(padding, footerY - 50);
  ctx.lineTo(width - padding, footerY - 50);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.font = "bold 28px sans-serif";
  ctx.fillStyle = "rgba(245, 158, 11, 0.7)";
  ctx.fillText("www.peroot.space", width / 2, footerY - 10);
  ctx.font = "400 20px sans-serif";
  ctx.fillStyle = "#475569";
  ctx.fillText("נוצר עם Peroot - מחולל הפרומפטים המקצועי", width / 2, footerY + 20);

  // Download
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `peroot-prompt-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, "image/png");
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  // Split by explicit newlines first
  const paragraphs = text.split("\n");

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }
    const words = paragraph.split(" ");
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
  }

  return lines;
}
