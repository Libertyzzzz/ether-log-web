import { ref, computed, nextTick } from 'vue'
import axios from 'axios'
import { chatWithAI } from '../api'
import { useRoute } from 'vue-router'
import type {
  AIChatAction,
  AIChatMessage,
  AIStyleKey,
} from '../types/blog'

/** 从错误对象提取友好的用户消息（一律不暴露后端原始错误） */
function extractErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status
    const data = err.response?.data
    const code = data?.code
    // 后端返回的 code 优先级更高（注意：后端可能返回 HTTP 200 + code: 401）
    if (code === 1003 || code === 1004 || code === 401) return '需要登录后使用 AI 助手'
    if (status === 401) return '需要登录后使用 AI 助手'
    if (status === 403) return '暂无权限使用 AI 助手'
    if (status && status >= 500) return '服务暂时繁忙，请稍后再试'
    if (status) return `请求失败，请稍后再试`
    return '网络连接异常，请检查网络'
  }
  // 处理非 AxiosError（如拦截器创建的新 Error）
  if (err instanceof Error) {
    const msg = err.message
    if (msg.includes('登录') || msg.includes('过期') || msg.includes('TOKEN')) {
      return '需要登录后使用 AI 助手'
    }
  }
  return 'AI 暂时没有回复，请稍后再试。'
}

export type AIAssistantContextKey =
  | 'home'
  | 'post-list'
  | 'post-detail'
  | 'publish'
  | 'about'
  | 'dashboard'
  | 'quant-lab'
  | 'media-hub'
  | 'sensitive-word'
  | 'assessment'
  | 'guestbook'
  | 'generic'

export interface AIAssistantContext {
  key: AIAssistantContextKey
  title: string
  subtitle: string
  content: string
  selection: string
  extra?: Record<string, any>
}

export interface AIQuickAction {
  key: AIChatAction | 'chat'
  label: string
  icon: string
  hint: string
  needsSelection?: boolean
}

const styles: Array<{ key: AIStyleKey; label: string; emoji: string }> = [
  { key: 'humor', label: '幽默风', emoji: '🌝' },
  { key: 'academic', label: '学术风', emoji: '📚' },
  { key: 'minimal', label: '极简风', emoji: '✨' },
  { key: 'viral', label: '爆款风', emoji: '🔥' },
  { key: 'casual', label: '随笔风', emoji: '💭' },
]

/** 不同页面的快捷操作合集 */
const quickActionMap: Record<AIAssistantContextKey, AIQuickAction[]> = {
  home: [
    { key: 'chat', label: '最近文章', icon: '📰', hint: '帮我介绍一下最近发布的文章' },
    { key: 'chat', label: '热门推荐', icon: '🔥', hint: '目前最受欢迎的是哪些内容？' },
    { key: 'chat', label: '了解这个博客', icon: 'ℹ️', hint: '这个博客是做什么的？' },
  ],
  'post-list': [
    { key: 'chat', label: '快速找文章', icon: '🔍', hint: '帮我在文章列表里找一个主题' },
    { key: 'chat', label: '推荐阅读', icon: '📖', hint: '根据我现在在看的分类推荐文章' },
  ],
  'post-detail': [
    { key: 'polish_text', label: '摘要这段', icon: '📋', hint: '生成当前段落的精简摘要' },
    { key: 'chat', label: '提问作者', icon: '💬', hint: '就文章内容向作者提问' },
    { key: 'chat', label: '观点对立', icon: '🧠', hint: '给出文章观点的反方论据' },
    { key: 'check_typo', label: '检查错字', icon: '🔍', hint: '全文扫描错别字和标点问题' },
  ],
  publish: [
    { key: 'generate_title', label: '生成标题', icon: '🔖', hint: '根据正文生成 3 个备选标题' },
    { key: 'polish_text', label: '润色段落', icon: '✏️', hint: '选中一段文字后点击，AI 会帮你润色', needsSelection: true },
    { key: 'continue_write', label: '续写文章', icon: '📝', hint: '根据上下文继续往下写' },
    { key: 'generate_summary', label: '生成摘要', icon: '📋', hint: '为当前文章生成一段精简摘要' },
    { key: 'check_typo', label: '检查错字', icon: '🔍', hint: '全文扫描错别字和标点问题' },
    { key: 'generate_outline', label: '文章大纲', icon: '🗂️', hint: '根据标题生成写作大纲' },
  ],
  about: [
    { key: 'chat', label: '关于作者', icon: '👤', hint: '介绍一下这个作者' },
    { key: 'chat', label: '联系方式', icon: '📮', hint: '如何联系作者？' },
  ],
  dashboard: [
    { key: 'chat', label: '数据概览', icon: '📊', hint: '请解读当前控制台的核心数据，并指出最值得关注的变化。' },
    { key: 'chat', label: '运营建议', icon: '✅', hint: '请基于当前后台数据，给出 3 条优先级最高的运营建议。' },
    { key: 'chat', label: '汇报文案', icon: '📝', hint: '请把当前控制台情况整理成一段适合发给团队的简短汇报。' },
  ],
  'quant-lab': [
    { key: 'chat', label: '解读图表', icon: '📈', hint: '帮我解读当前页面的数据图表' },
    { key: 'chat', label: '生成报告', icon: '📝', hint: '根据数据生成一段文字报告' },
    { key: 'chat', label: '异常检测', icon: '⚠️', hint: '最近数据有没有异常？' },
  ],
  'media-hub': [
    { key: 'chat', label: '素材归类', icon: '🖼️', hint: '请根据当前素材库内容，建议一套更清晰的图片分类和命名规则。' },
    { key: 'chat', label: '生成描述', icon: '📝', hint: '请为选中的或当前可见图片生成标题、alt 描述和使用建议。' },
    { key: 'chat', label: '清理建议', icon: '🧹', hint: '请帮我判断素材库里哪些图片可能需要清理、合并或补充信息。' },
  ],
  'sensitive-word': [
    { key: 'chat', label: '命中解释', icon: '🛡️', hint: '请解释当前敏感词规则可能命中的原因，并指出误判风险。' },
    { key: 'chat', label: '替代表达', icon: '✏️', hint: '请给出更温和、合规但不改变原意的替代表达。' },
    { key: 'chat', label: '规则优化', icon: '🔧', hint: '请审视当前敏感词规则，建议如何降低漏判和误判。' },
  ],
  assessment: [
    { key: 'chat', label: '解读结果', icon: '🧭', hint: '请用容易理解的方式解读当前评估结果，并列出最关键的 3 个结论。' },
    { key: 'chat', label: '行动建议', icon: '✅', hint: '请基于当前评估内容，生成一组可以马上执行的改进建议。' },
    { key: 'chat', label: '分享文案', icon: '📣', hint: '请把当前评估结果改写成适合分享的简短文案。' },
  ],
  guestbook: [
    { key: 'chat', label: '回复灵感', icon: '💡', hint: '帮我给这条留言写一个得体回复' },
  ],
  generic: [
    { key: 'chat', label: '自由聊天', icon: '💬', hint: '直接问 AI 任何问题' },
  ],
}

// 全局单例状态（模块级 ref 等同于全局状态）
const _isOpen = ref(false)
const _messages = ref<AIChatMessage[]>([])
const _isLoading = ref(false)
const _currentStyle = ref<AIStyleKey>('casual')
const _userInput = ref('')
const _chatContainerRef = ref<HTMLElement | null>(null)
const _context = ref<AIAssistantContext>({
  key: 'generic',
  title: '',
  subtitle: '',
  content: '',
  selection: '',
})

function scrollToBottom() {
  nextTick(() => {
    const el = _chatContainerRef.value
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  })
}

function buildDefaultWelcome(contextKey: AIAssistantContextKey): string {
  switch (contextKey) {
    case 'publish':
      return '你好！我是写作助手 ✨\n\n可以点击上面的快捷操作让我帮你处理文章，也可以直接在下面问我任何问题。'
    case 'post-detail':
      return '嗨！我正在读这篇文章 📖\n\n你想让我帮你做什么？摘要？提问？或者指出可能的问题？'
    case 'home':
      return '欢迎！我是这个博客的智能助手 🤖\n\n想看看最近的文章？还是对某个主题感兴趣？'
    case 'dashboard':
      return '我已经切到控制台上下文。\n\n可以让我直接解读数据、整理汇报，或给出下一步运营建议。'
    case 'media-hub':
      return '我已经在素材库上下文里。\n\n可以帮你补图片描述、整理标签，也可以给出素材清理建议。'
    case 'sensitive-word':
      return '我已经在敏感词管理上下文里。\n\n可以帮你解释命中原因、生成替代表达，或优化规则。'
    case 'assessment':
      return '我已经在评估上下文里。\n\n可以帮你解读结果、压缩结论，或整理成分享文案。'
    default:
      return '我是 Ether 智能助手 ✨\n\n你可以直接问我任何问题，或者点击上面的快捷操作。'
  }
}

function ensureWelcomeMessage() {
  if (_messages.value.length === 0) {
    _messages.value.push({
      id: 'welcome-' + Date.now(),
      role: 'assistant',
      content: buildDefaultWelcome(_context.value.key),
      timestamp: Date.now(),
      action: 'chat',
    })
  }
}

function buildHistoryForRequest(): AIChatMessage[] {
  return _messages.value.slice(-10).map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    timestamp: m.timestamp,
    action: m.action,
  }))
}

function buildUserPromptForAction(
  action: AIChatAction | 'chat',
  context: AIAssistantContext,
  promptOverride?: string,
): string {
  if (promptOverride?.trim()) return promptOverride.trim()

  switch (action) {
    case 'generate_title':
      return '请基于我的文章内容生成 3 个不同风格的标题，每个标题用一行显示。'
    case 'polish_text':
      return context.selection
        ? '请润色以下这段文字，让表达更流畅：\n\n' + context.selection
        : '请帮我润色文章中最近一段的表达。'
    case 'continue_write':
      return '请根据当前文章的上下文，帮我续写接下来的内容，大约 150-250 字。'
    case 'generate_summary':
      return '请为这篇文章生成一段 100 字左右的精简摘要。'
    case 'check_typo':
      return '请检查文章中是否有错别字、标点错误或常见语病，用列表列出问题和建议。'
    case 'generate_outline':
      return '请根据文章标题，帮我生成一份 4-6 个要点的写作大纲。'
    default:
      return '自由对话'
  }
}

export function useAIAssistant() {
  const route = useRoute()

  const quickActions = computed(() => quickActionMap[_context.value.key] || quickActionMap.generic)
  const contextLabel = computed(() => {
    const map: Record<AIAssistantContextKey, string> = {
      home: '首页',
      'post-list': '文章列表',
      'post-detail': '文章详情',
      publish: '编辑器',
      about: '关于页',
      dashboard: '控制台',
      'quant-lab': '数据实验室',
      'media-hub': '素材库',
      'sensitive-word': '敏感词',
      assessment: '评估',
      guestbook: '留言板',
      generic: '通用',
    }
    return map[_context.value.key] || '当前页'
  })

  function open(presetContext?: Partial<AIAssistantContext>) {
    if (presetContext) {
      _context.value = { ..._context.value, ...presetContext }
    } else {
      autoDetectContextFromRoute()
    }
    _isOpen.value = true
    nextTick(() => ensureWelcomeMessage())
  }

  function close() {
    _isOpen.value = false
  }

  function toggle(presetContext?: Partial<AIAssistantContext>) {
    if (_isOpen.value) {
      close()
    } else {
      open(presetContext)
    }
  }

  function setContext(ctx: Partial<AIAssistantContext>) {
    _context.value = { ..._context.value, ...ctx }
  }

  function clearChat() {
    _messages.value = [
      {
        id: 'reset-' + Date.now(),
        role: 'assistant',
        content: '对话已重置 ✨\n\n我们重新开始吧，有什么想聊的？',
        timestamp: Date.now(),
        action: 'chat',
      },
    ]
  }

  async function sendQuickAction(action: AIChatAction | 'chat', promptOverride?: string): Promise<AIChatMessage | null> {
    if (_isLoading.value) return null
    const ctx = _context.value
    const userPrompt = buildUserPromptForAction(action, ctx, promptOverride)
    const actualAction = action === 'chat' ? 'chat' : (action as AIChatAction)

    _messages.value.push({
      id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
      role: 'user',
      content: userPrompt,
      timestamp: Date.now(),
      action: actualAction,
    })
    _isLoading.value = true
    scrollToBottom()

    try {
      const response = await chatWithAI({
        action: actualAction,
        message: userPrompt,
        context: ctx.content,
        title: ctx.title,
        style: _currentStyle.value,
        history: buildHistoryForRequest(),
      })
      const msg: AIChatMessage = {
        id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
        role: 'assistant',
        content: response.content,
        candidates: response.candidates,
        timestamp: Date.now(),
        action: actualAction,
        originalText: ctx.selection || undefined,
      }
      _messages.value.push(msg)
      return msg
    } catch (err) {
      _messages.value.push({
        id: Date.now().toString(),
        role: 'assistant',
        content: '⚠️ ' + extractErrorMessage(err),
        timestamp: Date.now(),
        action: actualAction,
      })
      return null
    } finally {
      _isLoading.value = false
      scrollToBottom()
    }
  }

  async function sendFreeChat(userText: string): Promise<AIChatMessage | null> {
    if (!userText.trim() || _isLoading.value) return null
    const ctx = _context.value

    _messages.value.push({
      id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
      role: 'user',
      content: userText,
      timestamp: Date.now(),
      action: 'chat',
    })
    _userInput.value = ''
    _isLoading.value = true
    scrollToBottom()

    try {
      const response = await chatWithAI({
        action: 'chat',
        message: userText,
        context: ctx.content,
        title: ctx.title,
        style: _currentStyle.value,
        history: buildHistoryForRequest(),
      })
      const msg: AIChatMessage = {
        id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
        role: 'assistant',
        content: response.content,
        candidates: response.candidates,
        timestamp: Date.now(),
        action: 'chat',
      }
      _messages.value.push(msg)
      return msg
    } catch (err) {
      _messages.value.push({
        id: Date.now().toString(),
        role: 'assistant',
        content: '⚠️ ' + extractErrorMessage(err),
        timestamp: Date.now(),
        action: 'chat',
      })
      return null
    } finally {
      _isLoading.value = false
      scrollToBottom()
    }
  }

  /** 根据路由自动切换上下文（页面切换时调用） */
  function autoDetectContextFromRoute(extra: Partial<AIAssistantContext> = {}) {
    const path = route.path || '/'
    let key: AIAssistantContextKey = 'generic'

    if (path === '/' || path.startsWith('/#')) key = 'home'
    else if (path.includes('/posts/') && !path.includes('/publish')) key = 'post-detail'
    else if (path.includes('/post') || path.includes('/category') || path.includes('/tag'))
      key = 'post-list'
    else if (path.includes('/publish')) key = 'publish'
    else if (path.includes('/about')) key = 'about'
    else if (path.includes('/dashboard/sensitive-words')) key = 'sensitive-word'
    else if (path.includes('/dashboard/media')) key = 'media-hub'
    else if (path.includes('/dashboard') || path.includes('/admin')) key = 'dashboard'
    else if (path.includes('/quant')) key = 'quant-lab'
    else if (path.includes('/media') || path.includes('/image')) key = 'media-hub'
    else if (path.includes('/assessment')) key = 'assessment'
    else if (path.includes('/guestbook') || path.includes('留言')) key = 'guestbook'

    _context.value = {
      key,
      title: extra.title || '',
      subtitle: extra.subtitle || '',
      content: extra.content || '',
      selection: extra.selection || '',
      extra: extra.extra || _context.value.extra,
    }

    // 切换页面时如果已经有对话，插入一条轻量的上下文提示
    if (_messages.value.length > 0 && _isOpen.value) {
      _messages.value.push({
        id: 'ctx-' + Date.now(),
        role: 'assistant',
        content: '（已切换到「' + contextLabel.value + '」上下文）',
        timestamp: Date.now(),
        action: 'chat',
      })
    }
  }

  return {
    // 状态
    isOpen: _isOpen,
    messages: _messages,
    isLoading: _isLoading,
    currentStyle: _currentStyle,
    userInput: _userInput,
    chatContainerRef: _chatContainerRef,
    context: _context,
    // 计算属性
    quickActions,
    contextLabel,
    styles,
    // 方法
    open,
    close,
    toggle,
    setContext,
    clearChat,
    sendQuickAction,
    sendFreeChat,
    autoDetectContextFromRoute,
  }
}