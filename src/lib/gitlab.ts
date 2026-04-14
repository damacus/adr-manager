import { Adr, AdrStatus } from '../types';
import { generateMadr } from './madr';

const GITLAB_API = 'https://gitlab.com/api/v4';
const ADR_STATUSES: readonly AdrStatus[] = ['proposed', 'accepted', 'rejected', 'deprecated', 'superseded', 'unknown'];

const parseAdrStatus = (status: string | undefined): AdrStatus => {
  const normalizedStatus = status?.trim().toLowerCase();
  return ADR_STATUSES.includes(normalizedStatus as AdrStatus) ? (normalizedStatus as AdrStatus) : 'unknown';
};

export const getGitLabAuthUrl = (clientId: string, redirectUri: string, codeChallenge: string) => {
  return `https://gitlab.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=adr-manager&scope=api&code_challenge=${codeChallenge}&code_challenge_method=S256`;
};

export const exchangeCodeForToken = async (clientId: string, redirectUri: string, code: string, codeVerifier: string) => {
  const res = await fetch('https://gitlab.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id: clientId,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code_verifier: codeVerifier
    })
  });
  
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Failed to exchange code for token: ${err.error_description || err.error || res.statusText}`);
  }
  
  return await res.json();
};

export const fetchAdrs = async (token: string, repo: string, branch: string, dir: string): Promise<Adr[]> => {
  const encodedRepo = encodeURIComponent(repo);
  const res = await fetch(`${GITLAB_API}/projects/${encodedRepo}/repository/tree?path=${dir}&ref=${branch}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`[${res.status}] Failed to fetch ADRs. Ensure the repository exists and the token has access.`);
  const files = await res.json();
  
  if (!Array.isArray(files)) {
    throw new Error('Invalid response from GitLab API: expected an array of files. Check your repository name and path.');
  }
  
  const mdFiles = files.filter((f: any) => f.name.endsWith('.md') && f.type === 'blob');
  
  // Fetch details for all ADRs in parallel
  const adrsWithDetails = await Promise.all(
    mdFiles.map(async (f: any) => {
      const id = f.name.replace('.md', '');
      try {
        const details = await fetchAdrDetails(token, repo, branch, dir, id);
        return {
          id,
          title: f.name.replace('.md', '').replace(/-/g, ' '),
          status: parseAdrStatus(details.status),
          date: details.date,
          author: details.author,
          context: details.context,
          decision: details.decision,
          consequences: details.consequences,
          url: `https://gitlab.com/${repo}/-/blob/${branch}/${dir}/${f.name}`
        };
      } catch (e) {
        // Fallback if details fail to load
        return {
          id,
          title: f.name.replace('.md', '').replace(/-/g, ' '),
          status: 'unknown' as const,
          date: new Date().toISOString(),
          author: 'Unknown',
          context: '',
          decision: '',
          consequences: '',
          url: `https://gitlab.com/${repo}/-/blob/${branch}/${dir}/${f.name}`
        };
      }
    })
  );
  
  return adrsWithDetails;
};

export const fetchAdrDetails = async (token: string, repo: string, branch: string, dir: string, id: string) => {
  const encodedRepo = encodeURIComponent(repo);
  const fileName = `${dir}/${id}.md`;
  const encodedFile = encodeURIComponent(fileName);
  
  // Fetch file content and last commit in parallel
  const [fileRes, commitsRes] = await Promise.all([
    fetch(`${GITLAB_API}/projects/${encodedRepo}/repository/files/${encodedFile}?ref=${branch}`, {
      headers: { Authorization: `Bearer ${token}` }
    }),
    fetch(`${GITLAB_API}/projects/${encodedRepo}/repository/commits?path=${encodedFile}&ref_name=${branch}&per_page=1`, {
      headers: { Authorization: `Bearer ${token}` }
    })
  ]);

  if (!fileRes.ok) throw new Error(`[${fileRes.status}] Failed to fetch ADR details`);
  
  const data = await fileRes.json();
  const content = new TextDecoder().decode(Uint8Array.from(atob(data.content || ""), c => c.charCodeAt(0)));
  
  let author = 'Unknown';
  if (commitsRes.ok) {
    const commits = await commitsRes.json();
    if (commits && commits.length > 0) {
      author = commits[0].author_name;
    }
  }
  
  // MADR status is usually in the format "status: proposed" or "* Status: proposed"
  const statusMatch = content.match(/(?:^|\n)(?:\*\s*)?[Ss]tatus:\s*(.+)/i);
  const dateMatch = content.match(/(?:^|\n)(?:\*\s*)?[Dd]ate:\s*(.+)/i);
  
  const extractSection = (headerRegex: RegExp) => {
    const match = content.match(headerRegex);
    if (!match) return '';
    const startIndex = match.index! + match[0].length;
    const remaining = content.slice(startIndex);
    // Look for the next header (## or #) to know where this section ends
    const nextMatch = remaining.match(/\n#+\s/);
    if (nextMatch) {
      return remaining.slice(0, nextMatch.index).trim();
    }
    return remaining.trim();
  };

  return {
    status: parseAdrStatus(statusMatch?.[1]),
    date: dateMatch ? dateMatch[1].trim() : new Date().toISOString(),
    author,
    context: extractSection(/^##\s*(Context and Problem Statement|Context)\s*$/im),
    decision: extractSection(/^##\s*(Decision Outcome|Decision)\s*$/im),
    consequences: extractSection(/^###?\s*(Positive Consequences|Consequences)\s*$/im),
    rawContent: content
  };
};

export const createAdrMr = async (token: string, repo: string, branch: string, dir: string, title: string, content: any) => {
  const encodedRepo = encodeURIComponent(repo);
  const adrId = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const fileName = `${dir}/${adrId}.md`;
  const newBranch = `add-adr-${adrId}-${Date.now()}`;
  const markdown = generateMadr({ title, ...content });

  const branchRes = await fetch(`${GITLAB_API}/projects/${encodedRepo}/repository/branches`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ branch: newBranch, ref: branch })
  });
  if (!branchRes.ok) {
    const err = await branchRes.json();
    throw new Error(`Failed to create branch: ${err.message || JSON.stringify(err)}`);
  }

  const commitRes = await fetch(`${GITLAB_API}/projects/${encodedRepo}/repository/commits`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      branch: newBranch,
      commit_message: `docs: add ADR for ${title}`,
      actions: [{ action: 'create', file_path: fileName, content: markdown }]
    })
  });
  if (!commitRes.ok) {
    const err = await commitRes.json();
    throw new Error(`Failed to commit file: ${err.message || JSON.stringify(err)}`);
  }

  const mrRes = await fetch(`${GITLAB_API}/projects/${encodedRepo}/merge_requests`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source_branch: newBranch,
      target_branch: branch,
      title: `docs: add ADR for ${title}`,
      description: `This MR adds a new Architecture Decision Record:\n\n**${title}**\n\nCreated via ADR Manager.`,
      remove_source_branch: true
    })
  });
  if (!mrRes.ok) {
    const err = await mrRes.json();
    throw new Error(`Failed to create MR: ${err.message || JSON.stringify(err)}`);
  }

  return await mrRes.json();
};
