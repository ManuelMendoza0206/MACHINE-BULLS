import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProfileHeader } from '@/features/profile/components/ProfileHeader';

describe('ProfileHeader', () => {
  it('renders name, email, and a formatted "Miembro desde" date from a known ISO fixture', () => {
    render(
      <ProfileHeader
        name="Ana García"
        email="ana@example.com"
        createdAt="2026-09-15T00:00:00.000Z"
      />
    );

    expect(screen.getByRole('heading', { name: 'Ana García' })).toBeInTheDocument();
    expect(screen.getByText('ana@example.com')).toBeInTheDocument();
    expect(screen.getByText(/miembro desde septiembre de 2026/i)).toBeInTheDocument();
  });

  it('exposes no edit control for name or email (read-only, gap §6.1)', () => {
    render(
      <ProfileHeader name="Ana" email="ana@example.com" createdAt="2026-01-01T00:00:00.000Z" />
    );

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
