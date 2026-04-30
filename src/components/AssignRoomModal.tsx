import React, { useState } from 'react';
import { Student, Room, Dormitory } from '../types';
import { assignStudentToRoom } from '../api/students';

interface Props {
  student: Student;
  rooms: Room[];
  dormitories?: Dormitory[];
  onClose: () => void;
  onSave: () => void;
}

const AssignRoomModal: React.FC<Props> = ({
  student, rooms, dormitories = [], onClose, onSave
}) => {
  const [selectedRoomId, setSelectedRoomId] = useState<number>(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const availableRooms = rooms.filter(
    r => (r.students?.length ?? 0) < r.totalPlaces
  );

  // Группируем комнаты по общежитиям
  const grouped: Record<string, { label: string; rooms: Room[] }> = {};

  if (dormitories.length > 0) {
    // Если есть данные об общежитиях — группируем по ним
    dormitories.forEach(dorm => {
      const dormRooms = availableRooms.filter(r =>
        dorm.rooms?.some(dr => dr.id === r.id)
      );
      if (dormRooms.length > 0) {
        grouped[dorm.id] = { label: dorm.name, rooms: dormRooms };
      }
    });

    // Комнаты без общежития (на всякий случай)
    const assignedRoomIds = new Set(
      dormitories.flatMap(d => d.rooms?.map(r => r.id) ?? [])
    );
    const ungrouped = availableRooms.filter(r => !assignedRoomIds.has(r.id));
    if (ungrouped.length > 0) {
      grouped['other'] = { label: 'Другие', rooms: ungrouped };
    }
  } else {
    // Если общежитий нет — просто один список
    grouped['all'] = { label: '', rooms: availableRooms };
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomId) {
      setError('Выберите комнату');
      return;
    }
    setLoading(true);
    try {
      await assignStudentToRoom(student.id, selectedRoomId);
      onSave();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Ошибка заселения');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={overlay}>
      <div style={modal}>
        <h2 style={{ marginTop: 0 }}>Заселить студента</h2>
        <p>
          <strong>{student.surname} {student.name} {student.patronymic}</strong>
        </p>
        {student.roomNumber && (
          <p style={{ color: '#FF9800', margin: '4px 0 12px' }}>
            Сейчас в комнате №{student.roomNumber}
          </p>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>
              Выберите комнату:
            </label>
            <select
              value={selectedRoomId}
              onChange={e => setSelectedRoomId(Number(e.target.value))}
              style={{
                width: '100%', padding: '8px', marginTop: '4px',
                borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px'
              }}
            >
              <option value={0}>-- Выберите комнату --</option>

              {Object.values(grouped).map(group =>
                group.label ? (
                  // С группировкой по общежитиям
                  <optgroup key={group.label} label={group.label}>
                    {group.rooms.map(room => (
                      <option key={room.id} value={room.id}>
                        №{room.number} — свободно: {
                          room.totalPlaces - (room.students?.length ?? 0)
                        } из {room.totalPlaces}
                      </option>
                    ))}
                  </optgroup>
                ) : (
                  // Без группировки
                  group.rooms.map(room => (
                    <option key={room.id} value={room.id}>
                      Комната №{room.number} — свободно: {
                        room.totalPlaces - (room.students?.length ?? 0)
                      } из {room.totalPlaces}
                    </option>
                  ))
                )
              )}
            </select>
          </div>

          {availableRooms.length === 0 && (
            <p style={{ color: 'orange' }}>
              Нет доступных комнат со свободными местами
            </p>
          )}

          {error && (
            <p style={{ color: 'red', margin: '8px 0' }}>{error}</p>
          )}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: '4px' }}
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading || availableRooms.length === 0}
              style={{
                padding: '8px 16px', background: '#FF9800',
                color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'
              }}
            >
              {loading ? 'Заселение...' : 'Заселить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const overlay: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000,
};

const modal: React.CSSProperties = {
  background: 'white', borderRadius: '8px',
  padding: '24px', width: '420px', maxHeight: '90vh', overflowY: 'auto',
};

export default AssignRoomModal;