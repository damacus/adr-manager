import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdrList } from './AdrList';

const { createAdrStatusUpdateMr, fetchAdrDetails } = vi.hoisted(() => ({
  createAdrStatusUpdateMr: vi.fn(),
  fetchAdrDetails: vi.fn(),
}));

vi.mock('../lib/gitlab', () => ({
  createAdrStatusUpdateMr,
  fetchAdrDetails,
}));

const adrs = [
  {
    id: '001-use-vite',
    title: 'Use Vite',
    status: 'accepted' as const,
    date: '2026-04-01T00:00:00.000Z',
    author: 'Alice',
    context: 'Need a lightweight frontend toolchain.',
    decision: 'Adopt Vite for local development and builds.',
    consequences: 'Faster startup.',
    url: 'https://example.com/001',
  },
  {
    id: '002-use-forks',
    title: 'Use Forks for Contributions',
    status: 'proposed' as const,
    date: '2026-04-02T00:00:00.000Z',
    author: 'Bob',
    context: 'External contributors need a safe contribution path.',
    decision: 'Support contribution via forks.',
    consequences: 'More setup work.',
    url: 'https://example.com/002',
  },
];

describe('AdrList', () => {
  beforeEach(() => {
    createAdrStatusUpdateMr.mockReset();
    fetchAdrDetails.mockReset();
  });

  it('filters ADRs by search query', async () => {
    const user = userEvent.setup();

    render(
      <AdrList
        adrs={adrs}
        onCreateNew={vi.fn()}
        token="token"
        repoName="group/project"
        repoBranch="main"
        adrDir="docs/adr"
      />
    );

    await user.type(
      screen.getByRole('searchbox', { name: /search adrs/i }),
      'forks'
    );

    expect(screen.getByText('Use Forks for Contributions')).toBeInTheDocument();
    expect(screen.queryByText('Use Vite')).not.toBeInTheDocument();
  });

  it('filters ADRs by status', async () => {
    const user = userEvent.setup();

    render(
      <AdrList
        adrs={adrs}
        onCreateNew={vi.fn()}
        token="token"
        repoName="group/project"
        repoBranch="main"
        adrDir="docs/adr"
      />
    );

    await user.click(screen.getByRole('button', { name: 'Proposed' }));

    expect(screen.getByText('Use Forks for Contributions')).toBeInTheDocument();
    expect(screen.queryByText('Use Vite')).not.toBeInTheDocument();
  });

  it('shows a no matches state when filters exclude all ADRs', async () => {
    const user = userEvent.setup();

    render(
      <AdrList
        adrs={adrs}
        onCreateNew={vi.fn()}
        token="token"
        repoName="group/project"
        repoBranch="main"
        adrDir="docs/adr"
      />
    );

    await user.type(
      screen.getByRole('searchbox', { name: /search adrs/i }),
      'does-not-exist'
    );

    expect(screen.getByText('No matching ADRs')).toBeInTheDocument();
  });

  it('creates a status update merge request from the expanded ADR view', async () => {
    const user = userEvent.setup();

    fetchAdrDetails.mockResolvedValue({
      ...adrs[0],
      rawContent: `---\nstatus: accepted\ndate: 2026-04-01\n---\n# Use Vite\n`,
    });
    createAdrStatusUpdateMr.mockResolvedValue({ web_url: 'https://gitlab.com/mr/5' });

    render(
      <AdrList
        adrs={adrs}
        onCreateNew={vi.fn()}
        token="token"
        repoName="group/project"
        repoBranch="main"
        adrDir="docs/adr"
      />
    );

    await user.click(screen.getByText('Use Vite'));
    await user.selectOptions(screen.getByLabelText('Update status'), 'deprecated');
    await user.click(screen.getByRole('button', { name: 'Create status update MR' }));

    expect(createAdrStatusUpdateMr).toHaveBeenCalledWith(
      'token',
      'group/project',
      'main',
      'docs/adr',
      '001-use-vite',
      'Use Vite',
      expect.stringContaining('status: accepted'),
      'deprecated'
    );

    expect(await screen.findByText('View created merge request')).toBeInTheDocument();
  });

  it('hides status editing controls when disabled', async () => {
    const user = userEvent.setup();

    fetchAdrDetails.mockResolvedValue({
      ...adrs[0],
      rawContent: `---\nstatus: accepted\ndate: 2026-04-01\n---\n# Use Vite\n`,
    });

    render(
      <AdrList
        adrs={adrs}
        onCreateNew={vi.fn()}
        token="token"
        repoName="group/project"
        repoBranch="main"
        adrDir="docs/adr"
        statusEditingEnabled={false}
      />
    );

    await user.click(screen.getByText('Use Vite'));

    expect(screen.queryByLabelText('Update status')).not.toBeInTheDocument();
  });

  it('supports preview-only status changes without creating a merge request', async () => {
    const user = userEvent.setup();

    fetchAdrDetails.mockResolvedValue({
      ...adrs[0],
      rawContent: `---\nstatus: accepted\ndate: 2026-04-01\n---\n# Use Vite\n`,
    });

    render(
      <AdrList
        adrs={adrs}
        onCreateNew={vi.fn()}
        token="token"
        repoName="group/project"
        repoBranch="main"
        adrDir="docs/adr"
        statusEditingPreviewOnly
      />
    );

    await user.click(screen.getByText('Use Vite'));
    await user.selectOptions(screen.getByLabelText('Update status'), 'deprecated');
    await user.click(screen.getByRole('button', { name: 'Preview status change' }));

    expect(createAdrStatusUpdateMr).not.toHaveBeenCalled();
    expect(await screen.findByText('Preview updated. The status badge now reflects your selected value.')).toBeInTheDocument();
  });

  it('reuses cached ADR details when re-expanding the same ADR', async () => {
    const user = userEvent.setup();

    fetchAdrDetails.mockResolvedValue({
      ...adrs[0],
      rawContent: `---\nstatus: accepted\ndate: 2026-04-01\n---\n# Use Vite\n`,
    });

    render(
      <AdrList
        adrs={adrs}
        onCreateNew={vi.fn()}
        token="token"
        repoName="group/project"
        repoBranch="main"
        adrDir="docs/adr"
      />
    );

    await user.click(screen.getByText('Use Vite'));
    await screen.findByLabelText('Update status');
    await user.click(screen.getByText('Use Vite'));
    await user.click(screen.getByText('Use Vite'));

    expect(fetchAdrDetails).toHaveBeenCalledTimes(1);
  });

  it('shows an inline error when status update MR creation fails', async () => {
    const user = userEvent.setup();

    fetchAdrDetails.mockResolvedValue({
      ...adrs[0],
      rawContent: `---\nstatus: accepted\ndate: 2026-04-01\n---\n# Use Vite\n`,
    });
    createAdrStatusUpdateMr.mockRejectedValue(new Error('Failed to create MR.'));

    render(
      <AdrList
        adrs={adrs}
        onCreateNew={vi.fn()}
        token="token"
        repoName="group/project"
        repoBranch="main"
        adrDir="docs/adr"
      />
    );

    await user.click(screen.getByText('Use Vite'));
    await user.selectOptions(screen.getByLabelText('Update status'), 'deprecated');
    await user.click(screen.getByRole('button', { name: 'Create status update MR' }));

    expect(await screen.findByText('Failed to create MR.')).toBeInTheDocument();
  });
});
