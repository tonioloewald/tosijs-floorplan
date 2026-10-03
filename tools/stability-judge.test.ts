import { test, expect, describe } from 'bun:test'
import { judge } from './stability-judge'

describe('byte-stability verdicts (board #2584)', () => {
  const live = { divergesFrom: 'tosijs-floorplan-0.5.1', reason: 'CHANGELOG 0.6.0: x' }
  const published = 'tosijs-floorplan-0.5.1'

  test('identical bytes, no license: a pin holds', () => {
    expect(judge('f', 'abc', 'abc', undefined, published).verdict).toBe('identical')
  })

  test('different bytes, no license: unlicensed drift, located', () => {
    const { verdict, message } = judge('f', 'abcdef', 'abcXef', undefined, published)
    expect(verdict).toBe('drift')
    expect(message).toContain('at byte 3')
  })

  test('different bytes under a live license: licensed', () => {
    expect(judge('f', 'abc', 'abX', live, published).verdict).toBe('licensed')
  })

  test('identical bytes under a live license: identical (the change may not have landed yet)', () => {
    expect(judge('f', 'abc', 'abc', live, published).verdict).toBe('identical')
  })

  // the version-mismatch path: once the licensed change publishes, the
  // license expires whether or not bytes differ — it can never excuse drift
  test('a stale license fails even when bytes are identical', () => {
    const { verdict, message } = judge('f', 'abc', 'abc', live, 'tosijs-floorplan-0.6.0')
    expect(verdict).toBe('stale')
    expect(message).toContain('bytes currently identical')
  })

  test('a stale license fails, and says so, when bytes differ', () => {
    const { verdict, message } = judge('f', 'abc', 'abX', live, 'tosijs-floorplan-0.6.0')
    expect(verdict).toBe('stale')
    expect(message).toContain('bytes DIFFER')
  })
})
