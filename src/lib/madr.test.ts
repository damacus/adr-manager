import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateMadr } from './madr';

describe('generateMadr', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-14T08:00:00.000Z'));
  });

  it('uses defaults when optional ADR fields are missing', () => {
    const markdown = generateMadr({});

    expect(markdown).toContain('status: proposed');
    expect(markdown).toContain('date: 2026-04-14');
    expect(markdown).toContain('# Untitled');
  });

  it('interpolates provided ADR content into the MADR template', () => {
    const markdown = generateMadr({
      title: 'Use Vite',
      status: 'accepted',
      relatedAdrId: 'adr-001',
      context: 'The current tooling is slow.',
      decision: 'Adopt Vite for local development.',
      consequences: 'Startup time drops significantly.',
    });

    expect(markdown).toContain('status: accepted');
    expect(markdown).toContain('informs: adr-001');
    expect(markdown).toContain('# Use Vite');
    expect(markdown).toContain('The current tooling is slow.');
    expect(markdown).toContain('Chosen option: "Adopt Vite for local development."');
    expect(markdown).toContain('Startup time drops significantly.');
  });
});
