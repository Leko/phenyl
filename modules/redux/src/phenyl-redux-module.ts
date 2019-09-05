import { update, GeneralUpdateOperation } from "sp2";
import { randomStringWithTimeStamp } from "@phenyl/utils";
import {
  AssignAction,
  CommitAction,
  RePushAction,
  CommitAndPushAction,
  ResolveErrorAction,
  ResetAction,
  OnlineAction,
  OfflineAction,
  Session,
  UnfollowAction,
  UnsetSessionAction,
  UseEntitiesAction,
  GeneralTypeMap,
  EntityRestInfoMapOf,
  LocalEntityState,
  LocalStateOf,
  ActionWithTypeMap,
  EntityNameOf,
  UserEntityNameOf,
  ReplaceActionOf,
  AuthSessionOf,
  ResponseEntityOf,
  SetSessionActionOf,
  FollowActionOf,
  FollowAllActionOf,
  IdDeleteCommandOf,
  DeleteActionOf,
  PushAndCommitActionOf,
  PushActionPayloadOf,
  PushActionOf,
  PushAndCommitActionPayloadOf,
  CommitActionPayload,
  CommitAndPushActionPayloadOf,
  PullActionPayloadOf,
  PullActionOf,
  LoginCommandOf,
  LoginActionOf,
  LogoutCommandOf,
  LogoutActionOf
} from "@phenyl/interfaces";

type Id = string;

export class PhenylReduxModule<TM extends GeneralTypeMap> {
  createInitialState(): LocalStateOf<TM> {
    return {
      entities: {} as LocalEntityState<EntityRestInfoMapOf<TM>>,
      unreachedCommits: [],
      network: {
        requests: [],
        isOnline: true
      }
    };
  }

  /**
   * Reducer.
   */
  phenylReducer<EN extends EntityNameOf<TM>, UN extends UserEntityNameOf<TM>>(
    state: LocalStateOf<TM> | undefined | null,
    action: ActionWithTypeMap<TM, EN, UN>
  ): LocalStateOf<TM> {
    if (state == null) {
      return this.createInitialState();
    }

    switch (action.type) {
      case "phenyl/replace":
        return {
          ...state,
          ...action.payload
        };

      case "phenyl/reset":
        return this.createInitialState();

      case "phenyl/assign":
        return update(state, ...action.payload) as LocalStateOf<TM>;

      default:
        return state;
    }
  }

  replace(state: LocalStateOf<TM>): ReplaceActionOf<TM> {
    return {
      type: "phenyl/replace",
      payload: state,
      tag: randomStringWithTimeStamp()
    };
  }

  useEntities<EN extends EntityNameOf<TM>>(
    entityNames: EN[]
  ): UseEntitiesAction<EN> {
    return {
      type: "phenyl/useEntities",
      payload: entityNames,
      tag: randomStringWithTimeStamp()
    };
  }

  reset(): ResetAction {
    return {
      type: "phenyl/reset",
      tag: randomStringWithTimeStamp()
    };
  }

  assign(ops: GeneralUpdateOperation[]): AssignAction {
    return {
      type: "phenyl/assign",
      payload: ops,
      tag: randomStringWithTimeStamp()
    };
  }

  setSession<UN extends UserEntityNameOf<TM>>(
    session: Session<UN, AuthSessionOf<TM, UN>>,
    user?: ResponseEntityOf<TM, UN>
  ): SetSessionActionOf<TM, UN> {
    return {
      type: "phenyl/setSession",
      payload: {
        session,
        user
      },
      tag: randomStringWithTimeStamp()
    };
  }

  static unsetSession(): UnsetSessionAction {
    return {
      type: "phenyl/unsetSession",
      tag: randomStringWithTimeStamp()
    };
  }

  follow<EN extends EntityNameOf<TM>>(
    entityName: EN,
    entity: ResponseEntityOf<TM, EN>,
    versionId: Id
  ): FollowActionOf<TM, EN> {
    return {
      type: "phenyl/follow",
      payload: {
        entityName,
        entity,
        versionId
      },
      tag: randomStringWithTimeStamp()
    };
  }

  followAll<EN extends EntityNameOf<TM>>(
    entityName: EN,
    entities: ResponseEntityOf<TM, EN>[],
    versionsById: {
      [entityId: string]: string;
    }
  ): FollowAllActionOf<TM, EN> {
    return {
      type: "phenyl/followAll",
      payload: {
        entityName,
        entities,
        versionsById
      },
      tag: randomStringWithTimeStamp()
    };
  }

  unfollow<EN extends EntityNameOf<TM>>(
    entityName: EN,
    id: string
  ): UnfollowAction<EN> {
    return {
      type: "phenyl/unfollow",
      payload: {
        entityName,
        id
      },
      tag: randomStringWithTimeStamp()
    };
  }

  delete<EN extends EntityNameOf<TM>>(
    payload: IdDeleteCommandOf<TM, EN>
  ): DeleteActionOf<TM, EN> {
    return {
      type: "phenyl/delete",
      payload,
      tag: randomStringWithTimeStamp()
    };
  }

  pushAndCommit<EN extends EntityNameOf<TM>>(
    payload: PushAndCommitActionPayloadOf<TM, EN>
  ): PushAndCommitActionOf<TM, EN> {
    return {
      type: "phenyl/pushAndCommit",
      payload,
      tag: randomStringWithTimeStamp()
    };
  }

  commit<EN extends EntityNameOf<TM>>(
    payload: CommitActionPayload<EN>
  ): CommitAction<EN> {
    return {
      type: "phenyl/commit",
      payload,
      tag: randomStringWithTimeStamp()
    };
  }

  push<EN extends EntityNameOf<TM>>(
    payload: PushActionPayloadOf<TM, EN>
  ): PushActionOf<TM, EN> {
    return {
      type: "phenyl/push",
      payload: { until: -1, ...payload },
      tag: randomStringWithTimeStamp()
    };
  }

  static repush(): RePushAction {
    return {
      type: "phenyl/repush",
      tag: randomStringWithTimeStamp()
    };
  }

  commitAndPush<EN extends EntityNameOf<TM>>(
    payload: CommitAndPushActionPayloadOf<TM, EN>
  ): CommitAndPushAction<EN> {
    return {
      type: "phenyl/commitAndPush",
      payload,
      tag: randomStringWithTimeStamp()
    };
  }

  pull<EN extends EntityNameOf<TM>>(
    payload: PullActionPayloadOf<TM, EN>
  ): PullActionOf<TM, EN> {
    return {
      type: "phenyl/pull",
      payload,
      tag: randomStringWithTimeStamp()
    };
  }

  login<UN extends UserEntityNameOf<TM>>(
    payload: LoginCommandOf<TM, UN>
  ): LoginActionOf<TM, UN> {
    return {
      type: "phenyl/login",
      payload,
      tag: randomStringWithTimeStamp()
    };
  }

  logout<UN extends UserEntityNameOf<TM>>(
    payload: LogoutCommandOf<TM, UN>
  ): LogoutActionOf<TM, UN> {
    return {
      type: "phenyl/logout",
      payload,
      tag: randomStringWithTimeStamp()
    };
  }

  static online(): OnlineAction {
    return {
      type: "phenyl/online"
    };
  }

  static offline(): OfflineAction {
    return {
      type: "phenyl/offline"
    };
  }

  static resolveError(): ResolveErrorAction {
    return {
      type: "phenyl/resolveError"
    };
  }
}
