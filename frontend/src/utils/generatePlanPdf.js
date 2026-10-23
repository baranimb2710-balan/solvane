import { jsPDF } from 'jspdf';

/**
 * Generates and downloads a clean, multi-page PDF itinerary for Solvane.
 * Uses English text only to ensure standard PDF font compatibility.
 * Employs Solvane's sea-blue and temple-orange accents with no cut-off text.
 */
export function generatePlanPdf({ plan, trip, narration, customTitle = '' }) {
  if (!plan || !plan.days) {
    console.error('generatePlanPdf: Invalid plan data');
    return;
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm
  const maxY = 276; // Leave room for footer

  let y = margin;

  // Color constants
  const SEA_BLUE = [2, 132, 199];      // #0284c7
  const DARK_BLUE = [15, 23, 42];      // #0f172a
  const TEMPLE_ORANGE = [234, 88, 12]; // #ea580c
  const LIGHT_ORANGE = [255, 237, 213];// #ffedd5
  const TEXT_PRIMARY = [30, 41, 59];   // #1e293b
  const TEXT_MUTED = [100, 116, 139];  // #64748b
  const BG_LIGHT = [248, 250, 252];    // #f8fafc
  const BORDER_COLOR = [226, 232, 240];// #e2e8f0

  const checkPageBreak = (neededHeight) => {
    if (y + neededHeight > maxY) {
      doc.addPage();
      y = margin;
      drawPageAccent();
    }
  };

  const drawPageAccent = () => {
    // Subtle top accent line
    doc.setFillColor(SEA_BLUE[0], SEA_BLUE[1], SEA_BLUE[2]);
    doc.rect(margin, 6, contentWidth * 0.7, 1.5, 'F');
    doc.setFillColor(TEMPLE_ORANGE[0], TEMPLE_ORANGE[1], TEMPLE_ORANGE[2]);
    doc.rect(margin + contentWidth * 0.7, 6, contentWidth * 0.3, 1.5, 'F');
  };

  // Draw initial page accent
  drawPageAccent();
  y = 14;

  // -------------------------------------------------------------
  // 1. BRAND HEADER
  // -------------------------------------------------------------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(SEA_BLUE[0], SEA_BLUE[1], SEA_BLUE[2]);
  doc.text('SOLVANE', margin, y);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(TEMPLE_ORANGE[0], TEMPLE_ORANGE[1], TEMPLE_ORANGE[2]);
  doc.text('RAMANATHAPURAM HERITAGE & TOURIST COMPANION', margin + 44, y - 2);

  y += 7;

  // Title
  const daysCount = plan.days?.length || trip?.days || 2;
  const groupType = (trip?.travellingWith || 'Family').charAt(0).toUpperCase() + (trip?.travellingWith || 'Family').slice(1);
  const budgetVal = plan.budget?.total || trip?.budget || 0;
  const defaultTitle = `${daysCount}-day ${groupType} Itinerary, Rs. ${Number(budgetVal).toLocaleString('en-IN')}`;
  const displayTitle = customTitle || defaultTitle;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(DARK_BLUE[0], DARK_BLUE[1], DARK_BLUE[2]);
  doc.text(displayTitle, margin, y);

  y += 7;

  // Trip Summary Meta Bar
  doc.setFillColor(BG_LIGHT[0], BG_LIGHT[1], BG_LIGHT[2]);
  doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
  doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'FD');

  const travData = trip?.travellers;
  let partyStr = groupType;
  if (trip?.travellingWith === 'solo') {
    partyStr = 'Solo (1 person)';
  } else if (travData && typeof travData === 'object') {
    const adults = Number(travData.adults) || 2;
    const children = Number(travData.children) || 0;
    const totalP = adults + children;
    partyStr = `${groupType} (${totalP} people: ${adults}A${children > 0 ? `, ${children}C` : ''})`;
  }

  const basisLabel = trip?.budgetBasis === 'person' ? 'Per Person' : 'Group';

  doc.setFontSize(8.5);
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.setFont('helvetica', 'bold');
  doc.text('DURATION:', margin + 4, y + 5.5);
  doc.text('BUDGET:', margin + 36, y + 5.5);
  doc.text('TRAVEL PARTY:', margin + 84, y + 5.5);
  doc.text('INTERESTS:', margin + 140, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(TEXT_PRIMARY[0], TEXT_PRIMARY[1], TEXT_PRIMARY[2]);
  doc.text(`${daysCount} Day${daysCount > 1 ? 's' : ''}`, margin + 4, y + 10.5);
  doc.text(`Rs. ${Number(budgetVal).toLocaleString('en-IN')} (${basisLabel})`, margin + 36, y + 10.5);
  doc.text(partyStr, margin + 84, y + 10.5);

  const interestsStr = (trip?.interests && trip.interests.length > 0)
    ? trip.interests.map(i => i.charAt(0).toUpperCase() + i.slice(1)).join(', ')
    : 'Heritage, Temples';
  const truncatedInterests = doc.splitTextToSize(interestsStr, 38)[0] || interestsStr;
  doc.text(truncatedInterests, margin + 140, y + 10.5);

  y += 18;

  // -------------------------------------------------------------
  // 2. AI OVERVIEW CARD (IF PRESENT)
  // -------------------------------------------------------------
  if (narration?.overview) {
    const overviewLines = doc.splitTextToSize(narration.overview, contentWidth - 10);
    const boxHeight = 12 + overviewLines.length * 4.2;

    checkPageBreak(boxHeight + 4);

    doc.setFillColor(254, 243, 199); // amber-100
    doc.setDrawColor(245, 158, 11); // amber-500
    doc.roundedRect(margin, y, contentWidth, boxHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(TEMPLE_ORANGE[0], TEMPLE_ORANGE[1], TEMPLE_ORANGE[2]);
    doc.text('SOLVANE AI TRIP OVERVIEW', margin + 5, y + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(TEXT_PRIMARY[0], TEXT_PRIMARY[1], TEXT_PRIMARY[2]);
    doc.text(overviewLines, margin + 5, y + 10.5);

    y += boxHeight + 6;
  }

  // -------------------------------------------------------------
  // 3. DAILY ITINERARY & TIMELINE
  // -------------------------------------------------------------
  plan.days.forEach((dayObj) => {
    checkPageBreak(25);

    // Day Header Strip
    doc.setFillColor(SEA_BLUE[0], SEA_BLUE[1], SEA_BLUE[2]);
    doc.roundedRect(margin, y, contentWidth, 9, 1.5, 1.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(`DAY ${dayObj.day}: ${dayObj.title || 'Itinerary'}`, margin + 4, y + 6);

    if (dayObj.zone_summary) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const zoneText = `(${dayObj.zone_summary})`;
      doc.text(zoneText, margin + contentWidth - doc.getTextWidth(zoneText) - 4, y + 6);
    }

    y += 12;

    // AI Day Summary (if present)
    const dayNarration = narration?.days?.find(
      (d) => Number(d.day) === Number(dayObj.day)
    );

    if (dayNarration?.summary) {
      const summaryLines = doc.splitTextToSize(dayNarration.summary, contentWidth - 8);
      const sumBoxHeight = 6 + summaryLines.length * 4;

      checkPageBreak(sumBoxHeight + 2);

      doc.setFillColor(LIGHT_ORANGE[0], LIGHT_ORANGE[1], LIGHT_ORANGE[2]);
      doc.roundedRect(margin, y, contentWidth, sumBoxHeight, 1.5, 1.5, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(TEMPLE_ORANGE[0], TEMPLE_ORANGE[1], TEMPLE_ORANGE[2]);
      doc.text('Day Highlights: ', margin + 4, y + 4.5);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(TEXT_PRIMARY[0], TEXT_PRIMARY[1], TEXT_PRIMARY[2]);
      doc.text(summaryLines, margin + 26, y + 4.5);

      y += sumBoxHeight + 4;
    }

    // Free Day handling
    if (dayObj.is_free_day || !dayObj.stops || dayObj.stops.length === 0) {
      checkPageBreak(22);
      doc.setFillColor(BG_LIGHT[0], BG_LIGHT[1], BG_LIGHT[2]);
      doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
      doc.roundedRect(margin, y, contentWidth, 18, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(TEMPLE_ORANGE[0], TEMPLE_ORANGE[1], TEMPLE_ORANGE[2]);
      doc.text('Flexible Free Day / Leisure Time', margin + 6, y + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
      const freeNote = 'Relax at your hotel, explore local bazaars, or revisit your favorite beach or temple.';
      doc.text(freeNote, margin + 6, y + 12);

      y += 24;
      return;
    }

    // Stops Timeline
    dayObj.stops?.forEach((stop, sIdx) => {
      // Find AI tips for this stop
      const stopNarration = dayNarration?.stops?.find(
        (s) => String(s.place_id || '').toLowerCase() === String(stop.place_id || '').toLowerCase()
      );

      // Calculate needed height for stop card
      let stopCardHeight = 16;
      if (stop.note) stopCardHeight += 5;
      if (stopNarration?.why_visit) stopCardHeight += 5;
      if (stopNarration?.local_tip) stopCardHeight += 5;
      if (stop.travel_minutes_from_previous > 0) stopCardHeight += 5;

      checkPageBreak(stopCardHeight + 3);

      // Travel connector line
      if (stop.travel_minutes_from_previous > 0) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.5);
        doc.setTextColor(SEA_BLUE[0], SEA_BLUE[1], SEA_BLUE[2]);
        const distStr = stop.distance_km_from_previous ? ` (${stop.distance_km_from_previous} km)` : '';
        doc.text(`| Travel: ~${stop.travel_minutes_from_previous} mins${distStr}`, margin + 6, y);
        y += 4;
      }

      // Stop Card Background
      doc.setFillColor(BG_LIGHT[0], BG_LIGHT[1], BG_LIGHT[2]);
      doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
      doc.roundedRect(margin, y, contentWidth, stopCardHeight - 2, 1.5, 1.5, 'FD');

      // Timeline marker dot
      doc.setFillColor(TEMPLE_ORANGE[0], TEMPLE_ORANGE[1], TEMPLE_ORANGE[2]);
      doc.circle(margin + 4, y + 4.5, 1.5, 'F');

      // Time Range
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(TEMPLE_ORANGE[0], TEMPLE_ORANGE[1], TEMPLE_ORANGE[2]);
      const timeStr = `${stop.start_time || '09:00 AM'} - ${stop.end_time || '10:30 AM'}`;
      doc.text(timeStr, margin + 8, y + 5);

      // Category Pill
      const catText = (stop.category || 'Attraction').toUpperCase();
      doc.setFontSize(7);
      doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
      doc.text(`[${catText}]`, margin + 48, y + 5);

      // Place Name (English only)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(DARK_BLUE[0], DARK_BLUE[1], DARK_BLUE[2]);
      doc.text(stop.name || stop.place_id, margin + 8, y + 9.5);

      let cardInnerY = y + 13.5;

      // Note
      if (stop.note) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
        const noteLine = doc.splitTextToSize(stop.note, contentWidth - 14)[0];
        doc.text(noteLine, margin + 8, cardInnerY);
        cardInnerY += 4.5;
      }

      // AI Why Visit
      if (stopNarration?.why_visit) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(TEMPLE_ORANGE[0], TEMPLE_ORANGE[1], TEMPLE_ORANGE[2]);
        doc.text('Why visit: ', margin + 8, cardInnerY);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(TEXT_PRIMARY[0], TEXT_PRIMARY[1], TEXT_PRIMARY[2]);
        const whyLine = doc.splitTextToSize(stopNarration.why_visit, contentWidth - 28)[0];
        doc.text(whyLine, margin + 22, cardInnerY);
        cardInnerY += 4.5;
      }

      // AI Local Tip
      if (stopNarration?.local_tip) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(SEA_BLUE[0], SEA_BLUE[1], SEA_BLUE[2]);
        doc.text('Local tip: ', margin + 8, cardInnerY);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(TEXT_PRIMARY[0], TEXT_PRIMARY[1], TEXT_PRIMARY[2]);
        const tipLine = doc.splitTextToSize(stopNarration.local_tip, contentWidth - 28)[0];
        doc.text(tipLine, margin + 21, cardInnerY);
      }

      y += stopCardHeight + 2;
    });

    y += 4;
  });

  // -------------------------------------------------------------
  // 4. BUDGET BREAKDOWN CARD
  // -------------------------------------------------------------
  if (plan.budget) {
    checkPageBreak(40);

    doc.setFillColor(BG_LIGHT[0], BG_LIGHT[1], BG_LIGHT[2]);
    doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
    doc.roundedRect(margin, y, contentWidth, 34, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(DARK_BLUE[0], DARK_BLUE[1], DARK_BLUE[2]);
    doc.text('ESTIMATED BUDGET BREAKDOWN', margin + 5, y + 6);

    const b = plan.budget;
    const breakdown = b.breakdown || {};
    const totalEst = b.total || 0;
    const userBud = b.user_budget || trip?.budget || totalEst;
    const statusText = b.status || 'within budget';

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(TEXT_PRIMARY[0], TEXT_PRIMARY[1], TEXT_PRIMARY[2]);

    doc.text(`- Accommodation / Stay: Rs. ${Number(breakdown.stay || 0).toLocaleString('en-IN')}`, margin + 5, y + 12);
    doc.text(`- Food & Dining: Rs. ${Number(breakdown.food || 0).toLocaleString('en-IN')}`, margin + 5, y + 17);
    doc.text(`- Local Transport: Rs. ${Number(breakdown.transport || 0).toLocaleString('en-IN')}`, margin + 92, y + 12);
    doc.text(`- Entry Fees & Pujas: Rs. ${Number(breakdown.entry_fees || 0).toLocaleString('en-IN')}`, margin + 92, y + 17);

    // Total Line
    doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
    doc.line(margin + 5, y + 21, margin + contentWidth - 5, y + 21);

    doc.setFont('helvetica', 'bold');
    doc.text(`Total Estimated: Rs. ${Number(totalEst).toLocaleString('en-IN')}`, margin + 5, y + 27);
    doc.text(`Your Budget: Rs. ${Number(userBud).toLocaleString('en-IN')} (${statusText.toUpperCase()})`, margin + 92, y + 27);

    y += 38;
  }

  // -------------------------------------------------------------
  // 5. ADVISORIES & SAFETY NOTES
  // -------------------------------------------------------------
  const allWarnings = [
    ...(plan.warnings || []),
    ...(narration?.safety_notes || []),
  ];

  if (allWarnings.length > 0 || (narration?.packing_tips && narration.packing_tips.length > 0)) {
    checkPageBreak(35);

    doc.setFillColor(254, 242, 242); // red-50
    doc.setDrawColor(248, 113, 113); // red-400
    doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(185, 28, 28); // red-700
    doc.text('SAFETY & TIMING ADVISORIES', margin + 5, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(TEXT_PRIMARY[0], TEXT_PRIMARY[1], TEXT_PRIMARY[2]);

    let advY = y + 10;
    allWarnings.slice(0, 3).forEach((warn) => {
      const line = doc.splitTextToSize(`* ${warn}`, contentWidth - 10)[0];
      doc.text(line, margin + 5, advY);
      advY += 4;
    });

    y += 28;
  }

  // -------------------------------------------------------------
  // 6. FOOTER ON ALL PAGES
  // -------------------------------------------------------------
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text('Costs and timings are estimates. Please verify before travelling.', margin, pageHeight - 7);

    const pageStr = `Page ${i} of ${totalPages}`;
    doc.text(pageStr, pageWidth - margin - doc.getTextWidth(pageStr), pageHeight - 7);
  }

  // -------------------------------------------------------------
  // 7. SAVE FILE
  // -------------------------------------------------------------
  const safeFilename = `solvane-trip-${daysCount}-days.pdf`;
  doc.save(safeFilename);
}
