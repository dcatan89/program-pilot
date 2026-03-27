export interface User {
  id: string
  email: string
  name: string
  role: 'SUPER_ADMIN' | 'ADMIN'
}

export interface City {
  id: string
  name: string
  color: string
}

export interface Staff {
  id: string
  name: string
  email?: string
  phone?: string
  notes?: string
  isActive: boolean
  clearedCities: { city: City }[]
}

export interface Program {
  id: string
  name: string
  seasonId: string
}

export interface Session {
  id: string
  programId: string
  program: Program
  cityId: string
  city: City
  location: string
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  sessionType: 'AM' | 'PM' | 'FULL_DAY'
  className?: string
  assignments: { staff: Staff; isPrimary: boolean }[]
  noClassDates: string[]
}

export interface ExternalProgram {
  id: string
  name: string
  startDate: string
  endDate: string
  color: string
  notes?: string
}

export interface ScheduleWeek {
  startDate: string
  endDate: string
  sessions: Session[]
  externalOverlaps: ExternalProgram[]
}

export interface ScheduleData {
  weeks: ScheduleWeek[]
  staff: Staff[]
  externalPrograms: ExternalProgram[]
}

export interface Conflict {
  staffName: string
  session1: string
  session2: string
}
