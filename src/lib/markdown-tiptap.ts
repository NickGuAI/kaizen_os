/**
 * Bidirectional Markdown <-> TipTap JSON converter
 *
 * Converts between markdown (for agent consumption) and TipTap JSON (for editor/database)
 */

// TipTap document types
export interface TipTapMark {
  type: 'bold' | 'italic' | 'code' | 'link' | 'strike'
  attrs?: { href?: string; target?: string }
}

export interface TipTapTextNode {
  type: 'text'
  text: string
  marks?: TipTapMark[]
}

export interface TipTapHardBreak {
  type: 'hardBreak'
}

export type TipTapInlineContent = TipTapTextNode | TipTapHardBreak

export interface TipTapParagraph {
  type: 'paragraph'
  content?: TipTapInlineContent[]
}

export interface TipTapHeading {
  type: 'heading'
  attrs: { level: 1 | 2 | 3 | 4 | 5 | 6 }
  content?: TipTapInlineContent[]
}

export interface TipTapCodeBlock {
  type: 'codeBlock'
  attrs?: { language?: string }
  content?: TipTapTextNode[]
}

export interface TipTapBlockquote {
  type: 'blockquote'
  content?: TipTapBlockNode[]
}

export interface TipTapListItem {
  type: 'listItem'
  content?: TipTapBlockNode[]
}

export interface TipTapBulletList {
  type: 'bulletList'
  content?: TipTapListItem[]
}

export interface TipTapOrderedList {
  type: 'orderedList'
  attrs?: { start?: number }
  content?: TipTapListItem[]
}

export interface TipTapHorizontalRule {
  type: 'horizontalRule'
}

export type TipTapBlockNode =
  | TipTapParagraph
  | TipTapHeading
  | TipTapCodeBlock
  | TipTapBlockquote
  | TipTapBulletList
  | TipTapOrderedList
  | TipTapHorizontalRule

export interface TipTapDoc {
  type: 'doc'
  content?: TipTapBlockNode[]
}

/**
 * Convert TipTap JSON document to Markdown
 */
export function tiptapToMarkdown(doc: TipTapDoc): string {
  if (!doc.content || doc.content.length === 0) return ''

  const lines: string[] = []

  for (const node of doc.content) {
    const markdown = blockNodeToMarkdown(node)
    if (markdown !== null) {
      lines.push(markdown)
    }
  }

  return lines.join('\n\n')
}

function blockNodeToMarkdown(node: TipTapBlockNode): string | null {
  switch (node.type) {
    case 'paragraph':
      return inlineContentToMarkdown(node.content)

    case 'heading': {
      const prefix = '#'.repeat(node.attrs.level)
      const text = inlineContentToMarkdown(node.content)
      return `${prefix} ${text}`
    }

    case 'codeBlock': {
      const lang = node.attrs?.language || ''
      const code = node.content?.map(n => n.text).join('') || ''
      return '```' + lang + '\n' + code + '\n```'
    }

    case 'blockquote': {
      const inner = node.content?.map(n => blockNodeToMarkdown(n)).filter(Boolean).join('\n\n') || ''
      return inner.split('\n').map(line => `> ${line}`).join('\n')
    }

    case 'bulletList': {
      return listToMarkdown(node.content || [], false)
    }

    case 'orderedList': {
      return listToMarkdown(node.content || [], true, node.attrs?.start || 1)
    }

    case 'horizontalRule':
      return '---'

    default:
      return null
  }
}

function listToMarkdown(items: TipTapListItem[], ordered: boolean, start = 1): string {
  return items.map((item, index) => {
    const prefix = ordered ? `${start + index}. ` : '- '
    const content = item.content?.map(n => blockNodeToMarkdown(n)).filter(Boolean).join('\n') || ''
    // Indent continuation lines for multi-line list items
    const lines = content.split('\n')
    return prefix + lines[0] + (lines.length > 1 ? '\n' + lines.slice(1).map(l => '  ' + l).join('\n') : '')
  }).join('\n')
}

function inlineContentToMarkdown(content?: TipTapInlineContent[]): string {
  if (!content) return ''

  return content.map(node => {
    if (node.type === 'hardBreak') return '\n'
    if (node.type !== 'text') return ''

    let text = node.text

    if (node.marks) {
      for (const mark of node.marks) {
        switch (mark.type) {
          case 'bold':
            text = `**${text}**`
            break
          case 'italic':
            text = `*${text}*`
            break
          case 'code':
            text = `\`${text}\``
            break
          case 'strike':
            text = `~~${text}~~`
            break
          case 'link':
            text = `[${text}](${mark.attrs?.href || ''})`
            break
        }
      }
    }

    return text
  }).join('')
}

/**
 * Convert Markdown to TipTap JSON document
 */
export function markdownToTiptap(markdown: string): TipTapDoc {
  const lines = markdown.split('\n')
  const content: TipTapBlockNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Empty line - skip (paragraph separation)
    if (line.trim() === '') {
      i++
      continue
    }

    // Code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      i++ // Skip closing ```
      content.push({
        type: 'codeBlock',
        attrs: lang ? { language: lang } : undefined,
        content: codeLines.length > 0 ? [{ type: 'text', text: codeLines.join('\n') }] : undefined,
      })
      continue
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/)
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3 | 4 | 5 | 6
      const text = headingMatch[2]
      content.push({
        type: 'heading',
        attrs: { level },
        content: parseInlineContent(text),
      })
      i++
      continue
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      content.push({ type: 'horizontalRule' })
      i++
      continue
    }

    // Blockquote
    if (line.startsWith('>')) {
      const quoteLines: string[] = []
      while (i < lines.length && (lines[i].startsWith('>') || (lines[i].trim() !== '' && quoteLines.length > 0 && !lines[i].match(/^[#\-*\d]/)))) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''))
        i++
      }
      const innerDoc = markdownToTiptap(quoteLines.join('\n'))
      content.push({
        type: 'blockquote',
        content: innerDoc.content || [],
      })
      continue
    }

    // Bullet list
    if (/^[-*+]\s/.test(line)) {
      const items: TipTapListItem[] = []
      while (i < lines.length && /^[-*+]\s/.test(lines[i])) {
        const itemText = lines[i].replace(/^[-*+]\s/, '')
        items.push({
          type: 'listItem',
          content: [{
            type: 'paragraph',
            content: parseInlineContent(itemText),
          }],
        })
        i++
      }
      content.push({ type: 'bulletList', content: items })
      continue
    }

    // Ordered list
    const orderedMatch = line.match(/^(\d+)\.\s(.*)$/)
    if (orderedMatch) {
      const items: TipTapListItem[] = []
      const startNum = parseInt(orderedMatch[1], 10)
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        const itemText = lines[i].replace(/^\d+\.\s/, '')
        items.push({
          type: 'listItem',
          content: [{
            type: 'paragraph',
            content: parseInlineContent(itemText),
          }],
        })
        i++
      }
      content.push({
        type: 'orderedList',
        attrs: startNum !== 1 ? { start: startNum } : undefined,
        content: items,
      })
      continue
    }

    // Regular paragraph
    const paragraphLines: string[] = [line]
    i++
    // Collect continuation lines (non-empty, non-special)
    while (i < lines.length &&
           lines[i].trim() !== '' &&
           !lines[i].startsWith('#') &&
           !lines[i].startsWith('```') &&
           !lines[i].startsWith('>') &&
           !/^[-*+]\s/.test(lines[i]) &&
           !/^\d+\.\s/.test(lines[i]) &&
           !/^(-{3,}|\*{3,}|_{3,})$/.test(lines[i].trim())) {
      paragraphLines.push(lines[i])
      i++
    }

    // Join with special marker for hard breaks (lines ending with \\ or two spaces)
    content.push({
      type: 'paragraph',
      content: parseInlineContentWithBreaks(paragraphLines),
    })
  }

  // Ensure at least one empty paragraph for empty content
  if (content.length === 0) {
    content.push({ type: 'paragraph' })
  }

  return { type: 'doc', content }
}

/**
 * Parse multiple paragraph lines, handling hard breaks (lines ending with \\ or two spaces)
 */
function parseInlineContentWithBreaks(lines: string[]): TipTapInlineContent[] | undefined {
  if (lines.length === 0) return undefined

  const content: TipTapInlineContent[] = []

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]
    const isLastLine = i === lines.length - 1

    // Check for hard break markers: trailing \\ or two+ spaces
    const hasHardBreak = !isLastLine && (line.endsWith('\\') || line.endsWith('  '))

    // Remove hard break marker from line
    if (line.endsWith('\\')) {
      line = line.slice(0, -1)
    } else if (line.endsWith('  ')) {
      line = line.trimEnd()
    }

    // Parse inline content for this line
    const lineContent = parseInlineContent(line)
    if (lineContent) {
      content.push(...lineContent)
    }

    // Add hard break or space between lines
    if (!isLastLine) {
      if (hasHardBreak) {
        content.push({ type: 'hardBreak' })
      } else {
        // Normal line continuation - add space
        content.push({ type: 'text', text: ' ' })
      }
    }
  }

  return content.length > 0 ? content : undefined
}

function parseInlineContent(text: string): TipTapInlineContent[] | undefined {
  if (!text) return undefined

  const content: TipTapInlineContent[] = []

  // Regex patterns for inline elements
  const patterns: Array<{ regex: RegExp; type: TipTapMark['type']; group: number; hrefGroup?: number }> = [
    { regex: /\*\*(.+?)\*\*/g, type: 'bold', group: 1 },
    { regex: /__(.+?)__/g, type: 'bold', group: 1 },
    { regex: /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, type: 'italic', group: 1 },
    { regex: /(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, type: 'italic', group: 1 },
    { regex: /~~(.+?)~~/g, type: 'strike', group: 1 },
    { regex: /`([^`]+)`/g, type: 'code', group: 1 },
    { regex: /\[([^\]]+)\]\(([^)]+)\)/g, type: 'link', group: 1, hrefGroup: 2 },
  ]

  // Simple approach: find and replace inline marks
  // For complex nested marks, a proper parser would be needed
  // This handles common cases

  let lastIndex = 0
  const segments: Array<{ start: number; end: number; text: string; marks: TipTapMark[] }> = []

  // Find all matches for all patterns
  for (const pattern of patterns) {
    const regex = new RegExp(pattern.regex.source, 'g')
    let match
    while ((match = regex.exec(text)) !== null) {
      const marks: TipTapMark[] = pattern.type === 'link'
        ? [{ type: 'link', attrs: { href: match[pattern.hrefGroup!] } }]
        : [{ type: pattern.type }]

      segments.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[pattern.group],
        marks,
      })
    }
  }

  // Sort segments by start position
  segments.sort((a, b) => a.start - b.start)

  // Remove overlapping segments (keep first)
  const nonOverlapping: typeof segments = []
  for (const seg of segments) {
    const overlaps = nonOverlapping.some(s =>
      (seg.start >= s.start && seg.start < s.end) ||
      (seg.end > s.start && seg.end <= s.end)
    )
    if (!overlaps) {
      nonOverlapping.push(seg)
    }
  }

  // Build content from segments
  lastIndex = 0
  for (const seg of nonOverlapping) {
    // Add plain text before this segment
    if (seg.start > lastIndex) {
      const plainText = text.slice(lastIndex, seg.start)
      if (plainText) {
        content.push({ type: 'text', text: plainText })
      }
    }
    // Add marked text
    content.push({ type: 'text', text: seg.text, marks: seg.marks })
    lastIndex = seg.end
  }

  // Add remaining plain text
  if (lastIndex < text.length) {
    const plainText = text.slice(lastIndex)
    if (plainText) {
      content.push({ type: 'text', text: plainText })
    }
  }

  return content.length > 0 ? content : undefined
}
