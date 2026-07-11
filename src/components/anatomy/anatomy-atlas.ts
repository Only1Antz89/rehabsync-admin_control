/**
 * Detailed anatomical atlas for the knowledgebase renderer. Individually named muscles and bones as
 * bezier paths, authored on the RIGHT half of a 240×620 canvas (centre x=120) and mirrored to the
 * left at render time. Each muscle declares a `parent` — one of the KB zone ids in anatomy-regions.ts
 * — so a zone tag on a knowledgebase article highlights all of that zone's individual muscles, while
 * clinicians still see the specific muscle name on hover.
 */

export type Half = 'r' | 'c'; // right-side (mirrored to left) | centre (drawn once)

export interface AtlasMuscle {
  id: string;
  parent: string;
  label: string;
  half: Half;
  d: string;
  /** Optional fibre striations (thin lines) for extra anatomical texture. */
  fibres?: string[];
}

export interface AtlasBone {
  id: string;
  label: string;
  half: Half;
  d: string;
}

// ─────────────────────────── ANTERIOR MUSCLES ───────────────────────────
export const FRONT_MUSCLES: AtlasMuscle[] = [
  // neck
  { id: 'scm', parent: 'neck', label: 'Sternocleidomastoid', half: 'r', d: 'M126 78 C131 84 133 92 132 100 C129 100 126 99 124 96 C123 89 123 82 126 78 Z' },
  // shoulder / upper back slope
  { id: 'trap_up', parent: 'trapezius_upper', label: 'Upper trapezius', half: 'r', d: 'M120 92 C134 94 148 100 156 110 C150 112 138 110 128 108 C124 103 121 98 120 92 Z' },
  // deltoid (three heads visible anteriorly)
  { id: 'deltoid_ant', parent: 'deltoid_anterior', label: 'Deltoid (anterior head)', half: 'r', d: 'M150 108 C164 106 176 114 179 128 C180 138 176 146 168 150 C160 146 153 138 150 128 C149 121 149 114 150 108 Z',
    fibres: ['M156 114 C160 124 162 134 165 144', 'M162 112 C166 122 168 132 171 142'] },
  // pectoralis major
  { id: 'pec_major', parent: 'pectoralis', label: 'Pectoralis major', half: 'r', d: 'M120 116 C138 116 154 122 162 134 C158 146 146 154 132 156 C124 152 120 142 120 132 Z',
    fibres: ['M122 124 C136 126 150 132 160 138', 'M122 136 C134 142 146 148 156 150'] },
  // serratus anterior (finger-like slips)
  { id: 'serratus', parent: 'serratus', label: 'Serratus anterior', half: 'r', d: 'M150 160 C156 162 160 166 161 172 C156 173 152 171 149 167 Z M152 172 C158 174 161 178 162 183 C157 184 153 182 150 178 Z M153 184 C158 186 161 189 162 194 C158 195 154 193 151 189 Z' },
  // biceps brachii (upper arm at the side)
  { id: 'biceps', parent: 'biceps', label: 'Biceps brachii', half: 'r', d: 'M154 136 C165 137 170 150 169 174 C168 194 164 206 158 208 C153 202 150 184 150 166 C150 152 150 142 154 136 Z',
    fibres: ['M157 150 C159 168 159 186 158 202'] },
  // brachioradialis / forearm flexors
  { id: 'forearm_flex', parent: 'forearm_flexors', label: 'Forearm flexors', half: 'r', d: 'M154 214 C165 216 170 236 169 260 C168 280 164 290 158 291 C153 283 150 262 150 240 C150 226 150 218 154 214 Z' },
  // rectus abdominis (segmented) — centre pieces, right column
  { id: 'rectus_abs', parent: 'rectus_abdominis', label: 'Rectus abdominis', half: 'r',
    d: 'M108 168 C116 168 119 172 119 178 C119 184 116 187 108 187 C104 182 104 173 108 168 Z M108 190 C116 190 119 194 119 200 C119 206 116 209 108 209 C104 204 104 195 108 190 Z M108 212 C116 212 119 216 119 222 C119 228 116 231 108 231 C104 226 104 217 108 212 Z M109 234 C116 234 119 238 119 245 C119 252 116 256 109 256 C105 250 105 240 109 234 Z' },
  // external oblique
  { id: 'oblique', parent: 'obliques', label: 'External oblique', half: 'r', d: 'M138 200 C150 204 158 216 160 234 C160 250 154 262 144 266 C140 254 138 238 137 222 C137 212 137 205 138 200 Z',
    fibres: ['M142 210 C150 224 154 240 155 256'] },
  // hip flexor / sartorius strap
  { id: 'sartorius', parent: 'hip_flexors', label: 'Sartorius', half: 'r', d: 'M140 300 C150 308 150 330 140 356 C132 380 126 400 122 420 C120 410 121 386 128 360 C133 336 135 314 140 300 Z' },
  // quadriceps — three visible heads
  { id: 'rectus_femoris', parent: 'quadriceps', label: 'Rectus femoris', half: 'r', d: 'M130 336 C142 338 148 352 148 380 C148 410 144 436 136 452 C130 442 127 414 127 384 C127 360 127 344 130 336 Z',
    fibres: ['M134 350 C138 380 138 420 135 448'] },
  { id: 'vastus_lat', parent: 'quadriceps', label: 'Vastus lateralis', half: 'r', d: 'M148 344 C160 348 166 366 166 392 C166 416 160 434 150 442 C146 424 146 398 147 372 C147 358 147 350 148 344 Z',
    fibres: ['M152 356 C158 380 158 414 154 436'] },
  { id: 'vastus_med', parent: 'quadriceps', label: 'Vastus medialis', half: 'r', d: 'M128 414 C140 416 148 428 149 446 C148 456 142 460 134 458 C129 450 127 436 127 424 Z' },
  // adductors
  { id: 'adductors', parent: 'adductors', label: 'Adductor group', half: 'r', d: 'M120 338 C128 340 132 356 132 380 C132 404 129 424 122 436 C120 424 119 400 119 376 C119 356 119 344 120 338 Z' },
  // knee cap handled in skeleton; patellar tendon small
  // tibialis anterior (shin)
  { id: 'tib_ant', parent: 'tibialis_anterior', label: 'Tibialis anterior', half: 'r', d: 'M130 472 C140 476 146 496 146 522 C146 542 142 556 135 560 C130 548 128 524 128 500 C128 486 128 478 130 472 Z' },
  // gastrocnemius peek (medial head from front)
  { id: 'gastro_front', parent: 'gastrocnemius', label: 'Gastrocnemius (medial head)', half: 'r', d: 'M147 476 C156 480 160 496 160 516 C160 532 156 542 150 544 C147 532 146 512 146 496 Z' },
];

// ─────────────────────────── POSTERIOR MUSCLES ──────────────────────────
export const BACK_MUSCLES: AtlasMuscle[] = [
  { id: 'trapezius', parent: 'trapezius', label: 'Trapezius', half: 'r', d: 'M120 96 C136 100 150 110 158 124 C150 150 138 168 126 182 C122 160 120 130 120 104 Z',
    fibres: ['M122 110 C138 118 150 132 156 146', 'M122 130 C132 148 138 164 124 178'] },
  { id: 'deltoid_post', parent: 'deltoid_posterior', label: 'Deltoid (posterior head)', half: 'r', d: 'M154 110 C168 108 179 118 180 132 C180 142 175 150 167 152 C160 147 154 138 152 128 C151 121 151 115 154 110 Z' },
  { id: 'infraspinatus', parent: 'infraspinatus', label: 'Infraspinatus / teres', half: 'r', d: 'M140 138 C154 140 162 150 162 162 C158 172 148 174 140 170 C136 160 136 148 140 138 Z' },
  { id: 'rhomboid', parent: 'rhomboids', label: 'Rhomboids', half: 'r', d: 'M122 140 C132 142 138 150 138 162 C138 172 132 178 124 178 C122 166 121 152 122 140 Z' },
  { id: 'triceps', parent: 'triceps', label: 'Triceps brachii', half: 'r', d: 'M154 138 C165 139 170 152 169 176 C168 196 164 208 158 210 C153 204 150 186 150 168 C150 154 150 144 154 138 Z',
    fibres: ['M157 152 C159 172 159 192 158 204'] },
  { id: 'forearm_ext', parent: 'forearm_extensors', label: 'Forearm extensors', half: 'r', d: 'M154 214 C165 216 170 236 169 260 C168 280 164 290 158 291 C153 283 150 262 150 240 C150 226 150 218 154 214 Z' },
  { id: 'lat', parent: 'latissimus', label: 'Latissimus dorsi', half: 'r', d: 'M124 176 C144 180 156 196 158 220 C158 240 150 254 136 258 C128 244 124 216 123 194 C123 184 123 179 124 176 Z',
    fibres: ['M126 186 C144 198 152 220 153 242'] },
  { id: 'erector', parent: 'erector_spinae', label: 'Erector spinae', half: 'r', d: 'M120 190 C128 192 132 208 132 236 C132 262 129 282 122 292 C120 280 119 246 119 214 Z' },
  { id: 'glute_max', parent: 'gluteals', label: 'Gluteus maximus', half: 'r', d: 'M120 300 C138 300 152 312 152 332 C152 352 138 362 122 362 C120 348 119 322 120 300 Z',
    fibres: ['M124 312 C138 316 148 326 150 340'] },
  { id: 'glute_med', parent: 'gluteals', label: 'Gluteus medius', half: 'r', d: 'M144 300 C156 300 162 310 160 322 C154 326 146 322 142 314 C141 308 142 303 144 300 Z' },
  { id: 'biceps_femoris', parent: 'hamstrings', label: 'Biceps femoris', half: 'r', d: 'M145 366 C158 370 162 390 160 418 C158 440 152 456 144 460 C140 442 141 410 142 386 C142 376 143 370 145 366 Z',
    fibres: ['M148 380 C152 408 151 440 147 456'] },
  { id: 'semitendinosus', parent: 'hamstrings', label: 'Semitendinosus', half: 'r', d: 'M132 366 C144 370 147 392 145 420 C143 442 138 456 131 460 C128 442 128 410 129 386 C129 376 130 370 132 366 Z' },
  { id: 'semimembranosus', parent: 'hamstrings', label: 'Semimembranosus', half: 'r', d: 'M123 372 C132 374 135 394 134 418 C133 438 129 452 123 456 C121 440 120 410 120 384 Z' },
  { id: 'gastro_med', parent: 'gastrocnemius', label: 'Gastrocnemius (medial head)', half: 'r', d: 'M126 470 C136 474 140 492 139 514 C138 532 133 544 126 546 C123 530 123 500 123 482 Z' },
  { id: 'gastro_lat', parent: 'gastrocnemius', label: 'Gastrocnemius (lateral head)', half: 'r', d: 'M140 470 C150 474 154 490 153 510 C152 526 148 536 142 538 C139 524 139 500 139 484 Z' },
  { id: 'soleus', parent: 'soleus', label: 'Soleus', half: 'r', d: 'M131 540 C141 542 145 552 144 566 C143 576 138 582 132 582 C129 570 129 554 131 540 Z' },
];

// ─────────────────────────── SKELETON (front) ───────────────────────────
export const FRONT_BONES: AtlasBone[] = [
  { id: 'skull', label: 'Cranium', half: 'c', d: 'M120 22 C133 22 142 34 142 50 C142 64 133 74 120 74 C107 74 98 64 98 50 C98 34 107 22 120 22 Z' },
  { id: 'mandible', label: 'Mandible', half: 'c', d: 'M108 66 C112 74 128 74 132 66 C130 74 124 80 120 80 C116 80 110 74 108 66 Z' },
  { id: 'cervical', label: 'Cervical spine', half: 'c', d: 'M116 78 L124 78 L123 100 L117 100 Z' },
  { id: 'clavicle', label: 'Clavicle', half: 'r', d: 'M120 104 C136 102 150 106 160 112 C150 110 136 110 121 111 Z' },
  { id: 'scapula_f', label: 'Scapula', half: 'r', d: 'M150 116 C160 118 166 126 166 136 C158 134 151 128 148 120 Z' },
  { id: 'sternum', label: 'Sternum', half: 'c', d: 'M116 116 L124 116 L123 152 L120 158 L117 152 Z' },
  { id: 'ribs', label: 'Ribcage', half: 'r',
    d: 'M124 120 C142 122 154 132 158 146 M124 132 C143 134 156 144 160 158 M124 146 C143 148 155 158 158 170 M125 160 C142 162 152 170 155 180 M126 174 C140 176 149 182 151 190' },
  { id: 'humerus_f', label: 'Humerus', half: 'r', d: 'M157 116 C165 120 168 148 167 184 C166 194 161 196 158 190 C156 156 154 132 153 120 Z' },
  { id: 'radius_ulna_f', label: 'Radius & ulna', half: 'r', d: 'M157 212 C165 222 169 248 169 278 C169 288 164 288 161 282 C158 252 155 228 153 214 Z' },
  { id: 'hand_f', label: 'Carpals & phalanges', half: 'r', d: 'M156 286 C167 288 172 302 171 318 C170 328 162 332 156 327 C151 317 150 300 156 286 Z M162 318 l3 12 M166 316 l3 11 M158 319 l2 12 M170 313 l2 10' },
  { id: 'pelvis', label: 'Pelvis (ilium & pubis)', half: 'r', d: 'M120 286 C132 285 143 291 149 302 C153 310 152 318 146 322 C140 320 134 314 130 306 C127 316 124 322 120 324 C120 312 120 298 120 286 Z' },
  { id: 'femur_f', label: 'Femur', half: 'r', d: 'M126 322 C138 328 146 360 146 410 C146 440 142 452 137 448 C132 410 128 366 122 334 Z' },
  { id: 'patella', label: 'Patella', half: 'r', d: 'M132 452 C142 452 146 460 143 468 C137 472 130 468 129 460 C129 456 130 453 132 452 Z' },
  { id: 'tibia_fibula_f', label: 'Tibia & fibula', half: 'r', d: 'M130 472 C142 480 148 512 148 552 C148 562 143 562 140 554 C136 516 130 486 126 476 Z' },
  { id: 'foot_f', label: 'Foot', half: 'r', d: 'M126 566 C138 566 150 572 152 582 C142 586 128 584 124 578 Z' },
];

// ─────────────────────────── SKELETON (back) ────────────────────────────
export const BACK_BONES: AtlasBone[] = [
  { id: 'skull_b', label: 'Cranium', half: 'c', d: 'M120 22 C133 22 142 34 142 50 C142 64 133 74 120 74 C107 74 98 64 98 50 C98 34 107 22 120 22 Z' },
  { id: 'spine', label: 'Vertebral column', half: 'c', d: 'M117 80 L123 80 L122 300 L118 300 Z M113 92 h14 M113 104 h14 M113 116 h14 M113 128 h14 M113 140 h14 M113 152 h14 M113 164 h14 M113 176 h14 M113 188 h14 M113 200 h14 M113 212 h14 M113 224 h14 M113 236 h14 M113 248 h14 M113 260 h14 M113 272 h14 M113 284 h14' },
  { id: 'scapula_b', label: 'Scapula', half: 'r', d: 'M126 120 C144 122 156 132 158 148 C150 152 136 146 130 136 C127 130 126 124 126 120 Z' },
  { id: 'ribs_b', label: 'Ribcage', half: 'r',
    d: 'M124 126 C140 130 150 140 154 152 M124 140 C141 144 152 154 156 166 M124 154 C140 158 150 166 153 178 M125 168 C139 172 147 178 150 188' },
  { id: 'humerus_b', label: 'Humerus', half: 'r', d: 'M157 118 C165 122 168 150 167 186 C166 196 161 198 158 192 C156 158 154 134 153 122 Z' },
  { id: 'radius_ulna_b', label: 'Radius & ulna', half: 'r', d: 'M157 214 C165 224 169 250 169 280 C169 290 164 290 161 284 C158 254 155 230 153 216 Z' },
  { id: 'hand_b', label: 'Carpals & phalanges', half: 'r', d: 'M156 288 C167 290 172 304 171 320 C170 330 162 334 156 329 C151 319 150 302 156 288 Z M162 320 l3 12 M166 318 l3 11 M158 321 l2 12 M170 315 l2 10' },
  { id: 'pelvis_b', label: 'Pelvis', half: 'r', d: 'M120 296 C138 296 154 306 158 324 C150 338 136 342 122 340 C120 330 119 312 120 296 Z' },
  { id: 'sacrum', label: 'Sacrum', half: 'c', d: 'M115 300 L125 300 L122 330 L118 330 Z' },
  { id: 'femur_b', label: 'Femur', half: 'r', d: 'M126 330 C138 336 146 368 146 418 C146 448 142 460 137 456 C132 418 128 374 122 342 Z' },
  { id: 'tibia_fibula_b', label: 'Tibia & fibula', half: 'r', d: 'M130 466 C142 474 148 508 148 550 C148 560 143 560 140 552 C136 512 130 480 126 470 Z' },
  { id: 'calcaneus', label: 'Calcaneus', half: 'r', d: 'M128 566 C136 566 142 572 142 580 C136 584 128 582 126 576 Z' },
];

// Body silhouette base, composed from anatomical capsules with the arms at the sides (relaxed
// standing pose, ~8-head proportions). Centre parts drawn once; right parts mirrored to the left.
export interface SilhouettePart {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rot?: number;
  half: Half;
}

export const SILHOUETTE: SilhouettePart[] = [
  { half: 'c', cx: 120, cy: 50, rx: 22, ry: 30 }, // head
  { half: 'c', cx: 120, cy: 88, rx: 11, ry: 13 }, // neck
  { half: 'c', cx: 120, cy: 132, rx: 45, ry: 36 }, // chest / shoulders
  { half: 'c', cx: 120, cy: 212, rx: 33, ry: 56 }, // abdomen
  { half: 'c', cx: 120, cy: 302, rx: 40, ry: 34 }, // pelvis
  { half: 'r', cx: 160, cy: 166, rx: 13, ry: 60, rot: 3 }, // upper arm (at side)
  { half: 'r', cx: 161, cy: 260, rx: 11, ry: 54, rot: 2 }, // forearm
  { half: 'r', cx: 161, cy: 324, rx: 10, ry: 18 }, // hand
  { half: 'r', cx: 140, cy: 382, rx: 24, ry: 72 }, // thigh
  { half: 'r', cx: 138, cy: 504, rx: 15, ry: 62 }, // shank
  { half: 'r', cx: 141, cy: 586, rx: 13, ry: 11 }, // foot
];
