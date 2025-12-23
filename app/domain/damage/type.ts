interface DamageValue {
  value: number;
  percent: number;
}

export interface DamageResult {
  min: DamageValue;
  normal: DamageValue;
  critical: DamageValue;
  affinity: DamageValue;
}
