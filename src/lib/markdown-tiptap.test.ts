import { describe, it, expect } from 'vitest'
import { tiptapToMarkdown, markdownToTiptap, TipTapDoc } from './markdown-tiptap'

describe('markdown-tiptap converter', () => {
  describe('tiptapToMarkdown', () => {
    it('converts empty document', () => {
      const doc: TipTapDoc = { type: 'doc', content: [] }
      expect(tiptapToMarkdown(doc)).toBe('')
    })

    it('converts paragraph', () => {
      const doc: TipTapDoc = {
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'Hello world' }] },
        ],
      }
      expect(tiptapToMarkdown(doc)).toBe('Hello world')
    })

    it('converts headings with correct levels', () => {
      const doc: TipTapDoc = {
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'H1' }] },
          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'H2' }] },
          { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'H3' }] },
        ],
      }
      expect(tiptapToMarkdown(doc)).toBe('# H1\n\n## H2\n\n### H3')
    })

    it('converts bullet list', () => {
      const doc: TipTapDoc = {
        type: 'doc',
        content: [
          {
            type: 'bulletList',
            content: [
              { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Item 1' }] }] },
              { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Item 2' }] }] },
            ],
          },
        ],
      }
      expect(tiptapToMarkdown(doc)).toBe('- Item 1\n- Item 2')
    })

    it('converts ordered list', () => {
      const doc: TipTapDoc = {
        type: 'doc',
        content: [
          {
            type: 'orderedList',
            content: [
              { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'First' }] }] },
              { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Second' }] }] },
            ],
          },
        ],
      }
      expect(tiptapToMarkdown(doc)).toBe('1. First\n2. Second')
    })

    it('converts code block with language', () => {
      const doc: TipTapDoc = {
        type: 'doc',
        content: [
          {
            type: 'codeBlock',
            attrs: { language: 'typescript' },
            content: [{ type: 'text', text: 'const x = 1' }],
          },
        ],
      }
      expect(tiptapToMarkdown(doc)).toBe('```typescript\nconst x = 1\n```')
    })

    it('converts blockquote', () => {
      const doc: TipTapDoc = {
        type: 'doc',
        content: [
          {
            type: 'blockquote',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Quote text' }] }],
          },
        ],
      }
      expect(tiptapToMarkdown(doc)).toBe('> Quote text')
    })

    it('converts horizontal rule', () => {
      const doc: TipTapDoc = {
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'Before' }] },
          { type: 'horizontalRule' },
          { type: 'paragraph', content: [{ type: 'text', text: 'After' }] },
        ],
      }
      expect(tiptapToMarkdown(doc)).toBe('Before\n\n---\n\nAfter')
    })

    it('converts bold text', () => {
      const doc: TipTapDoc = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'This is ' },
              { type: 'text', text: 'bold', marks: [{ type: 'bold' }] },
              { type: 'text', text: ' text' },
            ],
          },
        ],
      }
      expect(tiptapToMarkdown(doc)).toBe('This is **bold** text')
    })

    it('converts italic text', () => {
      const doc: TipTapDoc = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'This is ' },
              { type: 'text', text: 'italic', marks: [{ type: 'italic' }] },
              { type: 'text', text: ' text' },
            ],
          },
        ],
      }
      expect(tiptapToMarkdown(doc)).toBe('This is *italic* text')
    })

    it('converts inline code', () => {
      const doc: TipTapDoc = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Use ' },
              { type: 'text', text: 'console.log', marks: [{ type: 'code' }] },
              { type: 'text', text: ' for debugging' },
            ],
          },
        ],
      }
      expect(tiptapToMarkdown(doc)).toBe('Use `console.log` for debugging')
    })

    it('converts links', () => {
      const doc: TipTapDoc = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Visit ' },
              { type: 'text', text: 'Google', marks: [{ type: 'link', attrs: { href: 'https://google.com' } }] },
            ],
          },
        ],
      }
      expect(tiptapToMarkdown(doc)).toBe('Visit [Google](https://google.com)')
    })
  })

  describe('markdownToTiptap', () => {
    it('parses empty string', () => {
      const result = markdownToTiptap('')
      expect(result.type).toBe('doc')
      expect(result.content).toHaveLength(1)
      expect(result.content![0].type).toBe('paragraph')
    })

    it('parses paragraph', () => {
      const result = markdownToTiptap('Hello world')
      expect(result.content).toHaveLength(1)
      expect(result.content![0].type).toBe('paragraph')
    })

    it('parses headings', () => {
      const result = markdownToTiptap('# H1\n\n## H2\n\n### H3')
      expect(result.content).toHaveLength(3)
      expect(result.content![0]).toMatchObject({ type: 'heading', attrs: { level: 1 } })
      expect(result.content![1]).toMatchObject({ type: 'heading', attrs: { level: 2 } })
      expect(result.content![2]).toMatchObject({ type: 'heading', attrs: { level: 3 } })
    })

    it('parses bullet list', () => {
      const result = markdownToTiptap('- Item 1\n- Item 2')
      expect(result.content).toHaveLength(1)
      expect(result.content![0].type).toBe('bulletList')
      const list = result.content![0] as { type: 'bulletList'; content: unknown[] }
      expect(list.content).toHaveLength(2)
    })

    it('parses ordered list', () => {
      const result = markdownToTiptap('1. First\n2. Second')
      expect(result.content).toHaveLength(1)
      expect(result.content![0].type).toBe('orderedList')
    })

    it('parses code block', () => {
      const result = markdownToTiptap('```typescript\nconst x = 1\n```')
      expect(result.content).toHaveLength(1)
      expect(result.content![0].type).toBe('codeBlock')
      const block = result.content![0] as { type: 'codeBlock'; attrs?: { language?: string } }
      expect(block.attrs?.language).toBe('typescript')
    })

    it('parses blockquote', () => {
      const result = markdownToTiptap('> Quote text')
      expect(result.content).toHaveLength(1)
      expect(result.content![0].type).toBe('blockquote')
    })

    it('parses horizontal rule', () => {
      const result = markdownToTiptap('---')
      expect(result.content).toHaveLength(1)
      expect(result.content![0].type).toBe('horizontalRule')
    })

    it('parses bold text', () => {
      const result = markdownToTiptap('This is **bold** text')
      const para = result.content![0] as { type: 'paragraph'; content?: unknown[] }
      expect(para.content).toHaveLength(3)
      const boldNode = para.content![1] as { type: 'text'; text: string; marks?: unknown[] }
      expect(boldNode.text).toBe('bold')
      expect(boldNode.marks).toContainEqual({ type: 'bold' })
    })

    it('parses italic text', () => {
      const result = markdownToTiptap('This is *italic* text')
      const para = result.content![0] as { type: 'paragraph'; content?: unknown[] }
      const italicNode = para.content![1] as { type: 'text'; text: string; marks?: unknown[] }
      expect(italicNode.text).toBe('italic')
      expect(italicNode.marks).toContainEqual({ type: 'italic' })
    })

    it('parses inline code', () => {
      const result = markdownToTiptap('Use `code` here')
      const para = result.content![0] as { type: 'paragraph'; content?: unknown[] }
      const codeNode = para.content![1] as { type: 'text'; text: string; marks?: unknown[] }
      expect(codeNode.text).toBe('code')
      expect(codeNode.marks).toContainEqual({ type: 'code' })
    })

    it('parses links', () => {
      const result = markdownToTiptap('Visit [Google](https://google.com)')
      const para = result.content![0] as { type: 'paragraph'; content?: unknown[] }
      const linkNode = para.content![1] as { type: 'text'; text: string; marks?: Array<{ type: string; attrs?: { href?: string } }> }
      expect(linkNode.text).toBe('Google')
      expect(linkNode.marks![0].type).toBe('link')
      expect(linkNode.marks![0].attrs?.href).toBe('https://google.com')
    })

    it('parses hard breaks with backslash', () => {
      const result = markdownToTiptap('Line one\\\nLine two')
      const para = result.content![0] as { type: 'paragraph'; content?: unknown[] }
      expect(para.content).toHaveLength(3)
      expect(para.content![0]).toMatchObject({ type: 'text', text: 'Line one' })
      expect(para.content![1]).toMatchObject({ type: 'hardBreak' })
      expect(para.content![2]).toMatchObject({ type: 'text', text: 'Line two' })
    })

    it('parses hard breaks with double space', () => {
      const result = markdownToTiptap('Line one  \nLine two')
      const para = result.content![0] as { type: 'paragraph'; content?: unknown[] }
      expect(para.content).toHaveLength(3)
      expect(para.content![0]).toMatchObject({ type: 'text', text: 'Line one' })
      expect(para.content![1]).toMatchObject({ type: 'hardBreak' })
      expect(para.content![2]).toMatchObject({ type: 'text', text: 'Line two' })
    })
  })

  describe('roundtrip conversion', () => {
    it('preserves headings', () => {
      const markdown = '## Task\n\nThis is a task description.'
      const tiptap = markdownToTiptap(markdown)
      const result = tiptapToMarkdown(tiptap)
      expect(result).toBe(markdown)
    })

    it('preserves lists', () => {
      const markdown = '- Item 1\n- Item 2\n- Item 3'
      const tiptap = markdownToTiptap(markdown)
      const result = tiptapToMarkdown(tiptap)
      expect(result).toBe(markdown)
    })

    it('preserves code blocks', () => {
      const markdown = '```js\nconst x = 1\n```'
      const tiptap = markdownToTiptap(markdown)
      const result = tiptapToMarkdown(tiptap)
      expect(result).toBe(markdown)
    })

    it('preserves complex document structure', () => {
      const markdown = `## Task

Fix the authentication bug

### Steps

- Check user session
- Validate token
- Return error if invalid

### Code

\`\`\`typescript
if (!token) throw new Error('Unauthorized')
\`\`\``

      const tiptap = markdownToTiptap(markdown)
      const result = tiptapToMarkdown(tiptap)
      expect(result).toBe(markdown)
    })
  })

  describe('token efficiency', () => {
    it('produces significantly smaller output than JSON', () => {
      const doc: TipTapDoc = {
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Task' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'Fix the bug' }] },
          {
            type: 'bulletList',
            content: [
              { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Step 1' }] }] },
              { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Step 2' }] }] },
            ],
          },
        ],
      }

      const jsonLength = JSON.stringify(doc).length
      const markdownLength = tiptapToMarkdown(doc).length

      // Markdown should be at least 3x smaller
      expect(markdownLength).toBeLessThan(jsonLength / 3)
    })
  })
})
