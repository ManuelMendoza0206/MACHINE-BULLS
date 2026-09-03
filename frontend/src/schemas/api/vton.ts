import { z } from 'zod';

// Closed enum — explicit in plan-base.md §10.1
export const VtonJobStatusSchema = z.enum(['pending', 'processing', 'completed', 'failed']);
export type VtonJobStatus = z.infer<typeof VtonJobStatusSchema>;

export const VtonJobCreateResponseSchema = z.object({
  job_id: z.string().uuid(),
  status: z.literal('processing'),
  estimated_time_seconds: z.number().positive(),
});
export type VtonJobCreateResponse = z.infer<typeof VtonJobCreateResponseSchema>;

export const VtonJobStatusResponseSchema = z
  .object({
    job_id: z.string().uuid(),
    status: VtonJobStatusSchema,
    result_url: z.string().url().nullable().optional(),
    error_message: z.string().nullable().optional(),
  })
  .refine(
    data => {
      if (data.status === 'completed') {
        return data.result_url !== null && data.result_url !== undefined && data.result_url !== '';
      }
      return true;
    },
    {
      message: 'result_url is required when status is completed',
      path: ['result_url'],
    }
  );
export type VtonJobStatusResponse = z.infer<typeof VtonJobStatusResponseSchema>;
