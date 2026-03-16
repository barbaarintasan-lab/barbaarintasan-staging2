import { jsPDF } from "jspdf";

interface CertificateData {
  parentName: string;
  courseName: string;
  courseNameEnglish?: string;
  completionDate: Date;
  enrollmentDate?: Date;
  courseDuration?: string;
  lessonTopics?: string[];
  courseSections?: string[];
  logoBase64?: string;
  signatureBase64?: string;
}

function drawDecorativeBorder(doc: jsPDF, pageWidth: number, pageHeight: number) {
  doc.setDrawColor(26, 54, 93);
  doc.setLineWidth(2.5);
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16);

  doc.setDrawColor(196, 164, 105);
  doc.setLineWidth(1.2);
  doc.rect(12, 12, pageWidth - 24, pageHeight - 24);

  doc.setDrawColor(26, 54, 93);
  doc.setLineWidth(0.3);
  doc.rect(14.5, 14.5, pageWidth - 29, pageHeight - 29);

  const cs = 12;
  doc.setFillColor(196, 164, 105);
  doc.triangle(8, 8, 8 + cs, 8, 8, 8 + cs, "F");
  doc.triangle(pageWidth - 8, 8, pageWidth - 8 - cs, 8, pageWidth - 8, 8 + cs, "F");
  doc.triangle(8, pageHeight - 8, 8 + cs, pageHeight - 8, 8, pageHeight - 8 - cs, "F");
  doc.triangle(pageWidth - 8, pageHeight - 8, pageWidth - 8 - cs, pageHeight - 8, pageWidth - 8, pageHeight - 8 - cs, "F");

  const ornW = 40;
  doc.setDrawColor(196, 164, 105);
  doc.setLineWidth(0.5);
  const topY = 12;
  doc.line(pageWidth / 2 - ornW, topY, pageWidth / 2 + ornW, topY);
  doc.line(pageWidth / 2 - ornW + 5, topY - 1.5, pageWidth / 2 + ornW - 5, topY - 1.5);
  const botY = pageHeight - 12;
  doc.line(pageWidth / 2 - ornW, botY, pageWidth / 2 + ornW, botY);
  doc.line(pageWidth / 2 - ornW + 5, botY + 1.5, pageWidth / 2 + ornW - 5, botY + 1.5);
}

function drawLogo(doc: jsPDF, centerX: number, y: number, logoBase64?: string) {
  const logoSize = 22;
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", centerX - logoSize / 2, y, logoSize, logoSize);
      return;
    } catch {}
  }
  doc.setFillColor(26, 54, 93);
  doc.circle(centerX, y + logoSize / 2, logoSize / 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("BA", centerX, y + logoSize / 2 + 3, { align: "center" });
}

function drawSignatureBlock(
  doc: jsPDF,
  x: number,
  y: number,
  signatureBase64?: string,
  labelName?: string,
  labelRole?: string
) {
  if (signatureBase64) {
    try {
      doc.addImage(signatureBase64, "PNG", x - 25, y - 16, 50, 14);
    } catch {}
  }
  doc.setDrawColor(26, 54, 93);
  doc.setLineWidth(0.4);
  doc.line(x - 35, y, x + 35, y);

  doc.setTextColor(26, 54, 93);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(labelName || "Ustaad Musse Said Aw-Musse", x, y + 5, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(7.5);
  doc.text(labelRole || "Aasaasaha Barbaarintasan Academy", x, y + 10, { align: "center" });
}

function formatDuration(enrollmentDate?: Date, completionDate?: Date, courseDuration?: string): { so: string; en: string } {
  if (courseDuration) {
    return { so: courseDuration, en: courseDuration };
  }
  if (enrollmentDate && completionDate) {
    const diffMs = completionDate.getTime() - enrollmentDate.getTime();
    const days = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
    if (days < 7) {
      return { so: `${days} maalmood`, en: `${days} day${days > 1 ? "s" : ""}` };
    } else if (days < 30) {
      const weeks = Math.round(days / 7);
      return { so: `${weeks} toddobaad`, en: `${weeks} week${weeks > 1 ? "s" : ""}` };
    } else {
      const months = Math.round(days / 30);
      return { so: `${months} bilood`, en: `${months} month${months > 1 ? "s" : ""}` };
    }
  }
  return { so: "", en: "" };
}

function formatDateSomali(date: Date): string {
  const months = [
    "Janaayo", "Febraayo", "Maarso", "Abriil", "Maajo", "Juun",
    "Luulyo", "Agoosto", "Sebtembar", "Oktoobar", "Nofembar", "Diseembar"
  ];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function formatDateEnglish(date: Date): string {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function drawTopics(doc: jsPDF, topics: string[], startY: number, centerX: number, maxWidth: number): number {
  if (!topics || topics.length === 0) return startY;

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);

  const topicsPerRow = 2;
  const colWidth = maxWidth / topicsPerRow;
  let y = startY;

  for (let i = 0; i < Math.min(topics.length, 12); i++) {
    const col = i % topicsPerRow;
    const row = Math.floor(i / topicsPerRow);
    const x = centerX - maxWidth / 2 + col * colWidth + colWidth / 2;
    if (col === 0 && i > 0) y += 4.5;

    const topicText = `${i + 1}. ${topics[i]}`;
    const truncated = topicText.length > 45 ? topicText.substring(0, 42) + "..." : topicText;
    doc.text(truncated, x, startY + row * 4.5, { align: "center" });
  }

  const totalRows = Math.ceil(Math.min(topics.length, 12) / topicsPerRow);
  return startY + totalRows * 4.5 + 2;
}

export async function generateCertificate(data: CertificateData): Promise<void> {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const centerX = pageWidth / 2;
  const duration = formatDuration(data.enrollmentDate, data.completionDate, data.courseDuration);
  const certId = `BA-${Date.now().toString(36).toUpperCase()}`;

  // ==================== PAGE 1: SOMALI ====================
  doc.setFillColor(255, 253, 248);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  drawDecorativeBorder(doc, pageWidth, pageHeight);
  drawLogo(doc, centerX, 22, data.logoBase64);

  doc.setTextColor(26, 54, 93);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("BARBAARINTASAN ACADEMY", centerX, 50, { align: "center" });

  doc.setTextColor(196, 164, 105);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Waxbarasho Online ah oo Waalidnimo", centerX, 55.5, { align: "center" });

  doc.setDrawColor(196, 164, 105);
  doc.setLineWidth(0.4);
  doc.line(centerX - 50, 59, centerX + 50, 59);

  doc.setTextColor(26, 54, 93);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text("SHAHAADO", centerX, 71, { align: "center" });

  doc.setTextColor(120, 120, 120);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Waxa loo bixiyey", centerX, 79, { align: "center" });

  doc.setTextColor(26, 54, 93);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text(data.parentName, centerX, 92, { align: "center" });

  const nameWidth = doc.getTextWidth(data.parentName);
  doc.setDrawColor(196, 164, 105);
  doc.setLineWidth(0.6);
  doc.line(centerX - nameWidth / 2 - 10, 96, centerX + nameWidth / 2 + 10, 96);

  doc.setTextColor(80, 80, 80);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Waxaa si guul leh u dhameeyey koorsada:", centerX, 106, { align: "center" });

  doc.setTextColor(26, 54, 93);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(data.courseName, centerX, 115, { align: "center" });

  let currentY = 122;

  const topicsList = data.courseSections && data.courseSections.length > 0 ? data.courseSections : data.lessonTopics;
  if (topicsList && topicsList.length > 0) {
    doc.setTextColor(120, 120, 120);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    const label = data.courseSections && data.courseSections.length > 0 ? "Qaybaha Koorsada:" : "Mawduucyada la baray:";
    doc.text(label, centerX, currentY, { align: "center" });
    currentY += 5;
    currentY = drawTopics(doc, topicsList, currentY, centerX, 200);
  }

  const detailsY = Math.max(currentY + 2, 148);
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  const soDate = formatDateSomali(data.completionDate);
  doc.text(`Taariikhda Dhamaystirka: ${soDate}`, centerX, detailsY, { align: "center" });

  if (duration.so) {
    doc.text(`Mudada Koorsada: ${duration.so}`, centerX, detailsY + 5, { align: "center" });
  }

  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text("Waxaa lagu qaatay Online - Barbaarintasan Academy", centerX, detailsY + (duration.so ? 11 : 6), { align: "center" });

  const sigY = pageHeight - 28;
  drawSignatureBlock(doc, centerX, sigY, data.signatureBase64, "Ustaad Musse Said Aw-Musse", "Aasaasaha Barbaarintasan Academy");

  doc.setTextColor(180, 180, 180);
  doc.setFontSize(6.5);
  doc.text(`Lambarka Shahaadada: ${certId}`, pageWidth - 18, pageHeight - 12, { align: "right" });
  doc.text("www.barbaarintasan.com", 18, pageHeight - 12);

  // ==================== PAGE 2: ENGLISH ====================
  doc.addPage("a4", "landscape");

  doc.setFillColor(255, 253, 248);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  drawDecorativeBorder(doc, pageWidth, pageHeight);
  drawLogo(doc, centerX, 22, data.logoBase64);

  doc.setTextColor(26, 54, 93);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("BARBAARINTASAN ACADEMY", centerX, 50, { align: "center" });

  doc.setTextColor(196, 164, 105);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Online Parenting Education", centerX, 55.5, { align: "center" });

  doc.setDrawColor(196, 164, 105);
  doc.setLineWidth(0.4);
  doc.line(centerX - 50, 59, centerX + 50, 59);

  doc.setTextColor(26, 54, 93);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text("CERTIFICATE", centerX, 71, { align: "center" });

  doc.setTextColor(120, 120, 120);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("This is to certify that", centerX, 79, { align: "center" });

  doc.setTextColor(26, 54, 93);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text(data.parentName, centerX, 92, { align: "center" });

  const nameWidthEn = doc.getTextWidth(data.parentName);
  doc.setDrawColor(196, 164, 105);
  doc.setLineWidth(0.6);
  doc.line(centerX - nameWidthEn / 2 - 10, 96, centerX + nameWidthEn / 2 + 10, 96);

  doc.setTextColor(80, 80, 80);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("has successfully completed the course:", centerX, 106, { align: "center" });

  const enCourseName = data.courseNameEnglish || data.courseName;
  doc.setTextColor(26, 54, 93);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(enCourseName, centerX, 115, { align: "center" });

  let currentYEn = 122;

  const topicsListEn = data.courseSections && data.courseSections.length > 0 ? data.courseSections : data.lessonTopics;
  if (topicsListEn && topicsListEn.length > 0) {
    doc.setTextColor(120, 120, 120);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    const labelEn = data.courseSections && data.courseSections.length > 0 ? "Course Sections:" : "Topics covered:";
    doc.text(labelEn, centerX, currentYEn, { align: "center" });
    currentYEn += 5;
    currentYEn = drawTopics(doc, topicsListEn, currentYEn, centerX, 200);
  }

  const detailsYEn = Math.max(currentYEn + 2, 148);
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  const enDate = formatDateEnglish(data.completionDate);
  doc.text(`Date of Completion: ${enDate}`, centerX, detailsYEn, { align: "center" });

  if (duration.en) {
    doc.text(`Course Duration: ${duration.en}`, centerX, detailsYEn + 5, { align: "center" });
  }

  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text("Completed Online at Barbaarintasan Academy", centerX, detailsYEn + (duration.en ? 11 : 6), { align: "center" });

  const sigYEn = pageHeight - 28;
  drawSignatureBlock(doc, centerX, sigYEn, data.signatureBase64, "Ustaad Musse Said Aw-Musse", "Founder, Barbaarintasan Academy");

  doc.setTextColor(180, 180, 180);
  doc.setFontSize(6.5);
  doc.text(`Certificate ID: ${certId}`, pageWidth - 18, pageHeight - 12, { align: "right" });
  doc.text("www.barbaarintasan.com", 18, pageHeight - 12);

  const sanitize = (str: string) =>
    str.replace(/[^a-zA-Z0-9\u0600-\u06FF\s-]/g, "").replace(/\s+/g, "-").substring(0, 50);
  const fileName = `Shahaado-${sanitize(data.courseName)}-${sanitize(data.parentName)}.pdf`;
  doc.save(fileName);
}

export async function generateCertificateBlob(data: CertificateData): Promise<{ blob: Blob; fileName: string }> {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const centerX = pageWidth / 2;
  const duration = formatDuration(data.enrollmentDate, data.completionDate, data.courseDuration);
  const certId = `BA-${Date.now().toString(36).toUpperCase()}`;

  drawDecorativeBorder(doc, pageWidth, pageHeight);
  if (data.logoBase64) {
    try { doc.addImage(data.logoBase64, "PNG", centerX - 12, 12, 24, 24); } catch {}
  }
  doc.setTextColor(26, 54, 93);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("BARBAARINTASAN ACADEMY", centerX, 45, { align: "center" });
  doc.setTextColor(180, 140, 60);
  doc.setFontSize(16);
  doc.text("SHAHAADADA DHAMAYSTIRKA", centerX, 55, { align: "center" });
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Waxaan shahaado siinaa:", centerX, 68, { align: "center" });
  doc.setTextColor(26, 54, 93);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text(data.parentName.toUpperCase(), centerX, 82, { align: "center" });
  doc.setDrawColor(180, 140, 60);
  doc.setLineWidth(0.5);
  doc.line(centerX - 50, 86, centerX + 50, 86);
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("oo si guul leh u dhameysatay koorsadda:", centerX, 97, { align: "center" });
  doc.setTextColor(26, 54, 93);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(data.courseName, centerX, 115, { align: "center" });

  let currentY = 122;
  const topicsList = data.courseSections && data.courseSections.length > 0 ? data.courseSections : data.lessonTopics;
  if (topicsList && topicsList.length > 0) {
    doc.setTextColor(120, 120, 120);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    const label = data.courseSections && data.courseSections.length > 0 ? "Qaybaha Koorsada:" : "Mawduucyada la baray:";
    doc.text(label, centerX, currentY, { align: "center" });
    currentY += 5;
    currentY = drawTopics(doc, topicsList, currentY, centerX, 200);
  }

  const detailsY = Math.max(currentY + 2, 148);
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const soDate = formatDateSomali(data.completionDate);
  doc.text(`Taariikhda Dhamaystirka: ${soDate}`, centerX, detailsY, { align: "center" });
  if (data.enrollmentDate) {
    const enrollSoDate = formatDateSomali(data.enrollmentDate);
    doc.text(`Taariikhda Diiwaangelinta: ${enrollSoDate}`, centerX, detailsY + 6, { align: "center" });
  }
  if (duration) {
    doc.text(`Muddada Koorsada: ${duration}`, centerX, detailsY + (data.enrollmentDate ? 12 : 6), { align: "center" });
  }

  const sigY = detailsY + (data.enrollmentDate ? 18 : 12) + 3;
  if (data.signatureBase64) {
    try { doc.addImage(data.signatureBase64, "PNG", centerX - 15, sigY - 2, 30, 12); } catch {}
  }
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.3);
  doc.line(centerX - 30, sigY + 11, centerX + 30, sigY + 11);
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(8);
  doc.text("Aasaasaha Barbaarintasan Academy", centerX, sigY + 16, { align: "center" });
  doc.setFontSize(7);
  doc.text("Cabdiraxmaan Maxamed Cabdi (Cade)", centerX, sigY + 20, { align: "center" });
  doc.setTextColor(180, 180, 180);
  doc.setFontSize(6.5);
  doc.text(`Certificate ID: ${certId}`, pageWidth - 18, pageHeight - 12, { align: "right" });
  doc.text("www.barbaarintasan.com", 18, pageHeight - 12);

  doc.addPage("a4", "landscape");
  doc.setFillColor(255, 253, 248);
  doc.rect(0, 0, pageWidth, pageHeight, "F");
  drawDecorativeBorder(doc, pageWidth, pageHeight);
  drawLogo(doc, centerX, 22, data.logoBase64);
  doc.setTextColor(26, 54, 93);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("BARBAARINTASAN ACADEMY", centerX, 50, { align: "center" });
  doc.setTextColor(196, 164, 105);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Online Parenting Education", centerX, 55.5, { align: "center" });
  doc.setDrawColor(196, 164, 105);
  doc.setLineWidth(0.4);
  doc.line(centerX - 50, 59, centerX + 50, 59);
  doc.setTextColor(26, 54, 93);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text("CERTIFICATE", centerX, 71, { align: "center" });
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("This is to certify that", centerX, 79, { align: "center" });
  doc.setTextColor(26, 54, 93);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text(data.parentName, centerX, 92, { align: "center" });
  const nameWidthEn = doc.getTextWidth(data.parentName);
  doc.setDrawColor(196, 164, 105);
  doc.setLineWidth(0.6);
  doc.line(centerX - nameWidthEn / 2 - 10, 96, centerX + nameWidthEn / 2 + 10, 96);
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("has successfully completed the course:", centerX, 106, { align: "center" });
  const enCourseName = data.courseNameEnglish || data.courseName;
  doc.setTextColor(26, 54, 93);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(enCourseName, centerX, 115, { align: "center" });
  let currentYEn = 122;
  const topicsListEn = data.courseSections && data.courseSections.length > 0 ? data.courseSections : data.lessonTopics;
  if (topicsListEn && topicsListEn.length > 0) {
    doc.setTextColor(120, 120, 120);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    const labelEn = data.courseSections && data.courseSections.length > 0 ? "Course Sections:" : "Topics covered:";
    doc.text(labelEn, centerX, currentYEn, { align: "center" });
    currentYEn += 5;
    currentYEn = drawTopics(doc, topicsListEn, currentYEn, centerX, 200);
  }
  const detailsYEn = Math.max(currentYEn + 2, 148);
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const enDate = formatDateEnglish(data.completionDate);
  doc.text(`Date of Completion: ${enDate}`, centerX, detailsYEn, { align: "center" });
  if (duration.en) {
    doc.text(`Course Duration: ${duration.en}`, centerX, detailsYEn + 5, { align: "center" });
  }
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text("Completed Online at Barbaarintasan Academy", centerX, detailsYEn + (duration.en ? 11 : 6), { align: "center" });
  const sigYEn = pageHeight - 28;
  drawSignatureBlock(doc, centerX, sigYEn, data.signatureBase64, "Ustaad Musse Said Aw-Musse", "Founder, Barbaarintasan Academy");
  doc.setTextColor(180, 180, 180);
  doc.setFontSize(6.5);
  doc.text(`Certificate ID: ${certId}`, pageWidth - 18, pageHeight - 12, { align: "right" });
  doc.text("www.barbaarintasan.com", 18, pageHeight - 12);

  const sanitize = (str: string) =>
    str.replace(/[^a-zA-Z0-9\u0600-\u06FF\s-]/g, "").replace(/\s+/g, "-").substring(0, 50);
  const fileName = `Shahaado-${sanitize(data.courseName)}-${sanitize(data.parentName)}.pdf`;
  const blob = doc.output("blob");
  return { blob, fileName };
}

export async function loadLogoAsBase64(): Promise<string | undefined> {
  try {
    const response = await fetch("/api/logo-base64");
    if (response.ok) {
      const data = await response.json();
      return data.base64;
    }
  } catch {
    console.log("Could not load logo");
  }
  return undefined;
}

export async function loadSignatureAsBase64(): Promise<string | undefined> {
  try {
    const response = await fetch("/api/signature-base64");
    if (response.ok) {
      const data = await response.json();
      return data.base64;
    }
  } catch {
    console.log("Could not load signature");
  }
  return undefined;
}
