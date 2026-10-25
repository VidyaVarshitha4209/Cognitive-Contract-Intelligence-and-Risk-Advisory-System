import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/layout/Layout';

// Pages
import Dashboard from './pages/Dashboard';
import Contracts from './pages/Contracts';
import ContractDetails from './pages/ContractDetails';
import UploadContract from './pages/UploadContract';
import RiskAnalysis from './pages/RiskAnalysis';
import CompanyPolicies from './pages/CompanyPolicies';
import ContractComparison from './pages/ContractComparison';
import AIChatbot from './pages/AIChatbot';
import Reports from './pages/Reports';
import AnalysisHistory from './pages/AnalysisHistory';
import Settings from './pages/Settings';
import Login from './pages/Login';

function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Route */}
          <Route path="/login" element={<Login />} />

          {/* Main App Layout */}
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="contracts" element={<Contracts />} />
            <Route path="contracts/:id" element={<ContractDetails />} />
            <Route path="upload" element={<UploadContract />} />
            <Route path="risks" element={<RiskAnalysis />} />
            <Route path="policies" element={<CompanyPolicies />} />
            <Route path="compare" element={<ContractComparison />} />
            <Route path="chat" element={<AIChatbot />} />
            <Route path="reports" element={<Reports />} />
            <Route path="history" element={<AnalysisHistory />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
