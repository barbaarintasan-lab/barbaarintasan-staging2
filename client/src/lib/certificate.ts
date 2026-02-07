import { jsPDF } from "jspdf";

interface CertificateData {
  parentName: string;
  courseName: string;
  completionDate: Date;
  logoBase64?: string;
  signatureBase64?: string;
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

  // Background gradient effect with border
  doc.setFillColor(252, 252, 253);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // Decorative border
  doc.setDrawColor(59, 130, 246); // Blue
  doc.setLineWidth(3);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
  
  doc.setDrawColor(249, 115, 22); // Orange accent
  doc.setLineWidth(1);
  doc.rect(15, 15, pageWidth - 30, pageHeight - 30);

  // Corner decorations
  const cornerSize = 20;
  doc.setFillColor(59, 130, 246);
  // Top left corner
  doc.triangle(10, 10, 10 + cornerSize, 10, 10, 10 + cornerSize, "F");
  // Top right corner
  doc.triangle(pageWidth - 10, 10, pageWidth - 10 - cornerSize, 10, pageWidth - 10, 10 + cornerSize, "F");
  // Bottom left corner
  doc.triangle(10, pageHeight - 10, 10 + cornerSize, pageHeight - 10, 10, pageHeight - 10 - cornerSize, "F");
  // Bottom right corner
  doc.triangle(pageWidth - 10, pageHeight - 10, pageWidth - 10 - cornerSize, pageHeight - 10, pageWidth - 10, pageHeight - 10 - cornerSize, "F");

  // Logo placeholder (circle with initials if no logo provided)
  const logoY = 30;
  const logoSize = 25;
  
  if (data.logoBase64) {
    try {
      doc.addImage(data.logoBase64, "PNG", centerX - logoSize/2, logoY, logoSize, logoSize);
    } catch {
      // Fallback circle
      doc.setFillColor(59, 130, 246);
      doc.circle(centerX, logoY + logoSize/2, logoSize/2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.text("BA", centerX, logoY + logoSize/2 + 3, { align: "center" });
    }
  } else {
    doc.setFillColor(59, 130, 246);
    doc.circle(centerX, logoY + logoSize/2, logoSize/2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("BA", centerX, logoY + logoSize/2 + 3, { align: "center" });
  }

  // Academy name
  doc.setTextColor(59, 130, 246);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("BARBAARINTASAN ACADEMY", centerX, logoY + logoSize + 12, { align: "center" });

  // Certificate title
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(32);
  doc.setFont("helvetica", "bold");
  doc.text("SHAHAADO", centerX, 85, { align: "center" });

  // Subtitle
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Waxa loo bixiyey", centerX, 95, { align: "center" });

  // Parent name
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text(data.parentName, centerX, 115, { align: "center" });

  // Decorative line under name
  const nameWidth = doc.getTextWidth(data.parentName);
  doc.setDrawColor(249, 115, 22);
  doc.setLineWidth(1);
  doc.line(centerX - nameWidth/2 - 10, 120, centerX + nameWidth/2 + 10, 120);

  // Course completion text
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Waxaa si guul leh u dhammeeyo koorsada:", centerX, 135, { align: "center" });

  // Course name
  doc.setTextColor(59, 130, 246);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(data.courseName, centerX, 148, { align: "center" });

  // Completion date - with fallback formatting
  let formattedDate: string;
  try {
    formattedDate = data.completionDate.toLocaleDateString("so-SO", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    // Fallback to standard format if Somali locale not supported
    const day = data.completionDate.getDate();
    const month = data.completionDate.getMonth() + 1;
    const year = data.completionDate.getFullYear();
    formattedDate = `${day}/${month}/${year}`;
  }
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Taariikhda: ${formattedDate}`, centerX, 160, { align: "center" });

  // Signature section
  const signatureY = 175;
  
  // Add signature image if available
  if (data.signatureBase64) {
    try {
      doc.addImage(data.signatureBase64, "PNG", 70, signatureY - 18, 50, 15);
    } catch {
      console.log("Could not add signature image");
    }
  }
  
  // Signature line and label - left side
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.5);
  doc.line(60, signatureY, 130, signatureY);
  
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Ustaad Musse Said Aw-Musse", 95, signatureY + 7, { align: "center" });
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(9);
  doc.text("Aasaasaha Barbaarintasan Academy", 95, signatureY + 13, { align: "center" });

  // Certificate ID on the right
  const certId = `BA-${Date.now().toString(36).toUpperCase()}`;
  doc.setTextColor(180, 180, 180);
  doc.setFontSize(8);
  doc.text(`Lambarka: ${certId}`, pageWidth - 20, signatureY + 13, { align: "right" });

  // Save the PDF - sanitize filename to remove special characters
  const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9\u0600-\u06FF\s-]/g, "").replace(/\s+/g, "-").substring(0, 50);
  const fileName = `Shahaado-${sanitize(data.courseName)}-${sanitize(data.parentName)}.pdf`;
  doc.save(fileName);
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
