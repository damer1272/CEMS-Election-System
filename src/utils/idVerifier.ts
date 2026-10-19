import { createWorker } from "tesseract.js";

export interface SchoolIDScanResult {
  isSchoolVerified: boolean;
  schoolName: string;
  studentId: string;
  name: string;
  course: "BSIT" | "BSBA" | "BEEd" | "BSCrim" | "";
  confidence: number;
  rawText: string;
  statusMessage: string;
}

const SCHOOL_KEYWORDS = [
  "PAGADIAN CAPITOL COLLEGE",
  "PAGADIAN CAPITOL",
  "CAPITOL COLLEGE",
  "TUBURAN DISTRICT",
  "TUBURAN",
  "PAGADIAN CITY",
  "PAGADIAN",
  "PROVIDING QUALITY EDUCATION",
  "TAKING THE LEAD",
  "PCC",
];

export async function scanAndVerifySchoolID(
  imageSource: string | HTMLCanvasElement | File | Blob,
  _onProgress?: (pct: number) => void
): Promise<SchoolIDScanResult> {
  let rawText = "";
  let confidence = 0;

  try {
    const ocrPromise = (async () => {
      const worker = await createWorker("eng");
      try {
        const ret = await worker.recognize(imageSource);
        return { text: ret.data.text || "", confidence: ret.data.confidence || 0 };
      } finally {
        await worker.terminate().catch(() => {});
      }
    })();

    const timeoutPromise = new Promise<{ text: string; confidence: number }>((_, reject) =>
      setTimeout(() => reject(new Error("OCR scan timeout")), 10000)
    );

    const ret = await Promise.race([ocrPromise, timeoutPromise]);
    rawText = ret.text;
    confidence = ret.confidence;
  } catch (err) {
    console.warn("OCR scan notice (offline/fallback mode):", err);
    return {
      isSchoolVerified: false,
      schoolName: "",
      studentId: "",
      name: "",
      course: "",
      confidence: 0,
      rawText: "",
      statusMessage: "ID photo captured. Proceed to confirm your student credentials.",
    };
  }

  const upperText = rawText.toUpperCase();
  const lines = rawText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  // 1. Verify School Identity (Pagadian Capitol College, Inc.)
  const schoolKeywordMatch = SCHOOL_KEYWORDS.some(kw => upperText.includes(kw));
  const isSchoolVerified = schoolKeywordMatch || upperText.includes("CAPITOL") || upperText.includes("PAGADIAN");
  const schoolName = isSchoolVerified ? "Pagadian Capitol College, Inc." : "";

  // 2. Extract Course (Strict to BSIT, BSBA, BEEd, BSCrim)
  let matchedCourse: "BSIT" | "BSBA" | "BEEd" | "BSCrim" | "" = "";

  if (/\b(BSIT|B\.S\.I\.T\.|BS\s*IT|INFORMATION\s*TECH)\b/i.test(upperText)) {
    matchedCourse = "BSIT";
  } else if (/\b(BSBA|B\.S\.B\.A\.|BS\s*BA|BUSINESS\s*ADMIN)\b/i.test(upperText)) {
    matchedCourse = "BSBA";
  } else if (/\b(BEED|B\.E\.ED\.|BE\s*ED|ELEMENTARY\s*EDUC)\b/i.test(upperText)) {
    matchedCourse = "BEEd";
  } else if (/\b(BSCRIM|B\.S\.CRIM|BS\s*CRIM|CRIMINOLOGY)\b/i.test(upperText)) {
    matchedCourse = "BSCrim";
  }

  // 3. Extract Student ID (Format like 021-0137 or 2021-0137 or 3-4 digits dash 4-5 digits)
  let studentId = "";
  // Look for pattern like 021-0137 or 2021-00123
  const idMatch = rawText.match(/\b(\d{3,4}[-\s]\d{3,5})\b/);
  if (idMatch) {
    studentId = idMatch[1].replace(/\s+/, "-");
  } else {
    // Fallback: any 6 to 9 digit number
    const numMatch = rawText.match(/\b(\d{6,9})\b/);
    if (numMatch) {
      studentId = numMatch[1];
    }
  }

  // 4. Extract Student Name
  // In the ID, usually:
  // SURDILLA (Uppercase surname)
  // Jhonamery A. (First name + Middle Initial)
  let name = "";
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const upperLine = line.toUpperCase();

    // Skip school header lines, address lines, phone lines
    if (
      SCHOOL_KEYWORDS.some(k => upperLine.includes(k)) ||
      /\d{3}[-\s]?\d{3}/.test(line) ||
      /\b(BSIT|BSBA|BEED|BSCRIM)\b/i.test(line) ||
      /\b(DISTRICT|CITY|STREET|BARANGAY|TAMBULIG|ZDS|SIGNATURE|QUALITY)\b/i.test(line)
    ) {
      continue;
    }

    // Check if line looks like a surname or full name (letters, periods, spaces, length >= 3)
    if (/^[A-Za-z\s.,'-]{3,30}$/.test(line)) {
      // Check if next line is first name (e.g. "Jhonamery A.")
      const nextLine = lines[i + 1];
      if (nextLine && /^[A-Za-z\s.,'-]{3,30}$/.test(nextLine) && !/\b(BSIT|BSBA|BEED|BSCRIM)\b/i.test(nextLine)) {
        name = `${nextLine.trim()} ${line.trim()}`; // First Name + Last Name
        break;
      } else {
        name = line.trim();
        break;
      }
    }
  }

  let statusMessage = "";
  if (!isSchoolVerified) {
    statusMessage = "School name (Pagadian Capitol College) could not be verified from ID. Please try capturing closer with clear lighting.";
  } else if (!matchedCourse) {
    statusMessage = "School verified! Please confirm your course program (BSIT, BSBA, BEEd, BSCrim).";
  } else if (!studentId) {
    statusMessage = "School & Course verified! Please confirm your Student ID number.";
  } else {
    statusMessage = "ID Verified: Pagadian Capitol College Student successfully authenticated!";
  }

  return {
    isSchoolVerified,
    schoolName,
    studentId,
    name,
    course: matchedCourse,
    confidence,
    rawText,
    statusMessage,
  };
}
