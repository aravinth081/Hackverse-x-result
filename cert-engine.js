/**
 * cert-engine.js — Lokesh-Style Certificate Engine
 * AI Autonomous Smart City Hackathon 2026
 *
 * Renders ONLY the recipient name onto a pre-designed certificate template.
 * Templates already embed QR codes and signatures — this engine adds nothing extra.
 * Exports at A4 landscape 300 DPI (3508 × 2480 px) for zero blurriness.
 */
(function (window) {
  'use strict';

  /* ── CANVAS RESOLUTION ── */
  const FULL_W = 3508;
  const FULL_H = 2480;

  /* ── PER-TEMPLATE CONFIG ── */
  /*
   * nameY at 2480px canvas:
   *   0.505 = 1252px  (centre of name area, sits just above gold line)
   *   gold line on these templates is visually at ~52-53% of height
   *   textBaseline='alphabetic' means the baseline lands AT nameY,
   *   so the bottom of letters rests 15-20px above the printed line.
   */
  /* ── PROJECT GALLERY QR URL ── */
  var QR_URL = 'https://global-tech-innovation-2026.devpost.com/project-gallery';

  var CONFIGS = {
    participation: {
      nameY       : 1170,          // name baseline — 0.2 line space above template line
      color       : '#2563EB',     // Blue — theme color for participant name
      font        : 'Cinzel',      // premium serif
      fallbackFont: 'Playfair Display',
      weight      : '700',
      startSize   : 100,
      minSize     : 45,
      maxWidth    : 1800,
      letterSpacing: 2
    },
    winner1: {
      nameY       : 1183,          // name baseline — 0.2 line space above the gold template line
      color       : '#D4AF37',     // Gold — 1st Prize name
      font        : 'Cinzel',
      fallbackFont: 'Playfair Display',
      weight      : '700',
      startSize   : 110,
      minSize     : 50,
      maxWidth    : 1800,
      letterSpacing: 2
    },
    winner2: {
      nameY       : 1174,          // name baseline — 0.2 line space above the silver template line
      color       : '#163D8F',     // Royal Navy Blue — 2nd Prize name
      font        : 'Cinzel',
      fallbackFont: 'Playfair Display',
      weight      : '700',
      startSize   : 105,
      minSize     : 45,
      maxWidth    : 1800,
      letterSpacing: 2
    },
    winner3: {
      nameY       : 1170,          // name baseline — 0.2 line space above the bronze template line
      color       : '#B87333',     // Premium Bronze — 3rd Prize name
      font        : 'Cinzel',
      fallbackFont: 'Playfair Display',
      weight      : '700',
      startSize   : 100,
      minSize     : 45,
      maxWidth    : 1800,
      letterSpacing: 2
    },
    judges: {
      nameY       : 1080,          // name baseline — 0.2 line space above the judge template line
      color       : '#0F4CDB',     // Royal Blue — Judge name
      font        : 'Cinzel',
      fallbackFont: 'Playfair Display',
      weight      : '700',
      startSize   : 95,
      minSize     : 45,
      maxWidth    : 1800,
      letterSpacing: 6
    }
  };

  /* ── IMAGE LOADER ── */
  function loadImg(src) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(null); }; // graceful null on failure
      img.src = src;
    });
  }

  /* ── FONT READINESS ── */
  function ensureFonts() {
    if (document.fonts && document.fonts.ready) {
      return document.fonts.ready;
    }
    return Promise.resolve();
  }

  /* ── AUTO-SCALING: shrink font until name fits maxWidth strictly ── */
  function autoFontSize(ctx, text, maxW, startSz, minSz, weight, family) {
    var sz = startSz;
    ctx.font = weight + ' ' + sz + 'px "' + family + '"';
    while (ctx.measureText(text).width > maxW && sz > minSz) {
      sz -= 2;                     // smaller step = more precision
      ctx.font = weight + ' ' + sz + 'px "' + family + '"';
    }
    return sz;
  }

  /* ── LETTER-SPACED TEXT DRAW (for judges formal spacing) ── */
  function fillTextSpaced(ctx, text, x, y, spacing) {
    if (!spacing) { ctx.fillText(text, x, y); return; }
    var totalW = 0;
    var chars  = text.split('');
    chars.forEach(function(ch) { totalW += ctx.measureText(ch).width + spacing; });
    totalW -= spacing; // no trailing gap
    var curX = x - totalW / 2;
    chars.forEach(function(ch) {
      ctx.fillText(ch, curX + ctx.measureText(ch).width / 2, y);
      curX += ctx.measureText(ch).width + spacing;
    });
  }

  /* ── CORE RENDER FUNCTION ── */
  async function render(canvasEl, templateUrl, name, templateKey, scale) {
    var cfg = CONFIGS[templateKey] || CONFIGS.participation;
    var sc  = scale || 1;
    var W   = Math.round(FULL_W * sc);
    var H   = Math.round(FULL_H * sc);

    canvasEl.width  = W;
    canvasEl.height = H;

    /* willReadFrequently: true — speeds up live preview pixel reads */
    var ctx = canvasEl.getContext('2d', { willReadFrequently: true });
    ctx.clearRect(0, 0, W, H);

    /* — NO shadow or glow — crisp print-ready render — */
    ctx.shadowBlur   = 0;
    ctx.shadowColor  = 'transparent';
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    /* — Draw template background — */
    if (templateUrl) {
      var img = await loadImg(templateUrl);
      if (img) {
        ctx.drawImage(img, 0, 0, W, H);
      } else {
        _drawFallbackBg(ctx, W, H, sc, templateKey, name);
      }
    } else {
      _drawFallbackBg(ctx, W, H, sc, templateKey, name);
    }

    await ensureFonts();

    /* — Name text — */
    var upperName = name.toUpperCase();

    /* Strict maxWidth: 1600px at full scale, scaled proportionally for preview */
    var maxW    = Math.round(cfg.maxWidth * sc);
    var startSz = Math.round(cfg.startSize   * sc);
    var minSz   = Math.round(cfg.minSize     * sc);

    /* Try preferred font (Cinzel), fall back to Playfair Display */
    var chosenFont = cfg.font;
    var fontSize   = autoFontSize(ctx, upperName, maxW, startSz, minSz, cfg.weight, chosenFont);
    if (fontSize <= minSz && cfg.fallbackFont) {
      /* If Cinzel not loaded, measureText gives wrong values — retry with fallback */
      chosenFont = cfg.fallbackFont;
      fontSize   = autoFontSize(ctx, upperName, maxW, startSz, minSz, cfg.weight, chosenFont);
    }

    ctx.font         = cfg.weight + ' ' + fontSize + 'px "' + chosenFont + '"';
    ctx.fillStyle    = cfg.color;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'alphabetic'; // baseline = bottom of uppercase letters

    /* Y: absolute px at full scale, scaled down for preview */
    var nameY = Math.round(cfg.nameY * sc);

    /* ── Draw name — bottom of letters just touches the template's decorative line ── */
    if (cfg.letterSpacing) {
      fillTextSpaced(ctx, upperName, W / 2, nameY, Math.round(cfg.letterSpacing * sc));
    } else {
      ctx.fillText(upperName, W / 2, nameY);
    }

    return Math.round(fontSize / sc); // return logical display font size
  }

  /* — Premium Fallback Background when no template image exists — */
  function _drawFallbackBg(ctx, W, H, sc, templateKey, name) {
    // 1. Deep Space Gradient
    var grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#020617');
    grad.addColorStop(0.5, '#0B1530');
    grad.addColorStop(1, '#02020a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // 2. Tech Cyber Grid Lines
    ctx.strokeStyle = 'rgba(37, 99, 235, 0.08)';
    ctx.lineWidth = 1 * sc;
    var gridSpacing = 80 * sc;
    for (var x = 0; x < W; x += gridSpacing) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (var y = 0; y < H; y += gridSpacing) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // 3. Dynamic Star constellations
    ctx.fillStyle = '#ffffff';
    var stars = [
      {x: 0.15, y: 0.2, r: 2}, {x: 0.85, y: 0.15, r: 3}, {x: 0.7, y: 0.25, r: 1.5},
      {x: 0.25, y: 0.75, r: 2.5}, {x: 0.8, y: 0.8, r: 2}, {x: 0.5, y: 0.1, r: 1.5},
      {x: 0.08, y: 0.6, r: 3}, {x: 0.92, y: 0.55, r: 1.5}, {x: 0.35, y: 0.9, r: 2}
    ];
    stars.forEach(function(s) {
      ctx.beginPath();
      ctx.globalAlpha = Math.random() * 0.4 + 0.6;
      ctx.arc(s.x * W, s.y * H, s.r * sc, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // Draw some connecting constellation lines
    ctx.strokeStyle = 'rgba(96, 165, 250, 0.15)';
    ctx.lineWidth = 1 * sc;
    ctx.beginPath();
    ctx.moveTo(stars[0].x * W, stars[0].y * H);
    ctx.lineTo(stars[2].x * W, stars[2].y * H);
    ctx.lineTo(stars[1].x * W, stars[1].y * H);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(stars[3].x * W, stars[3].y * H);
    ctx.lineTo(stars[4].x * W, stars[4].y * H);
    ctx.stroke();

    // 4. Double Gold Border with Tech Corners
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 5 * sc;
    ctx.strokeRect(60 * sc, 60 * sc, W - 120 * sc, H - 120 * sc); // Outer Frame

    ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
    ctx.lineWidth = 2 * sc;
    ctx.strokeRect(75 * sc, 75 * sc, W - 150 * sc, H - 150 * sc); // Inner Frame

    // Tech brackets in corners
    var offset = 60 * sc;
    var len = 40 * sc;
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 8 * sc;
    // Top-Left Corner Bracket
    ctx.beginPath(); ctx.moveTo(offset, offset + len); ctx.lineTo(offset, offset); ctx.lineTo(offset + len, offset); ctx.stroke();
    // Top-Right Corner Bracket
    ctx.beginPath(); ctx.moveTo(W - offset, offset + len); ctx.lineTo(W - offset, offset); ctx.lineTo(W - offset - len, offset); ctx.stroke();
    // Bottom-Left Corner Bracket
    ctx.beginPath(); ctx.moveTo(offset, H - offset - len); ctx.lineTo(offset, H - offset); ctx.lineTo(offset + len, H - offset); ctx.stroke();
    // Bottom-Right Corner Bracket
    ctx.beginPath(); ctx.moveTo(W - offset, H - offset - len); ctx.lineTo(W - offset, H - offset); ctx.lineTo(W - offset - len, H - offset); ctx.stroke();

    // 5. Header Branding: HACKVERSE X
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold ' + Math.round(55 * sc) + 'px "Outfit", "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('🌌 H H A C K V E R S E   X', W / 2, 220 * sc);

    ctx.fillStyle = '#60A5FA';
    ctx.font = '600 ' + Math.round(20 * sc) + 'px "Space Mono", monospace';
    ctx.fillText('GLOBAL TECH INNOVATION 2026', W / 2, 310 * sc);

    // Subtle divider
    var gradDiv = ctx.createLinearGradient(W/2 - 200*sc, 0, W/2 + 200*sc, 0);
    gradDiv.addColorStop(0, 'transparent');
    gradDiv.addColorStop(0.5, 'rgba(212, 175, 55, 0.6)');
    gradDiv.addColorStop(1, 'transparent');
    ctx.fillStyle = gradDiv;
    ctx.fillRect(W/2 - 200*sc, 350 * sc, 400 * sc, 3 * sc);

    // 6. Category Title
    var mainTitle = 'CERTIFICATE OF PARTICIPATION';
    var descText = 'for successfully participating and building future technology at the Hackverse X 2026 Global Tech Innovation summit, displaying excellence in software development, AI systems engineering, or cybersecurity.';
    
    if (templateKey === 'winner1') {
      mainTitle = 'CERTIFICATE OF EXCELLENCE';
      descText = 'for securing 1ST PLACE (GRAND WINNER) at the Hackverse X 2026 Hackathon, outstandingly building solutions that redefine the frontiers of AI, Web3, and advanced systems.';
    } else if (templateKey === 'winner2') {
      mainTitle = 'CERTIFICATE OF EXCELLENCE';
      descText = 'for securing 2ND PLACE (RUNNER-UP) at the Hackverse X 2026 Hackathon, outstandingly building solutions that redefine the frontiers of AI, Web3, and advanced systems.';
    } else if (templateKey === 'winner3') {
      mainTitle = 'CERTIFICATE OF EXCELLENCE';
      descText = 'for securing 3RD PLACE (SECOND RUNNER-UP) at the Hackverse X 2026 Hackathon, outstandingly building solutions that redefine the frontiers of AI, Web3, and advanced systems.';
    } else if (templateKey === 'judges') {
      mainTitle = 'CERTIFICATE OF APPRECIATION';
      descText = 'presented in sincere gratitude for their expert guidance, invaluable mentorship, and dedicated evaluation as an Esteemed Industry Judge at the Hackverse X 2026 Global Tech Summit.';
    }

    ctx.fillStyle = '#D4AF37';
    ctx.font = 'bold ' + Math.round(48 * sc) + 'px "Outfit", sans-serif';
    ctx.fillText(mainTitle, W / 2, 580 * sc);

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '500 ' + Math.round(24 * sc) + 'px "Inter", sans-serif';
    ctx.fillText('THIS IS PROUDLY PRESENTED TO', W / 2, 850 * sc);

    // (Note: Name is drawn dynamically on top by CertEngine.render using standard logic at nameY)

    // 7. Description Block (Y = 1480*sc)
    ctx.fillStyle = 'rgba(226, 232, 240, 0.8)';
    ctx.font = 'normal ' + Math.round(26 * sc) + 'px "Inter", sans-serif';
    
    // Auto-wrap description text
    var words = descText.split(' ');
    var line = '';
    var maxDescW = 2000 * sc;
    var descY = 1480 * sc;
    for (var n = 0; n < words.length; n++) {
      var testLine = line + words[n] + ' ';
      var testW = ctx.measureText(testLine).width;
      if (testW > maxDescW && n > 0) {
        ctx.fillText(line, W / 2, descY);
        line = words[n] + ' ';
        descY += 45 * sc;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, W / 2, descY);

    // 8. Signatures / Metadata at bottom (Y = 2050*sc)
    var footerY = 2050 * sc;

    // Left Signature - Chief Organizer
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 2 * sc;
    ctx.beginPath(); ctx.moveTo(350 * sc, footerY); ctx.lineTo(750 * sc, footerY); ctx.stroke();
    // Signature path fallback
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.7)';
    ctx.lineWidth = 4 * sc;
    ctx.beginPath();
    ctx.moveTo(400 * sc, footerY - 40 * sc);
    ctx.bezierCurveTo(450 * sc, footerY - 90 * sc, 520 * sc, footerY - 10 * sc, 600 * sc, footerY - 60 * sc);
    ctx.bezierCurveTo(650 * sc, footerY - 90 * sc, 700 * sc, footerY - 20 * sc, 730 * sc, footerY - 40 * sc);
    ctx.stroke();
    // Label
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '600 ' + Math.round(18 * sc) + 'px "Space Mono", monospace';
    ctx.fillText('CHIEF ARCHITECT', 550 * sc, footerY + 25 * sc);
    ctx.fillStyle = '#D4AF37';
    ctx.font = 'bold ' + Math.round(15 * sc) + 'px "Outfit", sans-serif';
    ctx.fillText('HACKVERSE X COMMITTEE', 550 * sc, footerY + 55 * sc);

    // Center - Secure Verification ID
    var certId = 'HX-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = '600 ' + Math.round(16 * sc) + 'px "Space Mono", monospace';
    ctx.fillText('VERIFICATION CODE: ' + certId, W / 2, footerY - 20 * sc);
    var today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    ctx.fillText('DATE: ' + today, W / 2, footerY + 15 * sc);
    
    // Draw stylized tiny QR border in the center
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 2 * sc;
    ctx.strokeRect(W / 2 - 35 * sc, footerY - 120 * sc, 70 * sc, 70 * sc);
    ctx.fillStyle = 'rgba(34, 211, 238, 0.15)';
    ctx.fillRect(W / 2 - 25 * sc, footerY - 110 * sc, 50 * sc, 50 * sc);
    ctx.fillStyle = '#60A5FA';
    ctx.font = 'bold ' + Math.round(10 * sc) + 'px "Space Mono", monospace';
    ctx.fillText('VERIFIED', W / 2, footerY - 88 * sc);

    // Right Signature - Sponsor Chair
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 2 * sc;
    ctx.beginPath(); ctx.moveTo(W - 750 * sc, footerY); ctx.lineTo(W - 350 * sc, footerY); ctx.stroke();
    // Signature path fallback
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.7)';
    ctx.lineWidth = 4 * sc;
    ctx.beginPath();
    ctx.moveTo(W - 700 * sc, footerY - 30 * sc);
    ctx.bezierCurveTo(W - 650 * sc, footerY - 80 * sc, W - 580 * sc, footerY - 20 * sc, W - 520 * sc, footerY - 70 * sc);
    ctx.bezierCurveTo(W - 470 * sc, footerY - 10 * sc, W - 430 * sc, footerY - 60 * sc, W - 380 * sc, footerY - 30 * sc);
    ctx.stroke();
    // Label
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '600 ' + Math.round(18 * sc) + 'px "Space Mono", monospace';
    ctx.fillText('CREATIVE DIRECTOR', W - 550 * sc, footerY + 25 * sc);
    ctx.fillStyle = '#D4AF37';
    ctx.font = 'bold ' + Math.round(15 * sc) + 'px "Outfit", sans-serif';
    ctx.fillText('YOUCAM API PARTNER', W - 550 * sc, footerY + 55 * sc);
  }

  /* ── PUBLIC API ── */

  /** Full 3508×2480 render — used for final download */
  async function renderFull(canvasEl, templateUrl, name, templateKey) {
    return render(canvasEl, templateUrl, name, templateKey, 1);
  }

  /** Quarter-scale render — used for admin live preview */
  async function renderPreview(canvasEl, templateUrl, name, templateKey) {
    return render(canvasEl, templateUrl, name, templateKey, 0.25);
  }

  /** Download canvas as PNG */
  function downloadPNG(canvasEl, filename) {
    var a = document.createElement('a');
    a.download = filename || 'certificate.png';
    a.href     = canvasEl.toDataURL('image/png');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  /** Download canvas as PDF (A4 landscape) */
  function downloadPDF(canvasEl, filename) {
    try {
      var _jspdf = window.jspdf;
      var jsPDF  = _jspdf ? _jspdf.jsPDF : null;
      if (!jsPDF) throw new Error('jsPDF not loaded');
      var pw  = canvasEl.width  / 4;
      var ph  = canvasEl.height / 4;
      var pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [pw, ph] });
      pdf.addImage(canvasEl.toDataURL('image/png'), 'PNG', 0, 0, pw, ph);
      pdf.save(filename || 'certificate.pdf');
    } catch (e) {
      alert('PDF export failed. Please use Download PNG.');
    }
  }

  window.CertEngine = {
    renderFull    : renderFull,
    renderPreview : renderPreview,
    downloadPNG   : downloadPNG,
    downloadPDF   : downloadPDF,
    CONFIGS       : CONFIGS,
    FULL_W        : FULL_W,
    FULL_H        : FULL_H
  };

})(window);
