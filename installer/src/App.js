import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import InstallPage from './InstallPage';
import AnalyticsDashboard from './AnalyticsDashboard';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/install" replace />} />
      <Route path="/install" element={<InstallPage />} />
      <Route path="/analytics" element={<AnalyticsDashboard />} />
      <Route path="*" element={<Navigate to="/install" replace />} />
    </Routes>
  );
}

export default App;