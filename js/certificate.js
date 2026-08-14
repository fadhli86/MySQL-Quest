// Canvas-rendered completion certificate. Drawn directly onto a <canvas>
// so the on-screen preview and the downloaded PNG are always identical
// (no separate HTML-to-image conversion library needed).
import { buildVerifyParams } from "./certverify.js";

const LECTURER_NAME = "Dr. Fadhli Almu'iini Ahda, S.Kom., M.Kom.";
const LECTURER_ROLE = "Dosen Pengampu Mata Kuliah Database MySQL";

const FONT_LINK_ID = "mq-certificate-fonts";

export function ensureCertificateFonts() {
  if (document.getElementById(FONT_LINK_ID)) return;
  const link = document.createElement("link");
  link.id = FONT_LINK_ID;
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Great+Vibes&family=Cormorant+Garamond:wght@500;600;700&display=swap";
  document.head.appendChild(link);
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h.toString(36).toUpperCase();
}

export function makeCertId(studentName, completedAt) {
  return `MQ-${hashCode(`${studentName}|${completedAt}`)}`;
}

export function getVerifyBaseUrl() {
  const href = window.location.href.split("#")[0].split("?")[0];
  return href.replace(/index\.html$/, "");
}

export function buildVerifyUrl(data) {
  const params = buildVerifyParams(data);
  return `${getVerifyBaseUrl()}verify.html?${params.toString()}`;
}

function drawQrCode(ctx, dataUrl, x, y, size) {
  const qr = window.qrcode(0, "M");
  qr.addData(dataUrl);
  qr.make();
  const count = qr.getModuleCount();
  const cell = size / count;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x - 10, y - 10, size + 20, size + 20);
  ctx.fillStyle = "#12233f";
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (qr.isDark(row, col)) {
        ctx.fillRect(x + col * cell, y + row * cell, Math.ceil(cell) + 0.5, Math.ceil(cell) + 0.5);
      }
    }
  }
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// opts: { studentName, completedAt(ms), completedDateStr, avgMastery, xp, badgeCount, completedCount, total, certId }
export async function drawCertificate(canvas, opts) {
  const W = 1600;
  const H = 1131; // ~A4 landscape ratio
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  opts.verifyUrl = buildVerifyUrl({
    name: opts.studentName,
    certId: opts.certId,
    completedAt: opts.completedAt,
    mastery: opts.avgMastery,
    xp: opts.xp,
    badgeCount: opts.badgeCount,
  });

  try {
    await Promise.all([
      document.fonts.load('700 90px "Great Vibes"'),
      document.fonts.load('600 34px "Cormorant Garamond"'),
      document.fonts.load('700 34px "Cormorant Garamond"'),
    ]);
  } catch (e) {
    /* fall back to system fonts if webfont load fails (e.g. offline) */
  }

  const NAVY = "#12233f";
  const NAVY_SOFT = "#33507a";
  const GOLD = "#b3872f";
  const GOLD_LIGHT = "#d8b467";
  const CREAM = "#faf6ec";

  // background
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, W, H);

  // subtle inner panel tint
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "#fffdf8");
  grad.addColorStop(1, "#f3ecd9");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // outer gold border
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 6;
  roundRectPath(ctx, 28, 28, W - 56, H - 56, 10);
  ctx.stroke();

  // inner navy border
  ctx.strokeStyle = NAVY;
  ctx.lineWidth = 2;
  roundRectPath(ctx, 46, 46, W - 92, H - 92, 6);
  ctx.stroke();

  // corner ornaments
  ctx.fillStyle = GOLD;
  const corner = (cx, cy, flip) => {
    ctx.save();
    ctx.translate(cx, cy);
    if (flip) ctx.scale(flip[0], flip[1]);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(46, 0);
    ctx.lineTo(0, 46);
    ctx.closePath();
    ctx.globalAlpha = 0.5;
    ctx.fill();
    ctx.restore();
  };
  corner(46, 46, [1, 1]);
  corner(W - 46, 46, [-1, 1]);
  corner(46, H - 46, [1, -1]);
  corner(W - 46, H - 46, [-1, -1]);
  ctx.globalAlpha = 1;

  const centerX = W / 2;

  // header
  ctx.textAlign = "center";
  ctx.fillStyle = NAVY_SOFT;
  ctx.font = '600 26px "Cormorant Garamond", Georgia, serif';
  ctx.fillText("🗄️  M Y S Q L   Q U E S T", centerX, 128);
  ctx.font = '500 19px "Cormorant Garamond", Georgia, serif';
  ctx.fillStyle = "#6b7280";
  ctx.fillText("Interactive Database Learning Game — Mata Kuliah Database MySQL", centerX, 158);

  // seal (top center-ish, small, above title)
  ctx.save();
  ctx.translate(centerX, 210);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 34, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 26, 0, Math.PI * 2);
  ctx.strokeStyle = GOLD_LIGHT;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.font = "30px serif";
  ctx.fillStyle = NAVY;
  ctx.textBaseline = "middle";
  ctx.fillText("🎓", 0, 2);
  ctx.textBaseline = "alphabetic";
  ctx.restore();

  // title
  ctx.fillStyle = NAVY;
  ctx.font = '700 54px "Cormorant Garamond", Georgia, serif';
  ctx.fillText("SERTIFIKAT PENYELESAIAN", centerX, 300);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(centerX - 170, 320);
  ctx.lineTo(centerX + 170, 320);
  ctx.stroke();

  // "diberikan kepada"
  ctx.font = 'italic 500 24px "Cormorant Garamond", Georgia, serif';
  ctx.fillStyle = "#555";
  ctx.fillText("dengan bangga diberikan kepada", centerX, 372);

  // student name — script font
  ctx.fillStyle = NAVY;
  let nameSize = 92;
  ctx.font = `${nameSize}px "Great Vibes", "Segoe Script", cursive`;
  while (ctx.measureText(opts.studentName).width > W - 260 && nameSize > 40) {
    nameSize -= 4;
    ctx.font = `${nameSize}px "Great Vibes", "Segoe Script", cursive`;
  }
  ctx.fillText(opts.studentName, centerX, 470);

  // decorative underline swoosh
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(centerX - 220, 495);
  ctx.quadraticCurveTo(centerX, 515, centerX + 220, 495);
  ctx.stroke();

  // body paragraph
  ctx.fillStyle = NAVY;
  ctx.font = '500 25px "Cormorant Garamond", Georgia, serif';
  const bodyText =
    `atas keberhasilan menyelesaikan seluruh ${opts.total} level pembelajaran interaktif MYSQL QUEST dan mencapai gelar ` +
    `“Database Architect”, dengan rata-rata mastery ${opts.avgMastery}% pada mata kuliah Database MySQL berbasis Outcome-Based Education (OBE).`;
  const bodyLines = wrapText(ctx, bodyText, W - 420);
  let by = 555;
  for (const line of bodyLines) {
    ctx.fillText(line, centerX, by);
    by += 36;
  }

  // stat row
  const stats = [
    [`${opts.completedCount}/${opts.total}`, "LEVEL SELESAI"],
    [`${opts.avgMastery}%`, "RATA-RATA MASTERY"],
    [`${opts.xp}`, "TOTAL XP"],
    [`${opts.badgeCount}`, "BADGE DIRAIH"],
  ];
  const statY = by + 44;
  const statW = 260;
  const totalStatsW = statW * stats.length;
  let sx = centerX - totalStatsW / 2;
  for (const [val, label] of stats) {
    ctx.font = '700 30px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = NAVY;
    ctx.fillText(val, sx + statW / 2, statY);
    ctx.font = '600 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = "#8a7a55";
    ctx.fillText(label, sx + statW / 2, statY + 22);
    sx += statW;
  }

  // divider
  ctx.strokeStyle = "#e2d9bf";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(120, statY + 60);
  ctx.lineTo(W - 120, statY + 60);
  ctx.stroke();

  // bottom row: date (left) + QR verification (center) + signature (right)
  // — three independent zones with explicit boundaries, so the QR and the
  // (variable-width, cursive) signature can never overlap regardless of
  // lecturer name length: the signature auto-shrinks to fit its zone,
  // the same technique used for the student name above.
  const bottomY = H - 150;
  const leftX = 120;
  const rightX = W - 120;

  const qrSize = 120;
  const qrX = centerX - qrSize / 2;
  const qrY = bottomY - 95;
  try {
    drawQrCode(ctx, opts.verifyUrl, qrX, qrY, qrSize);
  } catch (e) {
    /* qrcode lib unavailable (e.g. offline/CDN blocked) — certificate still renders without it */
  }
  ctx.textAlign = "center";
  ctx.font = '600 15px "Cormorant Garamond", Georgia, serif';
  ctx.fillStyle = "#666";
  ctx.fillText("Pindai untuk verifikasi", centerX, qrY + qrSize + 30);

  const dateBlockRight = qrX - 40;
  ctx.textAlign = "left";
  ctx.font = '600 20px "Cormorant Garamond", Georgia, serif';
  ctx.fillStyle = NAVY;
  ctx.fillText("Tanggal Penyelesaian", leftX, bottomY);
  ctx.strokeStyle = NAVY_SOFT;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(leftX, bottomY + 14);
  ctx.lineTo(dateBlockRight, bottomY + 14);
  ctx.stroke();
  ctx.font = '500 22px "Cormorant Garamond", Georgia, serif';
  ctx.fillStyle = "#444";
  ctx.fillText(opts.completedDateStr, leftX, bottomY + 42);

  const sigBlockLeft = qrX + qrSize + 40;
  ctx.textAlign = "right";
  let sigSize = 48;
  ctx.font = `${sigSize}px "Great Vibes", "Segoe Script", cursive`;
  while (ctx.measureText("Fadhli Almu'iini Ahda").width > rightX - sigBlockLeft && sigSize > 22) {
    sigSize -= 2;
    ctx.font = `${sigSize}px "Great Vibes", "Segoe Script", cursive`;
  }
  ctx.fillStyle = NAVY;
  ctx.fillText("Fadhli Almu'iini Ahda", rightX, bottomY - 12);
  ctx.strokeStyle = NAVY_SOFT;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(rightX, bottomY + 14);
  ctx.lineTo(sigBlockLeft, bottomY + 14);
  ctx.stroke();
  ctx.font = '700 20px "Cormorant Garamond", Georgia, serif';
  ctx.fillStyle = NAVY;
  let lecturerSize = 20;
  ctx.font = `700 ${lecturerSize}px "Cormorant Garamond", Georgia, serif`;
  while (ctx.measureText(LECTURER_NAME).width > rightX - sigBlockLeft && lecturerSize > 13) {
    lecturerSize -= 1;
    ctx.font = `700 ${lecturerSize}px "Cormorant Garamond", Georgia, serif`;
  }
  ctx.fillText(LECTURER_NAME, rightX, bottomY + 42);
  ctx.font = '500 16px "Cormorant Garamond", Georgia, serif';
  ctx.fillStyle = "#666";
  ctx.fillText(LECTURER_ROLE, rightX, bottomY + 64);

  // footer fine print
  ctx.textAlign = "center";
  ctx.font = '13px Georgia, serif';
  ctx.fillStyle = "#9a9a9a";
  ctx.fillText(
    `Sertifikat dihasilkan otomatis oleh sistem MYSQL QUEST berdasarkan progres pembelajaran pada perangkat ini — bukan dokumen resmi terverifikasi institusi. ID Sertifikat: ${opts.certId}`,
    centerX,
    H - 50
  );
}

export function downloadCanvasAsPng(canvas, filename) {
  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export { LECTURER_NAME, LECTURER_ROLE };
