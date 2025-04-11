"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Upload } from "lucide-react"
import * as XLSX from "xlsx"
import { supabase } from "@/lib/supabase"
import { Progress } from "@/components/ui/progress"
// Removed unused YesNoType import
import { UserRole } from "@/contexts/auth-context" // Import UserRole
import { cn } from "@/lib/utils"

interface VolunteerExcelData {
  serial_number: string | null;
  full_name: string | null;
  age: number | null;
  aadhar_number: string | null;
  sai_connect_id: string;
  mobile_number: string | null;
  sss_district: string | null;
  gender: string | null;
  samiti_or_bhajan_mandli: string | null;
  education: string | null;
  special_qualifications: string | null;
  last_service_location: string | null;
  other_service_location: string | null;
  prashanti_arrival: string | null;
  prashanti_departure: string | null;
  duty_point: string | null;
  is_cancelled: boolean;
}

// Header mapping for both English and Hindi
const headerMapping: { [key: string]: string } = {
  // English headers
  "serial number": "serial_number",
  "full name": "full_name",
  "age": "age",
  "aadhar number": "aadhar_number",
  "sai connect id": "sai_connect_id",
  "mobile number": "mobile_number",
  "sss district": "sss_district",
  "gender": "gender",
  "samiti or bhajan mandli": "samiti_or_bhajan_mandli",
  "education": "education",
  "special qualifications": "special_qualifications",
  "last service location": "last_service_location",
  "other service location": "other_service_location",
  "prashanti arrival": "prashanti_arrival",
  "prashanti departure": "prashanti_departure",
  "duty point": "duty_point",
  "is cancelled": "is_cancelled",
  
  // Hindi headers (add your Hindi translations here)
  "क्रम संख्या": "serial_number",
  "पूरा नाम": "full_name",
  "आयु": "age",
  "आधार नंबर": "aadhar_number",
  "साई कनेक्ट आईडी": "sai_connect_id",
  "मोबाइल नंबर": "mobile_number",
  "एसएसएस जिला": "sss_district",
  "जिला": "sss_district",
  "समिति या भजन मंडली": "samiti_or_bhajan_mandli",
  "शिक्षा": "education",
  "विशेष योग्यता": "special_qualifications",
  "अंतिम सेवा स्थान": "last_service_location",
  "अन्य सेवा स्थान": "other_service_location",
  "प्रशांति आगमन": "prashanti_arrival",
  "प्रशांति प्रस्थान": "prashanti_departure",
  "ड्यूटी पॉइंट": "duty_point",
  "रद्द किया गया": "is_cancelled",
}

// Add this type definition at the top with other types
type DeduplicationStats = {
  totalRows: number;
  duplicateRows: number;
  uniqueRows: number;
  duplicateIds: string[];
}

// Add this function before the ExcelUpload component
function deduplicateVolunteers(volunteers: Partial<VolunteerExcelData>[]): {
  uniqueVolunteers: Partial<VolunteerExcelData>[];
  stats: DeduplicationStats;
} {
  const seen = new Map<string, Partial<VolunteerExcelData>>();
  const duplicateIds: string[] = [];

  volunteers.forEach((volunteer) => {
    const id = volunteer.sai_connect_id;
    if (!id) return;

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

// Add these helper functions at the top
function normalizeBoolean(value: any): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.toLowerCase().trim();
    return ['yes', 'true', '1', 'हाँ', 'y', 't'].includes(normalized);
  }
  return false;
}

function validateVolunteerData(volunteer: Partial<VolunteerExcelData>, rowIndex: number): string[] {
  const errors: string[] = [];
  
  // Required fields validation
  if (!volunteer.sai_connect_id) {
    errors.push(`Row ${rowIndex}: SAI Connect ID is required`);
  } else {
    // Clean and validate SAI Connect ID
    const cleanId = String(volunteer.sai_connect_id).replace(/\D/g, '');
    if (cleanId.length !== 6) {
      // If the ID is too short, try to pad it with zeros
      if (cleanId.length < 6) {
        const paddedId = cleanId.padStart(6, '0');
        volunteer.sai_connect_id = paddedId;
        console.log(`Row ${rowIndex}: Padded SAI Connect ID from ${cleanId} to ${paddedId}`);
      } else {
        errors.push(`Row ${rowIndex}: SAI Connect ID must be 6 digits (got ${cleanId.length} digits)`);
      }
    } else {
      // Update the ID with cleaned version
      volunteer.sai_connect_id = cleanId;
    }
  }

  if (!volunteer.full_name) {
    errors.push(`Row ${rowIndex}: Full Name is required`);
  }

  // Mobile number validation
  if (volunteer.mobile_number) {
    // Clean mobile number
    const cleanMobile = String(volunteer.mobile_number).replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      // If the number is too short and looks like a single digit, skip it
      if (cleanMobile.length === 1) {
        console.warn(`Row ${rowIndex}: Skipping invalid mobile number "${volunteer.mobile_number}"`);
        delete volunteer.mobile_number;
      } else {
        errors.push(`Row ${rowIndex}: Mobile number must be 10 digits (got ${cleanMobile.length} digits)`);
      }
    } else {
      // Update the mobile number with cleaned version
      volunteer.mobile_number = cleanMobile;
    }
  }

  // Aadhar number validation
  if (volunteer.aadhar_number) {
    // Clean Aadhar number
    const cleanAadhar = String(volunteer.aadhar_number).replace(/\D/g, '');
    if (cleanAadhar.length !== 12) {
      // If the number is too short and looks like a single digit, skip it
      if (cleanAadhar.length === 1) {
        console.warn(`Row ${rowIndex}: Skipping invalid Aadhar number "${volunteer.aadhar_number}"`);
        delete volunteer.aadhar_number;
      } else {
        errors.push(`Row ${rowIndex}: Aadhar number must be 12 digits (got ${cleanAadhar.length} digits)`);
      }
    } else {
      // Update the Aadhar number with cleaned version
      volunteer.aadhar_number = cleanAadhar;
    }
  }

  // Age validation
  if (volunteer.age !== undefined && volunteer.age !== null && (isNaN(volunteer.age) || volunteer.age < 1 || volunteer.age > 99)) { // Added isNaN check
    // If age is invalid, set it to null
    console.warn(`Row ${rowIndex}: Invalid age "${volunteer.age}", setting to null`);
    volunteer.age = null;
  }

  return errors;
}

// Add this type definition at the top with other types
type DatabaseFields = {
  sai_connect_id: string;
  full_name: string;
  age?: number | null;
  aadhar_number?: string;
  mobile_number?: string;
  sss_district?: string;
  samiti_or_bhajan_mandli?: string;
  education?: string;
  special_qualifications?: string;
  last_service_location?: string | null;
  other_service_location?: string | null;
  prashanti_arrival?: string | null;
  prashanti_departure?: string | null;
  duty_point?: string | null;
  is_cancelled: boolean;
}

// Add this function to filter and transform data
function transformToDatabaseFormat(volunteer: Partial<VolunteerExcelData>): Partial<DatabaseFields> {
  // Explicitly define fields that can be string | null | undefined and handle them
  const dbFields: Partial<DatabaseFields> = {
    sai_connect_id: volunteer.sai_connect_id, // Required, should not be null/undefined here
    full_name: volunteer.full_name,       // Required, should not be null/undefined here
    age: volunteer.age,                   // Optional number | null
    aadhar_number: volunteer.aadhar_number ?? undefined, // Convert null to undefined if needed by DB type
    mobile_number: volunteer.mobile_number ?? undefined, // Convert null to undefined
    sss_district: volunteer.sss_district ?? undefined,   // Convert null to undefined
    gender: volunteer.gender ?? undefined,             // Added gender, convert null to undefined
    samiti_or_bhajan_mandli: volunteer.samiti_or_bhajan_mandli ?? undefined, // Convert null to undefined
    education: volunteer.education ?? undefined,         // Convert null to undefined
    special_qualifications: volunteer.special_qualifications ?? undefined, // Convert null to undefined
    last_service_location: volunteer.last_service_location, // Already allows null
    other_service_location: volunteer.other_service_location, // Already allows null
    prashanti_arrival: volunteer.prashanti_arrival,       // Already allows null
    prashanti_departure: volunteer.prashanti_departure,   // Already allows null
    duty_point: volunteer.duty_point ?? undefined,         // Convert null to undefined
    is_cancelled: volunteer.is_cancelled ?? false        // Default to false if null/undefined
  };

  // Remove only undefined values, keep nulls where allowed by DatabaseFields type
  return Object.fromEntries(
    Object.entries(dbFields).filter(([_, value]) => value !== undefined)
  ) as Partial<DatabaseFields>;
}

// Add this type for database headers
type DatabaseHeader = {
  key: string;
  label: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean' | 'date';
}

// Define database headers
const databaseHeaders: DatabaseHeader[] = [
  { key: 'sai_connect_id', label: 'SAI Connect ID', required: true, type: 'string' },
  { key: 'full_name', label: 'Full Name', required: true, type: 'string' },
  { key: 'age', label: 'Age', required: true, type: 'number' },
  { key: 'aadhar_number', label: 'Aadhar Number', required: false, type: 'string' },
  { key: 'mobile_number', label: 'Mobile Number', required: true, type: 'string' },
  { key: 'sss_district', label: 'SSS District', required: true, type: 'string' },
  { key: 'samiti_or_bhajan_mandli', label: 'Samiti or Bhajan Mandli', required: false, type: 'string' },
  { key: 'education', label: 'Education', required: false, type: 'string' },
  { key: 'special_qualifications', label: 'Special Qualifications', required: false, type: 'string' },
  { key: 'last_service_location', label: 'Last Service Location', required: false, type: 'string' },
  { key: 'other_service_location', label: 'Other Service Location', required: false, type: 'string' },
  { key: 'prashanti_arrival', label: 'Prashanti Arrival', required: false, type: 'string' },
  { key: 'prashanti_departure', label: 'Prashanti Departure', required: false, type: 'string' },
  { key: 'duty_point', label: 'Duty Point', required: false, type: 'string' },
  { key: 'is_cancelled', label: 'Is Cancelled', required: false, type: 'boolean' }
];

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

  const normalizeHeader = (header: string): string => {
    const normalized = header.toLowerCase().trim()
    return headerMapping[normalized] || normalized
  }

  const parseBoolean = (value: any): boolean => {
    if (typeof value === 'boolean') return value
    if (typeof value === 'string') {
      const lowered = value.toLowerCase().trim()
      return lowered === 'yes' || lowered === 'true' || lowered === 'हाँ' || lowered === '1'
    }
    return Boolean(value)
  }

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
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][]

      if (rawData.length < 2) {
        throw new Error("File is empty or contains only headers")
      }

      // Get Excel headers and normalize them
      const excelHeaders = (rawData[0] as string[]).map(header => 
        header ? String(header).toLowerCase().trim() : ''
      )
      
      // Create header mapping
      const columnMapping: { [key: number]: string } = {}
      const missingRequiredHeaders: string[] = []

      // Match Excel headers with database headers
      excelHeaders.forEach((excelHeader, index) => {
        if (!excelHeader) return

        // Try to match with database header key or label
        const matchedHeader = databaseHeaders.find(dbHeader => 
          dbHeader.key.toLowerCase() === excelHeader ||
          dbHeader.label.toLowerCase() === excelHeader
        )

        if (matchedHeader) {
          columnMapping[index] = matchedHeader.key
        } else {
          console.warn(`Unmatched header: "${excelHeader}"`)
        }
      })

      // Check for required headers
      databaseHeaders.forEach(dbHeader => {
        if (dbHeader.required) {
          const found = Object.values(columnMapping).includes(dbHeader.key)
          if (!found) {
            missingRequiredHeaders.push(dbHeader.label)
          }
        }
      })

      // If required headers are missing, show error
      if (missingRequiredHeaders.length > 0) {
        toast({
          title: "Missing Required Headers",
          description: `The following required headers are missing: ${missingRequiredHeaders.join(', ')}`,
          variant: "destructive",
        })
        return
      }

      setProgress(30)

      // Process rows with header mapping
      const rows = rawData.slice(1) as unknown[][]
      const volunteers: Partial<VolunteerExcelData>[] = []
      const validationErrors: string[] = []

      rows.forEach((row, index) => {
        try {
          const volunteer: Partial<VolunteerExcelData> = {
            is_cancelled: false
          }

          // Process each cell based on column mapping
          Object.entries(columnMapping).forEach(([colIndex, dbKey]) => {
            try {
              const value = row[parseInt(colIndex)]
              if (value !== undefined && value !== null) {
                const dbHeader = databaseHeaders.find(h => h.key === dbKey)
                if (!dbHeader) return

                switch (dbHeader.type) {
                  case 'number':
                    if (dbKey === 'age') {
                      const ageValue = parseInt(String(value))
                      volunteer.age = isNaN(ageValue) ? null : ageValue
                    }
                    break
                  case 'boolean':
                    (volunteer as any)[dbKey] = normalizeBoolean(value)
                    break
                  case 'date':
                    if (dbKey === 'prashanti_arrival' || dbKey === 'prashanti_departure') {
                      try {
                        const dateValue = XLSX.SSF.parse_date_code(Number(value))
                        if (dateValue) {
                          (volunteer as any)[dbKey] = new Date(dateValue.y, dateValue.m - 1, dateValue.d).toISOString()
                        } else {
                          (volunteer as any)[dbKey] = null
                        }
                      } catch (dateError) {
                        (volunteer as any)[dbKey] = null
                        console.warn(`Invalid date format in row ${index + 2}, column ${parseInt(colIndex) + 1}`)
                      }
                    }
                    break
                  default:
                    (volunteer as any)[dbKey] = String(value).trim()
                }
              }
            } catch (cellError) {
              console.warn(`Error processing cell in row ${index + 2}, column ${parseInt(colIndex) + 1}:`, cellError)
              validationErrors.push(`Row ${index + 2}, Column ${parseInt(colIndex) + 1}: Invalid data format`)
            }
          })

          // Validate the volunteer data
          const rowErrors = validateVolunteerData(volunteer, index + 2)
          if (rowErrors.length > 0) {
            validationErrors.push(...rowErrors)
          } else {
            volunteers.push(volunteer)
          }
        } catch (error) {
          console.error(`Error processing row ${index + 2}:`, error)
          validationErrors.push(`Row ${index + 2}: ${error instanceof Error ? error.message : 'Invalid data format'}`)
        }
      })

      // If there are validation errors, show them and stop
      if (validationErrors.length > 0) {
        console.error("Validation errors:", validationErrors)
        toast({
          title: "Data Validation Failed",
          description: `Found ${validationErrors.length} validation errors. Some data has been automatically corrected (padded IDs, removed invalid numbers). Please check the console for details.`,
          variant: "destructive",
        })
        return
      }

      setProgress(40)

      // Deduplicate volunteers
      const { uniqueVolunteers, stats } = deduplicateVolunteers(volunteers)

      // Show deduplication results
      if (stats.duplicateRows > 0) {
        toast({
          title: "Duplicate Records Found (Warning)", // Adjusted title
          description: `Found ${stats.duplicateRows} duplicate records out of ${stats.totalRows} total records. ${stats.uniqueRows} unique records will be uploaded. Check console for duplicate IDs.`,
          variant: "default", // Changed variant from warning to default
          duration: 5000 // Increased duration
        })
        console.log("Duplicate SAI Connect IDs:", stats.duplicateIds)
      }

      setProgress(50)

      // Insert data in batches with error handling
      const batchSize = 50
      const batches = []
      for (let i = 0; i < uniqueVolunteers.length; i += batchSize) {
        batches.push(uniqueVolunteers.slice(i, i + batchSize))
      }

      let completedBatches = 0
      let errors: string[] = []
      let successfulInserts = 0
      let ignoredFields: string[] = []

      // Process batches sequentially to avoid promise scope issues
      for (const batch of batches) {
        try {
          // Transform the data to match database format
          const transformedBatch = batch.map(volunteer => transformToDatabaseFormat(volunteer))
          
          // Log any ignored fields from the first row (for debugging)
          if (completedBatches === 0 && batch[0]) {
            const extraFields = Object.keys(batch[0]).filter(
              key => !Object.keys(transformedBatch[0]).includes(key)
            )
            if (extraFields.length > 0) {
              ignoredFields = extraFields
              console.log("Ignored fields:", ignoredFields)
            }
          }

          // Use await to ensure each batch is processed before moving to the next
          const { error, data } = await supabase
            .from("volunteers_volunteers")
            .insert(transformedBatch)
            .select()

          if (error) {
            console.error("Database error:", error)
            if (error.code === '23505') { // Unique violation error code
              errors.push(`Batch ${completedBatches + 1}: Duplicate SAI Connect IDs found. Please check the data.`)
            } else {
              errors.push(`Batch ${completedBatches + 1}: ${error.message}`)
            }
          } else {
            successfulInserts += data?.length || 0
          }

        completedBatches++
        setProgress(50 + Math.floor((completedBatches / batches.length) * 50))
        } catch (error) {
          console.error(`Error inserting batch ${completedBatches + 1}:`, error)
          errors.push(`Batch ${completedBatches + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      if (errors.length > 0) {
        toast({
          title: "Upload completed with errors",
          description: `Successfully uploaded ${successfulInserts} volunteers. ${errors.length} errors occurred.`,
          variant: "destructive",
        })
        console.error("Upload errors:", errors)
      } else {
        let successMessage = `${successfulInserts} unique volunteers have been added to the database.`
        if (ignoredFields.length > 0) {
          successMessage += `\nNote: ${ignoredFields.length} extra fields were ignored.`
        }
      toast({
        title: "Upload successful",
          description: successMessage,
      })
      }

      if (onSuccess) onSuccess()
    } catch (error) {
      console.error("Error uploading file:", error)
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred while processing the file.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
      setProgress(0)
      setFile(null)
      // Reset the file input
      const fileInput = document.getElementById('excel-file') as HTMLInputElement
      if (fileInput) fileInput.value = ''
    }
  }

  return (
    <Card className="border-blue-100 dark:border-blue-900/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
          <Upload className="h-5 w-5" />
          Bulk Upload Volunteers
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Upload volunteer data from Excel (.xlsx, .xls) or CSV files
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
