import React from 'react';
import { AlertTriangle, AlertCircle, CheckCircle2, Shield } from 'lucide-react';

const RiskBadge = ({ level = 'Low', size = 'sm', showIcon = true }) => {
  const normLevel = (level || 'Low').toLowerCase();

  const config = {
    high: {
      bg: 'bg-red-50 text-red-700 border-red-200',
      icon: AlertTriangle,
      label: 'High Risk',
    },
    medium: {
      bg: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: AlertCircle,
      label: 'Medium Risk',
    },
    low: {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: CheckCircle2,
      label: 'Low Risk',
    },
    none: {
      bg: 'bg-slate-50 text-slate-600 border-slate-200',
      icon: Shield,
      label: 'Standard',
    },
  };

  const current = config[normLevel] || config.low;
  const IconComponent = current.icon;

  const sizeClasses = {
    xs: 'text-xs px-2 py-0.5',
    sm: 'text-xs px-2.5 py-1',
    md: 'text-sm px-3 py-1.5 font-medium',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold ${current.bg} ${sizeClasses[size] || sizeClasses.sm}`}
    >
      {showIcon && <IconComponent className="w-3.5 h-3.5 shrink-0" />}
      {level}
    </span>
  );
};

export default RiskBadge;
