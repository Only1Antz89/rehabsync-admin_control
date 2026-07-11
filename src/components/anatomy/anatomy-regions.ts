/**
 * Canonical anatomy region taxonomy for the knowledgebase anatomy renderer. `kb_articles.anatomy_regions`
 * stores these ids. Regions are grouped by view (front / back) and layer (muscle / skeletal-joint) so
 * the figure can highlight exactly where an entry applies.
 */

export type AnatomyView = 'front' | 'back';
export type AnatomyLayer = 'muscle' | 'joint';

export interface AnatomyRegion {
  id: string;
  label: string;
  view: AnatomyView;
  layer: AnatomyLayer;
  /** Free-text synonyms so search / tagging can resolve loose terms to a region. */
  synonyms?: string[];
}

export const ANATOMY_REGIONS: AnatomyRegion[] = [
  // ─── Front · muscles ───
  { id: 'neck', label: 'Neck / SCM', view: 'front', layer: 'muscle', synonyms: ['cervical', 'sternocleidomastoid'] },
  { id: 'trapezius_upper', label: 'Upper trapezius', view: 'front', layer: 'muscle', synonyms: ['traps'] },
  { id: 'deltoid_anterior', label: 'Deltoid (anterior)', view: 'front', layer: 'muscle', synonyms: ['shoulder', 'delts'] },
  { id: 'pectoralis', label: 'Pectorals', view: 'front', layer: 'muscle', synonyms: ['chest', 'pecs'] },
  { id: 'biceps', label: 'Biceps brachii', view: 'front', layer: 'muscle', synonyms: ['upper arm'] },
  { id: 'forearm_flexors', label: 'Forearm flexors', view: 'front', layer: 'muscle', synonyms: ['forearm', 'wrist flexors'] },
  { id: 'rectus_abdominis', label: 'Rectus abdominis', view: 'front', layer: 'muscle', synonyms: ['abs', 'core', 'abdominals'] },
  { id: 'obliques', label: 'Obliques', view: 'front', layer: 'muscle', synonyms: ['side abs'] },
  { id: 'serratus', label: 'Serratus anterior', view: 'front', layer: 'muscle' },
  { id: 'hip_flexors', label: 'Hip flexors', view: 'front', layer: 'muscle', synonyms: ['iliopsoas'] },
  { id: 'quadriceps', label: 'Quadriceps', view: 'front', layer: 'muscle', synonyms: ['quads', 'thigh', 'vastus', 'rectus femoris'] },
  { id: 'adductors', label: 'Adductors', view: 'front', layer: 'muscle', synonyms: ['groin', 'inner thigh'] },
  { id: 'tibialis_anterior', label: 'Tibialis anterior', view: 'front', layer: 'muscle', synonyms: ['shin'] },
  // ─── Back · muscles ───
  { id: 'trapezius', label: 'Trapezius', view: 'back', layer: 'muscle', synonyms: ['traps', 'upper back'] },
  { id: 'deltoid_posterior', label: 'Deltoid (posterior)', view: 'back', layer: 'muscle', synonyms: ['rear delt', 'shoulder'] },
  { id: 'rhomboids', label: 'Rhomboids', view: 'back', layer: 'muscle', synonyms: ['mid back'] },
  { id: 'infraspinatus', label: 'Rotator cuff (infraspinatus)', view: 'back', layer: 'muscle', synonyms: ['rotator cuff', 'teres'] },
  { id: 'latissimus', label: 'Latissimus dorsi', view: 'back', layer: 'muscle', synonyms: ['lats', 'back'] },
  { id: 'triceps', label: 'Triceps', view: 'back', layer: 'muscle', synonyms: ['upper arm'] },
  { id: 'forearm_extensors', label: 'Forearm extensors', view: 'back', layer: 'muscle', synonyms: ['forearm', 'wrist extensors'] },
  { id: 'erector_spinae', label: 'Erector spinae', view: 'back', layer: 'muscle', synonyms: ['paraspinals'] },
  { id: 'gluteals', label: 'Gluteals', view: 'back', layer: 'muscle', synonyms: ['glutes', 'buttock'] },
  { id: 'hamstrings', label: 'Hamstrings', view: 'back', layer: 'muscle', synonyms: ['posterior thigh', 'biceps femoris'] },
  { id: 'gastrocnemius', label: 'Gastrocnemius', view: 'back', layer: 'muscle', synonyms: ['calf', 'calves'] },
  { id: 'soleus', label: 'Soleus', view: 'back', layer: 'muscle', synonyms: ['calf'] },
  // ─── Skeletal / joints ───
  { id: 'cervical_spine', label: 'Cervical spine', view: 'back', layer: 'joint', synonyms: ['neck'] },
  { id: 'thoracic_spine', label: 'Thoracic spine', view: 'back', layer: 'joint', synonyms: ['mid back'] },
  { id: 'lumbar_spine', label: 'Lumbar spine', view: 'back', layer: 'joint', synonyms: ['low back', 'lower back'] },
  { id: 'shoulder_joint', label: 'Shoulder (GH joint)', view: 'front', layer: 'joint', synonyms: ['rotator cuff', 'glenohumeral'] },
  { id: 'elbow_joint', label: 'Elbow', view: 'front', layer: 'joint' },
  { id: 'wrist_joint', label: 'Wrist & hand', view: 'front', layer: 'joint', synonyms: ['hand'] },
  { id: 'hip_joint', label: 'Hip', view: 'front', layer: 'joint' },
  { id: 'knee_joint', label: 'Knee', view: 'front', layer: 'joint', synonyms: ['patella', 'acl', 'meniscus'] },
  { id: 'ankle_joint', label: 'Ankle & foot', view: 'front', layer: 'joint', synonyms: ['foot', 'achilles'] },
];

const REGION_BY_ID = new Map(ANATOMY_REGIONS.map((r) => [r.id, r]));

export function anatomyLabel(id: string): string {
  return REGION_BY_ID.get(id)?.label ?? id;
}

export function anatomyRegionsForView(view: AnatomyView): AnatomyRegion[] {
  return ANATOMY_REGIONS.filter((r) => r.view === view);
}

/** Best-effort resolve a free-text term (e.g. an article title or search) to region ids. */
export function resolveRegions(text: string): string[] {
  const haystack = text.toLowerCase();
  const hits = new Set<string>();
  for (const region of ANATOMY_REGIONS) {
    const terms = [region.label.toLowerCase(), ...(region.synonyms ?? [])];
    if (terms.some((t) => haystack.includes(t.toLowerCase()))) hits.add(region.id);
  }
  return Array.from(hits);
}
