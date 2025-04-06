import { supabase } from "./supabase"

export type RegisteredVolunteer = {
  sai_connect_id: string
  batch: string | null
  service_location: string | null
}

export type YesNoType = 'yes' | 'no'

export type VolunteerData = {
  serial_number: string | null
  full_name: string | null
  age: number | null
  aadhar_number: string | null
  sai_connect_id: string
  sevadal_training_certificate: YesNoType
  mobile_number: string | null
  sss_district: string | null
  gender: string | null
  samiti_or_bhajan_mandli: string | null
  education: string | null
  special_qualifications: string | null
  past_prashanti_service: YesNoType
  last_service_location: string | null
  other_service_location: string | null
  prashanti_arrival: string | null
  prashanti_departure: string | null
  duty_point: string | null
  is_cancelled: YesNoType
  created_by_id: string | null
  created_at?: string
  updated_at?: string
  registered_volunteers: RegisteredVolunteer | null
}

export async function getVolunteers(): Promise<VolunteerData[]> {
  console.log('Fetching volunteers...')
  const { data, error } = await supabase
    .from("volunteers_volunteers")
    .select(`
      *,
      registered_volunteers!left (
        sai_connect_id,
        batch,
        service_location,
        created_at
      )
    `)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching volunteers:", error)
    throw error
  }

  // Log each volunteer's status
  data?.forEach(volunteer => {
    console.log(`Volunteer ${volunteer.sai_connect_id}:`, {
      is_cancelled: volunteer.is_cancelled,
      has_registered: !!volunteer.registered_volunteers,
      status: volunteer.is_cancelled === 'yes' ? 'Cancelled' :
              volunteer.registered_volunteers ? 'Registered' : 'Active'
    })
  })

  console.log('Total volunteers fetched:', data?.length || 0)
  return data || []
}

export async function getVolunteerStats() {
  console.log('Fetching volunteer stats...')
  
  const [
    { count: totalCount },
    { count: activeCount },
    { count: cancelledCount },
    { count: registeredCount }
  ] = await Promise.all([
    // Total volunteers
    supabase
      .from("volunteers_volunteers")
      .select("*", { count: 'exact', head: true }),
    
    // Active volunteers (not cancelled and not registered)
    supabase
      .from("volunteers_volunteers")
      .select(`
        *,
        registered_volunteers!left(sai_connect_id)
      `, { count: 'exact', head: true })
      .eq("is_cancelled", 'no')
      .is("registered_volunteers.sai_connect_id", null),
    
    // Cancelled volunteers
    supabase
      .from("volunteers_volunteers")
      .select("*", { count: 'exact', head: true })
      .eq("is_cancelled", 'yes'),
    
    // Registered volunteers
    supabase
      .from("volunteers_volunteers")
      .select(`
        *,
        registered_volunteers!inner(sai_connect_id)
      `, { count: 'exact', head: true })
      .eq("is_cancelled", 'no')
  ])

  const stats = {
    totalVolunteers: totalCount || 0,
    coming: activeCount || 0,
    notComing: cancelledCount || 0,
    registered: registeredCount || 0
  }

  console.log('Volunteer stats:', stats)
  return stats
}

export async function createVolunteerInDb(volunteer: Omit<VolunteerData, 'registered_volunteers'>) {
  // First, create a new object with all fields except the ones we need to convert
  const { sevadal_training_certificate, past_prashanti_service, is_cancelled, ...rest } = volunteer;

  // Helper function to convert to YesNoType
  const toYesNo = (value: any): YesNoType => {
    if (typeof value === 'boolean') {
      return value ? 'yes' : 'no';
    }
    if (value === 'yes') return 'yes';
    return 'no';
  };

  // Now create the formatted volunteer with explicit conversions
  const formattedVolunteer = {
    ...rest,
    // Use the helper function to convert each field
    sevadal_training_certificate: toYesNo(sevadal_training_certificate),
    past_prashanti_service: toYesNo(past_prashanti_service),
    is_cancelled: toYesNo(is_cancelled)
  };

  console.log('Creating volunteer with formatted data:', formattedVolunteer);

  const { data, error } = await supabase
    .from("volunteers_volunteers")
    .insert([formattedVolunteer])
    .select();

  if (error) {
    console.error("Error creating volunteer:", error);
    throw error;
  }

  return data?.[0];
}

export async function updateVolunteerInDb(id: string, updates: Partial<VolunteerData>) {
  // Remove registered_volunteers from updates as it's a relationship, not a column
  const { registered_volunteers, ...updateFields } = updates

  // Convert boolean fields to 'yes'/'no'
  const formattedUpdates = {
    ...updateFields,
    ...(updates.sevadal_training_certificate !== undefined && {
      sevadal_training_certificate: updates.sevadal_training_certificate ? 'yes' : 'no'
    }),
    ...(updates.past_prashanti_service !== undefined && {
      past_prashanti_service: updates.past_prashanti_service ? 'yes' : 'no'
    }),
    ...(updates.is_cancelled !== undefined && {
      is_cancelled: updates.is_cancelled ? 'yes' : 'no'
    })
  }

  const { data, error } = await supabase
    .from("volunteers_volunteers")
    .update(formattedUpdates)
    .eq("sai_connect_id", id)
    .select(`
      *,
      registered_volunteers!left (
        sai_connect_id,
        batch,
        service_location
      )
    `)

  if (error) {
    console.error("Error updating volunteer:", error)
    throw error
  }

  return data?.[0]
}

export async function deleteVolunteerFromDb(id: string) {
  const { error } = await supabase.from("volunteers_volunteers").delete().eq("sai_connect_id", id)

  if (error) {
    console.error("Error deleting volunteer:", error)
    throw error
  }

  return true
}

export async function getVolunteerById(id: string): Promise<VolunteerData | null> {
  try {
    const { data, error } = await supabase
      .from("volunteers_volunteers")
      .select(`
        *,
        registered_volunteers!left (
          sai_connect_id,
          batch,
          service_location
        )
      `)
      .eq("sai_connect_id", id)
      .maybeSingle()

    if (error) {
      console.error("Error fetching volunteer:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Error fetching volunteer:", error)
    return null
  }
}

export async function cancelVolunteerInDb(saiConnectId: string) {
  try {
    // First, check if the volunteer exists
    const { data: volunteer, error: fetchError } = await supabase
      .from('volunteers_volunteers')
      .select('*')
      .eq('sai_connect_id', saiConnectId)
      .single()

    if (fetchError) {
      throw new Error('Could not find volunteer')
    }

    // If volunteer is registered, remove from registered_volunteers first
    if (volunteer.registered_volunteers) {
      const { error: unregisterError } = await supabase
        .from('registered_volunteers')
        .delete()
        .eq('sai_connect_id', saiConnectId)

      if (unregisterError) {
        throw new Error('Could not unregister volunteer')
      }
    }

    // Now cancel the volunteer
    const { error: updateError } = await supabase
      .from('volunteers_volunteers')
      .update({ is_cancelled: 'yes' })
      .eq('sai_connect_id', saiConnectId)

    if (updateError) {
      throw new Error('Could not cancel volunteer')
    }

    return { success: true }
  } catch (error) {
    console.error('Error cancelling volunteer:', error)
    throw error
  }
}

export async function registerVolunteer(data: {
  sai_connect_id: string
  age: number
  batch: string
  service_location: string
}) {
  // First update the volunteer's age
  const { error: updateError } = await supabase
    .from("volunteers_volunteers")
    .update({ age: data.age })
    .eq("sai_connect_id", data.sai_connect_id)

  if (updateError) {
    console.error("Error updating volunteer age:", updateError)
    throw updateError
  }

  // Then register the volunteer
  const { error: registrationError } = await supabase
    .from("registered_volunteers")
    .insert([{
      sai_connect_id: data.sai_connect_id,
      batch: data.batch,
      service_location: data.service_location
    }])

  if (registrationError) {
    console.error("Error registering volunteer:", registrationError)
    throw registrationError
  }

  return true
}

