import mongodb from "mongodb";
import bson from "bson";
import { createServerError } from "@phenyl/utils";
// @ts-ignore remove this after @phenyl/power-assign
import { assign } from "power-assign";
import {
  convertToDotNotationString,
  visitFindOperation,
  visitUpdateOperation,
  UpdateOperator
  // @ts-ignore remove this after @phenyl/oad-utils
} from "oad-utils";

import {
  Entity,
  EntityMap,
  PreEntity,
  DbClient,
  IdQuery,
  IdsQuery,
  Key,
  WhereQuery,
  SingleInsertCommand,
  MultiInsertCommand,
  IdUpdateCommand,
  MultiUpdateCommand,
  DeleteCommand,
  FindOperation,
  UpdateOperation,
  SetOperator,
  SimpleFindOperation
} from "@phenyl/interfaces";

import { MongoDbConnection } from "./connection";
import {
  ChangeStreamPipeline,
  ChangeStreamOptions,
  ChangeStream
} from "./change-stream";

// convert 24-byte hex lower string to ObjectId
function ObjectID(id: any): any {
  if (id instanceof mongodb.ObjectID) return id;
  if (typeof id !== "string") return id;
  try {
    // @ts-ignore ObjectID is not class type
    return /^[0-9a-f]{24}$/.test(id) ? bson.ObjectID(id) : id;
  } catch (e) {
    return id;
  }
}

function assignToEntity<E extends Entity>(
  entity: E,
  op: UpdateOperation | SetOperator
): E {
  // $FlowIssue(structure-is-entity)
  return assign(entity, op);
}

function convertToObjectIdRecursively(src: any): any {
  if (Array.isArray(src)) return src.map(id => ObjectID(id));
  if (typeof src !== "object") return ObjectID(src);
  return Object.keys(src).reduce((dst: any, key: string) => {
    dst[key] = convertToObjectIdRecursively(src[key]);
    return dst;
  }, {});
}

function convertIdToObjectIdInWhere(
  simpleFindOperation: SimpleFindOperation
): SimpleFindOperation {
  return simpleFindOperation.id
    ? assign(simpleFindOperation, {
        id: convertToObjectIdRecursively(simpleFindOperation.id)
      })
    : simpleFindOperation;
}

// $FlowIssue(this-is-SimpleFindOperation)
function setIdTo_idInWhere(
  simpleFindOperation: SimpleFindOperation
): SimpleFindOperation {
  return assign(simpleFindOperation, { $rename: { id: "_id" } });
}

function convertDocumentPathToDotNotationInFindOperation(
  simpleFindOperation: SimpleFindOperation
): SimpleFindOperation {
  return Object.keys(simpleFindOperation).reduce(
    (operation: any, srcKey: string) => {
      const dstKey = convertToDotNotationString(srcKey);
      operation[dstKey] = simpleFindOperation[srcKey];
      return operation;
    },
    {}
  );
}

function composedFindOperationFilters(
  simpleFindOperation: SimpleFindOperation
): SimpleFindOperation {
  return [
    convertIdToObjectIdInWhere,
    setIdTo_idInWhere,
    convertDocumentPathToDotNotationInFindOperation // execute last because power-assign required documentPath
  ].reduce(
    (operation, filterFunc) => filterFunc(operation),
    simpleFindOperation
  );
}

export function filterFindOperation(operation: FindOperation): FindOperation {
  return visitFindOperation(operation, {
    simpleFindOperation: composedFindOperationFilters
  });
}

function convertNewNameWithParent(operation: UpdateOperation): UpdateOperation {
  const renameOperator = operation.$rename;
  if (!renameOperator) return operation;

  const renameOperatorWithParent = Object.keys(renameOperator).reduce(
    (operator: any, key: string) => {
      operator[key] = key
        .split(".")
        .slice(0, -1)
        .concat(renameOperator[key])
        .join(".");
      return operator;
    },
    {}
  );

  return assign(operation, { $set: { $rename: renameOperatorWithParent } });
}

function convertDocumentPathToDotNotationInUpdateOperation(
  updateOperation: UpdateOperation
): UpdateOperation {
  return visitUpdateOperation(updateOperation, {
    operation: (op: UpdateOperator) => {
      return Object.keys(op).reduce((acc: any, srcKey: string) => {
        const dstKey = convertToDotNotationString(srcKey);
        // $FlowIssue(op[srcKey])
        acc[dstKey] = op[srcKey];
        return acc;
      }, {});
    }
  });
}

export function filterUpdateOperation(
  updateOperation: UpdateOperation
): UpdateOperation {
  return [
    convertNewNameWithParent,
    convertDocumentPathToDotNotationInUpdateOperation
  ].reduce((operation, filterFunc) => filterFunc(operation), updateOperation);
}

function convertIdToObjectIdInEntity<E extends Entity>(entity: E): E {
  return entity.id
    ? assignToEntity(entity, { id: ObjectID(entity.id) })
    : entity;
}

function setIdTo_idInEntity<E extends Entity>(entity: E): E {
  return assignToEntity(entity, { $rename: { id: "_id" } });
}

export function filterInputEntity<E extends Entity>(srcEntity: E): E {
  return [convertIdToObjectIdInEntity, setIdTo_idInEntity].reduce(
    (entity: E, filterFunc) => filterFunc(entity),
    srcEntity
  );
}

function convertObjectIdToIdInEntity<E extends Entity>(entity: E): E {
  return entity._id instanceof mongodb.ObjectID
    ? assignToEntity(entity, { _id: entity._id.toString() })
    : entity;
}

function set_idToIdInEntity<E extends Entity>(entity: E): E {
  return assignToEntity(entity, { $rename: { _id: "id" } });
}

export function filterOutputEntity<E extends Entity>(srcEntity: E): E {
  return [convertObjectIdToIdInEntity, set_idToIdInEntity].reduce(
    (entity: E, filterFunc) => filterFunc(entity),
    srcEntity
  );
}

export class PhenylMongoDbClient<M extends EntityMap> implements DbClient<M> {
  conn: MongoDbConnection;

  constructor(conn: MongoDbConnection) {
    this.conn = conn;
  }

  async find(query: WhereQuery<Key<M>>): Promise<Array<M[Key<M>]>> {
    const { entityName, where, skip, limit } = query;
    const coll = this.conn.collection(entityName);
    const options: WhereQuery<Key<M>> = {};
    if (skip) options.skip = skip;
    if (limit) options.limit = limit;

    const result = await coll.find(filterFindOperation(where), options);
    return result.map(filterOutputEntity);
  }

  async findOne(query: WhereQuery<Key<M>>): Promise<M[Key<M>]> {
    const { entityName, where } = query;
    const coll = this.conn.collection(entityName);
    const result = await coll.find(filterFindOperation(where), { limit: 1 });
    if (result.length === 0) {
      throw createServerError("findOne()", "NotFound");
    }
    return filterOutputEntity(result[0] || null);
  }

  async get(query: IdQuery<Key<M>>): Promise<M[Key<M>]> {
    const { entityName, id } = query;
    const coll = this.conn.collection(entityName);
    const result = await coll.find({ _id: ObjectID(id) });
    if (result.length === 0) {
      throw createServerError(
        '"PhenylMongodbClient#get()" failed. Could not find any entity with the given query.',
        "NotFound"
      );
    }
    return filterOutputEntity(result[0]);
  }

  async getByIds(query: IdsQuery<Key<M>>): Promise<Array<M[Key<M>]>> {
    const { entityName, ids } = query;
    const coll = this.conn.collection(entityName);
    // $FlowIssue(find-operation)
    const result = await coll.find({ _id: { $in: ids.map(ObjectID) } });
    if (result.length === 0) {
      throw createServerError(
        '"PhenylMongodbClient#getByIds()" failed. Could not find any entity with the given query.',
        "NotFound"
      );
    }
    return result.map(filterOutputEntity);
  }

  async insertOne(
    command: SingleInsertCommand<Key<M>, PreEntity<M[Key<M>]>>
  ): Promise<number> {
    const { entityName, value } = command;
    const coll = this.conn.collection(entityName);
    const result = await coll.insertOne(filterInputEntity(value));
    return result.insertedCount;
  }

  async insertMulti(
    command: MultiInsertCommand<Key<M>, PreEntity<M[Key<M>]>>
  ): Promise<number> {
    const { entityName } = command;
    const coll = this.conn.collection(entityName);
    const result = await coll.insertMany(command.values.map(filterInputEntity));
    return result.insertedCount;
  }

  async insertAndGet(
    command: SingleInsertCommand<Key<M>, PreEntity<M[Key<M>]>>
  ): Promise<M[Key<M>]> {
    const { entityName } = command;
    const coll = this.conn.collection(entityName);
    const result = await coll.insertOne(filterInputEntity(command.value));
    // TODO transactional operation needed
    return this.get({ entityName, id: result.insertedId });
  }

  async insertAndGetMulti(
    command: MultiInsertCommand<Key<M>, PreEntity<M[Key<M>]>>
  ): Promise<Array<M[Key<M>]>> {
    const { entityName } = command;
    const coll = this.conn.collection(entityName);

    const result = await coll.insertMany(command.values.map(filterInputEntity));
    // $FlowIssue(ids-are-all-strings)
    const ids: string[] = Object.values(result.insertedIds);
    // TODO: transactional operation needed
    return this.getByIds({ entityName, ids });
  }

  async updateAndGet(command: IdUpdateCommand<Key<M>>): Promise<M[Key<M>]> {
    const { entityName, id, operation } = command;
    const coll = this.conn.collection(entityName);
    const result = await coll.updateOne(
      { _id: ObjectID(id) },
      filterUpdateOperation(operation)
    );
    const { matchedCount } = result;
    if (matchedCount === 0) {
      throw createServerError(
        '"PhenylMongodbClient#updateAndGet()" failed. Could not find any entity with the given query.',
        "NotFound"
      );
    }
    // TODO: transactional operation needed
    return this.get({ entityName, id });
  }

  async updateAndFetch(
    command: MultiUpdateCommand<Key<M>>
  ): Promise<Array<M[Key<M>]>> {
    const { entityName, where, operation } = command;
    const coll = this.conn.collection(entityName);
    await coll.updateMany(
      filterFindOperation(where),
      filterUpdateOperation(operation)
    );
    // FIXME: the result may be different from updated entities.
    return this.find({ entityName, where });
  }

  async delete(command: DeleteCommand<Key<M>>): Promise<number> {
    const { entityName } = command;
    const coll = this.conn.collection(entityName);
    let result;
    if (command.id) {
      result = await coll.deleteOne({ _id: ObjectID(command.id) });
    } else if (command.where) {
      result = await coll.deleteMany(filterFindOperation(command.where));
    }
    // @ts-ignore deleteCount-exists
    const { deletedCount } = result;
    return deletedCount;
  }

  watch(
    entityName: Key<M>,
    pipeline?: ChangeStreamPipeline,
    options?: ChangeStreamOptions
  ): ChangeStream {
    return this.conn.collection(entityName).watch(pipeline, options);
  }
}