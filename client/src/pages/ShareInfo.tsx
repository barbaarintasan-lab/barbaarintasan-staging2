import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Download, Share2, CheckCircle, Mic, CreditCard, Trophy, BookOpen, Users, Bell, Smartphone, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import jsPDF from "jspdf";

export default function ShareInfo() {
  const [downloading, setDownloading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handlePdfDownload = async () => {
    setDownloadingPdf(true);
    toast.info("PDF waa la sameynayaa...");
    
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      let y = 20;
      
      // Header
      doc.setFillColor(30, 58, 95);
      doc.rect(0, 0, pageWidth, 55, 'F');
      
      // BSA Logo - left side (amber circle)
      doc.setFillColor(245, 158, 11);
      doc.circle(25, 25, 12, 'F');
      doc.setTextColor(120, 53, 15);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('BSA', 25, 28, { align: 'center' });
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text('BSA', 25, 45, { align: 'center' });
      
      // Title - center
      doc.setTextColor(245, 158, 11);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('Barbaarintasan Academy', pageWidth / 2, 22, { align: 'center' });
      
      doc.setTextColor(147, 197, 253);
      doc.setFontSize(11);
      doc.text('Machadka ugu Weyn ee Tarbiyadda Caruurta Soomaaliyeed', pageWidth / 2, 32, { align: 'center' });
      
      // Sheeko Logo - right side (red rounded square)
      doc.setFillColor(239, 68, 68);
      doc.roundedRect(pageWidth - 37, 13, 24, 24, 4, 4, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('((o))', pageWidth - 25, 28, { align: 'center' });
      doc.setFontSize(8);
      doc.text('Sheeko', pageWidth - 25, 45, { align: 'center' });
      
      y = 65;
      
      // Course start date
      doc.setFillColor(245, 158, 11);
      doc.roundedRect(margin, y, contentWidth, 25, 3, 3, 'F');
      doc.setTextColor(120, 53, 15);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Koorsayada ugu Horeeyaa waxa ay Bilaabmayaan', pageWidth / 2, y + 10, { align: 'center' });
      doc.setFontSize(20);
      doc.text('1 Febraayo 2026', pageWidth / 2, y + 20, { align: 'center' });
      
      y += 35;
      
      // Courses section
      doc.setTextColor(245, 158, 11);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Koorsooyinka Hadda Diyaarka ah', margin, y);
      y += 10;
      
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      const courses = [
        '• Koorsada Ilmo Is-Dabira - Barashada sida loo kobciyo ilmaha',
        '• Koorsada 0-6 Bilood - Hagista waalidka cusub'
      ];
      courses.forEach(course => {
        doc.text(course, margin, y);
        y += 8;
      });
      
      y += 10;
      
      // Benefits section - detailed
      doc.setTextColor(245, 158, 11);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Faa\'idooyinka App-ka', margin, y);
      y += 10;
      
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      
      const benefits = [
        '1. SHEEKO LIVE - Kulan toos ah oo codka ah',
        '   Waxaad ka qayb qaadan kartaa kulamo toos ah.',
        '',
        '2. MAKTABADA - Xarunta Aqoonta',
        '   Buugaag, maqaallo, iyo ilo badan oo waxbarasho.',
        '',
        '3. QURAANKA KARIIMKA',
        '   Dhageyso Quraanka oo ay akhriyeen ilaa 20 Shiikh.',
        '',
        '4. ASAXAADIISTA & DUCOOYINKA',
        '   Asaxaadiis iyo ducooyin muhiim ah oo Soomaali ah.',
        '',
        '5. JADWALKA SALAADA',
        '   Waqtiyada salaadda ee magaaladiina.',
        '',
        '6. QIBLA FINDER',
        '   Jihada Qiblada ee goobta aad joogto.',
        '',
        '7. SHAHAADO - Xaqiijin Rasmi ah',
        '   Shahaado marka aad dhameysato koorso.',
        '',
        '8. CASHAR VIDEO & QORAAL',
        '   Muuqaalo iyo qoraalo fudud oo waxbarasho.',
        '',
        '9. IMTIXAANO INTERACTIVE',
        '   Imtixaanno fudud oo kugu caawinaya barashadaada.'
      ];
      
      benefits.forEach(line => {
        if (line.startsWith('   ')) {
          doc.text(line, margin + 5, y);
        } else if (line !== '') {
          doc.setFont('helvetica', 'bold');
          doc.text(line, margin, y);
          doc.setFont('helvetica', 'normal');
        }
        y += 6;
      });
      
      y += 5;
      
      // Pricing
      doc.setFillColor(34, 197, 94);
      doc.roundedRect(margin, y, contentWidth, 30, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.text('Laba Koorso oo Buuxa oo Casri ah', pageWidth / 2, y + 12, { align: 'center' });
      doc.text('ayaa Sanadkan kuu Diyaar ah', pageWidth / 2, y + 24, { align: 'center' });
      
      y += 40;
      
      // Footer
      doc.setTextColor(30, 58, 95);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('App-ka Soo Dejiso!', pageWidth / 2, y, { align: 'center' });
      doc.setFontSize(16);
      doc.text('appbarbaarintasan.com', pageWidth / 2, y + 10, { align: 'center' });
      
      doc.save('barbaarintasan-academy-info.pdf');
      toast.success("PDF waa la soo dejiyay!");
    } catch (error: any) {
      console.error("PDF download error:", error);
      toast.error(`Khalad: ${error?.message || "PDF ma shaqayn"}`);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    toast.info("Sawirka waa la sameynayaa...");
    
    try {
      // Create canvas with 9:16 aspect ratio (social media optimized)
      const width = 540;
      const height = 960;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      
      // Background gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#1e3a5f');
      gradient.addColorStop(1, '#0f2744');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      
      // Helper function for rounded rectangles
      const drawRoundedRect = (x: number, y: number, w: number, h: number, r: number, fill: string) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
      };
      
      let y = 50;
      
      // Top row: BSA logo (left) - Text (center) - Sheeko logo (right)
      // BSA Logo - left corner
      ctx.beginPath();
      ctx.arc(60, y, 35, 0, Math.PI * 2);
      ctx.fillStyle = '#f59e0b';
      ctx.fill();
      ctx.font = 'bold 16px Arial';
      ctx.fillStyle = '#78350f';
      ctx.textAlign = 'center';
      ctx.fillText('BSA', 60, y + 7);
      
      // Center text - App Casri ah oo Cusub
      ctx.font = 'bold 22px Arial';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText('App Casri ah oo Cusub', width/2, y + 7);
      
      // Sheeko Logo - right corner (red rounded square with broadcast icon)
      drawRoundedRect(width - 95, y - 30, 60, 60, 12, '#ef4444');
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Arial';
      ctx.fillText('((o))', width - 65, y + 8);
      
      y += 70;
      
      // Title
      ctx.font = 'bold 26px Arial';
      ctx.fillStyle = '#f59e0b';
      ctx.textAlign = 'center';
      ctx.fillText('Barbaarintasan Academy', width/2, y);
      
      y += 30;
      
      // Subtitle
      ctx.font = '16px Arial';
      ctx.fillStyle = '#bfdbfe';
      ctx.fillText('Machadka ugu Weyn ee Tarbiyadda', width/2, y);
      ctx.fillText('Caruurta Soomaaliyeed', width/2, y + 20);
      
      y += 50;
      
      // Date banner
      drawRoundedRect(30, y, width - 60, 80, 12, '#f59e0b');
      ctx.fillStyle = '#78350f';
      ctx.font = 'bold 16px Arial';
      ctx.fillText('Koorsayada ugu Horeeyaa waxa ay Bilaabmayaan', width/2, y + 30);
      ctx.font = 'bold 32px Arial';
      ctx.fillText('1 Febraayo 2026', width/2, y + 65);
      
      y += 110;
      
      // Courses section
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('Koorsooyinka Diyaarka ah', 40, y);
      
      y += 30;
      
      // Course items
      drawRoundedRect(30, y, width - 60, 45, 8, 'rgba(255,255,255,0.1)');
      ctx.fillStyle = '#4ade80';
      ctx.font = '20px Arial';
      ctx.fillText('✓', 50, y + 30);
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 16px Arial';
      ctx.fillText('Koorsada Ilmo Is-Dabira', 85, y + 30);
      
      y += 55;
      
      drawRoundedRect(30, y, width - 60, 45, 8, 'rgba(255,255,255,0.1)');
      ctx.fillStyle = '#4ade80';
      ctx.font = '20px Arial';
      ctx.fillText('✓', 50, y + 30);
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 16px Arial';
      ctx.fillText('Koorsada 0-6 Bilood', 85, y + 30);
      
      y += 70;
      
      // Benefits section
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 18px Arial';
      ctx.fillText('Faa\'idooyin', 40, y);
      
      y += 25;
      
      // Benefits grid
      const benefits = ['Sheeko Live', 'Bulsho', 'Shahaado', 'Xasuusin'];
      const boxWidth = (width - 80) / 2;
      benefits.forEach((b, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const bx = 30 + col * (boxWidth + 20);
        const by = y + row * 50;
        drawRoundedRect(bx, by, boxWidth, 40, 8, 'rgba(255,255,255,0.1)');
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(b, bx + boxWidth/2, by + 27);
      });
      
      ctx.textAlign = 'left';
      y += 130;
      
      // Course availability banner
      drawRoundedRect(30, y, width - 60, 80, 12, '#22c55e');
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Laba Koorso oo Buuxa oo Casri ah', width/2, y + 35);
      ctx.fillText('ayaa Sanadkan kuu Diyaar ah', width/2, y + 60);
      
      y += 130;
      
      // Footer
      ctx.fillStyle = '#93c5fd';
      ctx.font = '600 18px Arial';
      ctx.fillText('App-ka Soo Dejiso!', width/2, y);
      ctx.fillStyle = '#60a5fa';
      ctx.font = 'bold 20px Arial';
      ctx.fillText('appbarbaarintasan.com', width/2, y + 30);
      
      // Download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = 'barbaarintasan-academy-info.png';
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
          toast.success("Sawirka waa la soo dejiyay!");
        } else {
          toast.error("Sawirka ma la sameyn karin");
        }
        setDownloading(false);
      }, 'image/png');
      
    } catch (error: any) {
      console.error("Download error:", error);
      toast.error(`Khalad: ${error?.message || "Download ma shaqayn"}`);
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = "https://appbarbaarintasan.com";
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Barbaarintasan Academy',
          text: 'App-ka ugu fiican ee Tarbiyadda Caruurta Soomaaliyeed! Koorsadayadu waxay bilaabmayaan 7.02.2026',
          url: shareUrl,
        });
      } catch (error) {
        navigator.clipboard.writeText(shareUrl);
        toast.success("Link-ka waa la copy-garay!");
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success("Link-ka waa la copy-garay!");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gradient-to-r from-blue-600 to-blue-800 safe-top">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <button className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
            </Link>
            <h1 className="text-white font-bold text-sm">La Wadaag Macluumaadka Ehelka & Asxaabtaada</h1>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-white/20"
              onClick={handleShare}
            >
              <Share2 className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-white/20"
              onClick={handleDownload}
              disabled={downloading}
            >
              <Download className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="p-4">
        <div 
          className="bg-gradient-to-b from-[#1e3a5f] to-[#0f2744] rounded-2xl p-6 text-white shadow-2xl max-w-md mx-auto"
          style={{ aspectRatio: '9/16' }}
        >
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
              <span className="text-4xl">📚</span>
            </div>
            <h1 className="text-2xl font-black text-amber-400 mb-1">Barbaarintasan Academy</h1>
            <p className="text-blue-200 text-sm">Machadka ugu Weyn ee Tarbiyadda Caruurta Soomaaliyeed</p>
          </div>

          <div className="bg-amber-500 rounded-xl p-4 mb-5 text-center shadow-lg">
            <p className="text-amber-900 font-black text-lg">📅 Koorsayada ugu Horeeyaa waxa ay Bilaabmayaan</p>
            <p className="text-3xl font-black text-amber-900">1 Febraayo 2026</p>
          </div>

          <div className="space-y-2 mb-5">
            <h2 className="text-amber-400 font-bold text-sm flex items-center gap-2 mb-3">
              <BookOpen className="w-5 h-5" /> Koorsooyinka Hadda Diyaarka ah ee aad Bilaabi Karto
            </h2>
            <div className="flex items-center gap-2 bg-white/10 rounded-lg p-3">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              <span className="font-semibold">Koorsada Ilmo Is-Dabira</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 rounded-lg p-3">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              <span className="font-semibold">Koorsada 0-6 Bilood</span>
            </div>
          </div>

          <div className="space-y-2 mb-5">
            <h2 className="text-amber-400 font-bold text-lg flex items-center gap-2 mb-3">
              <Trophy className="w-5 h-5" /> Faa'idooyin
            </h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2 bg-white/10 rounded-lg p-2">
                <Mic className="w-4 h-4 text-purple-400" />
                <span>Sheeko Live</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 rounded-lg p-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span>Bulsho Isku Xiran</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 rounded-lg p-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Shahaado</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 rounded-lg p-2">
                <Bell className="w-4 h-4 text-red-400" />
                <span>Xasuusin</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-4 text-center shadow-lg mb-4">
            <p className="text-green-100 text-sm mb-1">Koorsooyinka Barbaarintasan</p>
            <p className="text-2xl font-black text-white">5 Cashar Bilaash ah!</p>
            <p className="text-green-100 text-sm">Bilow maanta</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Smartphone className="w-5 h-5 text-blue-300" />
              <span className="text-blue-200 font-semibold">App-ka Soo Dejiso!</span>
            </div>
            <p className="text-blue-300 text-sm font-bold">appbarbaarintasan.com</p>
          </div>
        </div>

        <div className="mt-4 space-y-2 max-w-md mx-auto">
          <div className="flex gap-2">
            <Button 
              onClick={handleDownload}
              disabled={downloading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 text-sm"
            >
              <Download className="w-4 h-4 mr-1" />
              {downloading ? "Dejinayaa..." : "Sawirka"}
            </Button>
            <Button 
              onClick={handlePdfDownload}
              disabled={downloadingPdf}
              variant="outline"
              className="flex-1 py-3 text-sm"
            >
              <FileText className="w-4 h-4 mr-1" />
              {downloadingPdf ? "Dejinayaa..." : "PDF"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
