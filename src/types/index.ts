export interface Student {
  id: number;
  name: string;
  surname: string;
  patronymic: string;
  phoneNumber: string;
  age: number;
  chs: number;
  roomNumber: number | null;
  dormitoryId: number | null;
  violationIds: number[];
}

export interface Room {
  id: number;
  number: number;
  totalPlaces: number;
  students: Student[];
}

export interface Dormitory {
  id: number;
  name: string;
  address: string;
  rooms: Room[];
}

export interface Violation {
  id: number;
  violationType: string;
  date: string;
  studentIds: number[];
}

export interface Contract {
  id: number;
  number: number;
  startDate: string;
  endDate: string;
  student: Student | null;
}

// Типы для форм (Request DTO)
export interface StudentRequest {
  name: string;
  surname: string;
  patronymic: string;
  phoneNumber: string;
  age: number;
  chs: number;
}

export interface DormitoryRequest {
  name: string;
  address: string;
}

export interface RoomRequest {
  number: number;
  totalPlaces: number;
}

export interface ViolationRequest {
  violationType: string;
  date: string;
}

export interface ContractRequest {
  number: number;
  startDate: string;
  endDate: string;
}

// Обновленный PageResponse под структуру Spring Boot 3+
export interface PageResponse<T> {
  content: T[];
  page: {            // Все метаданные теперь здесь
    size: number;
    number: number;
    totalElements: number;
    totalPages: number;
  };
}

export type ViolationType = 
  | 'SMOKING'
  | 'DRINKING'
  | 'NOISE'
  | 'MESS'
  | 'DAMAGE';