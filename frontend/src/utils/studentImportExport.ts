import * as XLSX from "xlsx";

type OrgType = "uac" | "mbcs" | "mec";

interface TemplateColumn {
  header: string;
  key: string;
  required: boolean;
  example: string;
}

const commonColumns: TemplateColumn[] = [
  { header: "Name*", key: "name", required: true, example: "Ahmed Rahman" },
  { header: "Gender*", key: "gender", required: true, example: "male" },
  { header: "Date of Birth*", key: "dateOfBirth", required: true, example: "2010-05-15" },
  { header: "Guardian Name*", key: "guardianName", required: true, example: "Rahim Rahman" },
  { header: "Contact Number*", key: "contactNumber", required: true, example: "01712345678" },
  { header: "Monthly Tuition Fee*", key: "monthlyTuitionFee", required: true, example: "2000" },
  { header: "Section", key: "section", required: false, example: "A" },
  { header: "Serial No", key: "serialNo", required: false, example: "001" },
  { header: "Nationality", key: "nationality", required: false, example: "Bangladeshi" },
  { header: "Religion", key: "religion", required: false, example: "Islam" },
  { header: "Blood Group", key: "bloodGroup", required: false, example: "B+" },
  { header: "Health Condition", key: "healthCondition", required: false, example: "Good" },
  { header: "Present Address", key: "presentAddress", required: false, example: "Dhaka" },
  { header: "Student Living With", key: "studentLivingWith", required: false, example: "Parents" },
  { header: "Last School Attended", key: "lastSchoolAttended", required: false, example: "ABC School" },
  { header: "Father Name", key: "fatherName", required: false, example: "Rahim Rahman" },
  { header: "Father Mobile", key: "fatherMobile", required: false, example: "01712345678" },
  { header: "Father Occupation", key: "fatherOccupation", required: false, example: "Business" },
  { header: "Father Email", key: "fatherEmail", required: false, example: "father@email.com" },
  { header: "Mother Name", key: "motherName", required: false, example: "Fatima Rahman" },
  { header: "Mother Mobile", key: "motherMobile", required: false, example: "01812345678" },
  { header: "Mother Occupation", key: "motherOccupation", required: false, example: "Homemaker" },
  { header: "Mother Email", key: "motherEmail", required: false, example: "mother@email.com" },
  { header: "Admission Fee", key: "admissionFee", required: false, example: "5000" },
  { header: "Admission Date", key: "admissionDate", required: false, example: "2025-01-01" },
  { header: "Readmission Fee", key: "readmissionFee", required: false, example: "0" },
  { header: "Discount Tuition", key: "discountTuition", required: false, example: "0" },
  { header: "Discount Admission", key: "discountAdmission", required: false, example: "0" },
  { header: "Discount Readmission", key: "discountReadmission", required: false, example: "0" },
];

const orgSpecificColumns: Record<OrgType, TemplateColumn[]> = {
  uac: [
    { header: "Class* (8-12)", key: "class", required: true, example: "10" },
    { header: "Group (science/business)", key: "group", required: false, example: "science" },
    { header: "School", key: "school", required: false, example: "Dhaka Collegiate" },
  ],
  mbcs: [
    { header: "Class* (1-10)", key: "class", required: true, example: "5" },
    { header: "Shift (morning/day)", key: "shift", required: false, example: "morning" },
    { header: "Branch", key: "branch", required: false, example: "Main" },
  ],
  mec: [
    { header: "Class", key: "class", required: false, example: "8" },
    { header: "Group", key: "group", required: false, example: "English" },
  ],
};

export function getTemplateColumns(org: OrgType): TemplateColumn[] {
  const orgCols = orgSpecificColumns[org];
  // Insert org-specific columns after common required fields (after index 2 = dateOfBirth)
  const result = [...commonColumns];
  // Insert class and org fields after dateOfBirth (index 3)
  result.splice(3, 0, ...orgCols);
  return result;
}

export function downloadTemplate(org: OrgType, classValue?: number, groupOrShift?: string) {
  const columns = getTemplateColumns(org);
  const headers = columns.map((c) => c.header);
  const exampleRow = columns.map((c) => {
    // Override class value if provided
    if (c.key === "class" && classValue !== undefined) return String(classValue);
    if (c.key === "group" && groupOrShift) return groupOrShift;
    if (c.key === "shift" && groupOrShift) return groupOrShift;
    return c.example;
  });

  const wsData = [headers, exampleRow];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws["!cols"] = columns.map((c) => ({ wch: Math.max(c.header.length + 2, 15) }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Students");

  // Add instructions sheet
  const instrData = [
    ["Import Instructions"],
    [""],
    ["1. Fields marked with * are required"],
    ["2. Gender must be: male, female, or other"],
    ["3. Date format: YYYY-MM-DD (e.g., 2010-05-15)"],
    ["4. Contact numbers must be valid Bangladesh mobile numbers (e.g., 01712345678)"],
    [`5. Class range: ${org === "uac" ? "8-12" : org === "mbcs" ? "1-10" : "optional"}`],
    [org === "uac" ? "6. Group: science or business" : org === "mbcs" ? "6. Shift: morning or day" : "6. Group: free-form text"],
    ["7. Fee fields are numeric (no currency symbol)"],
    ["8. Fill in data starting from row 2 (row 1 is the header)"],
    ["9. Delete the example row before importing"],
  ];
  const instrWs = XLSX.utils.aoa_to_sheet(instrData);
  instrWs["!cols"] = [{ wch: 70 }];
  XLSX.utils.book_append_sheet(wb, instrWs, "Instructions");

  const orgName = org === "uac" ? "UAC" : org === "mbcs" ? "MBCS" : "MEC";
  XLSX.writeFile(wb, `${orgName}_Student_Import_Template.xlsx`);
}

export function parseImportFile(
  file: File,
  org: OrgType,
): Promise<{ data: Record<string, string | number | boolean | undefined>[]; errors: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, string | number | boolean>>(sheet, { defval: "" });

        if (jsonData.length === 0) {
          resolve({ data: [], errors: ["File is empty or has no data rows"] });
          return;
        }

        const columns = getTemplateColumns(org);
        const headerMap = new Map<string, string>();
        columns.forEach((c) => {
          headerMap.set(c.header, c.key);
          // Also map without the asterisk for flexibility
          headerMap.set(c.header.replace("*", "").trim(), c.key);
        });

        const errors: string[] = [];
        const parsed: Record<string, string | number | boolean | undefined>[] = [];

        jsonData.forEach((row, rowIdx) => {
          const student: Record<string, string | number | boolean | undefined> = {};
          const rowNum = rowIdx + 2; // +2 because row 1 is header

          // Map headers to keys
          for (const [header, value] of Object.entries(row)) {
            const key = headerMap.get(header) || headerMap.get(header.replace("*", "").trim());
            if (key && value !== "" && value !== undefined) {
              student[key] = value;
            }
          }

          // Skip empty rows
          if (!student.name && !student.contactNumber) return;

          // Type conversion
          if (student.class) student.class = Number(student.class);
          if (student.monthlyTuitionFee) student.monthlyTuitionFee = Number(student.monthlyTuitionFee);
          if (student.admissionFee) student.admissionFee = Number(student.admissionFee);
          if (student.readmissionFee) student.readmissionFee = Number(student.readmissionFee);
          if (student.discountTuition) student.discountTuition = Number(student.discountTuition);
          if (student.discountAdmission) student.discountAdmission = Number(student.discountAdmission);
          if (student.discountReadmission) student.discountReadmission = Number(student.discountReadmission);

          // Date normalization
          if (student.dateOfBirth && typeof student.dateOfBirth !== 'boolean') {
            student.dateOfBirth = normalizeDate(student.dateOfBirth);
          }
          if (student.admissionDate && typeof student.admissionDate !== 'boolean') {
            student.admissionDate = normalizeDate(student.admissionDate);
          }

          // Ensure contact is string
          if (student.contactNumber) student.contactNumber = String(student.contactNumber);
          if (student.fatherMobile) student.fatherMobile = String(student.fatherMobile);
          if (student.motherMobile) student.motherMobile = String(student.motherMobile);

          // Basic validation
          if (!student.name) errors.push(`Row ${rowNum}: Name is required`);
          if (!student.gender) errors.push(`Row ${rowNum}: Gender is required`);
          if (!student.dateOfBirth) errors.push(`Row ${rowNum}: Date of Birth is required`);
          if (!student.guardianName) errors.push(`Row ${rowNum}: Guardian Name is required`);
          if (!student.contactNumber) errors.push(`Row ${rowNum}: Contact Number is required`);
          if (student.monthlyTuitionFee === undefined || isNaN(Number(student.monthlyTuitionFee)))
            errors.push(`Row ${rowNum}: Monthly Tuition Fee is required`);

          if (org !== "mec" && !student.class) {
            errors.push(`Row ${rowNum}: Class is required`);
          }

          parsed.push(student);
        });

        resolve({ data: parsed, errors });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}

function normalizeDate(value: string | number): string {
  if (typeof value === "number") {
    // Excel serial date
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
    }
  }
  if (typeof value === "string") {
    // Already ISO format
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.substring(0, 10);
    // DD/MM/YYYY
    const dmy = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }
  return String(value);
}
