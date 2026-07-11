'use client';

import { useMemo, useState } from 'react';
import { anatomyLabel } from './anatomy-regions';
import {
  FRONT_MUSCLES,
  BACK_MUSCLES,
  FRONT_BONES,
  BACK_BONES,
  SILHOUETTE,
  type AtlasMuscle,
  type AtlasBone,
} from './anatomy-atlas';

/**
 * Detailed, interactive anatomy renderer for clinicians. Individually named muscles + a skeletal
 * layer, front and back, with a Muscle / Skeleton / Both toggle. Muscles roll up to the KB zones
 * (a zone tag highlights every muscle in it); hover shows the specific muscle name and click selects
 * the zone (so knowledgebase tagging stays at the zone level).
 */

type ViewName = 'front' | 'back';
type Layer = 'muscle' | 'skeleton' | 'both';
type FigurePose = 'neutral' | 'triage';

const ARM_MUSCLE_IDS = new Set(['biceps', 'forearm_flex', 'triceps', 'forearm_ext']);
const LEG_MUSCLE_IDS = new Set([
  'sartorius',
  'rectus_femoris',
  'vastus_lat',
  'vastus_med',
  'adductors',
  'tib_ant',
  'gastro_front',
  'biceps_femoris',
  'semitendinosus',
  'semimembranosus',
  'gastro_med',
  'gastro_lat',
  'soleus',
]);
const ARM_BONE_IDS = new Set(['humerus_f', 'radius_ulna_f', 'hand_f', 'humerus_b', 'radius_ulna_b', 'hand_b']);
const LEG_BONE_IDS = new Set(['femur_f', 'patella', 'tibia_fibula_f', 'foot_f', 'femur_b', 'tibia_fibula_b', 'calcaneus']);
const ARM_JOINT_IDS = new Set(['elbow_joint', 'wrist_joint']);
const LEG_JOINT_IDS = new Set(['knee_joint', 'ankle_joint']);

function triagePoseTransform(kind: 'arm' | 'leg', view: ViewName): string {
  const isFront = view === 'front';
  if (kind === 'arm') return `rotate(${isFront ? -12 : -7} 154 122)`;
  return `rotate(${isFront ? -5.5 : -3} 130 314)`;
}

function poseTransform(
  id: string,
  part: 'muscle' | 'bone' | 'joint' | 'silhouette',
  view: ViewName,
  pose: FigurePose,
  cy?: number,
): string | undefined {
  if (pose !== 'triage') return undefined;
  if (part === 'silhouette') {
    if (cy !== undefined && cy >= 150 && cy < 350) return triagePoseTransform('arm', view);
    if (cy !== undefined && cy >= 360) return triagePoseTransform('leg', view);
    return undefined;
  }
  if ((part === 'muscle' && ARM_MUSCLE_IDS.has(id)) || (part === 'bone' && ARM_BONE_IDS.has(id)) || (part === 'joint' && ARM_JOINT_IDS.has(id))) {
    return triagePoseTransform('arm', view);
  }
  if ((part === 'muscle' && LEG_MUSCLE_IDS.has(id)) || (part === 'bone' && LEG_BONE_IDS.has(id)) || (part === 'joint' && LEG_JOINT_IDS.has(id))) {
    return triagePoseTransform('leg', view);
  }
  return undefined;
}

// Small joint markers, tagged with KB joint zones, drawn on every layer so any zone tag highlights.
interface Joint {
  id: string;
  cx: number;
  cy: number;
  r: number;
}
const FRONT_JOINTS: Joint[] = [
  { id: 'shoulder_joint', cx: 158, cy: 114, r: 6 },
  { id: 'elbow_joint', cx: 160, cy: 208, r: 5 },
  { id: 'wrist_joint', cx: 161, cy: 286, r: 5 },
  { id: 'hip_joint', cx: 146, cy: 314, r: 6 },
  { id: 'knee_joint', cx: 138, cy: 460, r: 6 },
  { id: 'ankle_joint', cx: 140, cy: 562, r: 5 },
];
const BACK_JOINTS: Joint[] = [
  { id: 'shoulder_joint', cx: 158, cy: 114, r: 6 },
  { id: 'elbow_joint', cx: 160, cy: 210, r: 5 },
  { id: 'wrist_joint', cx: 161, cy: 288, r: 5 },
  { id: 'hip_joint', cx: 146, cy: 316, r: 6 },
  { id: 'knee_joint', cx: 138, cy: 462, r: 6 },
  { id: 'ankle_joint', cx: 140, cy: 560, r: 5 },
  { id: 'cervical_spine', cx: 120, cy: 92, r: 5 },
  { id: 'thoracic_spine', cx: 120, cy: 170, r: 5 },
  { id: 'lumbar_spine', cx: 120, cy: 250, r: 5 },
];

const MIRROR = 'translate(240,0) scale(-1,1)';

function MusclePaths({
  muscle,
  active,
  hovered,
  gid,
  onHover,
  onSelect,
  interactive,
  transform,
}: {
  muscle: AtlasMuscle;
  active: boolean;
  hovered: boolean;
  gid: (s: string) => string;
  onHover: (label: string | null) => void;
  onSelect?: (zone: string) => void;
  interactive: boolean;
  transform?: string;
}) {
  return (
    <g
      transform={transform}
      onMouseEnter={interactive ? () => onHover(muscle.label) : undefined}
      onMouseLeave={interactive ? () => onHover(null) : undefined}
      onClick={interactive && onSelect ? () => onSelect(muscle.parent) : undefined}
      style={{ cursor: interactive ? 'pointer' : 'default', filter: active ? `url(#${gid('glow')})` : undefined, opacity: hovered && !active ? 0.82 : 1 }}
    >
      <path d={muscle.d} style={{ fill: active ? `url(#${gid('mhi')})` : `url(#${gid('muscle')})`, stroke: 'rgba(94,20,18,0.5)', strokeWidth: 0.7 }} />
      {muscle.fibres?.map((f, i) => (
        <path key={i} d={f} style={{ fill: 'none', stroke: 'rgba(94,20,18,0.28)', strokeWidth: 0.6 }} />
      ))}
    </g>
  );
}

function Figure({
  view,
  layer,
  activeZones,
  interactive,
  hovered,
  onHover,
  onSelect,
  pose,
}: {
  view: ViewName;
  layer: Layer;
  activeZones: Set<string>;
  interactive: boolean;
  hovered: string | null;
  onHover: (label: string | null) => void;
  onSelect?: (zone: string) => void;
  pose: FigurePose;
}) {
  const gid = (s: string) => `${view}-${s}`;
  const muscles = view === 'front' ? FRONT_MUSCLES : BACK_MUSCLES;
  const bones = view === 'front' ? FRONT_BONES : BACK_BONES;
  const joints = view === 'front' ? FRONT_JOINTS : BACK_JOINTS;
  const showMuscle = layer === 'muscle' || layer === 'both';
  const showBone = layer === 'skeleton' || layer === 'both';
  const boneOpacity = layer === 'both' ? 0.9 : 1;
  const muscleOpacity = layer === 'both' ? 0.9 : 1;

  const renderMuscle = (m: AtlasMuscle, mirrored: boolean) => (
    <MusclePaths
      key={`${m.id}${mirrored ? '-m' : ''}`}
      muscle={m}
      active={activeZones.has(m.parent)}
      hovered={hovered === m.label}
      gid={gid}
      onHover={onHover}
      onSelect={onSelect}
      interactive={interactive}
      transform={poseTransform(m.id, 'muscle', view, pose)}
    />
  );

  const renderBone = (b: AtlasBone, mirrored: boolean) => (
    <path
      key={`${b.id}${mirrored ? '-m' : ''}`}
      d={b.d}
      transform={poseTransform(b.id, 'bone', view, pose)}
      style={{ fill: b.d.includes('C') && !b.id.startsWith('ribs') ? `url(#${gid('bone')})` : 'none', stroke: 'rgba(120,110,86,0.7)', strokeWidth: b.id.startsWith('ribs') ? 1 : 0.7 }}
    />
  );

  return (
    <svg viewBox="0 0 240 616" className="h-full w-full" role="img" aria-label={`${view} anatomy`}>
      <defs>
        <linearGradient id={gid('muscle')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e79a8f" />
          <stop offset="55%" stopColor="#cf6f66" />
          <stop offset="100%" stopColor="#a2443f" />
        </linearGradient>
        <linearGradient id={gid('mhi')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7defd8" />
          <stop offset="100%" stopColor="var(--brand-primary)" />
        </linearGradient>
        <linearGradient id={gid('bone')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f6f1e4" />
          <stop offset="60%" stopColor="#e3d9c1" />
          <stop offset="100%" stopColor="#c7b896" />
        </linearGradient>
        <radialGradient id={gid('sheen')} cx="38%" cy="24%" r="80%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.14)" />
          <stop offset="60%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        <filter id={gid('glow')} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* silhouette base — anatomical capsules (arms at the sides), right parts mirrored */}
      <g style={{ fill: 'rgba(148,163,184,0.14)', stroke: 'rgba(148,163,184,0.4)', strokeWidth: 1 }}>
        {SILHOUETTE.map((p, i) => {
          const transform = poseTransform(String(i), 'silhouette', view, pose, p.cy);
          const el = (
            <ellipse cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry} transform={p.rot ? `rotate(${p.rot} ${p.cx} ${p.cy})` : undefined} />
          );
          return p.half === 'c' ? <g key={i}>{el}</g> : [<g key={i} transform={transform}>{el}</g>, <g key={`${i}-m`} transform={MIRROR}>{<g transform={transform}>{el}</g>}</g>];
        })}
      </g>

      {/* skeleton layer */}
      {showBone && (
        <g style={{ opacity: boneOpacity }}>
          {bones.map((b) => (b.half === 'c' ? renderBone(b, false) : [renderBone(b, false), <g key={`${b.id}-mg`} transform={MIRROR}>{renderBone(b, true)}</g>]))}
        </g>
      )}

      {/* muscle layer */}
      {showMuscle && (
        <g style={{ opacity: muscleOpacity }}>
          {muscles.map((m) => (m.half === 'c' ? renderMuscle(m, false) : [renderMuscle(m, false), <g key={`${m.id}-mg`} transform={MIRROR}>{renderMuscle(m, true)}</g>]))}
        </g>
      )}

      {/* joint markers (always available so any KB zone highlights) */}
      <g>
        {joints.map((j) => {
          const on = activeZones.has(j.id);
          const marker = (mir: boolean) => (
            <circle
              key={`${j.id}${mir ? '-m' : ''}`}
              cx={j.cx}
              cy={j.cy}
              r={j.r}
              transform={poseTransform(j.id, 'joint', view, pose)}
              onMouseEnter={interactive ? () => onHover(anatomyLabel(j.id)) : undefined}
              onMouseLeave={interactive ? () => onHover(null) : undefined}
              onClick={interactive && onSelect ? () => onSelect(j.id) : undefined}
              style={{
                cursor: interactive ? 'pointer' : 'default',
                fill: on ? 'var(--brand-primary)' : 'rgba(226,232,240,0.55)',
                stroke: on ? 'var(--brand-primary)' : 'rgba(100,116,139,0.6)',
                strokeWidth: 1,
                filter: on ? `url(#${gid('glow')})` : undefined,
              }}
            />
          );
          // Centre joints (spine) aren't mirrored; lateral joints appear on both sides.
          return j.cx === 120 ? marker(false) : [marker(false), <g key={`${j.id}-mg`} transform={MIRROR}>{marker(true)}</g>];
        })}
      </g>

      {/* soft sheen */}
      <rect x="0" y="0" width="240" height="616" style={{ fill: `url(#${gid('sheen')})`, pointerEvents: 'none' }} />
    </svg>
  );
}

export interface AnatomyFigureProps {
  active?: string[];
  onSelectRegion?: (id: string) => void;
  interactive?: boolean;
  view?: 'front' | 'back' | 'both';
  height?: number;
  defaultLayer?: Layer;
  /** Controlled layer (when the parent owns the Muscle/Skeleton/Both toggle). */
  layer?: Layer;
  onLayerChange?: (layer: Layer) => void;
  /** Hide the built-in layer toggle (e.g. when a wrapper renders a shared one). */
  showLayerToggle?: boolean;
  pose?: FigurePose;
}

export function AnatomyFigure({
  active = [],
  onSelectRegion,
  interactive = true,
  view = 'both',
  height = 460,
  defaultLayer = 'muscle',
  layer: controlledLayer,
  onLayerChange,
  showLayerToggle = true,
  pose = 'neutral',
}: AnatomyFigureProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [internalLayer, setInternalLayer] = useState<Layer>(defaultLayer);
  const layer = controlledLayer ?? internalLayer;
  const setLayer = onLayerChange ?? setInternalLayer;
  const activeSet = useMemo(() => new Set(active), [active]);
  const showFront = view === 'both' || view === 'front';
  const showBack = view === 'both' || view === 'back';

  const caption = hovered
    ? hovered
    : active.length > 0
      ? `${active.length} zone${active.length === 1 ? '' : 's'} highlighted`
      : 'Hover a structure';

  const layerBtn = (key: Layer, label: string) => (
    <button
      key={key}
      type="button"
      onClick={() => setLayer(key)}
      className="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
      style={{
        backgroundColor: layer === key ? 'var(--bg-card)' : 'transparent',
        color: layer === key ? 'var(--text-primary)' : 'var(--text-muted)',
        boxShadow: layer === key ? '0 1px 2px rgba(0,0,0,.08)' : 'none',
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        {showLayerToggle ? (
          <div className="flex items-center gap-1 rounded-lg p-1" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            {layerBtn('muscle', 'Muscle')}
            {layerBtn('skeleton', 'Skeleton')}
            {layerBtn('both', 'Both')}
          </div>
        ) : (
          <span />
        )}
        <span className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>{caption}</span>
      </div>
      <div className="flex items-stretch justify-center gap-2" style={{ height }}>
        {showFront && (
          <div className="flex-1">
            <Figure view="front" layer={layer} activeZones={activeSet} interactive={interactive} hovered={hovered} onHover={setHovered} onSelect={onSelectRegion} pose={pose} />
            <p className="text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>Anterior</p>
          </div>
        )}
        {showBack && (
          <div className="flex-1">
            <Figure view="back" layer={layer} activeZones={activeSet} interactive={interactive} hovered={hovered} onHover={setHovered} onSelect={onSelectRegion} pose={pose} />
            <p className="text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>Posterior</p>
          </div>
        )}
      </div>
    </div>
  );
}
