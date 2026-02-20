
import { Teacher, LessonHour } from './types';

export const DAYS_TR = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];

export const MOCK_TEACHERS: Teacher[] = [
  { id: '1', name: 'AHMET ÇOLAK', department: 'Matematik', substituteCount: 18, initials: 'AÇ', dutyPlace: '2. Kat Koridoru' },
  { id: '2', name: 'ATİKE MERDUN', department: 'Fizik', substituteCount: 15, initials: 'AM', dutyPlace: 'Zemin Kat' },
  { id: '3', name: 'AYŞE LATİFE DUMAN', department: 'Edebiyat', substituteCount: 12, initials: 'AD', dutyPlace: 'Bahçe - A Blok' },
  { id: '4', name: 'BETÜL ÇAĞLAYAN', department: 'Kimya', substituteCount: 10, initials: 'BÇ', dutyPlace: 'Spor Salonu' },
  { id: '5', name: 'DÖNDÜ YOLCU', department: 'Biyoloji', substituteCount: 8, initials: 'DY', dutyPlace: '3. Kat' },
];

export const LESSON_HOURS: LessonHour[] = [
  { id: '1', label: '1. Ders', timeRange: '08:30 - 09:10', index: 0 },
  { id: '2', label: '2. Ders', timeRange: '09:20 - 10:00', index: 1 },
  { id: '3', label: '3. Ders', timeRange: '10:10 - 10:50', index: 2 },
  { id: '4', label: '4. Ders', timeRange: '11:00 - 11:40', index: 3 },
  { id: '5', label: '5. Ders', timeRange: '11:50 - 12:30', index: 4 },
  { id: '6', label: '6. Ders', timeRange: '13:20 - 14:00', index: 5 },
  { id: '7', label: '7. Ders', timeRange: '14:10 - 14:50', index: 6 },
  { id: '8', label: '8. Ders', timeRange: '15:00 - 15:40', index: 7 },
];
