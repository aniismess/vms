import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"
import { registerVolunteer } from "@/lib/supabase-service"
import { Loader2, UserPlus, AlertCircle } from "lucide-react"
import { Label } from "@/components/ui/label"
import { motion } from "framer-motion"

interface RegisterVolunteerFormProps {
  onRegister: () => void
}

export function RegisterVolunteerForm({ onRegister }: RegisterVolunteerFormProps) {
  const [saiConnectId, setSaiConnectId] = useState('')
  const [age, setAge] = useState('')
  const [batch, setBatch] = useState('')
  const [serviceLocation, setServiceLocation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const validateSaiConnectId = (value: string) => {
    if (value.length !== 6) {
      setError('SAI Connect ID must be 6 digits')
      return false
    }
    return true
  }

  const validateAge = (value: string) => {
    const ageNum = parseInt(value, 10)
    if (isNaN(ageNum) || ageNum < 18 || ageNum > 100) {
      setError('Age must be between 18 and 100')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!validateSaiConnectId(saiConnectId) || !validateAge(age) || !batch || !serviceLocation) {
      if (!batch && !error) setError('Please select a batch')
      if (!serviceLocation && !error) setError('Please select a service location')
      return
    }

    try {
      setIsSubmitting(true)
      const { data: volunteer } = await supabase
        .from('volunteers_volunteers')
        .select(`
          *,
          registered_volunteers!left (
            sai_connect_id,
            batch,
            service_location
          )
        `)
        .eq('sai_connect_id', saiConnectId)
        .maybeSingle()

      if (!volunteer) {
        toast({
          title: "Registration Failed",
          description: `Volunteer with SAI Connect ID ${saiConnectId} not found.`,
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      if (volunteer.is_cancelled === 'yes') {
        toast({
          title: "Registration Failed",
          description: `Volunteer with SAI Connect ID ${saiConnectId} has been cancelled and cannot be registered.`,
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      if (volunteer.registered_volunteers) {
        toast({
          title: "Registration Failed",
          description: `Volunteer with SAI Connect ID ${saiConnectId} is already registered.`,
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      await registerVolunteer({
        sai_connect_id: saiConnectId,
        age: parseInt(age, 10),
        batch,
        service_location: serviceLocation,
      })

      toast({
        title: "Success!",
        description: "Volunteer has been registered successfully.",
        variant: "default",
      })

      onRegister()
      setIsOpen(false)
      resetForm()
    } catch (err) {
      console.error('Error registering volunteer:', err)
      toast({
        title: "Error",
        description: "An unexpected error occurred during registration. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setSaiConnectId('')
    setAge('')
    setBatch('')
    setServiceLocation('')
    setError(null)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Register Volunteer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Register Volunteer</DialogTitle>
          <DialogDescription>Register an active volunteer for service</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sai-connect-id">Sai Connect ID</Label>
            <Input
              id="sai-connect-id"
              placeholder="Enter 6-digit SAI Connect ID"
              value={saiConnectId}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6)
                setSaiConnectId(value)
                setError(null)
              }}
              maxLength={6}
              pattern="[0-9]{6}"
              required
              className={error && error.includes('SAI Connect ID') ? 'border-red-500' : ''}
            />
            <p className="text-sm text-muted-foreground">Must be 6 digits only</p>
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
                setAge(value)
                setError(null)
              }}
              min="18"
              max="100"
              required
              className={error && error.includes('Age') ? 'border-red-500' : ''}
            />
            <p className="text-sm text-muted-foreground">Must be between 18 and 100</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="batch">Batch</Label>
            <Select value={batch} onValueChange={(value) => { setBatch(value); setError(null); }} required>
              <SelectTrigger id="batch" className={error && error.includes('batch') ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select batch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="batch1">Batch 1</SelectItem>
                <SelectItem value="batch2">Batch 2</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="service-location">Past Seva Location</Label>
            <Select value={serviceLocation} onValueChange={(value) => { setServiceLocation(value); setError(null); }} required>
              <SelectTrigger id="service-location" className={error && error.includes('service location') ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select service location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="location1">Location 1</SelectItem>
                <SelectItem value="location2">Location 2</SelectItem>
                <SelectItem value="location3">Location 3</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-red-500 flex items-center gap-2 bg-red-50 dark:bg-red-900/20 p-2 rounded"
            >
              <AlertCircle className="h-4 w-4" />
              {error}
            </motion.div>
          )}
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registering...
                </>
              ) : (
                "Register Volunteer"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
