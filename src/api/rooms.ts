import api from './axios';
import { Room, RoomRequest } from '../types';

export const getRooms = () =>
  api.get<Room[]>('/room');

export const getRoomsWithGraph = () =>
  api.get<Room[]>('/room/withGraph');

export const createRoom = (dormitoryId: number, data: RoomRequest) =>
  api.post<Room>(`/room/${dormitoryId}`, data);

export const updateRoom = (id: number, data: RoomRequest) =>
  api.put<Room>(`/room/${id}`, data);

export const deleteRoom = (id: number) =>
  api.delete(`/room/${id}`);