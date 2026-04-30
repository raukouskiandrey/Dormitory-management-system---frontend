import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRoomsWithGraph } from '../api/rooms';
import { getDormitories } from '../api/dormitories';
import { deleteStudent, evictStudent, getStudents } from '../api/students';
import { getViolations } from '../api/violations';
import { Room, Student, Violation, Dormitory } from '../types';
import StudentModal from '../components/StudentModal';
import AssignRoomModal from '../components/AssignRoomModal';
import SelectStudentModal from '../components/SelectStudentModal';

const VIOLATION_LABELS: Record<string, string> = {
  SMOKING: 'Курение',
  DRINKING: 'Распитие алкоголя',
  NOISE: 'Шум',
  MESS: 'Беспорядок',
  DAMAGE: 'Порча имущества',
};

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}.${month}.${year}`;
};

const RoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const [room, setRoom] = useState<Room | null>(null);
  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [dormitories, setDormitories] = useState<Dormitory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showSelectStudentModal, setShowSelectStudentModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [assigningStudent, setAssigningStudent] = useState<Student | null>(null);
  const [unassignedStudents, setUnassignedStudents] = useState<Student[]>([]);

  const [showStudentViolationsModal, setShowStudentViolationsModal] = useState(false);
  const [viewingViolationsStudent, setViewingViolationsStudent] = useState<Student | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [rRes, vRes, dRes] = await Promise.all([
        getRoomsWithGraph(),
        getViolations(),
        getDormitories(),
      ]);
      const allRoomsData: Room[] = rRes.data;
      setAllRooms(allRoomsData);
      setViolations(vRes.data);
      setDormitories(dRes.data);
      const foundRoom = allRoomsData.find(r => r.id === Number(roomId));
      setRoom(foundRoom || null);
    } catch (e) {
      setError('Ошибка загрузки');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => { load(); }, [load]);

  const loadUnassignedStudents = async () => {
    try {
      const res = await getStudents(0, 10000);
      const all: Student[] = res.data.content;
      setUnassignedStudents(all.filter(s => !s.roomNumber));
    } catch {
      setError('Ошибка загрузки студентов');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Удалить студента?')) return;
    try {
      await deleteStudent(id);
      setOpenMenuId(null);
      await load();
    } catch {
      setError('Ошибка удаления');
    }
  };

  const handleEvict = async (id: number) => {
    if (!window.confirm('Выселить студента?')) return;
    try {
      await evictStudent(id);
      setOpenMenuId(null);
      await load();
    } catch {
      setError('Ошибка выселения');
    }
  };

  if (loading) return (
    <div style={{ padding: '40px', textAlign: 'center', fontSize: '18px' }}>
      Загрузка...
    </div>
  );

  if (!room) return (
    <div style={{ padding: '20px' }}>
      <p style={{ color: 'red' }}>Комната не найдена (ID: {roomId})</p>
      <button onClick={() => navigate('/dormitories')} style={btnStyle('#607D8B')}>
        Назад к общежитиям
      </button>
    </div>
  );

  const occupiedPlaces = room.students?.length ?? 0;
  const isFull = occupiedPlaces >= room.totalPlaces;

  const dormitoryName = (() => {
    const dormId = room.students?.[0]?.dormitoryId;
    if (!dormId) return null;
    const dorm = dormitories.find(d => d.id === dormId);
    return dorm ? dorm.name : null;
  })();

  const currentDorm = dormitories.find(d =>
    d.rooms?.some(dr => dr.id === room.id)
  );

  const dormRooms = currentDorm
    ? allRooms.filter(r => currentDorm.rooms?.some(dr => dr.id === r.id))
    : allRooms;

  return (
    <div style={{ padding: '20px' }}>
      {/* ===== ШАПКА ===== */}
      <div style={{
        display: 'flex', alignItems: 'center',
        gap: '16px', marginBottom: '24px', flexWrap: 'wrap',
      }}>
        <button onClick={() => navigate('/dormitories')} style={btnStyle('#607D8B')}>
          ← Назад
        </button>

        <h1 style={{ margin: 0 }}>Комната №{room.number}</h1>

        {dormitoryName && (
          <span style={{
            background: '#e8eaf6', color: '#283593',
            padding: '4px 12px', borderRadius: '12px',
            fontSize: '13px', fontWeight: 'bold',
          }}>
            {dormitoryName}
          </span>
        )}

        <span style={{
          background: isFull ? '#ffebee' : '#e3f2fd',
          color: isFull ? '#c62828' : '#1565c0',
          padding: '4px 14px', borderRadius: '12px',
          fontSize: '14px', fontWeight: 'bold',
        }}>
          {occupiedPlaces} / {room.totalPlaces} мест
        </span>
      </div>

      {error && (
        <div style={{
          color: '#c62828', background: '#ffebee',
          padding: '10px 16px', borderRadius: '6px', marginBottom: '16px',
        }}>
          {error}
        </div>
      )}

      {/* ===== КНОПКА ЗАСЕЛИТЬ ===== */}
      <button
        onClick={async () => {
          await loadUnassignedStudents();
          setShowSelectStudentModal(true);
        }}
        style={{
          ...btnStyle(isFull ? '#9E9E9E' : '#4CAF50'),
          marginBottom: '20px',
          opacity: isFull ? 0.7 : 1,
        }}
        disabled={isFull}
        title={isFull ? 'Комната заполнена' : 'Заселить студента'}
      >
        + Заселить студента в комнату
      </button>

      {/* ===== СПИСОК СТУДЕНТОВ ===== */}
      {room.students && room.students.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {room.students.map(student => (
            <div
              key={student.id}
              style={{
                border: '1px solid #ddd', borderRadius: '8px',
                padding: '12px 16px', background: 'white',
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', gap: '10px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}
            >
              {/* Информация */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
                <span style={{ fontWeight: 'bold', fontSize: '15px' }}>
                  {student.surname} {student.name} {student.patronymic}
                </span>
                <span style={{ color: '#ccc' }}>|</span>
                <span style={{ color: '#666', fontSize: '13px' }}>{student.phoneNumber}</span>
                <span style={{ color: '#ccc' }}>|</span>
                <span style={{ color: '#666', fontSize: '13px' }}>{student.age} лет</span>
                <span style={{ color: '#ccc' }}>|</span>
                <span style={{ color: '#666', fontSize: '13px' }}>ОПТ: {student.chs ?? 0} ч.</span>
                <span style={{ color: '#ccc' }}>|</span>

                {/* Нарушения */}
                {student.violationIds?.length > 0 ? (
                  <span
                    style={{
                      background: '#ffebee', color: '#c62828',
                      padding: '2px 8px', borderRadius: '12px',
                      fontSize: '12px', cursor: 'pointer',
                      position: 'relative', display: 'inline-block',
                    }}
                    onClick={() => {
                      setViewingViolationsStudent(student);
                      setShowStudentViolationsModal(true);
                    }}
                    onMouseEnter={e => {
                      const tooltip = e.currentTarget.querySelector('.tooltip') as HTMLElement;
                      if (tooltip) tooltip.style.display = 'block';
                    }}
                    onMouseLeave={e => {
                      const tooltip = e.currentTarget.querySelector('.tooltip') as HTMLElement;
                      if (tooltip) tooltip.style.display = 'none';
                    }}
                  >
                    {student.violationIds.length} нар.
                    <div className="tooltip" style={{
                      display: 'none', position: 'absolute',
                      bottom: '130%', left: '50%', transform: 'translateX(-50%)',
                      background: '#333', color: '#fff',
                      padding: '8px 12px', borderRadius: '6px',
                      fontSize: '12px', whiteSpace: 'nowrap',
                      zIndex: 999, boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                      pointerEvents: 'none', minWidth: '200px',
                    }}>
                      {violations.filter(v => student.violationIds.includes(v.id)).map(v => (
                        <div key={v.id} style={{ marginBottom: '4px' }}>
                          {VIOLATION_LABELS[v.violationType] || v.violationType} — {formatDate(v.date)}
                        </div>
                      ))}
                      <div style={{
                        position: 'absolute', top: '100%', left: '50%',
                        transform: 'translateX(-50%)', width: 0, height: 0,
                        borderLeft: '6px solid transparent',
                        borderRight: '6px solid transparent',
                        borderTop: '6px solid #333',
                      }} />
                    </div>
                  </span>
                ) : (
                  <span style={{
                    background: '#e8f5e9', color: '#2e7d32',
                    padding: '2px 8px', borderRadius: '12px', fontSize: '12px',
                  }}>
                    0 нар.
                  </span>
                )}
              </div>

              {/* ===== МЕНЮ ===== */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <button
                  onClick={() => setOpenMenuId(openMenuId === student.id ? null : student.id)}
                  style={{
                    background: '#f5f5f5', border: '1px solid #ddd',
                    borderRadius: '6px', fontSize: '20px',
                    cursor: 'pointer', padding: '4px 12px',
                    color: '#555', lineHeight: 1.4,
                  }}
                >
                  ⋮
                </button>

                {openMenuId === student.id && (
                  <>
                    <div
                      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }}
                      onClick={() => setOpenMenuId(null)}
                    />
                    <div style={{
                      position: 'absolute', top: '100%', right: 0,
                      background: '#fff', border: '1px solid #ddd',
                      borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                      zIndex: 101, minWidth: '210px', overflow: 'hidden',
                    }}>
                      <div style={menuItemStyle} onClick={() => {
                        setEditingStudent(student);
                        setShowStudentModal(true);
                        setOpenMenuId(null);
                      }}>
                        Редактировать
                      </div>

                      <div style={menuItemStyle} onClick={() => {
                        setAssigningStudent(student);
                        setShowAssignModal(true);
                        setOpenMenuId(null);
                      }}>
                        Перезаселить
                      </div>

                      <div style={menuItemStyle} onClick={() => handleEvict(student.id)}>
                        Выселить
                      </div>

                      <div
                        style={menuItemStyle}
                        onClick={() => {
                          setOpenMenuId(null);
                          navigate(`/violations?prefillStudentId=${student.id}`);
                        }}
                      >
                        Зафиксировать нарушение
                      </div>

                      <div
                        style={menuItemStyle}
                        onClick={() => {
                          setOpenMenuId(null);
                          navigate(`/violations?attachStudentId=${student.id}`);
                        }}
                      >
                        Привязать к нарушению
                      </div>

                      <div
                        style={{ ...menuItemStyle, color: '#c62828', borderBottom: 'none' }}
                        onClick={() => handleDelete(student.id)}
                      >
                        Удалить
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          color: '#999', border: '2px dashed #ddd',
          borderRadius: '8px', fontSize: '16px',
        }}>
          В комнате никто не проживает
        </div>
      )}

      {/* ===== МОДАЛКИ ===== */}

      {/* Выбор незаселённого студента */}
      {showSelectStudentModal && room && (
        <SelectStudentModal
          roomId={room.id}
          roomNumber={room.number}
          students={unassignedStudents}
          onClose={() => setShowSelectStudentModal(false)}
          onSave={() => {
            setShowSelectStudentModal(false);
            load();
          }}
        />
      )}

      {/* Редактирование студента */}
      {showStudentModal && (
        <StudentModal
          student={editingStudent}
          rooms={dormRooms}
          fixedRoomId={editingStudent ? undefined : room.id}
          onClose={() => setShowStudentModal(false)}
          onSave={() => { setShowStudentModal(false); load(); }}
        />
      )}

      {/* Перезаселение */}
      {showAssignModal && assigningStudent && (
        <AssignRoomModal
          student={assigningStudent}
          rooms={dormRooms}
          dormitories={dormitories}
          onClose={() => setShowAssignModal(false)}
          onSave={() => { setShowAssignModal(false); load(); }}
        />
      )}

      {/* Нарушения студента */}
      {showStudentViolationsModal && viewingViolationsStudent && (
        <div style={overlayStyle} onClick={() => setShowStudentViolationsModal(false)}>
          <div style={{ ...modalStyle, width: '480px' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>
              Нарушения: {viewingViolationsStudent.surname} {viewingViolationsStudent.name}
            </h3>

            {(() => {
              const studentViolations = violations.filter(v =>
                viewingViolationsStudent.violationIds?.includes(v.id)
              );
              return studentViolations.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {studentViolations.map(v => (
                    <div
                      key={v.id}
                      onClick={() => {
                        setShowStudentViolationsModal(false);
                        navigate(`/violations?type=${v.violationType}&id=${v.id}`);
                      }}
                      style={{
                        display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center', padding: '10px 14px',
                        border: '1px solid #eee', borderRadius: '8px',
                        cursor: 'pointer', background: '#fafafa',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.background = '#e3f2fd';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.background = '#fafafa';
                      }}
                    >
                      <div>
                        <span style={{
                          background: '#ffebee', color: '#c62828',
                          padding: '2px 8px', borderRadius: '8px',
                          fontSize: '13px', fontWeight: 'bold',
                        }}>
                          {VIOLATION_LABELS[v.violationType] || v.violationType}
                        </span>
                        <span style={{ marginLeft: '10px', color: '#666', fontSize: '13px' }}>
                          {formatDate(v.date)}
                        </span>
                      </div>
                      <span style={{ color: '#1565C0', fontSize: '13px' }}>Перейти →</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#999' }}>Нарушений нет</p>
              );
            })()}

            <div style={{ marginTop: '16px', textAlign: 'right' }}>
              <button
                onClick={() => setShowStudentViolationsModal(false)}
                style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: '4px' }}
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ===== СТИЛИ =====
const btnStyle = (color: string): React.CSSProperties => ({
  background: color, color: 'white', border: 'none',
  padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '14px',
});

const menuItemStyle: React.CSSProperties = {
  padding: '10px 14px', cursor: 'pointer', fontSize: '14px',
  borderBottom: '1px solid #f0f0f0', userSelect: 'none',
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
  background: 'white', borderRadius: '8px',
  padding: '24px', width: '440px', maxHeight: '90vh', overflowY: 'auto',
};

export default RoomPage;