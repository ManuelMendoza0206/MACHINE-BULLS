/**
 * Known product aesthetics (`plan-base.md` §1: "Old Money, Streetwear, Soft Boy, Starboy,
 * Gorpcore, entre otras"). `GarmentUploadResponseSchema.category`/`AestheticScoreSchema.aesthetic`
 * are deliberately `z.string()`, not a closed enum — the backend hasn't published one — so this
 * is *not* a validation source, just a UI placeholder list.
 *
 * profile-flow/spec.md §2.3 wants `DefaultAestheticSelector`'s `availableAesthetics` "derivado
 * de las estéticas presentes en el armario del usuario", which needs the wardrobe listing
 * endpoint (gap G1, `api-contract-gaps/spec.md` — still open). Until G1 closes, this fixed list
 * is what `/profile` passes in; replace with a real derivation once a wardrobe listing exists.
 */
export const KNOWN_AESTHETICS: readonly string[] = [
  'old_money',
  'streetwear',
  'soft_boy',
  'starboy',
  'gorpcore',
];
