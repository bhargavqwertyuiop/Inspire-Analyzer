export interface SubjectLine {
  channel: string;
  text: string;
}

export interface TemplateData {
  id: string;
  name: string;
  rawContent: string;
  subjects: SubjectLine[];
  conditions: string[];
  variables: string[];
  textBlocks: string[];
}

export const parseTemplate = async (file: File): Promise<TemplateData> => {
  const text = await file.text();
  
  const subjects: SubjectLine[] = [];
  const conditions: string[] = [];
  const variables = new Set<string>();
  const textBlocks: string[] = [];

  // 1. Extract Subjects
  const hasEmail = /<Email/i.test(text) || file.name.toLowerCase().includes('email');
  const hasInbox = /<Inbox/i.test(text) || file.name.toLowerCase().includes('inbox');
  const defaultChannel = hasEmail ? 'Email' : (hasInbox ? 'Inbox' : 'Paper');

  // Look for <Subject>...</Subject> or <EmailSubject>...</EmailSubject>
  const subjectRegex = /<([a-zA-Z]*Subject|Subject)[^>]*>(.*?)<\/\1>/gi;
  let match;
  while ((match = subjectRegex.exec(text)) !== null) {
    const tagName = match[1].toLowerCase();
    const channel = tagName.includes('email') ? 'Email' : 
                    tagName.includes('inbox') ? 'Inbox' : 
                    (tagName === 'subject' ? defaultChannel : 'Paper');
    subjects.push({ channel, text: match[2].trim() });
  }
  
  // Also look for subject="..."
  const subjectAttrRegex = /subject\s*=\s*["']([^"']+)["']/gi;
  while ((match = subjectAttrRegex.exec(text)) !== null) {
    const channel = (defaultChannel === 'Email' || defaultChannel === 'Inbox') ? defaultChannel : 'Email';
    subjects.push({ channel, text: match[1].trim() });
  }

  // 2. Extract Conditions
  // Focus specifically on IF and ELSE IF patterns as requested
  // Capture IF/ELSE IF followed by either (parentheses) or a block of text until a tag, newline, or brace
  const combinedIfRegex = /\b(IF|ELSE IF)\b\s*(?:\((.*?)\)|([^<\n{]+))/gi;
  while ((match = combinedIfRegex.exec(text)) !== null) {
    const keyword = match[1];
    const condition = (match[2] || match[3]).trim();
    if (condition && condition.length > 1) {
      conditions.push(`${keyword} ${condition}`);
    }
  }

  // 3. Extract Variables (Heuristic: ${var}, %var%, <Data>var</Data>, [var], [[var]], <variable name="var"/>)
  const varRegex1 = /\$\{([a-zA-Z0-9_]+)\}/g;
  while ((match = varRegex1.exec(text)) !== null) variables.add(match[1]);
  
  const varRegex2 = /%([a-zA-Z0-9_]+)%/g;
  while ((match = varRegex2.exec(text)) !== null) variables.add(match[1]);

  const varRegex3 = /<Data[^>]*>([a-zA-Z0-9_]+)<\/Data>/gi;
  while ((match = varRegex3.exec(text)) !== null) variables.add(match[1]);

  const varRegex4 = /\[\[([a-zA-Z0-9_]+)\]\]/g;
  while ((match = varRegex4.exec(text)) !== null) variables.add(match[1]);

  const varRegex5 = /\[([a-zA-Z0-9_]+)\]/g;
  while ((match = varRegex5.exec(text)) !== null) {
    // Avoid matching common bracketed text by ensuring it looks like a variable
    if (match[1].length > 1 && !/^\d+$/.test(match[1])) {
      variables.add(match[1]);
    }
  }

  const varRegex6 = /<variable\s+name=["']([a-zA-Z0-9_]+)["']/gi;
  while ((match = varRegex6.exec(text)) !== null) variables.add(match[1]);

  // 4. Text blocks (strip XML tags)
  const textBlockRegex = />([^<]+)</g;
  while ((match = textBlockRegex.exec(text)) !== null) {
    const block = match[1].trim();
    if (block.length > 0) {
      textBlocks.push(block);
    }
  }

  return {
    id: Math.random().toString(36).substring(2, 9),
    name: file.name,
    rawContent: text,
    subjects,
    conditions: Array.from(new Set(conditions)),
    variables: Array.from(variables),
    textBlocks
  };
};
