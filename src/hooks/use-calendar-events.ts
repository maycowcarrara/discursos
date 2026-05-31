import { useQuery } from '@tanstack/react-query'

import { listCalendarEventsByYear } from '@/services/firestore/calendar-events-service'

export function useCalendarEventsQuery(year: number) {
  return useQuery({
    queryKey: ['firestore', 'calendarEvents', year],
    queryFn: () => listCalendarEventsByYear(year),
    enabled: Number.isFinite(year),
  })
}
