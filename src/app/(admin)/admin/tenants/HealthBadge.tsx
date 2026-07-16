import React from 'react';
import { Badge } from '@rs/ui';
import type { BadgeVariant } from '@rs/ui';

export type HealthBand = 'healthy' | 'watch' | 'at_risk' | 'critical';

const BAND_VARIANT: Record<HealthBand, BadgeVariant> = {
  healthy: 'success',
  watch: 'info',
  at_risk: 'warning',
  critical: 'error',
};

const BAND_LABEL: Record<HealthBand, string> = {
  healthy: 'Healthy',
  watch: 'Watch',
  at_risk: 'At risk',
  critical: 'Critical',
};

/** Compact tenant-health indicator: score out of 100 + the band it falls in. */
export function HealthBadge({ score, band }: { score: number; band: HealthBand }) {
  return (
    <Badge variant={BAND_VARIANT[band]}>
      {score} · {BAND_LABEL[band]}
    </Badge>
  );
}
