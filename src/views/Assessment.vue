<script setup lang="ts">
import { computed, nextTick, onUnmounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import * as echarts from 'echarts'

import { onMounted } from 'vue'

onMounted(() => {
  document.title = 'Aether Valuation | 人间估值'
})

type AssessmentStep = 'input' | 'loading' | 'result'
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
  advice?: string[]
}

interface ApiResponse<T> {
  code?: number
  message?: string
  data?: T
}

const router = useRouter()
const step = ref<AssessmentStep>('input')
const loadingMsg = ref('正在校对输入指标...')
const errorMessage = ref('')
const result = ref<AssessmentResult | null>(null)
let chart: echarts.ECharts | null = null
let loadingTimer: number | undefined

const form = reactive<AssessmentForm>({
  gender: 'MALE',
  height: 175,
  visualHeight: 178,
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
  '正在生成一份轻拿轻放的报告...'
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
  return [
    { label: 'Income', value: formatCurrency(form.annualIncome) },
    { label: 'Visual delta', value: `${form.visualHeight - form.height >= 0 ? '+' : ''}${form.visualHeight - form.height}cm` },
    { label: 'Mode', value: 'Play' }
  ]
})

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
  if (score >= 90) {
    return {
      title: '稀有皮肤，建议低调',
      subtitle: '拥有让人眼前一亮的魅力值，简直是行走的惊喜',
      badge: '夯'
    }
  }

  if (score >= 75) {
    return {
      title: '品质在线，值得信赖',
      subtitle: '各方面都表现不错，是那种让人觉得很舒服的存在',
      badge: '顶级'
    }
  }

  if (score >= 55) {
    return {
      title: '潜力股选手',
      subtitle: '已经很棒了，再打磨一下就是精品',
      badge: '人上人'
    }
  }

  if (score >= 30) {
    return {
      title: '成长型选手',
      subtitle: '基础不错，还有很大提升空间，未来可期。',
      badge: 'NPC'
    }
  }

  return {
    title: '原生态宝藏',
    subtitle: '先别急着破防，每个人都有自己的闪光点，这份报告只是记录当下的状态',
    badge: '拉完了'
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

function normalizeResult(payload: unknown): AssessmentResult {
  const source = (payload || {}) as Partial<AssessmentResult>
  const radar = (source.radar || {}) as Partial<AssessmentRadar>

  return {
    score: normalizeScore(source.score),
    marketLevel: source.marketLevel || '估值完成',
    report: source.report || '系统已完成评估，但未返回报告文本。',
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

async function startAnalysis() {
  if (!canSubmit.value) {
    errorMessage.value = '请确认年龄不低于 18，收入、资产和负债不能为负数。'
    return
  }

  errorMessage.value = ''
  result.value = null
  step.value = 'loading'
  startLoadingMessages()

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

    await nextTick()
    renderRadar()
  } catch (error) {
    step.value = 'input'
    errorMessage.value = axios.isAxiosError(error) && error.response?.data?.message
      ? error.response.data.message
      : error instanceof Error
        ? error.message
        : '访问人数太多啦，评估功能暂不可用呢，WWWW'
  } finally {
    stopLoadingMessages()
  }
}

function resetAssessment() {
  result.value = null
  errorMessage.value = ''
  step.value = 'input'
  chart?.dispose()
  chart = null
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
  window.removeEventListener('resize', resizeChart)
  chart?.dispose()
})
</script>

<template>
  <main class="assessment-root">
    <nav class="assessment-nav">
      <button class="brand-button" type="button" @click="router.push({ name: 'home' })">
        <span class="brand-mark">V</span>
        <span>Aether Valuation | 人间估值</span>
      </button>
      <div class="nav-meta">
        <span>PLAYFUL DIAGNOSTIC</span>         
      </div>
    </nav>

    <section class="assessment-hero">
      <div class="hero-copy">
        <span class="eyebrow">SATIRE FIRST / DATA SECOND</span>
        <h1>人间估值</h1>
        <p>轻松填写，静静欣赏。这会是一份有趣的报告，但它永远不会定义真实的你。</p>

      </div>
      <aside class="hero-panel" aria-label="当前输入摘要">
        <span class="panel-kicker">LIVE PREVIEW</span>
        <div class="preview-grid">
          <div v-for="item in assetPreview" :key="item.label">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </div>
        </div>
        <p class="preview-note">Private by design. Sent only when you submit.</p>
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

      <div class="result-actions">
        
        <button type="button" class="submit-button single-action-btn" @click="resetAssessment">重新生成</button>
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

.assessment-hero,
.assessment-layout,
.result-stage,
.loading-panel {
  width: min(1140px, 100%);
  max-width: 1240px;
  margin-left: auto;
  margin-right: auto;
}

.assessment-hero {
  display: grid;
  grid-template-columns: 1.35fr 0.65fr;
  gap: 28x;
  margin-bottom: 32px;
}

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
  display: flex;
  justify-content: center;
  margin-top: 32px;
  padding: 0 20px;
}

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
  .assessment-hero,
  .assessment-layout,
  .result-hero-card,
  .result-grid,
  .result-actions {
    grid-template-columns: 1fr;
  }

  .assessment-nav {
    border-radius: 24px;
    margin: 0 auto 32px;
  }

  .hero-copy {
    padding: 28px;
  }

  .score-orb {
    width: min(280px, 100%);
    justify-self: center;
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
}
</style>
