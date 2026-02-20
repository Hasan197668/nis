
import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Substitute from './pages/Substitute';
import Settings from './pages/Settings';
import Schedule from './pages/Schedule';

const App: React.FC = () => {
  return (
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<Schedule />} />
        <Route path="/substitute" element={<Substitute />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </MemoryRouter>
  );
};

export default App;
