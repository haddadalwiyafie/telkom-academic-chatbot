import { Citation } from '../services/api';

export const formatCitations = (citations: Citation[]): string => {
  if (!citations.length) return '';

  // Group by title + doc_number
  const grouped: Record<string, { title: string; doc_number: string; pages: number[] }> = {};
  for (const c of citations) {
    const key = `${c.title}||${c.doc_number || ''}`;
    if (!grouped[key]) grouped[key] = { title: c.title, doc_number: c.doc_number || '', pages: [] };
    if (c.page != null && !grouped[key].pages.includes(c.page)) {
      grouped[key].pages.push(c.page);
    }
  }

  const lines = Object.values(grouped).map((g) => {
    const pages = g.pages.sort((a, b) => a - b);
    const docPart = g.doc_number ? ` (${g.doc_number})` : '';
    const pagePart = pages.length ? ` — Hal. ${pages.join(', ')}` : '';
    return `- **${g.title}**${docPart}${pagePart}`;
  });

  return '\n\n---\n**Sumber:**\n' + lines.join('\n');
};
