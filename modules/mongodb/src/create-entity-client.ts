import { GeneralReqResEntityMap } from '@phenyl/interfaces'
import { PhenylEntityClient, PhenylEntityClientOptions } from '@phenyl/central-state'
import { PhenylMongoDbClient } from './mongodb-client'
import { MongoDbConnection } from './connection'

export function createEntityClient<M extends GeneralReqResEntityMap>(conn: MongoDbConnection, options: PhenylEntityClientOptions<M> = {}): PhenylMongoDbEntityClient<M> {
  return new PhenylMongoDbEntityClient(conn, options)
}

export class PhenylMongoDbEntityClient<M extends GeneralReqResEntityMap> extends PhenylEntityClient<M> {
  // @ts-ignore is this dbClient necessary?
  dbClient: PhenylMongoDbClient<M>

  constructor(conn: MongoDbConnection, options: PhenylEntityClientOptions<M> = {}) {
    const dbClient = new PhenylMongoDbClient(conn)
    super(dbClient, options)
  }
}
