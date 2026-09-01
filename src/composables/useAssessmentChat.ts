import { computed, ref, nextTick } from 'vue'

export interface ChatMessage {
  id: string
  questionId?: string
  type: 'bot' | 'user'
  content: string
  timestamp: number
  options?: Array<{ label: string; value: any }>
  inputType?: 'text' | 'number' | 'select' | 'slider' | 'image'
  field?: string
  validation?: { min?: number; max?: number }
}

export interface QuestionConfig {
  id: string
  text: string
  field?: string
  inputType: 'text' | 'number' | 'select' | 'slider' | 'image'
  options?: Array<{ label: string; value: any }>
  range?: { min: number; max: number; step: number }
  hint?: string
  stage?: number
  nextQuestion?: string | ((answer: any) => string)
  easterEgg?: {
    condition: (form: any) => boolean
    response: string
  }
}

const questionFlow: QuestionConfig[] = [
  {
    id: 'welcome',
    text: '嗨！我是你的专属估值助手～\n\n我们将从基础建模、资产扫描、生活技能、社交博弈等 33 个维度进行全方位评估。\n\n准备好了吗？',
    inputType: 'select',
    options: [
      { label: '✨ 开始探索', value: 'start' }
    ],
    stage: 0,
    nextQuestion: 'gender'
  },
  {
    id: 'gender',
    text: '首先，请选择你的评估模型：',
    field: 'gender',
    inputType: 'select',
    options: [
      { label: '♂️ 男性模型', value: 'MALE' },
      { label: '♀️ 女性模型', value: 'FEMALE' }
    ],
    stage: 1,
    nextQuestion: 'age'
  },
  {
    id: 'age',
    text: '先记录一下年龄。放心，这只是基础建模参数，不是人生进度条。',
    field: 'age',
    inputType: 'slider',
    range: { min: 18, max: 80, step: 1 },
    hint: '单位：岁',
    stage: 1,
    nextQuestion: 'height'
  },
  {
    id: 'height',
    text: '太棒了！接下来告诉我你的净身高是多少呢？\n（悄悄说：这个数据会影响"生物属性"维度哦）',
    field: 'height',
    inputType: 'slider',
    range: { min: 150, max: 210, step: 1 },
    hint: '单位：厘米',
    stage: 1,
    easterEgg: {
      condition: (form: any) => form.height > 205,
      response: '等等...你是篮球运动员吗？🏀 还是模特？'
    },
    nextQuestion: 'visual_sample'
  },
  {
    id: 'visual_sample',
    text: '为了更精准地评估"审美溢价"，系统需要获取一张你的视觉样本。这能让算法捕捉到潜意识无法描述的特征。',
    inputType: 'image',
    stage: 1,
    nextQuestion: 'visualHeight'
  },
  {
    id: 'visualHeight',
    text: '那你的视觉身高（穿搭/发型加持后）是多少呢？',
    field: 'visualHeight',
    inputType: 'slider',
    range: { min: 150, max: 220, step: 1 },
    hint: '通常比净身高高一些',
    stage: 1,
    nextQuestion: 'weight'
  },
  {
    id: 'weight',
    text: '了解！那体重呢？\n（我们会用 BMI 来评估健康指数，不是评判身材啦）',
    field: 'weight',
    inputType: 'slider',
    range: { min: 40, max: 120, step: 0.5 },
    hint: '单位：公斤',
    stage: 1,
    nextQuestion: 'hairStatus'
  },
  {
    id: 'hairStatus',
    text: '发量状态也录一下，毕竟这属于头顶资产负债表：',
    field: 'hairStatus',
    inputType: 'select',
    options: [
      { label: '🧢 秃', value: 0 },
      { label: '🌱 稀', value: 1 },
      { label: '🙂 平', value: 2 },
      { label: '🦁 茂', value: 3 }
    ],
    stage: 1,
    nextQuestion: 'eyeStatus'
  },
  {
    id: 'eyeStatus',
    text: '视力或眼部美化习惯是？',
    field: 'eyeStatus',
    inputType: 'select',
    options: [
      { label: '👓 框架', value: 0 },
      { label: '👁️ 素颜', value: 1 },
      { label: '✨ 美瞳', value: 2 }
    ],
    stage: 1,
    nextQuestion: 'annualIncome'
  },
  {
    id: 'annualIncome',
    text: '好哒，基础建模完成！✅\n\n现在进入"生存资源"扫描环节...\n\n你的年薪大概是多少呢？（单位：元）\n🔒 放心，数据会加密处理，只用于生成报告',
    field: 'annualIncome',
    inputType: 'number',
    hint: '例如：150000',
    stage: 2,
    nextQuestion: 'houseStatus'
  },
  {
    id: 'houseStatus',
    text: '收到！房产情况如何？',
    field: 'houseStatus',
    inputType: 'select',
    options: [
      { label: '🏠 租房中', value: 0 },
      { label: '🏡 有房有贷', value: 1 },
      { label: '🏰 红本在手', value: 2 }
    ],
    stage: 2,
    nextQuestion: 'carLevel'
  },
  {
    id: 'carLevel',
    text: '车辆配置呢？',
    field: 'carLevel',
    inputType: 'select',
    options: [
      { label: '🚶 无车', value: 0 },
      { label: '🚗 代步车', value: 1 },
      { label: '🚙 中高端', value: 2 },
      { label: '🏎️ 豪华座驾', value: 3 }
    ],
    stage: 2,
    nextQuestion: 'parentPension'
  },
  {
    id: 'parentPension',
    text: '父母养老压力大概处在哪个档位？',
    field: 'parentPension',
    inputType: 'select',
    options: [
      { label: '压力较大', value: 0 },
      { label: '普通', value: 1 },
      { label: '较稳', value: 2 },
      { label: '无压力', value: 3 }
    ],
    stage: 2,
    nextQuestion: 'familyStructure'
  },
  {
    id: 'familyStructure',
    text: '家庭结构呢？',
    field: 'familyStructure',
    inputType: 'select',
    options: [
      { label: '多子家庭', value: 0 },
      { label: '独生', value: 1 }
    ],
    stage: 2,
    nextQuestion: 'geneticRisk'
  },
  {
    id: 'geneticRisk',
    text: '是否存在明显遗传健康风险？',
    field: 'geneticRisk',
    inputType: 'select',
    options: [
      { label: '无明显风险', value: false },
      { label: '存在风险', value: true }
    ],
    stage: 2,
    nextQuestion: 'workStability'
  },
  {
    id: 'workStability',
    text: '硬核指标收集完毕！现在进入更有趣的"软实力"评估～\n\n先来测测你的职业稳定性：',
    field: 'workStability',
    inputType: 'slider',
    range: { min: 1, max: 5, step: 1 },
    hint: '1 到 5，越高越稳定',
    stage: 3,
    nextQuestion: 'aestheticStyle'
  },
  {
    id: 'aestheticStyle',
    text: '你的审美风格怎么样？',
    field: 'aestheticStyle',
    inputType: 'slider',
    range: { min: 1, max: 5, step: 1 },
    hint: '1 随缘穿搭，5 人形 Lookbook',
    stage: 3,
    nextQuestion: 'photoSkill'
  },
  {
    id: 'photoSkill',
    text: '拍照水平如何？朋友圈素材抢救能力也算软实力。',
    field: 'photoSkill',
    inputType: 'slider',
    range: { min: 1, max: 5, step: 1 },
    hint: '1 到 5，越高越会拍',
    stage: 3,
    nextQuestion: 'cookingSkill'
  },
  {
    id: 'cookingSkill',
    text: '厨艺水平如何？',
    field: 'cookingSkill',
    inputType: 'select',
    options: [
      { label: '🍜 泡面王者', value: 1 },
      { label: '🍳 家常便饭', value: 2 },
      { label: '👨‍🍳 厨房达人', value: 3 },
      { label: '⭐ 米其林潜质', value: 4 }
    ],
    stage: 3,
    nextQuestion: 'travelPlanning'
  },
  {
    id: 'travelPlanning',
    text: '组队旅行时，你的规划能力是？',
    field: 'travelPlanning',
    inputType: 'slider',
    range: { min: 1, max: 3, step: 1 },
    hint: '1 随缘出发，3 行程 PM',
    stage: 3,
    nextQuestion: 'houseworkLevel'
  },
  {
    id: 'houseworkLevel',
    text: '你的家务参与/生活自理程度是？',
    field: 'houseworkLevel',
    inputType: 'slider',
    range: { min: 1, max: 4, step: 1 },
    hint: '1 甩手掌柜，4 整理达人',
    stage: 3,
    nextQuestion: 'extraSkills'
  },
  {
    id: 'extraSkills',
    text: '除了主业之外，你有几个能拿得出手的技能特长？',
    field: 'extraSkills',
    inputType: 'number',
    hint: '例如：2',
    stage: 3,
    nextQuestion: 'petType'
  },
  {
    id: 'petType',
    text: '宠物配置是？',
    field: 'petType',
    inputType: 'select',
    options: [
      { label: '无宠物', value: 0 },
      { label: '猫', value: 1 },
      { label: '狗', value: 2 },
      { label: '猫狗双全', value: 3 },
      { label: '其他', value: 4 }
    ],
    stage: 3,
    nextQuestion: 'consumptionView'
  },
  {
    id: 'consumptionView',
    text: '关于消费，你的金钱观倾向于？',
    field: 'consumptionView',
    inputType: 'slider',
    range: { min: 1, max: 4, step: 1 },
    hint: '1 极度节俭，4 享受当下',
    stage: 3,
    nextQuestion: 'fashionInvestment'
  },
  {
    id: 'fashionInvestment',
    text: '穿搭预算大约占收入/支出的百分比？',
    field: 'fashionInvestment',
    inputType: 'slider',
    range: { min: 0, max: 100, step: 1 },
    hint: '单位：%',
    stage: 3,
    nextQuestion: 'talkBreadth'
  },
  {
    id: 'talkBreadth',
    text: '最后进入"社交与情绪"博弈环节...\n\n你的知识面或接梗能力如何？',
    field: 'talkBreadth',
    inputType: 'slider',
    range: { min: 1, max: 5, step: 1 },
    hint: '1 话题终结者，5 聊天博学家',
    stage: 4,
    nextQuestion: 'stubbornness'
  },
  {
    id: 'stubbornness',
    text: '在一段关系中，你的任性/固执程度是？',
    field: 'stubbornness',
    inputType: 'slider',
    range: { min: 1, max: 10, step: 1 },
    hint: '1 顺从型，10 铁头功型',
    stage: 4,
    nextQuestion: 'stressStability'
  },
  {
    id: 'stressStability',
    text: '当压力巨大时，你的情绪稳态是？',
    field: 'emotionalStability',
    inputType: 'slider',
    range: { min: 1, max: 5, step: 1 },
    hint: '1 容易焦虑，5 极其淡定',
    stage: 4,
    nextQuestion: 'replyLatency'
  },
  {
    id: 'replyLatency',
    text: '社交中的回消息习惯？',
    field: 'replyLatency',
    inputType: 'slider',
    range: { min: 1, max: 4, step: 1 },
    hint: '1 秒回，4 轮回',
    stage: 4,
    nextQuestion: 'exBonding'
  },
  {
    id: 'exBonding',
    text: '与前任的纠缠/连接度如何？',
    field: 'exBonding',
    inputType: 'slider',
    range: { min: 1, max: 5, step: 1 },
    hint: '1 查无此人，5 藕断丝连',
    stage: 4,
    nextQuestion: 'socialFilters'
  },
  {
    id: 'socialFilters',
    text: '你的社交网络"美化"程度？',
    field: 'socialFilters',
    inputType: 'slider',
    range: { min: 1, max: 5, step: 1 },
    hint: '1 真实粗犷，5 极致精修',
    stage: 4,
    nextQuestion: 'controlDesire'
  },
  {
    id: 'controlDesire',
    text: '对亲密关系的控制欲？',
    field: 'controlDesire',
    inputType: 'slider',
    range: { min: 1, max: 5, step: 1 },
    hint: '1 佛系，5 全天候监控',
    stage: 4,
    nextQuestion: 'sharingDesire'
  },
  {
    id: 'sharingDesire',
    text: '平时的分享欲（碎碎念）？',
    field: 'sharingDesire',
    inputType: 'slider',
    range: { min: 1, max: 5, step: 1 },
    hint: '1 社交孤岛，5 话痨',
    stage: 4,
    nextQuestion: 'relationshipGoal'
  },
  {
    id: 'relationshipGoal',
    text: '当前的恋爱/社交目的？',
    field: 'relationshipGoal',
    inputType: 'slider',
    range: { min: 1, max: 4, step: 1 },
    hint: '1 纯爱，4 结婚导向',
    stage: 4,
    nextQuestion: 'coldViolenceProb'
  },
  {
    id: 'coldViolenceProb',
    text: '发生争吵时，冷暴力的概率？',
    field: 'coldViolenceProb',
    inputType: 'slider',
    range: { min: 1, max: 5, step: 1 },
    hint: '1 沟通派，5 深度静音派',
    stage: 4,
    nextQuestion: 'empathyLevel'
  },
  {
    id: 'empathyLevel',
    text: '最后一个问题！你的共情能力如何？',
    field: 'empathyLevel',
    inputType: 'slider',
    range: { min: 1, max: 5, step: 1 },
    hint: '1 冷漠路人，5 暖心树洞',
    stage: 4,
    nextQuestion: 'complete'
  }
]

const assessmentQuestions = questionFlow.filter(question => question.field)
const totalQuestions = assessmentQuestions.length
const totalStages = 4
const stageNames = ['准备就绪', '基础建模', '资产扫描', '生活技能', '社交博弈']

export function useAssessmentChat() {
  const chatMessages = ref<ChatMessage[]>([])
  const currentQuestionId = ref<string>('')
  const isTyping = ref(false)
  const chatContainerRef = ref<HTMLElement | null>(null)
  const userInput = ref<string | number>('')
  const sliderValue = ref<number>(0)

  const getCurrentQuestion = computed(() => {
    return questionFlow.find(q => q.id === currentQuestionId.value)
  })

  const currentStage = computed(() => {
    const question = getCurrentQuestion.value
    return question?.stage || 0
  })

  const currentQuestionNumber = computed(() => {
    const question = getCurrentQuestion.value
    if (!question?.field) return 0
    const index = assessmentQuestions.findIndex(item => item.id === question.id)
    return index >= 0 ? index + 1 : 0
  })

  const stageProgress = computed(() => {
    if (!currentQuestionNumber.value) return 0
    return Math.min((currentQuestionNumber.value / totalQuestions) * 100, 100)
  })

  const scrollToBottom = () => {
    nextTick(() => {
      if (chatContainerRef.value) {
        chatContainerRef.value.scrollTo({
          top: chatContainerRef.value.scrollHeight,
          behavior: 'smooth'
        })
      }
    })
  }

  const addMessage = (type: 'bot' | 'user', content: string, options?: ChatMessage['options'], qId?: string) => {
    const message: ChatMessage = {
      id: Date.now().toString() + Math.random(),
      questionId: qId,
      type,
      content,
      timestamp: Date.now(),
      options
    }
    chatMessages.value.push(message)
    scrollToBottom()
  }

  const showQuestion = async (questionId: string, form: any) => {
    const question = questionFlow.find(q => q.id === questionId)
    if (!question) return

    isTyping.value = true
    await new Promise(resolve => setTimeout(resolve, 600))
    isTyping.value = false
    addMessage('bot', question.text, question.options, questionId)
    currentQuestionId.value = questionId

    if (question.easterEgg && question.easterEgg.condition(form)) {
      await new Promise(resolve => setTimeout(resolve, 800))
      addMessage('bot', `🎉 ${question.easterEgg.response}`)
    }
  }

  const handleAnswer = async (value: any, form: any, onComplete: () => Promise<void>) => {
    const question = getCurrentQuestion.value
    if (!question) return

    currentQuestionId.value = ''

    let userContent = ''
    if (question.inputType === 'select' && question.options) {
      const option = question.options.find(opt => opt.value === value)
      userContent = option?.label || String(value)
    } else {
      userContent = String(value)
    }
    addMessage('user', userContent)

    if (question.field) {
      (form as any)[question.field] = value
    }
    userInput.value = ''

    let nextId = ''
    if (typeof question.nextQuestion === 'function') {
      nextId = question.nextQuestion(value)
    } else {
      nextId = question.nextQuestion || ''
    }

    if (nextId === 'complete') {
      await new Promise(resolve => setTimeout(resolve, 500))
      addMessage('bot', '完美！所有数据采集完毕 ✨\n\n正在启动估值引擎...')
      await new Promise(resolve => setTimeout(resolve, 1000))
      await onComplete()
      return
    }

    if (nextId) {
      await new Promise(resolve => setTimeout(resolve, 400))
      await showQuestion(nextId, form)
    }
  }

  const initChat = async (form: any) => {
    chatMessages.value = []
    await showQuestion('welcome', form)
  }

  const initSliderValue = (form: any) => {
    const question = getCurrentQuestion.value
    if (question?.inputType === 'slider' && question.range && question.field) {
      const fieldValue = (form as any)[question.field]
      sliderValue.value = typeof fieldValue === 'number' ? fieldValue :
        Math.round((question.range.min + question.range.max) / 2)
    }
  }

  return {
    chatMessages,
    currentQuestionId,
    getCurrentQuestion,
    currentStage,
    stageProgress,
    totalStages,
    totalQuestions,
    currentQuestionNumber,
    stageNames,
    isTyping,
    chatContainerRef,
    userInput,
    sliderValue,
    initChat,
    handleAnswer,
    initSliderValue,
    scrollToBottom
  }
}