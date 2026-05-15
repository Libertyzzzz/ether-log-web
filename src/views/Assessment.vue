<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useRoute } from 'vue-router'
import axios from 'axios'
import * as echarts from 'echarts'
import html2canvas from 'html2canvas'
import { Link, MessageCircle, Share2, X } from 'lucide-vue-next'
import QRCode from 'qrcode'

// 分享模块
const route = useRoute()



const posterRef = ref<HTMLElement | null>(null)
const isGenerating = ref(false) // [新增] 生成状态
const isShareMenuOpen = ref(false)
const isWechatShareOpen = ref(false)
const wechatQrCanvasRef = ref<HTMLCanvasElement | null>(null)
const assessmentHistoryLockKey = 'assessment-history-lock'
const assessmentEntryPath = '/assessment'
let activeShareId = ''
// 在其他 ref 之后添加
// const qrCodeRef = ref<HTMLElement | null>(null)

const isSharedReport = ref(false)

// 评估页面锁定：允许 /assessment 域内前进后退，但不退回主站。
const lockAssessmentHistory = () => {
  const state = window.history.state || {}
  if (state[assessmentHistoryLockKey]) return

  const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`
  window.history.replaceState(
    { ...state, [assessmentHistoryLockKey]: 'guard' },
    '',
    assessmentEntryPath
  )

  if (currentPath !== assessmentEntryPath) {
    window.history.pushState(
      { ...state, [assessmentHistoryLockKey]: 'page' },
      '',
      currentPath
    )
  }
}

const handleAssessmentBack = () => {
  if (!window.location.pathname.startsWith(assessmentEntryPath)) {
    window.location.replace('about:blank')
  }
}

// 卡片颜色自适应函数
// const adjustColor = (color, amount) => {
//   return color;
// };


onMounted(() => {
  document.title = 'Aether Valuation | 人间估值'
  lockAssessmentHistory()
  window.addEventListener('popstate', handleAssessmentBack)
})

const resultShareUrl = computed(() => {
  if (!result.value?.shareId) return ''
  return `${window.location.origin}/assessment/share/${result.value.shareId}`
})

const assessmentShareUrl = computed(() => resultShareUrl.value || `${window.location.origin}/assessment`)

const assessmentShareTitle = computed(() => (result.value?.shareId ? '我刚生成了一份人间估值报告' : '人间估值'))

const assessmentShareText = computed(() => `${assessmentShareTitle.value}｜快来市场测试一下吧\n${assessmentShareUrl.value}`)

const isWechatBrowser = () => /micromessenger/i.test(window.navigator.userAgent)

const isMobileBrowser = () => /android|iphone|ipad|ipod|mobile/i.test(window.navigator.userAgent)

const closeShareMenu = () => {
  isShareMenuOpen.value = false
}

const writeClipboardText = async (text: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const input = document.createElement('textarea')
  input.value = text
  input.setAttribute('readonly', '')
  input.style.position = 'fixed'
  input.style.opacity = '0'
  document.body.appendChild(input)
  input.select()
  document.execCommand('copy')
  document.body.removeChild(input)
}

const copyShareLink = async () => {
  if (!assessmentShareUrl.value) return
  try {
    await writeClipboardText(assessmentShareText.value)
    alert('分享文案已复制到剪贴板, 去惊艳朋友圈吧')
  } catch (error) {
    console.error('复制分享链接失败:', error)
    window.prompt('复制失败，请手动复制分享文案', assessmentShareText.value)
  } finally {
    closeShareMenu()
    isWechatShareOpen.value = false
  }
}

const copyAssessmentInviteLink = async () => {
  const inviteText = `人间估值｜快来市场测试一下吧\n${window.location.origin}/assessment`
  try {
    await writeClipboardText(inviteText)
    alert('测试邀请已复制到剪贴板')
  } catch (error) {
    console.error('复制测试邀请失败:', error)
    window.prompt('复制失败，请手动复制测试邀请', inviteText)
  }
}

const renderWechatQrCode = async () => {
  if (!wechatQrCanvasRef.value || !assessmentShareUrl.value) return
  try {
    await QRCode.toCanvas(wechatQrCanvasRef.value, assessmentShareUrl.value, {
      width: 188,
      margin: 2,
      color: { dark: '#111827', light: '#ffffff' }
    })
  } catch (error) {
    console.error('生成微信分享二维码失败:', error)
  }
}

const openWechatShare = async () => {
  if (!assessmentShareUrl.value) return

  closeShareMenu()

  if (!isWechatBrowser() && isMobileBrowser() && navigator.share) {
    try {
      await navigator.share({
        title: assessmentShareTitle.value,
        text: '快来市场测试一下吧',
        url: assessmentShareUrl.value
      })
      return
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') return
      console.error('系统分享失败:', error)
    }
  }

  isWechatShareOpen.value = true
  await nextTick()
  await renderWechatQrCode()
}

// 扫码分享评估页面
const currentShareUrl = computed(() => {
  if (!result.value?.shareId) return ''
  return `${window.location.origin}/assessment`
})

// ─── 海报雷达图 SVG 辅助函数 ───
const hexAngle = (i: number) => (Math.PI / 180) * (i * 60 - 90)

const hexPoints = (cx: number, cy: number, r: number): string =>
  Array.from({ length: 6 }, (_, i) => {
    const a = hexAngle(i)
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`
  }).join(' ')

const hexAxis = (cx: number, cy: number, r: number) =>
  Array.from({ length: 6 }, (_, i) => {
    const a = hexAngle(i)
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
  })

const RADAR_ORDER = ['assets', 'biological', 'aesthetic', 'emotional', 'social', 'maintenance'] as const

const radarPolygon = (cx: number, cy: number, r: number): string =>
  RADAR_ORDER.map((key, i) => {
    const item = radarItems.value.find(d => d.key === key)
    const ratio = (item?.value ?? 0) / 100
    const a = hexAngle(i)
    return `${cx + r * ratio * Math.cos(a)},${cy + r * ratio * Math.sin(a)}`
  }).join(' ')

const radarDots = (cx: number, cy: number, r: number) =>
  RADAR_ORDER.map((key, i) => {
    const item = radarItems.value.find(d => d.key === key)
    const ratio = (item?.value ?? 0) / 100
    const a = hexAngle(i)
    return { x: cx + r * ratio * Math.cos(a), y: cy + r * ratio * Math.sin(a) }
  })

const RADAR_LABELS = ['生存资源', '生物属性', '审美溢价', '情绪带宽', '社交博弈', '维护成本']
const radarLabelPositions = (cx: number, cy: number, r: number) =>
  RADAR_LABELS.map((label, i) => {
    const a = hexAngle(i)
    return { label, x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
  })

// 4. 生成 Apple 质感海报
const savePoster = async () => {
  if (!posterRef.value) {
    console.error('posterRef 为空，DOM 未挂载')
    alert('海报容器未找到，请稍后重试')
    return
  }
  isGenerating.value = true

  try {
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))

    if (currentShareUrl.value) {
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = 56
      tempCanvas.height = 56

      try {
        await QRCode.toCanvas(tempCanvas, currentShareUrl.value, {
          width: 56,
          margin: 2,
          color: { dark: '#0f172a', light: '#ffffff' }
        })
        const qrContainer = posterRef.value.querySelector('.qr-code')
        if (qrContainer) {
          qrContainer.innerHTML = ''
          qrContainer.appendChild(tempCanvas)
        }
        await nextTick()
        await new Promise(resolve => setTimeout(resolve, 300))
      } catch (error) {
        console.error('生成二维码失败:', error)
      }
    }

    const canvas = await html2canvas(posterRef.value, {
      scale: 3,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    }).catch(error => {
      console.error('html2canvas 错误:', error)
      alert('海报生成失败：' + (error?.message || '未知错误'))
      return null
    })
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `Aether-Valuation-${result.value?.score}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  } finally {
    isGenerating.value = false
  }
}



type AssessmentStep = 'intro' | 'input' | 'loading' | 'result'
type GenderModel = 'MALE' | 'FEMALE'



interface AssessmentForm {
  gender: GenderModel
  height: number
visualHeight: number
  weight: number
  annualIncome: number
  hairStatus: number
  eyeStatus: number
  workStability: number
  houseStatus: number
  carLevel: number
  parentPension: number
  familyStructure: number
  geneticRisk: boolean
  aestheticStyle: number
  photoSkill: number
  cookingSkill: number
  travelPlanning: number
  houseworkLevel: number
  extraSkills: number
  petType: number
  consumptionView: number
  fashionInvestment: number
  talkBreadth: number
  stubbornness: number
  emotionalStability: number
  replyLatency: number
  exBonding: number
  socialFilters: number
  controlDesire: number
  sharingDesire: number
  relationshipGoal: number
  coldViolenceProb: number
  empathyLevel: number
}

interface AssessmentRadar {
  assets: number
  biological: number
  aesthetic: number
  emotional: number
  social: number
  maintenance: number
}

interface AssessmentResult {
  score: number
  marketLevel: string
  report: string
  radar: AssessmentRadar
  lieFactor?: number
  advice?: string[]
  shareId?: string
  inputSnapshot?: {
    annualIncome?: number
    height?: number
    visualHeight?: number
  }
}

interface ApiResponse<T> {
  code?: number
  message?: string
  data?: T
}

const router = useRouter()
const step = ref<AssessmentStep>(route.params.shareId || route.query.id ? 'loading' : 'intro')
const loadingMsg = ref('正在校对输入指标...')
const errorMessage = ref('')
const result = ref<AssessmentResult | null>(null)
const lastInputSnapshot = ref<AssessmentResult['inputSnapshot'] | null>(null)
const isAnalysisRunning = ref(false)
let chart: echarts.ECharts | null = null
let loadingTimer: number | undefined

const form = reactive<AssessmentForm>({
  gender: 'MALE',
  height: 170,
  visualHeight: 170,
  weight: 68,
  annualIncome: 150000,
  hairStatus: 2,
  eyeStatus: 1,
  workStability: 3,
  houseStatus: 1,
  carLevel: 1,
  parentPension: 2,
  familyStructure: 1,
  geneticRisk: false,
  aestheticStyle: 3,
  photoSkill: 3,
  cookingSkill: 2,
  travelPlanning: 2,
  houseworkLevel: 3,
  extraSkills: 2,
  petType: 0,
  consumptionView: 2,
  fashionInvestment: 12,
  talkBreadth: 3,
  stubbornness: 5,
  emotionalStability: 3,
  replyLatency: 2,
  exBonding: 2,
  socialFilters: 3,
  controlDesire: 3,
  sharingDesire: 3,
  relationshipGoal: 3,
  coldViolenceProb: 2,
  empathyLevel: 4
})

const loadingMessages = [
  '正在整理这份不太严肃的样本...',
  '正在把输入项放进玩笑过滤器...',
  '正在校准情绪缓冲区...',
  '正在生成一份轻拿轻放的报告...',
  '都说了让你不要急, 别再点了',
  '....'
]

const rangeFields = [
  { key: 'workStability', label: '职业稳定性', hint: '1 到 5，越高越稳定', min: 1, max: 5 },
  { key: 'aestheticStyle', label: '审美风格', hint: '1 到 5，从随缘穿搭到人形 Lookbook', min: 1, max: 5 },
  { key: 'photoSkill', label: '摄影水平', hint: '1 到 5，决定朋友圈素材能否抢救', min: 1, max: 5 },
  { key: 'cookingSkill', label: '厨艺', hint: '1 到 4，从泡面工程到厨房 MVP', min: 1, max: 4 },
  { key: 'travelPlanning', label: '旅行规划', hint: '1 到 3，从随缘出发到行程 PM', min: 1, max: 3 },
  { key: 'houseworkLevel', label: '家务参与', hint: '1 到 4，生活自理模块加载程度', min: 1, max: 4 },
  { key: 'consumptionView', label: '消费观', hint: '1 到 4，花钱姿势是否优雅落地', min: 1, max: 4 },
  { key: 'talkBreadth', label: '知识面 / 接梗能力', hint: '1 到 5，聊天频道宽度', min: 1, max: 5 },
  { key: 'stubbornness', label: '任性值', hint: '1 到 10，别太满，满了像锁死配置', min: 1, max: 10 },
  { key: 'emotionalStability', label: '情绪稳态', hint: '1 到 5， 值越大情绪越稳定 ', min: 1, max: 5 },
  { key: 'replyLatency', label: '回消延迟', hint: '1 秒回，4 轮回', min: 1, max: 4 },
  { key: 'exBonding', label: '前任纠缠度', hint: '1 到 5， 纠缠越深', min: 1, max: 5 },
  { key: 'socialFilters', label: '朋友圈美化率', hint: '1 到 5，滤镜浓度检测', min: 1, max: 5 },
  { key: 'controlDesire', label: '控制欲', hint: '1 到 5，  控制欲逐递增', min: 1, max: 5 },
  { key: 'sharingDesire', label: '分享欲', hint: '1 到 5， 分享欲逐渐递增', min: 1, max: 5 },
  { key: 'relationshipGoal', label: '恋爱目的', hint: '1 纯爱，4 结婚，路线越清晰越好沟通', min: 1, max: 4 },
  { key: 'coldViolenceProb', label: '冷暴力倾向', hint: '1 到 5，静音模式触发概率', min: 1, max: 5 },
  { key: 'empathyLevel', label: '同理心', hint: '1 到 5， 共情力递增', min: 1, max: 5 }
] as const

const canSubmit = computed(() => {
  return form.height > 0 && form.visualHeight > 0 && form.weight > 0 && form.annualIncome >= 0
})

const assetPreview = computed(() => {
  const snapshot = result.value?.inputSnapshot || lastInputSnapshot.value
  if (result.value) {
    if (!snapshot && isSharedReport.value) {
      return [
        { label: 'Asset', value: result.value.radar.assets },
        { label: 'Lie factor', value: typeof result.value.lieFactor === 'number' ? result.value.lieFactor : '已生成' },
        { label: 'Mode', value: result.value.marketLevel || 'Play' }
      ]
    }

    return [
      { label: 'Income', value: typeof snapshot?.annualIncome === 'number' ? formatCurrency(snapshot.annualIncome) : '已生成' },
      {
        label: 'Visual delta',
        value: typeof snapshot?.height === 'number' && typeof snapshot?.visualHeight === 'number'
          ? `${snapshot.visualHeight - snapshot.height >= 0 ? '+' : ''}${snapshot.visualHeight - snapshot.height}cm`
          : '已生成'
      },
      { label: 'Mode', value: result.value.marketLevel || 'Play' }
    ]
  }

  return [
    { label: 'Income', value: formatCurrency(form.annualIncome) },
    { label: 'Visual delta', value: `${form.visualHeight - form.height >= 0 ? '+' : ''}${form.visualHeight - form.height}cm` },
    { label: 'Mode', value: 'Play' }
  ]
})

const previewPanelTitle = computed(() => 'LIVE PREVIEW')

const previewPanelNote = computed(() => (
  result.value
    ? 'Loaded from the shared report. This snapshot follows the generated result.'
    : 'Private by design. Sent only when you submit.'
))

const radarItems = computed(() => {
  if (!result.value) {
    return []
  }

  return [
    { key: 'assets', label: '生存资源', value: result.value.radar.assets, quip: '钱包呼吸感' },
    { key: 'biological', label: '生物属性', value: result.value.radar.biological, quip: '身体电量' },
    { key: 'aesthetic', label: '审美溢价', value: result.value.radar.aesthetic, quip: '出片概率' },
    { key: 'emotional', label: '情绪带宽', value: result.value.radar.emotional, quip: '内存占用' },
    { key: 'social', label: '社交博弈', value: result.value.radar.social, quip: '组队能力' },
    { key: 'maintenance', label: '维护成本', value: result.value.radar.maintenance, quip: '售后复杂度' }
  ]
})

const strongestRadarItem = computed(() => {
  return [...radarItems.value].sort((a, b) => b.value - a.value)[0]
})

const playfulVerdict = computed(() => {
  const score = result.value?.score ?? 0
  let themeColor = ''

  if (score >= 90) {
    themeColor = '#10b981' // emerald-500 - 最高等级绿色
  } else if (score >= 75) {
    themeColor = '#2563eb' // blue-600 - 高等级蓝色
  } else if (score >= 55) {
    themeColor = '#8b5cf6' // violet-500 - 中等级紫色
  } else if (score >= 30) {
    themeColor = '#f59e0b' // amber-500 - 中低等级橙色
  } else {
    themeColor = '#ef4444' // red-500 - 低等级红色
  }
  if (score >= 90) {
    return {
      title: '稀有皮肤，建议低调',
      subtitle: '拥有让人眼前一亮的魅力值，简直是行走的惊喜',
      badge: '夯',
      color: themeColor
    }
  }

  if (score >= 75) {
    return {
      title: '品质在线，值得信赖',
      subtitle: '各方面都表现不错，是那种让人觉得很舒服的存在',
      badge: '顶级',
      color: themeColor

    }
  }

  if (score >= 55) {
    return {
      title: '潜力股选手',
      subtitle: '已经很棒了，再打磨一下就是精品',
      badge: '人上人',
      color: themeColor

    }
  }

  if (score >= 30) {
    return {
      title: '成长型选手',
      subtitle: '基础不错，还有很大提升空间，未来可期。',
      badge: 'NPC',
      color: themeColor

    }
  }

  return {
    title: '原生态宝藏',
    subtitle: '先别急着破防，每个人都有自己的闪光点，这份报告只是记录当下的状态',
    badge: '拉完了',
    color: themeColor

  }
})

const funFacts = computed(() => {
  const strongest = strongestRadarItem.value
  return [
    {
      label: '本局高光',
      value: strongest ? strongest.label : '等待生成',
      text: strongest ? `${strongest.quip} 达到 ${strongest.value} 分，属于系统偷偷加星标的模块。` : '雷达图加载后会自动点亮。'
    },
    {
      label: '免责声明',
      value: '娱乐模式',
      text: '这不是身价评估，也不是人格审判，只是一张带点梗味的自我观察卡。'
    },
    {
      label: '建议心态',
      value: '轻拿轻放',
      text: '分数可以看看，别往心里搬家。真正的人不应该被 0 到 100 装进盒子。'
    }
  ]
})

const resultChips = computed(() => {
  const score = result.value?.score ?? 0
  return [
    { label: '报告性质', value: '娱乐观测' },
    { label: '心理负担', value: score >= 60 ? '轻量级' : '请勿当真' },
    { label: '推荐动作', value: '笑一下再看' }
  ]
})

function buildAssessmentPayload() {
  return {
    gender: form.gender,
    height: form.height,
    visualHeight: form.visualHeight,
    weight: form.weight,
    hairStatus: form.hairStatus,
    eyeStatus: form.eyeStatus,
    annualIncome: Math.round(form.annualIncome * 100),
    workStability: form.workStability,
    houseStatus: form.houseStatus,
    carLevel: form.carLevel,
    parentPension: form.parentPension,
    familyStructure: form.familyStructure,
    geneticRisk: form.geneticRisk,
    aestheticStyle: form.aestheticStyle,
    photoSkill: form.photoSkill,
    cookingSkill: form.cookingSkill,
    travelPlanning: form.travelPlanning,
    houseworkLevel: form.houseworkLevel,
    extraSkills: form.extraSkills,
    petType: form.petType,
    consumptionView: form.consumptionView,
    fashionInvestment: form.fashionInvestment,
    talkBreadth: form.talkBreadth,
    stubbornness: form.stubbornness,
    emotionalStability: form.emotionalStability,
    replyLatency: form.replyLatency,
    exBonding: form.exBonding,
    socialFilters: form.socialFilters,
    controlDesire: form.controlDesire,
    sharingDesire: form.sharingDesire,
    relationshipGoal: form.relationshipGoal,
    coldViolenceProb: form.coldViolenceProb,
    empathyLevel: form.empathyLevel
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('zh-CN', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value)
}

function normalizeScore(value: unknown, fallback = 0) {
  const numberValue = Number(value ?? fallback)
  if (Number.isNaN(numberValue)) {
    return fallback
  }
  return Math.max(0, Math.min(100, Math.round(numberValue)))
}

function normalizeResult(payload: any): AssessmentResult {
  const source = (payload || {}) as any
  const radar = (source.radar || {}) as any
  const inputSnapshot = source.inputSnapshot || source.input || source.form || source.request || null
  const annualIncome = inputSnapshot?.annualIncome
  const normalizedAnnualIncome = typeof annualIncome === 'number'
    ? annualIncome > 10000000 ? Math.round(annualIncome / 100) : annualIncome
    : undefined

  return {
    score: normalizeScore(source.score),
    marketLevel: source.marketLevel || '评估完成',
    report: source.report || '暂无详细报告内容...',
    lieFactor: typeof source.lieFactor === 'number' ? source.lieFactor : undefined,
    shareId: source.shareId, // [新增] 映射后端返回的 ID
    inputSnapshot: inputSnapshot
      ? {
          annualIncome: normalizedAnnualIncome,
          height: typeof inputSnapshot.height === 'number' ? inputSnapshot.height : undefined,
          visualHeight: typeof inputSnapshot.visualHeight === 'number' ? inputSnapshot.visualHeight : undefined
        }
      : undefined,
    radar: {
      assets: normalizeScore(radar.assets),
      biological: normalizeScore(radar.biological),
      aesthetic: normalizeScore(radar.aesthetic),
      emotional: normalizeScore(radar.emotional),
      social: normalizeScore(radar.social),
      maintenance: normalizeScore(radar.maintenance)
    },
    advice: Array.isArray(source.advice) ? source.advice : []
  }
}



function startLoadingMessages() {
  let index = 0
  loadingMsg.value = loadingMessages[index]
  loadingTimer = window.setInterval(() => {
    index += 1
    loadingMsg.value = loadingMessages[index % loadingMessages.length]
  }, 900)
} 

function stopLoadingMessages() {
  if (loadingTimer) {
    window.clearInterval(loadingTimer)
    loadingTimer = undefined
  }
}

async function loadSharedAssessment(shareId: string) {
  if (activeShareId === shareId && result.value) {
    step.value = 'result'
    isSharedReport.value = true
    await nextTick()
    renderRadar()
    return
  }

  activeShareId = shareId
  isSharedReport.value = true
  loadingMsg.value = '正在从尘埃中恢复报告...'
  errorMessage.value = ''
  result.value = null
  lastInputSnapshot.value = null
  step.value = 'loading'

  try {
    const res = await axios.get(`/api/v2/assessment/share/${shareId}`)
    result.value = normalizeResult(res.data.data)
    step.value = 'result'
    await nextTick()
    renderRadar()
  } catch (e) {
    activeShareId = ''
    errorMessage.value = '报告已过期或不存在'
    isSharedReport.value = false
    step.value = 'intro'
    router.replace({ name: 'assessment-home' })
  }
}

async function syncAssessmentRoute() {
  const legacyShareId = typeof route.query.id === 'string' ? route.query.id : ''
  if (legacyShareId) {
    await router.replace({ name: 'assessment-share', params: { shareId: legacyShareId } })
    return
  }

  if (route.name === 'assessment-share') {
    const shareId = String(route.params.shareId || '')
    if (shareId) {
      await loadSharedAssessment(shareId)
      return
    }
    router.replace({ name: 'assessment-home' })
    return
  }

  if (route.name === 'assessment-evaluate') {
    isSharedReport.value = false
    errorMessage.value = ''
    step.value = 'input'
    return
  }

  if (route.name === 'assessment-result') {
    if (!result.value) {
      router.replace({ name: 'assessment-home' })
      return
    }
    step.value = 'result'
    await nextTick()
    renderRadar()
    return
  }

  if (route.name === 'assessment-processing') {
    if (!isAnalysisRunning.value && !result.value) {
      router.replace({ name: 'assessment-evaluate' })
      return
    }
    step.value = 'loading'
    return
  }

  activeShareId = ''
  isSharedReport.value = false
  result.value = null
  lastInputSnapshot.value = null
  errorMessage.value = ''
  step.value = 'intro'
}

watch(() => route.fullPath, () => {
  void syncAssessmentRoute()
}, { immediate: true })

function enterAssessment() {
  errorMessage.value = ''
  router.push({ name: 'assessment-evaluate' })
}

function startOwnAssessmentFromShare() {
  result.value = null
  lastInputSnapshot.value = null
  errorMessage.value = ''
  isSharedReport.value = false
  step.value = 'intro'
  router.push({ name: 'assessment-home' })
}

async function startAnalysis() {
  if (!canSubmit.value) {
    errorMessage.value = '请确认年龄不低于 18，收入、资产和负债不能为负数。'
    return
  }

  errorMessage.value = ''
  result.value = null
  lastInputSnapshot.value = {
    annualIncome: form.annualIncome,
    height: form.height,
    visualHeight: form.visualHeight
  }
  isAnalysisRunning.value = true
  step.value = 'loading'
  startLoadingMessages()
  await router.push({ name: 'assessment-processing' })

  try {
    const response = await axios.post<ApiResponse<AssessmentResult> | AssessmentResult>(
      '/api/v2/assessment/evaluate',
      buildAssessmentPayload(),
      { params: { gender: form.gender } }
    )
    const responseData = response.data as ApiResponse<AssessmentResult>
    const payload = 'data' in responseData ? responseData.data : response.data

    if ('code' in responseData && responseData.code && responseData.code !== 200) {
      throw new Error(responseData.message || '评估接口返回失败')
    }

    result.value = normalizeResult(payload)
    step.value = 'result'
    await router.push({ name: 'assessment-result' })

    await nextTick()
    renderRadar()
  } catch (error) {
    step.value = 'input'
    if (route.name !== 'assessment-evaluate') {
      router.replace({ name: 'assessment-evaluate' })
    }
    errorMessage.value = axios.isAxiosError(error) && error.response?.data?.message
      ? error.response.data.message
      : error instanceof Error
        ? error.message
        : '访问人数太多啦，评估功能暂不可用呢，WWWW'
  } finally {
    isAnalysisRunning.value = false
    stopLoadingMessages()
  }
}

function resetAssessment() {
  result.value = null
  lastInputSnapshot.value = null
  errorMessage.value = ''
  step.value = 'input'
  chart?.dispose()
  chart = null
  router.push({ name: 'assessment-evaluate' })
}

function renderRadar() {
  const chartElement = document.getElementById('radar-chart')
  if (!chartElement || !result.value) {
    return
  }

  chart?.dispose()
  chart = echarts.init(chartElement)
  const radar = result.value.radar

  chart.setOption({
    backgroundColor: 'transparent',
    radar: {
      radius: '68%',
      indicator: [
        { name: '生存资源', max: 100 },
        { name: '生物属性', max: 100 },
        { name: '审美溢价', max: 100 },
        { name: '情绪带宽', max: 100 },
        { name: '社交博弈', max: 100 },
        { name: '维护成本', max: 100 }
      ],
      axisName: { color: '#475569', fontSize: 12 },
      splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.35)' } },
      splitArea: { areaStyle: { color: ['rgba(248, 250, 252, 0.92)', 'rgba(239, 246, 255, 0.82)'] } },
      axisLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.45)' } }
    },
    series: [{
      type: 'radar',
      data: [{
        value: [radar.assets, radar.biological, radar.aesthetic, radar.emotional, radar.social, radar.maintenance],
        areaStyle: { color: 'rgba(37, 99, 235, 0.2)' },
        lineStyle: { color: '#2563eb', width: 2 },
        itemStyle: { color: '#10b981' },
        symbolSize: 5
      }]
    }]
  })

  window.addEventListener('resize', resizeChart)
}

function resizeChart() {
  chart?.resize()
}

onUnmounted(() => {
  stopLoadingMessages()
  window.removeEventListener('popstate', handleAssessmentBack)
  window.removeEventListener('resize', resizeChart)
  chart?.dispose()
})
</script>

<template>
  <main class="assessment-root">
    <nav class="assessment-nav">
      <button class="brand-button" type="button" @click="router.push({ name: 'assessment-home' })">
        <span class="brand-mark">V</span>
        <span>Aether Valuation | 人间估值</span>
      </button>
      <div class="nav-meta">
        <span>PLAYFUL DIAGNOSTIC</span>         
      </div>
    </nav>

    <section v-if="step === 'intro'" class="intro-stage animate-fade-in">
      <div class="intro-copy">
        <span class="eyebrow">FUN TEST / NOT A REAL PRICE TAG</span>
        <h1>测测你在人间市场的估值啦</h1>
        <p>输入你的身高、资产、生活习惯和情绪参数，生成一份带梗报告和可分享海报。它只负责好玩，不负责定义你。</p>
        <div class="intro-warning">
          <strong>重要提示</strong>
          <span>进入测试后，表单里的数据只是默认初始值。请改成你自己的情况，再生成报告。</span>
        </div>
        <div class="intro-actions">
          <button class="submit-button intro-start-button" type="button" @click="enterAssessment">开始测试</button>
          <span>大约 1 分钟完成</span>
        </div>
      </div>
      <aside class="intro-preview" aria-label="报告预览">
        <div class="intro-preview-top">
          <span class="panel-kicker">REPORT PREVIEW</span>
          <strong>?</strong>
        </div>
        <div class="intro-preview-score">
          <span>估值指数</span>
          <b>生成后揭晓</b>
        </div>
        <div class="intro-preview-bars">
          <div style="--bar: 74%">
            <span>生存资源</span>
            <i></i>
          </div>
          <div style="--bar: 58%">
            <span>情绪带宽</span>
            <i></i>
          </div>
          <div style="--bar: 86%">
            <span>审美溢价</span>
            <i></i>
          </div>
        </div>
        <p>报告会给出六维画像、轻松解读和保存海报入口。</p>
      </aside>
      <div class="intro-points" aria-label="测试亮点">
        <div>
          <strong>先调数据</strong>
          <span>默认值只是起点，改成自己的才有意思。</span>
        </div>
        <div>
          <strong>再看报告</strong>
          <span>系统会把输入转成六维画像和带梗解读。</span>
        </div>
        <div>
          <strong>最后分享</strong>
          <span>生成海报或分享链接，看看朋友怎么接梗。</span>
        </div>
      </div>
    </section>

    <section v-else class="assessment-hero">
      <div class="hero-copy">
        <span class="eyebrow">SATIRE FIRST / DATA SECOND</span>
        <h1>人间估值</h1>
        <p>轻松填写，静静欣赏。这会是一份有趣的报告，但它永远不会定义真实的你。</p>

      </div>
      <aside class="hero-panel" aria-label="当前输入摘要">
        <span class="panel-kicker">{{ previewPanelTitle }}</span>
        <div class="preview-grid">
          <div v-for="item in assetPreview" :key="item.label">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </div>
        </div>
        <p class="preview-note">{{ previewPanelNote }}</p>
      </aside>
    </section>

    <section v-if="step === 'input'" class="assessment-layout animate-fade-in">
      <form class="input-panel" @submit.prevent="startAnalysis">
        <div class="input-note">
            <div class="note-header">
                <span class="note-emoji">🎭</span>
                <strong>开始你的表演吧</strong>
            </div>
            <p class="note-content">
                这是一份纯娱乐的估值报告，数据仅用于生成带梗的画像。<br>
                <strong>分数不构成任何真实评价，笑一笑就行～</strong>
            </p>
        </div>

        <div class="form-section-title">          
          <strong>基础建模与资信评估</strong>
        </div>
        <div class="form-grid">
          <div class="field field-wide">
            <label>评估模型</label>
            <div class="model-picker">
              <button type="button" @click="form.gender = 'MALE'" :class="{ active: form.gender === 'MALE' }">男性模型</button>
              <button type="button" @click="form.gender = 'FEMALE'" :class="{ active: form.gender === 'FEMALE' }">女性模型</button>
            </div>
          </div>

          <label class="field">
            <span>净身高 cm</span>
            <input v-model.number="form.height" type="number" min="120" max="230" />
          </label>

          <label class="field">
            <span>视觉身高 cm</span>
            <input v-model.number="form.visualHeight" type="number" min="120" max="240" />
          </label>

          <label class="field">
            <span>体重 kg</span>
            <input v-model.number="form.weight" type="number" min="35" max="180" step="0.1" />
          </label>

          <label class="field">
            <span>年薪 CNY（页面填元，提交自动转分）</span>
            <input v-model.number="form.annualIncome" type="number" min="0" step="1000" />
          </label>

          <label class="field">
            <span>发量状态</span>
            <select v-model.number="form.hairStatus">
              <option :value="0">秃</option>
              <option :value="1">稀</option>
              <option :value="2">平</option>
              <option :value="3">茂</option>
            </select>
          </label>

          <label class="field">
            <span>视力 / 美化习惯</span>
            <select v-model.number="form.eyeStatus">
              <option :value="0">框架</option>
              <option :value="1">素颜</option>
              <option :value="2">美瞳</option>
            </select>
          </label>

          <label class="field">
            <span>房产</span>
            <select v-model.number="form.houseStatus">
              <option :value="0">租</option>
              <option :value="1">有房有贷</option>
              <option :value="2">红本在手</option>
            </select>
          </label>

          <label class="field">
            <span>车辆</span>
            <select v-model.number="form.carLevel">
              <option :value="0">无车</option>
              <option :value="1">代步车</option>
              <option :value="2">中高端</option>
              <option :value="3">豪华</option>
            </select>
          </label>

          <label class="field">
            <span>父母养老</span>
            <select v-model.number="form.parentPension">
              <option :value="0">压力较大</option>
              <option :value="1">普通</option>
              <option :value="2">较稳</option>
              <option :value="3">无压力</option>
            </select>
          </label>

          <label class="field">
            <span>家庭结构</span>
            <select v-model.number="form.familyStructure">
              <option :value="0">多子</option>
              <option :value="1">独生</option>
            </select>
          </label>

          <label class="field">
            <span>遗传风险</span>
            <select v-model="form.geneticRisk">
              <option :value="false">无明显风险</option>
              <option :value="true">存在风险</option>
            </select>
          </label>

          <label class="field">
            <span>技能特长数量</span>
            <input v-model.number="form.extraSkills" type="number" min="0" max="20" />
          </label>

          <label class="field">
            <span>宠物类型</span>
            <select v-model.number="form.petType">
              <option :value="0">无宠物</option>
              <option :value="1">猫</option>
              <option :value="2">狗</option>
              <option :value="3">猫狗双全</option>
              <option :value="4">其他</option>
            </select>
          </label>

          <label class="field">
            <span>穿搭预算占比 %</span>
            <input v-model.number="form.fashionInvestment" type="number" min="0" max="100" step="0.1" />
          </label>
        </div>

        <div class="form-section-title spaced">
          
          <strong>软性标签与心理溢价</strong>
        </div>
        <div class="range-grid">
          <label v-for="field in rangeFields" :key="field.key" class="range-field">
            <div>
              <span>{{ field.label }}</span>
              <small>{{ field.hint }}</small>
            </div>
            <strong>{{ form[field.key] }}</strong>
            <input v-model.number="form[field.key]" type="range" :min="field.min" :max="field.max" />
          </label>
        </div>

        <p v-if="errorMessage" class="error-banner">{{ errorMessage }}</p>
        <button class="submit-button" type="submit" :disabled="!canSubmit">生成报告</button>
      </form>
    </section>

    <section v-else-if="step === 'loading'" class="loading-panel">
      <div class="scanner"></div>
      <p>{{ loadingMsg }}</p>
    </section>

    <section v-else-if="result" class="result-stage animate-zoom-in">
      <div class="result-hero-card">
        <div class="result-copy">
          <span class="eyebrow">REPORT READY / LOW STAKES ONLY</span>
          <h2>{{ playfulVerdict.title }}</h2>
          <p>{{ playfulVerdict.subtitle }}</p>
          <div class="result-chip-row">
            <div v-for="chip in resultChips" :key="chip.label">
              <span>{{ chip.label }}</span>
              <strong>{{ chip.value }}</strong>
            </div>
          </div>
          <div class="soft-warning">娱乐报告，不构成任何人生、情感、婚恋或经济建议。请把它当成一张会开玩笑的镜子。</div>
        </div>

        <div class="score-orb">
            <span class="badge-highlight">{{ playfulVerdict.badge }}</span>
            <strong>{{ result.score }}</strong>
            <em>{{ result.marketLevel }}</em>
        </div>
      </div>

      <div class="result-grid">
        <section class="fun-card">
          <span class="panel-kicker">COMFORT MODE</span>
          <h3>轻松解读</h3>
          <div class="fun-list">
            <div v-for="fact in funFacts" :key="fact.label">
              <span>{{ fact.label }}</span>
              <strong>{{ fact.value }}</strong>
              <p>{{ fact.text }}</p>
            </div>
          </div>
        </section>

        <section class="chart-card">
          <div class="panel-heading compact-heading">
            <span>RADAR</span>
            <h2>六维画像</h2>
          </div>
          <div id="radar-chart" class="radar-chart"></div>
        </section>

        <section class="dimension-card">
          <div class="panel-heading compact-heading">
            <span>BADGES</span>
            <h2>本次掉落</h2>
          </div>
          <div class="dimension-list">
            <div v-for="item in radarItems" :key="item.key" class="dimension-item">
              <div>
                <strong>{{ item.label }}</strong>
                <span>{{ item.quip }}</span>
              </div>
              <div class="mini-meter" :style="{ '--meter': `${item.value}%` }">
                <i></i>
              </div>
              <b>{{ item.value }}</b>
            </div>
          </div>
        </section>

        <section class="report-card">
          <span class="panel-kicker">REPORT</span>
          <h3>报告解读</h3>
          <div class="memo-toolbar">
            <i></i>
            <i></i>
            <i></i>
            <span>Generated-by-Nextify</span>
          </div>
          <p>{{ result.report }}</p>
        </section>

        <section v-if="result.advice?.length" class="advice-card">
          <span class="panel-kicker">PATCH NOTES</span>
          <h3>下个版本可以更新这些</h3>
          <div class="advice-grid">
            <div v-for="item in result.advice" :key="item">{{ item }}</div>
          </div>
        </section>
      </div>

      
      <template v-if="!isSharedReport">
        <div class="result-actions animate-fade-in">
          <button class="submit-button gold-action" @click="savePoster" :disabled="isGenerating">
            {{ isGenerating ? '正在渲染...' : '生成估值海报' }}
          </button>
          <div class="share-action-wrap">
            <button class="secondary-button share-trigger" @click="isShareMenuOpen = !isShareMenuOpen">
              <Share2 :size="18" />
              <span>分享</span>
            </button>
            <div v-if="isShareMenuOpen" class="share-menu">
              <button type="button" @click="copyShareLink">
                <Link :size="18" />
                <span>复制分享链接</span>
              </button>
              <button type="button" @click="openWechatShare">
                <MessageCircle :size="18" />
                <span>分享到微信</span>
              </button>
            </div>
          </div>
          <button class="secondary-button" @click="resetAssessment">重新评估</button>
        </div>
      </template>
      <template v-else>
        <div class="shared-report-actions animate-fade-in">
          <div class="shared-action-copy">
            <span class="panel-kicker">YOUR TURN</span>
            <strong>看完这份报告，也给自己跑一次估值</strong>
            <p>这是一份娱乐测试，进入后记得把默认初始值改成自己的情况。</p>
          </div>
          <div class="shared-action-buttons">
            <button class="submit-button shared-primary-action" type="button" @click="startOwnAssessmentFromShare">
              我也测测
            </button>
            <button class="secondary-button shared-secondary-action" type="button" @click="copyAssessmentInviteLink">
              复制测试链接
            </button>
          </div>
        </div>
      </template>

      <Teleport to="body">
        <div v-if="isWechatShareOpen" class="wechat-share-layer" @click.self="isWechatShareOpen = false">
          <div class="wechat-share-dialog">
            <button class="wechat-share-close" type="button" aria-label="关闭" @click="isWechatShareOpen = false">
              <X :size="18" />
            </button>
            <div class="wechat-share-icon">
              <MessageCircle :size="28" />
            </div>
            <h3>分享到微信</h3>
            <div class="wechat-share-copy">{{ assessmentShareTitle }}｜快来市场测试一下吧</div>
            <p v-if="isWechatBrowser()">请点击微信右上角菜单，将这份报告发送给朋友或分享到朋友圈。</p>
            <p v-else>用微信扫描二维码，打开后即可发送给朋友或分享到朋友圈。</p>
            <div class="wechat-qr-box">
              <canvas ref="wechatQrCanvasRef" width="188" height="188"></canvas>
            </div>
            <button class="secondary-button wechat-copy-link" type="button" @click="copyShareLink">
              <Link :size="17" />
              <span>复制链接</span>
            </button>
          </div>
        </div>
      </Teleport>
 
      <div ref="posterRef" class="poster-canvas">

        <!-- ① 顶部色条 -->
        <div class="poster-accent-bar" :style="{ background: playfulVerdict.color }"></div>

        <div class="poster-inner">

          <!-- ② 品牌行 -->
          <div class="poster-brand-row">
            <div class="poster-brand-dot" :style="{ background: playfulVerdict.color }"></div>
            <span class="poster-brand-name">Aether Valuation</span>
            <span class="poster-brand-ver">人间估值</span>
          </div>



          <!-- ③ HERO 区 -->
          <div class="poster-hero">
            <div class="poster-hero-grid"></div>

            <!-- 数字行：inline-flex，数字左，badge右上角自然跟随 -->
            <div class="poster-hero-num-row">
              <span class="poster-score-num" :style="{ color: playfulVerdict.color }">{{ result.score }}</span>
              <div class="poster-hero-badge" :style="{ background: playfulVerdict.color }">{{ playfulVerdict.badge }}</div>
            </div>

            <!-- 市场级别：独占一行，不挤数字 -->
            <div class="poster-hero-market" :style="{ color: playfulVerdict.color }">{{ result.marketLevel }}</div>

            <!-- 英文小字装饰 -->
            <div class="poster-hero-en">
              <span>{{ result.marketLevel.toUpperCase() }} · {{ playfulVerdict.title.toUpperCase() }}</span>
            </div>
          </div>

          <!-- ⑤ 六维雷达：视觉中心区块，独立背景 -->
          <div class="poster-radar-section">
            <p class="poster-section-label">六维画像</p>
            <div class="poster-radar-body">
              <svg class="poster-radar-svg" viewBox="-20 -20 220 220" xmlns="http://www.w3.org/2000/svg">
                <polygon v-for="r in [0.25, 0.5, 0.75, 1.0]" :key="r"
                  :points="hexPoints(90, 90, 72 * r)"
                  fill="none" stroke="#e2e8f0" stroke-width="1"/>
                <line v-for="(pt, i) in hexAxis(90, 90, 72)" :key="'ax'+i"
                  x1="90" y1="90" :x2="pt.x" :y2="pt.y"
                  stroke="#e2e8f0" stroke-width="1"/>
                <polygon
                  :points="radarPolygon(90, 90, 72)"
                  :fill="playfulVerdict.color"
                  fill-opacity="0.15"
                  :stroke="playfulVerdict.color"
                  stroke-width="1.5"
                  stroke-linejoin="round"/>
                <circle v-for="(pt, i) in radarDots(90, 90, 72)" :key="'dot'+i"
                  :cx="pt.x" :cy="pt.y" r="2.5"
                  :fill="playfulVerdict.color"/>
                <text v-for="(item, i) in radarLabelPositions(90, 90, 84)" :key="'lbl'+i"
                  :x="item.x" :y="item.y"
                  text-anchor="middle" dominant-baseline="middle"
                  font-size="10" fill="#64748b"
                  font-family="PingFang SC, system-ui, sans-serif">{{ item.label }}</text>
              </svg>

              <div class="poster-radar-list">
                <div v-for="item in radarItems" :key="item.key" class="poster-radar-row">
                  <span class="poster-radar-label">{{ item.label }}</span>
                  <div class="poster-radar-bar-wrap">
                    <div class="poster-radar-bar-fill"
                      :style="{ width: item.value + '%', background: playfulVerdict.color }"></div>
                  </div>
                  <span class="poster-radar-val">{{ item.value }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- ⑦ 报告摘要 -->
          <p class="poster-report-text">{{ result.report }}</p>

          <!-- ⑧ 页脚 -->
          <div class="poster-footer">
            <div class="poster-footer-left">
              <p class="poster-footer-tip">扫码测测你的人间估值</p>
              <p class="poster-footer-sub">真正的你，不被任何数字定义</p>
            </div>
            <div class="poster-qr-wrap">
              <div v-if="currentShareUrl" class="qr-code"></div>
              <div v-else class="poster-qr-placeholder">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5">
                  <rect x="3" y="3" width="7" height="7" rx="1"/>
                  <rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="3" y="14" width="7" height="7" rx="1"/>
                  <circle cx="17.5" cy="17.5" r="2.5"/>
                </svg>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>

.note-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.note-header .note-emoji {
  font-size: 28px;
}

.note-header strong {
  font-size: 22px;
  font-weight: 800;
  color: #111827;
  letter-spacing: -0.02em;
}

.note-content {
  margin: 0;
  color: #475569;
  font-size: 15.5px;
  line-height: 1.75;
}

.note-content strong {
  color: #334155;
  font-weight: 700;
}

.assessment-root {
  min-height: 100vh;
  background: #f5f5f7;
  color: #111827;
  font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  padding: 24px 20px;
}

.assessment-nav {
  width: min(1140px, 100%);
  max-width: 1140px;
  margin: 0 auto 32px;  
  padding: 0 32px;
  height: 78px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid rgba(226, 232, 240, 0.95);
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(20px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  
}

.brand-button,
.nav-meta button {
  border: 0;
  background: transparent;
  cursor: pointer;
}

.brand-button {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: #111827;
  font-weight: 900;
  font-size: 18px;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.brand-mark {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #111827;
  color: #f8fafc;
  font-weight: 900;
  font-size: 20px;
}

.diagnostic-text {
  color: #64748b;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.nav-meta {
  display: inline-flex;
  align-items: center;
  
}

.nav-meta span {
  color: #94a3b8;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.18em;
}

.nav-meta button {
  min-height: 42px;
  padding: 0 18px;
  border-radius: 999px;
  background: #2563eb;
  color: white;
  font-weight: 800;
}

.intro-stage,
.assessment-hero,
.assessment-layout,
.result-stage,
.loading-panel {
  width: min(1140px, 100%);
  max-width: 1240px;
  margin-left: auto;
  margin-right: auto;
}

.intro-stage {
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(330px, 0.72fr);
  gap: 18px;
  align-items: stretch;
}

.assessment-hero {
  display: grid;
  grid-template-columns: 1.35fr 0.65fr;
  gap: 28px;
  margin-bottom: 32px;
}

.intro-copy,
.intro-preview,
.hero-copy,
.hero-panel,
.input-panel,
.score-card,
.chart-card,
.report-card,
.result-hero-card,
.dimension-card,
.fun-card,
.advice-card,
.loading-panel {
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(226, 232, 240, 0.9);
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.07);
}

.intro-copy {
  position: relative;
  overflow: hidden;
  min-height: 470px;
  padding: 54px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(239, 246, 255, 0.88)),
    radial-gradient(circle at 86% 18%, rgba(37, 99, 235, 0.16), transparent 32%);
}

.intro-copy::after {
  content: '';
  position: absolute;
  right: 42px;
  bottom: 38px;
  width: 150px;
  height: 150px;
  border: 1px solid rgba(37, 99, 235, 0.14);
  border-radius: 28px;
  transform: rotate(8deg);
  background: rgba(255, 255, 255, 0.42);
}

.intro-copy h1 {
  position: relative;
  z-index: 1;
  max-width: 760px;
  margin: 18px 0;
  color: #111827;
  font-size: clamp(46px, 6.4vw, 86px);
  line-height: 0.98;
  font-weight: 950;
  letter-spacing: 0;
}

.intro-copy p {
  position: relative;
  z-index: 1;
  max-width: 660px;
  margin: 0;
  color: #64748b;
  font-size: 18px;
  line-height: 1.8;
}

.intro-warning {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 4px;
  max-width: 620px;
  margin-top: 24px;
  padding: 16px 18px;
  border-radius: 12px;
  background: rgba(239, 246, 255, 0.78);
  border: 1px solid rgba(191, 219, 254, 0.96);
  box-shadow: inset 3px 0 0 #2563eb;
}

.intro-warning strong {
  color: #1d4ed8;
  font-size: 14px;
}

.intro-warning span {
  color: #334155;
  font-size: 14px;
  line-height: 1.6;
  font-weight: 800;
}

.intro-actions {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 30px;
}

.intro-actions > span {
  color: #64748b;
  font-size: 13px;
  font-weight: 900;
}

.intro-start-button {
  width: auto;
  min-width: 180px;
  margin-top: 0;
  padding: 0 34px;
  border-radius: 999px;
}

.intro-preview {
  display: grid;
  align-content: start;
  gap: 18px;
  min-height: 470px;
  padding: 32px;
  background: #111827;
  color: #ffffff;
}

.intro-preview-top,
.intro-preview-score {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.intro-preview-top .panel-kicker {
  color: #93c5fd;
}

.intro-preview-top strong {
  display: inline-grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: #2563eb;
  font-size: 26px;
}

.intro-preview-score {
  min-height: 146px;
  padding: 22px;
  border-radius: 16px;
  background: #ffffff;
  color: #111827;
}

.intro-preview-score span,
.intro-preview-bars span {
  color: #94a3b8;
  font-size: 12px;
  font-weight: 900;
}

.intro-preview-score b {
  max-width: 150px;
  text-align: right;
  font-size: 34px;
  line-height: 1.05;
}

.intro-preview-bars {
  display: grid;
  gap: 14px;
}

.intro-preview-bars div {
  display: grid;
  gap: 8px;
}

.intro-preview-bars i {
  display: block;
  height: 10px;
  border-radius: 999px;
  background: linear-gradient(90deg, #60a5fa var(--bar), rgba(255, 255, 255, 0.14) var(--bar));
}

.intro-preview p {
  margin: 4px 0 0;
  color: #cbd5e1;
  line-height: 1.7;
  font-weight: 800;
}

.intro-points {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.intro-points div {
  min-height: 128px;
  padding: 20px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid #e2e8f0;
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.06);
}

.intro-points strong,
.intro-points span {
  display: block;
}

.intro-points strong {
  color: #111827;
  font-size: 16px;
}

.intro-points span {
  margin-top: 6px;
  color: #64748b;
  font-size: 13px;
  line-height: 1.55;
  font-weight: 700;
}

.hero-copy {
  padding: 48px;
}

.eyebrow,
.panel-kicker,
.panel-heading span {
  color: #2563eb;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.18em;
}

.hero-copy h1 {
  max-width: 780px;
  margin: 18px 0 18px;
  font-size: clamp(44px, 7vw, 92px);
  line-height: 0.96;
  font-weight: 950;
  letter-spacing: 0;
}

.hero-copy p {
  max-width: 680px;
  margin: 0;
  color: #64748b;
  font-size: 18px;
  line-height: 1.8;
}

.hero-panel {
  padding: 28px;
  align-self: stretch;
  display: grid;
  align-content: space-between;
  min-height: 260px;
}

.preview-grid {
  display: grid;
  gap: 12px;
}

.preview-grid div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 14px;
  border-bottom: 1px solid #e2e8f0;
}

.preview-grid span {
  color: #64748b;
  font-weight: 700;
}

.preview-grid strong {
  font-size: 28px;
}

.assessment-layout {
  display: block;
}

.input-panel,
.chart-card,
.report-card {
  padding: 28px;
}

.input-panel {
  width: 100%;
  padding: 48px 48px; /* 增加内边距 */
  max-width: 1140px;
  margin: 0 auto;
  border-radius: 16px;
}

.panel-heading {
  margin-bottom: 20px;
}

.panel-heading h2 {
  margin: 8px 0 0;
  font-size: 26px;
}

.input-note {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: -4px 0 22px;
  padding: 14px 16px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #64748b;
}

.input-note strong {
  color: #111827;
  white-space: nowrap;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.field {
  display: grid;
  gap: 8px;
}

.field-wide {
  grid-column: 1 / -1;
  margin-top: 16px;
}

.field label,
.field span,
.range-field span {
  color: #334155;
  font-size: 13px;
  font-weight: 900;
}

.field input,
.field select {
  width: 100%;
  box-sizing: border-box;
  min-height: 48px;
  border-radius: 8px;
  border: 1px solid #dbe3ef;
  background: #f8fafc;
  color: #111827;
  padding: 0 14px;
  outline: none;
}

.field input:focus,
.field select:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
}

.model-picker {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.model-picker button {
  min-height: 48px;
  border-radius: 8px;
  border: 1px solid #dbe3ef;
  background: #f8fafc;
  color: #64748b;
  cursor: pointer;
  font-weight: 900;
}

.model-picker button.active {
  background: #2563eb;
  border-color: #2563eb;
  color: #ffffff;
}

.range-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 16px;
}

.range-field {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px 14px;
  padding: 16px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.range-field small {
  display: block;
  margin-top: 4px;
  color: #94a3b8;
  line-height: 1.45;
}

.range-field strong {
  color: #10b981;
  font-size: 20px;
}

.range-field input {
  grid-column: 1 / -1;
  width: 100%;
  accent-color: #2563eb;
}

.submit-button {
  width: 100%;
  min-height: 56px;
  margin-top: 22px;
  border: 0;
  border-radius: 8px;
  background: #111827;
  color: #ffffff;
  cursor: pointer;
  font-weight: 900;
  font-size: 15px;
}

.submit-button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.error-banner {
  margin: 18px 0 0;
  padding: 13px 14px;
  border-radius: 8px;
  background: #fff1f2;
  border: 1px solid #fecdd3;
  color: #be123c;
  font-weight: 700;
}

.loading-panel {
  min-height: 460px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 20px;
}

.scanner {
  width: 92px;
  height: 92px;
  border-radius: 50%;
  border: 2px solid #dbe3ef;
  border-top-color: #2563eb;
  animation: spin 0.9s linear infinite;
}

.loading-panel p {
  color: #475569;
  font-weight: 900;
}

.result-stage {
  display: grid;
  gap: 24px;
}

.result-hero-card {
  min-height: 420px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 34px;
  padding: 42px;
  align-items: center;
  overflow: hidden;
  position: relative;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.94), rgba(239, 246, 255, 0.82)),
    #ffffff;
}

.result-hero-card::after {
  content: "";
  position: absolute;
  width: 360px;
  height: 360px;
  right: -100px;
  top: -120px;
  border-radius: 50%;
  background: rgba(37, 99, 235, 0.08);
}

.result-hero-card::before {
  content: "";
  position: absolute;
  width: 520px;
  height: 520px;
  right: 160px;
  bottom: -420px;
  border-radius: 50%;
  border: 1px dashed rgba(37, 99, 235, 0.18);
}

.result-copy {
  position: relative;
  z-index: 1;
}

.result-copy h2 {
  max-width: 760px;
  margin: 16px 0;
  font-size: clamp(40px, 6vw, 82px);
  line-height: 0.98;
  font-weight: 950;
  letter-spacing: 0;
}

.result-copy p {
  max-width: 680px;
  margin: 0;
  color: #64748b;
  font-size: 18px;
  line-height: 1.75;
}

.result-chip-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  max-width: 760px;
  margin-top: 24px;
}

.result-chip-row div {
  padding: 14px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(219, 227, 239, 0.9);
}

.result-chip-row span {
  display: block;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 900;
}

.result-chip-row strong {
  display: block;
  margin-top: 6px;
  color: #111827;
  font-size: 18px;
}

.soft-warning {
  display: inline-flex;
  max-width: 720px;
  margin-top: 22px;
  padding: 12px 14px;
  border-radius: 999px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #475569;
  font-size: 13px;
  font-weight: 800;
}

.score-orb {
  position: relative;
  z-index: 1;
  aspect-ratio: 1;
  width: 100%;
  max-width: 380px;
  border-radius: 50%;
  background: radial-gradient(circle at 38% 32%, rgba(255,255,255,0.98), #ffffff);
  border: 1px solid #dbe3ef;
  box-shadow: 
    inset 0 0 0 18px rgba(37, 99, 235, 0.08),
    0 30px 80px rgba(37, 99, 235, 0.22),
    0 0 0 12px rgba(255,255,255,0.6);
  display: grid;
  place-items: center;
  align-content: center;
  text-align: center;
  padding: 20px;
}

.badge-highlight {
  display: inline-block;
  color: #2563eb;
  font-size: 42px;
  font-weight: 900;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  background: linear-gradient(90deg, #2563eb, #3b82f6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 8px;
  text-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
  position: relative;
}

.badge-highlight::after {
  content: '';
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 48px;
  height: 3px;
  background: linear-gradient(90deg, transparent, #60a5fa, transparent);
  border-radius: 999px;
}

.score-orb span {
  color: #2563eb;
  font-size: 13px;
  font-weight: 950;
  letter-spacing: 0.18em;
}

/* 强化分数数字 */
.score-orb strong {
  font-size: 128px;
  line-height: 0.85;
  font-weight: 950;
  color: #0f172a;
  margin: 8px 0 4px;
  text-shadow: 0 4px 20px rgba(15, 23, 42, 0.15);
}

.score-orb em {
  font-size: 17px;
  font-style: normal;
  font-weight: 800;
  color: #475569;
  letter-spacing: 0.02em;
}

.result-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(360px, 0.65fr);
  gap: 24px;
}

.dimension-card,
.fun-card,
.advice-card {
  padding: 28px;
}

.chart-card {
  min-height: 500px;
}

.compact-heading {
  margin-bottom: 12px;
}

.dimension-list,
.fun-list {
  display: grid;
  gap: 12px;
}

.dimension-item {
  display: grid;
  grid-template-columns: 1fr 110px 42px;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.dimension-item strong,
.fun-list strong,
.report-card h3,
.fun-card h3,
.advice-card h3 {
  color: #111827;
}

.dimension-item span {
  display: block;
  margin-top: 2px;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 800;
}

.mini-meter {
  height: 8px;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
}

.mini-meter i {
  display: block;
  width: var(--meter);
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #2563eb, #10b981);
}

.dimension-item b {
  text-align: right;
  color: #2563eb;
}

.radar-chart {
  width: 100%;
  height: 420px;
}

.report-card {
  padding: 28px;
  background: #111827;
  color: #f8fafc;
}

.report-card .panel-kicker,
.report-card h3 {
  color: #f8fafc;
}

.memo-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 8px 8px 0 0;
  background: #1f2937;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-bottom: 0;
}

.memo-toolbar i {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #64748b;
}

.memo-toolbar i:first-child {
  background: #f87171;
}

.memo-toolbar i:nth-child(2) {
  background: #facc15;
}

.memo-toolbar i:nth-child(3) {
  background: #34d399;
}

.memo-toolbar span {
  margin-left: 8px;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 800;
}

.report-card p {
  margin: 0;
  padding: 20px;
  color: #e5e7eb;
  background: #0f172a;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 0 0 8px 8px;
  line-height: 1.9;
  font-size: 17px;
}

.fun-card {
  display: grid;
  align-content: start;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(248, 250, 252, 0.86)),
    #ffffff;
}

.fun-card h3,
.report-card h3,
.advice-card h3 {
  margin: 8px 0 16px;
  font-size: 24px;
}

.fun-list div {
  padding: 18px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.fun-list div:hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
}

.fun-list span {
  color: #2563eb;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.12em;
}

.fun-list strong {
  display: block;
  margin-top: 6px;
  font-size: 22px;
}

.fun-list p {
  margin: 8px 0 0;
  color: #64748b;
  line-height: 1.65;
}

.advice-card {
  grid-column: 1 / -1;
  background:
    linear-gradient(135deg, rgba(239, 246, 255, 0.9), rgba(255, 255, 255, 0.9)),
    #ffffff;
}

.advice-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 18px;
}

.advice-grid div {
  padding: 16px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(219, 227, 239, 0.9);
  color: #475569;
  line-height: 1.6;
  font-weight: 700;
}

.result-actions {
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr; /* [新增] 突出保存海报按钮 */
  gap: 12px;
  margin-top: 32px;
}

.gold-theme {
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%) !important;
  color: #000 !important;
  border: none !important;
  box-shadow: 0 8px 20px rgba(255, 165, 0, 0.3);
}

.poster-score {
  font-size: 72px;
  font-weight: 900;
  margin: 20px 0 10px;
}

/* ════════════════════════════════════════
   海报样式 — Apple 设计哲学重构版
   宽度 420px，三段布局：顶部/中部/底部
   ════════════════════════════════════════ */

.poster-canvas {
  position: absolute;
  top: 0;
  left: -9999px;
  width: 420px;
  background: #ffffff;
  font-family: "PingFang SC", "SF Pro Display", -apple-system, system-ui, sans-serif;
  overflow: hidden;
  box-sizing: border-box;
}

/* 顶部 4px 主题色条 */
.poster-accent-bar {
  height: 4px;
  width: 100%;
}

.poster-inner {
  padding: 0 0 36px;
}

/* 品牌行单独加横向 padding */
.poster-brand-row {
  padding: 24px 28px 0;
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 0;
}

/* HERO 以下区块横向 padding */
.poster-divider,
.poster-footer {
  padding-left: 28px;
  padding-right: 28px;
  box-sizing: border-box;
  width: 100%;
}

/* brand-row 样式已在上方合并 */

.poster-brand-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.poster-brand-name {
  font-size: 12px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: 0.02em;
}

.poster-brand-ver {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 400;
  margin-left: auto;
  letter-spacing: 0.04em;
}

/* ══ HERO 区 ══ */
.poster-hero {
  position: relative;
  padding: 20px 28px 20px;
  overflow: hidden;
  text-align: center;
}

.poster-hero-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(148,163,184,0.18) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148,163,184,0.18) 1px, transparent 1px);
  background-size: 22px 22px;
  z-index: 0;
}

/* 数字行：数字 + badge 水平排列，垂直居中对齐 */
.poster-hero-num-row {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 14px;
  line-height: 1;
}

/* 分数 */
.poster-score-num {
  font-size: 80px;
  font-weight: 900;
  line-height: 1;
  letter-spacing: -0.05em;
  display: block;
  text-shadow:
    0 2px 0 rgba(255,255,255,0.4),
    0 6px 20px rgba(0,0,0,0.1);
}

/* badge：与数字垂直居中，圆角矩形胶囊 */
.poster-hero-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 38px;
  padding: 0 20px;
  border-radius: 16px;
  color: #fff;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0.04em;
  flex-shrink: 0;
  box-shadow:
    0 4px 14px rgba(0,0,0,0.18),
    inset 0 1px 0 rgba(255,255,255,0.3),
    inset 0 -1px 0 rgba(0,0,0,0.1);
}

/* 市场级别：独占行，数字下方，留够间距 */
.poster-hero-market {
  position: relative;
  z-index: 1;
  display: block;
  font-size: 32px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.2;
  margin-top: 10px;
  margin-bottom: 12px;
}

/* 英文装饰一行 */
.poster-hero-en {
  position: relative;
  z-index: 1;
}

.poster-hero-en span {
  font-size: 10px;
  font-weight: 600;
  color: #94a3b8;
  letter-spacing: 0.2em;
  line-height: 1.6;
}

/* ── 分割线 ── */
.poster-divider {
  height: 1px;
  background: #f1f5f9;
  margin: 0 0 20px;
}

/* ── 六维画像 ── */
.poster-radar-section {
  margin-bottom: 0;
  padding: 24px 28px 30px;
  background: #fafbfc;
  border-top: 1px solid #f1f5f9;
  border-bottom: 1px solid #f1f5f9;
}

.poster-section-label {
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  margin: 0 0 16px;
}

.poster-radar-body {
  display: flex;
  align-items: center;
  gap: 20px;
}

.poster-radar-svg {
  width: 210px;
  height: 210px;
  flex-shrink: 0;
}

.poster-radar-list {
  flex: 1;
  display: grid;
  gap: 11px;
}

.poster-radar-row {
  display: grid;
  grid-template-columns: 52px 1fr 26px;
  align-items: center;
  gap: 7px;
}

.poster-radar-label {
  font-size: 11px;
  color: #64748b;
  font-weight: 500;
  white-space: nowrap;
}

.poster-radar-bar-wrap {
  height: 4px;
  background: #e8eef4;
  border-radius: 999px;
  overflow: hidden;
}

.poster-radar-bar-fill {
  height: 100%;
  border-radius: 999px;
}

.poster-radar-val {
  font-size: 11px;
  color: #0f172a;
  font-weight: 700;
  text-align: right;
}

/* ── 报告摘要 ── */
.poster-report-text {
  font-size: 12px;
  line-height: 1.75;
  color: #475569;
  margin: 0;
  padding: 20px 28px 20px;
  box-sizing: border-box;
  width: 100%;
  text-align: left;
  word-break: break-all;
  letter-spacing: 0.01em;
}

/* ── 页脚 ── */
.poster-footer {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.poster-footer-left {
  flex: 1;
}

.poster-footer-tip {
  font-size: 12px;
  font-weight: 600;
  color: #0f172a;
  margin: 0 0 3px;
}

.poster-footer-sub {
  font-size: 10px;
  color: #94a3b8;
  margin: 0;
  line-height: 1.5;
}

.poster-qr-wrap {
  flex-shrink: 0;
  width: 64px;
  height: 64px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qr-code {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qr-code canvas {
  width: 56px !important;
  height: 56px !important;
}

.poster-qr-placeholder {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ─── 按钮 ─── */
.result-actions .submit-button {
  margin-top: 0;
  min-height: 62px;
  padding: 0 48px;
  font-size: 16px;
  font-weight: 900;
  border-radius: 9999px;
  box-shadow: 0 10px 30px rgba(17, 24, 39, 0.15);
  transition: all 0.2s ease;
}

.result-actions .submit-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 40px rgba(17, 24, 39, 0.2);
}

.shared-report-actions {
  width: min(1140px, 100%);
  margin: 32px auto 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 24px;
  align-items: center;
  padding: 24px;
  border-radius: 18px;
  border: 1px solid rgba(191, 219, 254, 0.95);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(239, 246, 255, 0.92)),
    radial-gradient(circle at 90% 20%, rgba(37, 99, 235, 0.14), transparent 34%);
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.09);
}

.shared-action-copy strong {
  display: block;
  margin-top: 8px;
  color: #111827;
  font-size: 24px;
  line-height: 1.25;
}

.shared-action-copy p {
  max-width: 620px;
  margin: 8px 0 0;
  color: #64748b;
  font-size: 14px;
  line-height: 1.65;
  font-weight: 800;
}

.shared-action-buttons {
  display: flex;
  align-items: center;
  gap: 12px;
}

.shared-primary-action,
.shared-secondary-action {
  width: auto;
  min-width: 148px;
  margin-top: 0;
  padding: 0 28px;
}

.shared-primary-action {
  border-radius: 999px;
  box-shadow: 0 14px 34px rgba(17, 24, 39, 0.16);
}

.shared-secondary-action {
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.86);
}

/* 单按钮专属样式 */
.single-action-btn {
  max-width: 380px;
  width: 100%;
}

.secondary-button {
  min-height: 56px;
  border-radius: 8px;
  border: 1px solid #dbe3ef;
  background: rgba(255, 255, 255, 0.86);
  color: #111827;
  cursor: pointer;
  font-weight: 900;
}

.share-action-wrap {
  position: relative;
  min-width: 0;
}

.share-trigger,
.share-menu button,
.wechat-copy-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
}

.share-trigger svg,
.share-menu svg,
.wechat-copy-link svg {
  flex: 0 0 auto;
}

.share-menu {
  position: absolute;
  left: 0;
  right: 0;
  bottom: calc(100% + 10px);
  z-index: 20;
  display: grid;
  gap: 6px;
  padding: 8px;
  border-radius: 12px;
  border: 1px solid rgba(219, 227, 239, 0.95);
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.16);
}

.share-menu button {
  min-height: 46px;
  padding: 0 12px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #111827;
  cursor: pointer;
  font-weight: 900;
}

.share-menu button:hover {
  background: #f1f5f9;
}

.wechat-share-layer {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.42);
  backdrop-filter: blur(8px);
}

.wechat-share-dialog {
  position: relative;
  width: min(360px, 100%);
  padding: 28px;
  border-radius: 18px;
  border: 1px solid rgba(219, 227, 239, 0.98);
  background: #ffffff;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.22);
  text-align: center;
}

.wechat-share-close {
  position: absolute;
  top: 14px;
  right: 14px;
  display: inline-grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  background: #ffffff;
  color: #475569;
  cursor: pointer;
}

.wechat-share-icon {
  display: inline-grid;
  place-items: center;
  width: 58px;
  height: 58px;
  border-radius: 18px;
  background: #dcfce7;
  color: #16a34a;
}

.wechat-share-dialog h3 {
  margin: 16px 0 8px;
  color: #111827;
  font-size: 22px;
}

.wechat-share-copy {
  margin: 0 0 12px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #111827;
  font-size: 14px;
  font-weight: 900;
}

.wechat-share-dialog p {
  margin: 0;
  color: #64748b;
  font-size: 14px;
  line-height: 1.65;
  font-weight: 700;
}

.wechat-qr-box {
  display: grid;
  place-items: center;
  width: 212px;
  height: 212px;
  margin: 20px auto;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
}

.wechat-copy-link {
  min-height: 48px;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(18px);
  }
}

@keyframes zoomIn {
  from {
    opacity: 0;
    transform: scale(0.98);
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.animate-fade-in {
  animation: fadeIn 0.45s ease-out forwards;
}

.animate-zoom-in {
  animation: zoomIn 0.35s ease-out forwards;
}

@media (max-width: 960px) {
  .assessment-root {
    padding: 14px;
  }

  .assessment-nav,
  .intro-stage,
  .intro-points,
  .assessment-hero,
  .assessment-layout,
  .result-hero-card,
  .result-grid,
  .result-actions,
  .shared-report-actions {
    grid-template-columns: 1fr;
  }

  .assessment-nav {
    border-radius: 24px;
    margin: 0 auto 32px;
  }

  .intro-copy,
  .hero-copy {
    padding: 28px;
  }

  .intro-copy,
  .intro-preview {
    min-height: auto;
  }

  .intro-copy::after {
    display: none;
  }

  .score-orb {
    width: min(280px, 100%);
    justify-self: center;
  }

  .shared-action-buttons {
    display: grid;
    grid-template-columns: 1fr;
  }

  .shared-primary-action,
  .shared-secondary-action {
    width: 100%;
  }
}

@media (max-width: 680px) {
  .assessment-nav,
  .nav-meta,
  .form-grid,
  .range-grid,
  .advice-grid,
  .dimension-item {
    grid-template-columns: 1fr;
  }

  .assessment-nav,
  .nav-meta {
    display: grid;
  }

  .hero-copy h1 {
    font-size: 42px;
  }

  .intro-copy h1 {
    font-size: 42px;
  }

  .intro-preview {
    padding: 22px;
  }

  .intro-preview-score {
    min-height: 112px;
  }

  .intro-preview-score b {
    font-size: 26px;
  }

  .intro-points div {
    min-height: auto;
  }

  .input-panel,
  .chart-card,
  .report-card {
    padding: 18px;
  }

  .input-note {
    align-items: flex-start;
    display: grid;
  }

  .radar-chart {
    height: 310px;
  }

  .soft-warning {
    border-radius: 8px;
  }

  .dimension-item b {
    text-align: left;
  }

  .share-menu {
    position: absolute;
    margin-top: 0;
  }

  .wechat-share-dialog {
    padding: 24px;
  }
}
</style>
