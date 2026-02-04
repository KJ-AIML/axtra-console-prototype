
import type { ReactNode } from 'react';

export interface NavItem {
  id: string;
  label: string;
  icon: ReactNode;
  isAlpha?: boolean;
}

export interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  isFirst?: boolean;
}

export interface TabItem {
  id: string;
  label: string;
}

export interface ScenarioItemProps {
  title: string;
  diff: 'Easy' | 'Medium' | 'Hard';
  duration: string;
  type: string;
}

