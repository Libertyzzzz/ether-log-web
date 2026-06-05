<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import * as echarts from 'echarts'
import { Activity, BarChart3, Database, Download, Play, Save, Settings2, TrendingDown, TrendingUp } from 'lucide-vue-next'

type StrategyType = 'ma-cross' | 'momentum' | 'rsi' | 'custom'
type ChartMode = 'equity' | 'drawdown'

interface QuantStrategy {
  id: number
  name: string
  type: StrategyType
  description: string
}

interface BacktestRequest {
  symbol: string
  timeframe: string
  strategyType: StrategyType
  initialCapital: number
  positionRatio: number
  takeProfit: number
  stopLoss: number
  startDate: string
  endDate: string
}

interface BacktestSummary {
  totalReturn: number
  annualReturn: number
  maxDrawdown: number
  sharpe: number
  winRate: number
  trades: number
  profitFactor: number
  lastRunAt: string
}

interface CurvePoint {
  date: string
  value: number
}

interface TradeRecord {
  id: number
  time: string
  side: 'BUY' | 'SELL'
  symbol: string
  price: number
  quantity: number
  pnl: number
  note: string
}

const strategies: QuantStrategy[] = [
  { id: 1, name: '均线交叉', type: 'ma-cross', description: '用短周期均线突破长周期均线识别趋势切换。' },
  { id: 2, name: '动量突破', type: 'momentum', description: '捕捉价格突破近期高点后的延续行情。' },
  { id: 3, name: 'RSI 反转', type: 'rsi', description: '观察超买超卖区间，寻找均值回归机会。' },
  { id: 4, name: '自定义模型', type: 'custom', description: '预留给后续因子、机器学习或组合策略。' },
]

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
const isRunning = ref(false)
const chartRef = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null

const activeStrategy = computed(() => strategies.find(item => item.type === form.strategyType) || strategies[0])

const overviewCards = computed(() => [
  { label: '策略数量', value: strategies.length.toString(), suffix: '套', tone: 'blue', icon: Database },
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

async function fetchStrategies() {
  return strategies
}

async function runBacktest(payload: BacktestRequest) {
  await new Promise(resolve => setTimeout(resolve, 650))
  return {
    summary: {
      ...summary.value,
      totalReturn: payload.strategyType === 'momentum' ? 33.2 : payload.strategyType === 'rsi' ? 21.4 : 28.6,
      annualReturn: payload.strategyType === 'momentum' ? 20.6 : payload.strategyType === 'rsi' ? 14.8 : 18.4,
      lastRunAt: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16).replace('T', ' '),
    },
    equityCurve: equityCurve.value,
    drawdownCurve: drawdownCurve.value,
    trades: tradeRecords.value,
  }
}

async function saveStrategy(payload: BacktestRequest) {
  return { id: Date.now(), ...payload }
}

// async function fetchBacktestResult(_id: number) {
//   return summary.value
// }

// async function fetchTradeRecords(_backtestId: number) {
//   return tradeRecords.value
// }

async function handleRunBacktest() {
  isRunning.value = true
  const result = await runBacktest({ ...form })
  summary.value = result.summary
  equityCurve.value = result.equityCurve
  drawdownCurve.value = result.drawdownCurve
  tradeRecords.value = result.trades
  isRunning.value = false
  await nextTick()
  renderChart()
}

function handleResize() {
  chart?.resize()
}

watch(chartMode, () => nextTick(renderChart))

onMounted(async () => {
  await fetchStrategies()
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
  <section class="quant-page">
    <div class="quant-inner">
      <header class="quant-hero">
        <div>
          <span class="quant-kicker">PRIVATE / QUANT LAB</span>
          <h1>量化实验室</h1>
          <p>把交易想法拆成参数、回测与记录。先用模拟数据跑通流程，后面再接入真实行情和策略接口。</p>
        </div>
        <div class="quant-status">
          <span></span>
          Sandbox Ready
        </div>
      </header>

      <div class="quant-overview">
        <article v-for="card in overviewCards" :key="card.label" class="quant-metric" :class="`tone-${card.tone}`">
          <component :is="card.icon" :size="18" />
          <span>{{ card.label }}</span>
          <strong>{{ card.value }}<small>{{ card.suffix }}</small></strong>
        </article>
      </div>

      <div class="quant-workbench">
        <aside class="quant-panel config-panel">
          <div class="panel-title">
            <Settings2 :size="17" />
            <h2>策略配置</h2>
          </div>

          <div class="strategy-tabs">
            <button
              v-for="strategy in strategies"
              :key="strategy.type"
              type="button"
              :class="{ active: form.strategyType === strategy.type }"
              @click="form.strategyType = strategy.type"
            >
              {{ strategy.name }}
            </button>
          </div>

          <p class="strategy-desc">{{ activeStrategy.description }}</p>

          <div class="config-grid">
            <label>
              <span>标的代码</span>
              <input v-model="form.symbol" type="text" />
            </label>
            <label>
              <span>周期</span>
              <select v-model="form.timeframe">
                <option>15m</option>
                <option>1H</option>
                <option>4H</option>
                <option>1D</option>
              </select>
            </label>
            <label>
              <span>初始资金</span>
              <input v-model.number="form.initialCapital" type="number" min="1000" />
            </label>
            <label>
              <span>仓位比例 %</span>
              <input v-model.number="form.positionRatio" type="number" min="1" max="100" />
            </label>
            <label>
              <span>止盈 %</span>
              <input v-model.number="form.takeProfit" type="number" min="0" />
            </label>
            <label>
              <span>止损 %</span>
              <input v-model.number="form.stopLoss" type="number" min="0" />
            </label>
            <label>
              <span>开始日期</span>
              <input v-model="form.startDate" type="date" />
            </label>
            <label>
              <span>结束日期</span>
              <input v-model="form.endDate" type="date" />
            </label>
          </div>

          <div class="config-actions">
            <button class="run-btn" type="button" :disabled="isRunning" @click="handleRunBacktest">
              <Play :size="15" />
              {{ isRunning ? '回测中...' : '运行回测' }}
            </button>
            <button class="soft-btn" type="button" @click="saveStrategy({ ...form })">
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
          <button class="export-btn" type="button">
            <Download :size="14" />
            导出结果
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
    </div>
  </section>
</template>

<style scoped>
.quant-page {
  min-height: 100vh;
  padding: 6.5rem 1.5rem 3.5rem;
  background:
    radial-gradient(circle at 12% 4%, rgba(37,99,235,0.16), transparent 30rem),
    radial-gradient(circle at 92% 2%, rgba(240,171,252,0.14), transparent 26rem),
    linear-gradient(180deg, #edf3ff 0%, #f8fbff 48%, #eef3fb 100%);
}
.quant-inner { max-width: 64rem; margin: 0 auto; display: grid; gap: 1.25rem; }
.quant-hero {
  min-height: 13rem;
  padding: 2.4rem;
  border-radius: 1.75rem;
  display: flex;
  justify-content: space-between;
  gap: 1.5rem;
  background:
    radial-gradient(circle at 82% 18%, rgba(96,165,250,0.24), transparent 17rem),
    linear-gradient(135deg, #08111f 0%, #111827 52%, #312e81 100%);
  border: 1px solid rgba(191,219,254,0.2);
  box-shadow: 0 26px 70px rgba(15,23,42,0.2);
  color: #f8fafc;
}
.quant-kicker { color: #93c5fd; font-size: 0.72rem; font-weight: 900; letter-spacing: 0.18em; }
.quant-hero h1 { margin: 0.75rem 0 0.75rem; font-size: clamp(2rem, 4vw, 3.4rem); line-height: 1; font-weight: 950; }
.quant-hero p { max-width: 36rem; margin: 0; color: #cbd5e1; line-height: 1.8; font-weight: 650; }
.quant-status {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 0.85rem;
  border-radius: 999px;
  background: rgba(15,23,42,0.34);
  border: 1px solid rgba(191,219,254,0.18);
  color: #dbeafe;
  font-size: 0.72rem;
  font-weight: 850;
  white-space: nowrap;
}
.quant-status span { width: 0.48rem; height: 0.48rem; border-radius: 50%; background: #10b981; box-shadow: 0 0 0 5px rgba(16,185,129,0.14); }
.quant-overview { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
.quant-metric {
  min-height: 7.5rem;
  padding: 1.15rem;
  border-radius: 1.1rem;
  background: rgba(255,255,255,0.84);
  border: 1px solid rgba(203,213,225,0.62);
  box-shadow: 0 14px 34px rgba(70,91,128,0.07);
  display: grid;
  gap: 0.45rem;
}
.quant-metric svg { color: #3b82f6; }
.quant-metric span { color: #64748b; font-size: 0.76rem; font-weight: 800; }
.quant-metric strong { color: #0f172a; font-size: 1.65rem; line-height: 1; }
.quant-metric small { margin-left: 0.15rem; color: #94a3b8; font-size: 0.78rem; }
.tone-green strong, .positive { color: #059669 !important; }
.tone-red strong, .negative { color: #dc2626 !important; }
.quant-workbench { display: grid; grid-template-columns: minmax(18rem, 0.78fr) minmax(0, 1.22fr); gap: 1.25rem; align-items: start; }
.quant-panel {
  border-radius: 1.25rem;
  background: rgba(255,255,255,0.86);
  border: 1px solid rgba(203,213,225,0.62);
  box-shadow: 0 14px 36px rgba(70,91,128,0.08);
}
.config-panel, .result-panel, .chart-panel, .trades-panel { padding: 1.25rem; }
.panel-title { display: flex; align-items: center; gap: 0.55rem; margin-bottom: 1rem; }
.panel-title h2 { margin: 0; color: #0f172a; font-size: 1rem; font-weight: 900; }
.panel-title svg { color: #3b82f6; }
.panel-title small { margin-left: auto; color: #94a3b8; font-size: 0.72rem; font-weight: 700; }
.strategy-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 0.55rem; }
.strategy-tabs button, .chart-tabs button {
  min-height: 2.35rem;
  border: 1px solid rgba(203,213,225,0.8);
  border-radius: 0.7rem;
  background: rgba(248,250,252,0.85);
  color: #475569;
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 850;
}
.strategy-tabs button.active, .chart-tabs button.active { background: #0f172a; color: #f8fafc; border-color: #0f172a; }
.strategy-desc { min-height: 3.1rem; margin: 0.9rem 0 1rem; color: #64748b; line-height: 1.65; font-size: 0.82rem; font-weight: 650; }
.config-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
.config-grid label { display: grid; gap: 0.4rem; color: #475569; font-size: 0.72rem; font-weight: 850; }
.config-grid input, .config-grid select {
  width: 100%;
  min-height: 2.55rem;
  border: 1px solid rgba(203,213,225,0.9);
  border-radius: 0.75rem;
  background: rgba(255,255,255,0.92);
  color: #0f172a;
  padding: 0 0.75rem;
  font-weight: 750;
  outline: none;
}
.config-grid input:focus, .config-grid select:focus { border-color: #3b82f6; box-shadow: 0 0 0 4px rgba(59,130,246,0.12); }
.config-actions { display: flex; gap: 0.7rem; margin-top: 1rem; }
.run-btn, .soft-btn, .export-btn {
  min-height: 2.65rem;
  border-radius: 0.8rem;
  border: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  cursor: pointer;
  font-weight: 900;
}
.run-btn { flex: 1; background: #0f172a; color: #f8fafc; }
.run-btn:disabled { opacity: 0.62; cursor: not-allowed; }
.soft-btn, .export-btn { padding: 0 0.9rem; background: #eff6ff; color: #2563eb; }
.quant-main { display: grid; gap: 1.25rem; }
.summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; }
.summary-grid div { padding: 0.85rem; border-radius: 0.9rem; background: rgba(248,250,252,0.84); border: 1px solid rgba(226,232,240,0.75); }
.summary-grid span { display: block; color: #64748b; font-size: 0.72rem; font-weight: 800; margin-bottom: 0.35rem; }
.summary-grid strong { color: #0f172a; font-size: 1.05rem; }
.chart-toolbar { display: flex; justify-content: space-between; gap: 1rem; align-items: center; }
.chart-tabs { display: inline-flex; gap: 0.45rem; }
.chart-tabs button { padding: 0 0.8rem; }
.quant-chart { height: 19rem; }
.trades-panel .panel-title { margin-bottom: 0.9rem; }
.trade-table { overflow-x: auto; }
.trade-row {
  min-width: 44rem;
  display: grid;
  grid-template-columns: 1fr 0.65fr 1fr 0.8fr 0.7fr 0.8fr 1.25fr;
  gap: 0.8rem;
  align-items: center;
  padding: 0.82rem 0.4rem;
  border-top: 1px solid rgba(226,232,240,0.78);
  color: #475569;
  font-size: 0.8rem;
  font-weight: 700;
}
.trade-head { border-top: 0; color: #94a3b8; font-size: 0.72rem; font-weight: 900; }
.side-buy, .side-sell { width: max-content; padding: 0.22rem 0.55rem; border-radius: 999px; font-size: 0.7rem; font-weight: 900; }
.side-buy { background: rgba(16,185,129,0.1); color: #059669; }
.side-sell { background: rgba(239,68,68,0.1); color: #dc2626; }

@media (max-width: 900px) {
  .quant-overview { grid-template-columns: repeat(2, 1fr); }
  .quant-workbench { grid-template-columns: 1fr; }
  .summary-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .quant-page { padding: 5.75rem 1rem 2.5rem; }
  .quant-hero { flex-direction: column; padding: 1.6rem; border-radius: 1.25rem; }
  .quant-overview, .config-grid { grid-template-columns: 1fr; }
  .config-actions, .chart-toolbar { flex-direction: column; align-items: stretch; }
  .chart-tabs { display: grid; grid-template-columns: 1fr 1fr; }
}
</style>
