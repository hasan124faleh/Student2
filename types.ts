export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  regNumber: string;
  pageNumber: string;
  notes: string;
  status?: string;
  createdAt: number;
}

export type SortOption = 'recent' | 'alphabetical';

export interface Stats {
  totalStudents: number;
  uniqueRegNumbers: number;
  totalPages: number;
}