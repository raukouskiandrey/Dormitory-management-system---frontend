import React, { useState } from 'react';
import { Student } from '../types';
import { assignStudentToRoom } from '../api/students';

interface Props {
  roomId: number;
  roomNumber: number;
  students: Student[];
  onClose: () => void;
  onSave: () => void;
}

const SelectStudentModal: React.FC<Props> = ({
  roomId, roomNumber, students, onClose, onSave
}) => {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const filtered = students.filter(s => {
    if (!search.trim()) return true;

    const terms = search.toLowerCase().trim().split(/\s+/);
    const surname = s.surname?.toLowerCase() || '';
    const name = s.name?.toLowerCase() || '';
    const patronymic = s.patronymic?.toLowerCase() || '';

    const [sq, nq, pq] = terms;

    if (sq && !surname.startsWith(sq)) return false;
    if (nq && !name.startsWith(nq)) return false;
    if (pq && !patronymic.startsWith(pq)) return false;

    return true;
  });

  const handleSubmit = async () => {
    if (!selectedId) {
      setError('Выберите студента');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await assignStudentToRoom(selectedId, roomId);
      onSave();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Ошибка заселения');
    } finally {
      setLoading(false);
    }
  };

  const selectedStudent = students.find(s => s.id === selectedId);

  return (
    <div style={overlay}>
      <div style={modal}>
        <h2 style={{ marginTop: 0 }}>
          Заселить в комнату №{roomNumber}
        </h2>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px' }}>
            Поиск по ФИО:
          </label>
          <input
            type="text"
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setSelectedId(0);
            }}
            placeholder="Введите фамилию..."
            autoFocus
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ccc',
              fontSize: '14px',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>
          Найдено: {filtered.length} студентов без комнаты
        </div>

        <div style={{
          maxHeight: '300px',
          overflowY: 'auto',
          border: '1px solid #eee',
          borderRadius: '6px',
          marginBottom: '12px',
        }}>
          {filtered.length > 0 ? (
            filtered.map(s => (
              <div
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f0f0f0',
                  background: selectedId === s.id ? '#e3f2fd' : '#fff',
                  outline: selectedId === s.id ? '2px solid #1976D2' : 'none',
                  outlineOffset: '-2px',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  if (selectedId !== s.id) {
                    (e.currentTarget as HTMLElement).style.background = '#f5f5f5';
                  }
                }}
                onMouseLeave={e => {
                  if (selectedId !== s.id) {
                    (e.currentTarget as HTMLElement).style.background = '#fff';
                  }
                }}
              >
                <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                  {selectedId === s.id ? '✓ ' : ''}
                  {s.surname} {s.name} {s.patronymic}
                </div>
                <div style={{ color: '#888', fontSize: '12px', marginTop: '2px' }}>
                  📞 {s.phoneNumber} | 🎂 {s.age} лет | ⏱ ОПТ: {s.chs ?? 0} ч.
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
              {search ? 'Студенты не найдены' : 'Нет незаселённых студентов'}
            </div>
          )}
        </div>

        {selectedStudent && (
          <div style={{
            background: '#e8f5e9',
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #4CAF50',
            fontSize: '14px',
            marginBottom: '12px',
          }}>
            ✅ Выбран:{' '}
            <strong>
              {selectedStudent.surname} {selectedStudent.name} {selectedStudent.patronymic}
            </strong>
          </div>
        )}

        {error && (
          <p style={{ color: 'red', margin: '8px 0' }}>{error}</p>
        )}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: '4px' }}
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !selectedId}
            style={{
              padding: '8px 16px',
              background: selectedId ? '#4CAF50' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: selectedId && !loading ? 'pointer' : 'not-allowed',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Заселение...' : '🛏️ Заселить'}
          </button>
        </div>
      </div>
    </div>
  );
};

const overlay: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const modal: React.CSSProperties = {
  background: 'white',
  borderRadius: '8px',
  padding: '24px',
  width: '440px',
  maxHeight: '90vh',
  overflowY: 'auto',
};

export default SelectStudentModal;