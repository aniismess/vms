"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Upload, Info } from "lucide-react" // Info icon already imported
import * as XLSX from "xlsx"
import { supabase } from "@/lib/supabase"
import { Progress } from "@/components/ui/progress"
// Removed Alert components as we use Popover now
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover" // Added Popover components
import { UserRole } from "@/contexts/auth-context" // Import UserRole
import { cn } from "@/lib/utils"
import type { YesNoType } from "@/lib/types" // Import YesNoType

// Interface for data read directly from Excel (flexible types)
interface VolunteerExcelRow {
  [key: string]: any; // Allow any header initially
  // Define expected keys after mapping for type safety, allow null/undefined initially
  serial_number?: string | number | null;
  full_name?: string | null;
  age?: string | number | null;
  aadhar_number?: string | number | null;
  sai_connect_id?: string | number | null;
  mobile_number?: string | number | null;
  sss_district?: string | null;
  gender?: string | null;
  samiti_or_bhajan_mandli?: string | null;
  education?: string | null;
  special_qualifications?: string | null;
  last_service_location?: string | null;
  other_service_location?: string | null;
  prashanti_arrival?: string | number | Date | null; // Allow various date inputs
  prashanti_departure?: string | number | Date | null; // Allow various date inputs
  duty_point?: string | null;
  is_cancelled?: string | number | boolean | null;
}

// Interface for data ready for DB insertion (strict types)
interface DatabaseInsertData {
  sai_connect_id: string;
  full_name: string;
  age: number;
  mobile_number: string;
  sss_district: string;
  is_cancelled: YesNoType; // Use 'yes' | 'no'
  // Optional fields allowing null
  aadhar_number?: string | null;
  gender?: string | null;
  samiti_or_bhajan_mandli?: string | null;
  education?: string | null;
  special_qualifications?: string | null;
  last_service_location?: string | null;
  other_service_location?: string | null;
  prashanti_arrival?: string | null; // Store as ISO string or null
  prashanti_departure?: string | null; // Store as ISO string or null
  duty_point?: string | null;
  // serial_number is not typically inserted/updated directly if it's auto-generated
}


// Header mapping (lowercase keys)
const headerMapping: { [key: string]: keyof VolunteerExcelRow } = {
  // English headers (lowercase)
  "serial number": "serial_number",
  "full name": "full_name",
  "age": "age",
  "aadhar number": "aadhar_number",
  "aadhar": "aadhar_number", // Alias
  "sai connect id": "sai_connect_id",
  "connect id": "sai_connect_id", // Alias
  "mobile number": "mobile_number",
  "mobile no": "mobile_number", // Alias
  "mobile": "mobile_number", // Alias
  "sss district": "sss_district",
  "district": "sss_district", // Alias
  "gender": "gender",
  "samiti or bhajan mandli": "samiti_or_bhajan_mandli",
  "samiti/bhajan mandli": "samiti_or_bhajan_mandli", // Alias
  "samiti": "samiti_or_bhajan_mandli", // Alias
  "education": "education",
  "special qualifications": "special_qualifications",
  "last service location": "last_service_location",
  "other service location": "other_service_location",
  "prashanti arrival": "prashanti_arrival",
  "arrival date": "prashanti_arrival", // Alias
  "prashanti departure": "prashanti_departure",
  "departure date": "prashanti_departure", // Alias
  "duty point": "duty_point",
  "is cancelled": "is_cancelled",
  "cancelled": "is_cancelled", // Alias

  // Hindi headers (lowercase)
  "क्रम संख्या": "serial_number",
  "पूरा नाम": "full_name",
  "आयु": "age",
  "आधार नंबर": "aadhar_number",
  "साई कनेक्ट आईडी": "sai_connect_id",
  "मोबाइल नंबर": "mobile_number",
  "एसएसएस जिला": "sss_district",
  "जिला": "sss_district",
  "लिंग": "gender",
  "समिति या भजन मंडली": "samiti_or_bhajan_mandli",
  "शिक्षा": "education",
  "विशेष योग्यता": "special_qualifications",
  "अंतिम सेवा स्थान": "last_service_location",
  "अन्य सेवा स्थान": "other_service_location",
  "प्रशांति आगमन": "prashanti_arrival",
  "प्रशांति प्रस्थान": "prashanti_departure",
  "ड्यूटी पॉइंट": "duty_point",
  "रद्द किया गया": "is_cancelled",
};

// Define expected database headers/columns and their requirements
const databaseSchema: { key: keyof DatabaseInsertData | 'serial_number', label: string, required: boolean, type: 'string' | 'number' | 'boolean' | 'date' }[] = [
  // Note: serial_number is often auto-generated, so not marked required for insert
  // { key: 'serial_number', label: 'Serial Number', required: false, type: 'string' },
  { key: 'sai_connect_id', label: 'SAI Connect ID', required: true, type: 'string' },
  { key: 'full_name', label: 'Full Name', required: true, type: 'string' },
  { key: 'age', label: 'Age', required: true, type: 'number' },
  { key: 'mobile_number', label: 'Mobile Number', required: true, type: 'string' },
  { key: 'sss_district', label: 'SSS District', required: true, type: 'string' },
  { key: 'aadhar_number', label: 'Aadhar Number', required: false, type: 'string' },
  { key: 'gender', label: 'Gender', required: false, type: 'string' },
  { key: 'samiti_or_bhajan_mandli', label: 'Samiti or Bhajan Mandli', required: false, type: 'string' },
  { key: 'education', label: 'Education', required: false, type: 'string' },
  { key: 'special_qualifications', label: 'Special Qualifications', required: false, type: 'string' },
  { key: 'last_service_location', label: 'Last Service Location', required: false, type: 'string' },
  { key: 'other_service_location', label: 'Other Service Location', required: false, type: 'string' },
  { key: 'prashanti_arrival', label: 'Prashanti Arrival', required: false, type: 'date' },
  { key: 'prashanti_departure', label: 'Prashanti Departure', required: false, type: 'date' },
  { key: 'duty_point', label: 'Duty Point', required: false, type: 'string' },
  { key: 'is_cancelled', label: 'Is Cancelled', required: false, type: 'boolean' } // Type for parsing, converted to 'yes'/'no' later
];


type DeduplicationStats = {
  totalRows: number;
  duplicateRows: number;
  uniqueRows: number;
  duplicateIds: string[];
}

function deduplicateVolunteers(volunteers: VolunteerExcelRow[]): {
  uniqueVolunteers: VolunteerExcelRow[];
  stats: DeduplicationStats;
} {
  const seen = new Map<string, VolunteerExcelRow>();
  const duplicateIds: string[] = [];

  volunteers.forEach((volunteer) => {
    // Use sai_connect_id for deduplication, ensure it's treated as string
    const id = volunteer.sai_connect_id ? String(volunteer.sai_connect_id).trim() : undefined;
    if (!id) return; // Skip rows without an ID for deduplication purposes

    if (seen.has(id)) {
      duplicateIds.push(id);
    } else {
      seen.set(id, volunteer);
    }
  });

  return {
    uniqueVolunteers: Array.from(seen.values()),
    stats: {
      totalRows: volunteers.length,
      duplicateRows: duplicateIds.length,
      uniqueRows: seen.size,
      duplicateIds
    }
  };
}

function normalizeBoolean(value: any): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.toLowerCase().trim();
    // Added 'y', 't', 'हां' for more flexibility
    return ['yes', 'true', '1', 'हाँ', 'y', 't', 'हां'].includes(normalized);
  }
  return false; // Default to false if not recognized
}

// Enhanced Validation Function
function validateVolunteerData(volunteer: VolunteerExcelRow, rowIndex: number): string[] {
  const errors: string[] = [];
  const requiredKeys: (keyof DatabaseInsertData)[] = databaseSchema
    .filter(h => h.required)
    .map(h => h.key as keyof DatabaseInsertData);

  // Check required fields first
  requiredKeys.forEach(key => {
    if (volunteer[key] === undefined || volunteer[key] === null || String(volunteer[key]).trim() === '') {
       const headerLabel = databaseSchema.find(h => h.key === key)?.label || key;
       errors.push(`Row ${rowIndex}: Required field "${headerLabel}" is missing.`);
    }
  });

  // If required fields are missing, stop further validation for this row
  if (errors.length > 0) return errors;

  // --- Specific Field Validations (only if required fields are present) ---

  // SAI Connect ID: Must be exactly 6 digits after cleaning
  const rawSaiConnectId = String(volunteer.sai_connect_id);
  const cleanId = rawSaiConnectId.replace(/\D/g, ''); // Remove non-digits
  if (cleanId.length !== 6) {
    errors.push(`Row ${rowIndex}: SAI Connect ID "${rawSaiConnectId}" must contain exactly 6 digits.`);
  } else {
     volunteer.sai_connect_id = cleanId; // Store cleaned ID
  }

  // Mobile Number: Must be exactly 10 digits after cleaning
  const rawMobile = String(volunteer.mobile_number);
  const cleanMobile = rawMobile.replace(/\D/g, '');
  if (cleanMobile.length !== 10) {
    errors.push(`Row ${rowIndex}: Mobile Number "${rawMobile}" must contain exactly 10 digits.`);
  } else {
     volunteer.mobile_number = cleanMobile; // Store cleaned number
  }

  // Aadhar Number (Optional): If present, must be 12 digits after cleaning
  if (volunteer.aadhar_number !== undefined && volunteer.aadhar_number !== null && String(volunteer.aadhar_number).trim() !== '') {
    const rawAadhar = String(volunteer.aadhar_number);
    const cleanAadhar = rawAadhar.replace(/\D/g, '');
    if (cleanAadhar.length !== 12) {
      errors.push(`Row ${rowIndex}: Aadhar Number "${rawAadhar}" must contain exactly 12 digits if provided.`);
    } else {
       volunteer.aadhar_number = cleanAadhar; // Store cleaned number
    }
  } else {
      volunteer.aadhar_number = null; // Ensure it's null if empty/missing
  }

  // Age: Must be a number between 18 and 99
  const ageNum = Number(volunteer.age);
  if (isNaN(ageNum) || ageNum < 18 || ageNum > 99) {
    errors.push(`Row ${rowIndex}: Age "${volunteer.age}" must be a number between 18 and 99.`);
  } else {
     volunteer.age = ageNum; // Store validated number
  }

  // Gender (Optional): If present, must be 'male' or 'female' (case-insensitive)
  if (volunteer.gender !== undefined && volunteer.gender !== null && String(volunteer.gender).trim() !== '') {
    const genderLower = String(volunteer.gender).toLowerCase().trim();
    if (!['male', 'female'].includes(genderLower)) {
      errors.push(`Row ${rowIndex}: Gender "${volunteer.gender}" must be 'male' or 'female' if provided.`);
    } else {
       volunteer.gender = genderLower; // Store normalized gender
    }
  } else {
      volunteer.gender = null; // Ensure it's null if empty/missing
  }

  // Dates (Optional): Attempt to parse if present
  ['prashanti_arrival', 'prashanti_departure'].forEach(key => {
      const dateKey = key as keyof VolunteerExcelRow;
      if (volunteer[dateKey] !== undefined && volunteer[dateKey] !== null && String(volunteer[dateKey]).trim() !== '') {
          try {
              let parsedDate: Date | null = null;
              if (typeof volunteer[dateKey] === 'number') {
                  // Try parsing Excel date number
                  const excelDate = XLSX.SSF.parse_date_code(volunteer[dateKey] as number);
                  if (excelDate) {
                      // Use Date.UTC to avoid timezone issues from Excel numbers
                      parsedDate = new Date(Date.UTC(excelDate.y, excelDate.m - 1, excelDate.d));
                  }
              } else if (volunteer[dateKey] instanceof Date) {
                  parsedDate = volunteer[dateKey] as Date;
              } else {
                  // Try parsing common string formats (add more as needed)
                  parsedDate = new Date(String(volunteer[dateKey]));
              }

              // Check if the parsed date is valid
              if (parsedDate && !isNaN(parsedDate.getTime())) {
                  // Store valid date as ISO string (YYYY-MM-DD) for consistency
                  volunteer[dateKey] = parsedDate.toISOString().split('T')[0];
              } else {
                  // If parsing failed, push error and set to null
                  errors.push(`Row ${rowIndex}: Invalid date format for ${key}: "${volunteer[dateKey]}"`);
                  volunteer[dateKey] = null;
              }
          } catch (e) {
              // Catch any other errors during date processing
              errors.push(`Row ${rowIndex}: Error parsing date for ${key}: "${volunteer[dateKey]}"`);
              volunteer[dateKey] = null;
          }
      } else {
          // Ensure null if empty/missing
          volunteer[dateKey] = null;
      }
  });


  // Normalize boolean for is_cancelled (actual 'yes'/'no' conversion happens later)
  if (volunteer.is_cancelled !== undefined && volunteer.is_cancelled !== null) {
      volunteer.is_cancelled = normalizeBoolean(volunteer.is_cancelled);
  } else {
      volunteer.is_cancelled = false; // Default to false if missing
  }

  return errors;
}


// Updated function to transform validated data to DB format
function transformToDatabaseFormat(volunteer: VolunteerExcelRow): DatabaseInsertData {
    // Validation should ensure required fields are present and correctly typed by now
    const dbData: DatabaseInsertData = {
      sai_connect_id: String(volunteer.sai_connect_id!), // Ensure string
      full_name: String(volunteer.full_name!),
      age: Number(volunteer.age!),
      mobile_number: String(volunteer.mobile_number!),
      sss_district: String(volunteer.sss_district!),
      is_cancelled: normalizeBoolean(volunteer.is_cancelled) ? 'yes' : 'no', // Convert boolean to 'yes'/'no'

      // Optional fields - use validated value or null
      aadhar_number: volunteer.aadhar_number ? String(volunteer.aadhar_number) : null,
      gender: volunteer.gender ? String(volunteer.gender) : null,
      samiti_or_bhajan_mandli: volunteer.samiti_or_bhajan_mandli ? String(volunteer.samiti_or_bhajan_mandli) : null,
      education: volunteer.education ? String(volunteer.education) : null,
      special_qualifications: volunteer.special_qualifications ? String(volunteer.special_qualifications) : null,
      last_service_location: volunteer.last_service_location ? String(volunteer.last_service_location) : null,
      other_service_location: volunteer.other_service_location ? String(volunteer.other_service_location) : null,
      prashanti_arrival: volunteer.prashanti_arrival ? String(volunteer.prashanti_arrival) : null, // Already ISO string or null from validation
      prashanti_departure: volunteer.prashanti_departure ? String(volunteer.prashanti_departure) : null, // Already ISO string or null from validation
      duty_point: volunteer.duty_point ? String(volunteer.duty_point) : null,
    };

    // Return the constructed object directly.
    return dbData;
}


interface ExcelUploadProps {
  onSuccess?: () => void;
  userRole: UserRole; // Add userRole prop
}

export function ExcelUpload({ onSuccess, userRole }: ExcelUploadProps) { // Accept userRole
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const { toast } = useToast()

  // Determine if the user can upload based on role
  const canUpload = userRole === 'super_admin';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
    }
  }

  // Removed normalizeHeader and parseBoolean as logic is integrated elsewhere

  const handleUpload = async () => {
    // Prevent upload if user doesn't have permission
    if (!canUpload) {
      toast({ title: "Permission Denied", description: "You do not have permission to upload data.", variant: "destructive" });
      return;
    }

    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select an Excel file to upload.",
        variant: "destructive",
      })
      return
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase()
    if (!['xlsx', 'xls', 'csv'].includes(fileExt || '')) {
      toast({
        title: "Invalid file format",
        description: "Please upload an Excel or CSV file (.xlsx, .xls, or .csv).",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)
    setProgress(10)

    try {
      // Read the file
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      // Read as raw values to handle dates better
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true }) as unknown[][]

      if (rawData.length < 2) {
        throw new Error("File is empty or contains only headers")
      }

      // --- Header Processing ---
      const excelHeaders = (rawData[0] as any[]).map(header =>
        header ? String(header).toLowerCase().trim() : ''
      );

      const columnMapping: { [excelHeaderIndex: number]: keyof VolunteerExcelRow } = {};
      const mappedDbKeys = new Set<string>();
      const missingRequiredHeaders: string[] = [];

      excelHeaders.forEach((excelHeader, index) => {
        if (!excelHeader) return;
        const mappedKey = headerMapping[excelHeader];
        if (mappedKey) {
          columnMapping[index] = mappedKey;
          mappedDbKeys.add(mappedKey);
        } else {
          // Attempt matching against labels as fallback
          const matchedSchema = databaseSchema.find(h => h.label.toLowerCase() === excelHeader);
          if (matchedSchema) {
             columnMapping[index] = matchedSchema.key as keyof VolunteerExcelRow;
             mappedDbKeys.add(matchedSchema.key);
          } else {
             console.warn(`Unmatched header in file: "${excelHeaders[index]}" (column ${index + 1})`);
          }
        }
      });

      // Check if all required DB headers were found in the Excel file
      databaseSchema.forEach(dbHeader => {
        if (dbHeader.required && !mappedDbKeys.has(dbHeader.key)) {
          missingRequiredHeaders.push(dbHeader.label);
        }
      });

      if (missingRequiredHeaders.length > 0) {
        toast({
          title: "Missing Required Headers",
          description: `The file is missing the following required columns: ${missingRequiredHeaders.join(', ')}. Please check the instructions.`,
          variant: "destructive",
          duration: 7000
        });
        setIsUploading(false); // Reset state
        setProgress(0);
        setFile(null);
        const fileInput = document.getElementById('excel-file') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        return; // Stop processing
      }

      setProgress(30);

      // --- Row Processing & Validation ---
      const rows = rawData.slice(1);
      const processedVolunteers: VolunteerExcelRow[] = [];
      const allValidationErrors: string[] = [];

      rows.forEach((row, index) => {
        const rowIndexInFile = index + 2; // User-friendly row number (1-based index + header)
        const volunteer: VolunteerExcelRow = {};

        // Map row data based on headers
        Object.entries(columnMapping).forEach(([colIndexStr, dbKey]) => {
          const colIndex = parseInt(colIndexStr);
          volunteer[dbKey] = row[colIndex]; // Keep raw value for now
        });

        // Validate the structured row data
        const rowErrors = validateVolunteerData(volunteer, rowIndexInFile);
        if (rowErrors.length > 0) {
          allValidationErrors.push(...rowErrors);
        } else {
          processedVolunteers.push(volunteer); // Add validated volunteer
        }
      });

      // If validation errors occurred, show them and stop
      if (allValidationErrors.length > 0) {
        console.error("Validation errors:", allValidationErrors);
        // Show only the first few errors in the toast for brevity
        const errorSummary = allValidationErrors.slice(0, 5).join('; ');
        toast({
          title: `Data Validation Failed (${allValidationErrors.length} errors)`,
          description: `Please fix the errors in your file. Examples: ${errorSummary}${allValidationErrors.length > 5 ? '...' : ''}`,
          variant: "destructive",
          duration: 10000 // Longer duration for errors
        });
         setIsUploading(false); // Reset state
         setProgress(0);
         setFile(null);
         const fileInput = document.getElementById('excel-file') as HTMLInputElement;
         if (fileInput) fileInput.value = '';
        return; // Stop processing
      }

      setProgress(40);

      // --- Deduplication ---
      const { uniqueVolunteers, stats } = deduplicateVolunteers(processedVolunteers);
      if (stats.duplicateRows > 0) {
        toast({
          title: "Duplicate Records Found",
          description: `${stats.duplicateRows} duplicate SAI Connect IDs found and ignored. ${stats.uniqueRows} unique records will be processed.`,
          variant: "default", // Use default variant for info/warning
          duration: 6000
        });
        console.log("Ignored duplicate SAI Connect IDs:", stats.duplicateIds);
      }

      if (uniqueVolunteers.length === 0) {
         toast({ title: "No Valid Data", description: "No valid, unique volunteer records found to upload.", variant: "destructive" });
         setIsUploading(false); setProgress(0); setFile(null);
         const fileInput = document.getElementById('excel-file') as HTMLInputElement; if (fileInput) fileInput.value = '';
         return;
      }

      setProgress(50);

      // --- Database Insertion ---
      const batchSize = 50; // Adjust as needed
      const batches = [];
      for (let i = 0; i < uniqueVolunteers.length; i += batchSize) {
        batches.push(uniqueVolunteers.slice(i, i + batchSize));
      }

      let completedBatches = 0;
      const insertErrors: string[] = [];
      let successfulInserts = 0;

      for (const batch of batches) {
        try {
          // Transform data just before insertion
          const transformedBatch = batch.map(v => transformToDatabaseFormat(v));

          // Upsert logic: Insert new volunteers or update existing ones based on sai_connect_id
          const { error, data } = await supabase
            .from("volunteers_volunteers")
            .upsert(transformedBatch, { onConflict: 'sai_connect_id' }) // Use upsert
            .select(); // Select to get count

          if (error) {
            console.error("Database batch error:", error);
            // Attempt to provide more specific feedback for common errors
            if (error.code === '23502') { // Not-null violation
                 insertErrors.push(`Batch ${completedBatches + 1}: Data missing for a required database column.`);
            } else if (error.code === '22P02') { // Invalid text representation (e.g., wrong data type)
                 insertErrors.push(`Batch ${completedBatches + 1}: Invalid data type found.`);
            }
             else {
                 insertErrors.push(`Batch ${completedBatches + 1}: DB Error (${error.code || 'unknown'})`);
            }
          } else {
            successfulInserts += data?.length || 0; // Count successful upserts
          }
        } catch (batchError) {
          console.error(`Error processing batch ${completedBatches + 1}:`, batchError);
          insertErrors.push(`Batch ${completedBatches + 1}: Unexpected error during processing.`);
        } finally {
           completedBatches++;
           setProgress(50 + Math.floor((completedBatches / batches.length) * 50));
        }
      }

      // --- Final Feedback ---
      if (insertErrors.length > 0) {
        const errorSummary = insertErrors.slice(0,3).join('; ');
        toast({
          title: "Upload Completed with Errors",
          description: `Processed ${successfulInserts} records. ${insertErrors.length} batch(es) failed. Errors: ${errorSummary}${insertErrors.length > 3 ? '...' : ''}. Check console for details.`,
          variant: "destructive",
          duration: 10000
        });
        console.error("Upload batch errors:", insertErrors);
      } else {
        toast({
          title: "Upload Successful",
          description: `${successfulInserts} unique volunteer records processed successfully.`,
          variant: "default", // Use default for success
          duration: 5000
        });
      }

      if (onSuccess) onSuccess(); // Trigger data refresh on parent page

    } catch (error) {
      console.error("Error during upload process:", error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive",
        duration: 7000
      });
    } finally {
      setIsUploading(false);
      setProgress(0);
      setFile(null);
      // Reset the file input visually
      const fileInput = document.getElementById('excel-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    }
  }


  return (
    <Card className="border-blue-100 dark:border-blue-900/50 relative"> {/* Added relative positioning */}
      <CardHeader className="flex flex-row items-start justify-between"> {/* Changed items-center to items-start */}
        <div> {/* Wrap title and description */}
          <CardTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <Upload className="h-5 w-5" />
            Bulk Upload Volunteers
          </CardTitle>
          <CardDescription className="text-muted-foreground pt-1"> {/* Added padding top */}
            Upload or update volunteer data from Excel (.xlsx, .xls) or CSV files.
          </CardDescription>
        </div>
         {/* Instructions Popover Trigger */}
         <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground -mt-1 -mr-1"> {/* Adjusted margin for alignment */}
                <Info className="h-5 w-5" />
                <span className="sr-only">View Upload Instructions</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96" side="left" align="start"> {/* Increased width, adjusted side/align */}
              <div className="space-y-2">
                <h4 className="font-medium leading-none">Upload Instructions</h4>
                <div className="text-sm text-muted-foreground">
                  <ul className="list-disc space-y-1 pl-4">
                    <li>File: Excel (.xlsx, .xls) or CSV.</li>
                    <li>First row must be headers (flexible names).</li>
                    <li><strong>Required:</strong> {databaseSchema.filter(h => h.required).map(h => h.label).join(', ')}.</li>
                    <li>Optional: {databaseSchema.filter(h => !h.required).map(h => h.label).join(', ')}.</li>
                    <li>SAI Connect ID: 6 digits.</li>
                    <li>Mobile: 10 digits.</li>
                    <li>Aadhar: 12 digits (if provided).</li>
                    <li>Age: 18-99.</li>
                    <li>Gender: 'male'/'female' (if provided).</li>
                    <li>Is Cancelled: 'yes'/'no', 'true'/'false', 1/0 (defaults to 'no').</li>
                    <li>Dates: Standard formats (YYYY-MM-DD, etc.).</li>
                    <li>Existing records (by SAI Connect ID) are updated.</li>
                    <li>Duplicates within the file are ignored.</li>
                  </ul>
                </div>
              </div>
            </PopoverContent>
          </Popover>
      </CardHeader>
      <CardContent className="space-y-4 pt-0"> {/* Removed static Alert box, adjusted padding */}
        <div className="space-y-2">
          <Label htmlFor="excel-file" className="text-muted-foreground">Select File</Label>
          <Input
            id="excel-file"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            disabled={isUploading || !canUpload}
            className={cn(
              "w-full",
              (isUploading || !canUpload) && "opacity-50 cursor-not-allowed"
            )}
          />
        </div>
        {isUploading && (
          <div className="space-y-2">
            <Label className="text-muted-foreground">Upload Progress</Label>
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground text-center">{progress}% Complete</p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleUpload}
          disabled={!file || isUploading || !canUpload}
          className={cn(
            "w-full",
            (!file || isUploading || !canUpload) && "opacity-50 cursor-not-allowed"
          )}
          title={!canUpload ? "Permission Denied" : ""}
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload Data
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
