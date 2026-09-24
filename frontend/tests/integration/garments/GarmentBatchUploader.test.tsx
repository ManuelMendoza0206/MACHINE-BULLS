import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse, delay } from 'msw';
import { server } from '../../fixtures/msw/server';
import { renderWithProviders } from '../../utils/renderWithProviders';
import { GarmentBatchUploader } from '@/features/garments/components/GarmentBatchUploader';
import { detectBlur } from '@/lib/vision/detectBlur';
import { VISION_CONFIG } from '@/config/vision';
import garmentFixture from '../../fixtures/api/garmentUploadResponse.json';

vi.mock('@/lib/vision/detectBlur', () => ({ detectBlur: vi.fn() }));
const detectBlurMock = vi.mocked(detectBlur);

const originalEnv = process.env['NEXT_PUBLIC_API_BASE_URL'];

beforeEach(() => {
  process.env['NEXT_PUBLIC_API_BASE_URL'] = 'https://api.example.com';
  detectBlurMock.mockResolvedValue({ isBlurry: false, varianceScore: 500 });
  URL.createObjectURL = vi.fn(() => 'blob:mock');
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  if (originalEnv === undefined) {
    delete process.env['NEXT_PUBLIC_API_BASE_URL'];
  } else {
    process.env['NEXT_PUBLIC_API_BASE_URL'] = originalEnv;
  }
});

function files(n: number): File[] {
  return Array.from({ length: n }, (_, i) => new File(['x'], `g${i}.jpg`, { type: 'image/jpeg' }));
}

async function drop(files: File[]): Promise<void> {
  const input = screen.getByLabelText(/seleccionar fotos/i);
  await userEvent.upload(input, files);
}

describe('GarmentBatchUploader — concurrency ceiling', () => {
  it(`caps simultaneous uploads at VISION_CONFIG.maxConcurrentUploads (${VISION_CONFIG.maxConcurrentUploads}) and queues the rest`, async () => {
    // Hold every upload pending so we can observe the mid-flight active/queued split.
    server.use(
      http.post('*/api/v1/garments/upload', async () => {
        await delay('infinite');
        return HttpResponse.json(garmentFixture);
      })
    );

    renderWithProviders(<GarmentBatchUploader />);
    await drop(files(VISION_CONFIG.maxConcurrentUploads + 3));

    await waitFor(() => {
      const queuedCards = screen.getAllByText(/en cola/i);
      expect(queuedCards).toHaveLength(3);
    });
    expect(screen.getAllByText(/analizando tu prenda/i)).toHaveLength(
      VISION_CONFIG.maxConcurrentUploads
    );
  });

  it('one failed upload does not stall the rest of the queue — each item settles independently', async () => {
    let call = 0;
    server.use(
      http.post('*/api/v1/garments/upload', () => {
        call += 1;
        // The very first request in the batch fails; every other one succeeds.
        return call === 1
          ? HttpResponse.json({ message: 'boom' }, { status: 500 })
          : HttpResponse.json(garmentFixture);
      })
    );

    renderWithProviders(<GarmentBatchUploader />);
    await drop(files(VISION_CONFIG.maxConcurrentUploads + 2));

    // One item ends in error...
    await waitFor(() => expect(screen.getByText(/error al subir/i)).toBeInTheDocument());
    // ...while the rest reach the editable review state, including the ones that were queued.
    await waitFor(() => {
      expect(screen.getAllByDisplayValue('shirt')).toHaveLength(
        VISION_CONFIG.maxConcurrentUploads + 1
      );
    });
    expect(screen.queryByText(/en cola/i)).not.toBeInTheDocument();
  });

  it('a single successful upload can be confirmed', async () => {
    renderWithProviders(<GarmentBatchUploader />);
    await drop(files(1));

    await screen.findByDisplayValue('shirt');
    await userEvent.click(screen.getByRole('button', { name: /confirmar/i }));

    expect(await screen.findByText('Confirmada')).toBeInTheDocument();
  });
});
