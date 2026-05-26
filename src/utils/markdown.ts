function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function renderInlineMarkdown(value: string) {
  return value
    .replace(/!\[([^\]]*)\]\((https?:\/\/[^)\s]+|\/[^)\s]+)\)/g, '<img src="$2" alt="$1" />')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
}

function renderCodeBlock(code: string, language = '') {
  const langLabel = language.trim() || 'code'
  return `<figure class="code-block"><figcaption><span>${langLabel}</span></figcaption><pre><code class="language-${langLabel}">${code.replace(/\n$/, '')}</code></pre></figure>`
}

function renderBlock(block: string) {
  if (/^###\s+/.test(block)) {
    return `<h3>${renderInlineMarkdown(block.replace(/^###\s+/, ''))}</h3>`
  }

  if (/^##\s+/.test(block)) {
    return `<h2>${renderInlineMarkdown(block.replace(/^##\s+/, ''))}</h2>`
  }

  if (/^#\s+/.test(block)) {
    return `<h1>${renderInlineMarkdown(block.replace(/^#\s+/, ''))}</h1>`
  }

  if (/^&gt;\s+/m.test(block)) {
    return `<blockquote>${renderInlineMarkdown(block.replace(/^&gt;\s+/gm, '').replace(/\n/g, '<br />'))}</blockquote>`
  }

  if (/^[-*]\s+/m.test(block)) {
    const items = block
      .split('\n')
      .filter(line => /^[-*]\s+/.test(line))
      .map(line => `<li>${renderInlineMarkdown(line.replace(/^[-*]\s+/, ''))}</li>`)
      .join('')

    return `<ul>${items}</ul>`
  }

  if (/^\d+\.\s+/m.test(block)) {
    const items = block
      .split('\n')
      .filter(line => /^\d+\.\s+/.test(line))
      .map(line => `<li>${renderInlineMarkdown(line.replace(/^\d+\.\s+/, ''))}</li>`)
      .join('')

    return `<ol>${items}</ol>`
  }

  return `<p>${renderInlineMarkdown(block).replace(/\n/g, '<br />')}</p>`
}

export function renderMarkdown(markdown: string) {
  const escaped = escapeHtml(markdown.trim())

  if (!escaped) {
    return '<p class="markdown-empty">开始输入 Markdown 内容后，这里会显示预览。</p>'
  }

  const chunks: string[] = []
  const codeBlocks: string[] = []
  let source = escaped

  source = source.replace(/```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g, (_, language, code) => {
    const token = `@@CODE_BLOCK_${codeBlocks.length}@@`
    codeBlocks.push(renderCodeBlock(code, language))
    return token
  })

  source.split(/\n{2,}/).forEach(block => {
    const trimmed = block.trim()
    if (!trimmed) return

    const codeMatch = trimmed.match(/^@@CODE_BLOCK_(\d+)@@$/)
    if (codeMatch) {
      chunks.push(codeBlocks[Number(codeMatch[1])] || '')
      return
    }

    chunks.push(renderBlock(trimmed))
  })

  return chunks.join('')
}
