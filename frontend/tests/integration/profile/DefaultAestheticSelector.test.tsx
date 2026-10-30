import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DefaultAestheticSelector } from '@/features/profile/components/DefaultAestheticSelector';

const aesthetics = ['old_money', 'streetwear', 'gorpcore'];

describe('DefaultAestheticSelector', () => {
  it('selecting an option calls onChange with the chosen value', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DefaultAestheticSelector value={null} onChange={onChange} availableAesthetics={aesthetics} />
    );

    await user.selectOptions(screen.getByLabelText(/estética por defecto/i), 'streetwear');

    expect(onChange).toHaveBeenCalledWith('streetwear');
  });

  it('selecting "Sin preferencia" calls onChange with null (de-select)', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DefaultAestheticSelector
        value="old_money"
        onChange={onChange}
        availableAesthetics={aesthetics}
      />
    );

    await user.selectOptions(screen.getByLabelText(/estética por defecto/i), 'Sin preferencia');

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('reflects the current value as the selected option', () => {
    render(
      <DefaultAestheticSelector
        value="gorpcore"
        onChange={vi.fn()}
        availableAesthetics={aesthetics}
      />
    );

    expect(screen.getByLabelText(/estética por defecto/i)).toHaveValue('gorpcore');
  });
});
