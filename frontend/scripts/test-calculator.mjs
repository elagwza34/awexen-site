import assert from 'node:assert/strict'
import { test } from 'node:test'

import { calculate, validateConfig, visibleQuestions } from '../../supabase/functions/_shared/calculator/engine.ts'
const title = { ar: 'اختبار', en: 'Test' }
const question = (id, values = {}) => ({
  id, title, active: true, required: false, kind: 'number', min: 0, max: 40,
  sectionId: 'main', projectIds: ['site'], ...values,
})
const rule = (id, method, values = {}) => ({ id, title, active: true, method, ...values })
const fixture = (questions = [], rules = [], settings = {}) => ({
  settings: { currency: 'EGP', ...settings },
  projects: [{ id: 'site', title, description: title, active: true, basePrice: 1000 }],
  sections: [{ id: 'main', title, active: true }],
  questions,
  rules,
})

test('computes base, fixed, units, graduated tiers, volume rate and included allowance', () => {
  const tiers = [{ min: 1, max: 3, unitPrice: 100 }, { min: 4, unitPrice: 70 }]
  const config = fixture([
    question('units', { pricing: { method: 'perUnit', unitPrice: 21 } }),
    question('pages', { pricing: { method: 'tiered', tiers } }),
    question('products', { pricing: { method: 'volume', tiers } }),
    question('languages', { pricing: { method: 'includedQuantity', includedQuantity: 2, unitPrice: 75 } }),
  ], [rule('service', 'fixed', { amount: 500 })])
  const result = calculate(config, 'site', { units: 4, pages: 5, products: 5, languages: 3 })
  assert.deepEqual(result.items.map((item) => item.amount), [1000, 84, 440, 350, 75, 500])
  assert.equal(result.oneTime, 2449)
})

test('applies modifiers, minimum, maximum, limited discount and rounded taxes', () => {
  const config = fixture([], [
    rule('extras', 'fixed', { amount: 1000 }),
    rule('cap', 'maximum', { amount: 400, target: 'extras' }),
    rule('overhead', 'percentage', { rateBps: 500, subtotal: 'oneTime' }),
    rule('complexity', 'multiplier', { rateBps: 15000, subtotal: 'oneTime' }),
    rule('floor', 'minimum', { amount: 2500 }),
    rule('promo', 'percentage', { rateBps: 2000, subtotal: 'oneTime', stage: 'discount' }),
  ], { taxBps: 1450, discountLimitBps: 1000 })
  const result = calculate(config, 'site', {})
  assert.equal(result.discount, 250)
  assert.equal(result.tax, 326)
  assert.equal(result.oneTime, 2576)
})

test('discounts read the post-modifier subtotal and never drive a billing total negative', () => {
  const promoted = calculate(fixture([], [
    rule('complexity', 'multiplier', { rateBps: 15000, subtotal: 'oneTime' }),
    rule('promo', 'percentage', { rateBps: 1000, subtotal: 'oneTime', stage: 'discount' }),
  ]), 'site', {})
  assert.deepEqual([promoted.oneTime, promoted.discount], [1350, 150])

  const exhausted = calculate(fixture([], [
    rule('zero', 'multiplier', { rateBps: 0, subtotal: 'oneTime' }),
    rule('promo', 'percentage', { rateBps: 1000, subtotal: 'oneTime', stage: 'discount' }),
  ]), 'site', {})
  assert.deepEqual([exhausted.oneTime, exhausted.discount], [0, 0])

  const capped = calculate(fixture([], [
    rule('first', 'percentage', { rateBps: 6000, subtotal: 'oneTime', stage: 'discount' }),
    rule('second', 'percentage', { rateBps: 6000, subtotal: 'oneTime', stage: 'discount' }),
  ]), 'site', {})
  assert.deepEqual([capped.oneTime, capped.discount], [0, 1000])
})

test('updates separate billing periods and applies the configured first year billing term', () => {
  const config = fixture([], [
    rule('host', 'fixed', { amount: 110, billing: 'monthly' }),
    rule('domain', 'fixed', { amount: 350, billing: 'annual' }),
  ], { monthsPerYear: 10 })
  const result = calculate(config, 'site', {})
  assert.deepEqual([result.oneTime, result.monthly, result.annual, result.firstYear], [1000, 110, 350, 2450])
})

test('applies a maximum to a named minimum adjustment', () => {
  const config = fixture([], [
    rule('floor', 'minimum', { amount: 2500 }),
    rule('cap', 'maximum', { amount: 400, target: 'floor' }),
  ])
  assert.deepEqual(validateConfig(config), [])
  assert.equal(calculate(config, 'site', {}).oneTime, 1400)
})

test('deduplicates equivalent charges within a billing period', () => {
  const config = fixture([], [
    rule('storage-bundle', 'fixed', { amount: 100, chargeKey: 'storage' }),
    rule('storage', 'fixed', { amount: 100, chargeKey: 'storage' }),
    rule('monthly-storage', 'fixed', { amount: 50, chargeKey: 'storage', billing: 'monthly' }),
  ])
  const result = calculate(config, 'site', {})
  assert.deepEqual([result.oneTime, result.monthly], [1100, 50])
})

test('ignores hidden answers and rejects unavailable selections', () => {
  const config = fixture([
    question('payment', { kind: 'boolean' }),
    question('providers', {
      kind: 'multiple', required: true,
      condition: { questionId: 'payment', operator: 'eq', value: true },
      options: [{ id: 'stripe', title, active: true, pricing: { method: 'fixed', amount: 100 } }],
    }),
  ], [
    rule('multi-provider', 'fixed', {
      amount: 500, condition: { and: [
        { questionId: 'payment', operator: 'eq', value: true },
        { questionId: 'providers', operator: 'selected', value: 'stripe' },
      ] },
    }),
  ])
  assert.deepEqual(visibleQuestions(config, 'site', { payment: false, providers: ['stripe'] }).answers, { payment: false })
  assert.equal(calculate(config, 'site', { payment: false, providers: ['stripe'] }, true).oneTime, 1000)
  assert.throws(() => calculate(config, 'site', { payment: true }, true))
  assert.throws(() => calculate(config, 'site', { payment: true, providers: ['invalid'] }, true))
  assert.equal(calculate(config, 'site', { payment: true, providers: ['stripe'] }, true).oneTime, 1600)
})

test('distinguishes free, included, manual and unconfigured charges', () => {
  const config = fixture([], [
    rule('free', 'free'), rule('included', 'included'), rule('manual', 'manual'), rule('unknown', 'unconfigured'),
  ])
  const result = calculate(config, 'site', {})
  assert.deepEqual(result.items.map((item) => item.status), ['priced', 'free', 'included', 'manual', 'unconfigured'])
  assert.deepEqual(result.manual.map((item) => item.id), ['manual', 'unknown'])
  assert.equal(result.complete, false)
  assert.match(validateConfig(config).join(), /unconfigured/i)
})

test('rejects broken references, dependency cycles, invalid bounds and tier overlaps', () => {
  const config = fixture([
    question('first', { condition: { questionId: 'second', operator: 'gte', value: 2 } }),
    question('second', { min: 11, max: 1, condition: { questionId: 'first', operator: 'gte', value: 2 } }),
    question('third', { sectionId: 'missing', pricing: { method: 'tiered', tiers: [
      { min: 1, max: 5, unitPrice: 10 }, { min: 5, unitPrice: 8 },
    ] } }),
  ])
  const errors = validateConfig(config).join()
  for (const term of [/circular/i, /quantity range/i, /section/i, /overlap/i]) assert.match(errors, term)
})

test('revalidates repeatable objects and charges per retained item', () => {
  const config = fixture([question('screens', {
    kind: 'repeatable', itemFields: [{ id: 'name', title, kind: 'text', required: true }],
    pricing: { method: 'perUnit', unitPrice: 77 },
  })])
  assert.equal(calculate(config, 'site', { screens: [{ name: 'Home' }, { name: 'Settings' }] }, true).oneTime, 1154)
  assert.throws(() => calculate(config, 'site', { screens: [{ name: 'Home', price: 1 }] }, true))
})

test('enforces same-question prerequisites and mutual exclusions', () => {
  const config = fixture([question('features', {
    kind: 'multiple',
    options: [
      { id: 'booking', title, active: true, pricing: { method: 'fixed', amount: 10 } },
      { id: 'calendar', title, active: true, pricing: { method: 'fixed', amount: 20 },
        condition: { questionId: 'features', operator: 'selected', value: 'booking' } },
      { id: 'manual', title, active: true, pricing: { method: 'included' },
        condition: { questionId: 'features', operator: 'notSelected', value: 'booking' } },
    ],
  })])
  assert.deepEqual(validateConfig(config), [])
  assert.equal(calculate(config, 'site', { features: ['booking', 'calendar'] }, true).oneTime, 1030)
  assert.throws(() => calculate(config, 'site', { features: ['calendar'] }, true))
  assert.throws(() => calculate(config, 'site', { features: ['booking', 'manual'] }, true))
  assert.equal(calculate(config, 'site', { features: ['manual'] }, true).oneTime, 1000)
})

test('rejects cyclic prerequisites between options in the same question', () => {
  const features = question('features', {
    kind: 'multiple',
    options: [
      { id: 'booking', title, active: true, pricing: { method: 'free' },
        condition: { questionId: 'features', operator: 'selected', value: 'calendar' } },
      { id: 'calendar', title, active: true, pricing: { method: 'free' },
        condition: { questionId: 'features', operator: 'selected', value: 'booking' } },
    ],
  })
  assert.match(validateConfig(fixture([features])).join(), /circular/i)
})

test('rejects a required question gated by a prerequisite unavailable in its project', () => {
  const config = fixture([
    question('enabled', { kind: 'boolean', active: false }),
    question('required', { required: true, condition: { and: [{ questionId: 'enabled', operator: 'eq', value: true }] } }),
  ])
  assert.match(validateConfig(config).join(), /unreachable required/i)
})

test('rejects contradictory nested visibility conditions and uncovered quantity ranges', () => {
  const config = fixture([
    question('size', { pricing: { method: 'volume', tiers: [{ min: 1, max: 20, unitPrice: 5 }] } }),
    question('scope', {
      condition: { and: [
        { questionId: 'size', operator: 'gte', value: 10 },
        { or: [
          { questionId: 'size', operator: 'eq', value: 9 },
          { questionId: 'size', operator: 'lt', value: 4 },
        ] },
      ] },
    }),
  ])
  const errors = validateConfig(config).join()
  assert.match(errors, /conflicting conditions/i)
  assert.match(errors, /quantity range/i)
})

test('rejects an unreachable required question behind an unavailable ancestor', () => {
  const config = fixture([
    question('first', { kind: 'boolean', active: false }),
    question('second', { condition: { questionId: 'first', operator: 'eq', value: true } }),
    question('third', { required: true, condition: { questionId: 'second', operator: 'gte', value: 1 } }),
  ])
  assert.match(validateConfig(config).join(), /unreachable required/i)
})

test('uses integer intermediate arithmetic and fails closed outside the public numeric range', () => {
  const large = fixture([question('units', { pricing: { method: 'perUnit', unitPrice: 1_000_000_000_000_001 } })])
  assert.equal(calculate(large, 'site', { units: 8 }).oneTime, 8_000_000_000_001_008)
  assert.throws(() => calculate(large, 'site', { units: 10 }), /monetary range/)
})

test('rejects configuration fields that could expose metadata or create hidden charges', () => {
  const config = fixture([
    question('info', { kind: 'info', defaultValue: { internal: 'private' } }),
    question('text', { kind: 'text', options: [
      { id: 'arbitrary-value', title, active: true, pricing: { method: 'fixed', amount: 10 } },
    ] }),
  ])
  const errors = validateConfig(config).join()
  assert.match(errors, /information blocks cannot have a default/i)
  assert.match(errors, /only selection questions support options/i)
  assert.equal(calculate(config, 'site', { text: 'arbitrary-value' }).oneTime, 1000)
})
