export type Localized = { ar: string; en: string }
export type ScalarAnswer = string | number | boolean
export type Answer = ScalarAnswer | string[] | Record<string, ScalarAnswer>[]
export type Answers = Record<string, Answer>
export type Billing = 'oneTime' | 'monthly' | 'annual'
export type Rounding = 'halfUp' | 'floor' | 'ceil'
export type Operator = 'eq' | 'ne' | 'contains' | 'notContains' | 'gt' | 'gte' | 'lt' | 'lte' | 'selected' | 'notSelected' | 'empty' | 'notEmpty'
export type Condition =
  | { and: Condition[] }
  | { or: Condition[] }
  | { questionId: string; operator: Operator; value?: ScalarAnswer }

export type Pricing = {
  method: 'fixed' | 'perUnit' | 'tiered' | 'volume' | 'includedQuantity' | 'percentage' | 'multiplier' |
    'minimum' | 'maximum' | 'free' | 'included' | 'manual' | 'unconfigured'
  billing?: Billing
  amount?: number
  unitPrice?: number
  includedQuantity?: number
  tiers?: { min: number; max?: number; unitPrice: number }[]
  rateBps?: number
  subtotal?: Billing
  target?: string
  chargeKey?: string
  maxCharge?: number
}

type Named = { id: string; title: Localized; active: boolean; order?: number }

export type PricingRule = Pricing & Named & {
  projectIds?: string[]
  condition?: Condition
  questionId?: string
  stage?: 'charge' | 'discount'
}

export type Project = Named & {
  description: Localized
  archived?: boolean
  icon?: string
  basePrice?: number
  minimumPrice?: number
  delivery?: Localized
  included?: Localized[]
  exclusions?: Localized[]
}

export type Section = Named & { projectIds?: string[]; description?: Localized; condition?: Condition }
export type QuestionKind = 'single' | 'multiple' | 'boolean' | 'number' | 'stepper' | 'slider' |
  'dropdown' | 'text' | 'textarea' | 'info' | 'repeatable'

export type Option = Named & {
  description?: Localized
  icon?: string
  condition?: Condition
  default?: boolean
  pricing?: Pricing
}

export type ItemField = {
  id: string
  title: Localized
  kind: 'text' | 'number' | 'boolean'
  required?: boolean
  min?: number
  max?: number
}

export type Question = Named & {
  sectionId: string
  projectIds: string[]
  kind: QuestionKind
  required: boolean
  options?: Option[]
  description?: Localized
  help?: Localized
  placeholder?: Localized
  unit?: Localized
  min?: number
  max?: number
  step?: number
  defaultValue?: Answer
  condition?: Condition
  pricing?: Pricing
  itemFields?: ItemField[]
  adminNotes?: string
}

export type LeadField = 'name' | 'company' | 'phone' | 'whatsapp' | 'email' | 'requirements'
export type Settings = {
  currency: string
  minorUnits?: number
  rounding?: Rounding
  validityDays?: number
  showBreakdown?: boolean
  taxBps?: number
  discountLimitBps?: number
  minimumPrice?: number
  monthsPerYear?: number
  terms?: Localized
  leadFields?: Partial<Record<LeadField, 'hidden' | 'optional' | 'required'>>
}

export type Config = {
  settings: Settings
  projects: Project[]
  sections: Section[]
  questions: Question[]
  rules: PricingRule[]
  templates?: Question[]
}
export type Item = {
  id: string
  title: Localized
  billing: Billing
  quantity: number
  unitPrice?: number
  amount: number
  status: 'priced' | 'free' | 'included' | 'manual' | 'unconfigured'
  kind: 'charge' | 'discount' | 'tax'
}
export type Estimate = {
  currency: string
  minorUnits: number
  items: Item[]
  oneTime: number
  monthly: number
  annual: number
  firstYear: number
  discount: number
  tax: number
  manual: Item[]
  complete: boolean
  errors: Record<string, string>
  answers: Answers
}

type Resolved = { questions: Question[]; answers: Answers; errors: Record<string, string>; missing: string[] }

const billingPeriods = ['oneTime', 'monthly', 'annual'] as const
const quantityKinds: QuestionKind[] = ['number', 'stepper', 'slider', 'repeatable']
const choiceKinds: QuestionKind[] = ['single', 'multiple', 'dropdown']
const kinds: QuestionKind[] = [...quantityKinds, ...choiceKinds, 'text', 'textarea', 'boolean', 'info']
const operators: Operator[] = ['eq', 'ne', 'contains', 'notContains', 'gt', 'gte', 'lt', 'lte', 'selected', 'notSelected', 'empty', 'notEmpty']
const methods: Pricing['method'][] = ['fixed', 'perUnit', 'tiered', 'volume', 'includedQuantity', 'percentage', 'multiplier', 'minimum', 'maximum', 'free', 'included', 'manual', 'unconfigured']
const maxQuantity = 1_000_000
const maxItems = 100

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOwn(value: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key)
}

function integer(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max
}

function id(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z0-9][a-z0-9_-]{0,79}$/i.test(value) && !hasOwn(Object.prototype, value)
}

function sorted<T extends { order?: number }>(values: T[]): T[] {
  return values.slice().sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
}

function assigned(ids: string[] | undefined, projectId: string): boolean {
  return !ids?.length || ids.includes(projectId)
}

function empty(value: unknown): boolean {
  return value === undefined || value === '' || (Array.isArray(value) && !value.length)
}

function matches(condition: Condition | undefined, answers: Answers): boolean {
  if (!condition) return true
  if ('and' in condition) return condition.and.every((child) => matches(child, answers))
  if ('or' in condition) return condition.or.some((child) => matches(child, answers))
  const { questionId, operator, value } = condition
  const answer = hasOwn(answers, questionId) ? answers[questionId] : undefined
  if (operator === 'empty') return empty(answer)
  if (operator === 'notEmpty') return !empty(answer)
  if (empty(answer)) return false
  const selected = Array.isArray(answer) ? answer.some((entry) => entry === value) : answer === value
  const contains = typeof answer === 'string' && typeof value === 'string' ? answer.includes(value) : selected
  switch (operator) {
    case 'eq': return answer === value
    case 'ne': return answer !== value
    case 'selected': return selected
    case 'notSelected': return !selected
    case 'contains': return contains
    case 'notContains': return !contains
    case 'gt': return typeof answer === 'number' && typeof value === 'number' && answer > value
    case 'gte': return typeof answer === 'number' && typeof value === 'number' && answer >= value
    case 'lt': return typeof answer === 'number' && typeof value === 'number' && answer < value
    case 'lte': return typeof answer === 'number' && typeof value === 'number' && answer <= value
  }
}

function references(condition?: Condition): string[] {
  if (!condition) return []
  if ('and' in condition) return condition.and.flatMap(references)
  if ('or' in condition) return condition.or.flatMap(references)
  return [condition.questionId]
}

function optionPrerequisites(condition: Condition | undefined, questionId: string): string[] {
  if (!condition) return []
  if ('and' in condition) return condition.and.flatMap((child) => optionPrerequisites(child, questionId))
  if ('or' in condition) return condition.or.flatMap((child) => optionPrerequisites(child, questionId))
  if (condition.questionId === questionId && ['selected', 'contains'].includes(condition.operator) && typeof condition.value === 'string') {
    return [condition.value]
  }
  return []
}

function assertOptionOrder(question: Question) {
  const options = new Map((question.options ?? []).filter((option) => option.active).map((option) => [option.id, option]))
  const visited = new Set<string>()
  const checking = new Set<string>()
  function visit(option: Option) {
    if (visited.has(option.id)) return
    if (checking.has(option.id)) throw new Error(`Circular option dependency at ${question.id}:${option.id}`)
    checking.add(option.id)
    for (const reference of optionPrerequisites(option.condition, question.id)) {
      const prerequisite = options.get(reference)
      if (prerequisite) visit(prerequisite)
    }
    checking.delete(option.id)
    visited.add(option.id)
  }
  for (const option of options.values()) visit(option)
}

function orderQuestions(questions: Question[]): Question[] {
  const byId = new Map(questions.map((question) => [question.id, question]))
  const visited = new Set<string>()
  const visiting = new Set<string>()
  const ordered: Question[] = []
  function visit(question: Question) {
    if (visited.has(question.id)) return
    if (visiting.has(question.id)) throw new Error(`Circular dependency at ${question.id}`)
    visiting.add(question.id)
    const dependencies = [
      ...references(question.condition),
      ...(question.options ?? []).filter((option) => option.active)
        .flatMap((option) => references(option.condition).filter((reference) => reference !== question.id)),
    ]
    for (const dependency of dependencies) {
      const prerequisite = byId.get(dependency)
      if (prerequisite) visit(prerequisite)
    }
    visiting.delete(question.id)
    visited.add(question.id)
    ordered.push(question)
  }
  for (const question of questions) visit(question)
  return ordered
}

function normalize(question: Question, answer: unknown): Answer | undefined {
  const available = new Set((question.options ?? []).map((option) => option.id))
  if (question.kind === 'single' || question.kind === 'dropdown') {
    return typeof answer === 'string' && available.has(answer) ? answer : undefined
  }
  if (question.kind === 'multiple') {
    if (!Array.isArray(answer) || answer.length > available.size || answer.some((value) => typeof value !== 'string' || !available.has(value))) return
    const selection = new Set<string>(answer)
    return selection.size === answer.length ? [...selection] : undefined
  }
  if (question.kind === 'boolean') return typeof answer === 'boolean' ? answer : undefined
  if (question.kind === 'text' || question.kind === 'textarea') {
    if (typeof answer !== 'string') return
    const value = answer.trim()
    return integer(value.length, question.min ?? 0, question.max ?? 4000) ? value : undefined
  }
  if (question.kind === 'repeatable') {
    if (!Array.isArray(answer) || !integer(answer.length, question.min ?? 0, question.max ?? maxItems)) return
    const fields = question.itemFields ?? []
    const legalFields = new Set(fields.map((field) => field.id))
    const result: Record<string, ScalarAnswer>[] = []
    for (const entry of answer) {
      if (!record(entry) || Object.keys(entry).some((key) => !legalFields.has(key))) return
      const row: Record<string, ScalarAnswer> = {}
      for (const field of fields) {
        const value = hasOwn(entry, field.id) ? entry[field.id] : undefined
        if (value === undefined && !field.required) continue
        if (field.kind === 'text' && typeof value === 'string' &&
          integer(value.trim().length, field.min ?? (field.required ? 1 : 0), field.max ?? 4000)) {
          row[field.id] = value.trim()
        } else if (field.kind === 'number' && integer(value, field.min ?? 0, field.max ?? maxQuantity)) {
          row[field.id] = value
        } else if (field.kind === 'boolean' && typeof value === 'boolean') {
          row[field.id] = value
        } else return
      }
      result.push(row)
    }
    return result
  }
  if (quantityKinds.includes(question.kind)) {
    const min = question.min ?? 0
    return integer(answer, min, question.max ?? maxQuantity) && (answer - min) % (question.step ?? 1) === 0 ? answer : undefined
  }
}

export function visibleQuestions(config: Config, projectId: string, input: Answers): Resolved {
  const result: Resolved = { questions: [], answers: {}, errors: {}, missing: [] }
  if (!config.projects.some((project) => project.id === projectId && project.active)) {
    result.errors.projectId = 'Unknown or inactive project type'
    return result
  }
  if (!record(input)) {
    result.errors.answers = 'Expected an answer object'
    return result
  }
  const sections = sorted(config.sections).filter((section) => section.active && assigned(section.projectIds, projectId))
  const bySection = new Map<string, Question[]>()
  for (const question of sorted(config.questions)) {
    if (!question.active || !assigned(question.projectIds, projectId)) continue
    const list = bySection.get(question.sectionId) ?? []
    list.push(question)
    bySection.set(question.sectionId, list)
  }
  // Steps render in section order; a step can only depend on answers from earlier steps,
  // so gating sections while accumulating answers stays deterministic.
  for (const section of sections) {
    if (!matches(section.condition, result.answers)) continue
    for (const question of orderQuestions(bySection.get(section.id) ?? [])) {
      if (!matches(question.condition, result.answers)) continue
      const explicit = hasOwn(input, question.id)
      const activeOptions = choiceKinds.includes(question.kind) ? sorted(question.options ?? []).filter((option) => option.active) : []
      const proposed = explicit ? input[question.id] : question.defaultValue ?? activeOptions.filter((option) => option.default).map((option) => option.id)
      const proposedIds = new Set(Array.isArray(proposed) ? proposed.filter((value) => typeof value === 'string') : [proposed])
      const selected = activeOptions.filter((option) => proposedIds.has(option.id)).map((option) => option.id)
      const options = activeOptions.filter((option) => {
        if (question.kind !== 'multiple') return matches(option.condition, result.answers)
        // Evaluate eligibility as if this option were selected, preserving current sibling selections.
        const optionAnswers = { ...result.answers, [question.id]: [...new Set([...selected, option.id])] }
        return matches(option.condition, optionAnswers)
      })
      const current = { ...question, ...(question.options ? { options } : {}) }
      result.questions.push(current)
      if (question.kind === 'info') continue
      const defaults = options.filter((option) => option.default).map((option) => option.id)
      const fallback = question.kind === 'multiple' ? defaults : defaults[0]
      const raw = explicit ? input[question.id] : question.defaultValue ?? fallback
      const value = empty(raw) ? undefined : normalize(current, raw)
      if (!empty(value)) result.answers[question.id] = value!
      else if (explicit && !empty(raw)) result.errors[question.id] = 'Invalid or unavailable answer'
      if (question.required && empty(value)) result.missing.push(question.id)
    }
  }
  return result
}

function checkedNumber(value: bigint): number {
  const result = Number(value)
  if (!Number.isSafeInteger(result)) throw new RangeError('Estimate exceeds supported monetary range')
  return result
}

function ratio(amount: bigint, rate: number, rounding: Rounding): bigint {
  const scaled = amount * BigInt(rate)
  const offset = rounding === 'ceil' ? 9999n : rounding === 'halfUp' ? 5000n : 0n
  if (scaled < 0n) {
    const negativeOffset = rounding === 'floor' ? 9999n : rounding === 'halfUp' ? 5000n : 0n
    return -((-scaled + negativeOffset) / 10000n)
  }
  return (scaled + offset) / 10000n
}

function minimum(left: bigint, right: bigint): bigint {
  return left < right ? left : right
}

function billableAmount(pricing: Pricing, quantity: number): { amount?: bigint; unitPrice?: number } {
  const units = Math.max(0, quantity - (pricing.includedQuantity ?? 0))
  switch (pricing.method) {
    case 'fixed':
      return integer(pricing.amount) ? { amount: BigInt(pricing.amount), unitPrice: pricing.amount } : {}
    case 'perUnit':
    case 'includedQuantity':
      return integer(pricing.unitPrice) ? { amount: BigInt(units) * BigInt(pricing.unitPrice), unitPrice: pricing.unitPrice } : {}
    case 'tiered': {
      if (!pricing.tiers?.length) return {}
      let amount = 0n
      let covered = 0
      for (const tier of pricing.tiers) {
        const count = Math.max(0, Math.min(units, tier.max ?? units) - tier.min + 1)
        covered += count
        amount += BigInt(count) * BigInt(tier.unitPrice)
      }
      return covered === units ? { amount } : {}
    }
    case 'volume': {
      const tier = pricing.tiers?.find((entry) => units >= entry.min && units <= (entry.max ?? units))
      if (units === 0 && pricing.tiers?.length) return { amount: 0n }
      return tier ? { amount: BigInt(units) * BigInt(tier.unitPrice), unitPrice: tier.unitPrice } : {}
    }
    default: return {}
  }
}

export function calculate(config: Config, projectId: string, input: Answers, strict = false): Estimate {
  const resolved = visibleQuestions(config, projectId, input)
  const errors = { ...resolved.errors }
  for (const key of resolved.missing) errors[key] ??= 'Required answer missing'
  if (strict && Object.keys(errors).length) throw new Error(Object.entries(errors).map(([key, value]) => `${key}: ${value}`).join('; '))
  const settings = config.settings
  const rounding = settings.rounding ?? 'halfUp'
  const items: Item[] = []
  const totals = { oneTime: 0n, monthly: 0n, annual: 0n }
  const discounts = { oneTime: 0n, monthly: 0n, annual: 0n }
  const taxes = { oneTime: 0n, monthly: 0n, annual: 0n }
  const seen = new Set<string>()
  const project = config.projects.find((entry) => entry.id === projectId && entry.active)
  function add(item: Omit<Item, 'amount'>, amount: bigint) {
    items.push({ ...item, amount: checkedNumber(amount) })
    totals[item.billing] += amount
  }
  type Candidate = { id: string; title: Localized; pricing: Pricing; quantity: number }
  const charges: Candidate[] = []
  const discountRules: Candidate[] = []
  if (project && project.basePrice !== undefined) {
    charges.push({ id: 'project-base', title: project.title, pricing: { method: 'fixed', amount: project.basePrice }, quantity: 1 })
  }
  for (const question of resolved.questions) {
    const answer = resolved.answers[question.id]
    if (answer === undefined || answer === false) continue
    const quantity = typeof answer === 'number' ? answer : Array.isArray(answer) ? answer.length : 1
    if (question.pricing) charges.push({ id: question.id, title: question.title, pricing: question.pricing, quantity })
    for (const option of question.options ?? []) {
      if ((answer === option.id || (Array.isArray(answer) && answer.some((value) => value === option.id))) && option.pricing) {
        charges.push({ id: `${question.id}:${option.id}`, title: option.title, pricing: option.pricing, quantity: 1 })
      }
    }
  }
  for (const rule of sorted(config.rules)) {
    if (!project || !rule.active || !assigned(rule.projectIds, projectId) || !matches(rule.condition, resolved.answers)) continue
    const answer = rule.questionId ? resolved.answers[rule.questionId] : undefined
    if (rule.questionId && (empty(answer) || answer === false)) continue
    const quantity = typeof answer === 'number' ? answer : Array.isArray(answer) ? answer.length : 1
    const candidates = rule.stage === 'discount' ? discountRules : charges
    candidates.push({ id: rule.id, title: rule.title, pricing: rule, quantity })
  }
  function basePrice(pricing: Pricing, quantity: number, billing: Billing) {
    if (pricing.method === 'percentage' || pricing.method === 'multiplier') {
      if (!pricing.subtotal || !integer(pricing.rateBps)) return {}
      const subtotal = totals[pricing.subtotal]
      const modified = ratio(subtotal, pricing.rateBps, rounding)
      return { amount: pricing.method === 'multiplier' ? modified - subtotal : modified }
    }
    if (pricing.method === 'minimum' && integer(pricing.amount)) {
      const minimumCharge = BigInt(pricing.amount)
      return { amount: totals[billing] < minimumCharge ? minimumCharge - totals[billing] : 0n }
    }
    return billableAmount(pricing, quantity)
  }
  function charge(candidate: Candidate) {
    const { pricing, quantity } = candidate
    const billing = pricing.billing ?? pricing.subtotal ?? 'oneTime'
    const key = `${billing}:${pricing.chargeKey ?? candidate.id}`
    if (seen.has(key)) return
    seen.add(key)
    const { amount, unitPrice } = basePrice(pricing, quantity, billing)
    const status = pricing.method === 'free' || pricing.method === 'included' || pricing.method === 'manual' ?
      pricing.method : amount === undefined ? 'unconfigured' : 'priced'
    const capped = integer(pricing.maxCharge) && amount !== undefined ? minimum(amount, BigInt(pricing.maxCharge)) : amount
    add({ id: candidate.id, title: candidate.title, billing, quantity, unitPrice, status, kind: 'charge' }, capped ?? 0n)
  }
  const modifiers = new Set<Pricing['method']>(['percentage', 'multiplier', 'minimum', 'maximum'])
  for (const candidate of charges) if (!modifiers.has(candidate.pricing.method)) charge(candidate)
  function cap(target: Item, amount: number) {
    if (target.amount <= amount) return
    totals[target.billing] -= BigInt(target.amount) - BigInt(amount)
    target.amount = amount
  }
  const caps = charges.filter((candidate) => candidate.pricing.method === 'maximum')
  function addCappedAdjustment(candidate: Candidate) {
    charge(candidate)
    const target = items.find((item) => item.id === candidate.id)
    if (!target) return
    for (const { pricing } of caps) {
      if (pricing.target === target.id && integer(pricing.amount)) cap(target, pricing.amount)
    }
  }
  for (const { pricing } of caps) {
    const target = items.find((item) => item.id === pricing.target)
    if (target && integer(pricing.amount)) cap(target, pricing.amount)
  }
  for (const candidate of charges) {
    if (candidate.pricing.method === 'percentage' || candidate.pricing.method === 'multiplier') {
      addCappedAdjustment(candidate)
    }
  }
  for (const candidate of charges) if (candidate.pricing.method === 'minimum') addCappedAdjustment(candidate)
  const floor = Math.max(project?.minimumPrice ?? 0, settings.minimumPrice ?? 0)
  if (project && floor > 0 && totals.oneTime < BigInt(floor)) {
    charge({ id: 'project-minimum', title: { ar: 'الحد الأدنى للمشروع', en: 'Project minimum' }, pricing: { method: 'minimum', amount: floor }, quantity: 1 })
  }
  const discountBase = { ...totals }
  for (const candidate of discountRules) {
    const { pricing } = candidate
    const billing = pricing.billing ?? pricing.subtotal ?? 'oneTime'
    const key = `discount:${billing}:${pricing.chargeKey ?? candidate.id}`
    if (seen.has(key)) continue
    seen.add(key)
    const value = pricing.method === 'percentage' && pricing.subtotal && integer(pricing.rateBps)
      ? ratio(discountBase[pricing.subtotal], pricing.rateBps, rounding)
      : billableAmount(pricing, candidate.quantity).amount
    const limit = ratio(discountBase[billing], settings.discountLimitBps ?? 10000, 'floor')
    const amount = value === undefined ? 0n : minimum(value, limit - discounts[billing])
    if (amount > 0n) {
      discounts[billing] += amount
      add({ id: candidate.id, title: candidate.title, billing, quantity: candidate.quantity, status: 'priced', kind: 'discount' }, -amount)
    }
  }
  for (const billing of billingPeriods) {
    const tax = ratio(totals[billing], settings.taxBps ?? 0, rounding)
    if (tax <= 0n) continue
    taxes[billing] = tax
    add({ id: `tax:${billing}`, title: { ar: 'الضريبة', en: 'Tax' }, billing, quantity: 1, status: 'priced', kind: 'tax' }, tax)
  }
  const months = BigInt(settings.monthsPerYear ?? 12)
  const yearly = (values: Record<Billing, bigint>) => checkedNumber(values.oneTime + values.annual + months * values.monthly)
  const manual = items.filter((item) => item.status === 'manual' || item.status === 'unconfigured')
  return {
    currency: settings.currency,
    minorUnits: settings.minorUnits ?? 2,
    items,
    oneTime: checkedNumber(totals.oneTime),
    monthly: checkedNumber(totals.monthly),
    annual: checkedNumber(totals.annual),
    firstYear: yearly(totals),
    discount: yearly(discounts),
    tax: yearly(taxes),
    manual,
    complete: Object.keys(errors).length === 0 && manual.length === 0,
    errors,
    answers: resolved.answers,
  }
}

function localized(value: unknown): value is Localized {
  return record(value) && ['ar', 'en'].every((key) => typeof value[key] === 'string' && value[key].trim().length > 0)
}

function validatePricing(value: unknown, label: string, errors: string[], quantityLimit?: number) {
  if (!record(value) || !methods.includes(value.method as Pricing['method'])) {
    errors.push(`${label}: invalid pricing method`)
    return
  }
  const pricing = value as Pricing
  if (pricing.method === 'unconfigured') errors.push(`${label}: price is unconfigured`)
  if (pricing.billing !== undefined && !billingPeriods.includes(pricing.billing)) errors.push(`${label}: invalid billing period`)
  if (pricing.subtotal !== undefined && !billingPeriods.includes(pricing.subtotal)) errors.push(`${label}: invalid subtotal`)
  if (pricing.maxCharge !== undefined && !integer(pricing.maxCharge)) errors.push(`${label}: invalid maximum charge`)
  if (pricing.chargeKey !== undefined && !id(pricing.chargeKey)) errors.push(`${label}: invalid charge key`)
  if (pricing.includedQuantity !== undefined && !integer(pricing.includedQuantity, 0, maxQuantity)) {
    errors.push(`${label}: invalid included quantity`)
  }
  if (['fixed', 'minimum', 'maximum'].includes(pricing.method) && !integer(pricing.amount)) errors.push(`${label}: missing or invalid amount`)
  if (['perUnit', 'includedQuantity'].includes(pricing.method) && !integer(pricing.unitPrice)) errors.push(`${label}: missing or invalid unit price`)
  if (pricing.method === 'includedQuantity' && !integer(pricing.includedQuantity, 0, maxQuantity)) errors.push(`${label}: missing included quantity`)
  if (['percentage', 'multiplier'].includes(pricing.method) &&
      (!integer(pricing.rateBps, 0, 1000000) || !pricing.subtotal || !billingPeriods.includes(pricing.subtotal))) {
    errors.push(`${label}: missing or invalid rate and subtotal`)
  }
  if (pricing.method === 'multiplier' && pricing.billing !== undefined && pricing.billing !== pricing.subtotal) {
    errors.push(`${label}: multiplier must use its subtotal billing period`)
  }
  if (pricing.method === 'tiered' || pricing.method === 'volume') {
    if (!Array.isArray(pricing.tiers) || !pricing.tiers.length || pricing.tiers.length > 100) {
      errors.push(`${label}: missing pricing tiers`)
      return
    }
    const valid = pricing.tiers.every((tier) => record(tier) && integer(tier.min, 1, maxQuantity) &&
      (tier.max === undefined || integer(tier.max, tier.min, maxQuantity)) && integer(tier.unitPrice))
    if (!valid) {
      errors.push(`${label}: invalid pricing tier`)
      return
    }
    let previousMax = 0
    for (const tier of pricing.tiers.slice().sort((left, right) => left.min - right.min)) {
      if (tier.min <= previousMax) errors.push(`${label}: overlapping pricing tiers`)
      else if (tier.min !== previousMax + 1) errors.push(`${label}: pricing tiers leave a quantity gap`)
      previousMax = tier.max ?? Infinity
    }
    if (quantityLimit !== undefined && previousMax < quantityLimit - (pricing.includedQuantity ?? 0)) {
      errors.push(`${label}: pricing tiers do not cover the full quantity range`)
    }
  }
}

function validateCondition(
  input: unknown,
  label: string,
  questions: Map<string, Question>,
  errors: string[],
  depth = 0,
): input is Condition {
  if (!record(input) || depth > 16) {
    errors.push(`${label}: invalid or overly nested condition`)
    return false
  }
  if ('and' in input || 'or' in input) {
    const key = 'and' in input ? 'and' : 'or'
    const children = input[key]
    if (Object.keys(input).length !== 1 || !Array.isArray(children) || !children.length || children.length > 40) {
      errors.push(`${label}: invalid condition group`)
      return false
    }
    return children.map((child) => validateCondition(child, label, questions, errors, depth + 1)).every(Boolean)
  }
  const operator = input.operator as Operator
  const question = typeof input.questionId === 'string' && questions.get(input.questionId)
  if (!question || question.kind === 'info' || !operators.includes(operator)) {
    errors.push(`${label}: invalid condition reference or operator`)
    return false
  }
  const { value } = input
  const numeric = ['gt', 'gte', 'lt', 'lte'].includes(operator)
  const comparison = operator !== 'empty' && operator !== 'notEmpty'
  const choice = choiceKinds.includes(question.kind)
  const invalid = comparison && (
    (numeric && (!quantityKinds.includes(question.kind) || question.kind === 'repeatable' || !Number.isSafeInteger(value))) ||
    (!numeric && typeof value !== 'string' && typeof value !== 'boolean' && !Number.isSafeInteger(value)) ||
    (choice && !question.options?.some((option) => option.id === value)) ||
    (question.kind === 'multiple' && ['eq', 'ne'].includes(operator)) ||
    (question.kind === 'repeatable') ||
    (question.kind === 'boolean' && typeof value !== 'boolean') ||
    (['text', 'textarea'].includes(question.kind) && typeof value !== 'string') ||
    (quantityKinds.includes(question.kind) && !Number.isSafeInteger(value))
  )
  if (invalid) errors.push(`${label}: invalid condition operand`)
  return !invalid
}

type ConditionTest = Extract<Condition, { questionId: string }>

function conjunctionCanMatch(leaves: ConditionTest[], questions: Map<string, Question>): boolean {
  const grouped = new Map<string, ConditionTest[]>()
  for (const leaf of leaves) {
    const tests = grouped.get(leaf.questionId) ?? []
    tests.push(leaf)
    grouped.set(leaf.questionId, tests)
  }
  for (const [questionId, tests] of grouped) {
    const question = questions.get(questionId)!
    const emptiness = tests.some((test) => test.operator === 'empty')
    if (emptiness && tests.some((test) => test.operator !== 'empty')) return false
    if (emptiness) continue
    let candidates: Answer[] | undefined
    if (question.kind === 'boolean') candidates = [true, false]
    if (question.kind === 'single' || question.kind === 'dropdown') {
      candidates = (question.options ?? []).filter((option) => option.active).map((option) => option.id)
    }
    if (['number', 'stepper', 'slider'].includes(question.kind)) {
      const min = question.min ?? 0
      const max = question.max ?? maxQuantity
      const step = question.step ?? 1
      const points = tests.flatMap(({ value }) => typeof value === 'number' ? [value - 1, value, value + 1] : [])
      candidates = [min, max, ...points]
        .flatMap((point) => [min + Math.floor((point - min) / step) * step, min + Math.ceil((point - min) / step) * step])
        .filter((point) => point >= min && point <= max)
    }
    if (question.kind === 'multiple') {
      const positive = new Set(tests.filter(({ operator }) => operator === 'selected' || operator === 'contains').map(({ value }) => value))
      const negative = new Set(tests.filter(({ operator }) => operator === 'notSelected' || operator === 'notContains').map(({ value }) => value))
      if ([...positive].some((value) => negative.has(value))) return false
      const active = (question.options ?? []).filter((option) => option.active).map((option) => option.id)
      if ([...positive].some((value) => typeof value !== 'string' || !active.includes(value))) return false
      if (!active.some((value) => !negative.has(value))) return false
    }
    if (question.kind === 'text' || question.kind === 'textarea') {
      const exact = tests.find(({ operator }) => operator === 'eq' || operator === 'selected')
      if (exact && typeof exact.value === 'string') {
        const value = normalize(question, exact.value)
        if (typeof value !== 'string' || value !== exact.value || !tests.every((test) => matches(test, { [questionId]: value }))) return false
      }
    }
    if (candidates && !candidates.some((value) => tests.every((test) => matches(test, { [questionId]: value })))) return false
  }
  return true
}

function conditionCanMatch(condition: Condition, questions: Map<string, Question>): boolean {
  // Cap expanded branches so highly nested rules cannot cause exponential publication work.
  let iterations = 0
  const pending: { conditions: Condition[]; leaves: ConditionTest[] }[] = [{ conditions: [condition], leaves: [] }]
  while (pending.length) {
    if (++iterations > 2048) throw new Error('condition is too complex to validate')
    const { conditions, leaves } = pending.pop()!
    const [current, ...rest] = conditions
    if (!current) {
      if (conjunctionCanMatch(leaves, questions)) return true
    } else if ('and' in current) {
      pending.push({ conditions: [...current.and, ...rest], leaves })
    } else if ('or' in current) {
      for (const child of current.or) pending.push({ conditions: [child, ...rest], leaves })
    } else {
      const tests = [...leaves, current]
      if (conjunctionCanMatch(tests, questions)) pending.push({ conditions: rest, leaves: tests })
    }
  }
  return false
}

function quantityLimit(question: Question | undefined): number {
  if (!question) return 1
  if (question.kind === 'repeatable') return question.max ?? maxItems
  if (quantityKinds.includes(question.kind)) return question.max ?? maxQuantity
  return question.kind === 'multiple' ? question.options?.length ?? 0 : 1
}

export function validateConfig(input: unknown): string[] {
  const errors: string[] = []
  if (!record(input) || !record(input.settings) ||
      !['projects', 'sections', 'questions', 'rules'].every((key) => Array.isArray(input[key]))) {
    return ['Invalid calculator configuration structure']
  }
  const config = input as Config
  const { settings } = config
  if (typeof settings.currency !== 'string' || !/^[A-Z]{3}$/.test(settings.currency)) errors.push('Settings: invalid currency')
  const settingsBounds = [
    ['minorUnits', 0, 6], ['validityDays', 1, 3650], ['taxBps', 0, 10000],
    ['discountLimitBps', 0, 10000], ['minimumPrice', 0, Number.MAX_SAFE_INTEGER], ['monthsPerYear', 0, 24],
  ] as const
  for (const [name, min, max] of settingsBounds) {
    if (settings[name] !== undefined && !integer(settings[name], min, max)) errors.push(`Settings: invalid ${name}`)
  }
  if (settings.rounding !== undefined && !['halfUp', 'floor', 'ceil'].includes(settings.rounding)) errors.push('Settings: invalid rounding')
  if (settings.showBreakdown !== undefined && typeof settings.showBreakdown !== 'boolean') errors.push('Settings: invalid breakdown visibility')
  if (settings.terms !== undefined && !localized(settings.terms)) errors.push('Settings: missing terms translation')
  if (settings.leadFields !== undefined && (!record(settings.leadFields) ||
      Object.entries(settings.leadFields).some(([key, value]) =>
        !['name', 'company', 'phone', 'whatsapp', 'email', 'requirements'].includes(key) ||
        !['hidden', 'optional', 'required'].includes(value)))) errors.push('Settings: invalid lead fields')
  const collections = [
    ['Project', config.projects], ['Section', config.sections],
    ['Question', config.questions], ['Rule', config.rules],
  ] as const
  function validateNamed(value: unknown, path: string, seen: Set<string>): value is Named {
    if (!record(value) || !id(value.id) || seen.has(value.id)) {
      errors.push(`${path}: invalid or duplicate ID`)
      return false
    }
    seen.add(value.id)
    if (!localized(value.title)) errors.push(`${path} ${value.id}: missing title translation`)
    if (typeof value.active !== 'boolean') errors.push(`${path} ${value.id}: invalid active status`)
    if (value.order !== undefined && !integer(value.order)) errors.push(`${path} ${value.id}: invalid order`)
    return true
  }
  let malformed = false
  for (const [name, values] of collections) {
    const seen = new Set<string>()
    for (const value of values) if (!validateNamed(value, name, seen)) malformed = true
  }
  if (malformed) return errors
  if (config.templates !== undefined) {
    if (!Array.isArray(config.templates)) errors.push('Templates: invalid list')
    else {
      const seen = new Set<string>()
      for (const template of config.templates) {
        if (validateNamed(template, 'Template', seen) && !kinds.includes(template.kind)) errors.push(`Template ${template.id}: invalid question kind`)
      }
    }
  }
  const projects = new Map(config.projects.map((project) => [project.id, project]))
  const sections = new Map(config.sections.map((section) => [section.id, section]))
  const questions = new Map(config.questions.map((question) => [question.id, question]))
  const chargeTargets = new Set(['project-base', ...questions.keys(), ...config.rules.map((rule) => rule.id)])
  const validConditions = new Set<Condition>()
  function translations(value: object, label: string, keys: string[]) {
    const source = value as Record<string, unknown>
    for (const key of keys) {
      if (source[key] !== undefined && !localized(source[key])) errors.push(`${label}: missing ${key} translation`)
    }
  }
  function checkProjectIds(value: unknown, label: string, required = false) {
    if (value === undefined && !required) return
    if (!Array.isArray(value) || new Set(value).size !== value.length || value.some((entry) => !projects.has(entry))) {
      errors.push(`${label}: invalid project references`)
    }
  }
  for (const project of config.projects) {
    const label = `Project ${project.id}`
    if (project.archived !== undefined && (typeof project.archived !== 'boolean' || (project.archived && project.active))) {
      errors.push(`${label}: an archived project must be inactive`)
    }
    if (!localized(project.description)) errors.push(`${label}: missing description translation`)
    translations(project, label, ['delivery'])
    for (const key of ['included', 'exclusions'] as const) {
      if (project[key] !== undefined && (!Array.isArray(project[key]) || !project[key]?.every(localized))) {
        errors.push(`${label}: missing ${key} translation`)
      }
    }
    for (const key of ['basePrice', 'minimumPrice'] as const) {
      if (project[key] !== undefined && !integer(project[key])) errors.push(`${label}: invalid ${key}`)
    }
  }
  const sectionConditions: { value: Condition; label: string; section: Section }[] = []
  const conditions: { value: Condition; label: string; active: boolean }[] = []
  for (const section of config.sections) {
    translations(section, `Section ${section.id}`, ['description'])
    checkProjectIds(section.projectIds, `Section ${section.id}`)
    if (section.condition !== undefined) {
      sectionConditions.push({ value: section.condition, label: `Section ${section.id}`, section })
      conditions.push({ value: section.condition, label: `Section ${section.id}`, active: section.active })
    }
  }
  const deferredDefaults: Question[] = []
  for (const question of config.questions) {
    const label = `Question ${question.id}`
    if (!sections.has(question.sectionId)) errors.push(`${label}: unknown section`)
    checkProjectIds(question.projectIds, label, true)
    translations(question, label, ['description', 'help', 'placeholder', 'unit'])
    if (question.adminNotes !== undefined && typeof question.adminNotes !== 'string') errors.push(`${label}: invalid internal notes`)
    if (!kinds.includes(question.kind)) errors.push(`${label}: invalid question kind`)
    if (typeof question.required !== 'boolean' || (question.required && question.kind === 'info')) errors.push(`${label}: invalid required status`)
    const limit = question.kind === 'repeatable' ? maxItems : ['text', 'textarea'].includes(question.kind) ? 4000 : maxQuantity
    if ((question.min !== undefined && !integer(question.min, 0, limit)) ||
        (question.max !== undefined && !integer(question.max, question.min ?? 0, limit)) ||
        (question.step !== undefined && !integer(question.step, 1, limit))) {
      errors.push(`${label}: invalid quantity range or step`)
    }
    if (question.condition !== undefined) conditions.push({ value: question.condition, label, active: question.active })
    if (question.active && question.pricing !== undefined) {
      validatePricing(question.pricing, label, errors, Array.isArray(question.options) || question.kind !== 'multiple' ? quantityLimit(question) : undefined)
    }
    if (question.kind === 'info') {
      if (question.pricing !== undefined) errors.push(`${label}: information blocks cannot charge`)
      if (question.defaultValue !== undefined) errors.push(`${label}: information blocks cannot have a default`)
    }
    if (question.options !== undefined && !Array.isArray(question.options)) {
      errors.push(`${label}: invalid options`)
      malformed = true
    } else if (question.options) {
      if (question.options.length && !choiceKinds.includes(question.kind)) errors.push(`${label}: only selection questions support options`)
      const seen = new Set<string>()
      let defaults = 0
      for (const option of question.options) {
        if (!validateNamed(option, `${label} option`, seen)) {
          malformed = true
          continue
        }
        const optionLabel = `${label} option ${option.id}`
        chargeTargets.add(`${question.id}:${option.id}`)
        translations(option, optionLabel, ['description'])
        if (option.default !== undefined && typeof option.default !== 'boolean') errors.push(`${optionLabel}: invalid default`)
        if (option.active && option.default) defaults++
        if (option.condition !== undefined) {
          conditions.push({ value: option.condition, label: optionLabel, active: question.active && option.active })
        }
        if (question.active && option.active && choiceKinds.includes(question.kind)) validatePricing(option.pricing, optionLabel, errors, 1)
      }
      if (question.kind !== 'multiple' && defaults > 1) errors.push(`${label}: conflicting option defaults`)
    }
    if (question.kind === 'repeatable') {
      const seen = new Set<string>()
      if (!Array.isArray(question.itemFields) || !question.itemFields.length || question.itemFields.length > 20) {
        errors.push(`${label}: missing or invalid item fields`)
        malformed = true
      } else for (const field of question.itemFields) {
        if (!record(field) || !id(field.id) || seen.has(field.id) || !localized(field.title) ||
            !['text', 'number', 'boolean'].includes(field.kind)) {
          errors.push(`${label}: invalid item field`)
          malformed = true
          continue
        }
        seen.add(field.id)
        if ((field.min !== undefined && !integer(field.min)) ||
            (field.max !== undefined && !integer(field.max, field.min ?? 0)) ||
            (field.required !== undefined && typeof field.required !== 'boolean')) errors.push(`${label}: invalid item field range`)
      }
    }
    if (question.defaultValue !== undefined && question.kind !== 'info') deferredDefaults.push(question)
  }
  for (const rule of config.rules) {
    const label = `Rule ${rule.id}`
    if (rule.active) validatePricing(rule, label, errors, quantityLimit(rule.questionId ? questions.get(rule.questionId) : undefined))
    if (rule.stage !== undefined && !['charge', 'discount'].includes(rule.stage)) errors.push(`${label}: invalid stage`)
    if (rule.stage === 'discount' && (!['fixed', 'percentage'].includes(rule.method) ||
        (rule.method === 'percentage' && !integer(rule.rateBps, 0, 10000)))) {
      errors.push(`${label}: invalid discount method or rate`)
    }
    if (rule.questionId !== undefined && !questions.has(rule.questionId)) errors.push(`${label}: unknown quantity question`)
    checkProjectIds(rule.projectIds, label)
    if (rule.method === 'maximum' && (!rule.target || !chargeTargets.has(rule.target) || rule.target === rule.id)) {
      errors.push(`${label}: invalid cap target`)
    }
    if (rule.condition !== undefined) conditions.push({ value: rule.condition, label, active: rule.active })
  }
  if (malformed) return errors
  for (const { value, label, active } of conditions) {
    if (validateCondition(value, label, questions, errors)) {
      validConditions.add(value)
      try {
        if (active && !conditionCanMatch(value, questions)) errors.push(`${label}: conflicting conditions`)
      } catch (error) {
        errors.push(`${label}: ${(error as Error).message}`)
      }
    }
  }
  const stepOrder = new Map(sorted(config.sections).map((section, index) => [section.id, index]))
  for (const { value, label, section } of sectionConditions) {
    for (const reference of references(value)) {
      const owner = questions.get(reference)
      if (owner && (stepOrder.get(owner.sectionId) ?? 0) >= (stepOrder.get(section.id) ?? 0)) {
        errors.push(`${label}: conditions can only use answers from an earlier step`)
      }
    }
  }
  const gated = config.questions.flatMap((question) => [
    { label: `Question ${question.id}`, sectionId: question.sectionId, condition: question.condition },
    ...(question.options ?? []).map((option) => ({
      label: `Question ${question.id} option ${option.id}`, sectionId: question.sectionId, condition: option.condition,
    })),
  ])
  for (const { label, sectionId, condition } of gated) {
    for (const reference of references(condition)) {
      const owner = questions.get(reference)
      if (owner && (stepOrder.get(owner.sectionId) ?? 0) > (stepOrder.get(sectionId) ?? 0)) {
        errors.push(`${label}: conditions can only use answers from the same or an earlier step`)
      }
    }
  }
  for (const question of deferredDefaults) {
    if (normalize({ ...question, options: question.options?.filter((option) => option.active) }, question.defaultValue) === undefined) {
      errors.push(`Question ${question.id}: invalid default answer`)
    }
  }
  let dependencyOrder: Question[] = []
  if (conditions.every(({ value }) => validConditions.has(value))) {
    try {
      for (const question of config.questions) {
        for (const option of question.options ?? []) {
          if (question.kind !== 'multiple' && references(option.condition).includes(question.id)) {
            errors.push(`Question ${question.id} option ${option.id}: circular dependency`)
          }
        }
        assertOptionOrder(question)
      }
      dependencyOrder = orderQuestions(config.questions)
    } catch (error) {
      errors.push((error as Error).message)
    }
  }
  const activeProjects = config.projects.filter((project) => project.active)
  if (!activeProjects.length) errors.push('No active projects')
  for (const project of activeProjects) {
    const available = new Set(config.questions.filter((entry) => {
      const section = sections.get(entry.sectionId)
      const sectionAssigned = !section?.projectIds || Array.isArray(section.projectIds) && assigned(section.projectIds, project.id)
      return entry.active && Array.isArray(entry.projectIds) && assigned(entry.projectIds, project.id) &&
        Boolean(section?.active && sectionAssigned)
    }).map((question) => question.id))
    const reachable = (condition?: Condition): boolean => {
      if (!condition) return true
      if ('and' in condition) return condition.and.every(reachable)
      if ('or' in condition) return condition.or.some(reachable)
      return available.has(condition.questionId) || condition.operator === 'empty'
    }
    const hiddenSections = new Set(sorted(config.sections)
      .filter((section) => section.active && assigned(section.projectIds, project.id) &&
        section.condition !== undefined && !reachable(section.condition))
      .map((section) => section.id))
    for (const question of dependencyOrder) {
      const hasOptions = !choiceKinds.includes(question.kind) || question.options?.some((option) => option.active && reachable(option.condition))
      if (!reachable(question.condition) || !hasOptions || hiddenSections.has(question.sectionId)) available.delete(question.id)
      if (question.active && question.required && Array.isArray(question.projectIds) &&
          assigned(question.projectIds, project.id) && !available.has(question.id)) {
        errors.push(`Question ${question.id}: unreachable required question for project ${project.id}`)
      }
    }
  }
  return [...new Set(errors)]
}
