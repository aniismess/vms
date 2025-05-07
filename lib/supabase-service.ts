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

  try {
    const [
      { count: totalCount, error: totalError },
      { count: activeCount, error: activeError },
      { count: cancelledCount, error: cancelledError },
      { count: registeredCount, error: registeredError }
    ] = await Promise.all([
      supabase
        .from("volunteers_volunteers")
        .select("*", { count: 'exact', head: true }),

      supabase
        .from("volunteers_volunteers")
        .select(`*, registered_volunteers!left(sai_connect_id)`, { count: 'exact', head: true })
        .eq("is_cancelled", 'no')
        .is("registered_volunteers.sai_connect_id", null),

      supabase
        .from("volunteers_volunteers")
        .select("*", { count: 'exact', head: true })
        .eq("is_cancelled", 'yes'),

      supabase
        .from("registered_volunteers")
        .select('*', { count: 'exact', head: true })
    ]);

    if (totalError) throw new Error(`Failed to get total count: ${totalError.message}`);
    if (activeError) throw new Error(`Failed to get active count: ${activeError.message}`);
    if (cancelledError) throw new Error(`Failed to get cancelled count: ${cancelledError.message}`);
    if (registeredError) throw new Error(`Failed to get registered count: ${registeredError.message}`);

    const total = totalCount ?? 0;
    const active = activeCount ?? 0;
    const cancelled = cancelledCount ?? 0;
    const registered = registeredCount ?? 0;

    const stats = {
      totalVolunteers: total,
      coming: active,
      notComing: cancelled,
      registered: registered
    }

    console.log('Volunteer stats:', stats);
    return stats;

  } catch (error) {
     console.error("Error fetching volunteer stats:", error);
     return {
        totalVolunteers: 0,
        coming: 0,
        notComing: 0,
        registered: 0
     }
  }
}


export async function createVolunteerInDb(volunteer: Omit<VolunteerData, 'registered_volunteers'>) {
  console.log('Original volunteer data:', JSON.stringify(volunteer, null, 2));

  const columns = [
    'sai_connect_id',
    'full_name',
    'age',
    'mobile_number',
    'aadhar_number',
    'sss_district',
    'gender',
    'samiti_or_bhajan_mandli',
    'education',
    'special_qualifications',
    'serial_number',
    'prashanti_arrival',
    'prashanti_departure',
    'duty_point',
    'last_service_location',
    'other_service_location',
    'created_by_id',
    'is_cancelled'
  ];

  const cleanVolunteer = {} as any;
  columns.forEach(column => {
    if (column in volunteer) {
      cleanVolunteer[column] = volunteer[column as keyof typeof volunteer];
    }
  });

  cleanVolunteer.is_cancelled = volunteer.is_cancelled === 'yes' ? 'yes' : 'no';

  console.log('Clean volunteer data being sent to Supabase:', JSON.stringify(cleanVolunteer, null, 2));

  try {
    const { data, error } = await supabase
      .from("volunteers_volunteers")
      .insert([cleanVolunteer])
      .select(columns.join(', '));

    if (error) {
      console.error("Error creating volunteer:", error);
      throw error;
    }

    return data?.[0];
  } catch (error) {
    console.error("Error in createVolunteerInDb:", error);
    throw error;
  }
}

export async function updateVolunteerInDb(id: string, updates: Partial<VolunteerData>) {
  const { registered_volunteers, ...updateFields } = updates

  const formattedUpdates = {
    ...updateFields,
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
  console.log(`Attempting to cancel volunteer: ${saiConnectId}`);
  try {
    const { data: registration, error: checkError } = await supabase
      .from('registered_volunteers')
      .select('sai_connect_id')
      .eq('sai_connect_id', saiConnectId)
      .maybeSingle();

    if (checkError) {
      console.error(`Error checking registration status for ${saiConnectId}:`, checkError);
    }

    if (registration) {
      console.log(`Volunteer ${saiConnectId} is registered. Attempting to unregister...`);
      const { error: unregisterError } = await supabase
        .from('registered_volunteers')
        .delete()
        .eq('sai_connect_id', saiConnectId);

      if (unregisterError) {
        console.error(`Failed to unregister volunteer ${saiConnectId}:`, unregisterError);
      } else {
        console.log(`Successfully unregistered volunteer ${saiConnectId}.`);
      }
    } else {
       console.log(`Volunteer ${saiConnectId} was not registered. Skipping unregistration.`);
    }

    console.log(`Updating volunteer ${saiConnectId} status to cancelled...`);
    const { error: updateError } = await supabase
      .from('volunteers_volunteers')
      .update({ is_cancelled: 'yes', updated_at: new Date().toISOString() })
      .eq('sai_connect_id', saiConnectId);

    if (updateError) {
      console.error(`Failed to update cancellation status for ${saiConnectId}:`, updateError);
      throw new Error('Could not update volunteer cancellation status.');
    }

    console.log(`Successfully cancelled volunteer ${saiConnectId}.`);
    return { success: true };

  } catch (error) {
    console.error(`Overall error cancelling volunteer ${saiConnectId}:`, error);
    throw error;
  }
}

export async function fetchAllActiveVolunteers(): Promise<VolunteerData[]> {
  console.log('Fetching ALL active volunteers for download...');
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
    .eq("is_cancelled", 'no')
    .is("registered_volunteers.sai_connect_id", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching all active volunteers:", error);
    throw new Error("Failed to fetch active volunteers for download.");
  }
  console.log(`Fetched ${data?.length || 0} active volunteers for download.`);
  return data || [];
}

export async function fetchAllRegisteredVolunteers(): Promise<VolunteerData[]> {
  console.log('Fetching ALL registered volunteers for download...');
  const { data, error } = await supabase
    .from("volunteers_volunteers")
    .select(`
      *,
      registered_volunteers!inner (
        sai_connect_id,
        batch,
        service_location
      )
    `)
    .eq("is_cancelled", 'no')
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching all registered volunteers:", error);
    throw new Error("Failed to fetch registered volunteers for download.");
  }
   console.log(`Fetched ${data?.length || 0} registered volunteers for download.`);
  return data || [];
}

export async function fetchAllCancelledVolunteers(): Promise<VolunteerData[]> {
  console.log('Fetching ALL cancelled volunteers for download...');
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
    .eq("is_cancelled", 'yes')
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching all cancelled volunteers:", error);
    throw new Error("Failed to fetch cancelled volunteers for download.");
  }
   console.log(`Fetched ${data?.length || 0} cancelled volunteers for download.`);
  return data || [];
}

export async function registerVolunteer(data: {
  sai_connect_id: string
  age: number
  batch: string
  service_location: string
}) {
  const { error: updateError } = await supabase
    .from("volunteers_volunteers")
    .update({ age: data.age, is_cancelled: 'no', updated_at: new Date().toISOString() })
    .eq("sai_connect_id", data.sai_connect_id)

  if (updateError) {
    console.error("Error updating volunteer age:", updateError)
    throw updateError
  }

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


export async function getDashboardPageData() {
  console.log('Fetching dashboard data (stats, all active, recent registered, recent cancelled)...');
  try {
    
    const statsPromise = getVolunteerStats();

    
    const activeVolunteersPromise = supabase
      .from("volunteers_volunteers")
      .select(`*, registered_volunteers!left(sai_connect_id, batch, service_location)`)
      .eq("is_cancelled", 'no')
      .is("registered_volunteers.sai_connect_id", null)
      .order("updated_at", { ascending: false }); 

    
    const recentRegisteredPromise = supabase
      .from("volunteers_volunteers")
      .select(`*, registered_volunteers!inner(sai_connect_id, batch, service_location)`)
      .eq("is_cancelled", 'no')
      .order("updated_at", { ascending: false })
      .limit(50);

    
    const recentCancelledPromise = supabase
      .from("volunteers_volunteers")
      .select(`*, registered_volunteers!left(sai_connect_id, batch, service_location)`) // Left join ok, might have been registered before
      .eq("is_cancelled", 'yes')
      .order("updated_at", { ascending: false })
      .limit(50);

    
    const [
        stats,
        { data: activeVolunteers, error: activeError },
        { data: recentRegistered, error: registeredError },
        { data: recentCancelled, error: cancelledError }
    ] = await Promise.all([
        statsPromise,
        activeVolunteersPromise,
        recentRegisteredPromise,
        recentCancelledPromise
    ]);

    
    if (activeError) console.error("Error fetching active volunteers for dashboard:", activeError);
    if (registeredError) console.error("Error fetching recent registered volunteers for dashboard:", registeredError);
    if (cancelledError) console.error("Error fetching recent cancelled volunteers for dashboard:", cancelledError);

    
    const returnData = {
        stats,
        activeVolunteers: activeError ? [] : (activeVolunteers || []),
        recentRegistered: registeredError ? [] : (recentRegistered || []),
        recentCancelled: cancelledError ? [] : (recentCancelled || [])
    };

    console.log('Dashboard data fetched:', {
        stats: returnData.stats,
        activeCount: returnData.activeVolunteers.length, 
        recentRegisteredCount: returnData.recentRegistered.length,
        recentCancelledCount: returnData.recentCancelled.length
    });

    return returnData;

  } catch (error) {
    
    console.error("Error fetching dashboard page data:", error);
    
    throw error
  }
}
