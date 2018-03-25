// @flow
import type {
  RestApiExecution,
  ExecutionWrapper,
  NormalizedFunctionalGroup,
  RequestDataOf,
  ResponseDataOf,
  Session,
  TypeMap,
} from 'phenyl-interfaces'

function assertWrapExecution(fn: any, name: string, methodName: string) {
  if (typeof fn !== 'function') throw new Error(`No "wrapExecution" function found for ${name} (methodName = ${methodName})`)
}

/**
 *
 */
export class ExecutionWrapperCreator<TM: TypeMap> {
  static create(fg: NormalizedFunctionalGroup<TM>): ExecutionWrapper<TM> {
    const { users, nonUsers } = fg
    return async function executionWrapper(reqData: RequestDataOf<TM>, session: ?Session, execution: RestApiExecution<TM>) :Promise<ResponseDataOf<TM>> {
      const { method } = reqData
      switch (reqData.method) {
        case 'find':
        case 'findOne':
        case 'get':
        case 'getByIds':
        case 'pull':
        case 'insertOne':
        case 'insertMulti':
        case 'insertAndGet':
        case 'insertAndGetMulti':
        case 'updateById':
        case 'updateMulti':
        case 'updateAndGet':
        case 'updateAndFetch':
        case 'push':
        case 'delete':
        case 'login':
        case 'logout': {
          const data = reqData.payload
          const entityDefinition = nonUsers[data.entityName] || users[data.entityName]
          if (entityDefinition == null) throw new Error(`Unkown entity name "${data.entityName}".`)
          assertWrapExecution(entityDefinition.wrapExecution, data.entityName, method)
          return entityDefinition.wrapExecution(reqData, session, execution)
        }

        case 'runCustomQuery':
        case 'runCustomCommand':
          return execution(reqData, session)

        default:
          throw new Error(`Unknown method "${method}" given in RequestData.`)
      }
    }
  }
}

const EWC: Class<ExecutionWrapperCreator<*>> = ExecutionWrapperCreator
export const createExecutionWrapper = EWC.create
