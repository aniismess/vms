export type YesNoType = 'yes' | 'no'

export interface VolunteerData {
  serial_number: string | null
  full_name: string | null
  age: number | null
  aadhar_number: string | null
  sai_connect_id: string
  mobile_number: string | null
  sss_district: string | null
  gender: string | null
  samiti_or_bhajan_mandli: string | null
  education: string | null
  special_qualifications: string | null
  last_service_location: string | null
  other_service_location: string | null
  prashanti_arrival: string | null
  prashanti_departure: string | null
  duty_point: string | null
  is_cancelled: YesNoType
  created_by_id: string | null
  registered_volunteers: {
    sai_connect_id: string
    batch: string | null
    service_location: string | null
  } | null
}

export interface RegisteredVolunteerData {
  id: string
  sai_connect_id: string
  batch: string
  service_location: string
  created_at: string
  updated_at: string
}

export type VolunteerStatus = 'active' | 'registered' | 'cancelled' 