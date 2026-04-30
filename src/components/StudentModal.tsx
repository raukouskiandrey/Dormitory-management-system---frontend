import React, { useState, useEffect } from 'react';
import { Student, StudentRequest, Room, Dormitory } from '../types';
import { createStudent, updateStudent } from '../api/students';

interface Props {
  student: Student | null;
  rooms: Room[];
  fixedRoomId?: number;
  dormitories?: Dormitory[];
  onClose: () => void;
  onSave: () => void;
}

interface StudentFormState {
  name: string;
  surname: string;
  patronymic: string;
  phoneNumber: string;
  age: string;
  chs: string;
}

interface FieldErrors {
  surname: string;
  name: string;
  phoneNumber: string;
  age: string;
  chs: string;
  room: string;
}

const emptyForm: StudentFormState = {
  name: '',
  surname: '',
  patronymic: '',
  phoneNumber: '',
  age: '',
  chs: '',
};

const emptyErrors: FieldErrors = {
  surname: '',
  name: '',
  phoneNumber: '',
  age: '',
  chs: '',
  room: '',
};

const StudentModal: React.FC<Props> = ({
  student, rooms, fixedRoomId, dormitories = [], onClose, onSave
}) => {
  const [form, setForm] = useState<StudentFormState>(emptyForm);

  const [selectedRoomId, setSelectedRoomId] = useState<number>(
    fixedRoomId ?? 0
  );

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>(emptyErrors);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (student) {
      setForm({
        name: student.name ?? '',
        surname: student.surname ?? '',
        patronymic: student.patronymic ?? '',
        phoneNumber: student.phoneNumber ?? '',
        age: student.age !== undefined && student.age !== null ? String(student.age) : '',
        chs: student.chs !== undefined && student.chs !== null ? String(student.chs) : '',
      });
    } else {
      setForm(emptyForm);
    }

    setFieldErrors(emptyErrors);
    setError('');
  }, [student]);

  useEffect(() => {
    if (fixedRoomId) {
      setSelectedRoomId(fixedRoomId);
    } else if (!student) {
      setSelectedRoomId(0);
    }
  }, [fixedRoomId, student]);

  const validateField = (name: string, value: string): string => {
    const trimmed = value.trim();

    switch (name) {
      case 'surname':
        return trimmed ? '' : 'Обязательно введите фамилию';

      case 'name':
        return trimmed ? '' : 'Обязательно введите имя';

      case 'phoneNumber':
        return trimmed ? '' : 'Обязательно введите телефон';

      case 'age':
        if (!trimmed) return 'Обязательно введите возраст';
        if (Number(value) < 16 || Number(value) > 100) {
          return 'Возраст должен быть от 16 до 100';
        }
        return '';

      case 'chs':
        if (!trimmed) return '';
        if (Number(value) < 0) return 'Часы ОПТ не могут быть отрицательными';
        return '';

      default:
        return '';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setForm(prev => ({
      ...prev,
      [name]: value,
    }));

    setFieldErrors(prev => ({
      ...prev,
      [name]: validateField(name, value),
    }));

    setError('');
  };

  const handleRoomChange = (value: number) => {
    setSelectedRoomId(value);
    setFieldErrors(prev => ({
      ...prev,
      room: value ? '' : 'Обязательно выберите комнату',
    }));
    setError('');
  };

  const validateForm = (): boolean => {
    const newErrors: FieldErrors = {
      surname: validateField('surname', form.surname),
      name: validateField('name', form.name),
      phoneNumber: validateField('phoneNumber', form.phoneNumber),
      age: validateField('age', form.age),
      chs: validateField('chs', form.chs),
      room: '',
    };

    if (!student && !fixedRoomId && !selectedRoomId) {
      newErrors.room = 'Обязательно выберите комнату';
    }

    setFieldErrors(newErrors);

    return !Object.values(newErrors).some(Boolean);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const payload: StudentRequest = {
        name: form.name.trim(),
        surname: form.surname.trim(),
        patronymic: form.patronymic.trim(),
        phoneNumber: form.phoneNumber.trim(),
        age: Number(form.age),
        chs: form.chs.trim() === '' ? 0 : Number(form.chs),
      };

      if (student) {
        await updateStudent(student.id, payload);
      } else {
        if (!selectedRoomId) {
          setFieldErrors(prev => ({
            ...prev,
            room: 'Обязательно выберите комнату',
          }));
          setLoading(false);
          return;
        }
        await createStudent(selectedRoomId, payload);
      }

      onSave();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  };

  const fixedRoom = rooms.find(r => r.id === fixedRoomId);

  // Только свободные комнаты
  const availableRooms = rooms.filter(
    r => (r.students?.length ?? 0) < r.totalPlaces
  );

  // Группировка по общежитиям
  const grouped: { label: string; rooms: Room[] }[] = [];

  if (dormitories.length > 0) {
    dormitories.forEach(dorm => {
      const dormRooms = availableRooms.filter(r =>
        dorm.rooms?.some(dr => dr.id === r.id)
      );
      if (dormRooms.length > 0) {
        grouped.push({ label: dorm.name, rooms: dormRooms });
      }
    });

    const assignedIds = new Set(
      dormitories.flatMap(d => d.rooms?.map(r => r.id) ?? [])
    );
    const ungrouped = availableRooms.filter(r => !assignedIds.has(r.id));
    if (ungrouped.length > 0) {
      grouped.push({ label: 'Другие', rooms: ungrouped });
    }
  } else {
    if (availableRooms.length > 0) {
      grouped.push({ label: '', rooms: availableRooms });
    }
  }

  const inputWithError = (hasError: boolean): React.CSSProperties => ({
    ...input,
    border: hasError ? '1px solid red' : '1px solid #ccc',
  });

  return (
    <div style={overlay}>
      <div style={modal}>
        <h2 style={{ marginTop: 0 }}>
          {student ? 'Редактировать студента' : 'Добавить студента'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={fieldGroup}>
            <label>Фамилия</label>
            <input
              name="surname"
              value={form.surname}
              onChange={handleChange}
              style={inputWithError(!!fieldErrors.surname)}
            />
            {fieldErrors.surname && (
              <div style={errorText}>{fieldErrors.surname}</div>
            )}
          </div>

          <div style={fieldGroup}>
            <label>Имя</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              style={inputWithError(!!fieldErrors.name)}
            />
            {fieldErrors.name && (
              <div style={errorText}>{fieldErrors.name}</div>
            )}
          </div>

          <div style={fieldGroup}>
            <label>Отчество</label>
            <input
              name="patronymic"
              value={form.patronymic}
              onChange={handleChange}
              style={input}
            />
          </div>

          <div style={fieldGroup}>
            <label>Телефон</label>
            <input
              name="phoneNumber"
              value={form.phoneNumber}
              onChange={handleChange}
              placeholder="+79991234567"
              style={inputWithError(!!fieldErrors.phoneNumber)}
            />
            {fieldErrors.phoneNumber && (
              <div style={errorText}>{fieldErrors.phoneNumber}</div>
            )}
          </div>

          <div style={fieldGroup}>
            <label>Возраст</label>
            <input
              name="age"
              type="number"
              value={form.age}
              onChange={handleChange}
              min={16}
              max={100}
              style={inputWithError(!!fieldErrors.age)}
            />
            {fieldErrors.age && (
              <div style={errorText}>{fieldErrors.age}</div>
            )}
          </div>

          <div style={fieldGroup}>
            <label>Часы ОПТ</label>
            <input
              name="chs"
              type="number"
              value={form.chs}
              onChange={handleChange}
              min={0}
              style={inputWithError(!!fieldErrors.chs)}
            />
            {fieldErrors.chs && (
              <div style={errorText}>{fieldErrors.chs}</div>
            )}
          </div>

          {/* Блок комнаты — только при создании */}
          {!student && (
            <div style={fieldGroup}>
              <label>Комната</label>

              {fixedRoomId ? (
                <div style={{
                  marginTop: '4px',
                  padding: '8px 12px',
                  background: '#e8f5e9',
                  border: '1px solid #a5d6a7',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  color: '#2e7d32',
                }}>
                  <span>🚪</span>
                  <span style={{ fontWeight: 'bold' }}>
                    Комната №{fixedRoom?.number ?? fixedRoomId}
                  </span>
                </div>
              ) : (
                <>
                  <select
                    value={selectedRoomId}
                    onChange={e => handleRoomChange(Number(e.target.value))}
                    style={{
                      ...inputWithError(!!fieldErrors.room),
                      appearance: 'auto',
                    }}
                  >
                    <option value={0}>-- Выберите комнату --</option>

                    {grouped.map(group =>
                      group.label ? (
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

                  {fieldErrors.room && (
                    <div style={errorText}>{fieldErrors.room}</div>
                  )}

                  {availableRooms.length === 0 && (
                    <p style={{ color: '#FF9800', fontSize: '13px', margin: '6px 0 0' }}>
                      Нет свободных комнат
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {error && (
            <p style={{ color: 'red', margin: '8px 0' }}>{error}</p>
          )}

          <div style={{
            display: 'flex',
            gap: '10px',
            justifyContent: 'flex-end',
            marginTop: '8px'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: '4px' }}
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading || (!fixedRoomId && availableRooms.length === 0 && !student)}
              style={{
                padding: '8px 16px',
                background: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              {loading ? 'Сохранение...' : 'Сохранить'}
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
  background: 'white',
  borderRadius: '8px',
  padding: '24px',
  width: '400px',
  maxHeight: '90vh',
  overflowY: 'auto',
};

const fieldGroup: React.CSSProperties = {
  marginBottom: '12px',
};

const input: React.CSSProperties = {
  width: '100%',
  padding: '8px',
  borderRadius: '4px',
  border: '1px solid #ccc',
  marginTop: '4px',
  boxSizing: 'border-box',
  fontSize: '14px',
};

const errorText: React.CSSProperties = {
  color: 'red',
  fontSize: '12px',
  marginTop: '4px',
};

export default StudentModal;