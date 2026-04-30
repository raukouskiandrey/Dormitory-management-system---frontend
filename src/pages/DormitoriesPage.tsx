import React, { useEffect, useState } from 'react';
import { getDormitories, createDormitory, updateDormitory, deleteDormitory } from '../api/dormitories';
import { createRoom, deleteRoom } from '../api/rooms';
import { Dormitory, DormitoryRequest, RoomRequest } from '../types';
import { useNavigate, useSearchParams } from 'react-router-dom';

const DormitoriesPage: React.FC = () => {
  const [dormitories, setDormitories] = useState<Dormitory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [expandedDorms, setExpandedDorms] = useState<number[]>([]);
  const [pendingScrollDormId, setPendingScrollDormId] = useState<number | null>(null);

  const [showDormForm, setShowDormForm] = useState(false);
  const [editingDorm, setEditingDorm] = useState<Dormitory | null>(null);
  const [dormForm, setDormForm] = useState<DormitoryRequest>({ name: '', address: '' });
  const [addingRoomToDorm, setAddingRoomToDorm] = useState<number | null>(null);
  const [roomForm, setRoomForm] = useState<RoomRequest>({ number: 1, totalPlaces: 2 });

  const [openDormMenuId, setOpenDormMenuId] = useState<number | null>(null);
  const [openRoomMenuId, setOpenRoomMenuId] = useState<number | null>(null);

  const [roomPages, setRoomPages] = useState<Record<number, number>>({});
  const roomsPerPage = 10;

  const [roomPageInputs, setRoomPageInputs] = useState<Record<number, string>>({});

  const getRoomPage = (dormId: number) => roomPages[dormId] ?? 0;

  const setRoomPage = (dormId: number, page: number) => {
    setRoomPages(prev => ({ ...prev, [dormId]: page }));
    setRoomPageInputs(prev => ({ ...prev, [dormId]: '' }));
  };

  const getRoomPageInput = (dormId: number) => roomPageInputs[dormId] ?? '';

  const setRoomPageInput = (dormId: number, val: string) => {
    setRoomPageInputs(prev => ({ ...prev, [dormId]: val }));
  };

  const isRoomPageInputValid = (dormId: number, totalPages: number) => {
    const val = getRoomPageInput(dormId);
    if (!val) return false;
    const num = Number(val);
    return num >= 1 && num <= totalPages;
  };

  const handleRoomPageGo = (dormId: number, totalPages: number) => {
    const val = Number(getRoomPageInput(dormId)) - 1;
    if (val >= 0 && val < totalPages) {
      setRoomPage(dormId, val);
    }
  };

  const getRoomPageNumbers = (total: number, current: number): (number | string)[] => {
    const pages: (number | string)[] = [];
    if (total <= 7) {
      for (let i = 0; i < total; i++) pages.push(i);
    } else {
      pages.push(0);
      if (current > 3) pages.push('...');
      const start = Math.max(1, current - 1);
      const end = Math.min(total - 2, current + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (current < total - 4) pages.push('...');
      pages.push(total - 1);
    }
    return pages;
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getDormitories();
      setDormitories(res.data);
    } catch {
      setError('Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Читаем expandDorm из URL
  useEffect(() => {
    const expandDormId = searchParams.get('expandDorm');
    if (expandDormId) {
      const dormId = Number(expandDormId);
      if (dormId) {
        setExpandedDorms(prev =>
          prev.includes(dormId) ? prev : [...prev, dormId]
        );
        setPendingScrollDormId(dormId);
      }
    }
  }, [searchParams]);

  // Скроллим когда данные загружены
  useEffect(() => {
    if (!pendingScrollDormId || loading || dormitories.length === 0) return;

    const tryScroll = (attempts: number) => {
      const el = document.getElementById(`dorm-${pendingScrollDormId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Подсветка
        el.style.boxShadow = '0 0 0 3px #1976D2';
        el.style.transition = 'box-shadow 0.3s';
        setTimeout(() => {
          el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)';
        }, 3000);

        setPendingScrollDormId(null);
      } else if (attempts > 0) {
        setTimeout(() => tryScroll(attempts - 1), 100);
      }
    };

    tryScroll(10);
  }, [pendingScrollDormId, loading, dormitories.length]);

  const toggleDorm = (id: number) => {
    setExpandedDorms(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSaveDorm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDorm) {
        await updateDormitory(editingDorm.id, dormForm);
      } else {
        await createDormitory(dormForm);
      }
      setShowDormForm(false);
      setEditingDorm(null);
      setDormForm({ name: '', address: '' });
      load();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Ошибка сохранения');
    }
  };

  const handleDeleteDorm = async (id: number) => {
    if (!window.confirm('Удалить общежитие со всеми комнатами?')) return;
    try {
      await deleteDormitory(id);
      setOpenDormMenuId(null);
      load();
    } catch {
      setError('Ошибка удаления');
    }
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingRoomToDorm) return;
    try {
      await createRoom(addingRoomToDorm, roomForm);
      setAddingRoomToDorm(null);
      setRoomForm({ number: 1, totalPlaces: 2 });
      load();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Ошибка создания комнаты');
    }
  };

  const handleDeleteRoom = async (id: number) => {
    if (!window.confirm('Удалить комнату?')) return;
    try {
      await deleteRoom(id);
      setOpenRoomMenuId(null);
      load();
    } catch {
      setError('Ошибка удаления комнаты');
    }
  };

   return (
    <div style={{ padding: '8px 20px 20px 20px', position: 'relative' }}>

      {/* Кнопка добавить — абсолютная, не влияет на высоту */}
      <button
        onClick={() => {
          setEditingDorm(null);
          setDormForm({ name: '', address: '' });
          setShowDormForm(true);
        }}
        style={{
          background: '#4CAF50',
          color: 'white',
          border: 'none',
          padding: '14px 32px',
          fontSize: '17px',
          fontWeight: 'bold',
          borderRadius: '6px',
          cursor: 'pointer',
          position: 'absolute',
          top: '8px',
          right: '20px',
        }}
      >
        + Добавить общежитие
      </button>

      {/* Заголовок */}
      <div style={{ paddingRight: '300px', marginBottom: '4px' }}>
        <h1 style={{ margin: '0 0 6px 0', fontSize: '22px', lineHeight: 1.2 }}>
          Общежития
        </h1>
      </div>

      {/* ===== ФОРМА ОБЩЕЖИТИЯ ===== */}
      {showDormForm && (
        <div style={{
          background: '#f9f9f9', padding: '15px',
          borderRadius: '8px', margin: '16px 0'
        }}>
          <h3 style={{ marginTop: 0 }}>
            {editingDorm ? 'Редактировать общежитие' : 'Новое общежитие'}
          </h3>
          <form onSubmit={handleSaveDorm} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <input
              value={dormForm.name}
              onChange={e => setDormForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Название" required
              style={{ padding: '8px', flex: '1', minWidth: '200px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
            <input
              value={dormForm.address}
              onChange={e => setDormForm(p => ({ ...p, address: e.target.value }))}
              placeholder="Адрес" required
              style={{ padding: '8px', flex: '1', minWidth: '200px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
            <button type="submit" style={btnStyle('#2196F3')}>Сохранить</button>
            <button
              type="button"
              onClick={() => { setShowDormForm(false); setEditingDorm(null); }}
              style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: '4px' }}
            >
              Отмена
            </button>
          </form>
        </div>
      )}

      {loading ? <p>Загрузка...</p> : (
        <div style={{ marginTop: '50px' }}>
          {dormitories.map(dorm => {
            const isExpanded = expandedDorms.includes(dorm.id);
            const sortedRooms = [...(dorm.rooms ?? [])].sort((a, b) => a.number - b.number);
            const currentPage = getRoomPage(dorm.id);
            const totalPages = Math.ceil(sortedRooms.length / roomsPerPage);
            const pagedRooms = sortedRooms.slice(
              currentPage * roomsPerPage,
              (currentPage + 1) * roomsPerPage
            );

            return (
              <div
                key={dorm.id}
                id={`dorm-${dorm.id}`}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  overflow: 'visible',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                  transition: 'box-shadow 0.3s',
                }}
              >
                {/* ===== ЗАГОЛОВОК ОБЩЕЖИТИЯ ===== */}
                <div style={{
                  background: '#1976D2', color: 'white',
                  padding: '22px 28px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <div
                    onClick={() => toggleDorm(dorm.id)}
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', flex: 1, gap: '12px' }}
                  >
                    <span style={{
                      fontSize: '26px',
                      display: 'inline-block',
                      transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                      transition: 'transform 0.2s',
                    }}>
                      ▼
                    </span>

                    <strong style={{ fontSize: '22px' }}>{dorm.name}</strong>

                    <span style={{ opacity: 0.8, fontSize: '17px' }}>{dorm.address}</span>

                    <span style={{
                      background: 'rgba(255,255,255,0.2)',
                      padding: '6px 14px', borderRadius: '14px', fontSize: '16px'
                    }}>
                      {dorm.rooms?.length ?? 0} комн.
                    </span>
                  </div>

                  {/* ===== МЕНЮ ОБЩЕЖИТИЯ ===== */}
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => setOpenDormMenuId(openDormMenuId === dorm.id ? null : dorm.id)}
                      style={{
                        background: 'rgba(255,255,255,0.2)',
                        border: '1px solid rgba(255,255,255,0.4)',
                        borderRadius: '6px', color: 'white',
                        fontSize: '28px', cursor: 'pointer',
                        padding: '6px 16px', lineHeight: 1.4,
                      }}
                    >
                      ⋮
                    </button>

                    {openDormMenuId === dorm.id && (() => {
                      const isLast = dormitories.indexOf(dorm) >= dormitories.length - 2;
                      return (
                        <>
                          <div
                            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }}
                            onClick={() => setOpenDormMenuId(null)}
                          />
                          <div style={{
                            position: 'absolute',
                            right: 0,
                            ...(isLast
                              ? { bottom: '100%', marginBottom: '4px' }
                              : { top: '100%', marginTop: '4px' }
                            ),
                            background: '#fff', border: '1px solid #ddd',
                            borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                            zIndex: 101, minWidth: '200px', overflow: 'hidden',
                          }}>
                            <div style={menuItemStyle} onClick={() => {
                              setEditingDorm(dorm);
                              setDormForm({ name: dorm.name, address: dorm.address });
                              setShowDormForm(true);
                              setOpenDormMenuId(null);
                            }}>Редактировать</div>
                            <div style={menuItemStyle} onClick={() => {
                              if (!isExpanded) toggleDorm(dorm.id);
                              setAddingRoomToDorm(dorm.id);
                              setOpenDormMenuId(null);
                            }}>Добавить комнату</div>
                            <div
                              style={{ ...menuItemStyle, color: '#c62828', borderBottom: 'none' }}
                              onClick={() => handleDeleteDorm(dorm.id)}
                            >Удалить общежитие</div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* ===== СПИСОК КОМНАТ ===== */}
                {isExpanded && (
                  <div style={{ padding: '16px', background: '#fff' }}>

                    {/* Форма добавления комнаты */}
                    {addingRoomToDorm === dorm.id && (
                      <div style={{
                        padding: '12px', background: '#E3F2FD',
                        marginBottom: '16px', borderRadius: '6px'
                      }}>
                        <h4 style={{ margin: '0 0 10px 0' }}>Новая комната</h4>
                        <form
                          onSubmit={handleAddRoom}
                          style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}
                        >
                          <div>
                            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>
                              Номер комнаты
                            </label>
                            <input
                              type="number"
                              value={roomForm.number}
                              onChange={e => setRoomForm(p => ({ ...p, number: Number(e.target.value) }))}
                              min={1}
                              style={{ padding: '6px', width: '100px', borderRadius: '4px', border: '1px solid #ccc' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>
                              Мест (1–6)
                            </label>
                            <input
                              type="number"
                              value={roomForm.totalPlaces}
                              onChange={e => setRoomForm(p => ({ ...p, totalPlaces: Number(e.target.value) }))}
                              min={1} max={6}
                              style={{ padding: '6px', width: '80px', borderRadius: '4px', border: '1px solid #ccc' }}
                            />
                          </div>
                          <button type="submit" style={btnStyle('#4CAF50')}>Добавить</button>
                          <button
                            type="button"
                            onClick={() => setAddingRoomToDorm(null)}
                            style={{ padding: '6px 12px', cursor: 'pointer', borderRadius: '4px' }}
                          >
                            Отмена
                          </button>
                        </form>
                      </div>
                    )}

                    {/* ===== КОМНАТЫ ===== */}
                    {sortedRooms.length > 0 ? (
                      <>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                          {pagedRooms.map(room => {
                            const occupancy = room.students?.length ?? 0;
                            const isFull = occupancy >= room.totalPlaces;
                            return (
                              <div
                                key={room.id}
                                style={{
                                  border: `1px solid ${isFull ? '#ffcdd2' : '#ddd'}`,
                                  borderRadius: '8px', padding: '12px',
                                  width: '170px', minHeight: '130px',
                                  background: isFull ? '#fff8f8' : '#fafafa',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                                  display: 'flex', flexDirection: 'column', gap: '6px',
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
                                  <div
                                    style={{ fontWeight: 'bold', cursor: 'pointer', color: '#1565C0', fontSize: '14px', flex: 1 }}
                                    onClick={() => navigate(`/room/${room.id}`)}
                                  >
                                    №{room.number}
                                  </div>

                                  <div style={{ position: 'relative', flexShrink: 0 }}>
                                    <button
                                      onClick={() => setOpenRoomMenuId(openRoomMenuId === room.id ? null : room.id)}
                                      style={{
                                        background: 'none', border: '1px solid #ddd',
                                        borderRadius: '6px', fontSize: '14px',
                                        cursor: 'pointer', padding: '1px 6px',
                                        color: '#555', lineHeight: 1.4,
                                      }}
                                    >
                                      ⋮
                                    </button>

                                    {openRoomMenuId === room.id && (
                                      <>
                                        <div
                                          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }}
                                          onClick={() => setOpenRoomMenuId(null)}
                                        />
                                        <div style={{
                                          position: 'absolute', top: '100%', right: 0,
                                          background: '#fff', border: '1px solid #ddd',
                                          borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                                          zIndex: 101, minWidth: '180px',
                                          overflow: 'hidden', marginTop: '4px',
                                        }}>
                                          <div
                                            style={menuItemStyle}
                                            onClick={() => { navigate(`/room/${room.id}`); setOpenRoomMenuId(null); }}
                                          >
                                            Открыть комнату
                                          </div>
                                          <div
                                            style={{ ...menuItemStyle, color: '#c62828', borderBottom: 'none' }}
                                            onClick={() => handleDeleteRoom(room.id)}
                                          >
                                            Удалить комнату
                                          </div>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>

                                <div style={{ fontSize: '12px', color: isFull ? '#c62828' : '#666' }}>
                                  {occupancy}/{room.totalPlaces} мест
                                </div>

                                <div style={{ flex: 1 }}>
                                  {room.students && room.students.length > 0 ? (
                                    room.students.map(s => (
                                      <div key={s.id} style={{ fontSize: '11px', color: '#333' }}>
                                        • {s.surname} {s.name}
                                      </div>
                                    ))
                                  ) : (
                                    <div style={{ fontSize: '11px', color: '#999' }}>Пусто</div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* ===== ПАГИНАЦИЯ КОМНАТ ===== */}
                        {totalPages > 1 && (
                          <div style={{
                            display: 'flex', gap: '4px',
                            marginTop: '16px', alignItems: 'center',
                            justifyContent: 'center', flexWrap: 'wrap',
                          }}>
                            <button
                              onClick={() => setRoomPage(dorm.id, Math.max(0, currentPage - 1))}
                              disabled={currentPage === 0}
                              style={pageBtn(false, currentPage === 0)}
                            >«</button>

                            {getRoomPageNumbers(totalPages, currentPage).map((p, idx) =>
                              typeof p === 'string' ? (
                                <span key={`dots-${idx}`} style={{ padding: '4px', color: '#999', fontSize: '13px', userSelect: 'none' }}>…</span>
                              ) : (
                                <button key={p} onClick={() => setRoomPage(dorm.id, p)} style={pageBtn(p === currentPage, false)}>
                                  {p + 1}
                                </button>
                              )
                            )}

                            <button
                              onClick={() => setRoomPage(dorm.id, Math.min(totalPages - 1, currentPage + 1))}
                              disabled={currentPage >= totalPages - 1}
                              style={pageBtn(false, currentPage >= totalPages - 1)}
                            >»</button>

                            <span style={{ marginLeft: '8px', fontSize: '12px', color: '#666' }}>Стр:</span>
                            <input
                              type="number" min={1} max={totalPages}
                              value={getRoomPageInput(dorm.id)}
                              placeholder={String(currentPage + 1)}
                              onChange={e => setRoomPageInput(dorm.id, e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter' && isRoomPageInputValid(dorm.id, totalPages)) {
                                  handleRoomPageGo(dorm.id, totalPages);
                                }
                              }}
                              style={{ width: '45px', padding: '3px 4px', borderRadius: '4px', border: '1px solid #ccc', textAlign: 'center', fontSize: '12px' }}
                            />
                            <button
                              onClick={() => handleRoomPageGo(dorm.id, totalPages)}
                              disabled={!isRoomPageInputValid(dorm.id, totalPages)}
                              style={{ ...pageBtn(false, !isRoomPageInputValid(dorm.id, totalPages)), fontSize: '14px', fontWeight: 'bold', minWidth: '32px' }}
                              title="Перейти"
                            >»</button>
                            <span style={{ fontSize: '12px', color: '#666' }}>из {totalPages}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <p style={{ color: '#999', margin: 0 }}>Комнат нет</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {dormitories.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '40px',
              color: '#999', border: '2px dashed #ddd', borderRadius: '8px'
            }}>
              Общежитий нет
            </div>
          )}
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

const pageBtn = (isActive: boolean, isDisabled: boolean): React.CSSProperties => ({
  minWidth: '32px', height: '32px', padding: '4px 6px', borderRadius: '6px',
  border: isActive ? '2px solid #1976D2' : '1px solid #ddd',
  background: isActive ? '#1976D2' : '#fff',
  color: isActive ? '#fff' : isDisabled ? '#bbb' : '#333',
  cursor: isDisabled ? 'not-allowed' : 'pointer',
  fontSize: '13px', fontWeight: isActive ? 'bold' : 'normal',
  opacity: isDisabled ? 0.5 : 1,
});

const menuItemStyle: React.CSSProperties = {
  padding: '10px 14px', cursor: 'pointer', fontSize: '14px',
  color: '#333', borderBottom: '1px solid #f0f0f0', userSelect: 'none',
};

export default DormitoriesPage;