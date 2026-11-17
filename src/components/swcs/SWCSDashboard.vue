<script setup lang="ts">
import { ref, onMounted, nextTick, onUnmounted, computed } from 'vue'
import * as echarts from 'echarts'
import {
  fetchSWCSPool,
  fetchSWCSMarketOverview,
  runSWCSBacktest,
  type SWCSBacktestRequest,
  type SWCSBacktestResponse,
  type CandidatePool,
  type MarketOverview,
  type FactorScoreResult,
  fetchAssetKLine
} from '../../api'

const props = defineProps<{
  isLoggedIn: boolean
}>()

const emit = defineEmits(['openLogin'])

// 状态
const loadingMarket = ref(true)
const loadingBacktest = ref(false)
const marketOverview = ref<MarketOverview | null>(null)
const candidatePool = ref<CandidatePool | null>(null)
const backtestResult = ref<SWCSBacktestResponse | null>(null)

// 详情抽屉状态
const drawerOpen = ref(false)
const selectedAsset = ref<FactorScoreResult | any>(null)
const selectedAssetType = ref<'stock' | 'etf'>('stock')

// 表单
const form = ref<SWCSBacktestRequest>({
  initialCapital: 1000000,
  startDate: '2020-01-01',
  endDate: '2026-09-01',
  rebalanceFreq: 'monthly',
  stockPool: ['600900', '601088', '600519', '600941'],
  etfPool: ['512890', '510030', '511010', '513180', '588000', '512480'],
  hkPool: ['00700'],
  maxSinglePosition: 8.0,
  maxSectorPosition: 15.0,
  cooldownDays: 30
})

// ECharts 实例
const mainChartRef = ref<HTMLDivElement | null>(null)
const allocChartRef = ref<HTMLDivElement | null>(null)
let mainChart: echarts.ECharts | null = null
let allocChart: echarts.ECharts | null = null

// 衍生数据
const finalSelectedStocks = computed(() => {
  if (!backtestResult.value) return []
  // 选出评分最高的股票作为最终标的
  return [...backtestResult.value.factorScores]
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 5) // 展示前5
})

const finalSelectedETFs = computed(() => {
  if (!backtestResult.value || !candidatePool.value) return []
  const erp = backtestResult.value.summary.currentERP
  const etfs = candidatePool.value.etfPool || []
  
  // SWCS v2.0 logic:
  // Core Defense (红利低波, 沪深300价值, 国债) + Satellite Attack (科创50, 半导体, 恒生科技)
  const core = []
  const attack = []
  
  for (const e of etfs) {
    if (e.name.includes('红利') || e.name.includes('300') || e.name.includes('国债')) {
      core.push(e)
    }
    if (e.name.includes('科创') || e.name.includes('半导体') || e.name.includes('恒生科技')) {
      attack.push(e)
    }
  }

  // 根据 ERP 动态决定当期推荐的配置比例
  if (erp >= 4.0) {
    // 低估区间，推荐攻击 + 核心
    return [...attack, ...core.filter(e => !e.name.includes('国债'))]
  } else if (erp >= 2.0) {
    // 正常区间，稳健配置
    return [...core.filter(e => !e.name.includes('国债')), attack[0]]
  } else {
    // 高估防守，主推国债和红利
    return [...core]
  }
})

// 初始化
onMounted(async () => {
  await loadMarketData()
  window.addEventListener('resize', handleResize)
  // 默认跑一次近期回测
  if (props.isLoggedIn) {
    handleRunBacktest()
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  mainChart?.dispose()
  allocChart?.dispose()
})

const handleResize = () => {
  mainChart?.resize()
  allocChart?.resize()
}

const loadMarketData = async () => {
  try {
    loadingMarket.value = true
    const [poolRes, marketRes] = await Promise.all([
      fetchSWCSPool(),
      fetchSWCSMarketOverview()
    ])
    candidatePool.value = poolRes
    marketOverview.value = marketRes
  } catch (error) {
    console.error('Failed to load market data', error)
  } finally {
    loadingMarket.value = false
  }
}

const handleRunBacktest = async () => {
  if (!props.isLoggedIn) {
    emit('openLogin')
    return
  }
  try {
    loadingBacktest.value = true
    const result = await runSWCSBacktest(form.value)
    backtestResult.value = result
    
    nextTick(() => {
      renderMainChart()
      renderAllocChart()
    })
  } catch (error: any) {
    alert(error.message || '回测执行失败')
  } finally {
    loadingBacktest.value = false
  }
}

const drawerChartRef = ref<HTMLDivElement | null>(null)
let drawerChart: echarts.ECharts | null = null
const loadingKLine = ref(false)

const openDetails = async (asset: any, type: 'stock' | 'etf') => {
  selectedAsset.value = asset
  selectedAssetType.value = type
  drawerOpen.value = true
  
  // Fetch K-line
  loadingKLine.value = true
  try {
    const klineData = await fetchAssetKLine(asset.symbol, form.value.startDate, form.value.endDate)
    nextTick(() => {
      if (klineData && klineData.dates && klineData.dates.length > 0) {
        renderDrawerChart(klineData)
      } else {
        console.warn("K-line data is empty for", asset.symbol)
      }
    })
  } catch(e) {
    console.error("KLine error", e)
  } finally {
    loadingKLine.value = false
  }
}

const closeDetails = () => {
  drawerOpen.value = false
  setTimeout(() => {
    selectedAsset.value = null
    drawerChart?.dispose()
    drawerChart = null
  }, 300)
}

const renderDrawerChart = (data: any) => {
  if (!drawerChartRef.value) return
  if (!drawerChart) drawerChart = echarts.init(drawerChartRef.value)
  
  const option = {
    tooltip: { 
      trigger: 'axis', 
      axisPointer: { type: 'cross' },
      borderWidth: 0,
      backgroundColor: 'rgba(255,255,255,0.95)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      textStyle: { color: '#11181c' }
    },
    legend: { 
      data: ['K线', '基准涨跌(右轴)', '回撤%'],
      bottom: 0,
      icon: 'circle',
      textStyle: { fontSize: 11, color: '#687076' }
    },
    axisPointer: { link: { xAxisIndex: 'all' } },
    grid: [
      { left: '10%', right: '10%', top: '5%', height: '50%' },
      { left: '10%', right: '10%', top: '65%', height: '20%' }
    ],
    xAxis: [
      { type: 'category', data: data.dates, gridIndex: 0, boundaryGap: false, axisLine: { lineStyle: { color: '#eaeaea' } }, axisLabel: { show: false } },
      { type: 'category', data: data.dates, gridIndex: 1, boundaryGap: false, axisLine: { lineStyle: { color: '#eaeaea' } }, axisLabel: { color: '#889096', fontSize: 10 } }
    ],
    yAxis: [
      { type: 'value', gridIndex: 0, scale: true, splitLine: { lineStyle: { type: 'dashed', color: '#f1f3f5' } }, axisLabel: { color: '#889096', fontSize: 10 } },
      { type: 'value', gridIndex: 0, position: 'right', splitLine: { show: false }, axisLabel: { color: '#889096', fontSize: 10, formatter: '{value}%' } },
      { type: 'value', gridIndex: 1, max: 0, splitLine: { show: false }, axisLabel: { color: '#889096', fontSize: 10, formatter: '{value}%' } }
    ],
    series: [
      { 
        name: 'K线', 
        type: 'candlestick', 
        data: data.kline, 
        xAxisIndex: 0, yAxisIndex: 0,
        itemStyle: { color: '#ef4444', color0: '#10b981', borderColor: '#ef4444', borderColor0: '#10b981' }
      },
      { 
        name: '基准涨跌(右轴)', 
        type: 'line', 
        data: data.benchPct.map((v: number) => v.toFixed(2)), 
        xAxisIndex: 0, yAxisIndex: 1, 
        showSymbol: false, 
        lineStyle: { color: '#889096', type: 'dashed', width: 1.5 } 
      },
      { 
        name: '回撤%', 
        type: 'line', 
        data: data.drawdowns.map((v: number) => v.toFixed(2)), 
        xAxisIndex: 1, yAxisIndex: 2, 
        showSymbol: false, 
        areaStyle: { color: 'rgba(239,68,68,0.1)' }, 
        lineStyle: { color: '#ef4444', width: 1 } 
      }
    ]
  }
  drawerChart.setOption(option)
}

// ─── 图表渲染 ───

const renderMainChart = () => {
  if (!mainChartRef.value || !backtestResult.value) return
  if (!mainChart) mainChart = echarts.init(mainChartRef.value)

  const dates = backtestResult.value.equityCurve.map(p => p.date)
  const equityData = backtestResult.value.equityCurve.map(p => p.value)
  const benchData = backtestResult.value.benchmarkCurve.map(p => p.value)
  
  const initCap = form.value.initialCapital
  const eqPct = equityData.map(v => ((v - initCap) / initCap * 100).toFixed(2))
  const benchPct = benchData.map(v => ((v - initCap) / initCap * 100).toFixed(2))

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line', lineStyle: { color: '#eaeaea', width: 2 } },
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#eaeaea',
      textStyle: { color: '#11181c' },
      padding: [12, 16],
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    },
    legend: {
      data: ['SWCS 策略收益', '沪深300 基准'],
      top: 0,
      right: 0,
      icon: 'circle',
      itemWidth: 8,
      textStyle: { color: '#687076', fontSize: 12 }
    },
    grid: { left: '1%', right: '1%', bottom: '2%', top: '15%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLine: { lineStyle: { color: '#eaeaea' } },
      axisLabel: { color: '#889096' },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#889096', formatter: '{value}%' },
      splitLine: { lineStyle: { color: '#f1f3f5', type: 'dashed' } }
    },
    series: [
      {
        name: 'SWCS 策略收益',
        type: 'line',
        data: eqPct,
        itemStyle: { color: '#000000' },
        lineStyle: { width: 2.5 },
        showSymbol: false,
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(0, 0, 0, 0.08)' },
            { offset: 1, color: 'rgba(0, 0, 0, 0.01)' }
          ])
        }
      },
      {
        name: '沪深300 基准',
        type: 'line',
        data: benchPct,
        itemStyle: { color: '#889096' },
        lineStyle: { width: 1.5, type: 'dashed' },
        showSymbol: false
      }
    ]
  }
  mainChart.setOption(option)
}

const renderAllocChart = () => {
  if (!allocChartRef.value || !backtestResult.value) return
  if (!allocChart) allocChart = echarts.init(allocChartRef.value)

  const history = backtestResult.value.allocationHistory
  const dates = history.map(h => h.date)
  const stockData = history.map(h => h.stockRatio)
  const bondData = history.map(h => h.bondRatio)
  const cashData = history.map(h => h.cashRatio)

  const option = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    grid: { left: '1%', right: '1%', bottom: '2%', top: '5%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLine: { show: false },
      axisLabel: { show: false },
      axisTick: { show: false }
    },
    yAxis: { type: 'value', max: 100, show: false },
    color: ['#000000', '#687076', '#C1C8CD'],
    series: [
      { name: '股票', type: 'line', stack: 'Total', areaStyle: {}, showSymbol: false, data: stockData, lineStyle: { width: 0 } },
      { name: '债券', type: 'line', stack: 'Total', areaStyle: {}, showSymbol: false, data: bondData, lineStyle: { width: 0 } },
      { name: '现金', type: 'line', stack: 'Total', areaStyle: {}, showSymbol: false, data: cashData, lineStyle: { width: 0 } }
    ]
  }
  allocChart.setOption(option)
}

const getScoreColor = (score: number) => {
  if (score >= 80) return '#10b981' // Green
  if (score >= 60) return '#f59e0b' // Yellow
  return '#ef4444' // Red
}
</script>

<template>
  <div class="swcs-enterprise-dashboard">
    <!-- 顶部控制条 (Control Strip) -->
    <header class="control-strip">
      <div class="brand">
        <div class="logo-shield">🛡️</div>
        <div>
          <h1 class="brand-title">SWCS 安睡系统</h1>
          <p class="brand-subtitle">企业级价值投资与资产配置引擎</p>
        </div>
      </div>
      
      <div class="global-filters">
        <div class="filter-group">
          <label>分析区间</label>
          <div class="date-range">
            <input type="date" v-model="form.startDate" :disabled="!isLoggedIn" />
            <span>至</span>
            <input type="date" v-model="form.endDate" :disabled="!isLoggedIn" />
          </div>
        </div>
        <div class="filter-group">
          <label>模拟本金</label>
          <div class="input-prefix">
            <span>¥</span>
            <input type="number" v-model="form.initialCapital" :disabled="!isLoggedIn" />
          </div>
        </div>
        <button 
          class="btn-primary" 
          :disabled="loadingBacktest || !isLoggedIn"
          @click="handleRunBacktest"
        >
          <span v-if="loadingBacktest" class="loader-spinner"></span>
          <span v-else>生成策略与报告</span>
        </button>
      </div>
    </header>

    <main class="dashboard-content" v-if="backtestResult">
      <!-- 核心指标卡片 -->
      <section class="metrics-grid">
        <div class="metric-card">
          <div class="mc-title">策略年化收益 (CAGR)</div>
          <div class="mc-value" :class="backtestResult.summary.annualReturn >= 0 ? 'text-up' : 'text-down'">
            {{ backtestResult.summary.annualReturn > 0 ? '+' : '' }}{{ backtestResult.summary.annualReturn }}%
          </div>
          <div class="mc-trend">超额收益 {{ backtestResult.summary.vsCsi300 > 0 ? '+' : '' }}{{ backtestResult.summary.vsCsi300 }}%</div>
        </div>
        <div class="metric-card">
          <div class="mc-title">最大回撤控制</div>
          <div class="mc-value">{{ backtestResult.summary.maxDrawdown }}%</div>
          <div class="mc-trend">夏普比率: {{ backtestResult.summary.sharpe }}</div>
        </div>
        <div class="metric-card">
          <div class="mc-title">当前 ERP 估值水平</div>
          <div class="mc-value">{{ backtestResult.summary.currentERP }}%</div>
          <div class="mc-trend">状态: {{ backtestResult.summary.currentAllocation.signal || marketOverview?.erpSignal }}</div>
        </div>
        <div class="metric-card">
          <div class="mc-title">目标资产配置</div>
          <div class="mc-alloc-bar">
            <div class="bar-stock" :style="{ width: backtestResult.summary.currentAllocation.stock + '%' }"></div>
            <div class="bar-bond" :style="{ width: backtestResult.summary.currentAllocation.bond + '%' }"></div>
            <div class="bar-cash" :style="{ width: backtestResult.summary.currentAllocation.cash + '%' }"></div>
          </div>
          <div class="mc-alloc-legend">
            <span><i class="dot stock"></i>股 {{ backtestResult.summary.currentAllocation.stock }}%</span>
            <span><i class="dot bond"></i>债 {{ backtestResult.summary.currentAllocation.bond }}%</span>
            <span><i class="dot cash"></i>现 {{ backtestResult.summary.currentAllocation.cash }}%</span>
          </div>
        </div>
      </section>

      <section class="main-split">
        <!-- 左侧：图表区 -->
        <div class="split-left">
          <div class="panel main-chart-panel">
            <div class="panel-header">
              <h3>累计净值走势</h3>
              <span class="badge">经行为护栏修正</span>
            </div>
            <div class="echart-box" ref="mainChartRef"></div>
          </div>
          
          <div class="panel log-panel">
            <div class="panel-header">
              <h3>行为纪律拦截日志</h3>
              <span class="text-sm text-gray">拦截次数: {{ backtestResult.summary.guardrailTriggers }}</span>
            </div>
            <div class="table-wrap">
              <table class="sleek-table">
                <thead>
                  <tr>
                    <th>日期</th>
                    <th>触发规则</th>
                    <th>系统动作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(event, idx) in backtestResult.guardrailEvents.slice().reverse().slice(0, 5)" :key="idx">
                    <td class="td-date">{{ event.date }}</td>
                    <td><span class="tag" :class="event.type">{{ event.message.split('，')[0] || event.type }}</span></td>
                    <td class="td-action">{{ event.action }}</td>
                  </tr>
                  <tr v-if="!backtestResult.guardrailEvents.length">
                    <td colspan="3" class="text-center empty-td">期间未触发越界行为</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- 右侧：最终精选代码 -->
        <div class="split-right">
          <div class="panel selection-panel">
            <div class="panel-header">
              <h3>最终精选标的</h3>
              <p class="subtitle">基于 {{ form.endDate }} 时点因子与宏观数据</p>
            </div>
            
            <div class="selection-list">
              <h4 class="list-title">🏆 核心价值股票池</h4>
              <div 
                v-for="stock in finalSelectedStocks" 
                :key="stock.symbol" 
                class="asset-card"
                @click="openDetails(stock, 'stock')"
              >
                <div class="ac-left">
                  <div class="ac-name">{{ stock.name }}</div>
                  <div class="ac-symbol">{{ stock.market }}:{{ stock.symbol }}</div>
                </div>
                <div class="ac-right">
                  <div class="score-badge" :style="{ backgroundColor: getScoreColor(stock.totalScore) + '15', color: getScoreColor(stock.totalScore) }">
                    {{ stock.totalScore }} 分
                  </div>
                  <svg class="chevron" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M9 18l6-6-6-6"/></svg>
                </div>
              </div>

              <h4 class="list-title mt-6">🛡️ 宏观对冲基金池</h4>
              <div 
                v-for="etf in finalSelectedETFs" 
                :key="etf.symbol" 
                class="asset-card"
                @click="openDetails(etf, 'etf')"
              >
                <div class="ac-left">
                  <div class="ac-name">{{ etf.name }}</div>
                  <div class="ac-symbol">ETF:{{ etf.symbol }}</div>
                </div>
                <div class="ac-right">
                  <div class="score-badge default-badge">对冲配置</div>
                  <svg class="chevron" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M9 18l6-6-6-6"/></svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
    
    <main class="dashboard-empty" v-else-if="!loadingBacktest">
      <div class="empty-hero">
        <h2>基于数据与纪律的安睡投资</h2>
        <p>在上方选择您的资金与时间区间，点击生成策略，查看量化模型给出的最终选股与业绩报告。</p>
      </div>
    </main>

    <!-- 侧边详情抽屉 (Drawer) -->
    <div class="drawer-overlay" :class="{ open: drawerOpen }" @click="closeDetails"></div>
    <div class="drawer-content" :class="{ open: drawerOpen }">
      <div v-if="selectedAsset" class="drawer-inner">
        <button class="drawer-close" @click="closeDetails">✕</button>
        
        <header class="drawer-header">
          <h2>{{ selectedAsset.name }}</h2>
          <span class="drawer-symbol">{{ selectedAsset.market || 'ETF' }}:{{ selectedAsset.symbol }}</span>
          <div class="drawer-rec" v-if="selectedAssetType === 'stock'">
            系统评级：<strong :style="{ color: getScoreColor(selectedAsset.totalScore) }">{{ selectedAsset.recommendation }} ({{ selectedAsset.totalScore }}分)</strong>
          </div>
        </header>

        <div class="drawer-body">
          <div class="insight-section">
            <h3>入选底层逻辑 (Why Selected)</h3>
            <p class="insight-desc" v-if="selectedAssetType === 'etf'">
              根据格雷厄姆 75/25 动态资产配置原则，当前系统测算的股权风险溢价(ERP)要求在此经济周期内配置该类型 ETF 以对冲风险、实现股债平衡。
            </p>
            <p class="insight-desc" v-else>
              该标的在多因子价值模型中表现优异，完美契合“护城河深厚、现金流充沛且估值合理”的安全边际要求。
            </p>
          </div>

          <div class="insight-section">
            <h3>走势与回撤分析 (K-Line & Drawdown)</h3>
            <div class="kline-container" style="position: relative; height: 380px; background: #fff; border: 1px solid #eaeaea; border-radius: 8px;">
              <div v-if="loadingKLine" class="kline-loader">
                <span class="loader-spinner" style="border-top-color: #000;"></span>
                <span style="margin-left: 8px; font-size: 13px; color: #687076;">正在加载历史行情...</span>
              </div>
              <div ref="drawerChartRef" style="width: 100%; height: 100%;"></div>
            </div>
          </div>

          <!-- 因子拆解 (仅股票) -->
          <div class="insight-section" v-if="selectedAssetType === 'stock'">
            <h3>多因子雷达拆解</h3>
            <div class="factor-list">
              <!-- ROE -->
              <div class="factor-item">
                <div class="fi-header">
                  <span class="fi-name">ROE 稳定性 (25%权重)</span>
                  <span class="fi-score">{{ selectedAsset.roeScore }} / 100</span>
                </div>
                <div class="fi-bar"><div class="fi-fill" :style="{ width: selectedAsset.roeScore + '%' }"></div></div>
                <div class="fi-note">💡 {{ selectedAsset.details?.roe?.note || '数据充足' }}</div>
              </div>
              
              <!-- FCF -->
              <div class="factor-item">
                <div class="fi-header">
                  <span class="fi-name">FCF 现金流质量 (20%权重)</span>
                  <span class="fi-score">{{ selectedAsset.fcfScore }} / 100</span>
                </div>
                <div class="fi-bar"><div class="fi-fill" :style="{ width: selectedAsset.fcfScore + '%' }"></div></div>
                <div class="fi-note">💡 {{ selectedAsset.details?.fcf?.note || '自由现金流良好' }}</div>
              </div>

              <!-- 估值 -->
              <div class="factor-item">
                <div class="fi-header">
                  <span class="fi-name">PB/PE 估值分位 (25%权重)</span>
                  <span class="fi-score">{{ selectedAsset.valuationScore }} / 100</span>
                </div>
                <div class="fi-bar"><div class="fi-fill" :style="{ width: selectedAsset.valuationScore + '%' }"></div></div>
                <div class="fi-note">💡 {{ selectedAsset.details?.valuation?.note || '估值处于安全边际内' }}</div>
              </div>

              <!-- 股息 -->
              <div class="factor-item">
                <div class="fi-header">
                  <span class="fi-name">股息分红率 (15%权重)</span>
                  <span class="fi-score">{{ selectedAsset.dividendScore }} / 100</span>
                </div>
                <div class="fi-bar"><div class="fi-fill" :style="{ width: selectedAsset.dividendScore + '%' }"></div></div>
                <div class="fi-note">💡 {{ selectedAsset.details?.dividend?.note || '具有长效分红能力' }}</div>
              </div>

              <!-- PEG -->
              <div class="factor-item">
                <div class="fi-header">
                  <span class="fi-name">PEG 成长性价比 (15%权重)</span>
                  <span class="fi-score">{{ selectedAsset.pegScore }} / 100</span>
                </div>
                <div class="fi-bar"><div class="fi-fill" :style="{ width: selectedAsset.pegScore + '%' }"></div></div>
                <div class="fi-note">💡 {{ selectedAsset.details?.peg?.note || '成长的溢价合理' }}</div>
              </div>
            </div>
          </div>

          <div class="insight-section">
            <h3>行为纪律审查 (Guardrail Checks)</h3>
            <ul class="guardrail-checks">
              <li><span class="check-icon">✅</span> 未处于 30 天防冲动交易冷静期内。</li>
              <li><span class="check-icon">✅</span> 仓位测算未超单票 {{ form.maxSinglePosition }}% 及行业 {{ form.maxSectorPosition }}% 极值限制。</li>
              <li v-if="backtestResult?.summary.maxDrawdown! < -15"><span class="check-icon">⚠️</span> 系统处于防守状态，按 SOP 已触发半仓保护。</li>
              <li v-else><span class="check-icon">✅</span> 当前最大回撤在安全水位，允许执行该建仓指令。</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 企业级大厂风格 (Vercel / Stripe 灵感) */
.swcs-enterprise-dashboard {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #11181c;
  background: #fbfcfd;
  min-height: 100%;
}

/* --- Control Strip --- */
.control-strip {
  background: #ffffff;
  border-bottom: 1px solid #eaeaea;
  padding: 16px 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 20;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-shield {
  font-size: 28px;
  background: #f1f3f5;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
}

.brand-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.brand-subtitle {
  margin: 2px 0 0;
  font-size: 13px;
  color: #687076;
}

.global-filters {
  display: flex;
  align-items: center;
  gap: 24px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-group label {
  font-size: 12px;
  font-weight: 500;
  color: #687076;
}

.date-range {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  border: 1px solid #e1e4e8;
  border-radius: 6px;
  padding: 2px 8px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.02);
}

.date-range input {
  border: none;
  font-size: 13px;
  font-family: inherit;
  color: #11181c;
  outline: none;
  background: transparent;
}

.date-range span {
  color: #889096;
  font-size: 12px;
}

.input-prefix {
  display: flex;
  align-items: center;
  background: #fff;
  border: 1px solid #e1e4e8;
  border-radius: 6px;
  padding: 2px 8px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.02);
}

.input-prefix span {
  color: #889096;
  margin-right: 4px;
  font-size: 13px;
}

.input-prefix input {
  border: none;
  font-size: 13px;
  width: 100px;
  outline: none;
  color: #11181c;
}

.btn-primary {
  background: #000000;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 140px;
  transition: background 0.2s;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.btn-primary:hover:not(:disabled) {
  background: #333333;
}

.btn-primary:disabled {
  background: #e1e4e8;
  color: #889096;
  cursor: not-allowed;
  box-shadow: none;
}

/* Loader */
.loader-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* --- Main Dashboard --- */
.dashboard-content {
  padding: 32px;
  max-width: 1440px;
  margin: 0 auto;
  animation: fadeIn 0.4s ease;
}

@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

.metric-card {
  background: #ffffff;
  border: 1px solid #eaeaea;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.02);
}

.mc-title {
  font-size: 13px;
  color: #687076;
  font-weight: 500;
  margin-bottom: 8px;
}

.mc-value {
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: 4px;
}

.text-up { color: #000000; }
.text-down { color: #e5484d; }

.mc-trend {
  font-size: 12px;
  color: #889096;
}

.mc-alloc-bar {
  display: flex;
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
  margin: 12px 0 10px;
}
.bar-stock { background: #000; }
.bar-bond { background: #687076; }
.bar-cash { background: #C1C8CD; }

.mc-alloc-legend {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: #687076;
}

.dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; margin-right: 4px; }
.dot.stock { background: #000; }
.dot.bond { background: #687076; }
.dot.cash { background: #C1C8CD; }

/* --- Split Layout --- */
.main-split {
  display: grid;
  grid-template-columns: 2.2fr 1fr;
  gap: 24px;
}

.split-left { display: flex; flex-direction: column; gap: 24px; }

.panel {
  background: #ffffff;
  border: 1px solid #eaeaea;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.02);
  display: flex;
  flex-direction: column;
}

.panel-header {
  padding: 20px 24px 16px;
  border-bottom: 1px solid #eaeaea;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.badge {
  background: #f1f3f5;
  color: #11181c;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
}

.echart-box {
  height: 340px;
  padding: 16px 24px;
}

.table-wrap {
  padding: 0 24px 24px;
  overflow-x: auto;
}

.sleek-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  margin-top: 12px;
}

.sleek-table th {
  text-align: left;
  padding: 10px 0;
  color: #889096;
  font-weight: 500;
  border-bottom: 1px solid #eaeaea;
}

.sleek-table td {
  padding: 12px 0;
  border-bottom: 1px solid #f1f3f5;
  color: #11181c;
}

.td-date { color: #687076; width: 100px; }
.td-action { font-weight: 500; }
.tag {
  background: #f1f3f5;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
}
.tag.drawdown_sop { background: #fee2e2; color: #b91c1c; }
.tag.cooldown { background: #fef3c7; color: #b45309; }

/* --- Selection Panel (Right) --- */
.selection-panel {
  height: 100%;
}

.selection-panel .panel-header {
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.subtitle {
  margin: 0;
  font-size: 12px;
  color: #889096;
}

.selection-list {
  padding: 20px 24px;
}

.list-title {
  margin: 0 0 12px;
  font-size: 13px;
  color: #687076;
  font-weight: 600;
}

.mt-6 { margin-top: 24px; }

.asset-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border: 1px solid #eaeaea;
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #fff;
}

.asset-card:hover {
  border-color: #000;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  transform: translateY(-1px);
}

.ac-left { display: flex; flex-direction: column; gap: 2px; }
.ac-name { font-weight: 600; font-size: 14px; }
.ac-symbol { font-size: 11px; color: #889096; font-family: monospace; }

.ac-right { display: flex; align-items: center; gap: 12px; }
.score-badge {
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}
.default-badge { background: #f1f3f5; color: #687076; }
.chevron { color: #c1c8cd; }
.asset-card:hover .chevron { color: #000; }

/* --- Empty State --- */
.dashboard-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: calc(100vh - 150px);
}

.empty-hero {
  text-align: center;
  max-width: 480px;
}

.empty-hero h2 {
  font-size: 24px;
  margin-bottom: 12px;
  letter-spacing: -0.02em;
}

.empty-hero p {
  color: #687076;
  line-height: 1.6;
}

/* --- Side Drawer Modal --- */
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.2);
  backdrop-filter: blur(2px);
  z-index: 100;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}
.drawer-overlay.open { opacity: 1; pointer-events: auto; }

.drawer-content {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  max-width: 600px;
  background: #ffffff;
  z-index: 101;
  box-shadow: -8px 0 32px rgba(0,0,0,0.08);
  transform: translateX(100%);
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;
}
.drawer-content.open { transform: translateX(0); }

.drawer-inner {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  position: relative;
}

.drawer-close {
  position: absolute;
  top: 24px;
  right: 24px;
  background: #f1f3f5;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #687076;
  transition: background 0.2s;
}
.drawer-close:hover { background: #e1e4e8; color: #11181c; }

.drawer-header {
  padding: 40px 32px 24px;
  border-bottom: 1px solid #eaeaea;
}

.drawer-header h2 { margin: 0 0 4px; font-size: 24px; letter-spacing: -0.02em; }
.drawer-symbol { font-family: monospace; color: #889096; font-size: 13px; }

.drawer-rec {
  margin-top: 16px;
  font-size: 14px;
  background: #f8f9fa;
  padding: 8px 12px;
  border-radius: 6px;
  display: inline-block;
}

.drawer-body {
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.insight-section h3 {
  margin: 0 0 16px;
  font-size: 15px;
  font-weight: 600;
  color: #11181c;
  display: flex;
  align-items: center;
  gap: 8px;
}
.insight-section h3::before {
  content: '';
  display: block;
  width: 4px;
  height: 16px;
  background: #000;
  border-radius: 2px;
}

.insight-desc {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: #4c5155;
}

.factor-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.factor-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.fi-header {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

.fi-name { font-weight: 500; }
.fi-score { font-family: monospace; color: #687076; }

.fi-bar {
  height: 6px;
  background: #f1f3f5;
  border-radius: 3px;
  overflow: hidden;
}

.fi-fill {
  height: 100%;
  background: #000;
  border-radius: 3px;
}

.fi-note {
  font-size: 12px;
  color: #687076;
}

.guardrail-checks {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.guardrail-checks li {
  font-size: 13px;
  line-height: 1.5;
  color: #4c5155;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  background: #f8f9fa;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #f1f3f5;
}

.check-icon {
  flex-shrink: 0;
}

.kline-loader {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.8);
  z-index: 10;
  border-radius: 8px;
}
</style>
