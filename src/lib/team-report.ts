import logoUrl from "@/assets/team-performance-logo.png";

export type CatKey = "PN" | "PNo" | "A" | "EL" | "EAS" | "EAR";
export type ReportScores = Record<CatKey, number>;

export const REPORT_CATEGORIES: { key: CatKey; label: string; short: string; color: string }[] = [
  { key: "PN", label: "Parent Nourricier", short: "PNr", color: "#e2825a" },
  { key: "PNo", label: "Parent Normatif", short: "PNo", color: "#c98a2e" },
  { key: "A", label: "Adulte", short: "A", color: "#4a6fd0" },
  { key: "EL", label: "Enfant Libre", short: "EL", color: "#3fa863" },
  { key: "EAS", label: "Enfant Adapté Soumis", short: "EAS", color: "#8f68c2" },
  { key: "EAR", label: "Enfant Adapté Rebelle", short: "EAR", color: "#d5503f" },
];

export type ReportMember = { name: string; date: string; scores: ReportScores };
export type TeamReportInput = {
  teamName: string;
  average: ReportScores;
  members: ReportMember[];
  analysis: string;
};

const W = 794;
const H = 1123;
const M = 56;
const INK = "#0f172a";
const MUTED = "#5b6478";
const NAVY = "#123a66";
const LINE = "#dfe4ec";
const SCALE = 2;

type Block =
  | { type: "h1" | "h2" | "h3" | "p" | "li" | "small"; text: string }
  | { type: "space"; h: number }
  | { type: "rule" }
  | { type: "bars"; scores: ReportScores; title: string; maxLabel?: string }
  | { type: "members"; members: ReportMember[] };

function loadLogo(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = logoUrl;
  });
}

function font(ctx: CanvasRenderingContext2D, size: number, weight = "400") {
  ctx.font = `${weight} ${size}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else cur = test;
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

function stripMd(s: string) {
  return s.replace(/\*\*/g, "").replace(/`/g, "").trim();
}

function analysisToBlocks(analysis: string): Block[] {
  const out: Block[] = [];
  for (const raw of analysis.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (/^#{1,6}\s/.test(line)) {
      out.push({ type: "h2", text: stripMd(line.replace(/^#+\s*/, "")) });
    } else if (/^[-*]\s+/.test(line)) {
      out.push({ type: "li", text: stripMd(line.replace(/^[-*]\s+/, "")) });
    } else {
      out.push({ type: "p", text: stripMd(line) });
    }
  }
  return out;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

const BARS_H = 300;

function drawBars(
  ctx: CanvasRenderingContext2D,
  scores: ReportScores,
  x: number,
  y: number,
  w: number,
  title: string,
) {
  font(ctx, 14, "600");
  ctx.fillStyle = INK;
  ctx.textAlign = "left";
  ctx.fillText(title, x, y + 12);

  const top = y + 30;
  const chartH = 190;
  const axisX = x + 26;
  const chartW = w - 26;
  const base = top + chartH;

  // grid + Y axis
  font(ctx, 9);
  ctx.textAlign = "right";
  for (let n = 0; n <= 10; n += 2) {
    const gy = base - (chartH * n) / 10;
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(axisX, gy);
    ctx.lineTo(axisX + chartW, gy);
    ctx.stroke();
    ctx.fillStyle = MUTED;
    ctx.fillText(String(n), axisX - 6, gy + 3);
  }

  const n = REPORT_CATEGORIES.length;
  const slot = chartW / n;
  const barW = Math.min(46, slot * 0.55);
  REPORT_CATEGORIES.forEach((c, i) => {
    const v = Math.max(0, Math.min(10, scores[c.key] ?? 0));
    const bh = (chartH * v) / 10;
    const bx = axisX + slot * i + (slot - barW) / 2;
    ctx.fillStyle = c.color;
    if (bh > 0) {
      roundRect(ctx, bx, base - bh, barW, bh, 10);
      ctx.fill();
    } else {
      ctx.fillStyle = LINE;
      ctx.fillRect(bx, base - 2, barW, 2);
    }
    ctx.textAlign = "center";
    font(ctx, 12, "700");
    ctx.fillStyle = INK;
    ctx.fillText(String(v), bx + barW / 2, base - bh - 8);
    font(ctx, 11, "600");
    ctx.fillStyle = INK;
    ctx.fillText(c.short, bx + barW / 2, base + 18);
    font(ctx, 8);
    ctx.fillStyle = MUTED;
    const words = c.label.split(" ");
    ctx.fillText(words.slice(0, 2).join(" "), bx + barW / 2, base + 31);
    if (words.length > 2) ctx.fillText(words.slice(2).join(" "), bx + barW / 2, base + 41);
  });
  ctx.textAlign = "left";
}

function membersHeight(members: ReportMember[]) {
  return 26 + members.length * 20;
}

function drawMembers(
  ctx: CanvasRenderingContext2D,
  members: ReportMember[],
  x: number,
  y: number,
  w: number,
) {
  font(ctx, 10, "700");
  ctx.fillStyle = MUTED;
  ctx.fillText("MEMBRE", x, y + 10);
  const cols = REPORT_CATEGORIES.length;
  const colW = 46;
  const startX = x + w - cols * colW;
  ctx.textAlign = "center";
  REPORT_CATEGORIES.forEach((c, i) => {
    ctx.fillText(c.short, startX + i * colW + colW / 2, y + 10);
  });
  ctx.textAlign = "left";
  ctx.strokeStyle = LINE;
  ctx.beginPath();
  ctx.moveTo(x, y + 18);
  ctx.lineTo(x + w, y + 18);
  ctx.stroke();

  members.forEach((m, idx) => {
    const ry = y + 34 + idx * 20;
    font(ctx, 11);
    ctx.fillStyle = INK;
    const name = m.name.length > 46 ? `${m.name.slice(0, 44)}…` : m.name;
    ctx.fillText(name, x, ry);
    ctx.textAlign = "center";
    REPORT_CATEGORIES.forEach((c, i) => {
      font(ctx, 11, "600");
      ctx.fillStyle = c.color;
      ctx.fillText(String(m.scores[c.key] ?? 0), startX + i * colW + colW / 2, ry);
    });
    ctx.textAlign = "left";
  });
}

function blockHeight(ctx: CanvasRenderingContext2D, b: Block, w: number): number {
  switch (b.type) {
    case "space":
      return b.h;
    case "rule":
      return 18;
    case "bars":
      return BARS_H;
    case "members":
      return membersHeight(b.members);
    case "h1":
      font(ctx, 22, "700");
      return wrap(ctx, b.text, w).length * 30 + 8;
    case "h2":
      font(ctx, 15, "700");
      return wrap(ctx, b.text, w).length * 22 + 10;
    case "h3":
      font(ctx, 13, "700");
      return wrap(ctx, b.text, w).length * 20 + 6;
    case "small":
      font(ctx, 10);
      return wrap(ctx, b.text, w).length * 15 + 4;
    case "li":
      font(ctx, 11.5);
      return wrap(ctx, b.text, w - 16).length * 17 + 5;
    default:
      font(ctx, 11.5);
      return wrap(ctx, b.text, w).length * 17 + 6;
  }
}

function drawBlock(ctx: CanvasRenderingContext2D, b: Block, x: number, y: number, w: number) {
  switch (b.type) {
    case "space":
      return;
    case "rule":
      ctx.strokeStyle = LINE;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y + 8);
      ctx.lineTo(x + w, y + 8);
      ctx.stroke();
      return;
    case "bars":
      drawBars(ctx, b.scores, x, y, w, b.title);
      return;
    case "members":
      drawMembers(ctx, b.members, x, y, w);
      return;
    case "h1": {
      font(ctx, 22, "700");
      ctx.fillStyle = NAVY;
      wrap(ctx, b.text, w).forEach((l, i) => ctx.fillText(l, x, y + 22 + i * 30));
      return;
    }
    case "h2": {
      font(ctx, 15, "700");
      ctx.fillStyle = NAVY;
      wrap(ctx, b.text, w).forEach((l, i) => ctx.fillText(l, x, y + 16 + i * 22));
      return;
    }
    case "h3": {
      font(ctx, 13, "700");
      ctx.fillStyle = INK;
      wrap(ctx, b.text, w).forEach((l, i) => ctx.fillText(l, x, y + 14 + i * 20));
      return;
    }
    case "small": {
      font(ctx, 10);
      ctx.fillStyle = MUTED;
      wrap(ctx, b.text, w).forEach((l, i) => ctx.fillText(l, x, y + 11 + i * 15));
      return;
    }
    case "li": {
      font(ctx, 11.5);
      ctx.fillStyle = INK;
      const lines = wrap(ctx, b.text, w - 16);
      ctx.fillStyle = NAVY;
      ctx.beginPath();
      ctx.arc(x + 4, y + 8, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#333c4d";
      lines.forEach((l, i) => ctx.fillText(l, x + 16, y + 12 + i * 17));
      return;
    }
    default: {
      font(ctx, 11.5);
      ctx.fillStyle = "#333c4d";
      wrap(ctx, b.text, w).forEach((l, i) => ctx.fillText(l, x, y + 12 + i * 17));
    }
  }
}

function newPage(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(SCALE, SCALE);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = "alphabetic";
  return { canvas, ctx };
}

function drawHeader(
  ctx: CanvasRenderingContext2D,
  logo: HTMLImageElement | null,
  first: boolean,
  subtitle: string,
): number {
  if (first) {
    ctx.fillStyle = "#f4f7fb";
    ctx.fillRect(0, 0, W, 168);
    ctx.fillStyle = NAVY;
    ctx.fillRect(0, 166, W, 3);
    if (logo) {
      const lw = 300;
      const lh = (logo.height / logo.width) * lw;
      ctx.drawImage(logo, M, 40, lw, lh);
    } else {
      font(ctx, 26, "700");
      ctx.fillStyle = NAVY;
      ctx.fillText("TEAM PERFORMANCE", M, 90);
    }
    font(ctx, 10, "700");
    ctx.fillStyle = MUTED;
    ctx.textAlign = "right";
    ctx.fillText("ANALYSE TRANSACTIONNELLE — ÉGOGRAMME D'ÉQUIPE", W - M, 70);
    font(ctx, 10);
    ctx.fillText(subtitle, W - M, 88);
    ctx.textAlign = "left";
    return 200;
  }
  if (logo) {
    const lw = 124;
    const lh = (logo.height / logo.width) * lw;
    ctx.drawImage(logo, M, 22, lw, lh);
  } else {
    font(ctx, 13, "700");
    ctx.fillStyle = NAVY;
    ctx.fillText("TEAM PERFORMANCE", M, 48);
  }
  font(ctx, 9);
  ctx.fillStyle = MUTED;
  ctx.textAlign = "right";
  ctx.fillText(subtitle, W - M, 50);
  ctx.textAlign = "left";
  ctx.strokeStyle = LINE;
  ctx.beginPath();
  ctx.moveTo(M, 96);
  ctx.lineTo(W - M, 96);
  ctx.stroke();
  return 120;
}

function drawFooter(ctx: CanvasRenderingContext2D, page: number, total: number) {
  font(ctx, 9);
  ctx.fillStyle = MUTED;
  ctx.fillText("Team Performance — rapport confidentiel", M, H - 30);
  ctx.textAlign = "right";
  ctx.fillText(`Page ${page}/${total}`, W - M, H - 30);
  ctx.textAlign = "left";
}

export async function renderTeamReportPages(input: TeamReportInput): Promise<HTMLCanvasElement[]> {
  const logo = await loadLogo();
  const title = input.teamName.trim() || "Analyse d'équipe";
  const now = new Date().toLocaleDateString("fr-FR", { dateStyle: "long" });
  const subtitle = `${title} · ${now}`;

  const blocks: Block[] = [
    { type: "h1", text: `Analyse d'équipe — ${title}` },
    { type: "small", text: `Généré le ${now} · ${input.members.length} membre(s) analysé(s)` },
    { type: "space", h: 12 },
    { type: "bars", scores: input.average, title: "Égogramme moyen de l'équipe" },
    { type: "space", h: 8 },
    { type: "h2", text: "Membres et scores" },
    { type: "members", members: input.members },
    { type: "space", h: 14 },
    { type: "rule" },
    { type: "h2", text: "Analyse transactionnelle" },
    ...analysisToBlocks(input.analysis),
    { type: "space", h: 10 },
    { type: "rule" },
    { type: "h1", text: "Annexe — résultats individuels" },
    { type: "space", h: 6 },
  ];

  input.members.forEach((m) => {
    blocks.push({
      type: "bars",
      scores: m.scores,
      title: `${m.name}${m.date ? ` — ${m.date}` : ""}`,
    });
    blocks.push({ type: "space", h: 10 });
  });

  const pages: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D }[] = [];
  const contentW = W - M * 2;
  const bottom = H - 60;

  let page = newPage();
  let y = drawHeader(page.ctx, logo, true, subtitle);
  pages.push(page);

  for (let bi = 0; bi < blocks.length; bi++) {
    const b = blocks[bi];
    const h = blockHeight(page.ctx, b, contentW);
    let need = h;
    if (b.type === "h1" || b.type === "h2" || b.type === "h3") {
      const next = blocks[bi + 1];
      if (next) need += Math.min(blockHeight(page.ctx, next, contentW), 60);
    }
    if (y + need > bottom && b.type !== "space") {
      page = newPage();
      pages.push(page);
      y = drawHeader(page.ctx, logo, false, subtitle);
    }
    drawBlock(page.ctx, b, M, y, contentW);
    y += h;
  }

  pages.forEach((p, i) => drawFooter(p.ctx, i + 1, pages.length));
  return pages.map((p) => p.canvas);
}

function fileBase(teamName: string) {
  const slug = (teamName.trim() || "equipe")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const d = new Date().toISOString().slice(0, 10);
  return `analyse-equipe-${slug}-${d}`;
}

function triggerDownload(url: string, name: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
}

export async function downloadTeamReportPdf(input: TeamReportInput) {
  const pages = await renderTeamReportPages(input);
  const { default: JsPDF } = await import("jspdf");
  const pdf = new JsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  pages.forEach((c, i) => {
    if (i > 0) pdf.addPage();
    pdf.addImage(c.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, pw, ph);
  });
  pdf.save(`${fileBase(input.teamName)}.pdf`);
}

export async function downloadTeamReportImage(input: TeamReportInput) {
  const pages = await renderTeamReportPages(input);
  const out = document.createElement("canvas");
  const gap = 24 * SCALE;
  out.width = W * SCALE;
  out.height = pages.length * H * SCALE + gap * (pages.length - 1);
  const ctx = out.getContext("2d")!;
  ctx.fillStyle = "#e6eaf1";
  ctx.fillRect(0, 0, out.width, out.height);
  pages.forEach((c, i) => ctx.drawImage(c, 0, i * (H * SCALE + gap)));
  triggerDownload(out.toDataURL("image/png"), `${fileBase(input.teamName)}.png`);
}
