export const normalizeResponse = (text: string) => {
  let out = text.replace(/\\n/g, '\n');
  out = out.replace(/\\\[([\s\S]*?)\\\]/g, (_, inner) => `$$${inner}$$`);
  out = out.replace(/\\\(([\s\S]*?)\\\)/g, (_, inner) => `$${inner}$`);
  out = out.split('\n').map(line => {
    if (/^\$\$[\s\S]*?\$\$$/.test(line.trim())) return line;
    const blockMatch = line.match(/^(.*?)\[([^\[\]]*?\\[a-zA-Z]+[^\[\]]*?)\](.*)$/);
    if (blockMatch) {
      const [, before, inner, after] = blockMatch;
      const convertInline = (s: string) => s.replace(/\(([^()]*?\\[a-zA-Z]+[^()]*?)\)/g, (_, x) => `$${x}$`);
      return `${convertInline(before)}$$${inner}$$${convertInline(after)}`;
    }
    return line.replace(/\(([^()]*?\\[a-zA-Z]+[^()]*?)\)/g, (_, x) => `$${x}$`);
  }).join('\n');
  out = out.replace(/^[•·●▪▸◆]\s*/gm, '- ');
  const lines = out.split('\n');
  const merged: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed === '-') {
      let j = i + 1;
      while (j < lines.length && lines[j].trim() === '') j++;
      if (j < lines.length) { merged.push('- ' + lines[j].trim()); i = j; continue; }
    }
    merged.push(lines[i]);
  }
  const result: string[] = [];
  for (let i = 0; i < merged.length; i++) {
    const isEmpty = merged[i].trim() === '';
    const prevIsList = merged[i - 1]?.trim().startsWith('- ') ?? false;
    const nextIsList = merged[i + 1]?.trim().startsWith('- ') ?? false;
    if (isEmpty && prevIsList && nextIsList) continue;
    result.push(merged[i]);
  }
  return result.join('\n').replace(/\n{3,}/g, '\n\n');
};
