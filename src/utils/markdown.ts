function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/`/g, '&#096;')
}

function normalizeMarkdownUrl(value: string) {
  return value
    .trim()
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
}

function renderInlineMarkdown(value: string) {
  return value
    .replace(/!\[([^\]]*)\]\(([^)\s]+(?:\s+&quot;[^&]*&quot;)?)\)/g, (_, alt, rawUrl) => {
      const [url] = normalizeMarkdownUrl(rawUrl).split(/\s+"/)
      return `<img src="${escapeAttribute(url)}" alt="${escapeAttribute(alt)}" loading="lazy" />`
    })
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, text, rawUrl) => {
      const url = normalizeMarkdownUrl(rawUrl)
      return `<a href="${escapeAttribute(url)}" target="_blank" rel="noopener noreferrer">${text}</a>`
    })
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
}

function renderCodeBlock(code: string, language = '') {
  const langLabel = language.trim() || 'code'
  return `<figure class="code-block"><figcaption><span>${langLabel}</span></figcaption><pre><code class="language-${langLabel}">${code.replace(/\n$/, '')}</code></pre></figure>`
}

function renderTable(block: string): string {
  const lines = block.split('\n').filter(l => l.trim())
  if (lines.length < 2) return ''

  const parseRow = (line: string): string[] => {
    const trimmed = line.replace(/^\|/, '').replace(/\|$/, '').trim()
    if (!trimmed) return []
    // 先保护转义的 \|，分割后再还原
    const protected_str = trimmed.replace(/\\\|/g, '\x00PIPE\x00')
    return protected_str.split('|').map(cell => cell.trim().replace(/\x00PIPE\x00/g, '|'))
  }

  const headerCells = parseRow(lines[0])
  if (headerCells.length === 0) return ''

  const rows = lines.slice(2).map(line => parseRow(line))

  let html = '<table><thead><tr>'
  headerCells.forEach(cell => {
    html += `<th>${renderInlineMarkdown(cell)}</th>`
  })
  html += '</tr></thead><tbody>'

  rows.forEach(row => {
    html += '<tr>'
    row.forEach((cell, i) => {
      if (i < headerCells.length) {
        html += `<td>${renderInlineMarkdown(cell)}</td>`
      }
    })
    html += '</tr>'
  })

  html += '</tbody></table>'
  return html
}

function renderBlock(block: string) {
  const trimmed = block.trim()

  // 检测 Markdown 表格
  if (/^\|.+\|/.test(trimmed) && /\|[\s-:|]+\|/.test(trimmed.split('\n')[1] || '')) {
    return renderTable(trimmed)
  }

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