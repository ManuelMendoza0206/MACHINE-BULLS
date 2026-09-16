/**
 * Client-side vision / upload tuning for the wardrobe flow.
 *
 * Source of truth for the values referenced by `openspec/specs/frontend/wardrobe-flow/spec.md`
 * §1 (SLA) and §2.3.1 (upload concurrency). Nothing here talks to the network — these are the
 * knobs for the in-browser blur heuristic and the client-side upload queue.
 */
export const VISION_CONFIG = {
  /**
   * Maximum garment uploads processed at once. The rest queue in FIFO order and surface as
   * `queued` in the UI (spec §2.3.1). Spec allows 4–6; 4 is the conservative default so a full
   * wardrobe onboarding does not fire dozens of `multipart/form-data` requests at once.
   */
  maxConcurrentUploads: 4,

  /**
   * Laplacian-variance threshold below which an image is flagged blurry. Tunable — this is an
   * informational gate shown to the user, it never blocks the upload (spec §2.2, §3.1). The
   * initial value is a starting point for tuning against real photos in Sprint 3.
   */
  blurThreshold: 120,

  /**
   * Largest image the blur check will attempt to decode, in bytes (spec §1: "hasta 8MB").
   * Larger files skip the check rather than risk a long main-thread stall.
   */
  maxImageSizeBytes: 8 * 1024 * 1024,
} as const;

export type VisionConfig = typeof VISION_CONFIG;
