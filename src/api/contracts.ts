import api from './axios';
import { Contract, ContractRequest } from '../types';

export const getContracts = () =>
  api.get<Contract[]>('/contract');

export const createContract = (studentId: number, data: ContractRequest) =>
  api.post<Contract>(`/contract/${studentId}`, data);

export const updateContract = (id: number, data: ContractRequest) =>
  api.put<Contract>(`/contract/${id}`, data);

export const deleteContract = (id: number) =>
  api.delete(`/contract/${id}`);