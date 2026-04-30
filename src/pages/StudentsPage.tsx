import React, { useEffect, useState, useCallback } from 'react';

import {
  getStudents, deleteStudent, filterStudents,
  evictStudent, addViolationToStudent,
  searchStudentsByFio,
} from '../api/students';

import { getRooms } from '../api/rooms';
import { getDormitories } from '../api/dormitories';
import { getViolations } from '../api/violations';
import { getContracts } from '../api/contracts';

import {
  Student, Room, Dormitory, Violation,
  Contract, ViolationType, PageResponse
} from '../types';

import StudentModal from '../components/StudentModal';
import AssignRoomModal from '../components/AssignRoomModal';
import { useNavigate, useSearchParams } from 'react-router-dom';

const VIOLATION_LABELS: Record<string, string> = {
  SMOKING: 'Курение',
  DRINKING: 'Распитие алкоголя',
  NOISE: 'Шум',
  MESS: 'Беспорядок',
  DAMAGE: 'Порча имущества',
};

const VIOLATION_TYPES = Object.keys(VIOLATION_LABELS) as ViolationType[];

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}.${month}.${year}`;
};

const StudentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [studentsPage, setStudentsPage] = useState<PageResponse<Student> | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [dormitories, setDormitories] = useState<Dormitory[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [page, setPage] = useState(0);
  const pageSize = 10;
  const [pageInput, setPageInput] = useState('');

  const [filterFio, setFilterFio] = useState('');
  const [isFioSearch, setIsFioSearch] = useState(false);

  const [filterAge, setFilterAge] = useState('');
  const [filterChs, setFilterChs] = useState('');
  const [filterHasViolation, setFilterHasViolation] = useState<'YES' | 'NO' | ''>('');
  const [filterViolation, setFilterViolation] = useState<ViolationType | ''>('');
  const [filterDormitory, setFilterDormitory] = useState('');
  const [filterRoom, setFilterRoom] = useState('');

  const [ageError, setAgeError] = useState('');
  const [chsError, setChsError] = useState('');

  const [isFiltering, setIsFiltering] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    age: '',
    chs: '',
    hasViolation: '' as 'YES' | 'NO' | '',
    violation: '' as ViolationType | '',
    dormitory: '',
    room: '',
  });

  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [highlightedStudentId, setHighlightedStudentId] = useState<number | null>(null);
  const [pendingStudentId, setPendingStudentId] = useState<number | null>(null);

  const [showStudentViolationsModal, setShowStudentViolationsModal] = useState(false);
  const [viewingViolationsStudent, setViewingViolationsStudent] = useState<Student | null>(null);

  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showViolationModal, setShowViolationModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);

  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [assigningStudent, setAssigningStudent] = useState<Student | null>(null);
  const [violationStudent, setViolationStudent] = useState<Student | null>(null);
  const [contractStudent, setContractStudent] = useState<Student | null>(null);

  const [selectedViolationId, setSelectedViolationId] = useState<number>(0);
  const [studentContract, setStudentContract] = useState<Contract | null>(null);
  const [contractLoading, setContractLoading] = useState(false);

  const hasOtherFilters = !!(filterAge || filterChs || filterHasViolation ||
    filterViolation || filterDormitory || filterRoom);
  const hasFioFilter = !!filterFio.trim();

  const loadStudents = useCallback(async (p: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await getStudents(p, pageSize);
      setStudentsPage(res.data);
    } catch {
      setError('Ошибка загрузки студентов');
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  const toHasViolationsBool = (val: 'YES' | 'NO' | ''): boolean | undefined => {
    if (val === 'YES') return true;
    if (val === 'NO') return false;
    return undefined;
  };

  const loadFiltered = useCallback(async (p: number, filters: typeof activeFilters) => {
    setLoading(true);
    setError('');
    try {
      const res = await filterStudents(
        filters.chs ? Number(filters.chs) : undefined,
        toHasViolationsBool(filters.hasViolation),
        filters.violation ? filters.violation : undefined,
        filters.age ? Number(filters.age) : undefined,
        filters.dormitory ? Number(filters.dormitory) : undefined,
        filters.room ? Number(filters.room) : undefined,
        p, pageSize
      );
      setStudentsPage(res.data);
    } catch {
      setError('Ошибка фильтрации');
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  const loadByFio = useCallback(async (p: number, fio: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await searchStudentsByFio(fio, p, pageSize);
      setStudentsPage(res.data);
    } catch {
      setError('Ошибка поиска по ФИО');
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  const loadAll = useCallback(async () => {
    try {
      const [rRes, dRes, vRes] = await Promise.all([
        getRooms(),
        getDormitories(),
        getViolations(),
      ]);
      setRooms(rRes.data);
      setDormitories(dRes.data);
      setViolations(vRes.data);
    } catch {
      console.error('Ошибка загрузки справочников');
    }
  }, []);

  useEffect(() => {
    if (isFioSearch) loadByFio(page, filterFio);
    else if (isFiltering) loadFiltered(page, activeFilters);
    else loadStudents(page);
  }, [page]);

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    try {
      const studentIdParam = searchParams.get('studentId');
      if (!studentIdParam) return;
      const targetId = Number(studentIdParam);
      if (!targetId || isNaN(targetId)) return;
      setSearchParams({}, { replace: true });
      setIsFioSearch(false);
      setIsFiltering(false);
      setActiveFilters({
        age: '', chs: '', hasViolation: '',
        violation: '', dormitory: '', room: '',
      });
      setFilterFio(''); setFilterAge(''); setFilterChs(''); setFilterHasViolation('');
      setFilterViolation(''); setFilterRoom(''); setFilterDormitory('');
      setPendingStudentId(targetId);
    } catch (err) { console.error('Ошибка:', err); }
  }, []);

  useEffect(() => {
    try {
      if (!pendingStudentId) return;
      if (loading) return;
      const currentStudents = studentsPage?.content ?? [];
      const found = currentStudents.find(s => s.id === pendingStudentId);
      if (found) {
        setHighlightedStudentId(pendingStudentId);
        setPendingStudentId(null);
        setTimeout(() => {
          const el = document.getElementById(`student-row-${pendingStudentId}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
        setTimeout(() => setHighlightedStudentId(null), 4000);
      } else {
        const savedId = pendingStudentId;
        setPendingStudentId(null);
        const findOnAllPages = async () => {
          try {
            const allRes = await getStudents(0, 10000);
            const allStudents: Student[] = allRes.data.content;
            const index = allStudents.findIndex(s => s.id === savedId);
            if (index === -1) return;
            const targetPage = Math.floor(index / pageSize);
            const pageRes = await getStudents(targetPage, pageSize);
            setStudentsPage(pageRes.data);
            setPage(targetPage);
            setHighlightedStudentId(savedId);
            setTimeout(() => {
              const el = document.getElementById(`student-row-${savedId}`);
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 400);
            setTimeout(() => setHighlightedStudentId(null), 4000);
          } catch (err) { console.error('Ошибка поиска студента:', err); }
        };
        findOnAllPages();
      }
    } catch (err) {
      console.error('Ошибка:', err);
      setPendingStudentId(null);
    }
  }, [pendingStudentId, loading]);

  const goToPage = (p: number) => {
    setPage(p);
    setPageInput('');
    if (isFioSearch) loadByFio(p, filterFio);
    else if (isFiltering) loadFiltered(p, activeFilters);
    else loadStudents(p);
  };

  const handlePageInputGo = () => {
    const val = Number(pageInput) - 1;
    if (val >= 0 && val < totalPages) goToPage(val);
  };

  const isPageInputValid = () => {
    if (!pageInput) return false;
    const val = Number(pageInput);
    return val >= 1 && val <= totalPages;
  };

  const availableRooms = filterDormitory
    ? rooms.filter(r => {
        const dorm = dormitories.find(d => d.id === Number(filterDormitory));
        return dorm?.rooms?.some(dr => dr.id === r.id);
      })
    : [];

  const handleDormitoryChange = (dormId: string) => {
    setFilterDormitory(dormId);
    setFilterRoom('');
  };
  const handleRoomChange = (roomId: string) => setFilterRoom(roomId);
  const handleHasViolationChange = (val: 'YES' | 'NO' | '') => {
    setFilterHasViolation(val);
    if (val !== 'YES') setFilterViolation('');
  };
  const handleAgeChange = (val: string) => {
    setFilterAge(val);
    setAgeError(val && Number(val) < 17 ? 'Студенты не такие уж и маленькие!' : '');
  };
  const handleChsChange = (val: string) => {
    setFilterChs(val);
    setChsError(val && Number(val) < 0 ? 'Часы ОПТ не могут быть отрицательными!' : '');
  };

  const handleFilter = async () => {
    if (hasFioFilter) {
      setIsFioSearch(true);
      setIsFiltering(false);
      setPage(0);
      await loadByFio(0, filterFio.trim());
      return;
    }

    if (ageError || chsError) return;

    const filters = {
      age: filterAge, chs: filterChs,
      hasViolation: filterHasViolation, violation: filterViolation,
      dormitory: filterDormitory, room: filterRoom,
    };
    const hasFilters = filters.age || filters.chs || filters.hasViolation ||
      filters.violation || filters.dormitory || filters.room;

    if (!hasFilters) {
      setIsFiltering(false);
      setIsFioSearch(false);
      setActiveFilters({
        age: '', chs: '', hasViolation: '',
        violation: '', dormitory: '', room: '',
      });
      setPage(0);
      loadStudents(0);
      return;
    }

    setIsFiltering(true);
    setIsFioSearch(false);
    setActiveFilters(filters);
    setPage(0);
    await loadFiltered(0, filters);
  };

  const handleClearFilter = () => {
    setFilterFio('');
    setFilterAge(''); setFilterChs(''); setFilterHasViolation('');
    setFilterViolation(''); setFilterRoom(''); setFilterDormitory('');
    setAgeError(''); setChsError('');
    setIsFiltering(false);
    setIsFioSearch(false);
    setActiveFilters({
      age: '', chs: '', hasViolation: '',
      violation: '', dormitory: '', room: '',
    });
    setPage(0);
    loadStudents(0);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Удалить студента?')) return;
    try {
      await deleteStudent(id);
      setOpenMenuId(null);
      if (isFioSearch) loadByFio(page, filterFio);
      else if (isFiltering) loadFiltered(page, activeFilters);
      else loadStudents(page);
      loadAll();
    } catch { setError('Ошибка удаления'); }
  };

  const handleEvict = async (id: number) => {
    if (!window.confirm('Выселить студента?')) return;
    try {
      await evictStudent(id);
      setOpenMenuId(null);
      if (isFioSearch) loadByFio(page, filterFio);
      else if (isFiltering) loadFiltered(page, activeFilters);
      else loadStudents(page);
      loadAll();
    } catch { setError('Ошибка выселения'); }
  };

  const handleAddViolation = async () => {
    if (!violationStudent || !selectedViolationId) return;
    try {
      await addViolationToStudent(violationStudent.id, selectedViolationId);
      setShowViolationModal(false);
      if (isFioSearch) loadByFio(page, filterFio);
      else if (isFiltering) loadFiltered(page, activeFilters);
      else loadStudents(page);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Ошибка добавления нарушения');
    }
  };

  const openContractModal = async (student: Student) => {
    setContractStudent(student);
    setStudentContract(null);
    setShowContractModal(true);
    setContractLoading(true);
    try {
      const res = await getContracts();
      setStudentContract(res.data.find(c => c.student?.id === student.id) || null);
    } catch { setError('Ошибка загрузки договора'); }
    finally { setContractLoading(false); }
  };

  const students = studentsPage?.content ?? [];
  const totalPages = studentsPage?.page.totalPages ?? 1;

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

  return (
    <div style={{ padding: '8px 20px 20px 20px', position: 'relative' }}>

      {/* Кнопка добавить */}
      <button
        onClick={() => { setEditingStudent(null); setShowStudentModal(true); }}
        style={{
          background: '#4CAF50',
          color: 'white',
          border: 'none',
          padding: '14px 32px',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '17px',
          fontWeight: 'bold',
          position: 'absolute',
          top: '8px',
          right: '20px',
        }}
      >
        + Добавить студента
      </button>

      {/* Заголовок и подпись */}
      <div style={{ paddingRight: '290px', marginBottom: '4px' }}>
        <h1 style={{ margin: '0 0 6px 0', fontSize: '22px', lineHeight: 1.2 }}>
          Студенты
        </h1>
        <p style={{ color: '#666', fontSize: '13px', margin: '0 0 6px 0', lineHeight: 1.2 }}>
          Поиск студентов по фильтрам:
        </p>
      </div>

      {/* ===== ФИЛЬТРЫ ===== */}
      <div style={{
        background: '#f5f5f5',
        padding: '6px 10px 0 10px',
        borderRadius: '8px',
        marginBottom: '4px',
        display: 'flex',
        gap: '6px',
        alignItems: 'flex-end',
        justifyContent: 'center',
        flexWrap: 'nowrap',
      }}>

        {/* ФИО */}
        <div style={{ marginBottom: '8px', minWidth: 0 }}>
          <label style={{
            ...labelStyle,
            color: hasOtherFilters ? '#aaa' : '#333',
          }}>ФИО:</label>
          <input
            type="text"
            value={filterFio}
            onChange={e => setFilterFio(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !hasOtherFilters) handleFilter(); }}
            disabled={hasOtherFilters}
            style={{
              ...inputStyle,
              width: '150px',
              background: hasOtherFilters ? '#eee' : '#fff',
              color: hasOtherFilters ? '#aaa' : '#333',
              cursor: hasOtherFilters ? 'not-allowed' : 'text',
            }}
          />
        </div>

        {/* Разделитель */}
        <div style={{ marginBottom: '8px', width: '1px', height: '38px', background: '#ccc', flexShrink: 0 }} />

        {/* Возраст */}
        <div style={{ marginBottom: '8px', minWidth: 0 }}>
          <label style={{ ...labelStyle, color: hasFioFilter ? '#aaa' : '#333' }}>Возраст:</label>
          <input
            type="number" min={17} value={filterAge}
            onChange={e => handleAgeChange(e.target.value)}
            disabled={hasFioFilter}
            style={{
              ...inputStyle,
              width: '70px',
              border: ageError ? '1px solid red' : '1px solid #ccc',
              background: hasFioFilter ? '#eee' : '#fff',
              color: hasFioFilter ? '#aaa' : '#333',
              cursor: hasFioFilter ? 'not-allowed' : 'text',
            }}
          />
          {ageError && (
            <div style={{ color: 'red', fontSize: '10px', marginTop: '2px', width: '70px' }}>
              {ageError}
            </div>
          )}
        </div>

        {/* Часы ОПТ */}
        <div style={{ marginBottom: '8px', minWidth: 0 }}>
          <label style={{ ...labelStyle, color: hasFioFilter ? '#aaa' : '#333' }}>ОПТ:</label>
          <input
            type="number" min={0} value={filterChs}
            onChange={e => handleChsChange(e.target.value)}
            disabled={hasFioFilter}
            style={{
              ...inputStyle,
              width: '70px',
              border: chsError ? '1px solid red' : '1px solid #ccc',
              background: hasFioFilter ? '#eee' : '#fff',
              color: hasFioFilter ? '#aaa' : '#333',
              cursor: hasFioFilter ? 'not-allowed' : 'text',
            }}
          />
          {chsError && (
            <div style={{ color: 'red', fontSize: '10px', marginTop: '2px', width: '70px' }}>
              {chsError}
            </div>
          )}
        </div>

        {/* Общежитие */}
        <div style={{ marginBottom: '8px', minWidth: 0 }}>
          <label style={{ ...labelStyle, color: hasFioFilter ? '#aaa' : '#333' }}>Общежитие:</label>
          <select
            value={filterDormitory}
            onChange={e => handleDormitoryChange(e.target.value)}
            disabled={hasFioFilter}
            style={{
              ...selectStyle,
              background: hasFioFilter ? '#eee' : '#fff',
              color: hasFioFilter ? '#aaa' : '#333',
              cursor: hasFioFilter ? 'not-allowed' : 'pointer',
            }}
          >
            <option value="">Все</option>
            {dormitories.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        {/* Комната */}
        <div style={{ marginBottom: '8px', minWidth: 0 }}>
          <label style={{
            ...labelStyle,
            color: (hasFioFilter || !filterDormitory) ? '#aaa' : '#333',
          }}>Комната:</label>
          <select
            value={filterRoom}
            onChange={e => handleRoomChange(e.target.value)}
            disabled={hasFioFilter || !filterDormitory}
            style={{
              ...selectStyle,
              background: (hasFioFilter || !filterDormitory) ? '#eee' : '#fff',
              color: (hasFioFilter || !filterDormitory) ? '#aaa' : '#333',
              cursor: (hasFioFilter || !filterDormitory) ? 'not-allowed' : 'pointer',
            }}
          >
            <option value="">Все</option>
            {availableRooms.map(r => (
              <option key={r.id} value={r.id}>№{r.number}</option>
            ))}
          </select>
        </div>

        {/* Нарушения */}
        <div style={{ marginBottom: '8px', minWidth: 0 }}>
          <label style={{ ...labelStyle, color: hasFioFilter ? '#aaa' : '#333' }}>Нарушения:</label>
          <select
            value={filterHasViolation}
            onChange={e => handleHasViolationChange(e.target.value as 'YES' | 'NO' | '')}
            disabled={hasFioFilter}
            style={{
              ...selectStyle,
              minWidth: '100px',
              background: hasFioFilter ? '#eee' : '#fff',
              color: hasFioFilter ? '#aaa' : '#333',
              cursor: hasFioFilter ? 'not-allowed' : 'pointer',
            }}
          >
            <option value="">Неважно</option>
            <option value="YES">Да</option>
            <option value="NO">Нет</option>
          </select>
        </div>

                {/* Тип нарушения */}
        <div style={{ marginBottom: '8px', minWidth: 0 }}>
          <label style={{
            ...labelStyle,
            color: (hasFioFilter || filterHasViolation !== 'YES') ? '#aaa' : '#333',
          }}>Тип:</label>
          <select
            value={filterViolation}
            onChange={e => setFilterViolation(e.target.value as ViolationType | '')}
            disabled={hasFioFilter || filterHasViolation !== 'YES'}
            style={{
              ...selectStyle,
              minWidth: '120px',
              background: (hasFioFilter || filterHasViolation !== 'YES') ? '#eee' : '#fff',
              color: (hasFioFilter || filterHasViolation !== 'YES') ? '#aaa' : '#333',
              cursor: (hasFioFilter || filterHasViolation !== 'YES') ? 'not-allowed' : 'pointer',
            }}
          >
            <option value="">Любое</option>
            {VIOLATION_TYPES.map(v => (
              <option key={v} value={v}>{VIOLATION_LABELS[v]}</option>
            ))}
          </select>
        </div>

        {/* Кнопки Поиск / Сбросить */}
        <div style={{
          marginBottom: '8px',
          display: 'flex',
          gap: '6px',
          alignItems: 'center',
          flexShrink: 0,
        }}>
          <button
            onClick={handleFilter}
            disabled={!!ageError || !!chsError}
            style={{
              background: '#2196F3',
              color: 'white',
              border: 'none',
              height: '38px',
              padding: '0 20px',
              borderRadius: '6px',
              cursor: ageError || chsError ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              opacity: ageError || chsError ? 0.5 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            Поиск
          </button>
          <button
            onClick={handleClearFilter}
            style={{
              background: '#9E9E9E',
              color: 'white',
              border: 'none',
              height: '38px',
              padding: '0 14px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              whiteSpace: 'nowrap',
            }}
          >
            Сбросить
          </button>
          {(isFiltering || isFioSearch) && (
            <span style={{
              background: '#E3F2FD',
              color: '#1565C0',
              padding: '4px 8px',
              borderRadius: '12px',
              fontSize: '11px',
              whiteSpace: 'nowrap',
            }}>
              {isFioSearch ? 'ФИО' : 'Фильтры'}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div style={{ color: 'red', padding: '6px 0', marginBottom: '6px' }}>{error}</div>
      )}

      {loading ? <p>Загрузка...</p> : (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#e0e0e0' }}>
                <th style={thStyle}>
                  <span style={{ position: 'relative', left: '10px' }}>ФИО</span>
                </th>
                <th style={thStyle}>Телефон</th>
                <th style={thStyle}>Возраст</th>
                <th style={thStyle}>ОПТ (ч.)</th>
                <th style={thStyle}>Общежитие</th>
                <th style={thStyle}>Комната</th>
                <th style={thStyle}>Нарушения</th>
                <th style={thStyle}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {students.map(student => (
                <tr
                  key={student.id}
                  id={`student-row-${student.id}`}
                  style={{
                    borderBottom: '1px solid #eee',
                    background: highlightedStudentId === student.id
                      ? '#e3f2fd' : 'transparent',
                    boxShadow: highlightedStudentId === student.id
                      ? 'inset 0 0 0 2px #1976D2' : 'none',
                    transition: 'all 0.5s ease',
                  }}
                >
                  <td style={tdStyle}>
                    <span style={{ position: 'relative', left: '10px' }}>
                      {student.surname} {student.name} {student.patronymic}
                    </span>
                  </td>
                  <td style={tdStyle}>{student.phoneNumber}</td>
                  <td style={tdStyle}>{student.age}</td>
                  <td style={tdStyle}>{student.chs ?? 0}</td>

                  <td style={tdStyle}>
                    {student.dormitoryId ? (() => {
                      const dorm = dormitories.find(d => d.id === student.dormitoryId);
                      return dorm
                        ? (
                          <span
                            style={{ color: '#283593', fontWeight: 'bold', cursor: 'pointer' }}
                            onClick={() => navigate(`/dormitories?expandDorm=${dorm.id}`)}
                          >
                            {dorm.name}
                          </span>
                        )
                        : <span style={{ color: '#999' }}>#{student.dormitoryId}</span>;
                    })() : <span style={{ color: '#999' }}>—</span>}
                  </td>

                  <td style={tdStyle}>
                    {student.roomNumber
                      ? (
                        <span
                          style={{ color: '#1565C0', cursor: 'pointer', fontSize: '15px' }}
                          onClick={() => {
                            const r = rooms.find(r => r.number === student.roomNumber);
                            if (r) navigate(`/room/${r.id}`);
                          }}
                        >
                          {student.roomNumber}
                        </span>
                      )
                      : <span style={{ color: '#999' }}>Не заселён</span>}
                  </td>

                  <td style={{ ...tdStyle, position: 'relative' }}>
                    {student.violationIds?.length > 0 ? (
                      <span
                        style={{
                          color: '#c62828', fontSize: '15px', cursor: 'pointer',
                          position: 'relative', display: 'inline-block', fontWeight: 'bold',
                        }}
                        onClick={() => {
                          setViewingViolationsStudent(student);
                          setShowStudentViolationsModal(true);
                        }}
                        onMouseEnter={e => {
                          const t = e.currentTarget.querySelector('.tooltip') as HTMLElement;
                          if (t) t.style.display = 'block';
                        }}
                        onMouseLeave={e => {
                          const t = e.currentTarget.querySelector('.tooltip') as HTMLElement;
                          if (t) t.style.display = 'none';
                        }}
                      >
                        {student.violationIds.length}
                        <div className="tooltip" style={{
                          display: 'none', position: 'absolute',
                          bottom: '130%', left: '50%', transform: 'translateX(-50%)',
                          background: '#333', color: '#fff',
                          padding: '8px 12px', borderRadius: '6px',
                          fontSize: '12px', whiteSpace: 'nowrap',
                          zIndex: 999, boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                          pointerEvents: 'none', minWidth: '180px',
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
                      <span style={{ color: '#4CAF50', fontSize: '15px' }}>0</span>
                    )}
                  </td>

                  <td style={tdStyle}>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <button
                        onClick={() => setOpenMenuId(openMenuId === student.id ? null : student.id)}
                        style={{
                          background: 'none', border: '1px solid #ddd',
                          borderRadius: '6px', fontSize: '20px',
                          cursor: 'pointer', padding: '2px 10px',
                          color: '#555', lineHeight: 1.4,
                        }}
                      >
                        ⋮
                      </button>

                      {openMenuId === student.id && (() => {
                        const studentIndex = students.indexOf(student);
                        const isNearBottom = studentIndex >= students.length - 4;
                        return (
                          <>
                            <div
                              style={{
                                position: 'fixed', top: 0, left: 0,
                                right: 0, bottom: 0, zIndex: 100,
                              }}
                              onClick={() => setOpenMenuId(null)}
                            />
                            <div style={{
                              position: 'absolute',
                              right: 0,
                              ...(isNearBottom
                                ? { bottom: '100%', marginBottom: '4px' }
                                : { top: '100%', marginTop: '0px' }
                              ),
                              background: '#fff', border: '1px solid #ddd',
                              borderRadius: '8px',
                              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
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
                                {student.roomNumber ? 'Перезаселить' : 'Заселить'}
                              </div>
                              {student.roomNumber && (
                                <div style={menuItemStyle} onClick={() => handleEvict(student.id)}>
                                  Выселить
                                </div>
                              )}
                              <div style={menuItemStyle} onClick={() => {
                                setOpenMenuId(null);
                                navigate(`/violations?prefillStudentId=${student.id}`);
                              }}>
                                Зафиксировать нарушение
                              </div>
                              <div style={menuItemStyle} onClick={() => {
                                setOpenMenuId(null);
                                navigate(`/violations?attachStudentId=${student.id}`);
                              }}>
                                Привязать к нарушению
                              </div>
                              <div style={menuItemStyle} onClick={() => {
                                openContractModal(student);
                                setOpenMenuId(null);
                              }}>
                                Договор
                              </div>
                              <div
                                style={{ ...menuItemStyle, color: '#c62828', borderBottom: 'none' }}
                                onClick={() => handleDelete(student.id)}
                              >
                                Удалить
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                    Студенты не найдены
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div style={{
              display: 'flex', gap: '4px', marginTop: '15px',
              alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap',
            }}>
              <button
                onClick={() => goToPage(Math.max(0, page - 1))}
                disabled={page === 0}
                style={pageBtn(false, page === 0)}
              >«</button>
              {getPageNumbers().map((p, idx) =>
                typeof p === 'string'
                  ? (
                    <span
                      key={`dots-${idx}`}
                      style={{
                        padding: '6px 4px', color: '#999',
                        fontSize: '14px', userSelect: 'none',
                      }}
                    >
                      …
                    </span>
                  )
                  : (
                    <button
                      key={p}
                      onClick={() => goToPage(p)}
                      style={pageBtn(p === page, false)}
                    >
                      {p + 1}
                    </button>
                  )
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
                onKeyDown={e => {
                  if (e.key === 'Enter' && isPageInputValid()) handlePageInputGo();
                }}
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
                title="Перейти"
              >»</button>
              <span style={{ fontSize: '13px', color: '#666' }}>из {totalPages}</span>
            </div>
          )}
        </>
      )}

      {/* ===== МОДАЛКИ ===== */}
      {showStudentModal && (
        <StudentModal
          student={editingStudent}
          rooms={rooms}
          dormitories={dormitories}
          onClose={() => setShowStudentModal(false)}
          onSave={() => {
            setShowStudentModal(false);
            if (isFioSearch) loadByFio(page, filterFio);
            else if (isFiltering) loadFiltered(page, activeFilters);
            else loadStudents(page);
            loadAll();
          }}
        />
      )}

      {showAssignModal && assigningStudent && (
        <AssignRoomModal
          student={assigningStudent}
          rooms={rooms}
          dormitories={dormitories}
          onClose={() => setShowAssignModal(false)}
          onSave={() => {
            setShowAssignModal(false);
            if (isFioSearch) loadByFio(page, filterFio);
            else if (isFiltering) loadFiltered(page, activeFilters);
            else loadStudents(page);
            loadAll();
          }}
        />
      )}

      {showViolationModal && violationStudent && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3>Добавить нарушение</h3>
            <p>
              Студент: <strong>
                {violationStudent.surname} {violationStudent.name} {violationStudent.patronymic}
              </strong>
            </p>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px' }}>
                Выберите нарушение:
              </label>
              <select
                value={selectedViolationId}
                onChange={e => setSelectedViolationId(Number(e.target.value))}
                style={{
                  width: '100%', padding: '8px',
                  borderRadius: '4px', border: '1px solid #ccc',
                }}
              >
                <option value={0}>-- Выберите --</option>
                {violations.map(v => (
                  <option key={v.id} value={v.id}>
                    {VIOLATION_LABELS[v.violationType] || v.violationType} — {formatDate(v.date)}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowViolationModal(false)}
                style={{ padding: '8px 16px', cursor: 'pointer' }}
              >
                Отмена
              </button>
              <button
                onClick={handleAddViolation}
                disabled={!selectedViolationId}
                style={btnStyle('#f44336')}
              >
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}

      {showContractModal && contractStudent && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3>Договор студента</h3>
            <p>
              Студент: <strong>
                {contractStudent.surname} {contractStudent.name} {contractStudent.patronymic}
              </strong>
            </p>
            {contractLoading ? (
              <p>Загрузка...</p>
            ) : studentContract ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {[
                    ['Номер договора', studentContract.number],
                    ['Дата начала', formatDate(studentContract.startDate)],
                    ['Дата окончания', formatDate(studentContract.endDate)],
                  ].map(([label, value]) => (
                    <tr key={String(label)} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '8px', fontWeight: 'bold' }}>{label}:</td>
                      <td style={{ padding: '8px' }}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ color: '#999' }}>Договор не найден</p>
            )}
            <div style={{ marginTop: '16px', textAlign: 'right' }}>
              <button
                onClick={() => setShowContractModal(false)}
                style={{ padding: '8px 16px', cursor: 'pointer' }}
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {showStudentViolationsModal && viewingViolationsStudent && (
        <div style={overlayStyle} onClick={() => setShowStudentViolationsModal(false)}>
          <div style={{ ...modalStyle, width: '480px' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>
              Нарушения: {viewingViolationsStudent.surname} {viewingViolationsStudent.name}
            </h3>
            {(() => {
              const sv = violations.filter(v =>
                viewingViolationsStudent.violationIds?.includes(v.id)
              );
              return sv.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {sv.map(v => (
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
  padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px',
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

const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: '3px', fontSize: '13px',
};

const inputStyle: React.CSSProperties = {
  padding: '8px',
  height: '38px',
  boxSizing: 'border-box' as const,
  borderRadius: '6px',
  border: '1px solid #ccc',
  width: '130px',
  fontSize: '14px',
};

const selectStyle: React.CSSProperties = {
  padding: '8px',
  height: '38px',
  boxSizing: 'border-box' as const,
  borderRadius: '6px',
  border: '1px solid #ccc',
  fontSize: '14px',
};

const thStyle: React.CSSProperties = {
  padding: '8px', textAlign: 'center',
  fontWeight: 'bold', verticalAlign: 'middle',
};

const tdStyle: React.CSSProperties = {
  padding: '8px', textAlign: 'center', verticalAlign: 'middle',
};

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
  padding: '24px', width: '420px', maxHeight: '90vh', overflowY: 'auto',
};

export default StudentsPage;