
export interface TeacherSchedule {
  teacherName: string;
  schedule: {
    [day: string]: string[]; // Array of 8 strings representing lesson locations or empty for free
  };
}

export interface DutyAssignment {
  day: string;
  location: string;
  teacherName: string;
}

export interface Teacher {
  id: string;
  name: string;
  department: string;
  substituteCount: number;
  dutyPlace?: string;
  initials: string;
  isFree?: boolean; // UI helper for substitution
  isOnDuty?: boolean; // UI helper for duty status
}

export interface SubstitutionRecord {
  id: string;
  date: string;
  day: string;
  lessonLabel: string;
  absentTeacherName: string;
  substituteTeacherName: string;
  timestamp: number;
}

export interface SchoolSettings {
  schoolName: string;
  principalName: string;
  messagePrefix: string;
  academicYear: string;
  showApprovalFooter: boolean;
  customFooter: string;
}

export interface LessonHour {
  id: string;
  label: string;
  timeRange: string;
  index: number; // 0-7 index for Excel column mapping
}
