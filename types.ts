export interface Student {
  id: string;
  firstName: string;
  lastName?: string;
  regNumber: string;
  pageNumber: string;
  status?: 'active' | 'transferred' | 'left' | 'graduated';
  notes?: string;
  createdAt: number;
  isDeleted?: boolean;
  printIndex?: number;
}

export interface ThemeColor {
  primary: string;
  hover: string;
  secondary: string;
  secondaryHover: string;
  ring: string;
  name: string;
}

export interface ThemeColors {
  [key: string]: ThemeColor;
}
