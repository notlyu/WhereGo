import { describe, expect, it } from 'vitest'

import { moveItem } from './useDragSort'

describe('moveItem', () => {
  const список = ['а', 'б', 'в', 'г']

  it('двигает вперёд', () => {
    expect(moveItem(список, 0, 2)).toEqual(['б', 'в', 'а', 'г'])
  })

  it('двигает назад', () => {
    expect(moveItem(список, 3, 0)).toEqual(['г', 'а', 'б', 'в'])
  })

  it('на место соседа — обмен', () => {
    expect(moveItem(список, 1, 2)).toEqual(['а', 'в', 'б', 'г'])
  })

  it('на своё же место ничего не меняет', () => {
    expect(moveItem(список, 2, 2)).toEqual(список)
  })

  it('исходный список не трогает — от него зависит откат при сбое', () => {
    const копия = [...список]
    moveItem(список, 0, 3)
    expect(список).toEqual(копия)
  })

  it('первый элемент — обложка: перенос на нулевую позицию делает главным', () => {
    expect(moveItem(список, 2, 0)[0]).toBe('в')
  })
})
