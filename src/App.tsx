import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import StudentsPage from './pages/StudentsPage';
import DormitoriesPage from './pages/DormitoriesPage';
import ViolationsPage from './pages/ViolationsPage';
import RoomPage from './pages/RoomPage';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
        {/* Навигация */}
        <nav style={{
          background: '#1565C0',
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '0',
        }}>
          <span style={{
            color: 'white', fontWeight: 'bold',
            marginRight: '20px', fontSize: '18px',
          }}>
            ИИС Студенческого городка
          </span>
          {[
            { to: '/students', label: 'Студенты' },
            { to: '/dormitories', label: 'Общежития' },
            { to: '/violations', label: 'Нарушения' },
          ].map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              style={({ isActive }) => ({
                color: 'white',
                textDecoration: 'none',
                padding: '16px 20px',
                display: 'block',
                background: isActive ? 'rgba(255,255,255,0.2)' : 'transparent',
                borderBottom: isActive ? '3px solid white' : '3px solid transparent',
              })}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* Контент */}
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <Routes>
            <Route path="/" element={<StudentsPage />} />
            <Route path="/students" element={<StudentsPage />} />
            <Route path="/dormitories" element={<DormitoriesPage />} />
            <Route path="/violations" element={<ViolationsPage />} />
            <Route path="/room/:roomId" element={<RoomPage />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
};

export default App;