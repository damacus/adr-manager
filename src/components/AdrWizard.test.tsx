import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AdrWizard } from './AdrWizard';

const { createAdrMr } = vi.hoisted(() => ({
  createAdrMr: vi.fn(),
}));

vi.mock('../lib/gitlab', () => ({
  createAdrMr,
}));

describe('AdrWizard', () => {
  it('enforces step validation and submits the ADR', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();

    createAdrMr.mockResolvedValue({ web_url: 'https://gitlab.com/mr/1' });

    render(
      <AdrWizard
        onCancel={vi.fn()}
        onComplete={onComplete}
        token="token-123"
        repoName="group/project"
        repoBranch="main"
        adrDir="docs/adr"
      />
    );

    const nextButton = screen.getByRole('button', { name: /next/i });
    expect(nextButton).toBeDisabled();

    await user.type(screen.getByPlaceholderText(/use react for the frontend/i), 'Use Vite');
    expect(nextButton).toBeEnabled();
    await user.click(nextButton);

    const stepTwoNextButton = await screen.findByRole('button', { name: /next/i });
    expect(stepTwoNextButton).toBeDisabled();

    await screen.findByText(/context & decision/i);
    const stepTwoTextareas = Array.from(document.querySelectorAll('textarea'));
    expect(stepTwoTextareas).toHaveLength(2);
    await user.type(stepTwoTextareas[1], 'Adopt Vite for development.');
    expect(stepTwoNextButton).toBeEnabled();
    await user.click(stepTwoNextButton);

    await screen.findByText(/consequences & publish/i);
    const stepThreeTextarea = document.querySelector('textarea');
    expect(stepThreeTextarea).not.toBeNull();
    await user.type(stepThreeTextarea!, 'Faster startup and HMR.');
    await user.click(screen.getByRole('button', { name: /create mr/i }));

    await waitFor(() => {
      expect(createAdrMr).toHaveBeenCalledWith(
        'token-123',
        'group/project',
        'main',
        'docs/adr',
        'Use Vite',
        expect.objectContaining({
          title: 'Use Vite',
          decision: 'Adopt Vite for development.',
          consequences: 'Faster startup and HMR.',
        })
      );
    });

    expect(onComplete).toHaveBeenCalled();
  });
});
