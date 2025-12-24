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
