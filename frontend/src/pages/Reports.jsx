import React from 'react';
import { useSearchParams } from 'react-router-dom';
import ReportView from '../components/report/ReportView';

// Reports page (sidebar -> Reports): choose any contract and view its 12-section report.
const Reports = () => {
  const [params, setParams] = useSearchParams();
  const id = params.get('contractId') || '';
  return <ReportView contractId={id} onSelect={(v) => setParams({ contractId: v }, { replace: true })} />;
};

export default Reports;
