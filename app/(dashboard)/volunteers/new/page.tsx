"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createVolunteerInDb } from "@/lib/supabase-service"
import { Loader2, UserPlus, ArrowLeft } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { motion } from "framer-motion"
import type { YesNoType } from "@/lib/supabase-service"

const SSS_DISTRICTS = [
  "Amla",
  "Anoopur",
  "Balaghat",
  "Betul",
  "Bhopal",
  "Burhanpur",
  "Chhindwada",
  "Chichli Narsinghpur",
  "Damoh",
  "Gadarwara",
  "Ghansore",
  "Guna",
  "Gwalior",
  "Indore",
  "Jabalpur",
  "Kaniwada",
  "Katni",
  "Khandwa",
  "Lalburra",
  "Mandla",
  "Narmadapuram",
  "Ratlam",
  "Rewa",
  "Sagar",
  "Satna",
  "Seoni",
  "Seoni Malwa",
  "Sahadol",
  "Singraulli",
  "Ujjain"
]

const EDUCATION_LEVELS = [
  "Primary (1st to 5th)",
  "High School (6th to 8th)",
  "(Higher Secondary or 10th)",
  "(Senior Secondary or 12th)",
  "Graduation",
  "Post-Graduation",
  "Doctorate"
]

export default function NewVolunteerPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form fields
  const [saiConnectId, setSaiConnectId] = useState("")
  const [fullName, setFullName] = useState("")
  const [age, setAge] = useState("")
  const [mobileNumber, setMobileNumber] = useState("")
  const [aadharNumber, setAadharNumber] = useState("")
  const [sssDistrict, setSssDistrict] = useState("")
  const [gender, setGender] = useState("")
  const [samiti, setSamiti] = useState("")
  const [education, setEducation] = useState("")
  const [qualifications, setQualifications] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Validate full name (only alphabets and spaces)
    if (!/^[A-Za-z\s]+$/.test(fullName)) {
      toast({
        title: "Invalid Name",
        description: "Name should only contain alphabets and spaces",
        variant: "destructive",
      })
      setIsSubmitting(false)
      return
    }

    // Validate SAI Connect ID (only numbers)
    if (!/^\d{6}$/.test(saiConnectId)) {
      toast({
        title: "Invalid SAI Connect ID",
        description: "SAI Connect ID must be exactly 6 digits",
        variant: "destructive",
      })
      setIsSubmitting(false)
      return
    }

    // Validate age (between 18 and 100)
    const ageNum = parseInt(age)
    if (isNaN(ageNum) || ageNum < 5 || ageNum > 100) {
      toast({
        title: "Invalid Age",
        description: "Age must be between 18 and 100",
        variant: "destructive",
      })
      setIsSubmitting(false)
      return
    }

    // Validate mobile number (exactly 10 digits)
    if (mobileNumber && !/^\d{10}$/.test(mobileNumber)) {
      toast({
        title: "Invalid Mobile Number",
        description: "Mobile number must be exactly 10 digits",
        variant: "destructive",
      })
      setIsSubmitting(false)
      return
    }

    // Validate Aadhar number (exactly 12 digits)
    if (aadharNumber && !/^\d{12}$/.test(aadharNumber)) {
      toast({
        title: "Invalid Aadhar Number",
        description: "Aadhar number must be exactly 12 digits",
        variant: "destructive",
      })
      setIsSubmitting(false)
      return
    }

    try {
      const volunteerData = {
        sai_connect_id: saiConnectId,
        full_name: fullName,
        age: age ? Number.parseInt(age) : null,
        mobile_number: mobileNumber,
        aadhar_number: aadharNumber,
        sss_district: sssDistrict,
        gender: gender,
        samiti_or_bhajan_mandli: samiti,
        education: education,
        special_qualifications: qualifications || null,
        is_cancelled: 'no',
        serial_number: null,
        prashanti_arrival: null,
        prashanti_departure: null,
        duty_point: null,
        last_service_location: null,
        other_service_location: null,
        created_by_id: null
      };

      console.log('Submitting volunteer data:', volunteerData);
      await createVolunteerInDb(volunteerData);

      toast({
        title: "Success!",
        description: `Volunteer ${fullName} has been added successfully.`,
      })
      // Add a small delay to show the success state
      await new Promise(resolve => setTimeout(resolve, 1000))
      router.push("/volunteers")
    } catch (error) {
      console.error("Error creating volunteer:", error)
      toast({
        title: "Error",
        description: "Failed to create volunteer. Please check the SAI Connect ID and try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add Volunteer</h1>
          <p className="text-muted-foreground">Create a new volunteer record</p>
        </div>
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="text-sai-orange hover:text-sai-orange-dark"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-sai-orange/20">
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-sai-orange" />
                New Volunteer
              </CardTitle>
              <CardDescription>Add a new volunteer to the system</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sai-connect-id">SAI Connect ID</Label>
                  <Input
                    id="sai-connect-id"
                    placeholder="Enter 6-digit SAI Connect ID"
                    value={saiConnectId}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6)
                      setSaiConnectId(value)
                    }}
                    maxLength={6}
                    pattern="[0-9]{6}"
                    required
                    className="border-sai-orange/20 focus:border-sai-orange/40"
                  />
                  <p className="text-sm text-muted-foreground">Must be exactly 6 digits</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="full-name">Full Name</Label>
                  <Input
                    id="full-name"
                    placeholder="Enter full name"
                    value={fullName}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^A-Za-z\s]/g, '')
                      setFullName(value)
                    }}
                    required
                    className="border-sai-orange/20 focus:border-sai-orange/40"
                  />
                  <p className="text-sm text-muted-foreground">Only alphabets and spaces allowed</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="Enter age"
                    value={age}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 2)
                      if (parseInt(value) <= 100) {
                        setAge(value)
                      }
                    }}
                    min="18"
                    max="100"
                    className="border-sai-orange/20 focus:border-sai-orange/40"
                  />
                  <p className="text-sm text-muted-foreground">Must be between 18 and 100</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mobile">Mobile Number</Label>
                  <Input
                    id="mobile"
                    placeholder="Enter 10-digit mobile number"
                    value={mobileNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 10)
                      setMobileNumber(value)
                    }}
                    maxLength={10}
                    pattern="[0-9]{10}"
                    className="border-sai-orange/20 focus:border-sai-orange/40"
                  />
                  <p className="text-sm text-muted-foreground">Must be exactly 10 digits</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="aadhar">Aadhar Number</Label>
                  <Input
                    id="aadhar"
                    placeholder="Enter 12-digit Aadhar number"
                    value={aadharNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 12)
                      setAadharNumber(value)
                    }}
                    maxLength={12}
                    pattern="[0-9]{12}"
                    className="border-sai-orange/20 focus:border-sai-orange/40"
                  />
                  <p className="text-sm text-muted-foreground">Must be exactly 12 digits</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="district">SSS District</Label>
                  <Select value={sssDistrict} onValueChange={setSssDistrict}>
                    <SelectTrigger id="district" className="border-sai-orange/20 focus:border-sai-orange/40">
                      <SelectValue placeholder="Select SSS district" />
                    </SelectTrigger>
                    <SelectContent>
                      {SSS_DISTRICTS.map((district) => (
                        <SelectItem key={district} value={district}>
                          {district}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger id="gender" className="border-sai-orange/20 focus:border-sai-orange/40">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="samiti">Samiti/Bhajan Mandli</Label>
                  <Input
                    id="samiti"
                    placeholder="Enter Samiti or Bhajan Mandli"
                    value={samiti}
                    onChange={(e) => setSamiti(e.target.value)}
                    className="border-sai-orange/20 focus:border-sai-orange/40"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="education">Education</Label>
                  <Select value={education} onValueChange={setEducation}>
                    <SelectTrigger id="education" className="border-sai-orange/20 focus:border-sai-orange/40">
                      <SelectValue placeholder="Select education level" />
                    </SelectTrigger>
                    <SelectContent>
                      {EDUCATION_LEVELS.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="qualifications">Special Qualifications</Label>
                <Textarea
                  id="qualifications"
                  placeholder="Enter special qualifications"
                  value={qualifications}
                  onChange={(e) => setQualifications(e.target.value)}
                  rows={2}
                  className="border-sai-orange/20 focus:border-sai-orange/40"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-sai-orange hover:bg-sai-orange-dark transition-colors duration-200"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Create Volunteer"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </div>
  )
}

