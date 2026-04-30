import api from './axios';
import { 
  Student, 
  StudentRequest, 
  PageResponse, 
  ViolationType 
} from '../types';

// Получить всех студентов с пагинацией
export const getStudents = (page = 0, size = 10) =>
  api.get<PageResponse<Student>>(`/student/all?page=${page}&size=${size}`);

// Получить студента по ID
export const getStudentById = (id: number) =>
  api.get<Student>(`/student/${id}`);

// Поиск по возрасту
export const getStudentsByAge = (age: number, page = 0, size = 10) =>
  api.get<PageResponse<Student>>(`/student?age=${age}&page=${page}&size=${size}`);

// Создать студента в комнате
export const createStudent = (roomId: number, data: StudentRequest) =>
  api.post<Student>(`/student/${roomId}`, data);

// Обновить студента
export const updateStudent = (id: number, data: StudentRequest) =>
  api.put<Student>(`/student/${id}`, data);

// Частичное обновление
export const patchStudent = (id: number, data: Partial<StudentRequest>) =>
  api.patch<Student>(`/student/${id}`, data);

// Удалить студента
export const deleteStudent = (id: number) =>
  api.delete(`/student/${id}`);

// Заселить студента в комнату
export const assignStudentToRoom = (studentId: number, roomId: number) =>
  api.post<Student>(`/student/${studentId}/assign-to-room/${roomId}`);

// Выселить студента
export const evictStudent = (studentId: number) =>
  api.post<Student>(`/student/${studentId}/evict`);

// Добавить нарушение студенту
export const addViolationToStudent = (studentId: number, violationId: number) =>
  api.post<Student>(`/student/${studentId}/add-violation/${violationId}`);

// Удалить нарушение у студента
export const removeViolationFromStudent = (studentId: number, violationId: number) =>
  api.delete<Student>(`/student/${studentId}/violations/${violationId}`);

export const filterStudents = (
  chs?: number,
  hasViolations?: boolean,
  violationType?: ViolationType,
  age?: number,
  dormitoryId?: number,
  roomId?: number,
  page = 0,
  size = 10
) => {
  const params: Record<string, string | number | boolean> = { page, size };

  if (chs !== undefined) params.chs = chs;
  if (hasViolations !== undefined) params.hasViolations = hasViolations;
  if (violationType) params.violationType = violationType;
  if (age !== undefined) params.age = age;
  if (dormitoryId !== undefined) params.dormitoryId = dormitoryId;
  if (roomId !== undefined) params.roomId = roomId;

  return api.get<PageResponse<Student>>('/student/filter/advanced', { params });
};

export const searchStudentsByFio = (
  fio: string,
  page?: number,
  size?: number,
) => {
  const params: any = { fio };
  if (page !== undefined) params.page = page;
  if (size !== undefined) params.size = size;
  return api.get('/student/search/fio', { params }); // ← должно быть именно так
};