interface DamageValue {
  value: number;
  percent: number;
}

export interface DamageResult {
  min: DamageValue;
  normal: DamageValue;
  critical: DamageValue;
  affinity: DamageValue;
  averageBreakdown?: {
    normal: number;
    abrasion: number;
    affinity: number;
    critical: number;
  };
}

export interface AverageDamageBreakdown {
  normal: number;
  abrasion: number;
  affinity: number;
  critical: number;
}

export interface FinalStatRow {
  label: string;
  value: string;
  highlight?: boolean;
  /** Keys passed to DamageContext.get/explain for backprop display (e.g. Min/Max). */
  ctxKeys?: string[];
}

export interface FinalStatSection {
  title: string;
  rows: FinalStatRow[];
}

export interface SkillDamageResult {
  total: DamageResult;
  perHit: DamageResult[];
}
