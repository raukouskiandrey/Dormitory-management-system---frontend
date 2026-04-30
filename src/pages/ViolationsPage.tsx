import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getViolations, searchViolations, createViolation, deleteViolation } from '../api/violations';
import { getStudents, addViolationToStudent, removeViolationFromStudent } from '../api/students';
import { Violation, ViolationRequest, Student } from '../types';
import DatePicker from '../components/DatePicker';

const VIOLATION_LABELS: Record<string, string> = {
  SMOKING: 'Курение',
  DRINKING: 'Распитие алкоголя',
  NOISE: 'Шум',
  MESS: 'Беспорядок',
  DAMAGE: 'Порча имущества',
};

const VIOLATION_TYPES = Object.keys(VIOLATION_LABELS);

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}.${month}.${year}`;
};

const PAGE_SIZE = 10;
const MAX_VISIBLE_STUDENTS = 2;

const ViolationsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [highlightedId, setHighlightedId] = useState<number | null>(null);

  const [allViolations, setAllViolations] = useState<Violation[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [page, setPage] = useState(0);
  const [pageInput, setPageInput] = useState('');

  const [fioSearch, setFioSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortByDate, setSortByDate] = useState<'asc' | 'desc'>('desc');
  const [filterLoading, setFilterLoading] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<number>(0);
  const [form, setForm] = useState<ViolationRequest>({
    violationType: 'NOISE',
    date: new Date().toISOString().split('T')[0],
  });

  const [studentSearch, setStudentSearch] = useState('');
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);

  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [removeViolation, setRemoveViolation] = useState<Violation | null>(null);
  const [removeStudentId, setRemoveStudentId] = useState<number>(0);
  const [removeSearch, setRemoveSearch] = useState('');
  const [showRemoveDropdown, setShowRemoveDropdown] = useState(false);

  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [addStudentViolation, setAddStudentViolation] = useState<Violation | null>(null);
  const [addStudentId, setAddStudentId] = useState<number>(0);
  const [addStudentSearch, setAddStudentSearch] = useState('');
  const [showAddStudentDropdown, setShowAddStudentDropdown] = useState(false);

  const [attachStudentId, setAttachStudentId] = useState<number | null>(null);
  const [selectedViolationIds, setSelectedViolationIds] = useState<number[]>([]);

  const [expandedStudents, setExpandedStudents] = useState<Set<number>>(new Set());

  const totalPages = Math.ceil(allViolations.length / PAGE_SIZE);
  const pagedViolations = allViolations.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const isPageInputValid = () => {
    if (!pageInput) return false;
    const val = Number(pageInput);
    return val >= 1 && val <= totalPages;
  };

  const goToPage = (p: number) => {
    setPage(p);
    setPageInput('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageInputGo = () => {
    const val = Number(pageInput) - 1;
    if (val >= 0 && val < totalPages) goToPage(val);
  };

  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 0; i < totalPages; i++) pages.push(i);
    } else {
      pages.push(0);
      if (page > 3) pages.push('...');
      const start = Math.max(1, page - 1);
      const end = Math.min(totalPages - 2, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (page < totalPages - 4) pages.push('...');
      pages.push(totalPages - 1);
    }
    return pages;
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [vRes, sRes] = await Promise.all([
        getViolations(),
        getStudents(0, 1000),
      ]);
      setAllViolations(vRes.data);
      setStudents(sRes.data.content);
    } catch {
      setError('Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFiltered = useCallback(async (
    fio: string,
    type: string,
    sort: 'asc' | 'desc'
  ) => {
    setFilterLoading(true);
    setError('');
    try {
      const res = await searchViolations({
        fio: fio || undefined,
        violationType: type || undefined,
        sortByDate: sort,
      });
      setAllViolations(res.data);
      setPage(0);
    } catch {
      setError('Ошибка поиска');
    } finally {
      setFilterLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (loading || allViolations.length === 0) return;
    const id = searchParams.get('id');
    if (id) {
      const numId = Number(id);
      setHighlightedId(numId);
      const scrollTimer = setTimeout(() => {
        document.getElementById(`violation-row-${numId}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
      const highlightTimer = setTimeout(() => setHighlightedId(null), 4000);
      return () => { clearTimeout(scrollTimer); clearTimeout(highlightTimer); };
    }
  }, [searchParams, loading, allViolations.length]);

  useEffect(() => {
    if (students.length === 0) return;
    const prefillId = searchParams.get('prefillStudentId');
    if (!prefillId) return;
    const studentId = Number(prefillId);
    if (!studentId) return;
    setSelectedStudentId(studentId);
    setShowForm(true);
    window.history.replaceState({}, '', window.location.pathname);
  }, [students.length, searchParams]);

  useEffect(() => {
    if (students.length === 0) return;
    const attachId = searchParams.get('attachStudentId');
    if (!attachId) return;
    const studentId = Number(attachId);
    if (!studentId) return;
    setAttachStudentId(studentId);
    setSelectedViolationIds([]);
    window.history.replaceState({}, '', window.location.pathname);
  }, [students.length, searchParams]);

  useEffect(() => {
    const handleClickOutside = () => {
      setShowStudentDropdown(false);
      setShowRemoveDropdown(false);
      setShowAddStudentDropdown(false);
      setExpandedStudents(new Set());
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleFilter = async () => {
    const hasFilters = fioSearch || typeFilter || sortByDate !== 'desc';
    if (hasFilters) {
      setIsFiltering(true);
      await loadFiltered(fioSearch, typeFilter, sortByDate);
    } else {
      setIsFiltering(false);
      load();
    }
  };

  const handleClearFilter = () => {
    setFioSearch('');
    setTypeFilter('');
    setSortByDate('desc');
    setIsFiltering(false);
    setPage(0);
    load();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) { setError('Выберите студента'); return; }
    if (!form.violationType) { setError('Выберите тип нарушения'); return; }
    if (!form.date?.trim()) { setError('Укажите дату нарушения'); return; }

    setSaving(true);
    setError('');
    try {
      const res = await createViolation(selectedStudentId, form);
      const createdViolation: Violation = {
        ...res.data,
        studentIds: res.data.studentIds?.length > 0
          ? res.data.studentIds
          : [selectedStudentId],
      };

      if (isFiltering) {
        await loadFiltered(fioSearch, typeFilter, sortByDate);
      } else {
        await load();
      }

      setStudents(prev =>
        prev.map(student =>
          student.id === selectedStudentId
            ? {
                ...student,
                violationIds: Array.from(
                  new Set([...(student.violationIds ?? []), createdViolation.id])
                ),
              }
            : student
        )
      );

      setHighlightedId(createdViolation.id);
      setTimeout(() => {
        document.getElementById(`violation-row-${createdViolation.id}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
      setTimeout(() => setHighlightedId(null), 4000);

      setShowForm(false);
      setSelectedStudentId(0);
      setStudentSearch('');
      setForm({ violationType: 'NOISE', date: new Date().toISOString().split('T')[0] });
    } catch (e: any) {
      setError(e.response?.data?.message || 'Ошибка создания');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Удалить нарушение полностью?')) return;
    try {
      await deleteViolation(id);
      setAllViolations(prev => prev.filter(v => v.id !== id));
      setStudents(prev =>
        prev.map(student => ({
          ...student,
          violationIds: (student.violationIds ?? []).filter(vId => vId !== id),
        }))
      );
    } catch {
      setError('Ошибка удаления');
    }
  };

  const handleRemoveViolationFromStudent = async () => {
    if (!removeViolation || !removeStudentId) { setError('Выберите студента'); return; }
    try {
      await removeViolationFromStudent(removeStudentId, removeViolation.id);
      setAllViolations(prev =>
        prev.map(v =>
          v.id === removeViolation.id
            ? { ...v, studentIds: v.studentIds.filter(id => id !== removeStudentId) }
            : v
        )
      );
      setStudents(prev =>
        prev.map(s =>
          s.id === removeStudentId
            ? { ...s, violationIds: (s.violationIds ?? []).filter(id => id !== removeViolation.id) }
            : s
        )
      );
      setShowRemoveModal(false);
      setRemoveViolation(null);
      setRemoveStudentId(0);
      setRemoveSearch('');
      setError('');
    } catch (e: any) {
      setError(e.response?.data?.message || 'Ошибка снятия нарушения');
    }
  };

  const handleAddStudentToViolation = async () => {
    if (!addStudentViolation || !addStudentId) { setError('Выберите студента'); return; }
    try {
      await addViolationToStudent(addStudentId, addStudentViolation.id);
      setAllViolations(prev =>
        prev.map(v =>
          v.id === addStudentViolation.id
            ? { ...v, studentIds: Array.from(new Set([...v.studentIds, addStudentId])) }
            : v
        )
      );
      setStudents(prev =>
        prev.map(s =>
          s.id === addStudentId
            ? { ...s, violationIds: Array.from(new Set([...(s.violationIds ?? []), addStudentViolation.id])) }
            : s
        )
      );
      setShowAddStudentModal(false);
      setAddStudentViolation(null);
      setAddStudentId(0);
      setAddStudentSearch('');
      setError('');
    } catch (e: any) {
      setError(e.response?.data?.message || 'Ошибка добавления студента');
    }
  };

  const handleAttachSelected = async () => {
    if (!attachStudentId || selectedViolationIds.length === 0) return;
    try {
      for (const vId of selectedViolationIds) {
        await addViolationToStudent(attachStudentId, vId);
      }
      setAllViolations(prev =>
        prev.map(v =>
          selectedViolationIds.includes(v.id)
            ? { ...v, studentIds: Array.from(new Set([...v.studentIds, attachStudentId])) }
            : v
        )
      );
      setStudents(prev =>
        prev.map(s =>
          s.id === attachStudentId
            ? { ...s, violationIds: Array.from(new Set([...(s.violationIds ?? []), ...selectedViolationIds])) }
            : s
        )
      );
      setAttachStudentId(null);
      setSelectedViolationIds([]);
      setError('');
    } catch (e: any) {
      setError(e.response?.data?.message || 'Ошибка привязки нарушения');
    }
  };

  const getStudentById = (id: number) => students.find(s => s.id === id);

  const searchStudentsFn = (
    searchText: string,
    list: Student[],
    excludeIds: number[] = []
  ): Student[] => {
    if (searchText.length < 1) return [];
    const terms = searchText.toLowerCase().trim().split(/\s+/);
    const [sq, nq, pq] = terms;
    return list.filter(s => {
      if (excludeIds.includes(s.id)) return false;
      const sn = s.surname?.toLowerCase() || '';
      const nm = s.name?.toLowerCase() || '';
      const pt = s.patronymic?.toLowerCase() || '';
      if (sq && !sn.startsWith(sq)) return false;
      if (nq && !nm.startsWith(nq)) return false;
      if (pq && !pt.startsWith(pq)) return false;
      return true;
    }).slice(0, 10);
  };

  const filteredStudents = studentSearch.length >= 1
    ? searchStudentsFn(studentSearch, students)
    : students.slice(0, 10);

  const filteredRemoveStudents = removeViolation
    ? searchStudentsFn(
        removeSearch,
        students.filter(s => removeViolation.studentIds.includes(s.id))
      )
    : [];

  const filteredAddStudents = addStudentViolation
    ? searchStudentsFn(addStudentSearch, students, addStudentViolation.studentIds)
    : [];

  const toggleViolationSelection = (violationId: number) => {
    setSelectedViolationIds(prev =>
      prev.includes(violationId)
        ? prev.filter(id => id !== violationId)
        : [...prev, violationId]
    );
  };

  return (
    <div style={{ padding: '8px 20px 20px 20px', position: 'relative' }}>

      {/* Кнопка зафиксировать */}
      {!attachStudentId && (
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            background: '#f44336',
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
          {showForm ? 'Закрыть форму' : '+ Зафиксировать нарушение'}
        </button>
      )}

      {/* Заголовок */}
      <div style={{ paddingRight: '340px', marginBottom: '4px' }}>
        <h1 style={{ margin: '0 0 6px 0', fontSize: '22px', lineHeight: 1.2 }}>
          Нарушения
        </h1>
        <p style={{ color: '#666', fontSize: '13px', margin: '0 0 6px 0', lineHeight: 1.2 }}>
          Поиск нарушений по фильтрам:
        </p>
      </div>

      {/* Баннер привязки */}
      {attachStudentId && (() => {
        const s = getStudentById(attachStudentId);
        return s ? (
          <div style={{
            background: '#e8f5e9', border: '2px solid #4CAF50',
            borderRadius: '8px', padding: '12px 16px', marginBottom: '10px',
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', flexWrap: 'wrap', gap: '10px',
          }}>
            <div>
              <span style={{ fontSize: '15px' }}>Выберите нарушения для студента:</span>
              <div style={{ fontWeight: 'bold', fontSize: '16px', marginTop: '4px' }}>
                {s.surname} {s.name} {s.patronymic}
                {s.roomNumber && (
                  <span style={{ fontWeight: 'normal', color: '#666', marginLeft: '8px' }}>
                    — комн. {s.roomNumber}
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                onClick={handleAttachSelected}
                disabled={selectedViolationIds.length === 0}
                style={{
                  background: selectedViolationIds.length > 0 ? '#4CAF50' : '#ccc',
                  color: 'white', border: 'none', borderRadius: '6px',
                  padding: '8px 18px',
                  cursor: selectedViolationIds.length > 0 ? 'pointer' : 'not-allowed',
                  fontSize: '14px', fontWeight: 'bold',
                }}
              >
                Привязать{selectedViolationIds.length > 0 ? ` (${selectedViolationIds.length})` : ''}
              </button>
              <button
                onClick={() => { setAttachStudentId(null); setSelectedViolationIds([]); }}
                style={{
                  background: '#fff', border: '1px solid #ccc',
                  borderRadius: '6px', padding: '8px 16px',
                  cursor: 'pointer', fontSize: '14px',
                }}
              >
                Отменить
              </button>
            </div>
          </div>
        ) : null;
      })()}

      {/* Форма создания */}
      {showForm && !attachStudentId && (
        <div style={{
          background: '#f9f9f9', padding: '15px',
          borderRadius: '8px', marginBottom: '10px',
        }}>
          <h3 style={{ marginTop: 0 }}>Новое нарушение</h3>
          <form
            onSubmit={handleCreate}
            style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}
          >
            <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px' }}>Студент</label>
              {selectedStudentId ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: '#e3f2fd', padding: '6px 12px',
                  borderRadius: '6px', minWidth: '280px',
                }}>
                  <span style={{ fontSize: '14px' }}>
                    {(() => {
                      const s = students.find(st => st.id === selectedStudentId);
                      return s
                        ? `${s.surname} ${s.name} ${s.patronymic}${s.roomNumber ? ` — комн. ${s.roomNumber}` : ''}`
                        : '';
                    })()}
                  </span>
                  <button
                    type="button"
                    onClick={() => { setSelectedStudentId(0); setStudentSearch(''); }}
                    style={{
                      background: 'none', border: 'none', color: '#c62828',
                      cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', padding: '0 4px',
                    }}
                  >X</button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={e => { setStudentSearch(e.target.value); setShowStudentDropdown(true); }}
                    onFocus={() => setShowStudentDropdown(true)}
                    placeholder="Введите фамилию..."
                    style={{
                      padding: '8px', minWidth: '280px', borderRadius: '4px',
                      border: '1px solid #ccc', fontSize: '14px',
                    }}
                  />
                  {showStudentDropdown && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0,
                      background: '#fff', border: '1px solid #ccc',
                      borderRadius: '0 0 6px 6px', maxHeight: '200px',
                      overflowY: 'auto', zIndex: 100,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)', minWidth: '280px',
                    }}>
                      {filteredStudents.length > 0
                        ? filteredStudents.map(s => (
                          <div
                            key={s.id}
                            onClick={() => {
                              setSelectedStudentId(s.id);
                              setStudentSearch('');
                              setShowStudentDropdown(false);
                            }}
                            style={{
                              padding: '8px 12px', cursor: 'pointer',
                              borderBottom: '1px solid #f0f0f0', fontSize: '13px',
                            }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#e3f2fd'}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#fff'}
                          >
                            <div style={{ fontWeight: 'bold' }}>{s.surname} {s.name} {s.patronymic}</div>
                            <div style={{ color: '#888', fontSize: '12px' }}>
                              {s.phoneNumber}{s.roomNumber ? ` | Комн. ${s.roomNumber}` : ' | Не заселён'}
                            </div>
                          </div>
                        ))
                        : (
                          <div style={{ padding: '12px', color: '#999', textAlign: 'center', fontSize: '13px' }}>
                            Студенты не найдены
                          </div>
                        )
                      }
                    </div>
                  )}
                </>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px' }}>Тип</label>
              <select
                value={form.violationType}
                onChange={e => setForm(p => ({ ...p, violationType: e.target.value }))}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              >
                {VIOLATION_TYPES.map(v => (
                  <option key={v} value={v}>{VIOLATION_LABELS[v]}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px' }}>Дата</label>
              <DatePicker
                value={form.date}
                onChange={date => setForm(p => ({ ...p, date }))}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            <button
              type="submit" disabled={saving}
              style={{ ...btnStyle('#f44336'), opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Сохранение...' : 'Зафиксировать'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setStudentSearch(''); setSelectedStudentId(0); }}
              style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: '4px' }}
            >
              Отмена
            </button>
          </form>
        </div>
      )}

      {error && <div style={{ color: 'red', marginBottom: '8px' }}>{error}</div>}

      {/* ===== ФИЛЬТРЫ ===== */}
      <div style={{
        display: 'flex', gap: '10px', flexWrap: 'wrap',
        alignItems: 'flex-end', justifyContent: 'center',
        marginBottom: '8px',
        background: '#f5f5f5', padding: '6px 12px 0 12px',
        borderRadius: '8px',
      }}>
        <div style={{ marginBottom: '8px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '3px' }}>
            ФИО студента:
          </label>
          <input
            type="text"
            value={fioSearch}
            onChange={e => setFioSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleFilter(); }}
            style={{
              padding: '6px 10px', borderRadius: '6px',
              border: '1px solid #ccc', fontSize: '14px',
              width: '180px', height: '38px',
              boxSizing: 'border-box' as const,
            }}
          />
        </div>

        <div style={{ marginBottom: '8px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '3px' }}>
            Тип нарушения:
          </label>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            style={{
              padding: '6px 10px', borderRadius: '6px',
              border: '1px solid #ccc', fontSize: '14px',
              height: '38px', boxSizing: 'border-box' as const,
            }}
          >
            <option value="">Все типы</option>
            {VIOLATION_TYPES.map(t => (
              <option key={t} value={t}>{VIOLATION_LABELS[t]}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '8px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '3px' }}>
            Сортировка:
          </label>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => {
                setSortByDate('desc');
                loadFiltered(fioSearch, typeFilter, 'desc');
                setIsFiltering(true);
              }}
              style={{
                padding: '6px 10px', borderRadius: '6px', fontSize: '13px',
                border: '1px solid #ccc', cursor: 'pointer',
                height: '38px', boxSizing: 'border-box' as const,
                background: sortByDate === 'desc' ? '#1976D2' : '#fff',
                color: sortByDate === 'desc' ? '#fff' : '#333',
                fontWeight: sortByDate === 'desc' ? 'bold' : 'normal',
              }}
            >↓ Новые</button>
            <button
              onClick={() => {
                setSortByDate('asc');
                loadFiltered(fioSearch, typeFilter, 'asc');
                setIsFiltering(true);
              }}
              style={{
                padding: '6px 10px', borderRadius: '6px', fontSize: '13px',
                border: '1px solid #ccc', cursor: 'pointer',
                height: '38px', boxSizing: 'border-box' as const,
                background: sortByDate === 'asc' ? '#1976D2' : '#fff',
                color: sortByDate === 'asc' ? '#fff' : '#333',
                fontWeight: sortByDate === 'asc' ? 'bold' : 'normal',
              }}
            >↑ Старые</button>
          </div>
        </div>

        <div style={{
          marginBottom: '8px',
          display: 'flex', gap: '8px', alignItems: 'center',
        }}>
          <button
            onClick={handleFilter}
            style={{
              background: '#2196F3', color: 'white', border: 'none',
              height: '38px', padding: '0 20px', borderRadius: '6px',
              cursor: 'pointer', fontSize: '14px', whiteSpace: 'nowrap' as const,
            }}
          >Поиск</button>
          <button
            onClick={handleClearFilter}
            style={{
              background: '#9E9E9E', color: 'white', border: 'none',
              height: '38px', padding: '0 14px', borderRadius: '6px',
              cursor: 'pointer', fontSize: '14px', whiteSpace: 'nowrap' as const,
            }}
          >Сбросить</button>
          {isFiltering && (
            <span style={{
              background: '#E3F2FD', color: '#1565C0',
              padding: '4px 10px', borderRadius: '12px',
              fontSize: '13px', whiteSpace: 'nowrap' as const,
            }}>
              Фильтры активны
            </span>
          )}
          {filterLoading && (
            <span style={{ fontSize: '13px', color: '#999' }}>Поиск...</span>
          )}
        </div>
      </div>

      {/* ===== ТАБЛИЦА ===== */}
      {loading ? (
        <p>Загрузка...</p>
      ) : allViolations.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '40px', color: '#999',
          border: '1px dashed #ccc', borderRadius: '8px',
        }}>
          {fioSearch || typeFilter ? '🔍 Нарушений не найдено' : '📋 Нарушений нет'}
        </div>
      ) : (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#e0e0e0' }}>
                <th style={thStyle}>Дата</th>
                <th style={thStyle}>Тип нарушения</th>
                <th style={thStyle}>Студенты</th>
                <th style={thStyle}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {pagedViolations.map(v => {
                const isSelected = selectedViolationIds.includes(v.id);
                const isHighlighted = highlightedId === v.id;
                const hiddenCount = v.studentIds.length - MAX_VISIBLE_STUDENTS;

                return (
                  <tr
                    key={v.id}
                    id={`violation-row-${v.id}`}
                    onClick={() => { if (attachStudentId) toggleViolationSelection(v.id); }}
                    style={{
                      borderBottom: '1px solid #eee',
                      background: isHighlighted || isSelected ? '#e3f2fd' : 'transparent',
                      boxShadow: isHighlighted || isSelected
                        ? 'inset 0 0 0 2px #1976D2' : 'none',
                      transition: 'all 0.15s ease',
                      cursor: attachStudentId ? 'pointer' : 'default',
                    }}
                  >
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap', color: '#555' }}
                        onClick={e => e.stopPropagation()}>
                      {formatDate(v.date)}
                    </td>

                    <td style={tdStyle} onClick={e => e.stopPropagation()}>
                      <span style={{
                        color: '#c62828',
                        fontSize: '15px', fontWeight: 'bold',
                      }}>
                        {VIOLATION_LABELS[v.violationType] || v.violationType}
                      </span>
                    </td>

                    {/* Студенты — hover tooltip + click popover */}
                    <td style={{ ...tdStyle, position: 'relative' }}>
                      {v.studentIds && v.studentIds.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                          {v.studentIds.slice(0, MAX_VISIBLE_STUDENTS).map(sId => {
                            const student = getStudentById(sId);
                            return student ? (
                              <span
                                key={sId}
                                onClick={e => {
                                  e.stopPropagation();
                                  navigate(`/students?studentId=${sId}`);
                                }}
                                style={{
                                  background: '#e3f2fd', color: '#1565C0',
                                  padding: '3px 10px', borderRadius: '12px',
                                  fontSize: '14px', cursor: 'pointer',
                                  textDecoration: 'underline', whiteSpace: 'nowrap' as const,
                                }}
                              >
                                {student.surname} {student.name}
                              </span>
                            ) : null;
                          })}

                          {hiddenCount > 0 && (
                            <span
                              style={{
                                position: 'relative',
                                display: 'inline-block',
                              }}
                              onClick={e => {
                                e.stopPropagation();
                                setExpandedStudents(prev => {
                                  const next = new Set(prev);
                                  if (next.has(v.id)) next.delete(v.id);
                                  else next.add(v.id);
                                  return next;
                                });
                              }}
                              onMouseEnter={e => {
                                if (expandedStudents.has(v.id)) return;
                                const t = e.currentTarget.querySelector('.more-tooltip') as HTMLElement;
                                if (t) t.style.display = 'block';
                              }}
                              onMouseLeave={e => {
                                const t = e.currentTarget.querySelector('.more-tooltip') as HTMLElement;
                                if (t) t.style.display = 'none';
                              }}
                            >
                              <span style={{
                                background: '#fff3e0', color: '#e65100',
                                padding: '3px 10px', borderRadius: '12px',
                                fontSize: '13px', cursor: 'pointer',
                                fontWeight: 'bold', whiteSpace: 'nowrap' as const,
                              }}>
                                ещё +{hiddenCount}
                              </span>

                              {/* Tooltip — только когда popover закрыт */}
                              {!expandedStudents.has(v.id) && (
                                <div className="more-tooltip" style={{
                                  display: 'none',
                                  position: 'absolute',
                                  bottom: '130%',
                                  left: '50%',
                                  transform: 'translateX(-50%)',
                                  background: '#333',
                                  color: '#fff',
                                  padding: '8px 12px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  whiteSpace: 'nowrap' as const,
                                  zIndex: 999,
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                                  pointerEvents: 'none',
                                  minWidth: '160px',
                                }}>
                                  {v.studentIds.slice(MAX_VISIBLE_STUDENTS).map(sId => {
                                    const s = getStudentById(sId);
                                    return s ? (
                                      <div key={sId} style={{ marginBottom: '3px' }}>
                                        {s.surname} {s.name} {s.patronymic}
                                      </div>
                                    ) : null;
                                  })}
                                  <div style={{
                                    position: 'absolute', top: '100%', left: '50%',
                                    transform: 'translateX(-50%)',
                                    width: 0, height: 0,
                                    borderLeft: '6px solid transparent',
                                    borderRight: '6px solid transparent',
                                    borderTop: '6px solid #333',
                                  }} />
                                </div>
                              )}

                              {/* Popover по клику */}
                              {expandedStudents.has(v.id) && (
                                <div
                                  style={{
                                    position: 'absolute',
                                    top: '130%',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    background: '#fff',
                                    border: '1px solid #ddd',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                                    zIndex: 1000,
                                    minWidth: '240px',
                                    overflow: 'hidden',
                                  }}
                                  onClick={e => e.stopPropagation()}
                                >
                                  <div style={{
                                    padding: '8px 12px',
                                    borderBottom: '1px solid #eee',
                                    fontSize: '12px',
                                    color: '#666',
                                    background: '#fafafa',
                                  }}>
                                    Остальные студенты:
                                  </div>
                                  {v.studentIds.slice(MAX_VISIBLE_STUDENTS).map(sId => {
                                    const s = getStudentById(sId);
                                    return s ? (
                                      <div
                                        key={sId}
                                        onClick={e => {
                                          e.stopPropagation();
                                          setExpandedStudents(new Set());
                                          navigate(`/students?studentId=${sId}`);
                                        }}
                                        style={{
                                          padding: '8px 12px',
                                          cursor: 'pointer',
                                          borderBottom: '1px solid #f0f0f0',
                                          fontSize: '13px',
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center',
                                        }}
                                        onMouseEnter={e => {
                                          (e.currentTarget as HTMLElement).style.background = '#e3f2fd';
                                        }}
                                        onMouseLeave={e => {
                                          (e.currentTarget as HTMLElement).style.background = '#fff';
                                        }}
                                      >
                                        <span>{s.surname} {s.name} {s.patronymic}</span>
                                        <span style={{ color: '#1565C0', fontSize: '12px' }}>Перейти →</span>
                                      </div>
                                    ) : null;
                                  })}
                                  <div
                                    onClick={e => {
                                      e.stopPropagation();
                                      setExpandedStudents(prev => {
                                        const next = new Set(prev);
                                        next.delete(v.id);
                                        return next;
                                      });
                                    }}
                                    style={{
                                      padding: '6px 12px',
                                      textAlign: 'center',
                                      cursor: 'pointer',
                                      color: '#999',
                                      fontSize: '12px',
                                      background: '#fafafa',
                                    }}
                                    onMouseEnter={e => {
                                      (e.currentTarget as HTMLElement).style.background = '#f0f0f0';
                                    }}
                                    onMouseLeave={e => {
                                      (e.currentTarget as HTMLElement).style.background = '#fafafa';
                                    }}
                                  >
                                    Закрыть
                                  </div>
                                </div>
                              )}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: '#999', fontSize: '14px' }}>Нет студентов</span>
                      )}
                    </td>

                    {/* Действия */}
                    <td style={tdStyle} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {attachStudentId ? (
                          <div
                            onClick={() => toggleViolationSelection(v.id)}
                            style={{
                              width: '22px', height: '22px',
                              border: isSelected ? '2px solid #1976D2' : '2px solid #ccc',
                              borderRadius: '4px',
                              background: isSelected ? '#1976D2' : '#fff',
                              cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: '#fff', fontSize: '14px', fontWeight: 'bold',
                              transition: 'all 0.15s', flexShrink: 0,
                            }}
                          >
                            {isSelected ? '✓' : ''}
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setAddStudentViolation(v);
                                setAddStudentId(0);
                                setAddStudentSearch('');
                                setShowAddStudentModal(true);
                              }}
                              style={btnSmall('#4CAF50')}
                            >+ Студент</button>
                            {v.studentIds && v.studentIds.length > 0 && (
                              <button
                                onClick={() => {
                                  setRemoveViolation(v);
                                  setRemoveStudentId(0);
                                  setRemoveSearch('');
                                  setShowRemoveModal(true);
                                }}
                                style={btnSmall('#FF9800')}
                              >Снять</button>
                            )}
                            <button
                              onClick={() => handleDelete(v.id)}
                              style={btnSmall('#f44336')}
                            >Удалить</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Пагинация */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex', gap: '4px', marginTop: '12px',
              alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap',
            }}>
              <button
                onClick={() => goToPage(Math.max(0, page - 1))}
                disabled={page === 0}
                style={pageBtn(false, page === 0)}
              >«</button>
              {getPageNumbers().map((p, idx) =>
                typeof p === 'string'
                  ? <span key={`dots-${idx}`} style={{ padding: '6px 4px', color: '#999', fontSize: '14px', userSelect: 'none' }}>…</span>
                  : <button key={p} onClick={() => goToPage(p)} style={pageBtn(p === page, false)}>{p + 1}</button>
              )}
              <button
                onClick={() => goToPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                style={pageBtn(false, page >= totalPages - 1)}
              >»</button>
              <span style={{ marginLeft: '12px', fontSize: '13px', color: '#666' }}>Стр:</span>
              <input
                type="number" min={1} max={totalPages}
                value={pageInput} placeholder={String(page + 1)}
                onChange={e => setPageInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && isPageInputValid()) handlePageInputGo(); }}
                style={{
                  width: '50px', padding: '4px 6px', borderRadius: '4px',
                  border: '1px solid #ccc', textAlign: 'center', fontSize: '13px',
                }}
              />
              <button
                onClick={handlePageInputGo}
                disabled={!isPageInputValid()}
                style={{
                  ...pageBtn(false, !isPageInputValid()),
                  fontSize: '16px', fontWeight: 'bold', minWidth: '36px',
                }}
              >»</button>
              <span style={{ fontSize: '13px', color: '#666' }}>из {totalPages}</span>
            </div>
          )}
        </>
      )}

      {/* Модалка добавления студента */}
      {showAddStudentModal && addStudentViolation && (
        <div style={overlayStyle} onClick={() => setShowAddStudentModal(false)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Добавить студента к нарушению</h3>
            <div style={{
              background: '#e8f5e9', padding: '10px 14px',
              borderRadius: '6px', marginBottom: '16px', border: '1px solid #a5d6a7',
            }}>
              <div style={{ fontSize: '13px', color: '#555' }}>Нарушение:</div>
              <div style={{ fontWeight: 'bold' }}>
                {VIOLATION_LABELS[addStudentViolation.violationType] || addStudentViolation.violationType}
                {' — '}{formatDate(addStudentViolation.date)}
              </div>
              {addStudentViolation.studentIds.length > 0 && (
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  Уже добавлены:{' '}
                  {addStudentViolation.studentIds
                    .map(id => getStudentById(id))
                    .filter(Boolean)
                    .map(s => `${s!.surname} ${s!.name}`)
                    .join(', ')}
                </div>
              )}
            </div>
            <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', fontWeight: 'bold' }}>
              Найдите студента:
            </label>
            <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
              <input
                type="text" value={addStudentSearch}
                onChange={e => { setAddStudentSearch(e.target.value); setShowAddStudentDropdown(true); }}
                onFocus={() => { if (addStudentSearch.length >= 1) setShowAddStudentDropdown(true); }}
                placeholder="Введите фамилию..."
                style={{
                  padding: '8px', width: '100%', borderRadius: '4px',
                  border: '1px solid #ccc', fontSize: '14px', boxSizing: 'border-box',
                }}
              />
              {showAddStudentDropdown && addStudentSearch.length >= 1 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0,
                  background: '#fff', border: '1px solid #ccc',
                  borderRadius: '0 0 6px 6px', maxHeight: '200px',
                  overflowY: 'auto', zIndex: 100,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                }}>
                  {filteredAddStudents.length > 0
                    ? filteredAddStudents.map(s => (
                      <div key={s.id}
                        onClick={() => { setAddStudentId(s.id); setAddStudentSearch(`${s.surname} ${s.name}`); setShowAddStudentDropdown(false); }}
                        style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0', fontSize: '13px' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#e8f5e9'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#fff'}
                      >
                        <div style={{ fontWeight: 'bold' }}>{s.surname} {s.name} {s.patronymic}</div>
                        <div style={{ color: '#888', fontSize: '12px' }}>{s.phoneNumber}{s.roomNumber ? ` | Комн. ${s.roomNumber}` : ' | Не заселён'}</div>
                      </div>
                    ))
                    : <div style={{ padding: '12px', color: '#999', textAlign: 'center', fontSize: '13px' }}>Все подходящие студенты уже добавлены</div>
                  }
                </div>
              )}
            </div>
            {addStudentId > 0 && (
              <div style={{ marginTop: '12px', background: '#e8f5e9', padding: '8px 12px', borderRadius: '6px', border: '1px solid #4CAF50', fontSize: '14px' }}>
                Выбран: <strong>{(() => { const s = getStudentById(addStudentId); return s ? `${s.surname} ${s.name} ${s.patronymic}` : ''; })()}</strong>
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => { setShowAddStudentModal(false); setAddStudentViolation(null); setAddStudentId(0); setAddStudentSearch(''); }}
                style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: '4px' }}>Отмена</button>
              <button onClick={handleAddStudentToViolation} disabled={!addStudentId}
                style={{ ...btnStyle('#4CAF50'), opacity: !addStudentId ? 0.5 : 1, cursor: !addStudentId ? 'not-allowed' : 'pointer' }}>
                Добавить студента
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка снятия нарушения */}
      {showRemoveModal && removeViolation && (
        <div style={overlayStyle} onClick={() => setShowRemoveModal(false)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Снять нарушение со студента</h3>
            <div style={{
              background: '#fff8e1', padding: '10px 14px',
              borderRadius: '6px', marginBottom: '16px', border: '1px solid #ffe082',
            }}>
              <div style={{ fontSize: '13px', color: '#555' }}>Нарушение:</div>
              <div style={{ fontWeight: 'bold' }}>
                {VIOLATION_LABELS[removeViolation.violationType] || removeViolation.violationType}
                {' — '}{formatDate(removeViolation.date)}
              </div>
            </div>
            <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', fontWeight: 'bold' }}>
              Выберите студента:
            </label>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {removeViolation.studentIds.map(sId => {
                  const s = getStudentById(sId);
                  return s ? (
                    <span key={sId}
                      onClick={() => { setRemoveStudentId(s.id); setRemoveSearch(`${s.surname} ${s.name}`); }}
                      style={{
                        background: removeStudentId === s.id ? '#fff3e0' : '#e3f2fd',
                        color: removeStudentId === s.id ? '#e65100' : '#1565C0',
                        border: removeStudentId === s.id ? '2px solid #FF9800' : '2px solid transparent',
                        padding: '4px 10px', borderRadius: '12px', fontSize: '13px', cursor: 'pointer',
                      }}
                    >{s.surname} {s.name}</span>
                  ) : null;
                })}
              </div>
            </div>
            <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px' }}>Или найдите:</label>
              <input type="text" value={removeSearch}
                onChange={e => { setRemoveSearch(e.target.value); setShowRemoveDropdown(true); }}
                onFocus={() => { if (removeSearch.length >= 1) setShowRemoveDropdown(true); }}
                placeholder="Введите фамилию..."
                style={{ padding: '8px', width: '100%', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px', boxSizing: 'border-box' }}
              />
              {showRemoveDropdown && removeSearch.length >= 1 && filteredRemoveStudents.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0,
                  background: '#fff', border: '1px solid #ccc',
                  borderRadius: '0 0 6px 6px', maxHeight: '150px',
                  overflowY: 'auto', zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                }}>
                  {filteredRemoveStudents.map(s => (
                    <div key={s.id}
                      onClick={() => { setRemoveStudentId(s.id); setRemoveSearch(`${s.surname} ${s.name}`); setShowRemoveDropdown(false); }}
                      style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0', fontSize: '13px' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#e3f2fd'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#fff'}
                    >
                      <div style={{ fontWeight: 'bold' }}>{s.surname} {s.name} {s.patronymic}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {removeStudentId > 0 && (
              <div style={{ marginTop: '12px', background: '#fff3e0', padding: '8px 12px', borderRadius: '6px', border: '1px solid #FF9800', fontSize: '14px' }}>
                Выбран: <strong>{(() => { const s = getStudentById(removeStudentId); return s ? `${s.surname} ${s.name} ${s.patronymic}` : ''; })()}</strong>
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => { setShowRemoveModal(false); setRemoveViolation(null); setRemoveStudentId(0); setRemoveSearch(''); }}
                style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: '4px' }}>Отмена</button>
              <button onClick={handleRemoveViolationFromStudent} disabled={!removeStudentId}
                style={{ ...btnStyle('#FF9800'), opacity: !removeStudentId ? 0.5 : 1, cursor: !removeStudentId ? 'not-allowed' : 'pointer' }}>
                Снять нарушение
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const btnStyle = (color: string): React.CSSProperties => ({
  background: color, color: 'white', border: 'none',
  padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '14px',
});

const btnSmall = (color: string): React.CSSProperties => ({
  background: color, color: 'white', border: 'none',
  padding: '5px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '14px',
});

const pageBtn = (isActive: boolean, isDisabled: boolean): React.CSSProperties => ({
  minWidth: '36px', height: '36px', padding: '4px 8px', borderRadius: '6px',
  border: isActive ? '2px solid #1976D2' : '1px solid #ddd',
  background: isActive ? '#1976D2' : '#fff',
  color: isActive ? '#fff' : isDisabled ? '#bbb' : '#333',
  cursor: isDisabled ? 'not-allowed' : 'pointer',
  fontSize: '14px', fontWeight: isActive ? 'bold' : 'normal',
  opacity: isDisabled ? 0.5 : 1,
});

const thStyle: React.CSSProperties = {
  padding: '10px 12px', textAlign: 'center', fontWeight: 'bold',
  fontSize: '15px', verticalAlign: 'middle',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 12px', fontSize: '15px', verticalAlign: 'middle',
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
  background: 'white', borderRadius: '8px',
  padding: '24px', width: '460px', maxHeight: '90vh', overflowY: 'auto',
};

export default ViolationsPage;