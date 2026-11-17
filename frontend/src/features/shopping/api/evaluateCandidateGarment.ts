import { apiRequest } from '@/lib/api/client';
import {
  SmartShoppingEvaluateResponseSchema,
  type SmartShoppingEvaluateResponse,
} from '@/schemas/api/shopping';

export function evaluateCandidateGarment(
  file: File,
  signal?: AbortSignal
): Promise<SmartShoppingEvaluateResponse> {
  const formData = new FormData();
  formData.append('file', file);
  return apiRequest(
    {
      path: '/api/v1/shopping/evaluate',
      method: 'POST',
      body: formData,
      timeoutMs: 25_000,
      signal,
    },
    SmartShoppingEvaluateResponseSchema
  );
}
