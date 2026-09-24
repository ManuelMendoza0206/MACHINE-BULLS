import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../fixtures/msw/server';
import { renderWithProviders } from '../../utils/renderWithProviders';
import { GarmentAnalysisResult } from '@/features/garments/components/GarmentAnalysisResult';
import { detectBlur } from '@/lib/vision/detectBlur';
import garmentFixture from '../../fixtures/api/garmentUploadResponse.json';

vi.mock('@/lib/vision/detectBlur', () => ({ detectBlur: vi.fn() }));
const detectBlurMock = vi.mocked(detectBlur);

const originalEnv = process.env['NEXT_PUBLIC_API_BASE_URL'];

// jsdom doesn't implement these — add them to the real URL constructor (not a stub-replaced
// global) so `instanceof URL` / `new URL(...)` elsewhere keep working.
beforeEach(() => {
  process.env['NEXT_PUBLIC_API_BASE_URL'] = 'https://api.example.com';
  detectBlurMock.mockReset();
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

const file = new File(['x'], 'shirt.jpg', { type: 'image/jpeg' });

describe('GarmentAnalysisResult', () => {
  it('happy path: not blurry → uploads → shows editable result → confirm keeps detected values', async () => {
    detectBlurMock.mockResolvedValue({ isBlurry: false, varianceScore: 500 });
    const onConfirmed = vi.fn();
    const onSettled = vi.fn();

    renderWithProviders(
      <GarmentAnalysisResult file={file} onConfirmed={onConfirmed} onSettled={onSettled} />
    );

    await waitFor(() => expect(screen.getByDisplayValue('shirt')).toBeInTheDocument());
    expect(screen.getByText('old_money')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /confirmar/i }));

    expect(onConfirmed).toHaveBeenCalledWith(expect.objectContaining({ category: 'shirt' }));
    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  it('editing the category before confirming persists the edited value, not the detected one', async () => {
    detectBlurMock.mockResolvedValue({ isBlurry: false, varianceScore: 500 });
    const onConfirmed = vi.fn();

    renderWithProviders(
      <GarmentAnalysisResult file={file} onConfirmed={onConfirmed} onSettled={vi.fn()} />
    );

    const input = await screen.findByDisplayValue('shirt');
    await userEvent.clear(input);
    await userEvent.type(input, 'jacket');
    await userEvent.click(screen.getByRole('button', { name: /confirmar/i }));

    expect(onConfirmed).toHaveBeenCalledWith(expect.objectContaining({ category: 'jacket' }));
  });

  it('a blurry photo shows a non-blocking warning — submit is still available', async () => {
    detectBlurMock.mockResolvedValue({ isBlurry: true, varianceScore: 12 });

    renderWithProviders(
      <GarmentAnalysisResult file={file} onConfirmed={vi.fn()} onSettled={vi.fn()} />
    );

    expect(await screen.findByText(/foto borrosa/i)).toBeInTheDocument();
    const uploadAnyway = screen.getByRole('button', { name: /subir de todas formas/i });
    expect(uploadAnyway).toBeEnabled();

    await userEvent.click(uploadAnyway);
    await waitFor(() => expect(screen.getByDisplayValue('shirt')).toBeInTheDocument());
  });

  it('shows a typed error with a working retry, independent of other items', async () => {
    detectBlurMock.mockResolvedValue({ isBlurry: false, varianceScore: 500 });
    let attempt = 0;
    server.use(
      http.post('*/api/v1/garments/upload', () => {
        attempt += 1;
        return attempt === 1
          ? HttpResponse.json({ message: 'boom' }, { status: 500 })
          : HttpResponse.json(garmentFixture);
      })
    );

    renderWithProviders(
      <GarmentAnalysisResult file={file} onConfirmed={vi.fn()} onSettled={vi.fn()} />
    );

    await screen.findByRole('button', { name: /reintentar/i });
    await userEvent.click(screen.getByRole('button', { name: /reintentar/i }));

    await waitFor(() => expect(screen.getByDisplayValue('shirt')).toBeInTheDocument());
  });
});
