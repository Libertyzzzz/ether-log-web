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

export function renderMarkdown(markdown: string) {
  const escaped = escapeHtml(markdown.trim())

  if (!escaped) {
    return '<p class="markdown-empty">开始输入 Markdown 内容后，这里会显示预览。</p>'
  }

  return escaped
    .replace(/```([\s\S]*?)```/g, (_, code) => `<pre><code>${code.trim()}</code></pre>`)
    .split(/\n{2,}/)
    .map(block => {
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

      if (block.startsWith('<pre><code>')) {
        return block
      }

      if (/^[-*]\s+/m.test(block)) {
        const items = block
          .split('\n')
          .filter(line => /^[-*]\s+/.test(line))
          .map(line => `<li>${renderInlineMarkdown(line.replace(/^[-*]\s+/, ''))}</li>`)
          .join('')

        return `<ul>${items}</ul>`
      }

      return `<p>${renderInlineMarkdown(block).replace(/\n/g, '<br />')}</p>`
    })
    .join('')
}
