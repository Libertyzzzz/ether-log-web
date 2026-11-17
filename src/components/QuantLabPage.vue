<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import * as echarts from 'echarts'
import { Activity, BarChart3, Database, Download, Play, Save, Settings2, TrendingDown, TrendingUp } from 'lucide-vue-next'
import {
  fetchQuantStrategies,
  runQuantBacktest,
  saveQuantStrategy,
  type BacktestRequest,
  type BacktestSummary,
  type CurvePoint,
  type TradeRecord,
  type QuantStrategy,
} from '../api'
import { toast } from '../utils/toast'
import SWCSDashboard from './swcs/SWCSDashboard.vue'
const props = defineProps<{
  isLoggedIn: boolean
}>()

const emit = defineEmits<{
  openLogin: []
}>()

type ChartMode = 'equity' | 'drawdown'

const defaultStrategies: QuantStrategy[] = [
  { id: 1, name: '均线交叉', type: 'ma-cross', description: '用短周期均线突破长周期均线识别趋势切换。' },
  { id: 2, name: '动量突破', type: 'momentum', description: '捕捉价格突破近期高点后的延续行情。' },
  { id: 3, name: 'RSI 反转', type: 'rsi', description: '观察超买超卖区间，寻找均值回归机会。' },
  { id: 4, name: '自定义模型', type: 'custom', description: '预留给后续因子、机器学习或组合策略。' },
]

const strategies = ref<QuantStrategy[]>(defaultStrategies)

const form = reactive<BacktestRequest>({
  symbol: 'BTC-USDT',
  timeframe: '1D',
  strategyType: 'ma-cross',
  initialCapital: 100000,
  positionRatio: 35,
  takeProfit: 12,
  stopLoss: 6,
  startDate: '2025-01-01',
  endDate: '2026-06-05',
})

const summary = ref<BacktestSummary>({
  totalReturn: 28.6,
  annualReturn: 18.4,
  maxDrawdown: -9.8,
  sharpe: 1.42,
  winRate: 57.8,
  trades: 46,
  profitFactor: 1.76,
  lastRunAt: '2026-06-05 09:30',
})

const equityCurve = ref<CurvePoint[]>([
  { date: '2025-01', value: 100000 },
  { date: '2025-03', value: 105800 },
  { date: '2025-05', value: 103600 },
  { date: '2025-07', value: 112400 },
  { date: '2025-09', value: 119300 },
  { date: '2025-11', value: 116800 },
  { date: '2026-01', value: 124600 },
  { date: '2026-03', value: 128600 },
])

const drawdownCurve = ref<CurvePoint[]>([
  { date: '2025-01', value: 0 },
  { date: '2025-03', value: -2.4 },
  { date: '2025-05', value: -6.7 },
  { date: '2025-07', value: -3.1 },
  { date: '2025-09', value: -1.8 },
  { date: '2025-11', value: -8.2 },
  { date: '2026-01', value: -4.4 },
  { date: '2026-03', value: -2.1 },
])

const tradeRecords = ref<TradeRecord[]>([
  { id: 1, time: '2026-03-18', side: 'BUY', symbol: 'BTC-USDT', price: 67240, quantity: 0.42, pnl: 0, note: '短均线上穿' },
  { id: 2, time: '2026-04-02', side: 'SELL', symbol: 'BTC-USDT', price: 72180, quantity: 0.42, pnl: 2074.8, note: '趋势减弱止盈' },
  { id: 3, time: '2026-04-19', side: 'BUY', symbol: 'BTC-USDT', price: 69520, quantity: 0.38, pnl: 0, note: '突破确认' },
  { id: 4, time: '2026-05-06', side: 'SELL', symbol: 'BTC-USDT', price: 68110, quantity: 0.38, pnl: -535.8, note: '止损离场' },
])

const chartMode = ref<ChartMode>('equity')
const isSWCSActive = ref(false)
const isRunning = ref(false)
const chartRef = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null

const isLocked = computed(() => !props.isLoggedIn)
const activeStrategy = computed(() => strategies.value.find(item => item.type === form.strategyType) || strategies.value[0])

const overviewCards = computed(() => [
  { label: '策略数量', value: strategies.value.length.toString(), suffix: '套', tone: 'blue', icon: Database },
  { label: '模拟收益', value: `+${summary.value.totalReturn.toFixed(1)}`, suffix: '%', tone: 'green', icon: TrendingUp },
  { label: '最大回撤', value: summary.value.maxDrawdown.toFixed(1), suffix: '%', tone: 'red', icon: TrendingDown },
  { label: '胜率', value: summary.value.winRate.toFixed(1), suffix: '%', tone: 'slate', icon: Activity },
])

function formatMoney(value: number) {
  return value.toLocaleString('zh-CN', { maximumFractionDigits: 0 })
}

function formatPnl(value: number) {
  if (value === 0) return '—'
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}`
}

function getChartOption(): echarts.EChartsOption {
  const data = chartMode.value === 'equity' ? equityCurve.value : drawdownCurve.value
  const isEquity = chartMode.value === 'equity'

  return {
    grid: { left: 42, right: 18, top: 32, bottom: 34 },
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(15,23,42,0.92)', borderWidth: 0, textStyle: { color: '#f8fafc' } },
    xAxis: {
      type: 'category',
      data: data.map(item => item.date),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#cbd5e1' } },
      axisLabel: { color: '#64748b' },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#64748b' },
      splitLine: { lineStyle: { color: 'rgba(148,163,184,0.18)' } },
    },
    series: [{
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 7,
      data: data.map(item => item.value),
      lineStyle: { width: 3, color: isEquity ? '#2563eb' : '#ef4444' },
      itemStyle: { color: isEquity ? '#2563eb' : '#ef4444' },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: isEquity ? 'rgba(37,99,235,0.22)' : 'rgba(239,68,68,0.18)' },
          { offset: 1, color: 'rgba(255,255,255,0)' },
        ]),
      },
    }],
  }
}

function renderChart() {
  if (!chartRef.value) return
  chart ||= echarts.init(chartRef.value)
  chart.setOption(getChartOption())
}

async function handleRunBacktest() {
  if (isLocked.value) {
    emit('openLogin')
    return
  }
  isRunning.value = true
  try {
    const result = await runQuantBacktest({ ...form })
    summary.value = result.summary
    equityCurve.value = result.equityCurve
    drawdownCurve.value = result.drawdownCurve
    tradeRecords.value = result.trades
    toast('策略回测执行完成！', 'success')
  } catch (err: any) {
    toast(err.message || '回测执行失败，请检查量化服务状态', 'error')
  } finally {
    isRunning.value = false
    await nextTick()
    renderChart()
  }
}

async function handleSaveStrategy() {
  if (isLocked.value) {
    emit('openLogin')
    return
  }
  try {
    await saveQuantStrategy({ ...form, name: activeStrategy.value.name })
    toast('策略配置已保存', 'success')
  } catch (err: any) {
    toast(err.message || '保存策略失败', 'error')
  }
}

function handleExportTrades() {
  if (!tradeRecords.value.length) {
    toast('暂无交易记录可导出', 'info')
    return
  }
  const headers = ['时间', '方向', '标的', '价格', '数量', '收益', '备注']
  const rows = tradeRecords.value.map(t => [
    t.time,
    t.side,
    t.symbol,
    t.price,
    t.quantity,
    t.pnl,
    `"${(t.note || '').replace(/"/g, '""')}"`,
  ])
  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `trades_${form.symbol}_${form.strategyType}.csv`
  a.click()
  URL.revokeObjectURL(url)
  toast('交易记录导出成功', 'success')
}

function handleResize() {
  chart?.resize()
}

function selectStrategy(type: QuantStrategy['type']) {
  isSWCSActive.value = false
  form.strategyType = type
}

function selectSWCS() {
  isSWCSActive.value = true
}

watch(chartMode, () => nextTick(renderChart))

watch(isSWCSActive, async (active) => {
  if (!active) {
    chart?.dispose()
    chart = null
    await nextTick()
    renderChart()
  }
})

onMounted(async () => {
  try {
    const list = await fetchQuantStrategies()
    if (list && list.length) {
      strategies.value = list
    }
  } catch {
    // 降级保留默认策略
  }
  await nextTick()
  renderChart()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
  chart = null
})
</script>

<template>
  <section class="quant-page" :class="{ locked: isLocked }">
    <div class="quant-inner">
      <header class="quant-hero">
        <div class="quant-hero-main">
          <div class="quant-hero-top">
            <span class="quant-kicker">Private / Quant Lab</span>
            <div class="quant-status">
              <span class="quant-status-dot" :class="{ ready: !isLocked }"></span>
              {{ isLocked ? 'Preview Mode' : 'Sandbox Ready' }}
            </div>
          </div>
          <h1>量化实验室</h1>
          <p>{{ isLocked ? '策略回测工作台预览模式，登录后可运行回测、保存参数并导出交易记录。' : '把交易想法拆解为可验证的参数、回测曲线与交易明细。' }}</p>
        </div>
        <div class="quant-hero-aside">
          <div class="quant-aside-item">
            <span>当前模型</span>
            <strong>{{ isSWCSActive ? 'SWCS 安睡系统' : activeStrategy.name }}</strong>
          </div>
          <div class="quant-aside-divider"></div>
          <div class="quant-aside-item">
            <span>{{ isSWCSActive ? '市场范围' : '回测标的' }}</span>
            <strong>{{ isSWCSActive ? 'A股 / 港股 ETF' : `${form.symbol} · ${form.timeframe}` }}</strong>
          </div>
        </div>
      </header>

      <div class="quant-overview">
        <article v-for="card in overviewCards" :key="card.label" class="quant-metric" :class="`tone-${card.tone}`">
          <div class="quant-metric-head">
            <span>{{ card.label }}</span>
            <component :is="card.icon" :size="16" />
          </div>
          <strong>{{ card.value }}<small>{{ card.suffix }}</small></strong>
        </article>
      </div>

      <div class="strategy-selector">
        <div class="strategy-tabs" role="tablist" aria-label="策略模型切换">
          <button
            v-for="strategy in strategies"
            :key="strategy.type"
            type="button"
            role="tab"
            :aria-selected="!isSWCSActive && form.strategyType === strategy.type"
            class="strategy-tab-btn"
            :class="{ active: !isSWCSActive && form.strategyType === strategy.type }"
            @click="selectStrategy(strategy.type)"
          >
            {{ strategy.name }}
          </button>
          <button
            type="button"
            role="tab"
            :aria-selected="isSWCSActive"
            class="strategy-tab-btn swcs-tab"
            :class="{ active: isSWCSActive }"
            @click="selectSWCS"
          >
            🛡️ SWCS 安睡系统
          </button>
        </div>
      </div>

      <div v-if="isSWCSActive" class="swcs-stage">
        <SWCSDashboard :isLoggedIn="isLoggedIn" @openLogin="$emit('openLogin')" />
      </div>

      <template v-else>
        <div class="quant-workbench">
          <aside class="quant-panel config-panel">
            <div v-if="isLocked" class="locked-callout">
              <strong>登录后解锁实验台</strong>
              <span>运行回测、保存策略和导出结果会在这里接入后端接口。</span>
              <button type="button" @click="$emit('openLogin')">登录账户</button>
            </div>

            <div class="panel-title">
              <Settings2 :size="17" />
              <h2>策略配置</h2>
            </div>

            <p class="strategy-desc">{{ activeStrategy.description }}</p>

            <div class="config-grid">
              <label>
                <span>标的代码</span>
                <input v-model="form.symbol" type="text" :disabled="isLocked" />
              </label>
              <label>
                <span>周期</span>
                <select v-model="form.timeframe" :disabled="isLocked">
                  <option>15m</option>
                  <option>1H</option>
                  <option>4H</option>
                  <option>1D</option>
                </select>
              </label>
              <label>
                <span>初始资金</span>
                <input v-model.number="form.initialCapital" type="number" min="1000" :disabled="isLocked" />
              </label>
              <label>
                <span>仓位比例 %</span>
                <input v-model.number="form.positionRatio" type="number" min="1" max="100" :disabled="isLocked" />
              </label>
              <label>
                <span>止盈 %</span>
                <input v-model.number="form.takeProfit" type="number" min="0" :disabled="isLocked" />
              </label>
              <label>
                <span>止损 %</span>
                <input v-model.number="form.stopLoss" type="number" min="0" :disabled="isLocked" />
              </label>
              <label>
                <span>开始日期</span>
                <input v-model="form.startDate" type="date" :disabled="isLocked" />
              </label>
              <label>
                <span>结束日期</span>
                <input v-model="form.endDate" type="date" :disabled="isLocked" />
              </label>
            </div>

            <div class="config-actions">
              <button class="run-btn" type="button" :disabled="isRunning" @click="handleRunBacktest">
                <Play :size="15" />
                {{ isLocked ? '登录运行' : isRunning ? '回测中...' : '运行回测' }}
              </button>
              <button class="soft-btn" type="button" @click="handleSaveStrategy">
                <Save :size="15" />
                保存策略
              </button>
            </div>
          </aside>

          <main class="quant-main">
            <section class="quant-panel result-panel">
              <div class="panel-title">
                <BarChart3 :size="17" />
                <h2>回测摘要</h2>
                <small>Last run {{ summary.lastRunAt }}</small>
              </div>
              <div class="summary-grid">
                <div><span>总收益率</span><strong class="positive">+{{ summary.totalReturn }}%</strong></div>
                <div><span>年化收益</span><strong>+{{ summary.annualReturn }}%</strong></div>
                <div><span>最大回撤</span><strong class="negative">{{ summary.maxDrawdown }}%</strong></div>
                <div><span>夏普比率</span><strong>{{ summary.sharpe }}</strong></div>
                <div><span>胜率</span><strong>{{ summary.winRate }}%</strong></div>
                <div><span>交易次数</span><strong>{{ summary.trades }}</strong></div>
                <div><span>盈亏比</span><strong>{{ summary.profitFactor }}</strong></div>
              </div>
            </section>

            <section class="quant-panel chart-panel">
              <div class="chart-toolbar">
                <div class="panel-title">
                  <TrendingUp :size="17" />
                  <h2>曲线分析</h2>
                </div>
                <div class="chart-tabs">
                  <button type="button" :class="{ active: chartMode === 'equity' }" @click="chartMode = 'equity'">收益曲线</button>
                  <button type="button" :class="{ active: chartMode === 'drawdown' }" @click="chartMode = 'drawdown'">回撤曲线</button>
                </div>
              </div>
              <div ref="chartRef" class="quant-chart"></div>
            </section>
          </main>
        </div>

        <section class="quant-panel trades-panel">
          <div class="panel-title">
            <Activity :size="17" />
            <h2>交易记录</h2>
            <button class="export-btn" type="button" @click="isLocked ? $emit('openLogin') : handleExportTrades()">
              <Download :size="14" />
              {{ isLocked ? '登录导出' : '导出结果' }}
            </button>
          </div>
          <div class="trade-table">
            <div class="trade-row trade-head">
              <span>时间</span><span>方向</span><span>标的</span><span>价格</span><span>数量</span><span>收益</span><span>备注</span>
            </div>
            <div v-for="trade in tradeRecords" :key="trade.id" class="trade-row">
              <span>{{ trade.time }}</span>
              <span :class="trade.side === 'BUY' ? 'side-buy' : 'side-sell'">{{ trade.side }}</span>
              <span>{{ trade.symbol }}</span>
              <span>{{ formatMoney(trade.price) }}</span>
              <span>{{ trade.quantity }}</span>
              <span :class="{ positive: trade.pnl > 0, negative: trade.pnl < 0 }">{{ formatPnl(trade.pnl) }}</span>
              <span>{{ trade.note }}</span>
            </div>
          </div>
        </section>
      </template>
    </div>
  </section>
</template>

<style scoped>
.quant-page {
  min-height: 100dvh;
  padding: 5.75rem 0 4rem;
  background: #ffffff;
  color: #111111;
}

.quant-inner {
  width: 100%;
  max-width: var(--nav-content-max-width, 1140px);
  margin: 0 auto;
  padding: 0 1.25rem;
  box-sizing: border-box;
  display: grid;
  gap: 1.5rem;
}

/* ── Unified Editorial Dark Studio Hero ── */
.quant-hero {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.5rem;
  padding: 1.75rem 2rem;
  border-radius: 16px;
  background:
    radial-gradient(circle at 88% 18%, rgba(253, 248, 0, 0.12), transparent 20rem),
    #111111;
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #ffffff;
}

.quant-hero-top {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  margin-bottom: 0.85rem;
  flex-wrap: wrap;
}

.quant-kicker {
  display: inline-block;
  padding: 0.28rem 0.8rem;
  background: #FDF800;
  color: #111111;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border-radius: 999px;
}

.quant-hero h1 {
  margin: 0;
  font-size: clamp(1.85rem, 1.35rem + 1.8vw, 2.5rem);
  line-height: 1.1;
  font-weight: 800;
  letter-spacing: -0.025em;
  color: #ffffff;
}

.quant-hero p {
  max-width: 520px;
  margin: 0.65rem 0 0;
  color: rgba(255, 255, 255, 0.68);
  font-size: 0.92rem;
  line-height: 1.6;
}

.quant-status {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.28rem 0.75rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.72rem;
  font-weight: 650;
  white-space: nowrap;
}

.quant-hero-aside {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 1rem 1.35rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.quant-aside-item {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.quant-aside-item span {
  font-size: 0.72rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
}

.quant-aside-item strong {
  font-size: 0.95rem;
  font-weight: 750;
  color: #ffffff;
  white-space: nowrap;
}

.quant-aside-divider {
  width: 1px;
  height: 2rem;
  background: rgba(255, 255, 255, 0.12);
}

.quant-status-dot {
  width: 0.48rem;
  height: 0.48rem;
  border-radius: 50%;
  background: #f59e0b;
  box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.16);
}

.quant-status-dot.ready {
  background: #10b981;
  box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.16);
}

/* ── Overview Metrics ── */
.quant-overview {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
}

.quant-metric {
  padding: 1.2rem 1.25rem;
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.quant-metric:hover {
  border-color: rgba(0, 0, 0, 0.16);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
}

.quant-metric-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.quant-metric-head svg {
  color: rgba(0, 0, 0, 0.45);
}

.quant-metric span {
  color: rgba(0, 0, 0, 0.56);
  font-size: 0.78rem;
  font-weight: 650;
}

.quant-metric strong {
  color: #111111;
  font-size: 1.75rem;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.02em;
}

.quant-metric small {
  margin-left: 0.18rem;
  color: rgba(0, 0, 0, 0.4);
  font-size: 0.8rem;
  font-weight: 600;
}

.tone-green strong,
.positive {
  color: #059669 !important;
}

.tone-red strong,
.negative {
  color: #dc2626 !important;
}

/* ── Strategy Tabs ── */
.strategy-selector {
  margin-bottom: -0.25rem;
}

.strategy-tabs {
  display: flex;
  flex-wrap: wrap;
  flex-wrap: balance;
  gap: 0.55rem;
}

.strategy-tab-btn,
.chart-tabs button {
  min-height: 2.35rem;
  padding: 0.45rem 1.15rem;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 999px;
  background: #ffffff;
  color: rgba(0, 0, 0, 0.65);
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 650;
  white-space: nowrap;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.strategy-tab-btn:hover,
.chart-tabs button:hover {
  border-color: #111111;
  color: #111111;
}

.strategy-tab-btn.active,
.chart-tabs button.active {
  background: #111111;
  color: #ffffff;
  border-color: #111111;
}

.strategy-tab-btn.swcs-tab {
  border-color: rgba(0, 0, 0, 0.14);
  background: #fafaf9;
  color: #111111;
}

.strategy-tab-btn.swcs-tab.active {
  background: #FDF800;
  border-color: #FDF800;
  color: #111111;
}

.swcs-stage {
  animation: fadeIn 0.25s ease;
}

/* ── Workbench Layout ── */
.quant-workbench {
  display: grid;
  grid-template-columns: minmax(18rem, 0.78fr) minmax(0, 1.22fr);
  gap: 1.25rem;
  align-items: start;
}

.quant-panel {
  min-width: 0;
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  transition: border-color 0.2s ease;
}

.config-panel,
.result-panel,
.chart-panel,
.trades-panel {
  padding: 1.35rem;
}

.locked-callout {
  margin-bottom: 1.15rem;
  padding: 1rem;
  border-radius: 12px;
  background: #111111;
  color: #ffffff;
  display: grid;
  gap: 0.5rem;
}

.locked-callout strong {
  font-size: 0.9rem;
  font-weight: 750;
}

.locked-callout span {
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.8rem;
  line-height: 1.55;
}

.locked-callout button {
  width: max-content;
  min-height: 2.2rem;
  padding: 0 1rem;
  margin-top: 0.15rem;
  border: 0;
  border-radius: 999px;
  background: #FDF800;
  color: #111111;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 750;
  transition: transform 0.15s ease;
}

.locked-callout button:hover {
  transform: translateY(-1px);
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin-bottom: 1rem;
}

.panel-title h2 {
  margin: 0;
  color: #111111;
  font-size: 1rem;
  font-weight: 750;
}

.panel-title svg {
  color: #111111;
}

.panel-title small {
  margin-left: auto;
  color: rgba(0, 0, 0, 0.45);
  font-size: 0.74rem;
  font-weight: 600;
}

.strategy-desc {
  min-height: 2.8rem;
  margin: 0 0 1rem;
  color: rgba(0, 0, 0, 0.58);
  line-height: 1.6;
  font-size: 0.84rem;
}

.config-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.config-grid label {
  display: grid;
  gap: 0.4rem;
  color: rgba(0, 0, 0, 0.65);
  font-size: 0.74rem;
  font-weight: 700;
}

.config-grid input,
.config-grid select {
  width: 100%;
  min-height: 2.5rem;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 10px;
  background: #ffffff;
  color: #111111;
  padding: 0 0.75rem;
  font-size: 0.86rem;
  font-weight: 600;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.config-grid input:focus,
.config-grid select:focus {
  border-color: #111111;
  box-shadow: 0 0 0 3px rgba(17, 17, 17, 0.08);
}

.config-grid input:disabled,
.config-grid select:disabled {
  cursor: not-allowed;
  background: #f8fafc;
  color: rgba(0, 0, 0, 0.4);
}

.config-actions {
  display: flex;
  gap: 0.65rem;
  margin-top: 1.15rem;
}

.run-btn,
.soft-btn,
.export-btn {
  min-height: 2.6rem;
  border-radius: 999px;
  border: 1px solid transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  cursor: pointer;
  font-size: 0.84rem;
  font-weight: 700;
  transition: background 0.2s ease, transform 0.15s ease, border-color 0.2s ease;
}

.run-btn {
  flex: 1;
  background: #111111;
  color: #ffffff;
}

.run-btn:hover:not(:disabled) {
  background: #27272a;
  transform: translateY(-1px);
}

.run-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.soft-btn,
.export-btn {
  padding: 0 1rem;
  background: #ffffff;
  border-color: rgba(0, 0, 0, 0.12);
  color: #111111;
}

.soft-btn:hover,
.export-btn:hover {
  border-color: #111111;
  background: #fafaf9;
}

.export-btn {
  margin-left: auto;
  min-height: 2.2rem;
  font-size: 0.78rem;
}

.quant-main {
  min-width: 0;
  display: grid;
  gap: 1.25rem;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.75rem;
}

.summary-grid div {
  padding: 0.9rem;
  border-radius: 12px;
  background: #fafaf9;
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.summary-grid span {
  display: block;
  color: rgba(0, 0, 0, 0.52);
  font-size: 0.74rem;
  font-weight: 650;
  margin-bottom: 0.35rem;
}

.summary-grid strong {
  color: #111111;
  font-size: 1.08rem;
  font-weight: 750;
}

.chart-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  margin-bottom: 0.75rem;
}

.chart-toolbar .panel-title {
  margin-bottom: 0;
}

.chart-tabs {
  display: inline-flex;
  gap: 0.45rem;
}

.chart-tabs button {
  min-height: 2.1rem;
  padding: 0 0.85rem;
  font-size: 0.78rem;
}

.quant-chart {
  height: 19rem;
}

.trades-panel .panel-title {
  margin-bottom: 0.9rem;
}

.trade-table {
  overflow-x: auto;
  scrollbar-gutter: stable;
}

.trade-row {
  min-width: 44rem;
  display: grid;
  grid-template-columns: 1fr 0.65fr 1fr 0.8fr 0.7fr 0.8fr 1.25fr;
  gap: 0.8rem;
  align-items: center;
  padding: 0.82rem 0.4rem;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  color: rgba(0, 0, 0, 0.72);
  font-size: 0.82rem;
  font-weight: 600;
}

.trade-head {
  border-top: 0;
  color: rgba(0, 0, 0, 0.45);
  font-size: 0.74rem;
  font-weight: 700;
}

.side-buy,
.side-sell {
  width: max-content;
  padding: 0.22rem 0.6rem;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 750;
}

.side-buy {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
}

.side-sell {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

/* ── Responsive ── */
@media (max-width: 900px) {
  .quant-hero {
    flex-direction: column;
    align-items: flex-start;
  }
  .quant-hero-aside {
    width: 100%;
    box-sizing: border-box;
    justify-content: space-between;
  }
  .quant-overview {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .quant-workbench {
    grid-template-columns: 1fr;
  }
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .quant-page {
    padding: 4.75rem 0 3rem;
  }
  .quant-inner {
    padding: 0 0.9rem;
    gap: 1.15rem;
  }
  .quant-hero {
    padding: 1.35rem;
    border-radius: 14px;
    gap: 1.1rem;
  }
  .quant-hero-aside {
    padding: 0.85rem 1rem;
    gap: 0.9rem;
  }
  .quant-hero p {
    font-size: 0.88rem;
  }
  .quant-overview {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
  .quant-metric {
    padding: 1rem 1.1rem;
    border-radius: 14px;
  }
  .quant-panel {
    border-radius: 14px;
  }
  .config-panel,
  .result-panel,
  .chart-panel,
  .trades-panel {
    padding: 1.1rem;
  }
  .config-grid {
    grid-template-columns: 1fr;
    gap: 0.65rem;
  }
  .config-grid input,
  .config-grid select {
    min-height: 2.75rem;
    font-size: 0.9rem;
  }
  .config-actions,
  .chart-toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 0.6rem;
  }
  .chart-tabs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.45rem;
  }
  .strategy-desc {
    min-height: auto;
  }
}
</style>