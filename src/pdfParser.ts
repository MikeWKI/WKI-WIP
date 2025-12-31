// PDF Parser for Decisiv Case PDFs
// Extracts customer information and creates WIP entries

export interface ParsedPDFData {
  customer: string;
  unit: string;
  ro: string;
  bay: string;
  decisivCase: string;
  firstShift: string;
  secondShift: string;
  orderedParts: string;
  triageNotes: string;
  quoteStatus: string;
  repairCondition: string;
  contactInfo: string;
  accountStatus: string;
  customerStatus: string;
  call: string;
}

export async function parseDecisivPDF(file: File): Promise<ParsedPDFData | null> {
  try {
    // Read the PDF file
    const arrayBuffer = await file.arrayBuffer();
    
    // Import pdf.js dynamically
    const pdfjsLib = await import('pdfjs-dist');
    
    // Set worker path - use the npm package worker instead of CDN
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
    
    // Load the PDF
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    
    // Extract text from all pages
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }
    
    // Parse the extracted text
    return parseDecisivText(fullText);
  } catch (error) {
    console.error('Error parsing PDF:', error);
    return null;
  }
}

function parseDecisivText(text: string): ParsedPDFData {
  const data: ParsedPDFData = {
    customer: '',
    unit: '',
    ro: '',
    bay: '',
    decisivCase: '',
    firstShift: '',
    secondShift: '',
    orderedParts: '',
    triageNotes: '',
    quoteStatus: '',
    repairCondition: '',
    contactInfo: '',
    accountStatus: '',
    customerStatus: '',
    call: ''
  };
  
  // Extract Customer
  const customerMatch = text.match(/Customer:\s*([^\n]+?)(?:\s+Date:|$)/i);
  if (customerMatch) {
    data.customer = customerMatch[1].trim();
  }
  
  // Extract Case Number
  const caseMatch = text.match(/Case\s*#\s*(\d+)/i);
  if (caseMatch) {
    data.decisivCase = caseMatch[1].trim();
  }
  
  // Extract Unit Number
  const unitMatch = text.match(/Unit No:\s*([^\s]+)/i);
  if (unitMatch) {
    data.unit = unitMatch[1].trim();
  }
  
  // Extract Repair Order
  const roMatch = text.match(/Repair Order:\s*([^\s]+)/i);
  if (roMatch) {
    data.ro = roMatch[1].trim();
  }
  
  // Extract Complaint (maps to Repair Condition)
  const complaintMatch = text.match(/Complaint:\s*([^\n]+)/i);
  if (complaintMatch) {
    data.repairCondition = complaintMatch[1].trim();
  }
  
  // Extract Status (maps to Quote Status)
  const statusMatch = text.match(/Status:\s*([^\n]+?)(?:\s+ETR:|$)/i);
  if (statusMatch) {
    data.quoteStatus = statusMatch[1].trim();
  }
  
  // Extract all notes - combine them intelligently
  const noteMatches = text.matchAll(/Note:\s*([^\n]+(?:\n(?!From:|To:)[^\n]+)*)/gi);
  const notes: string[] = [];
  const timestamps: Date[] = [];
  
  for (const match of noteMatches) {
    const noteText = match[1].trim();
    notes.push(noteText);
    
    // Try to extract timestamp from the line above the note
    const noteIndex = match.index || 0;
    const beforeNote = text.substring(Math.max(0, noteIndex - 100), noteIndex);
    const timeMatch = beforeNote.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(\d{1,2}:\d{2}\s*(?:am|pm))/i);
    
    if (timeMatch) {
      try {
        timestamps.push(new Date(timeMatch[0]));
      } catch (e) {
        timestamps.push(new Date());
      }
    } else {
      timestamps.push(new Date());
    }
  }
  
  // Determine shift based on timestamp and combine notes
  const firstShiftNotes: string[] = [];
  const secondShiftNotes: string[] = [];
  
  notes.forEach((note, idx) => {
    const timestamp = timestamps[idx];
    const hour = timestamp.getHours();
    
    // First shift: 6:30 AM (6.5) to 3:30 PM (15.5)
    // Second shift: 3:30 PM (15.5) to Midnight (24)
    const formattedNote = `${timestamp.toLocaleDateString()} ${timestamp.toLocaleTimeString()}: ${note}`;
    
    if (hour >= 6 && hour < 15) {
      firstShiftNotes.push(formattedNote);
    } else if (hour >= 15 || hour < 6) {
      secondShiftNotes.push(formattedNote);
    }
  });
  
  // If we can't determine shift, put recent notes in first shift
  if (firstShiftNotes.length === 0 && secondShiftNotes.length === 0 && notes.length > 0) {
    // Put the 3 most recent notes
    notes.slice(0, 3).forEach((note, idx) => {
      firstShiftNotes.push(`Note ${idx + 1}: ${note}`);
    });
  }
  
  data.firstShift = firstShiftNotes.join('\n\n');
  data.secondShift = secondShiftNotes.join('\n\n');
  
  // Extract parts information
  const partsMatches = text.matchAll(/(?:pull|order|part)[^:]*:\s*([^\n]+(?:K\d{3}[-\d]+[^\n]*)?)/gi);
  const partsInfo: string[] = [];
  
  for (const match of partsMatches) {
    const partText = match[1].trim();
    if (partText && partText.length > 5) {
      partsInfo.push(partText);
    }
  }
  
  if (partsInfo.length > 0) {
    data.orderedParts = partsInfo.join('\n');
  }
  
  // Extract contact info (email addresses)
  const emailMatches = text.matchAll(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g);
  const emails = Array.from(emailMatches, m => m[1]);
  if (emails.length > 0) {
    data.contactInfo = [...new Set(emails)].join(', ');
  }
  
  // Set default bay to the status if it contains location info
  if (data.quoteStatus.toLowerCase().includes('road test') || 
      data.quoteStatus.toLowerCase().includes('bay') ||
      data.quoteStatus.toLowerCase().includes('shop')) {
    data.bay = data.quoteStatus;
  }
  
  return data;
}
