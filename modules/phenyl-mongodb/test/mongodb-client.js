// @flow

import { it, describe } from 'mocha'
import bson from 'bson'
import assert from 'power-assert'
import type { AndFindOperation, UpdateOperation, Entity } from 'phenyl-interfaces'
import {
  filterFindOperation,
  filterUpdateOperation,
  filterInputEntity,
  filterOutputEntity,
} from '../src/mongodb-client.js'

describe('filterFindOperation', () => {
  it ('renames id to _id', () => {
    const input: AndFindOperation = {
      $and: [
        { id: 'abc' },
        { type: 'bar' },
      ]
    }
    const expected = {
      $and: [
        { _id: 'abc' },
        { type: 'bar' },
      ]
    }
    const actual = filterFindOperation(input)
    assert.deepEqual(actual, expected)
  })

  it ('converts document path to dot notation', () => {
    // $FlowIssue(this-is-and-find-operation)
    const input: AndFindOperation = {
      $and: [
        { 'values[0]': 'fizz' },
        { 'values[1].test': 'buzz' },
        { 'values[12].test': { $eq: 'fizzBuzz' } },
        { 'values[123].test': { $regex: /zz/ } },
        { 'values[1234].test': { $in: ['fizz', 'buzz'] } },
        { type: 'bar' },
      ]
    }
    const expected = {
      $and: [
        { 'values.0': 'fizz' },
        { 'values.1.test': 'buzz' },
        { 'values.12.test': { $eq: 'fizzBuzz' } },
        { 'values.123.test': { $regex: /zz/ } },
        { 'values.1234.test': { $in: ['fizz', 'buzz'] } },
        { type: 'bar' },
      ]
    }
    const actual = filterFindOperation(input)
    assert.deepEqual(actual, expected)
  })

  it ('converts matched string to ObjectId', () => {
    // $FlowIssue(this-is-and-find-operation)
    const input: AndFindOperation = {
      $and: [
        // not match
        { id: null },
        { id: 'bar' },
        { id: bson.ObjectID('222222222222222222222222') },
        { id: '000123456789abcdefABCDEF' },
        // match
        { id: '000123456789abcdefabcdef' },
        { id: { $eq: '000000000011111111112222' }},
        { id: { $not: { $eq: '000000000011111111112222' }}},
        { id: { $in: [
          '000000000011111111112222',
          '000000000011111111113333',
        ]}}
      ]
    }
    const expected = {
      $and: [
        { _id: null },
        { _id: 'bar' },
        { _id: bson.ObjectID('222222222222222222222222') },
        { _id: '000123456789abcdefABCDEF' },
        { _id: bson.ObjectID('000123456789abcdefabcdef') },
        { _id: { $eq: bson.ObjectID('000000000011111111112222') }},
        { _id: { $not: { $eq: bson.ObjectID('000000000011111111112222') }}},
        { _id: { $in: [
          bson.ObjectID('000000000011111111112222'),
          bson.ObjectID('000000000011111111113333'),
        ]}}
      ]
    }
    const actual = filterFindOperation(input)
    assert.deepEqual(actual, expected)
  })
})

describe('filterUpdateOperation', () => {
  it ('converts new name to name with parent', () => {
    const input: UpdateOperation = {
      $rename: {
        foo: 'bar',
        'baz.qux': 'foobar',
        'baz.foo.qux': 'foobar',
      }
    }
    const expected = {
      $rename: {
        foo: 'bar',
        'baz.qux': 'baz.foobar',
        'baz.foo.qux': 'baz.foo.foobar',
      }
    }
    const actual = filterUpdateOperation(input)
    assert.deepEqual(actual, expected)
  })
})

describe('filterInputEntity', () => {
  it ('renames id to _id', () => {
    const input = {
      id: '123',
      attr: 'bar',
    }
    const expected = {
      _id: '123',
      attr: 'bar',
    }
    const actual = filterInputEntity(input)
    assert.deepEqual(actual, expected)
  })

  it ('converts id to ObjectId', () => {
    const input = {
      id: '000123456789abcdefabcdef',
      attr: 'bar',
    }
    const expected = {
      _id: bson.ObjectID('000123456789abcdefabcdef'),
      attr: 'bar',
    }
    const actual = filterInputEntity(input)
    assert.deepEqual(actual, expected)
  })
})

describe('filterOutputEntity', () => {
  it ('renames id to _id', () => {
    // $FlowIssue(this-is-mongo-entity)
    const input: Entity = {
      _id: '123',
      attr: 'bar',
    }
    const expected = {
      id: '123',
      attr: 'bar',
    }
    const actual = filterOutputEntity(input)
    assert.deepEqual(actual, expected)
  })

  it ('converts id to ObjectId', () => {
    // $FlowIssue(this-is-mongo-entity)
    const input: Entity = {
      _id: bson.ObjectID('000123456789abcdefabcdef'),
      attr: 'bar',
    }
    const expected = {
      id: '000123456789abcdefabcdef',
      attr: 'bar',
    }
    const actual = filterOutputEntity(input)
    assert.deepEqual(actual, expected)
  })
})
