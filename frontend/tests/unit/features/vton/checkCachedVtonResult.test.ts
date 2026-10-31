import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkCachedVtonResult,
  setCachedVtonResult,
  clearCachedVtonResult,
} from '@/features/vton/lib/checkCachedVtonResult';

describe('checkCachedVtonResult', () => {
  beforeEach(() => {
    clearCachedVtonResult();
  });

  it('retorna null si el par (outfitId, file) no ha sido procesado', () => {
    const file = new File(['image-bytes-1'], 'foto1.jpg', { type: 'image/jpeg' });
    const cached = checkCachedVtonResult('outfit-uuid-1', file);
    expect(cached).toBeNull();
  });

  it('retorna el resultado guardado si el mismo par (outfitId, file) ya fue completado', () => {
    const file = new File(['image-bytes-1'], 'foto1.jpg', { type: 'image/jpeg' });
    setCachedVtonResult('outfit-uuid-1', file, 'https://cdn.example.com/res1.jpg', 'job-123');

    const cached = checkCachedVtonResult('outfit-uuid-1', file);
    expect(cached).toEqual({
      jobId: 'job-123',
      resultUrl: 'https://cdn.example.com/res1.jpg',
    });
  });

  it('diferencia entre outfits distintos con la misma foto', () => {
    const file = new File(['image-bytes-1'], 'foto1.jpg', { type: 'image/jpeg' });
    setCachedVtonResult('outfit-uuid-1', file, 'https://cdn.example.com/res1.jpg', 'job-123');

    expect(checkCachedVtonResult('outfit-uuid-2', file)).toBeNull();
  });

  it('diferencia entre fotos distintas con el mismo outfit', () => {
    const fileA = new File(['image-bytes-1'], 'foto1.jpg', {
      type: 'image/jpeg',
    });
    const fileB = new File(['image-bytes-different-length-2'], 'foto2.jpg', {
      type: 'image/jpeg',
    });

    setCachedVtonResult('outfit-uuid-1', fileA, 'https://cdn.example.com/res1.jpg', 'job-123');

    expect(checkCachedVtonResult('outfit-uuid-1', fileB)).toBeNull();
  });

  it('permite limpiar la caché de sesión con clearCachedVtonResult', () => {
    const file = new File(['image-bytes-1'], 'foto1.jpg', { type: 'image/jpeg' });
    setCachedVtonResult('outfit-uuid-1', file, 'https://cdn.example.com/res1.jpg', 'job-123');

    clearCachedVtonResult();
    expect(checkCachedVtonResult('outfit-uuid-1', file)).toBeNull();
  });
});
