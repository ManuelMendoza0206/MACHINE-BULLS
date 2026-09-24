import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GarmentDropzone } from '@/features/garments/components/GarmentDropzone';

const file = (name: string): File => new File(['x'], name, { type: 'image/jpeg' });

function makeDataTransfer(files: File[]): DataTransfer {
  return {
    files,
    items: files.map(f => ({ kind: 'file', type: f.type, getAsFile: () => f })),
    types: ['Files'],
  } as unknown as DataTransfer;
}

describe('GarmentDropzone', () => {
  it('calls onFilesSelected with every dropped image file', () => {
    const onFilesSelected = vi.fn();
    render(<GarmentDropzone onFilesSelected={onFilesSelected} />);

    const dropzone = screen.getByRole('button');
    const files = [file('a.jpg'), file('b.jpg')];
    const dataTransfer = makeDataTransfer(files);

    // jsdom's Event has no `dataTransfer`; attach it before dispatch.
    const dropEvent = new Event('drop', { bubbles: true, cancelable: true }) as DragEvent & {
      dataTransfer: DataTransfer;
    };
    Object.defineProperty(dropEvent, 'dataTransfer', { value: dataTransfer });
    dropzone.dispatchEvent(dropEvent);

    expect(onFilesSelected).toHaveBeenCalledWith(files);
  });

  it('selecting via the hidden file input calls onFilesSelected too', async () => {
    const user = userEvent.setup();
    const onFilesSelected = vi.fn();
    render(<GarmentDropzone onFilesSelected={onFilesSelected} />);

    const input = screen.getByLabelText(/seleccionar fotos/i);
    const files = [file('c.jpg')];
    await user.upload(input, files);

    expect(onFilesSelected).toHaveBeenCalledWith(files);
  });

  it('is comfortably above the 44px minimum touch target', () => {
    render(<GarmentDropzone onFilesSelected={vi.fn()} />);
    // min-h-32 = 8rem = 128px, well over the 44px accessibility floor.
    expect(screen.getByRole('button').className).toMatch(/min-h-32/);
  });

  it('does not call onFilesSelected when disabled', async () => {
    const user = userEvent.setup();
    const onFilesSelected = vi.fn();
    render(<GarmentDropzone onFilesSelected={onFilesSelected} disabled />);

    await user.click(screen.getByRole('button'));
    expect(onFilesSelected).not.toHaveBeenCalled();
  });
});
