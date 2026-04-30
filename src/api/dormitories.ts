import api from './axios';
import { Dormitory, DormitoryRequest } from '../types';

// Стало — вызываем endpoint с графом
export const getDormitories = () =>
  api.get<Dormitory[]>('/dormitory/withGraph');

export const getDormitoryById = (id: number) =>
  api.get<Dormitory>(`/dormitory/${id}`);

export const createDormitory = (data: DormitoryRequest) =>
  api.post<Dormitory>('/dormitory', data);

export const updateDormitory = (id: number, data: DormitoryRequest) =>
  api.put<Dormitory>(`/dormitory/${id}`, data);

export const deleteDormitory = (id: number) =>
  api.delete(`/dormitory/${id}`);