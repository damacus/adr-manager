import { Adr } from '../types';

export function generateMadr(adr: Partial<Adr>): string {
  const date = new Date().toISOString().split('T')[0];
  const title = adr.title || 'Untitled';
  const status = adr.status || 'proposed';
  const context = adr.context || '';
  const decision = adr.decision || '';
  const consequences = adr.consequences || '';

  return `---
# These are optional elements. Feel free to remove any of them.
status: ${status}
date: ${date}
# deciders: 
# consults: 
# informs: 
---
# ${title}

## Context and Problem Statement

${context}

## Decision Drivers

<!-- optional -->

## Considered Options

<!-- optional -->

## Decision Outcome

Chosen option: "${decision}", because it comes out best (see below).

### Positive Consequences

${consequences}

### Negative Consequences

<!-- optional -->

## Pros and Cons of the Options

<!-- optional -->
`;
}
