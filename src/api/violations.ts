import api from './axios';
import { Violation, ViolationRequest } from '../types';

export const getViolations = () =>
  api.get<Violation[]>('/violation');

export const createViolation = (studentId: number, data: ViolationRequest) =>
  api.post<Violation>(`/violation/${studentId}`, data);

export const updateViolation = (id: number, data: ViolationRequest) =>
  api.put<Violation>(`/violation/${id}`, data);

export const deleteViolation = (id: number) =>
  api.delete(`/violation/${id}`);

export const searchViolations = (params: {
  violationType?: string;
  fio?: string;
  sortByDate?: 'asc' | 'desc';
}) => {
  return api.get<Violation[]>('/violation/filter', { params });
};