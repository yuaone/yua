
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model Instance
 * 
 */
export type Instance = $Result.DefaultSelection<Prisma.$InstancePayload>
/**
 * Model InstanceEngine
 * 
 */
export type InstanceEngine = $Result.DefaultSelection<Prisma.$InstanceEnginePayload>
/**
 * Model InstancePolicy
 * 
 */
export type InstancePolicy = $Result.DefaultSelection<Prisma.$InstancePolicyPayload>
/**
 * Model CpuTier
 * 
 */
export type CpuTier = $Result.DefaultSelection<Prisma.$CpuTierPayload>
/**
 * Model NodeTier
 * 
 */
export type NodeTier = $Result.DefaultSelection<Prisma.$NodeTierPayload>
/**
 * Model EngineTier
 * 
 */
export type EngineTier = $Result.DefaultSelection<Prisma.$EngineTierPayload>
/**
 * Model QpuTier
 * 
 */
export type QpuTier = $Result.DefaultSelection<Prisma.$QpuTierPayload>
/**
 * Model OmegaTier
 * 
 */
export type OmegaTier = $Result.DefaultSelection<Prisma.$OmegaTierPayload>
/**
 * Model Snapshot
 * 
 */
export type Snapshot = $Result.DefaultSelection<Prisma.$SnapshotPayload>
/**
 * Model InstanceLog
 * 
 */
export type InstanceLog = $Result.DefaultSelection<Prisma.$InstanceLogPayload>
/**
 * Model BillingRecord
 * 
 */
export type BillingRecord = $Result.DefaultSelection<Prisma.$BillingRecordPayload>
/**
 * Model ExecutionGraph
 * 
 */
export type ExecutionGraph = $Result.DefaultSelection<Prisma.$ExecutionGraphPayload>
/**
 * Model snapshot_history
 * 
 */
export type snapshot_history = $Result.DefaultSelection<Prisma.$snapshot_historyPayload>
/**
 * Model TerminalSession
 * 
 */
export type TerminalSession = $Result.DefaultSelection<Prisma.$TerminalSessionPayload>

/**
 * Enums
 */
export namespace $Enums {
  export const InstanceStatus: {
  CREATED: 'CREATED',
  RUNNING: 'RUNNING',
  STOPPED: 'STOPPED',
  ERROR: 'ERROR'
};

export type InstanceStatus = (typeof InstanceStatus)[keyof typeof InstanceStatus]


export const EngineType: {
  chat: 'chat',
  emotion: 'emotion',
  memory: 'memory',
  finance: 'finance'
};

export type EngineType = (typeof EngineType)[keyof typeof EngineType]

}

export type InstanceStatus = $Enums.InstanceStatus

export const InstanceStatus: typeof $Enums.InstanceStatus

export type EngineType = $Enums.EngineType

export const EngineType: typeof $Enums.EngineType

/**
 * ##  Prisma Client ʲˢ
 * 
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Instances
 * const instances = await prisma.instance.findMany()
 * ```
 *
 * 
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  T extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  U = 'log' extends keyof T ? T['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<T['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   * 
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more Instances
   * const instances = await prisma.instance.findMany()
   * ```
   *
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<T, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): void;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

  /**
   * Add a middleware
   * @deprecated since 4.16.0. For new code, prefer client extensions instead.
   * @see https://pris.ly/d/extensions
   */
  $use(cb: Prisma.Middleware): void

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<'extends', Prisma.TypeMapCb, ExtArgs>

      /**
   * `prisma.instance`: Exposes CRUD operations for the **Instance** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Instances
    * const instances = await prisma.instance.findMany()
    * ```
    */
  get instance(): Prisma.InstanceDelegate<ExtArgs>;

  /**
   * `prisma.instanceEngine`: Exposes CRUD operations for the **InstanceEngine** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more InstanceEngines
    * const instanceEngines = await prisma.instanceEngine.findMany()
    * ```
    */
  get instanceEngine(): Prisma.InstanceEngineDelegate<ExtArgs>;

  /**
   * `prisma.instancePolicy`: Exposes CRUD operations for the **InstancePolicy** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more InstancePolicies
    * const instancePolicies = await prisma.instancePolicy.findMany()
    * ```
    */
  get instancePolicy(): Prisma.InstancePolicyDelegate<ExtArgs>;

  /**
   * `prisma.cpuTier`: Exposes CRUD operations for the **CpuTier** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more CpuTiers
    * const cpuTiers = await prisma.cpuTier.findMany()
    * ```
    */
  get cpuTier(): Prisma.CpuTierDelegate<ExtArgs>;

  /**
   * `prisma.nodeTier`: Exposes CRUD operations for the **NodeTier** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more NodeTiers
    * const nodeTiers = await prisma.nodeTier.findMany()
    * ```
    */
  get nodeTier(): Prisma.NodeTierDelegate<ExtArgs>;

  /**
   * `prisma.engineTier`: Exposes CRUD operations for the **EngineTier** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more EngineTiers
    * const engineTiers = await prisma.engineTier.findMany()
    * ```
    */
  get engineTier(): Prisma.EngineTierDelegate<ExtArgs>;

  /**
   * `prisma.qpuTier`: Exposes CRUD operations for the **QpuTier** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more QpuTiers
    * const qpuTiers = await prisma.qpuTier.findMany()
    * ```
    */
  get qpuTier(): Prisma.QpuTierDelegate<ExtArgs>;

  /**
   * `prisma.omegaTier`: Exposes CRUD operations for the **OmegaTier** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more OmegaTiers
    * const omegaTiers = await prisma.omegaTier.findMany()
    * ```
    */
  get omegaTier(): Prisma.OmegaTierDelegate<ExtArgs>;

  /**
   * `prisma.snapshot`: Exposes CRUD operations for the **Snapshot** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Snapshots
    * const snapshots = await prisma.snapshot.findMany()
    * ```
    */
  get snapshot(): Prisma.SnapshotDelegate<ExtArgs>;

  /**
   * `prisma.instanceLog`: Exposes CRUD operations for the **InstanceLog** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more InstanceLogs
    * const instanceLogs = await prisma.instanceLog.findMany()
    * ```
    */
  get instanceLog(): Prisma.InstanceLogDelegate<ExtArgs>;

  /**
   * `prisma.billingRecord`: Exposes CRUD operations for the **BillingRecord** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more BillingRecords
    * const billingRecords = await prisma.billingRecord.findMany()
    * ```
    */
  get billingRecord(): Prisma.BillingRecordDelegate<ExtArgs>;

  /**
   * `prisma.executionGraph`: Exposes CRUD operations for the **ExecutionGraph** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ExecutionGraphs
    * const executionGraphs = await prisma.executionGraph.findMany()
    * ```
    */
  get executionGraph(): Prisma.ExecutionGraphDelegate<ExtArgs>;

  /**
   * `prisma.snapshot_history`: Exposes CRUD operations for the **snapshot_history** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Snapshot_histories
    * const snapshot_histories = await prisma.snapshot_history.findMany()
    * ```
    */
  get snapshot_history(): Prisma.snapshot_historyDelegate<ExtArgs>;

  /**
   * `prisma.terminalSession`: Exposes CRUD operations for the **TerminalSession** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more TerminalSessions
    * const terminalSessions = await prisma.terminalSession.findMany()
    * ```
    */
  get terminalSession(): Prisma.TerminalSessionDelegate<ExtArgs>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError
  export import NotFoundError = runtime.NotFoundError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql

  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics 
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 5.15.0
   * Query Engine version: 12e25d8d06f6ea5a0252864dd9a03b1bb51f3022
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion 

  /**
   * Utility Types
   */

  /**
   * From https://github.com/sindresorhus/type-fest/
   * Matches a JSON object.
   * This type can be useful to enforce some input to be JSON-compatible or as a super-type to be extended from. 
   */
  export type JsonObject = {[Key in string]?: JsonValue}

  /**
   * From https://github.com/sindresorhus/type-fest/
   * Matches a JSON array.
   */
  export interface JsonArray extends Array<JsonValue> {}

  /**
   * From https://github.com/sindresorhus/type-fest/
   * Matches any valid JSON value.
   */
  export type JsonValue = string | number | boolean | JsonObject | JsonArray | null

  /**
   * Matches a JSON object.
   * Unlike `JsonObject`, this type allows undefined and read-only properties.
   */
  export type InputJsonObject = {readonly [Key in string]?: InputJsonValue | null}

  /**
   * Matches a JSON array.
   * Unlike `JsonArray`, readonly arrays are assignable to this type.
   */
  export interface InputJsonArray extends ReadonlyArray<InputJsonValue | null> {}

  /**
   * Matches any valid value that can be used as an input for operations like
   * create and update as the value of a JSON field. Unlike `JsonValue`, this
   * type allows read-only arrays and read-only object properties and disallows
   * `null` at the top level.
   *
   * `null` cannot be used as the value of a JSON field because its meaning
   * would be ambiguous. Use `Prisma.JsonNull` to store the JSON null value or
   * `Prisma.DbNull` to clear the JSON value and set the field to the database
   * NULL value instead.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-by-null-values
   */
  export type InputJsonValue = string | number | boolean | InputJsonObject | InputJsonArray | { toJSON(): unknown }

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? K : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    Instance: 'Instance',
    InstanceEngine: 'InstanceEngine',
    InstancePolicy: 'InstancePolicy',
    CpuTier: 'CpuTier',
    NodeTier: 'NodeTier',
    EngineTier: 'EngineTier',
    QpuTier: 'QpuTier',
    OmegaTier: 'OmegaTier',
    Snapshot: 'Snapshot',
    InstanceLog: 'InstanceLog',
    BillingRecord: 'BillingRecord',
    ExecutionGraph: 'ExecutionGraph',
    snapshot_history: 'snapshot_history',
    TerminalSession: 'TerminalSession'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    pg?: Datasource
  }


  interface TypeMapCb extends $Utils.Fn<{extArgs: $Extensions.InternalArgs}, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs']>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    meta: {
      modelProps: 'instance' | 'instanceEngine' | 'instancePolicy' | 'cpuTier' | 'nodeTier' | 'engineTier' | 'qpuTier' | 'omegaTier' | 'snapshot' | 'instanceLog' | 'billingRecord' | 'executionGraph' | 'snapshot_history' | 'terminalSession'
      txIsolationLevel: Prisma.TransactionIsolationLevel
    },
    model: {
      Instance: {
        payload: Prisma.$InstancePayload<ExtArgs>
        fields: Prisma.InstanceFieldRefs
        operations: {
          findUnique: {
            args: Prisma.InstanceFindUniqueArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$InstancePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.InstanceFindUniqueOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$InstancePayload>
          }
          findFirst: {
            args: Prisma.InstanceFindFirstArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$InstancePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.InstanceFindFirstOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$InstancePayload>
          }
          findMany: {
            args: Prisma.InstanceFindManyArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$InstancePayload>[]
          }
          create: {
            args: Prisma.InstanceCreateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$InstancePayload>
          }
          createMany: {
            args: Prisma.InstanceCreateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.InstanceCreateManyAndReturnArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$InstancePayload>[]
          }
          delete: {
            args: Prisma.InstanceDeleteArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$InstancePayload>
          }
          update: {
            args: Prisma.InstanceUpdateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$InstancePayload>
          }
          deleteMany: {
            args: Prisma.InstanceDeleteManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          updateMany: {
            args: Prisma.InstanceUpdateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          upsert: {
            args: Prisma.InstanceUpsertArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$InstancePayload>
          }
          aggregate: {
            args: Prisma.InstanceAggregateArgs<ExtArgs>,
            result: $Utils.Optional<AggregateInstance>
          }
          groupBy: {
            args: Prisma.InstanceGroupByArgs<ExtArgs>,
            result: $Utils.Optional<InstanceGroupByOutputType>[]
          }
          count: {
            args: Prisma.InstanceCountArgs<ExtArgs>,
            result: $Utils.Optional<InstanceCountAggregateOutputType> | number
          }
        }
      }
      InstanceEngine: {
        payload: Prisma.$InstanceEnginePayload<ExtArgs>
        fields: Prisma.InstanceEngineFieldRefs
        operations: {
          findUnique: {
            args: Prisma.InstanceEngineFindUniqueArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$InstanceEnginePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.InstanceEngineFindUniqueOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$InstanceEnginePayload>
          }
          findFirst: {
            args: Prisma.InstanceEngineFindFirstArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$InstanceEnginePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.InstanceEngineFindFirstOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$InstanceEnginePayload>
          }
          findMany: {
            args: Prisma.InstanceEngineFindManyArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$InstanceEnginePayload>[]
          }
          create: {
            args: Prisma.InstanceEngineCreateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$InstanceEnginePayload>
          }
          createMany: {
            args: Prisma.InstanceEngineCreateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.InstanceEngineCreateManyAndReturnArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$InstanceEnginePayload>[]
          }
          delete: {
            args: Prisma.InstanceEngineDeleteArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$InstanceEnginePayload>
          }
          update: {
            args: Prisma.InstanceEngineUpdateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$InstanceEnginePayload>
          }
          deleteMany: {
            args: Prisma.InstanceEngineDeleteManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          updateMany: {
            args: Prisma.InstanceEngineUpdateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          upsert: {
            args: Prisma.InstanceEngineUpsertArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$InstanceEnginePayload>
          }
          aggregate: {
            args: Prisma.InstanceEngineAggregateArgs<ExtArgs>,
            result: $Utils.Optional<AggregateInstanceEngine>
          }
          groupBy: {
            args: Prisma.InstanceEngineGroupByArgs<ExtArgs>,
            result: $Utils.Optional<InstanceEngineGroupByOutputType>[]
          }
          count: {
            args: Prisma.InstanceEngineCountArgs<ExtArgs>,
            result: $Utils.Optional<InstanceEngineCountAggregateOutputType> | number
          }
        }
      }
      InstancePolicy: {
        payload: Prisma.$InstancePolicyPayload<ExtArgs>
        fields: Prisma.InstancePolicyFieldRefs
        operations: {
          findUnique: {
            args: Prisma.InstancePolicyFindUniqueArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$InstancePolicyPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.InstancePolicyFindUniqueOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$InstancePolicyPayload>
          }
          findFirst: {
            args: Prisma.InstancePolicyFindFirstArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$InstancePolicyPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.InstancePolicyFindFirstOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$InstancePolicyPayload>
          }
          findMany: {
            args: Prisma.InstancePolicyFindManyArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$InstancePolicyPayload>[]
          }
          create: {
            args: Prisma.InstancePolicyCreateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$InstancePolicyPayload>
          }
          createMany: {
            args: Prisma.InstancePolicyCreateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.InstancePolicyCreateManyAndReturnArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$InstancePolicyPayload>[]
          }
          delete: {
            args: Prisma.InstancePolicyDeleteArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$InstancePolicyPayload>
          }
          update: {
            args: Prisma.InstancePolicyUpdateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$InstancePolicyPayload>
          }
          deleteMany: {
            args: Prisma.InstancePolicyDeleteManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          updateMany: {
            args: Prisma.InstancePolicyUpdateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          upsert: {
            args: Prisma.InstancePolicyUpsertArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$InstancePolicyPayload>
          }
          aggregate: {
            args: Prisma.InstancePolicyAggregateArgs<ExtArgs>,
            result: $Utils.Optional<AggregateInstancePolicy>
          }
          groupBy: {
            args: Prisma.InstancePolicyGroupByArgs<ExtArgs>,
            result: $Utils.Optional<InstancePolicyGroupByOutputType>[]
          }
          count: {
            args: Prisma.InstancePolicyCountArgs<ExtArgs>,
            result: $Utils.Optional<InstancePolicyCountAggregateOutputType> | number
          }
        }
      }
      CpuTier: {
        payload: Prisma.$CpuTierPayload<ExtArgs>
        fields: Prisma.CpuTierFieldRefs
        operations: {
          findUnique: {
            args: Prisma.CpuTierFindUniqueArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$CpuTierPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.CpuTierFindUniqueOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$CpuTierPayload>
          }
          findFirst: {
            args: Prisma.CpuTierFindFirstArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$CpuTierPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.CpuTierFindFirstOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$CpuTierPayload>
          }
          findMany: {
            args: Prisma.CpuTierFindManyArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$CpuTierPayload>[]
          }
          create: {
            args: Prisma.CpuTierCreateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$CpuTierPayload>
          }
          createMany: {
            args: Prisma.CpuTierCreateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.CpuTierCreateManyAndReturnArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$CpuTierPayload>[]
          }
          delete: {
            args: Prisma.CpuTierDeleteArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$CpuTierPayload>
          }
          update: {
            args: Prisma.CpuTierUpdateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$CpuTierPayload>
          }
          deleteMany: {
            args: Prisma.CpuTierDeleteManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          updateMany: {
            args: Prisma.CpuTierUpdateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          upsert: {
            args: Prisma.CpuTierUpsertArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$CpuTierPayload>
          }
          aggregate: {
            args: Prisma.CpuTierAggregateArgs<ExtArgs>,
            result: $Utils.Optional<AggregateCpuTier>
          }
          groupBy: {
            args: Prisma.CpuTierGroupByArgs<ExtArgs>,
            result: $Utils.Optional<CpuTierGroupByOutputType>[]
          }
          count: {
            args: Prisma.CpuTierCountArgs<ExtArgs>,
            result: $Utils.Optional<CpuTierCountAggregateOutputType> | number
          }
        }
      }
      NodeTier: {
        payload: Prisma.$NodeTierPayload<ExtArgs>
        fields: Prisma.NodeTierFieldRefs
        operations: {
          findUnique: {
            args: Prisma.NodeTierFindUniqueArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$NodeTierPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.NodeTierFindUniqueOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$NodeTierPayload>
          }
          findFirst: {
            args: Prisma.NodeTierFindFirstArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$NodeTierPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.NodeTierFindFirstOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$NodeTierPayload>
          }
          findMany: {
            args: Prisma.NodeTierFindManyArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$NodeTierPayload>[]
          }
          create: {
            args: Prisma.NodeTierCreateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$NodeTierPayload>
          }
          createMany: {
            args: Prisma.NodeTierCreateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.NodeTierCreateManyAndReturnArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$NodeTierPayload>[]
          }
          delete: {
            args: Prisma.NodeTierDeleteArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$NodeTierPayload>
          }
          update: {
            args: Prisma.NodeTierUpdateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$NodeTierPayload>
          }
          deleteMany: {
            args: Prisma.NodeTierDeleteManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          updateMany: {
            args: Prisma.NodeTierUpdateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          upsert: {
            args: Prisma.NodeTierUpsertArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$NodeTierPayload>
          }
          aggregate: {
            args: Prisma.NodeTierAggregateArgs<ExtArgs>,
            result: $Utils.Optional<AggregateNodeTier>
          }
          groupBy: {
            args: Prisma.NodeTierGroupByArgs<ExtArgs>,
            result: $Utils.Optional<NodeTierGroupByOutputType>[]
          }
          count: {
            args: Prisma.NodeTierCountArgs<ExtArgs>,
            result: $Utils.Optional<NodeTierCountAggregateOutputType> | number
          }
        }
      }
      EngineTier: {
        payload: Prisma.$EngineTierPayload<ExtArgs>
        fields: Prisma.EngineTierFieldRefs
        operations: {
          findUnique: {
            args: Prisma.EngineTierFindUniqueArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$EngineTierPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.EngineTierFindUniqueOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$EngineTierPayload>
          }
          findFirst: {
            args: Prisma.EngineTierFindFirstArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$EngineTierPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.EngineTierFindFirstOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$EngineTierPayload>
          }
          findMany: {
            args: Prisma.EngineTierFindManyArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$EngineTierPayload>[]
          }
          create: {
            args: Prisma.EngineTierCreateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$EngineTierPayload>
          }
          createMany: {
            args: Prisma.EngineTierCreateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.EngineTierCreateManyAndReturnArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$EngineTierPayload>[]
          }
          delete: {
            args: Prisma.EngineTierDeleteArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$EngineTierPayload>
          }
          update: {
            args: Prisma.EngineTierUpdateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$EngineTierPayload>
          }
          deleteMany: {
            args: Prisma.EngineTierDeleteManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          updateMany: {
            args: Prisma.EngineTierUpdateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          upsert: {
            args: Prisma.EngineTierUpsertArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$EngineTierPayload>
          }
          aggregate: {
            args: Prisma.EngineTierAggregateArgs<ExtArgs>,
            result: $Utils.Optional<AggregateEngineTier>
          }
          groupBy: {
            args: Prisma.EngineTierGroupByArgs<ExtArgs>,
            result: $Utils.Optional<EngineTierGroupByOutputType>[]
          }
          count: {
            args: Prisma.EngineTierCountArgs<ExtArgs>,
            result: $Utils.Optional<EngineTierCountAggregateOutputType> | number
          }
        }
      }
      QpuTier: {
        payload: Prisma.$QpuTierPayload<ExtArgs>
        fields: Prisma.QpuTierFieldRefs
        operations: {
          findUnique: {
            args: Prisma.QpuTierFindUniqueArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$QpuTierPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.QpuTierFindUniqueOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$QpuTierPayload>
          }
          findFirst: {
            args: Prisma.QpuTierFindFirstArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$QpuTierPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.QpuTierFindFirstOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$QpuTierPayload>
          }
          findMany: {
            args: Prisma.QpuTierFindManyArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$QpuTierPayload>[]
          }
          create: {
            args: Prisma.QpuTierCreateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$QpuTierPayload>
          }
          createMany: {
            args: Prisma.QpuTierCreateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.QpuTierCreateManyAndReturnArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$QpuTierPayload>[]
          }
          delete: {
            args: Prisma.QpuTierDeleteArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$QpuTierPayload>
          }
          update: {
            args: Prisma.QpuTierUpdateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$QpuTierPayload>
          }
          deleteMany: {
            args: Prisma.QpuTierDeleteManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          updateMany: {
            args: Prisma.QpuTierUpdateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          upsert: {
            args: Prisma.QpuTierUpsertArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$QpuTierPayload>
          }
          aggregate: {
            args: Prisma.QpuTierAggregateArgs<ExtArgs>,
            result: $Utils.Optional<AggregateQpuTier>
          }
          groupBy: {
            args: Prisma.QpuTierGroupByArgs<ExtArgs>,
            result: $Utils.Optional<QpuTierGroupByOutputType>[]
          }
          count: {
            args: Prisma.QpuTierCountArgs<ExtArgs>,
            result: $Utils.Optional<QpuTierCountAggregateOutputType> | number
          }
        }
      }
      OmegaTier: {
        payload: Prisma.$OmegaTierPayload<ExtArgs>
        fields: Prisma.OmegaTierFieldRefs
        operations: {
          findUnique: {
            args: Prisma.OmegaTierFindUniqueArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$OmegaTierPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.OmegaTierFindUniqueOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$OmegaTierPayload>
          }
          findFirst: {
            args: Prisma.OmegaTierFindFirstArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$OmegaTierPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.OmegaTierFindFirstOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$OmegaTierPayload>
          }
          findMany: {
            args: Prisma.OmegaTierFindManyArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$OmegaTierPayload>[]
          }
          create: {
            args: Prisma.OmegaTierCreateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$OmegaTierPayload>
          }
          createMany: {
            args: Prisma.OmegaTierCreateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.OmegaTierCreateManyAndReturnArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$OmegaTierPayload>[]
          }
          delete: {
            args: Prisma.OmegaTierDeleteArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$OmegaTierPayload>
          }
          update: {
            args: Prisma.OmegaTierUpdateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$OmegaTierPayload>
          }
          deleteMany: {
            args: Prisma.OmegaTierDeleteManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          updateMany: {
            args: Prisma.OmegaTierUpdateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          upsert: {
            args: Prisma.OmegaTierUpsertArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$OmegaTierPayload>
          }
          aggregate: {
            args: Prisma.OmegaTierAggregateArgs<ExtArgs>,
            result: $Utils.Optional<AggregateOmegaTier>
          }
          groupBy: {
            args: Prisma.OmegaTierGroupByArgs<ExtArgs>,
            result: $Utils.Optional<OmegaTierGroupByOutputType>[]
          }
          count: {
            args: Prisma.OmegaTierCountArgs<ExtArgs>,
            result: $Utils.Optional<OmegaTierCountAggregateOutputType> | number
          }
        }
      }
      Snapshot: {
        payload: Prisma.$SnapshotPayload<ExtArgs>
        fields: Prisma.SnapshotFieldRefs
        operations: {
          findUnique: {
            args: Prisma.SnapshotFindUniqueArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$SnapshotPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.SnapshotFindUniqueOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$SnapshotPayload>
          }
          findFirst: {
            args: Prisma.SnapshotFindFirstArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$SnapshotPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.SnapshotFindFirstOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$SnapshotPayload>
          }
          findMany: {
            args: Prisma.SnapshotFindManyArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$SnapshotPayload>[]
          }
          create: {
            args: Prisma.SnapshotCreateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$SnapshotPayload>
          }
          createMany: {
            args: Prisma.SnapshotCreateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.SnapshotCreateManyAndReturnArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$SnapshotPayload>[]
          }
          delete: {
            args: Prisma.SnapshotDeleteArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$SnapshotPayload>
          }
          update: {
            args: Prisma.SnapshotUpdateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$SnapshotPayload>
          }
          deleteMany: {
            args: Prisma.SnapshotDeleteManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          updateMany: {
            args: Prisma.SnapshotUpdateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          upsert: {
            args: Prisma.SnapshotUpsertArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$SnapshotPayload>
          }
          aggregate: {
            args: Prisma.SnapshotAggregateArgs<ExtArgs>,
            result: $Utils.Optional<AggregateSnapshot>
          }
          groupBy: {
            args: Prisma.SnapshotGroupByArgs<ExtArgs>,
            result: $Utils.Optional<SnapshotGroupByOutputType>[]
          }
          count: {
            args: Prisma.SnapshotCountArgs<ExtArgs>,
            result: $Utils.Optional<SnapshotCountAggregateOutputType> | number
          }
        }
      }
      InstanceLog: {
        payload: Prisma.$InstanceLogPayload<ExtArgs>
        fields: Prisma.InstanceLogFieldRefs
        operations: {
          findUnique: {
            args: Prisma.InstanceLogFindUniqueArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$InstanceLogPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.InstanceLogFindUniqueOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$InstanceLogPayload>
          }
          findFirst: {
            args: Prisma.InstanceLogFindFirstArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$InstanceLogPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.InstanceLogFindFirstOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$InstanceLogPayload>
          }
          findMany: {
            args: Prisma.InstanceLogFindManyArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$InstanceLogPayload>[]
          }
          create: {
            args: Prisma.InstanceLogCreateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$InstanceLogPayload>
          }
          createMany: {
            args: Prisma.InstanceLogCreateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.InstanceLogCreateManyAndReturnArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$InstanceLogPayload>[]
          }
          delete: {
            args: Prisma.InstanceLogDeleteArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$InstanceLogPayload>
          }
          update: {
            args: Prisma.InstanceLogUpdateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$InstanceLogPayload>
          }
          deleteMany: {
            args: Prisma.InstanceLogDeleteManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          updateMany: {
            args: Prisma.InstanceLogUpdateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          upsert: {
            args: Prisma.InstanceLogUpsertArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$InstanceLogPayload>
          }
          aggregate: {
            args: Prisma.InstanceLogAggregateArgs<ExtArgs>,
            result: $Utils.Optional<AggregateInstanceLog>
          }
          groupBy: {
            args: Prisma.InstanceLogGroupByArgs<ExtArgs>,
            result: $Utils.Optional<InstanceLogGroupByOutputType>[]
          }
          count: {
            args: Prisma.InstanceLogCountArgs<ExtArgs>,
            result: $Utils.Optional<InstanceLogCountAggregateOutputType> | number
          }
        }
      }
      BillingRecord: {
        payload: Prisma.$BillingRecordPayload<ExtArgs>
        fields: Prisma.BillingRecordFieldRefs
        operations: {
          findUnique: {
            args: Prisma.BillingRecordFindUniqueArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$BillingRecordPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.BillingRecordFindUniqueOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$BillingRecordPayload>
          }
          findFirst: {
            args: Prisma.BillingRecordFindFirstArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$BillingRecordPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.BillingRecordFindFirstOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$BillingRecordPayload>
          }
          findMany: {
            args: Prisma.BillingRecordFindManyArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$BillingRecordPayload>[]
          }
          create: {
            args: Prisma.BillingRecordCreateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$BillingRecordPayload>
          }
          createMany: {
            args: Prisma.BillingRecordCreateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.BillingRecordCreateManyAndReturnArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$BillingRecordPayload>[]
          }
          delete: {
            args: Prisma.BillingRecordDeleteArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$BillingRecordPayload>
          }
          update: {
            args: Prisma.BillingRecordUpdateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$BillingRecordPayload>
          }
          deleteMany: {
            args: Prisma.BillingRecordDeleteManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          updateMany: {
            args: Prisma.BillingRecordUpdateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          upsert: {
            args: Prisma.BillingRecordUpsertArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$BillingRecordPayload>
          }
          aggregate: {
            args: Prisma.BillingRecordAggregateArgs<ExtArgs>,
            result: $Utils.Optional<AggregateBillingRecord>
          }
          groupBy: {
            args: Prisma.BillingRecordGroupByArgs<ExtArgs>,
            result: $Utils.Optional<BillingRecordGroupByOutputType>[]
          }
          count: {
            args: Prisma.BillingRecordCountArgs<ExtArgs>,
            result: $Utils.Optional<BillingRecordCountAggregateOutputType> | number
          }
        }
      }
      ExecutionGraph: {
        payload: Prisma.$ExecutionGraphPayload<ExtArgs>
        fields: Prisma.ExecutionGraphFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ExecutionGraphFindUniqueArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$ExecutionGraphPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ExecutionGraphFindUniqueOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$ExecutionGraphPayload>
          }
          findFirst: {
            args: Prisma.ExecutionGraphFindFirstArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$ExecutionGraphPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ExecutionGraphFindFirstOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$ExecutionGraphPayload>
          }
          findMany: {
            args: Prisma.ExecutionGraphFindManyArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$ExecutionGraphPayload>[]
          }
          create: {
            args: Prisma.ExecutionGraphCreateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$ExecutionGraphPayload>
          }
          createMany: {
            args: Prisma.ExecutionGraphCreateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ExecutionGraphCreateManyAndReturnArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$ExecutionGraphPayload>[]
          }
          delete: {
            args: Prisma.ExecutionGraphDeleteArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$ExecutionGraphPayload>
          }
          update: {
            args: Prisma.ExecutionGraphUpdateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$ExecutionGraphPayload>
          }
          deleteMany: {
            args: Prisma.ExecutionGraphDeleteManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          updateMany: {
            args: Prisma.ExecutionGraphUpdateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          upsert: {
            args: Prisma.ExecutionGraphUpsertArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$ExecutionGraphPayload>
          }
          aggregate: {
            args: Prisma.ExecutionGraphAggregateArgs<ExtArgs>,
            result: $Utils.Optional<AggregateExecutionGraph>
          }
          groupBy: {
            args: Prisma.ExecutionGraphGroupByArgs<ExtArgs>,
            result: $Utils.Optional<ExecutionGraphGroupByOutputType>[]
          }
          count: {
            args: Prisma.ExecutionGraphCountArgs<ExtArgs>,
            result: $Utils.Optional<ExecutionGraphCountAggregateOutputType> | number
          }
        }
      }
      snapshot_history: {
        payload: Prisma.$snapshot_historyPayload<ExtArgs>
        fields: Prisma.snapshot_historyFieldRefs
        operations: {
          findUnique: {
            args: Prisma.snapshot_historyFindUniqueArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$snapshot_historyPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.snapshot_historyFindUniqueOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$snapshot_historyPayload>
          }
          findFirst: {
            args: Prisma.snapshot_historyFindFirstArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$snapshot_historyPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.snapshot_historyFindFirstOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$snapshot_historyPayload>
          }
          findMany: {
            args: Prisma.snapshot_historyFindManyArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$snapshot_historyPayload>[]
          }
          create: {
            args: Prisma.snapshot_historyCreateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$snapshot_historyPayload>
          }
          createMany: {
            args: Prisma.snapshot_historyCreateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.snapshot_historyCreateManyAndReturnArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$snapshot_historyPayload>[]
          }
          delete: {
            args: Prisma.snapshot_historyDeleteArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$snapshot_historyPayload>
          }
          update: {
            args: Prisma.snapshot_historyUpdateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$snapshot_historyPayload>
          }
          deleteMany: {
            args: Prisma.snapshot_historyDeleteManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          updateMany: {
            args: Prisma.snapshot_historyUpdateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          upsert: {
            args: Prisma.snapshot_historyUpsertArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$snapshot_historyPayload>
          }
          aggregate: {
            args: Prisma.Snapshot_historyAggregateArgs<ExtArgs>,
            result: $Utils.Optional<AggregateSnapshot_history>
          }
          groupBy: {
            args: Prisma.snapshot_historyGroupByArgs<ExtArgs>,
            result: $Utils.Optional<Snapshot_historyGroupByOutputType>[]
          }
          count: {
            args: Prisma.snapshot_historyCountArgs<ExtArgs>,
            result: $Utils.Optional<Snapshot_historyCountAggregateOutputType> | number
          }
        }
      }
      TerminalSession: {
        payload: Prisma.$TerminalSessionPayload<ExtArgs>
        fields: Prisma.TerminalSessionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.TerminalSessionFindUniqueArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$TerminalSessionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.TerminalSessionFindUniqueOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$TerminalSessionPayload>
          }
          findFirst: {
            args: Prisma.TerminalSessionFindFirstArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$TerminalSessionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.TerminalSessionFindFirstOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$TerminalSessionPayload>
          }
          findMany: {
            args: Prisma.TerminalSessionFindManyArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$TerminalSessionPayload>[]
          }
          create: {
            args: Prisma.TerminalSessionCreateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$TerminalSessionPayload>
          }
          createMany: {
            args: Prisma.TerminalSessionCreateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.TerminalSessionCreateManyAndReturnArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$TerminalSessionPayload>[]
          }
          delete: {
            args: Prisma.TerminalSessionDeleteArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$TerminalSessionPayload>
          }
          update: {
            args: Prisma.TerminalSessionUpdateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$TerminalSessionPayload>
          }
          deleteMany: {
            args: Prisma.TerminalSessionDeleteManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          updateMany: {
            args: Prisma.TerminalSessionUpdateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          upsert: {
            args: Prisma.TerminalSessionUpsertArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$TerminalSessionPayload>
          }
          aggregate: {
            args: Prisma.TerminalSessionAggregateArgs<ExtArgs>,
            result: $Utils.Optional<AggregateTerminalSession>
          }
          groupBy: {
            args: Prisma.TerminalSessionGroupByArgs<ExtArgs>,
            result: $Utils.Optional<TerminalSessionGroupByOutputType>[]
          }
          count: {
            args: Prisma.TerminalSessionCountArgs<ExtArgs>,
            result: $Utils.Optional<TerminalSessionCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<'define', Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Defaults to stdout
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events
     * log: [
     *   { emit: 'stdout', level: 'query' },
     *   { emit: 'stdout', level: 'info' },
     *   { emit: 'stdout', level: 'warn' }
     *   { emit: 'stdout', level: 'error' }
     * ]
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type GetLogType<T extends LogLevel | LogDefinition> = T extends LogDefinition ? T['emit'] extends 'event' ? T['level'] : never : never
  export type GetEvents<T extends any> = T extends Array<LogLevel | LogDefinition> ?
    GetLogType<T[0]> | GetLogType<T[1]> | GetLogType<T[2]> | GetLogType<T[3]>
    : never

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  /**
   * These options are being passed into the middleware as "params"
   */
  export type MiddlewareParams = {
    model?: ModelName
    action: PrismaAction
    args: any
    dataPath: string[]
    runInTransaction: boolean
  }

  /**
   * The `T` type makes sure, that the `return proceed` is not forgotten in the middleware implementation
   */
  export type Middleware<T = any> = (
    params: MiddlewareParams,
    next: (params: MiddlewareParams) => $Utils.JsPromise<T>,
  ) => $Utils.JsPromise<T>

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type InstanceCountOutputType
   */

  export type InstanceCountOutputType = {
    engines: number
    terminalSessions: number
    snapshots: number
    logs: number
    billingRecords: number
    executionGraphs: number
  }

  export type InstanceCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    engines?: boolean | InstanceCountOutputTypeCountEnginesArgs
    terminalSessions?: boolean | InstanceCountOutputTypeCountTerminalSessionsArgs
    snapshots?: boolean | InstanceCountOutputTypeCountSnapshotsArgs
    logs?: boolean | InstanceCountOutputTypeCountLogsArgs
    billingRecords?: boolean | InstanceCountOutputTypeCountBillingRecordsArgs
    executionGraphs?: boolean | InstanceCountOutputTypeCountExecutionGraphsArgs
  }

  // Custom InputTypes
  /**
   * InstanceCountOutputType without action
   */
  export type InstanceCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InstanceCountOutputType
     */
    select?: InstanceCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * InstanceCountOutputType without action
   */
  export type InstanceCountOutputTypeCountEnginesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: InstanceEngineWhereInput
  }

  /**
   * InstanceCountOutputType without action
   */
  export type InstanceCountOutputTypeCountTerminalSessionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TerminalSessionWhereInput
  }

  /**
   * InstanceCountOutputType without action
   */
  export type InstanceCountOutputTypeCountSnapshotsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SnapshotWhereInput
  }

  /**
   * InstanceCountOutputType without action
   */
  export type InstanceCountOutputTypeCountLogsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: InstanceLogWhereInput
  }

  /**
   * InstanceCountOutputType without action
   */
  export type InstanceCountOutputTypeCountBillingRecordsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: BillingRecordWhereInput
  }

  /**
   * InstanceCountOutputType without action
   */
  export type InstanceCountOutputTypeCountExecutionGraphsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ExecutionGraphWhereInput
  }


  /**
   * Count Type CpuTierCountOutputType
   */

  export type CpuTierCountOutputType = {
    instances: number
  }

  export type CpuTierCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    instances?: boolean | CpuTierCountOutputTypeCountInstancesArgs
  }

  // Custom InputTypes
  /**
   * CpuTierCountOutputType without action
   */
  export type CpuTierCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CpuTierCountOutputType
     */
    select?: CpuTierCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * CpuTierCountOutputType without action
   */
  export type CpuTierCountOutputTypeCountInstancesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: InstanceWhereInput
  }


  /**
   * Count Type NodeTierCountOutputType
   */

  export type NodeTierCountOutputType = {
    instances: number
  }

  export type NodeTierCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    instances?: boolean | NodeTierCountOutputTypeCountInstancesArgs
  }

  // Custom InputTypes
  /**
   * NodeTierCountOutputType without action
   */
  export type NodeTierCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the NodeTierCountOutputType
     */
    select?: NodeTierCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * NodeTierCountOutputType without action
   */
  export type NodeTierCountOutputTypeCountInstancesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: InstanceWhereInput
  }


  /**
   * Count Type EngineTierCountOutputType
   */

  export type EngineTierCountOutputType = {
    instances: number
  }

  export type EngineTierCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    instances?: boolean | EngineTierCountOutputTypeCountInstancesArgs
  }

  // Custom InputTypes
  /**
   * EngineTierCountOutputType without action
   */
  export type EngineTierCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EngineTierCountOutputType
     */
    select?: EngineTierCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * EngineTierCountOutputType without action
   */
  export type EngineTierCountOutputTypeCountInstancesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: InstanceWhereInput
  }


  /**
   * Count Type QpuTierCountOutputType
   */

  export type QpuTierCountOutputType = {
    instances: number
  }

  export type QpuTierCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    instances?: boolean | QpuTierCountOutputTypeCountInstancesArgs
  }

  // Custom InputTypes
  /**
   * QpuTierCountOutputType without action
   */
  export type QpuTierCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the QpuTierCountOutputType
     */
    select?: QpuTierCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * QpuTierCountOutputType without action
   */
  export type QpuTierCountOutputTypeCountInstancesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: InstanceWhereInput
  }


  /**
   * Count Type OmegaTierCountOutputType
   */

  export type OmegaTierCountOutputType = {
    instances: number
  }

  export type OmegaTierCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    instances?: boolean | OmegaTierCountOutputTypeCountInstancesArgs
  }

  // Custom InputTypes
  /**
   * OmegaTierCountOutputType without action
   */
  export type OmegaTierCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OmegaTierCountOutputType
     */
    select?: OmegaTierCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * OmegaTierCountOutputType without action
   */
  export type OmegaTierCountOutputTypeCountInstancesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: InstanceWhereInput
  }


  /**
   * Models
   */

  /**
   * Model Instance
   */

  export type AggregateInstance = {
    _count: InstanceCountAggregateOutputType | null
    _min: InstanceMinAggregateOutputType | null
    _max: InstanceMaxAggregateOutputType | null
  }

  export type InstanceMinAggregateOutputType = {
    id: string | null
    name: string | null
    ownerId: string | null
    createdAt: Date | null
    updatedAt: Date | null
    cpuTierId: string | null
    nodeTierId: string | null
    engineTierId: string | null
    qpuTierId: string | null
    omegaTierId: string | null
    status: $Enums.InstanceStatus | null
    autoscale: boolean | null
  }

  export type InstanceMaxAggregateOutputType = {
    id: string | null
    name: string | null
    ownerId: string | null
    createdAt: Date | null
    updatedAt: Date | null
    cpuTierId: string | null
    nodeTierId: string | null
    engineTierId: string | null
    qpuTierId: string | null
    omegaTierId: string | null
    status: $Enums.InstanceStatus | null
    autoscale: boolean | null
  }

  export type InstanceCountAggregateOutputType = {
    id: number
    name: number
    ownerId: number
    createdAt: number
    updatedAt: number
    cpuTierId: number
    nodeTierId: number
    engineTierId: number
    qpuTierId: number
    omegaTierId: number
    status: number
    autoscale: number
    _all: number
  }


  export type InstanceMinAggregateInputType = {
    id?: true
    name?: true
    ownerId?: true
    createdAt?: true
    updatedAt?: true
    cpuTierId?: true
    nodeTierId?: true
    engineTierId?: true
    qpuTierId?: true
    omegaTierId?: true
    status?: true
    autoscale?: true
  }

  export type InstanceMaxAggregateInputType = {
    id?: true
    name?: true
    ownerId?: true
    createdAt?: true
    updatedAt?: true
    cpuTierId?: true
    nodeTierId?: true
    engineTierId?: true
    qpuTierId?: true
    omegaTierId?: true
    status?: true
    autoscale?: true
  }

  export type InstanceCountAggregateInputType = {
    id?: true
    name?: true
    ownerId?: true
    createdAt?: true
    updatedAt?: true
    cpuTierId?: true
    nodeTierId?: true
    engineTierId?: true
    qpuTierId?: true
    omegaTierId?: true
    status?: true
    autoscale?: true
    _all?: true
  }

  export type InstanceAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Instance to aggregate.
     */
    where?: InstanceWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Instances to fetch.
     */
    orderBy?: InstanceOrderByWithRelationInput | InstanceOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: InstanceWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Instances from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Instances.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Instances
    **/
    _count?: true | InstanceCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: InstanceMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: InstanceMaxAggregateInputType
  }

  export type GetInstanceAggregateType<T extends InstanceAggregateArgs> = {
        [P in keyof T & keyof AggregateInstance]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateInstance[P]>
      : GetScalarType<T[P], AggregateInstance[P]>
  }




  export type InstanceGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: InstanceWhereInput
    orderBy?: InstanceOrderByWithAggregationInput | InstanceOrderByWithAggregationInput[]
    by: InstanceScalarFieldEnum[] | InstanceScalarFieldEnum
    having?: InstanceScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: InstanceCountAggregateInputType | true
    _min?: InstanceMinAggregateInputType
    _max?: InstanceMaxAggregateInputType
  }

  export type InstanceGroupByOutputType = {
    id: string
    name: string
    ownerId: string
    createdAt: Date
    updatedAt: Date
    cpuTierId: string
    nodeTierId: string
    engineTierId: string
    qpuTierId: string | null
    omegaTierId: string | null
    status: $Enums.InstanceStatus
    autoscale: boolean
    _count: InstanceCountAggregateOutputType | null
    _min: InstanceMinAggregateOutputType | null
    _max: InstanceMaxAggregateOutputType | null
  }

  type GetInstanceGroupByPayload<T extends InstanceGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<InstanceGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof InstanceGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], InstanceGroupByOutputType[P]>
            : GetScalarType<T[P], InstanceGroupByOutputType[P]>
        }
      >
    >


  export type InstanceSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    ownerId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    cpuTierId?: boolean
    nodeTierId?: boolean
    engineTierId?: boolean
    qpuTierId?: boolean
    omegaTierId?: boolean
    status?: boolean
    autoscale?: boolean
    cpuTier?: boolean | CpuTierDefaultArgs<ExtArgs>
    nodeTier?: boolean | NodeTierDefaultArgs<ExtArgs>
    engineTier?: boolean | EngineTierDefaultArgs<ExtArgs>
    qpuTier?: boolean | Instance$qpuTierArgs<ExtArgs>
    omegaTier?: boolean | Instance$omegaTierArgs<ExtArgs>
    engines?: boolean | Instance$enginesArgs<ExtArgs>
    policy?: boolean | Instance$policyArgs<ExtArgs>
    terminalSessions?: boolean | Instance$terminalSessionsArgs<ExtArgs>
    snapshots?: boolean | Instance$snapshotsArgs<ExtArgs>
    logs?: boolean | Instance$logsArgs<ExtArgs>
    billingRecords?: boolean | Instance$billingRecordsArgs<ExtArgs>
    executionGraphs?: boolean | Instance$executionGraphsArgs<ExtArgs>
    _count?: boolean | InstanceCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["instance"]>

  export type InstanceSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    ownerId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    cpuTierId?: boolean
    nodeTierId?: boolean
    engineTierId?: boolean
    qpuTierId?: boolean
    omegaTierId?: boolean
    status?: boolean
    autoscale?: boolean
    cpuTier?: boolean | CpuTierDefaultArgs<ExtArgs>
    nodeTier?: boolean | NodeTierDefaultArgs<ExtArgs>
    engineTier?: boolean | EngineTierDefaultArgs<ExtArgs>
    qpuTier?: boolean | Instance$qpuTierArgs<ExtArgs>
    omegaTier?: boolean | Instance$omegaTierArgs<ExtArgs>
  }, ExtArgs["result"]["instance"]>

  export type InstanceSelectScalar = {
    id?: boolean
    name?: boolean
    ownerId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    cpuTierId?: boolean
    nodeTierId?: boolean
    engineTierId?: boolean
    qpuTierId?: boolean
    omegaTierId?: boolean
    status?: boolean
    autoscale?: boolean
  }

  export type InstanceInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    cpuTier?: boolean | CpuTierDefaultArgs<ExtArgs>
    nodeTier?: boolean | NodeTierDefaultArgs<ExtArgs>
    engineTier?: boolean | EngineTierDefaultArgs<ExtArgs>
    qpuTier?: boolean | Instance$qpuTierArgs<ExtArgs>
    omegaTier?: boolean | Instance$omegaTierArgs<ExtArgs>
    engines?: boolean | Instance$enginesArgs<ExtArgs>
    policy?: boolean | Instance$policyArgs<ExtArgs>
    terminalSessions?: boolean | Instance$terminalSessionsArgs<ExtArgs>
    snapshots?: boolean | Instance$snapshotsArgs<ExtArgs>
    logs?: boolean | Instance$logsArgs<ExtArgs>
    billingRecords?: boolean | Instance$billingRecordsArgs<ExtArgs>
    executionGraphs?: boolean | Instance$executionGraphsArgs<ExtArgs>
    _count?: boolean | InstanceCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type InstanceIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    cpuTier?: boolean | CpuTierDefaultArgs<ExtArgs>
    nodeTier?: boolean | NodeTierDefaultArgs<ExtArgs>
    engineTier?: boolean | EngineTierDefaultArgs<ExtArgs>
    qpuTier?: boolean | Instance$qpuTierArgs<ExtArgs>
    omegaTier?: boolean | Instance$omegaTierArgs<ExtArgs>
  }

  export type $InstancePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Instance"
    objects: {
      cpuTier: Prisma.$CpuTierPayload<ExtArgs>
      nodeTier: Prisma.$NodeTierPayload<ExtArgs>
      engineTier: Prisma.$EngineTierPayload<ExtArgs>
      qpuTier: Prisma.$QpuTierPayload<ExtArgs> | null
      omegaTier: Prisma.$OmegaTierPayload<ExtArgs> | null
      engines: Prisma.$InstanceEnginePayload<ExtArgs>[]
      policy: Prisma.$InstancePolicyPayload<ExtArgs> | null
      terminalSessions: Prisma.$TerminalSessionPayload<ExtArgs>[]
      snapshots: Prisma.$SnapshotPayload<ExtArgs>[]
      logs: Prisma.$InstanceLogPayload<ExtArgs>[]
      billingRecords: Prisma.$BillingRecordPayload<ExtArgs>[]
      executionGraphs: Prisma.$ExecutionGraphPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      name: string
      ownerId: string
      createdAt: Date
      updatedAt: Date
      cpuTierId: string
      nodeTierId: string
      engineTierId: string
      qpuTierId: string | null
      omegaTierId: string | null
      status: $Enums.InstanceStatus
      autoscale: boolean
    }, ExtArgs["result"]["instance"]>
    composites: {}
  }

  type InstanceGetPayload<S extends boolean | null | undefined | InstanceDefaultArgs> = $Result.GetResult<Prisma.$InstancePayload, S>

  type InstanceCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<InstanceFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: InstanceCountAggregateInputType | true
    }

  export interface InstanceDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Instance'], meta: { name: 'Instance' } }
    /**
     * Find zero or one Instance that matches the filter.
     * @param {InstanceFindUniqueArgs} args - Arguments to find a Instance
     * @example
     * // Get one Instance
     * const instance = await prisma.instance.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUnique<T extends InstanceFindUniqueArgs<ExtArgs>>(
      args: SelectSubset<T, InstanceFindUniqueArgs<ExtArgs>>
    ): Prisma__InstanceClient<$Result.GetResult<Prisma.$InstancePayload<ExtArgs>, T, 'findUnique'> | null, null, ExtArgs>

    /**
     * Find one Instance that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {InstanceFindUniqueOrThrowArgs} args - Arguments to find a Instance
     * @example
     * // Get one Instance
     * const instance = await prisma.instance.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUniqueOrThrow<T extends InstanceFindUniqueOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, InstanceFindUniqueOrThrowArgs<ExtArgs>>
    ): Prisma__InstanceClient<$Result.GetResult<Prisma.$InstancePayload<ExtArgs>, T, 'findUniqueOrThrow'>, never, ExtArgs>

    /**
     * Find the first Instance that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InstanceFindFirstArgs} args - Arguments to find a Instance
     * @example
     * // Get one Instance
     * const instance = await prisma.instance.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirst<T extends InstanceFindFirstArgs<ExtArgs>>(
      args?: SelectSubset<T, InstanceFindFirstArgs<ExtArgs>>
    ): Prisma__InstanceClient<$Result.GetResult<Prisma.$InstancePayload<ExtArgs>, T, 'findFirst'> | null, null, ExtArgs>

    /**
     * Find the first Instance that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InstanceFindFirstOrThrowArgs} args - Arguments to find a Instance
     * @example
     * // Get one Instance
     * const instance = await prisma.instance.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirstOrThrow<T extends InstanceFindFirstOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, InstanceFindFirstOrThrowArgs<ExtArgs>>
    ): Prisma__InstanceClient<$Result.GetResult<Prisma.$InstancePayload<ExtArgs>, T, 'findFirstOrThrow'>, never, ExtArgs>

    /**
     * Find zero or more Instances that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InstanceFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Instances
     * const instances = await prisma.instance.findMany()
     * 
     * // Get first 10 Instances
     * const instances = await prisma.instance.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const instanceWithIdOnly = await prisma.instance.findMany({ select: { id: true } })
     * 
    **/
    findMany<T extends InstanceFindManyArgs<ExtArgs>>(
      args?: SelectSubset<T, InstanceFindManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$InstancePayload<ExtArgs>, T, 'findMany'>>

    /**
     * Create a Instance.
     * @param {InstanceCreateArgs} args - Arguments to create a Instance.
     * @example
     * // Create one Instance
     * const Instance = await prisma.instance.create({
     *   data: {
     *     // ... data to create a Instance
     *   }
     * })
     * 
    **/
    create<T extends InstanceCreateArgs<ExtArgs>>(
      args: SelectSubset<T, InstanceCreateArgs<ExtArgs>>
    ): Prisma__InstanceClient<$Result.GetResult<Prisma.$InstancePayload<ExtArgs>, T, 'create'>, never, ExtArgs>

    /**
     * Create many Instances.
     * @param {InstanceCreateManyArgs} args - Arguments to create many Instances.
     * @example
     * // Create many Instances
     * const instance = await prisma.instance.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
    **/
    createMany<T extends InstanceCreateManyArgs<ExtArgs>>(
      args?: SelectSubset<T, InstanceCreateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Instances and returns the data saved in the database.
     * @param {InstanceCreateManyAndReturnArgs} args - Arguments to create many Instances.
     * @example
     * // Create many Instances
     * const instance = await prisma.instance.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Instances and only return the `id`
     * const instanceWithIdOnly = await prisma.instance.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
    **/
    createManyAndReturn<T extends InstanceCreateManyAndReturnArgs<ExtArgs>>(
      args?: SelectSubset<T, InstanceCreateManyAndReturnArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$InstancePayload<ExtArgs>, T, 'createManyAndReturn'>>

    /**
     * Delete a Instance.
     * @param {InstanceDeleteArgs} args - Arguments to delete one Instance.
     * @example
     * // Delete one Instance
     * const Instance = await prisma.instance.delete({
     *   where: {
     *     // ... filter to delete one Instance
     *   }
     * })
     * 
    **/
    delete<T extends InstanceDeleteArgs<ExtArgs>>(
      args: SelectSubset<T, InstanceDeleteArgs<ExtArgs>>
    ): Prisma__InstanceClient<$Result.GetResult<Prisma.$InstancePayload<ExtArgs>, T, 'delete'>, never, ExtArgs>

    /**
     * Update one Instance.
     * @param {InstanceUpdateArgs} args - Arguments to update one Instance.
     * @example
     * // Update one Instance
     * const instance = await prisma.instance.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    update<T extends InstanceUpdateArgs<ExtArgs>>(
      args: SelectSubset<T, InstanceUpdateArgs<ExtArgs>>
    ): Prisma__InstanceClient<$Result.GetResult<Prisma.$InstancePayload<ExtArgs>, T, 'update'>, never, ExtArgs>

    /**
     * Delete zero or more Instances.
     * @param {InstanceDeleteManyArgs} args - Arguments to filter Instances to delete.
     * @example
     * // Delete a few Instances
     * const { count } = await prisma.instance.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
    **/
    deleteMany<T extends InstanceDeleteManyArgs<ExtArgs>>(
      args?: SelectSubset<T, InstanceDeleteManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Instances.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InstanceUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Instances
     * const instance = await prisma.instance.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    updateMany<T extends InstanceUpdateManyArgs<ExtArgs>>(
      args: SelectSubset<T, InstanceUpdateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Instance.
     * @param {InstanceUpsertArgs} args - Arguments to update or create a Instance.
     * @example
     * // Update or create a Instance
     * const instance = await prisma.instance.upsert({
     *   create: {
     *     // ... data to create a Instance
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Instance we want to update
     *   }
     * })
    **/
    upsert<T extends InstanceUpsertArgs<ExtArgs>>(
      args: SelectSubset<T, InstanceUpsertArgs<ExtArgs>>
    ): Prisma__InstanceClient<$Result.GetResult<Prisma.$InstancePayload<ExtArgs>, T, 'upsert'>, never, ExtArgs>

    /**
     * Count the number of Instances.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InstanceCountArgs} args - Arguments to filter Instances to count.
     * @example
     * // Count the number of Instances
     * const count = await prisma.instance.count({
     *   where: {
     *     // ... the filter for the Instances we want to count
     *   }
     * })
    **/
    count<T extends InstanceCountArgs>(
      args?: Subset<T, InstanceCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], InstanceCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Instance.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InstanceAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends InstanceAggregateArgs>(args: Subset<T, InstanceAggregateArgs>): Prisma.PrismaPromise<GetInstanceAggregateType<T>>

    /**
     * Group by Instance.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InstanceGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends InstanceGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: InstanceGroupByArgs['orderBy'] }
        : { orderBy?: InstanceGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, InstanceGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetInstanceGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Instance model
   */
  readonly fields: InstanceFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Instance.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__InstanceClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: 'PrismaPromise';

    cpuTier<T extends CpuTierDefaultArgs<ExtArgs> = {}>(args?: Subset<T, CpuTierDefaultArgs<ExtArgs>>): Prisma__CpuTierClient<$Result.GetResult<Prisma.$CpuTierPayload<ExtArgs>, T, 'findUniqueOrThrow'> | Null, Null, ExtArgs>;

    nodeTier<T extends NodeTierDefaultArgs<ExtArgs> = {}>(args?: Subset<T, NodeTierDefaultArgs<ExtArgs>>): Prisma__NodeTierClient<$Result.GetResult<Prisma.$NodeTierPayload<ExtArgs>, T, 'findUniqueOrThrow'> | Null, Null, ExtArgs>;

    engineTier<T extends EngineTierDefaultArgs<ExtArgs> = {}>(args?: Subset<T, EngineTierDefaultArgs<ExtArgs>>): Prisma__EngineTierClient<$Result.GetResult<Prisma.$EngineTierPayload<ExtArgs>, T, 'findUniqueOrThrow'> | Null, Null, ExtArgs>;

    qpuTier<T extends Instance$qpuTierArgs<ExtArgs> = {}>(args?: Subset<T, Instance$qpuTierArgs<ExtArgs>>): Prisma__QpuTierClient<$Result.GetResult<Prisma.$QpuTierPayload<ExtArgs>, T, 'findUniqueOrThrow'> | null, null, ExtArgs>;

    omegaTier<T extends Instance$omegaTierArgs<ExtArgs> = {}>(args?: Subset<T, Instance$omegaTierArgs<ExtArgs>>): Prisma__OmegaTierClient<$Result.GetResult<Prisma.$OmegaTierPayload<ExtArgs>, T, 'findUniqueOrThrow'> | null, null, ExtArgs>;

    engines<T extends Instance$enginesArgs<ExtArgs> = {}>(args?: Subset<T, Instance$enginesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$InstanceEnginePayload<ExtArgs>, T, 'findMany'> | Null>;

    policy<T extends Instance$policyArgs<ExtArgs> = {}>(args?: Subset<T, Instance$policyArgs<ExtArgs>>): Prisma__InstancePolicyClient<$Result.GetResult<Prisma.$InstancePolicyPayload<ExtArgs>, T, 'findUniqueOrThrow'> | null, null, ExtArgs>;

    terminalSessions<T extends Instance$terminalSessionsArgs<ExtArgs> = {}>(args?: Subset<T, Instance$terminalSessionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TerminalSessionPayload<ExtArgs>, T, 'findMany'> | Null>;

    snapshots<T extends Instance$snapshotsArgs<ExtArgs> = {}>(args?: Subset<T, Instance$snapshotsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SnapshotPayload<ExtArgs>, T, 'findMany'> | Null>;

    logs<T extends Instance$logsArgs<ExtArgs> = {}>(args?: Subset<T, Instance$logsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$InstanceLogPayload<ExtArgs>, T, 'findMany'> | Null>;

    billingRecords<T extends Instance$billingRecordsArgs<ExtArgs> = {}>(args?: Subset<T, Instance$billingRecordsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$BillingRecordPayload<ExtArgs>, T, 'findMany'> | Null>;

    executionGraphs<T extends Instance$executionGraphsArgs<ExtArgs> = {}>(args?: Subset<T, Instance$executionGraphsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ExecutionGraphPayload<ExtArgs>, T, 'findMany'> | Null>;

    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>;
  }



  /**
   * Fields of the Instance model
   */ 
  interface InstanceFieldRefs {
    readonly id: FieldRef<"Instance", 'String'>
    readonly name: FieldRef<"Instance", 'String'>
    readonly ownerId: FieldRef<"Instance", 'String'>
    readonly createdAt: FieldRef<"Instance", 'DateTime'>
    readonly updatedAt: FieldRef<"Instance", 'DateTime'>
    readonly cpuTierId: FieldRef<"Instance", 'String'>
    readonly nodeTierId: FieldRef<"Instance", 'String'>
    readonly engineTierId: FieldRef<"Instance", 'String'>
    readonly qpuTierId: FieldRef<"Instance", 'String'>
    readonly omegaTierId: FieldRef<"Instance", 'String'>
    readonly status: FieldRef<"Instance", 'InstanceStatus'>
    readonly autoscale: FieldRef<"Instance", 'Boolean'>
  }
    

  // Custom InputTypes
  /**
   * Instance findUnique
   */
  export type InstanceFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Instance
     */
    select?: InstanceSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstanceInclude<ExtArgs> | null
    /**
     * Filter, which Instance to fetch.
     */
    where: InstanceWhereUniqueInput
  }

  /**
   * Instance findUniqueOrThrow
   */
  export type InstanceFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Instance
     */
    select?: InstanceSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstanceInclude<ExtArgs> | null
    /**
     * Filter, which Instance to fetch.
     */
    where: InstanceWhereUniqueInput
  }

  /**
   * Instance findFirst
   */
  export type InstanceFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Instance
     */
    select?: InstanceSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstanceInclude<ExtArgs> | null
    /**
     * Filter, which Instance to fetch.
     */
    where?: InstanceWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Instances to fetch.
     */
    orderBy?: InstanceOrderByWithRelationInput | InstanceOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Instances.
     */
    cursor?: InstanceWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Instances from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Instances.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Instances.
     */
    distinct?: InstanceScalarFieldEnum | InstanceScalarFieldEnum[]
  }

  /**
   * Instance findFirstOrThrow
   */
  export type InstanceFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Instance
     */
    select?: InstanceSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstanceInclude<ExtArgs> | null
    /**
     * Filter, which Instance to fetch.
     */
    where?: InstanceWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Instances to fetch.
     */
    orderBy?: InstanceOrderByWithRelationInput | InstanceOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Instances.
     */
    cursor?: InstanceWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Instances from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Instances.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Instances.
     */
    distinct?: InstanceScalarFieldEnum | InstanceScalarFieldEnum[]
  }

  /**
   * Instance findMany
   */
  export type InstanceFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Instance
     */
    select?: InstanceSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstanceInclude<ExtArgs> | null
    /**
     * Filter, which Instances to fetch.
     */
    where?: InstanceWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Instances to fetch.
     */
    orderBy?: InstanceOrderByWithRelationInput | InstanceOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Instances.
     */
    cursor?: InstanceWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Instances from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Instances.
     */
    skip?: number
    distinct?: InstanceScalarFieldEnum | InstanceScalarFieldEnum[]
  }

  /**
   * Instance create
   */
  export type InstanceCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Instance
     */
    select?: InstanceSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstanceInclude<ExtArgs> | null
    /**
     * The data needed to create a Instance.
     */
    data: XOR<InstanceCreateInput, InstanceUncheckedCreateInput>
  }

  /**
   * Instance createMany
   */
  export type InstanceCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Instances.
     */
    data: InstanceCreateManyInput | InstanceCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Instance createManyAndReturn
   */
  export type InstanceCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Instance
     */
    select?: InstanceSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many Instances.
     */
    data: InstanceCreateManyInput | InstanceCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstanceIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Instance update
   */
  export type InstanceUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Instance
     */
    select?: InstanceSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstanceInclude<ExtArgs> | null
    /**
     * The data needed to update a Instance.
     */
    data: XOR<InstanceUpdateInput, InstanceUncheckedUpdateInput>
    /**
     * Choose, which Instance to update.
     */
    where: InstanceWhereUniqueInput
  }

  /**
   * Instance updateMany
   */
  export type InstanceUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Instances.
     */
    data: XOR<InstanceUpdateManyMutationInput, InstanceUncheckedUpdateManyInput>
    /**
     * Filter which Instances to update
     */
    where?: InstanceWhereInput
  }

  /**
   * Instance upsert
   */
  export type InstanceUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Instance
     */
    select?: InstanceSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstanceInclude<ExtArgs> | null
    /**
     * The filter to search for the Instance to update in case it exists.
     */
    where: InstanceWhereUniqueInput
    /**
     * In case the Instance found by the `where` argument doesn't exist, create a new Instance with this data.
     */
    create: XOR<InstanceCreateInput, InstanceUncheckedCreateInput>
    /**
     * In case the Instance was found with the provided `where` argument, update it with this data.
     */
    update: XOR<InstanceUpdateInput, InstanceUncheckedUpdateInput>
  }

  /**
   * Instance delete
   */
  export type InstanceDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Instance
     */
    select?: InstanceSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstanceInclude<ExtArgs> | null
    /**
     * Filter which Instance to delete.
     */
    where: InstanceWhereUniqueInput
  }

  /**
   * Instance deleteMany
   */
  export type InstanceDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Instances to delete
     */
    where?: InstanceWhereInput
  }

  /**
   * Instance.qpuTier
   */
  export type Instance$qpuTierArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the QpuTier
     */
    select?: QpuTierSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: QpuTierInclude<ExtArgs> | null
    where?: QpuTierWhereInput
  }

  /**
   * Instance.omegaTier
   */
  export type Instance$omegaTierArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OmegaTier
     */
    select?: OmegaTierSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OmegaTierInclude<ExtArgs> | null
    where?: OmegaTierWhereInput
  }

  /**
   * Instance.engines
   */
  export type Instance$enginesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InstanceEngine
     */
    select?: InstanceEngineSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstanceEngineInclude<ExtArgs> | null
    where?: InstanceEngineWhereInput
    orderBy?: InstanceEngineOrderByWithRelationInput | InstanceEngineOrderByWithRelationInput[]
    cursor?: InstanceEngineWhereUniqueInput
    take?: number
    skip?: number
    distinct?: InstanceEngineScalarFieldEnum | InstanceEngineScalarFieldEnum[]
  }

  /**
   * Instance.policy
   */
  export type Instance$policyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InstancePolicy
     */
    select?: InstancePolicySelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstancePolicyInclude<ExtArgs> | null
    where?: InstancePolicyWhereInput
  }

  /**
   * Instance.terminalSessions
   */
  export type Instance$terminalSessionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TerminalSession
     */
    select?: TerminalSessionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TerminalSessionInclude<ExtArgs> | null
    where?: TerminalSessionWhereInput
    orderBy?: TerminalSessionOrderByWithRelationInput | TerminalSessionOrderByWithRelationInput[]
    cursor?: TerminalSessionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TerminalSessionScalarFieldEnum | TerminalSessionScalarFieldEnum[]
  }

  /**
   * Instance.snapshots
   */
  export type Instance$snapshotsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Snapshot
     */
    select?: SnapshotSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SnapshotInclude<ExtArgs> | null
    where?: SnapshotWhereInput
    orderBy?: SnapshotOrderByWithRelationInput | SnapshotOrderByWithRelationInput[]
    cursor?: SnapshotWhereUniqueInput
    take?: number
    skip?: number
    distinct?: SnapshotScalarFieldEnum | SnapshotScalarFieldEnum[]
  }

  /**
   * Instance.logs
   */
  export type Instance$logsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InstanceLog
     */
    select?: InstanceLogSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstanceLogInclude<ExtArgs> | null
    where?: InstanceLogWhereInput
    orderBy?: InstanceLogOrderByWithRelationInput | InstanceLogOrderByWithRelationInput[]
    cursor?: InstanceLogWhereUniqueInput
    take?: number
    skip?: number
    distinct?: InstanceLogScalarFieldEnum | InstanceLogScalarFieldEnum[]
  }

  /**
   * Instance.billingRecords
   */
  export type Instance$billingRecordsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BillingRecord
     */
    select?: BillingRecordSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BillingRecordInclude<ExtArgs> | null
    where?: BillingRecordWhereInput
    orderBy?: BillingRecordOrderByWithRelationInput | BillingRecordOrderByWithRelationInput[]
    cursor?: BillingRecordWhereUniqueInput
    take?: number
    skip?: number
    distinct?: BillingRecordScalarFieldEnum | BillingRecordScalarFieldEnum[]
  }

  /**
   * Instance.executionGraphs
   */
  export type Instance$executionGraphsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExecutionGraph
     */
    select?: ExecutionGraphSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExecutionGraphInclude<ExtArgs> | null
    where?: ExecutionGraphWhereInput
    orderBy?: ExecutionGraphOrderByWithRelationInput | ExecutionGraphOrderByWithRelationInput[]
    cursor?: ExecutionGraphWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ExecutionGraphScalarFieldEnum | ExecutionGraphScalarFieldEnum[]
  }

  /**
   * Instance without action
   */
  export type InstanceDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Instance
     */
    select?: InstanceSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstanceInclude<ExtArgs> | null
  }


  /**
   * Model InstanceEngine
   */

  export type AggregateInstanceEngine = {
    _count: InstanceEngineCountAggregateOutputType | null
    _min: InstanceEngineMinAggregateOutputType | null
    _max: InstanceEngineMaxAggregateOutputType | null
  }

  export type InstanceEngineMinAggregateOutputType = {
    id: string | null
    instanceId: string | null
    engineType: $Enums.EngineType | null
    enabled: boolean | null
    defaultModel: string | null
    createdAt: Date | null
  }

  export type InstanceEngineMaxAggregateOutputType = {
    id: string | null
    instanceId: string | null
    engineType: $Enums.EngineType | null
    enabled: boolean | null
    defaultModel: string | null
    createdAt: Date | null
  }

  export type InstanceEngineCountAggregateOutputType = {
    id: number
    instanceId: number
    engineType: number
    enabled: number
    defaultModel: number
    allowedModels: number
    createdAt: number
    _all: number
  }


  export type InstanceEngineMinAggregateInputType = {
    id?: true
    instanceId?: true
    engineType?: true
    enabled?: true
    defaultModel?: true
    createdAt?: true
  }

  export type InstanceEngineMaxAggregateInputType = {
    id?: true
    instanceId?: true
    engineType?: true
    enabled?: true
    defaultModel?: true
    createdAt?: true
  }

  export type InstanceEngineCountAggregateInputType = {
    id?: true
    instanceId?: true
    engineType?: true
    enabled?: true
    defaultModel?: true
    allowedModels?: true
    createdAt?: true
    _all?: true
  }

  export type InstanceEngineAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which InstanceEngine to aggregate.
     */
    where?: InstanceEngineWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of InstanceEngines to fetch.
     */
    orderBy?: InstanceEngineOrderByWithRelationInput | InstanceEngineOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: InstanceEngineWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` InstanceEngines from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` InstanceEngines.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned InstanceEngines
    **/
    _count?: true | InstanceEngineCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: InstanceEngineMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: InstanceEngineMaxAggregateInputType
  }

  export type GetInstanceEngineAggregateType<T extends InstanceEngineAggregateArgs> = {
        [P in keyof T & keyof AggregateInstanceEngine]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateInstanceEngine[P]>
      : GetScalarType<T[P], AggregateInstanceEngine[P]>
  }




  export type InstanceEngineGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: InstanceEngineWhereInput
    orderBy?: InstanceEngineOrderByWithAggregationInput | InstanceEngineOrderByWithAggregationInput[]
    by: InstanceEngineScalarFieldEnum[] | InstanceEngineScalarFieldEnum
    having?: InstanceEngineScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: InstanceEngineCountAggregateInputType | true
    _min?: InstanceEngineMinAggregateInputType
    _max?: InstanceEngineMaxAggregateInputType
  }

  export type InstanceEngineGroupByOutputType = {
    id: string
    instanceId: string
    engineType: $Enums.EngineType
    enabled: boolean
    defaultModel: string
    allowedModels: JsonValue
    createdAt: Date
    _count: InstanceEngineCountAggregateOutputType | null
    _min: InstanceEngineMinAggregateOutputType | null
    _max: InstanceEngineMaxAggregateOutputType | null
  }

  type GetInstanceEngineGroupByPayload<T extends InstanceEngineGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<InstanceEngineGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof InstanceEngineGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], InstanceEngineGroupByOutputType[P]>
            : GetScalarType<T[P], InstanceEngineGroupByOutputType[P]>
        }
      >
    >


  export type InstanceEngineSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    instanceId?: boolean
    engineType?: boolean
    enabled?: boolean
    defaultModel?: boolean
    allowedModels?: boolean
    createdAt?: boolean
    instance?: boolean | InstanceDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["instanceEngine"]>

  export type InstanceEngineSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    instanceId?: boolean
    engineType?: boolean
    enabled?: boolean
    defaultModel?: boolean
    allowedModels?: boolean
    createdAt?: boolean
    instance?: boolean | InstanceDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["instanceEngine"]>

  export type InstanceEngineSelectScalar = {
    id?: boolean
    instanceId?: boolean
    engineType?: boolean
    enabled?: boolean
    defaultModel?: boolean
    allowedModels?: boolean
    createdAt?: boolean
  }

  export type InstanceEngineInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    instance?: boolean | InstanceDefaultArgs<ExtArgs>
  }
  export type InstanceEngineIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    instance?: boolean | InstanceDefaultArgs<ExtArgs>
  }

  export type $InstanceEnginePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "InstanceEngine"
    objects: {
      instance: Prisma.$InstancePayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      instanceId: string
      engineType: $Enums.EngineType
      enabled: boolean
      defaultModel: string
      allowedModels: Prisma.JsonValue
      createdAt: Date
    }, ExtArgs["result"]["instanceEngine"]>
    composites: {}
  }

  type InstanceEngineGetPayload<S extends boolean | null | undefined | InstanceEngineDefaultArgs> = $Result.GetResult<Prisma.$InstanceEnginePayload, S>

  type InstanceEngineCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<InstanceEngineFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: InstanceEngineCountAggregateInputType | true
    }

  export interface InstanceEngineDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['InstanceEngine'], meta: { name: 'InstanceEngine' } }
    /**
     * Find zero or one InstanceEngine that matches the filter.
     * @param {InstanceEngineFindUniqueArgs} args - Arguments to find a InstanceEngine
     * @example
     * // Get one InstanceEngine
     * const instanceEngine = await prisma.instanceEngine.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUnique<T extends InstanceEngineFindUniqueArgs<ExtArgs>>(
      args: SelectSubset<T, InstanceEngineFindUniqueArgs<ExtArgs>>
    ): Prisma__InstanceEngineClient<$Result.GetResult<Prisma.$InstanceEnginePayload<ExtArgs>, T, 'findUnique'> | null, null, ExtArgs>

    /**
     * Find one InstanceEngine that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {InstanceEngineFindUniqueOrThrowArgs} args - Arguments to find a InstanceEngine
     * @example
     * // Get one InstanceEngine
     * const instanceEngine = await prisma.instanceEngine.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUniqueOrThrow<T extends InstanceEngineFindUniqueOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, InstanceEngineFindUniqueOrThrowArgs<ExtArgs>>
    ): Prisma__InstanceEngineClient<$Result.GetResult<Prisma.$InstanceEnginePayload<ExtArgs>, T, 'findUniqueOrThrow'>, never, ExtArgs>

    /**
     * Find the first InstanceEngine that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InstanceEngineFindFirstArgs} args - Arguments to find a InstanceEngine
     * @example
     * // Get one InstanceEngine
     * const instanceEngine = await prisma.instanceEngine.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirst<T extends InstanceEngineFindFirstArgs<ExtArgs>>(
      args?: SelectSubset<T, InstanceEngineFindFirstArgs<ExtArgs>>
    ): Prisma__InstanceEngineClient<$Result.GetResult<Prisma.$InstanceEnginePayload<ExtArgs>, T, 'findFirst'> | null, null, ExtArgs>

    /**
     * Find the first InstanceEngine that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InstanceEngineFindFirstOrThrowArgs} args - Arguments to find a InstanceEngine
     * @example
     * // Get one InstanceEngine
     * const instanceEngine = await prisma.instanceEngine.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirstOrThrow<T extends InstanceEngineFindFirstOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, InstanceEngineFindFirstOrThrowArgs<ExtArgs>>
    ): Prisma__InstanceEngineClient<$Result.GetResult<Prisma.$InstanceEnginePayload<ExtArgs>, T, 'findFirstOrThrow'>, never, ExtArgs>

    /**
     * Find zero or more InstanceEngines that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InstanceEngineFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all InstanceEngines
     * const instanceEngines = await prisma.instanceEngine.findMany()
     * 
     * // Get first 10 InstanceEngines
     * const instanceEngines = await prisma.instanceEngine.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const instanceEngineWithIdOnly = await prisma.instanceEngine.findMany({ select: { id: true } })
     * 
    **/
    findMany<T extends InstanceEngineFindManyArgs<ExtArgs>>(
      args?: SelectSubset<T, InstanceEngineFindManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$InstanceEnginePayload<ExtArgs>, T, 'findMany'>>

    /**
     * Create a InstanceEngine.
     * @param {InstanceEngineCreateArgs} args - Arguments to create a InstanceEngine.
     * @example
     * // Create one InstanceEngine
     * const InstanceEngine = await prisma.instanceEngine.create({
     *   data: {
     *     // ... data to create a InstanceEngine
     *   }
     * })
     * 
    **/
    create<T extends InstanceEngineCreateArgs<ExtArgs>>(
      args: SelectSubset<T, InstanceEngineCreateArgs<ExtArgs>>
    ): Prisma__InstanceEngineClient<$Result.GetResult<Prisma.$InstanceEnginePayload<ExtArgs>, T, 'create'>, never, ExtArgs>

    /**
     * Create many InstanceEngines.
     * @param {InstanceEngineCreateManyArgs} args - Arguments to create many InstanceEngines.
     * @example
     * // Create many InstanceEngines
     * const instanceEngine = await prisma.instanceEngine.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
    **/
    createMany<T extends InstanceEngineCreateManyArgs<ExtArgs>>(
      args?: SelectSubset<T, InstanceEngineCreateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many InstanceEngines and returns the data saved in the database.
     * @param {InstanceEngineCreateManyAndReturnArgs} args - Arguments to create many InstanceEngines.
     * @example
     * // Create many InstanceEngines
     * const instanceEngine = await prisma.instanceEngine.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many InstanceEngines and only return the `id`
     * const instanceEngineWithIdOnly = await prisma.instanceEngine.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
    **/
    createManyAndReturn<T extends InstanceEngineCreateManyAndReturnArgs<ExtArgs>>(
      args?: SelectSubset<T, InstanceEngineCreateManyAndReturnArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$InstanceEnginePayload<ExtArgs>, T, 'createManyAndReturn'>>

    /**
     * Delete a InstanceEngine.
     * @param {InstanceEngineDeleteArgs} args - Arguments to delete one InstanceEngine.
     * @example
     * // Delete one InstanceEngine
     * const InstanceEngine = await prisma.instanceEngine.delete({
     *   where: {
     *     // ... filter to delete one InstanceEngine
     *   }
     * })
     * 
    **/
    delete<T extends InstanceEngineDeleteArgs<ExtArgs>>(
      args: SelectSubset<T, InstanceEngineDeleteArgs<ExtArgs>>
    ): Prisma__InstanceEngineClient<$Result.GetResult<Prisma.$InstanceEnginePayload<ExtArgs>, T, 'delete'>, never, ExtArgs>

    /**
     * Update one InstanceEngine.
     * @param {InstanceEngineUpdateArgs} args - Arguments to update one InstanceEngine.
     * @example
     * // Update one InstanceEngine
     * const instanceEngine = await prisma.instanceEngine.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    update<T extends InstanceEngineUpdateArgs<ExtArgs>>(
      args: SelectSubset<T, InstanceEngineUpdateArgs<ExtArgs>>
    ): Prisma__InstanceEngineClient<$Result.GetResult<Prisma.$InstanceEnginePayload<ExtArgs>, T, 'update'>, never, ExtArgs>

    /**
     * Delete zero or more InstanceEngines.
     * @param {InstanceEngineDeleteManyArgs} args - Arguments to filter InstanceEngines to delete.
     * @example
     * // Delete a few InstanceEngines
     * const { count } = await prisma.instanceEngine.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
    **/
    deleteMany<T extends InstanceEngineDeleteManyArgs<ExtArgs>>(
      args?: SelectSubset<T, InstanceEngineDeleteManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more InstanceEngines.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InstanceEngineUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many InstanceEngines
     * const instanceEngine = await prisma.instanceEngine.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    updateMany<T extends InstanceEngineUpdateManyArgs<ExtArgs>>(
      args: SelectSubset<T, InstanceEngineUpdateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one InstanceEngine.
     * @param {InstanceEngineUpsertArgs} args - Arguments to update or create a InstanceEngine.
     * @example
     * // Update or create a InstanceEngine
     * const instanceEngine = await prisma.instanceEngine.upsert({
     *   create: {
     *     // ... data to create a InstanceEngine
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the InstanceEngine we want to update
     *   }
     * })
    **/
    upsert<T extends InstanceEngineUpsertArgs<ExtArgs>>(
      args: SelectSubset<T, InstanceEngineUpsertArgs<ExtArgs>>
    ): Prisma__InstanceEngineClient<$Result.GetResult<Prisma.$InstanceEnginePayload<ExtArgs>, T, 'upsert'>, never, ExtArgs>

    /**
     * Count the number of InstanceEngines.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InstanceEngineCountArgs} args - Arguments to filter InstanceEngines to count.
     * @example
     * // Count the number of InstanceEngines
     * const count = await prisma.instanceEngine.count({
     *   where: {
     *     // ... the filter for the InstanceEngines we want to count
     *   }
     * })
    **/
    count<T extends InstanceEngineCountArgs>(
      args?: Subset<T, InstanceEngineCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], InstanceEngineCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a InstanceEngine.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InstanceEngineAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends InstanceEngineAggregateArgs>(args: Subset<T, InstanceEngineAggregateArgs>): Prisma.PrismaPromise<GetInstanceEngineAggregateType<T>>

    /**
     * Group by InstanceEngine.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InstanceEngineGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends InstanceEngineGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: InstanceEngineGroupByArgs['orderBy'] }
        : { orderBy?: InstanceEngineGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, InstanceEngineGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetInstanceEngineGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the InstanceEngine model
   */
  readonly fields: InstanceEngineFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for InstanceEngine.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__InstanceEngineClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: 'PrismaPromise';

    instance<T extends InstanceDefaultArgs<ExtArgs> = {}>(args?: Subset<T, InstanceDefaultArgs<ExtArgs>>): Prisma__InstanceClient<$Result.GetResult<Prisma.$InstancePayload<ExtArgs>, T, 'findUniqueOrThrow'> | Null, Null, ExtArgs>;

    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>;
  }



  /**
   * Fields of the InstanceEngine model
   */ 
  interface InstanceEngineFieldRefs {
    readonly id: FieldRef<"InstanceEngine", 'String'>
    readonly instanceId: FieldRef<"InstanceEngine", 'String'>
    readonly engineType: FieldRef<"InstanceEngine", 'EngineType'>
    readonly enabled: FieldRef<"InstanceEngine", 'Boolean'>
    readonly defaultModel: FieldRef<"InstanceEngine", 'String'>
    readonly allowedModels: FieldRef<"InstanceEngine", 'Json'>
    readonly createdAt: FieldRef<"InstanceEngine", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * InstanceEngine findUnique
   */
  export type InstanceEngineFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InstanceEngine
     */
    select?: InstanceEngineSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstanceEngineInclude<ExtArgs> | null
    /**
     * Filter, which InstanceEngine to fetch.
     */
    where: InstanceEngineWhereUniqueInput
  }

  /**
   * InstanceEngine findUniqueOrThrow
   */
  export type InstanceEngineFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InstanceEngine
     */
    select?: InstanceEngineSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstanceEngineInclude<ExtArgs> | null
    /**
     * Filter, which InstanceEngine to fetch.
     */
    where: InstanceEngineWhereUniqueInput
  }

  /**
   * InstanceEngine findFirst
   */
  export type InstanceEngineFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InstanceEngine
     */
    select?: InstanceEngineSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstanceEngineInclude<ExtArgs> | null
    /**
     * Filter, which InstanceEngine to fetch.
     */
    where?: InstanceEngineWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of InstanceEngines to fetch.
     */
    orderBy?: InstanceEngineOrderByWithRelationInput | InstanceEngineOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for InstanceEngines.
     */
    cursor?: InstanceEngineWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` InstanceEngines from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` InstanceEngines.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of InstanceEngines.
     */
    distinct?: InstanceEngineScalarFieldEnum | InstanceEngineScalarFieldEnum[]
  }

  /**
   * InstanceEngine findFirstOrThrow
   */
  export type InstanceEngineFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InstanceEngine
     */
    select?: InstanceEngineSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstanceEngineInclude<ExtArgs> | null
    /**
     * Filter, which InstanceEngine to fetch.
     */
    where?: InstanceEngineWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of InstanceEngines to fetch.
     */
    orderBy?: InstanceEngineOrderByWithRelationInput | InstanceEngineOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for InstanceEngines.
     */
    cursor?: InstanceEngineWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` InstanceEngines from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` InstanceEngines.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of InstanceEngines.
     */
    distinct?: InstanceEngineScalarFieldEnum | InstanceEngineScalarFieldEnum[]
  }

  /**
   * InstanceEngine findMany
   */
  export type InstanceEngineFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InstanceEngine
     */
    select?: InstanceEngineSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstanceEngineInclude<ExtArgs> | null
    /**
     * Filter, which InstanceEngines to fetch.
     */
    where?: InstanceEngineWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of InstanceEngines to fetch.
     */
    orderBy?: InstanceEngineOrderByWithRelationInput | InstanceEngineOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing InstanceEngines.
     */
    cursor?: InstanceEngineWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` InstanceEngines from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` InstanceEngines.
     */
    skip?: number
    distinct?: InstanceEngineScalarFieldEnum | InstanceEngineScalarFieldEnum[]
  }

  /**
   * InstanceEngine create
   */
  export type InstanceEngineCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InstanceEngine
     */
    select?: InstanceEngineSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstanceEngineInclude<ExtArgs> | null
    /**
     * The data needed to create a InstanceEngine.
     */
    data: XOR<InstanceEngineCreateInput, InstanceEngineUncheckedCreateInput>
  }

  /**
   * InstanceEngine createMany
   */
  export type InstanceEngineCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many InstanceEngines.
     */
    data: InstanceEngineCreateManyInput | InstanceEngineCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * InstanceEngine createManyAndReturn
   */
  export type InstanceEngineCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InstanceEngine
     */
    select?: InstanceEngineSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many InstanceEngines.
     */
    data: InstanceEngineCreateManyInput | InstanceEngineCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstanceEngineIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * InstanceEngine update
   */
  export type InstanceEngineUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InstanceEngine
     */
    select?: InstanceEngineSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstanceEngineInclude<ExtArgs> | null
    /**
     * The data needed to update a InstanceEngine.
     */
    data: XOR<InstanceEngineUpdateInput, InstanceEngineUncheckedUpdateInput>
    /**
     * Choose, which InstanceEngine to update.
     */
    where: InstanceEngineWhereUniqueInput
  }

  /**
   * InstanceEngine updateMany
   */
  export type InstanceEngineUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update InstanceEngines.
     */
    data: XOR<InstanceEngineUpdateManyMutationInput, InstanceEngineUncheckedUpdateManyInput>
    /**
     * Filter which InstanceEngines to update
     */
    where?: InstanceEngineWhereInput
  }

  /**
   * InstanceEngine upsert
   */
  export type InstanceEngineUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InstanceEngine
     */
    select?: InstanceEngineSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstanceEngineInclude<ExtArgs> | null
    /**
     * The filter to search for the InstanceEngine to update in case it exists.
     */
    where: InstanceEngineWhereUniqueInput
    /**
     * In case the InstanceEngine found by the `where` argument doesn't exist, create a new InstanceEngine with this data.
     */
    create: XOR<InstanceEngineCreateInput, InstanceEngineUncheckedCreateInput>
    /**
     * In case the InstanceEngine was found with the provided `where` argument, update it with this data.
     */
    update: XOR<InstanceEngineUpdateInput, InstanceEngineUncheckedUpdateInput>
  }

  /**
   * InstanceEngine delete
   */
  export type InstanceEngineDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InstanceEngine
     */
    select?: InstanceEngineSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstanceEngineInclude<ExtArgs> | null
    /**
     * Filter which InstanceEngine to delete.
     */
    where: InstanceEngineWhereUniqueInput
  }

  /**
   * InstanceEngine deleteMany
   */
  export type InstanceEngineDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which InstanceEngines to delete
     */
    where?: InstanceEngineWhereInput
  }

  /**
   * InstanceEngine without action
   */
  export type InstanceEngineDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InstanceEngine
     */
    select?: InstanceEngineSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstanceEngineInclude<ExtArgs> | null
  }


  /**
   * Model InstancePolicy
   */

  export type AggregateInstancePolicy = {
    _count: InstancePolicyCountAggregateOutputType | null
    _avg: InstancePolicyAvgAggregateOutputType | null
    _sum: InstancePolicySumAggregateOutputType | null
    _min: InstancePolicyMinAggregateOutputType | null
    _max: InstancePolicyMaxAggregateOutputType | null
  }

  export type InstancePolicyAvgAggregateOutputType = {
    maxTokensPerDay: number | null
    maxRequestsPerDay: number | null
  }

  export type InstancePolicySumAggregateOutputType = {
    maxTokensPerDay: number | null
    maxRequestsPerDay: number | null
  }

  export type InstancePolicyMinAggregateOutputType = {
    id: string | null
    instanceId: string | null
    allowChat: boolean | null
    allowEmotion: boolean | null
    allowMemory: boolean | null
    allowFinance: boolean | null
    allowTerminal: boolean | null
    allowSSH: boolean | null
    maxTokensPerDay: number | null
    maxRequestsPerDay: number | null
    regionLock: string | null
    auditRequired: boolean | null
    piiStrictMode: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type InstancePolicyMaxAggregateOutputType = {
    id: string | null
    instanceId: string | null
    allowChat: boolean | null
    allowEmotion: boolean | null
    allowMemory: boolean | null
    allowFinance: boolean | null
    allowTerminal: boolean | null
    allowSSH: boolean | null
    maxTokensPerDay: number | null
    maxRequestsPerDay: number | null
    regionLock: string | null
    auditRequired: boolean | null
    piiStrictMode: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type InstancePolicyCountAggregateOutputType = {
    id: number
    instanceId: number
    allowChat: number
    allowEmotion: number
    allowMemory: number
    allowFinance: number
    allowTerminal: number
    allowSSH: number
    maxTokensPerDay: number
    maxRequestsPerDay: number
    ipWhitelist: number
    regionLock: number
    auditRequired: number
    piiStrictMode: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type InstancePolicyAvgAggregateInputType = {
    maxTokensPerDay?: true
    maxRequestsPerDay?: true
  }

  export type InstancePolicySumAggregateInputType = {
    maxTokensPerDay?: true
    maxRequestsPerDay?: true
  }

  export type InstancePolicyMinAggregateInputType = {
    id?: true
    instanceId?: true
    allowChat?: true
    allowEmotion?: true
    allowMemory?: true
    allowFinance?: true
    allowTerminal?: true
    allowSSH?: true
    maxTokensPerDay?: true
    maxRequestsPerDay?: true
    regionLock?: true
    auditRequired?: true
    piiStrictMode?: true
    createdAt?: true
    updatedAt?: true
  }

  export type InstancePolicyMaxAggregateInputType = {
    id?: true
    instanceId?: true
    allowChat?: true
    allowEmotion?: true
    allowMemory?: true
    allowFinance?: true
    allowTerminal?: true
    allowSSH?: true
    maxTokensPerDay?: true
    maxRequestsPerDay?: true
    regionLock?: true
    auditRequired?: true
    piiStrictMode?: true
    createdAt?: true
    updatedAt?: true
  }

  export type InstancePolicyCountAggregateInputType = {
    id?: true
    instanceId?: true
    allowChat?: true
    allowEmotion?: true
    allowMemory?: true
    allowFinance?: true
    allowTerminal?: true
    allowSSH?: true
    maxTokensPerDay?: true
    maxRequestsPerDay?: true
    ipWhitelist?: true
    regionLock?: true
    auditRequired?: true
    piiStrictMode?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type InstancePolicyAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which InstancePolicy to aggregate.
     */
    where?: InstancePolicyWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of InstancePolicies to fetch.
     */
    orderBy?: InstancePolicyOrderByWithRelationInput | InstancePolicyOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: InstancePolicyWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` InstancePolicies from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` InstancePolicies.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned InstancePolicies
    **/
    _count?: true | InstancePolicyCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: InstancePolicyAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: InstancePolicySumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: InstancePolicyMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: InstancePolicyMaxAggregateInputType
  }

  export type GetInstancePolicyAggregateType<T extends InstancePolicyAggregateArgs> = {
        [P in keyof T & keyof AggregateInstancePolicy]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateInstancePolicy[P]>
      : GetScalarType<T[P], AggregateInstancePolicy[P]>
  }




  export type InstancePolicyGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: InstancePolicyWhereInput
    orderBy?: InstancePolicyOrderByWithAggregationInput | InstancePolicyOrderByWithAggregationInput[]
    by: InstancePolicyScalarFieldEnum[] | InstancePolicyScalarFieldEnum
    having?: InstancePolicyScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: InstancePolicyCountAggregateInputType | true
    _avg?: InstancePolicyAvgAggregateInputType
    _sum?: InstancePolicySumAggregateInputType
    _min?: InstancePolicyMinAggregateInputType
    _max?: InstancePolicyMaxAggregateInputType
  }

  export type InstancePolicyGroupByOutputType = {
    id: string
    instanceId: string
    allowChat: boolean
    allowEmotion: boolean
    allowMemory: boolean
    allowFinance: boolean
    allowTerminal: boolean
    allowSSH: boolean
    maxTokensPerDay: number | null
    maxRequestsPerDay: number | null
    ipWhitelist: JsonValue | null
    regionLock: string | null
    auditRequired: boolean
    piiStrictMode: boolean
    createdAt: Date
    updatedAt: Date
    _count: InstancePolicyCountAggregateOutputType | null
    _avg: InstancePolicyAvgAggregateOutputType | null
    _sum: InstancePolicySumAggregateOutputType | null
    _min: InstancePolicyMinAggregateOutputType | null
    _max: InstancePolicyMaxAggregateOutputType | null
  }

  type GetInstancePolicyGroupByPayload<T extends InstancePolicyGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<InstancePolicyGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof InstancePolicyGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], InstancePolicyGroupByOutputType[P]>
            : GetScalarType<T[P], InstancePolicyGroupByOutputType[P]>
        }
      >
    >


  export type InstancePolicySelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    instanceId?: boolean
    allowChat?: boolean
    allowEmotion?: boolean
    allowMemory?: boolean
    allowFinance?: boolean
    allowTerminal?: boolean
    allowSSH?: boolean
    maxTokensPerDay?: boolean
    maxRequestsPerDay?: boolean
    ipWhitelist?: boolean
    regionLock?: boolean
    auditRequired?: boolean
    piiStrictMode?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    instance?: boolean | InstanceDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["instancePolicy"]>

  export type InstancePolicySelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    instanceId?: boolean
    allowChat?: boolean
    allowEmotion?: boolean
    allowMemory?: boolean
    allowFinance?: boolean
    allowTerminal?: boolean
    allowSSH?: boolean
    maxTokensPerDay?: boolean
    maxRequestsPerDay?: boolean
    ipWhitelist?: boolean
    regionLock?: boolean
    auditRequired?: boolean
    piiStrictMode?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    instance?: boolean | InstanceDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["instancePolicy"]>

  export type InstancePolicySelectScalar = {
    id?: boolean
    instanceId?: boolean
    allowChat?: boolean
    allowEmotion?: boolean
    allowMemory?: boolean
    allowFinance?: boolean
    allowTerminal?: boolean
    allowSSH?: boolean
    maxTokensPerDay?: boolean
    maxRequestsPerDay?: boolean
    ipWhitelist?: boolean
    regionLock?: boolean
    auditRequired?: boolean
    piiStrictMode?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type InstancePolicyInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    instance?: boolean | InstanceDefaultArgs<ExtArgs>
  }
  export type InstancePolicyIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    instance?: boolean | InstanceDefaultArgs<ExtArgs>
  }

  export type $InstancePolicyPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "InstancePolicy"
    objects: {
      instance: Prisma.$InstancePayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      instanceId: string
      allowChat: boolean
      allowEmotion: boolean
      allowMemory: boolean
      allowFinance: boolean
      allowTerminal: boolean
      allowSSH: boolean
      maxTokensPerDay: number | null
      maxRequestsPerDay: number | null
      ipWhitelist: Prisma.JsonValue | null
      regionLock: string | null
      auditRequired: boolean
      piiStrictMode: boolean
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["instancePolicy"]>
    composites: {}
  }

  type InstancePolicyGetPayload<S extends boolean | null | undefined | InstancePolicyDefaultArgs> = $Result.GetResult<Prisma.$InstancePolicyPayload, S>

  type InstancePolicyCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<InstancePolicyFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: InstancePolicyCountAggregateInputType | true
    }

  export interface InstancePolicyDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['InstancePolicy'], meta: { name: 'InstancePolicy' } }
    /**
     * Find zero or one InstancePolicy that matches the filter.
     * @param {InstancePolicyFindUniqueArgs} args - Arguments to find a InstancePolicy
     * @example
     * // Get one InstancePolicy
     * const instancePolicy = await prisma.instancePolicy.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUnique<T extends InstancePolicyFindUniqueArgs<ExtArgs>>(
      args: SelectSubset<T, InstancePolicyFindUniqueArgs<ExtArgs>>
    ): Prisma__InstancePolicyClient<$Result.GetResult<Prisma.$InstancePolicyPayload<ExtArgs>, T, 'findUnique'> | null, null, ExtArgs>

    /**
     * Find one InstancePolicy that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {InstancePolicyFindUniqueOrThrowArgs} args - Arguments to find a InstancePolicy
     * @example
     * // Get one InstancePolicy
     * const instancePolicy = await prisma.instancePolicy.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUniqueOrThrow<T extends InstancePolicyFindUniqueOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, InstancePolicyFindUniqueOrThrowArgs<ExtArgs>>
    ): Prisma__InstancePolicyClient<$Result.GetResult<Prisma.$InstancePolicyPayload<ExtArgs>, T, 'findUniqueOrThrow'>, never, ExtArgs>

    /**
     * Find the first InstancePolicy that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InstancePolicyFindFirstArgs} args - Arguments to find a InstancePolicy
     * @example
     * // Get one InstancePolicy
     * const instancePolicy = await prisma.instancePolicy.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirst<T extends InstancePolicyFindFirstArgs<ExtArgs>>(
      args?: SelectSubset<T, InstancePolicyFindFirstArgs<ExtArgs>>
    ): Prisma__InstancePolicyClient<$Result.GetResult<Prisma.$InstancePolicyPayload<ExtArgs>, T, 'findFirst'> | null, null, ExtArgs>

    /**
     * Find the first InstancePolicy that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InstancePolicyFindFirstOrThrowArgs} args - Arguments to find a InstancePolicy
     * @example
     * // Get one InstancePolicy
     * const instancePolicy = await prisma.instancePolicy.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirstOrThrow<T extends InstancePolicyFindFirstOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, InstancePolicyFindFirstOrThrowArgs<ExtArgs>>
    ): Prisma__InstancePolicyClient<$Result.GetResult<Prisma.$InstancePolicyPayload<ExtArgs>, T, 'findFirstOrThrow'>, never, ExtArgs>

    /**
     * Find zero or more InstancePolicies that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InstancePolicyFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all InstancePolicies
     * const instancePolicies = await prisma.instancePolicy.findMany()
     * 
     * // Get first 10 InstancePolicies
     * const instancePolicies = await prisma.instancePolicy.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const instancePolicyWithIdOnly = await prisma.instancePolicy.findMany({ select: { id: true } })
     * 
    **/
    findMany<T extends InstancePolicyFindManyArgs<ExtArgs>>(
      args?: SelectSubset<T, InstancePolicyFindManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$InstancePolicyPayload<ExtArgs>, T, 'findMany'>>

    /**
     * Create a InstancePolicy.
     * @param {InstancePolicyCreateArgs} args - Arguments to create a InstancePolicy.
     * @example
     * // Create one InstancePolicy
     * const InstancePolicy = await prisma.instancePolicy.create({
     *   data: {
     *     // ... data to create a InstancePolicy
     *   }
     * })
     * 
    **/
    create<T extends InstancePolicyCreateArgs<ExtArgs>>(
      args: SelectSubset<T, InstancePolicyCreateArgs<ExtArgs>>
    ): Prisma__InstancePolicyClient<$Result.GetResult<Prisma.$InstancePolicyPayload<ExtArgs>, T, 'create'>, never, ExtArgs>

    /**
     * Create many InstancePolicies.
     * @param {InstancePolicyCreateManyArgs} args - Arguments to create many InstancePolicies.
     * @example
     * // Create many InstancePolicies
     * const instancePolicy = await prisma.instancePolicy.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
    **/
    createMany<T extends InstancePolicyCreateManyArgs<ExtArgs>>(
      args?: SelectSubset<T, InstancePolicyCreateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many InstancePolicies and returns the data saved in the database.
     * @param {InstancePolicyCreateManyAndReturnArgs} args - Arguments to create many InstancePolicies.
     * @example
     * // Create many InstancePolicies
     * const instancePolicy = await prisma.instancePolicy.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many InstancePolicies and only return the `id`
     * const instancePolicyWithIdOnly = await prisma.instancePolicy.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
    **/
    createManyAndReturn<T extends InstancePolicyCreateManyAndReturnArgs<ExtArgs>>(
      args?: SelectSubset<T, InstancePolicyCreateManyAndReturnArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$InstancePolicyPayload<ExtArgs>, T, 'createManyAndReturn'>>

    /**
     * Delete a InstancePolicy.
     * @param {InstancePolicyDeleteArgs} args - Arguments to delete one InstancePolicy.
     * @example
     * // Delete one InstancePolicy
     * const InstancePolicy = await prisma.instancePolicy.delete({
     *   where: {
     *     // ... filter to delete one InstancePolicy
     *   }
     * })
     * 
    **/
    delete<T extends InstancePolicyDeleteArgs<ExtArgs>>(
      args: SelectSubset<T, InstancePolicyDeleteArgs<ExtArgs>>
    ): Prisma__InstancePolicyClient<$Result.GetResult<Prisma.$InstancePolicyPayload<ExtArgs>, T, 'delete'>, never, ExtArgs>

    /**
     * Update one InstancePolicy.
     * @param {InstancePolicyUpdateArgs} args - Arguments to update one InstancePolicy.
     * @example
     * // Update one InstancePolicy
     * const instancePolicy = await prisma.instancePolicy.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    update<T extends InstancePolicyUpdateArgs<ExtArgs>>(
      args: SelectSubset<T, InstancePolicyUpdateArgs<ExtArgs>>
    ): Prisma__InstancePolicyClient<$Result.GetResult<Prisma.$InstancePolicyPayload<ExtArgs>, T, 'update'>, never, ExtArgs>

    /**
     * Delete zero or more InstancePolicies.
     * @param {InstancePolicyDeleteManyArgs} args - Arguments to filter InstancePolicies to delete.
     * @example
     * // Delete a few InstancePolicies
     * const { count } = await prisma.instancePolicy.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
    **/
    deleteMany<T extends InstancePolicyDeleteManyArgs<ExtArgs>>(
      args?: SelectSubset<T, InstancePolicyDeleteManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more InstancePolicies.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InstancePolicyUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many InstancePolicies
     * const instancePolicy = await prisma.instancePolicy.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    updateMany<T extends InstancePolicyUpdateManyArgs<ExtArgs>>(
      args: SelectSubset<T, InstancePolicyUpdateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one InstancePolicy.
     * @param {InstancePolicyUpsertArgs} args - Arguments to update or create a InstancePolicy.
     * @example
     * // Update or create a InstancePolicy
     * const instancePolicy = await prisma.instancePolicy.upsert({
     *   create: {
     *     // ... data to create a InstancePolicy
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the InstancePolicy we want to update
     *   }
     * })
    **/
    upsert<T extends InstancePolicyUpsertArgs<ExtArgs>>(
      args: SelectSubset<T, InstancePolicyUpsertArgs<ExtArgs>>
    ): Prisma__InstancePolicyClient<$Result.GetResult<Prisma.$InstancePolicyPayload<ExtArgs>, T, 'upsert'>, never, ExtArgs>

    /**
     * Count the number of InstancePolicies.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InstancePolicyCountArgs} args - Arguments to filter InstancePolicies to count.
     * @example
     * // Count the number of InstancePolicies
     * const count = await prisma.instancePolicy.count({
     *   where: {
     *     // ... the filter for the InstancePolicies we want to count
     *   }
     * })
    **/
    count<T extends InstancePolicyCountArgs>(
      args?: Subset<T, InstancePolicyCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], InstancePolicyCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a InstancePolicy.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InstancePolicyAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends InstancePolicyAggregateArgs>(args: Subset<T, InstancePolicyAggregateArgs>): Prisma.PrismaPromise<GetInstancePolicyAggregateType<T>>

    /**
     * Group by InstancePolicy.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InstancePolicyGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends InstancePolicyGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: InstancePolicyGroupByArgs['orderBy'] }
        : { orderBy?: InstancePolicyGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, InstancePolicyGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetInstancePolicyGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the InstancePolicy model
   */
  readonly fields: InstancePolicyFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for InstancePolicy.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__InstancePolicyClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: 'PrismaPromise';

    instance<T extends InstanceDefaultArgs<ExtArgs> = {}>(args?: Subset<T, InstanceDefaultArgs<ExtArgs>>): Prisma__InstanceClient<$Result.GetResult<Prisma.$InstancePayload<ExtArgs>, T, 'findUniqueOrThrow'> | Null, Null, ExtArgs>;

    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>;
  }



  /**
   * Fields of the InstancePolicy model
   */ 
  interface InstancePolicyFieldRefs {
    readonly id: FieldRef<"InstancePolicy", 'String'>
    readonly instanceId: FieldRef<"InstancePolicy", 'String'>
    readonly allowChat: FieldRef<"InstancePolicy", 'Boolean'>
    readonly allowEmotion: FieldRef<"InstancePolicy", 'Boolean'>
    readonly allowMemory: FieldRef<"InstancePolicy", 'Boolean'>
    readonly allowFinance: FieldRef<"InstancePolicy", 'Boolean'>
    readonly allowTerminal: FieldRef<"InstancePolicy", 'Boolean'>
    readonly allowSSH: FieldRef<"InstancePolicy", 'Boolean'>
    readonly maxTokensPerDay: FieldRef<"InstancePolicy", 'Int'>
    readonly maxRequestsPerDay: FieldRef<"InstancePolicy", 'Int'>
    readonly ipWhitelist: FieldRef<"InstancePolicy", 'Json'>
    readonly regionLock: FieldRef<"InstancePolicy", 'String'>
    readonly auditRequired: FieldRef<"InstancePolicy", 'Boolean'>
    readonly piiStrictMode: FieldRef<"InstancePolicy", 'Boolean'>
    readonly createdAt: FieldRef<"InstancePolicy", 'DateTime'>
    readonly updatedAt: FieldRef<"InstancePolicy", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * InstancePolicy findUnique
   */
  export type InstancePolicyFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InstancePolicy
     */
    select?: InstancePolicySelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstancePolicyInclude<ExtArgs> | null
    /**
     * Filter, which InstancePolicy to fetch.
     */
    where: InstancePolicyWhereUniqueInput
  }

  /**
   * InstancePolicy findUniqueOrThrow
   */
  export type InstancePolicyFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InstancePolicy
     */
    select?: InstancePolicySelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstancePolicyInclude<ExtArgs> | null
    /**
     * Filter, which InstancePolicy to fetch.
     */
    where: InstancePolicyWhereUniqueInput
  }

  /**
   * InstancePolicy findFirst
   */
  export type InstancePolicyFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InstancePolicy
     */
    select?: InstancePolicySelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstancePolicyInclude<ExtArgs> | null
    /**
     * Filter, which InstancePolicy to fetch.
     */
    where?: InstancePolicyWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of InstancePolicies to fetch.
     */
    orderBy?: InstancePolicyOrderByWithRelationInput | InstancePolicyOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for InstancePolicies.
     */
    cursor?: InstancePolicyWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` InstancePolicies from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` InstancePolicies.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of InstancePolicies.
     */
    distinct?: InstancePolicyScalarFieldEnum | InstancePolicyScalarFieldEnum[]
  }

  /**
   * InstancePolicy findFirstOrThrow
   */
  export type InstancePolicyFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InstancePolicy
     */
    select?: InstancePolicySelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstancePolicyInclude<ExtArgs> | null
    /**
     * Filter, which InstancePolicy to fetch.
     */
    where?: InstancePolicyWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of InstancePolicies to fetch.
     */
    orderBy?: InstancePolicyOrderByWithRelationInput | InstancePolicyOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for InstancePolicies.
     */
    cursor?: InstancePolicyWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` InstancePolicies from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` InstancePolicies.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of InstancePolicies.
     */
    distinct?: InstancePolicyScalarFieldEnum | InstancePolicyScalarFieldEnum[]
  }

  /**
   * InstancePolicy findMany
   */
  export type InstancePolicyFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InstancePolicy
     */
    select?: InstancePolicySelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstancePolicyInclude<ExtArgs> | null
    /**
     * Filter, which InstancePolicies to fetch.
     */
    where?: InstancePolicyWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of InstancePolicies to fetch.
     */
    orderBy?: InstancePolicyOrderByWithRelationInput | InstancePolicyOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing InstancePolicies.
     */
    cursor?: InstancePolicyWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` InstancePolicies from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` InstancePolicies.
     */
    skip?: number
    distinct?: InstancePolicyScalarFieldEnum | InstancePolicyScalarFieldEnum[]
  }

  /**
   * InstancePolicy create
   */
  export type InstancePolicyCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InstancePolicy
     */
    select?: InstancePolicySelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstancePolicyInclude<ExtArgs> | null
    /**
     * The data needed to create a InstancePolicy.
     */
    data: XOR<InstancePolicyCreateInput, InstancePolicyUncheckedCreateInput>
  }

  /**
   * InstancePolicy createMany
   */
  export type InstancePolicyCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many InstancePolicies.
     */
    data: InstancePolicyCreateManyInput | InstancePolicyCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * InstancePolicy createManyAndReturn
   */
  export type InstancePolicyCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InstancePolicy
     */
    select?: InstancePolicySelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many InstancePolicies.
     */
    data: InstancePolicyCreateManyInput | InstancePolicyCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstancePolicyIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * InstancePolicy update
   */
  export type InstancePolicyUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InstancePolicy
     */
    select?: InstancePolicySelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstancePolicyInclude<ExtArgs> | null
    /**
     * The data needed to update a InstancePolicy.
     */
    data: XOR<InstancePolicyUpdateInput, InstancePolicyUncheckedUpdateInput>
    /**
     * Choose, which InstancePolicy to update.
     */
    where: InstancePolicyWhereUniqueInput
  }

  /**
   * InstancePolicy updateMany
   */
  export type InstancePolicyUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update InstancePolicies.
     */
    data: XOR<InstancePolicyUpdateManyMutationInput, InstancePolicyUncheckedUpdateManyInput>
    /**
     * Filter which InstancePolicies to update
     */
    where?: InstancePolicyWhereInput
  }

  /**
   * InstancePolicy upsert
   */
  export type InstancePolicyUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InstancePolicy
     */
    select?: InstancePolicySelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstancePolicyInclude<ExtArgs> | null
    /**
     * The filter to search for the InstancePolicy to update in case it exists.
     */
    where: InstancePolicyWhereUniqueInput
    /**
     * In case the InstancePolicy found by the `where` argument doesn't exist, create a new InstancePolicy with this data.
     */
    create: XOR<InstancePolicyCreateInput, InstancePolicyUncheckedCreateInput>
    /**
     * In case the InstancePolicy was found with the provided `where` argument, update it with this data.
     */
    update: XOR<InstancePolicyUpdateInput, InstancePolicyUncheckedUpdateInput>
  }

  /**
   * InstancePolicy delete
   */
  export type InstancePolicyDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InstancePolicy
     */
    select?: InstancePolicySelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstancePolicyInclude<ExtArgs> | null
    /**
     * Filter which InstancePolicy to delete.
     */
    where: InstancePolicyWhereUniqueInput
  }

  /**
   * InstancePolicy deleteMany
   */
  export type InstancePolicyDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which InstancePolicies to delete
     */
    where?: InstancePolicyWhereInput
  }

  /**
   * InstancePolicy without action
   */
  export type InstancePolicyDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InstancePolicy
     */
    select?: InstancePolicySelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstancePolicyInclude<ExtArgs> | null
  }


  /**
   * Model CpuTier
   */

  export type AggregateCpuTier = {
    _count: CpuTierCountAggregateOutputType | null
    _avg: CpuTierAvgAggregateOutputType | null
    _sum: CpuTierSumAggregateOutputType | null
    _min: CpuTierMinAggregateOutputType | null
    _max: CpuTierMaxAggregateOutputType | null
  }

  export type CpuTierAvgAggregateOutputType = {
    cores: number | null
    price: number | null
  }

  export type CpuTierSumAggregateOutputType = {
    cores: number | null
    price: number | null
  }

  export type CpuTierMinAggregateOutputType = {
    id: string | null
    name: string | null
    cores: number | null
    price: number | null
  }

  export type CpuTierMaxAggregateOutputType = {
    id: string | null
    name: string | null
    cores: number | null
    price: number | null
  }

  export type CpuTierCountAggregateOutputType = {
    id: number
    name: number
    cores: number
    price: number
    _all: number
  }


  export type CpuTierAvgAggregateInputType = {
    cores?: true
    price?: true
  }

  export type CpuTierSumAggregateInputType = {
    cores?: true
    price?: true
  }

  export type CpuTierMinAggregateInputType = {
    id?: true
    name?: true
    cores?: true
    price?: true
  }

  export type CpuTierMaxAggregateInputType = {
    id?: true
    name?: true
    cores?: true
    price?: true
  }

  export type CpuTierCountAggregateInputType = {
    id?: true
    name?: true
    cores?: true
    price?: true
    _all?: true
  }

  export type CpuTierAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which CpuTier to aggregate.
     */
    where?: CpuTierWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CpuTiers to fetch.
     */
    orderBy?: CpuTierOrderByWithRelationInput | CpuTierOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: CpuTierWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CpuTiers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CpuTiers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned CpuTiers
    **/
    _count?: true | CpuTierCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: CpuTierAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: CpuTierSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: CpuTierMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: CpuTierMaxAggregateInputType
  }

  export type GetCpuTierAggregateType<T extends CpuTierAggregateArgs> = {
        [P in keyof T & keyof AggregateCpuTier]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateCpuTier[P]>
      : GetScalarType<T[P], AggregateCpuTier[P]>
  }




  export type CpuTierGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CpuTierWhereInput
    orderBy?: CpuTierOrderByWithAggregationInput | CpuTierOrderByWithAggregationInput[]
    by: CpuTierScalarFieldEnum[] | CpuTierScalarFieldEnum
    having?: CpuTierScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: CpuTierCountAggregateInputType | true
    _avg?: CpuTierAvgAggregateInputType
    _sum?: CpuTierSumAggregateInputType
    _min?: CpuTierMinAggregateInputType
    _max?: CpuTierMaxAggregateInputType
  }

  export type CpuTierGroupByOutputType = {
    id: string
    name: string
    cores: number
    price: number
    _count: CpuTierCountAggregateOutputType | null
    _avg: CpuTierAvgAggregateOutputType | null
    _sum: CpuTierSumAggregateOutputType | null
    _min: CpuTierMinAggregateOutputType | null
    _max: CpuTierMaxAggregateOutputType | null
  }

  type GetCpuTierGroupByPayload<T extends CpuTierGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<CpuTierGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof CpuTierGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], CpuTierGroupByOutputType[P]>
            : GetScalarType<T[P], CpuTierGroupByOutputType[P]>
        }
      >
    >


  export type CpuTierSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    cores?: boolean
    price?: boolean
    instances?: boolean | CpuTier$instancesArgs<ExtArgs>
    _count?: boolean | CpuTierCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["cpuTier"]>

  export type CpuTierSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    cores?: boolean
    price?: boolean
  }, ExtArgs["result"]["cpuTier"]>

  export type CpuTierSelectScalar = {
    id?: boolean
    name?: boolean
    cores?: boolean
    price?: boolean
  }

  export type CpuTierInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    instances?: boolean | CpuTier$instancesArgs<ExtArgs>
    _count?: boolean | CpuTierCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type CpuTierIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $CpuTierPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "CpuTier"
    objects: {
      instances: Prisma.$InstancePayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      name: string
      cores: number
      price: number
    }, ExtArgs["result"]["cpuTier"]>
    composites: {}
  }

  type CpuTierGetPayload<S extends boolean | null | undefined | CpuTierDefaultArgs> = $Result.GetResult<Prisma.$CpuTierPayload, S>

  type CpuTierCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<CpuTierFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: CpuTierCountAggregateInputType | true
    }

  export interface CpuTierDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['CpuTier'], meta: { name: 'CpuTier' } }
    /**
     * Find zero or one CpuTier that matches the filter.
     * @param {CpuTierFindUniqueArgs} args - Arguments to find a CpuTier
     * @example
     * // Get one CpuTier
     * const cpuTier = await prisma.cpuTier.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUnique<T extends CpuTierFindUniqueArgs<ExtArgs>>(
      args: SelectSubset<T, CpuTierFindUniqueArgs<ExtArgs>>
    ): Prisma__CpuTierClient<$Result.GetResult<Prisma.$CpuTierPayload<ExtArgs>, T, 'findUnique'> | null, null, ExtArgs>

    /**
     * Find one CpuTier that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {CpuTierFindUniqueOrThrowArgs} args - Arguments to find a CpuTier
     * @example
     * // Get one CpuTier
     * const cpuTier = await prisma.cpuTier.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUniqueOrThrow<T extends CpuTierFindUniqueOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, CpuTierFindUniqueOrThrowArgs<ExtArgs>>
    ): Prisma__CpuTierClient<$Result.GetResult<Prisma.$CpuTierPayload<ExtArgs>, T, 'findUniqueOrThrow'>, never, ExtArgs>

    /**
     * Find the first CpuTier that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CpuTierFindFirstArgs} args - Arguments to find a CpuTier
     * @example
     * // Get one CpuTier
     * const cpuTier = await prisma.cpuTier.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirst<T extends CpuTierFindFirstArgs<ExtArgs>>(
      args?: SelectSubset<T, CpuTierFindFirstArgs<ExtArgs>>
    ): Prisma__CpuTierClient<$Result.GetResult<Prisma.$CpuTierPayload<ExtArgs>, T, 'findFirst'> | null, null, ExtArgs>

    /**
     * Find the first CpuTier that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CpuTierFindFirstOrThrowArgs} args - Arguments to find a CpuTier
     * @example
     * // Get one CpuTier
     * const cpuTier = await prisma.cpuTier.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirstOrThrow<T extends CpuTierFindFirstOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, CpuTierFindFirstOrThrowArgs<ExtArgs>>
    ): Prisma__CpuTierClient<$Result.GetResult<Prisma.$CpuTierPayload<ExtArgs>, T, 'findFirstOrThrow'>, never, ExtArgs>

    /**
     * Find zero or more CpuTiers that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CpuTierFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all CpuTiers
     * const cpuTiers = await prisma.cpuTier.findMany()
     * 
     * // Get first 10 CpuTiers
     * const cpuTiers = await prisma.cpuTier.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const cpuTierWithIdOnly = await prisma.cpuTier.findMany({ select: { id: true } })
     * 
    **/
    findMany<T extends CpuTierFindManyArgs<ExtArgs>>(
      args?: SelectSubset<T, CpuTierFindManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CpuTierPayload<ExtArgs>, T, 'findMany'>>

    /**
     * Create a CpuTier.
     * @param {CpuTierCreateArgs} args - Arguments to create a CpuTier.
     * @example
     * // Create one CpuTier
     * const CpuTier = await prisma.cpuTier.create({
     *   data: {
     *     // ... data to create a CpuTier
     *   }
     * })
     * 
    **/
    create<T extends CpuTierCreateArgs<ExtArgs>>(
      args: SelectSubset<T, CpuTierCreateArgs<ExtArgs>>
    ): Prisma__CpuTierClient<$Result.GetResult<Prisma.$CpuTierPayload<ExtArgs>, T, 'create'>, never, ExtArgs>

    /**
     * Create many CpuTiers.
     * @param {CpuTierCreateManyArgs} args - Arguments to create many CpuTiers.
     * @example
     * // Create many CpuTiers
     * const cpuTier = await prisma.cpuTier.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
    **/
    createMany<T extends CpuTierCreateManyArgs<ExtArgs>>(
      args?: SelectSubset<T, CpuTierCreateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many CpuTiers and returns the data saved in the database.
     * @param {CpuTierCreateManyAndReturnArgs} args - Arguments to create many CpuTiers.
     * @example
     * // Create many CpuTiers
     * const cpuTier = await prisma.cpuTier.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many CpuTiers and only return the `id`
     * const cpuTierWithIdOnly = await prisma.cpuTier.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
    **/
    createManyAndReturn<T extends CpuTierCreateManyAndReturnArgs<ExtArgs>>(
      args?: SelectSubset<T, CpuTierCreateManyAndReturnArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CpuTierPayload<ExtArgs>, T, 'createManyAndReturn'>>

    /**
     * Delete a CpuTier.
     * @param {CpuTierDeleteArgs} args - Arguments to delete one CpuTier.
     * @example
     * // Delete one CpuTier
     * const CpuTier = await prisma.cpuTier.delete({
     *   where: {
     *     // ... filter to delete one CpuTier
     *   }
     * })
     * 
    **/
    delete<T extends CpuTierDeleteArgs<ExtArgs>>(
      args: SelectSubset<T, CpuTierDeleteArgs<ExtArgs>>
    ): Prisma__CpuTierClient<$Result.GetResult<Prisma.$CpuTierPayload<ExtArgs>, T, 'delete'>, never, ExtArgs>

    /**
     * Update one CpuTier.
     * @param {CpuTierUpdateArgs} args - Arguments to update one CpuTier.
     * @example
     * // Update one CpuTier
     * const cpuTier = await prisma.cpuTier.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    update<T extends CpuTierUpdateArgs<ExtArgs>>(
      args: SelectSubset<T, CpuTierUpdateArgs<ExtArgs>>
    ): Prisma__CpuTierClient<$Result.GetResult<Prisma.$CpuTierPayload<ExtArgs>, T, 'update'>, never, ExtArgs>

    /**
     * Delete zero or more CpuTiers.
     * @param {CpuTierDeleteManyArgs} args - Arguments to filter CpuTiers to delete.
     * @example
     * // Delete a few CpuTiers
     * const { count } = await prisma.cpuTier.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
    **/
    deleteMany<T extends CpuTierDeleteManyArgs<ExtArgs>>(
      args?: SelectSubset<T, CpuTierDeleteManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more CpuTiers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CpuTierUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many CpuTiers
     * const cpuTier = await prisma.cpuTier.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    updateMany<T extends CpuTierUpdateManyArgs<ExtArgs>>(
      args: SelectSubset<T, CpuTierUpdateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one CpuTier.
     * @param {CpuTierUpsertArgs} args - Arguments to update or create a CpuTier.
     * @example
     * // Update or create a CpuTier
     * const cpuTier = await prisma.cpuTier.upsert({
     *   create: {
     *     // ... data to create a CpuTier
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the CpuTier we want to update
     *   }
     * })
    **/
    upsert<T extends CpuTierUpsertArgs<ExtArgs>>(
      args: SelectSubset<T, CpuTierUpsertArgs<ExtArgs>>
    ): Prisma__CpuTierClient<$Result.GetResult<Prisma.$CpuTierPayload<ExtArgs>, T, 'upsert'>, never, ExtArgs>

    /**
     * Count the number of CpuTiers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CpuTierCountArgs} args - Arguments to filter CpuTiers to count.
     * @example
     * // Count the number of CpuTiers
     * const count = await prisma.cpuTier.count({
     *   where: {
     *     // ... the filter for the CpuTiers we want to count
     *   }
     * })
    **/
    count<T extends CpuTierCountArgs>(
      args?: Subset<T, CpuTierCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], CpuTierCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a CpuTier.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CpuTierAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends CpuTierAggregateArgs>(args: Subset<T, CpuTierAggregateArgs>): Prisma.PrismaPromise<GetCpuTierAggregateType<T>>

    /**
     * Group by CpuTier.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CpuTierGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends CpuTierGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: CpuTierGroupByArgs['orderBy'] }
        : { orderBy?: CpuTierGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, CpuTierGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetCpuTierGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the CpuTier model
   */
  readonly fields: CpuTierFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for CpuTier.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__CpuTierClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: 'PrismaPromise';

    instances<T extends CpuTier$instancesArgs<ExtArgs> = {}>(args?: Subset<T, CpuTier$instancesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$InstancePayload<ExtArgs>, T, 'findMany'> | Null>;

    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>;
  }



  /**
   * Fields of the CpuTier model
   */ 
  interface CpuTierFieldRefs {
    readonly id: FieldRef<"CpuTier", 'String'>
    readonly name: FieldRef<"CpuTier", 'String'>
    readonly cores: FieldRef<"CpuTier", 'Int'>
    readonly price: FieldRef<"CpuTier", 'Float'>
  }
    

  // Custom InputTypes
  /**
   * CpuTier findUnique
   */
  export type CpuTierFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CpuTier
     */
    select?: CpuTierSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CpuTierInclude<ExtArgs> | null
    /**
     * Filter, which CpuTier to fetch.
     */
    where: CpuTierWhereUniqueInput
  }

  /**
   * CpuTier findUniqueOrThrow
   */
  export type CpuTierFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CpuTier
     */
    select?: CpuTierSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CpuTierInclude<ExtArgs> | null
    /**
     * Filter, which CpuTier to fetch.
     */
    where: CpuTierWhereUniqueInput
  }

  /**
   * CpuTier findFirst
   */
  export type CpuTierFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CpuTier
     */
    select?: CpuTierSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CpuTierInclude<ExtArgs> | null
    /**
     * Filter, which CpuTier to fetch.
     */
    where?: CpuTierWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CpuTiers to fetch.
     */
    orderBy?: CpuTierOrderByWithRelationInput | CpuTierOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for CpuTiers.
     */
    cursor?: CpuTierWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CpuTiers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CpuTiers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of CpuTiers.
     */
    distinct?: CpuTierScalarFieldEnum | CpuTierScalarFieldEnum[]
  }

  /**
   * CpuTier findFirstOrThrow
   */
  export type CpuTierFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CpuTier
     */
    select?: CpuTierSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CpuTierInclude<ExtArgs> | null
    /**
     * Filter, which CpuTier to fetch.
     */
    where?: CpuTierWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CpuTiers to fetch.
     */
    orderBy?: CpuTierOrderByWithRelationInput | CpuTierOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for CpuTiers.
     */
    cursor?: CpuTierWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CpuTiers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CpuTiers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of CpuTiers.
     */
    distinct?: CpuTierScalarFieldEnum | CpuTierScalarFieldEnum[]
  }

  /**
   * CpuTier findMany
   */
  export type CpuTierFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CpuTier
     */
    select?: CpuTierSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CpuTierInclude<ExtArgs> | null
    /**
     * Filter, which CpuTiers to fetch.
     */
    where?: CpuTierWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CpuTiers to fetch.
     */
    orderBy?: CpuTierOrderByWithRelationInput | CpuTierOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing CpuTiers.
     */
    cursor?: CpuTierWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CpuTiers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CpuTiers.
     */
    skip?: number
    distinct?: CpuTierScalarFieldEnum | CpuTierScalarFieldEnum[]
  }

  /**
   * CpuTier create
   */
  export type CpuTierCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CpuTier
     */
    select?: CpuTierSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CpuTierInclude<ExtArgs> | null
    /**
     * The data needed to create a CpuTier.
     */
    data: XOR<CpuTierCreateInput, CpuTierUncheckedCreateInput>
  }

  /**
   * CpuTier createMany
   */
  export type CpuTierCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many CpuTiers.
     */
    data: CpuTierCreateManyInput | CpuTierCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * CpuTier createManyAndReturn
   */
  export type CpuTierCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CpuTier
     */
    select?: CpuTierSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many CpuTiers.
     */
    data: CpuTierCreateManyInput | CpuTierCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * CpuTier update
   */
  export type CpuTierUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CpuTier
     */
    select?: CpuTierSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CpuTierInclude<ExtArgs> | null
    /**
     * The data needed to update a CpuTier.
     */
    data: XOR<CpuTierUpdateInput, CpuTierUncheckedUpdateInput>
    /**
     * Choose, which CpuTier to update.
     */
    where: CpuTierWhereUniqueInput
  }

  /**
   * CpuTier updateMany
   */
  export type CpuTierUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update CpuTiers.
     */
    data: XOR<CpuTierUpdateManyMutationInput, CpuTierUncheckedUpdateManyInput>
    /**
     * Filter which CpuTiers to update
     */
    where?: CpuTierWhereInput
  }

  /**
   * CpuTier upsert
   */
  export type CpuTierUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CpuTier
     */
    select?: CpuTierSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CpuTierInclude<ExtArgs> | null
    /**
     * The filter to search for the CpuTier to update in case it exists.
     */
    where: CpuTierWhereUniqueInput
    /**
     * In case the CpuTier found by the `where` argument doesn't exist, create a new CpuTier with this data.
     */
    create: XOR<CpuTierCreateInput, CpuTierUncheckedCreateInput>
    /**
     * In case the CpuTier was found with the provided `where` argument, update it with this data.
     */
    update: XOR<CpuTierUpdateInput, CpuTierUncheckedUpdateInput>
  }

  /**
   * CpuTier delete
   */
  export type CpuTierDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CpuTier
     */
    select?: CpuTierSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CpuTierInclude<ExtArgs> | null
    /**
     * Filter which CpuTier to delete.
     */
    where: CpuTierWhereUniqueInput
  }

  /**
   * CpuTier deleteMany
   */
  export type CpuTierDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which CpuTiers to delete
     */
    where?: CpuTierWhereInput
  }

  /**
   * CpuTier.instances
   */
  export type CpuTier$instancesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Instance
     */
    select?: InstanceSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstanceInclude<ExtArgs> | null
    where?: InstanceWhereInput
    orderBy?: InstanceOrderByWithRelationInput | InstanceOrderByWithRelationInput[]
    cursor?: InstanceWhereUniqueInput
    take?: number
    skip?: number
    distinct?: InstanceScalarFieldEnum | InstanceScalarFieldEnum[]
  }

  /**
   * CpuTier without action
   */
  export type CpuTierDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CpuTier
     */
    select?: CpuTierSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CpuTierInclude<ExtArgs> | null
  }


  /**
   * Model NodeTier
   */

  export type AggregateNodeTier = {
    _count: NodeTierCountAggregateOutputType | null
    _avg: NodeTierAvgAggregateOutputType | null
    _sum: NodeTierSumAggregateOutputType | null
    _min: NodeTierMinAggregateOutputType | null
    _max: NodeTierMaxAggregateOutputType | null
  }

  export type NodeTierAvgAggregateOutputType = {
    nodes: number | null
    price: number | null
  }

  export type NodeTierSumAggregateOutputType = {
    nodes: number | null
    price: number | null
  }

  export type NodeTierMinAggregateOutputType = {
    id: string | null
    name: string | null
    nodes: number | null
    price: number | null
  }

  export type NodeTierMaxAggregateOutputType = {
    id: string | null
    name: string | null
    nodes: number | null
    price: number | null
  }

  export type NodeTierCountAggregateOutputType = {
    id: number
    name: number
    nodes: number
    price: number
    _all: number
  }


  export type NodeTierAvgAggregateInputType = {
    nodes?: true
    price?: true
  }

  export type NodeTierSumAggregateInputType = {
    nodes?: true
    price?: true
  }

  export type NodeTierMinAggregateInputType = {
    id?: true
    name?: true
    nodes?: true
    price?: true
  }

  export type NodeTierMaxAggregateInputType = {
    id?: true
    name?: true
    nodes?: true
    price?: true
  }

  export type NodeTierCountAggregateInputType = {
    id?: true
    name?: true
    nodes?: true
    price?: true
    _all?: true
  }

  export type NodeTierAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which NodeTier to aggregate.
     */
    where?: NodeTierWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of NodeTiers to fetch.
     */
    orderBy?: NodeTierOrderByWithRelationInput | NodeTierOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: NodeTierWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` NodeTiers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` NodeTiers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned NodeTiers
    **/
    _count?: true | NodeTierCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: NodeTierAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: NodeTierSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: NodeTierMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: NodeTierMaxAggregateInputType
  }

  export type GetNodeTierAggregateType<T extends NodeTierAggregateArgs> = {
        [P in keyof T & keyof AggregateNodeTier]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateNodeTier[P]>
      : GetScalarType<T[P], AggregateNodeTier[P]>
  }




  export type NodeTierGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: NodeTierWhereInput
    orderBy?: NodeTierOrderByWithAggregationInput | NodeTierOrderByWithAggregationInput[]
    by: NodeTierScalarFieldEnum[] | NodeTierScalarFieldEnum
    having?: NodeTierScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: NodeTierCountAggregateInputType | true
    _avg?: NodeTierAvgAggregateInputType
    _sum?: NodeTierSumAggregateInputType
    _min?: NodeTierMinAggregateInputType
    _max?: NodeTierMaxAggregateInputType
  }

  export type NodeTierGroupByOutputType = {
    id: string
    name: string
    nodes: number
    price: number
    _count: NodeTierCountAggregateOutputType | null
    _avg: NodeTierAvgAggregateOutputType | null
    _sum: NodeTierSumAggregateOutputType | null
    _min: NodeTierMinAggregateOutputType | null
    _max: NodeTierMaxAggregateOutputType | null
  }

  type GetNodeTierGroupByPayload<T extends NodeTierGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<NodeTierGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof NodeTierGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], NodeTierGroupByOutputType[P]>
            : GetScalarType<T[P], NodeTierGroupByOutputType[P]>
        }
      >
    >


  export type NodeTierSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    nodes?: boolean
    price?: boolean
    instances?: boolean | NodeTier$instancesArgs<ExtArgs>
    _count?: boolean | NodeTierCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["nodeTier"]>

  export type NodeTierSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    nodes?: boolean
    price?: boolean
  }, ExtArgs["result"]["nodeTier"]>

  export type NodeTierSelectScalar = {
    id?: boolean
    name?: boolean
    nodes?: boolean
    price?: boolean
  }

  export type NodeTierInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    instances?: boolean | NodeTier$instancesArgs<ExtArgs>
    _count?: boolean | NodeTierCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type NodeTierIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $NodeTierPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "NodeTier"
    objects: {
      instances: Prisma.$InstancePayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      name: string
      nodes: number
      price: number
    }, ExtArgs["result"]["nodeTier"]>
    composites: {}
  }

  type NodeTierGetPayload<S extends boolean | null | undefined | NodeTierDefaultArgs> = $Result.GetResult<Prisma.$NodeTierPayload, S>

  type NodeTierCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<NodeTierFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: NodeTierCountAggregateInputType | true
    }

  export interface NodeTierDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['NodeTier'], meta: { name: 'NodeTier' } }
    /**
     * Find zero or one NodeTier that matches the filter.
     * @param {NodeTierFindUniqueArgs} args - Arguments to find a NodeTier
     * @example
     * // Get one NodeTier
     * const nodeTier = await prisma.nodeTier.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUnique<T extends NodeTierFindUniqueArgs<ExtArgs>>(
      args: SelectSubset<T, NodeTierFindUniqueArgs<ExtArgs>>
    ): Prisma__NodeTierClient<$Result.GetResult<Prisma.$NodeTierPayload<ExtArgs>, T, 'findUnique'> | null, null, ExtArgs>

    /**
     * Find one NodeTier that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {NodeTierFindUniqueOrThrowArgs} args - Arguments to find a NodeTier
     * @example
     * // Get one NodeTier
     * const nodeTier = await prisma.nodeTier.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUniqueOrThrow<T extends NodeTierFindUniqueOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, NodeTierFindUniqueOrThrowArgs<ExtArgs>>
    ): Prisma__NodeTierClient<$Result.GetResult<Prisma.$NodeTierPayload<ExtArgs>, T, 'findUniqueOrThrow'>, never, ExtArgs>

    /**
     * Find the first NodeTier that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {NodeTierFindFirstArgs} args - Arguments to find a NodeTier
     * @example
     * // Get one NodeTier
     * const nodeTier = await prisma.nodeTier.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirst<T extends NodeTierFindFirstArgs<ExtArgs>>(
      args?: SelectSubset<T, NodeTierFindFirstArgs<ExtArgs>>
    ): Prisma__NodeTierClient<$Result.GetResult<Prisma.$NodeTierPayload<ExtArgs>, T, 'findFirst'> | null, null, ExtArgs>

    /**
     * Find the first NodeTier that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {NodeTierFindFirstOrThrowArgs} args - Arguments to find a NodeTier
     * @example
     * // Get one NodeTier
     * const nodeTier = await prisma.nodeTier.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirstOrThrow<T extends NodeTierFindFirstOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, NodeTierFindFirstOrThrowArgs<ExtArgs>>
    ): Prisma__NodeTierClient<$Result.GetResult<Prisma.$NodeTierPayload<ExtArgs>, T, 'findFirstOrThrow'>, never, ExtArgs>

    /**
     * Find zero or more NodeTiers that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {NodeTierFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all NodeTiers
     * const nodeTiers = await prisma.nodeTier.findMany()
     * 
     * // Get first 10 NodeTiers
     * const nodeTiers = await prisma.nodeTier.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const nodeTierWithIdOnly = await prisma.nodeTier.findMany({ select: { id: true } })
     * 
    **/
    findMany<T extends NodeTierFindManyArgs<ExtArgs>>(
      args?: SelectSubset<T, NodeTierFindManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$NodeTierPayload<ExtArgs>, T, 'findMany'>>

    /**
     * Create a NodeTier.
     * @param {NodeTierCreateArgs} args - Arguments to create a NodeTier.
     * @example
     * // Create one NodeTier
     * const NodeTier = await prisma.nodeTier.create({
     *   data: {
     *     // ... data to create a NodeTier
     *   }
     * })
     * 
    **/
    create<T extends NodeTierCreateArgs<ExtArgs>>(
      args: SelectSubset<T, NodeTierCreateArgs<ExtArgs>>
    ): Prisma__NodeTierClient<$Result.GetResult<Prisma.$NodeTierPayload<ExtArgs>, T, 'create'>, never, ExtArgs>

    /**
     * Create many NodeTiers.
     * @param {NodeTierCreateManyArgs} args - Arguments to create many NodeTiers.
     * @example
     * // Create many NodeTiers
     * const nodeTier = await prisma.nodeTier.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
    **/
    createMany<T extends NodeTierCreateManyArgs<ExtArgs>>(
      args?: SelectSubset<T, NodeTierCreateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many NodeTiers and returns the data saved in the database.
     * @param {NodeTierCreateManyAndReturnArgs} args - Arguments to create many NodeTiers.
     * @example
     * // Create many NodeTiers
     * const nodeTier = await prisma.nodeTier.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many NodeTiers and only return the `id`
     * const nodeTierWithIdOnly = await prisma.nodeTier.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
    **/
    createManyAndReturn<T extends NodeTierCreateManyAndReturnArgs<ExtArgs>>(
      args?: SelectSubset<T, NodeTierCreateManyAndReturnArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$NodeTierPayload<ExtArgs>, T, 'createManyAndReturn'>>

    /**
     * Delete a NodeTier.
     * @param {NodeTierDeleteArgs} args - Arguments to delete one NodeTier.
     * @example
     * // Delete one NodeTier
     * const NodeTier = await prisma.nodeTier.delete({
     *   where: {
     *     // ... filter to delete one NodeTier
     *   }
     * })
     * 
    **/
    delete<T extends NodeTierDeleteArgs<ExtArgs>>(
      args: SelectSubset<T, NodeTierDeleteArgs<ExtArgs>>
    ): Prisma__NodeTierClient<$Result.GetResult<Prisma.$NodeTierPayload<ExtArgs>, T, 'delete'>, never, ExtArgs>

    /**
     * Update one NodeTier.
     * @param {NodeTierUpdateArgs} args - Arguments to update one NodeTier.
     * @example
     * // Update one NodeTier
     * const nodeTier = await prisma.nodeTier.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    update<T extends NodeTierUpdateArgs<ExtArgs>>(
      args: SelectSubset<T, NodeTierUpdateArgs<ExtArgs>>
    ): Prisma__NodeTierClient<$Result.GetResult<Prisma.$NodeTierPayload<ExtArgs>, T, 'update'>, never, ExtArgs>

    /**
     * Delete zero or more NodeTiers.
     * @param {NodeTierDeleteManyArgs} args - Arguments to filter NodeTiers to delete.
     * @example
     * // Delete a few NodeTiers
     * const { count } = await prisma.nodeTier.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
    **/
    deleteMany<T extends NodeTierDeleteManyArgs<ExtArgs>>(
      args?: SelectSubset<T, NodeTierDeleteManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more NodeTiers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {NodeTierUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many NodeTiers
     * const nodeTier = await prisma.nodeTier.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    updateMany<T extends NodeTierUpdateManyArgs<ExtArgs>>(
      args: SelectSubset<T, NodeTierUpdateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one NodeTier.
     * @param {NodeTierUpsertArgs} args - Arguments to update or create a NodeTier.
     * @example
     * // Update or create a NodeTier
     * const nodeTier = await prisma.nodeTier.upsert({
     *   create: {
     *     // ... data to create a NodeTier
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the NodeTier we want to update
     *   }
     * })
    **/
    upsert<T extends NodeTierUpsertArgs<ExtArgs>>(
      args: SelectSubset<T, NodeTierUpsertArgs<ExtArgs>>
    ): Prisma__NodeTierClient<$Result.GetResult<Prisma.$NodeTierPayload<ExtArgs>, T, 'upsert'>, never, ExtArgs>

    /**
     * Count the number of NodeTiers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {NodeTierCountArgs} args - Arguments to filter NodeTiers to count.
     * @example
     * // Count the number of NodeTiers
     * const count = await prisma.nodeTier.count({
     *   where: {
     *     // ... the filter for the NodeTiers we want to count
     *   }
     * })
    **/
    count<T extends NodeTierCountArgs>(
      args?: Subset<T, NodeTierCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], NodeTierCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a NodeTier.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {NodeTierAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends NodeTierAggregateArgs>(args: Subset<T, NodeTierAggregateArgs>): Prisma.PrismaPromise<GetNodeTierAggregateType<T>>

    /**
     * Group by NodeTier.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {NodeTierGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends NodeTierGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: NodeTierGroupByArgs['orderBy'] }
        : { orderBy?: NodeTierGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, NodeTierGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetNodeTierGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the NodeTier model
   */
  readonly fields: NodeTierFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for NodeTier.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__NodeTierClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: 'PrismaPromise';

    instances<T extends NodeTier$instancesArgs<ExtArgs> = {}>(args?: Subset<T, NodeTier$instancesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$InstancePayload<ExtArgs>, T, 'findMany'> | Null>;

    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>;
  }



  /**
   * Fields of the NodeTier model
   */ 
  interface NodeTierFieldRefs {
    readonly id: FieldRef<"NodeTier", 'String'>
    readonly name: FieldRef<"NodeTier", 'String'>
    readonly nodes: FieldRef<"NodeTier", 'Int'>
    readonly price: FieldRef<"NodeTier", 'Float'>
  }
    

  // Custom InputTypes
  /**
   * NodeTier findUnique
   */
  export type NodeTierFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the NodeTier
     */
    select?: NodeTierSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: NodeTierInclude<ExtArgs> | null
    /**
     * Filter, which NodeTier to fetch.
     */
    where: NodeTierWhereUniqueInput
  }

  /**
   * NodeTier findUniqueOrThrow
   */
  export type NodeTierFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the NodeTier
     */
    select?: NodeTierSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: NodeTierInclude<ExtArgs> | null
    /**
     * Filter, which NodeTier to fetch.
     */
    where: NodeTierWhereUniqueInput
  }

  /**
   * NodeTier findFirst
   */
  export type NodeTierFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the NodeTier
     */
    select?: NodeTierSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: NodeTierInclude<ExtArgs> | null
    /**
     * Filter, which NodeTier to fetch.
     */
    where?: NodeTierWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of NodeTiers to fetch.
     */
    orderBy?: NodeTierOrderByWithRelationInput | NodeTierOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for NodeTiers.
     */
    cursor?: NodeTierWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` NodeTiers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` NodeTiers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of NodeTiers.
     */
    distinct?: NodeTierScalarFieldEnum | NodeTierScalarFieldEnum[]
  }

  /**
   * NodeTier findFirstOrThrow
   */
  export type NodeTierFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the NodeTier
     */
    select?: NodeTierSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: NodeTierInclude<ExtArgs> | null
    /**
     * Filter, which NodeTier to fetch.
     */
    where?: NodeTierWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of NodeTiers to fetch.
     */
    orderBy?: NodeTierOrderByWithRelationInput | NodeTierOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for NodeTiers.
     */
    cursor?: NodeTierWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` NodeTiers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` NodeTiers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of NodeTiers.
     */
    distinct?: NodeTierScalarFieldEnum | NodeTierScalarFieldEnum[]
  }

  /**
   * NodeTier findMany
   */
  export type NodeTierFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the NodeTier
     */
    select?: NodeTierSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: NodeTierInclude<ExtArgs> | null
    /**
     * Filter, which NodeTiers to fetch.
     */
    where?: NodeTierWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of NodeTiers to fetch.
     */
    orderBy?: NodeTierOrderByWithRelationInput | NodeTierOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing NodeTiers.
     */
    cursor?: NodeTierWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` NodeTiers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` NodeTiers.
     */
    skip?: number
    distinct?: NodeTierScalarFieldEnum | NodeTierScalarFieldEnum[]
  }

  /**
   * NodeTier create
   */
  export type NodeTierCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the NodeTier
     */
    select?: NodeTierSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: NodeTierInclude<ExtArgs> | null
    /**
     * The data needed to create a NodeTier.
     */
    data: XOR<NodeTierCreateInput, NodeTierUncheckedCreateInput>
  }

  /**
   * NodeTier createMany
   */
  export type NodeTierCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many NodeTiers.
     */
    data: NodeTierCreateManyInput | NodeTierCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * NodeTier createManyAndReturn
   */
  export type NodeTierCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the NodeTier
     */
    select?: NodeTierSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many NodeTiers.
     */
    data: NodeTierCreateManyInput | NodeTierCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * NodeTier update
   */
  export type NodeTierUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the NodeTier
     */
    select?: NodeTierSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: NodeTierInclude<ExtArgs> | null
    /**
     * The data needed to update a NodeTier.
     */
    data: XOR<NodeTierUpdateInput, NodeTierUncheckedUpdateInput>
    /**
     * Choose, which NodeTier to update.
     */
    where: NodeTierWhereUniqueInput
  }

  /**
   * NodeTier updateMany
   */
  export type NodeTierUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update NodeTiers.
     */
    data: XOR<NodeTierUpdateManyMutationInput, NodeTierUncheckedUpdateManyInput>
    /**
     * Filter which NodeTiers to update
     */
    where?: NodeTierWhereInput
  }

  /**
   * NodeTier upsert
   */
  export type NodeTierUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the NodeTier
     */
    select?: NodeTierSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: NodeTierInclude<ExtArgs> | null
    /**
     * The filter to search for the NodeTier to update in case it exists.
     */
    where: NodeTierWhereUniqueInput
    /**
     * In case the NodeTier found by the `where` argument doesn't exist, create a new NodeTier with this data.
     */
    create: XOR<NodeTierCreateInput, NodeTierUncheckedCreateInput>
    /**
     * In case the NodeTier was found with the provided `where` argument, update it with this data.
     */
    update: XOR<NodeTierUpdateInput, NodeTierUncheckedUpdateInput>
  }

  /**
   * NodeTier delete
   */
  export type NodeTierDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the NodeTier
     */
    select?: NodeTierSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: NodeTierInclude<ExtArgs> | null
    /**
     * Filter which NodeTier to delete.
     */
    where: NodeTierWhereUniqueInput
  }

  /**
   * NodeTier deleteMany
   */
  export type NodeTierDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which NodeTiers to delete
     */
    where?: NodeTierWhereInput
  }

  /**
   * NodeTier.instances
   */
  export type NodeTier$instancesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Instance
     */
    select?: InstanceSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstanceInclude<ExtArgs> | null
    where?: InstanceWhereInput
    orderBy?: InstanceOrderByWithRelationInput | InstanceOrderByWithRelationInput[]
    cursor?: InstanceWhereUniqueInput
    take?: number
    skip?: number
    distinct?: InstanceScalarFieldEnum | InstanceScalarFieldEnum[]
  }

  /**
   * NodeTier without action
   */
  export type NodeTierDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the NodeTier
     */
    select?: NodeTierSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: NodeTierInclude<ExtArgs> | null
  }


  /**
   * Model EngineTier
   */

  export type AggregateEngineTier = {
    _count: EngineTierCountAggregateOutputType | null
    _avg: EngineTierAvgAggregateOutputType | null
    _sum: EngineTierSumAggregateOutputType | null
    _min: EngineTierMinAggregateOutputType | null
    _max: EngineTierMaxAggregateOutputType | null
  }

  export type EngineTierAvgAggregateOutputType = {
    price: number | null
  }

  export type EngineTierSumAggregateOutputType = {
    price: number | null
  }

  export type EngineTierMinAggregateOutputType = {
    id: string | null
    name: string | null
    profile: string | null
    price: number | null
  }

  export type EngineTierMaxAggregateOutputType = {
    id: string | null
    name: string | null
    profile: string | null
    price: number | null
  }

  export type EngineTierCountAggregateOutputType = {
    id: number
    name: number
    profile: number
    price: number
    _all: number
  }


  export type EngineTierAvgAggregateInputType = {
    price?: true
  }

  export type EngineTierSumAggregateInputType = {
    price?: true
  }

  export type EngineTierMinAggregateInputType = {
    id?: true
    name?: true
    profile?: true
    price?: true
  }

  export type EngineTierMaxAggregateInputType = {
    id?: true
    name?: true
    profile?: true
    price?: true
  }

  export type EngineTierCountAggregateInputType = {
    id?: true
    name?: true
    profile?: true
    price?: true
    _all?: true
  }

  export type EngineTierAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which EngineTier to aggregate.
     */
    where?: EngineTierWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of EngineTiers to fetch.
     */
    orderBy?: EngineTierOrderByWithRelationInput | EngineTierOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: EngineTierWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` EngineTiers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` EngineTiers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned EngineTiers
    **/
    _count?: true | EngineTierCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: EngineTierAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: EngineTierSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: EngineTierMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: EngineTierMaxAggregateInputType
  }

  export type GetEngineTierAggregateType<T extends EngineTierAggregateArgs> = {
        [P in keyof T & keyof AggregateEngineTier]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateEngineTier[P]>
      : GetScalarType<T[P], AggregateEngineTier[P]>
  }




  export type EngineTierGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: EngineTierWhereInput
    orderBy?: EngineTierOrderByWithAggregationInput | EngineTierOrderByWithAggregationInput[]
    by: EngineTierScalarFieldEnum[] | EngineTierScalarFieldEnum
    having?: EngineTierScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: EngineTierCountAggregateInputType | true
    _avg?: EngineTierAvgAggregateInputType
    _sum?: EngineTierSumAggregateInputType
    _min?: EngineTierMinAggregateInputType
    _max?: EngineTierMaxAggregateInputType
  }

  export type EngineTierGroupByOutputType = {
    id: string
    name: string
    profile: string
    price: number
    _count: EngineTierCountAggregateOutputType | null
    _avg: EngineTierAvgAggregateOutputType | null
    _sum: EngineTierSumAggregateOutputType | null
    _min: EngineTierMinAggregateOutputType | null
    _max: EngineTierMaxAggregateOutputType | null
  }

  type GetEngineTierGroupByPayload<T extends EngineTierGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<EngineTierGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof EngineTierGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], EngineTierGroupByOutputType[P]>
            : GetScalarType<T[P], EngineTierGroupByOutputType[P]>
        }
      >
    >


  export type EngineTierSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    profile?: boolean
    price?: boolean
    instances?: boolean | EngineTier$instancesArgs<ExtArgs>
    _count?: boolean | EngineTierCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["engineTier"]>

  export type EngineTierSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    profile?: boolean
    price?: boolean
  }, ExtArgs["result"]["engineTier"]>

  export type EngineTierSelectScalar = {
    id?: boolean
    name?: boolean
    profile?: boolean
    price?: boolean
  }

  export type EngineTierInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    instances?: boolean | EngineTier$instancesArgs<ExtArgs>
    _count?: boolean | EngineTierCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type EngineTierIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $EngineTierPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "EngineTier"
    objects: {
      instances: Prisma.$InstancePayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      name: string
      profile: string
      price: number
    }, ExtArgs["result"]["engineTier"]>
    composites: {}
  }

  type EngineTierGetPayload<S extends boolean | null | undefined | EngineTierDefaultArgs> = $Result.GetResult<Prisma.$EngineTierPayload, S>

  type EngineTierCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<EngineTierFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: EngineTierCountAggregateInputType | true
    }

  export interface EngineTierDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['EngineTier'], meta: { name: 'EngineTier' } }
    /**
     * Find zero or one EngineTier that matches the filter.
     * @param {EngineTierFindUniqueArgs} args - Arguments to find a EngineTier
     * @example
     * // Get one EngineTier
     * const engineTier = await prisma.engineTier.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUnique<T extends EngineTierFindUniqueArgs<ExtArgs>>(
      args: SelectSubset<T, EngineTierFindUniqueArgs<ExtArgs>>
    ): Prisma__EngineTierClient<$Result.GetResult<Prisma.$EngineTierPayload<ExtArgs>, T, 'findUnique'> | null, null, ExtArgs>

    /**
     * Find one EngineTier that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {EngineTierFindUniqueOrThrowArgs} args - Arguments to find a EngineTier
     * @example
     * // Get one EngineTier
     * const engineTier = await prisma.engineTier.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUniqueOrThrow<T extends EngineTierFindUniqueOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, EngineTierFindUniqueOrThrowArgs<ExtArgs>>
    ): Prisma__EngineTierClient<$Result.GetResult<Prisma.$EngineTierPayload<ExtArgs>, T, 'findUniqueOrThrow'>, never, ExtArgs>

    /**
     * Find the first EngineTier that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EngineTierFindFirstArgs} args - Arguments to find a EngineTier
     * @example
     * // Get one EngineTier
     * const engineTier = await prisma.engineTier.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirst<T extends EngineTierFindFirstArgs<ExtArgs>>(
      args?: SelectSubset<T, EngineTierFindFirstArgs<ExtArgs>>
    ): Prisma__EngineTierClient<$Result.GetResult<Prisma.$EngineTierPayload<ExtArgs>, T, 'findFirst'> | null, null, ExtArgs>

    /**
     * Find the first EngineTier that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EngineTierFindFirstOrThrowArgs} args - Arguments to find a EngineTier
     * @example
     * // Get one EngineTier
     * const engineTier = await prisma.engineTier.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirstOrThrow<T extends EngineTierFindFirstOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, EngineTierFindFirstOrThrowArgs<ExtArgs>>
    ): Prisma__EngineTierClient<$Result.GetResult<Prisma.$EngineTierPayload<ExtArgs>, T, 'findFirstOrThrow'>, never, ExtArgs>

    /**
     * Find zero or more EngineTiers that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EngineTierFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all EngineTiers
     * const engineTiers = await prisma.engineTier.findMany()
     * 
     * // Get first 10 EngineTiers
     * const engineTiers = await prisma.engineTier.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const engineTierWithIdOnly = await prisma.engineTier.findMany({ select: { id: true } })
     * 
    **/
    findMany<T extends EngineTierFindManyArgs<ExtArgs>>(
      args?: SelectSubset<T, EngineTierFindManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$EngineTierPayload<ExtArgs>, T, 'findMany'>>

    /**
     * Create a EngineTier.
     * @param {EngineTierCreateArgs} args - Arguments to create a EngineTier.
     * @example
     * // Create one EngineTier
     * const EngineTier = await prisma.engineTier.create({
     *   data: {
     *     // ... data to create a EngineTier
     *   }
     * })
     * 
    **/
    create<T extends EngineTierCreateArgs<ExtArgs>>(
      args: SelectSubset<T, EngineTierCreateArgs<ExtArgs>>
    ): Prisma__EngineTierClient<$Result.GetResult<Prisma.$EngineTierPayload<ExtArgs>, T, 'create'>, never, ExtArgs>

    /**
     * Create many EngineTiers.
     * @param {EngineTierCreateManyArgs} args - Arguments to create many EngineTiers.
     * @example
     * // Create many EngineTiers
     * const engineTier = await prisma.engineTier.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
    **/
    createMany<T extends EngineTierCreateManyArgs<ExtArgs>>(
      args?: SelectSubset<T, EngineTierCreateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many EngineTiers and returns the data saved in the database.
     * @param {EngineTierCreateManyAndReturnArgs} args - Arguments to create many EngineTiers.
     * @example
     * // Create many EngineTiers
     * const engineTier = await prisma.engineTier.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many EngineTiers and only return the `id`
     * const engineTierWithIdOnly = await prisma.engineTier.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
    **/
    createManyAndReturn<T extends EngineTierCreateManyAndReturnArgs<ExtArgs>>(
      args?: SelectSubset<T, EngineTierCreateManyAndReturnArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$EngineTierPayload<ExtArgs>, T, 'createManyAndReturn'>>

    /**
     * Delete a EngineTier.
     * @param {EngineTierDeleteArgs} args - Arguments to delete one EngineTier.
     * @example
     * // Delete one EngineTier
     * const EngineTier = await prisma.engineTier.delete({
     *   where: {
     *     // ... filter to delete one EngineTier
     *   }
     * })
     * 
    **/
    delete<T extends EngineTierDeleteArgs<ExtArgs>>(
      args: SelectSubset<T, EngineTierDeleteArgs<ExtArgs>>
    ): Prisma__EngineTierClient<$Result.GetResult<Prisma.$EngineTierPayload<ExtArgs>, T, 'delete'>, never, ExtArgs>

    /**
     * Update one EngineTier.
     * @param {EngineTierUpdateArgs} args - Arguments to update one EngineTier.
     * @example
     * // Update one EngineTier
     * const engineTier = await prisma.engineTier.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    update<T extends EngineTierUpdateArgs<ExtArgs>>(
      args: SelectSubset<T, EngineTierUpdateArgs<ExtArgs>>
    ): Prisma__EngineTierClient<$Result.GetResult<Prisma.$EngineTierPayload<ExtArgs>, T, 'update'>, never, ExtArgs>

    /**
     * Delete zero or more EngineTiers.
     * @param {EngineTierDeleteManyArgs} args - Arguments to filter EngineTiers to delete.
     * @example
     * // Delete a few EngineTiers
     * const { count } = await prisma.engineTier.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
    **/
    deleteMany<T extends EngineTierDeleteManyArgs<ExtArgs>>(
      args?: SelectSubset<T, EngineTierDeleteManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more EngineTiers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EngineTierUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many EngineTiers
     * const engineTier = await prisma.engineTier.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    updateMany<T extends EngineTierUpdateManyArgs<ExtArgs>>(
      args: SelectSubset<T, EngineTierUpdateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one EngineTier.
     * @param {EngineTierUpsertArgs} args - Arguments to update or create a EngineTier.
     * @example
     * // Update or create a EngineTier
     * const engineTier = await prisma.engineTier.upsert({
     *   create: {
     *     // ... data to create a EngineTier
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the EngineTier we want to update
     *   }
     * })
    **/
    upsert<T extends EngineTierUpsertArgs<ExtArgs>>(
      args: SelectSubset<T, EngineTierUpsertArgs<ExtArgs>>
    ): Prisma__EngineTierClient<$Result.GetResult<Prisma.$EngineTierPayload<ExtArgs>, T, 'upsert'>, never, ExtArgs>

    /**
     * Count the number of EngineTiers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EngineTierCountArgs} args - Arguments to filter EngineTiers to count.
     * @example
     * // Count the number of EngineTiers
     * const count = await prisma.engineTier.count({
     *   where: {
     *     // ... the filter for the EngineTiers we want to count
     *   }
     * })
    **/
    count<T extends EngineTierCountArgs>(
      args?: Subset<T, EngineTierCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], EngineTierCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a EngineTier.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EngineTierAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends EngineTierAggregateArgs>(args: Subset<T, EngineTierAggregateArgs>): Prisma.PrismaPromise<GetEngineTierAggregateType<T>>

    /**
     * Group by EngineTier.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EngineTierGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends EngineTierGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: EngineTierGroupByArgs['orderBy'] }
        : { orderBy?: EngineTierGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, EngineTierGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetEngineTierGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the EngineTier model
   */
  readonly fields: EngineTierFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for EngineTier.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__EngineTierClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: 'PrismaPromise';

    instances<T extends EngineTier$instancesArgs<ExtArgs> = {}>(args?: Subset<T, EngineTier$instancesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$InstancePayload<ExtArgs>, T, 'findMany'> | Null>;

    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>;
  }



  /**
   * Fields of the EngineTier model
   */ 
  interface EngineTierFieldRefs {
    readonly id: FieldRef<"EngineTier", 'String'>
    readonly name: FieldRef<"EngineTier", 'String'>
    readonly profile: FieldRef<"EngineTier", 'String'>
    readonly price: FieldRef<"EngineTier", 'Float'>
  }
    

  // Custom InputTypes
  /**
   * EngineTier findUnique
   */
  export type EngineTierFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EngineTier
     */
    select?: EngineTierSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EngineTierInclude<ExtArgs> | null
    /**
     * Filter, which EngineTier to fetch.
     */
    where: EngineTierWhereUniqueInput
  }

  /**
   * EngineTier findUniqueOrThrow
   */
  export type EngineTierFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EngineTier
     */
    select?: EngineTierSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EngineTierInclude<ExtArgs> | null
    /**
     * Filter, which EngineTier to fetch.
     */
    where: EngineTierWhereUniqueInput
  }

  /**
   * EngineTier findFirst
   */
  export type EngineTierFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EngineTier
     */
    select?: EngineTierSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EngineTierInclude<ExtArgs> | null
    /**
     * Filter, which EngineTier to fetch.
     */
    where?: EngineTierWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of EngineTiers to fetch.
     */
    orderBy?: EngineTierOrderByWithRelationInput | EngineTierOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for EngineTiers.
     */
    cursor?: EngineTierWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` EngineTiers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` EngineTiers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of EngineTiers.
     */
    distinct?: EngineTierScalarFieldEnum | EngineTierScalarFieldEnum[]
  }

  /**
   * EngineTier findFirstOrThrow
   */
  export type EngineTierFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EngineTier
     */
    select?: EngineTierSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EngineTierInclude<ExtArgs> | null
    /**
     * Filter, which EngineTier to fetch.
     */
    where?: EngineTierWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of EngineTiers to fetch.
     */
    orderBy?: EngineTierOrderByWithRelationInput | EngineTierOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for EngineTiers.
     */
    cursor?: EngineTierWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` EngineTiers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` EngineTiers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of EngineTiers.
     */
    distinct?: EngineTierScalarFieldEnum | EngineTierScalarFieldEnum[]
  }

  /**
   * EngineTier findMany
   */
  export type EngineTierFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EngineTier
     */
    select?: EngineTierSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EngineTierInclude<ExtArgs> | null
    /**
     * Filter, which EngineTiers to fetch.
     */
    where?: EngineTierWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of EngineTiers to fetch.
     */
    orderBy?: EngineTierOrderByWithRelationInput | EngineTierOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing EngineTiers.
     */
    cursor?: EngineTierWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` EngineTiers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` EngineTiers.
     */
    skip?: number
    distinct?: EngineTierScalarFieldEnum | EngineTierScalarFieldEnum[]
  }

  /**
   * EngineTier create
   */
  export type EngineTierCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EngineTier
     */
    select?: EngineTierSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EngineTierInclude<ExtArgs> | null
    /**
     * The data needed to create a EngineTier.
     */
    data: XOR<EngineTierCreateInput, EngineTierUncheckedCreateInput>
  }

  /**
   * EngineTier createMany
   */
  export type EngineTierCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many EngineTiers.
     */
    data: EngineTierCreateManyInput | EngineTierCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * EngineTier createManyAndReturn
   */
  export type EngineTierCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EngineTier
     */
    select?: EngineTierSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many EngineTiers.
     */
    data: EngineTierCreateManyInput | EngineTierCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * EngineTier update
   */
  export type EngineTierUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EngineTier
     */
    select?: EngineTierSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EngineTierInclude<ExtArgs> | null
    /**
     * The data needed to update a EngineTier.
     */
    data: XOR<EngineTierUpdateInput, EngineTierUncheckedUpdateInput>
    /**
     * Choose, which EngineTier to update.
     */
    where: EngineTierWhereUniqueInput
  }

  /**
   * EngineTier updateMany
   */
  export type EngineTierUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update EngineTiers.
     */
    data: XOR<EngineTierUpdateManyMutationInput, EngineTierUncheckedUpdateManyInput>
    /**
     * Filter which EngineTiers to update
     */
    where?: EngineTierWhereInput
  }

  /**
   * EngineTier upsert
   */
  export type EngineTierUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EngineTier
     */
    select?: EngineTierSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EngineTierInclude<ExtArgs> | null
    /**
     * The filter to search for the EngineTier to update in case it exists.
     */
    where: EngineTierWhereUniqueInput
    /**
     * In case the EngineTier found by the `where` argument doesn't exist, create a new EngineTier with this data.
     */
    create: XOR<EngineTierCreateInput, EngineTierUncheckedCreateInput>
    /**
     * In case the EngineTier was found with the provided `where` argument, update it with this data.
     */
    update: XOR<EngineTierUpdateInput, EngineTierUncheckedUpdateInput>
  }

  /**
   * EngineTier delete
   */
  export type EngineTierDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EngineTier
     */
    select?: EngineTierSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EngineTierInclude<ExtArgs> | null
    /**
     * Filter which EngineTier to delete.
     */
    where: EngineTierWhereUniqueInput
  }

  /**
   * EngineTier deleteMany
   */
  export type EngineTierDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which EngineTiers to delete
     */
    where?: EngineTierWhereInput
  }

  /**
   * EngineTier.instances
   */
  export type EngineTier$instancesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Instance
     */
    select?: InstanceSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstanceInclude<ExtArgs> | null
    where?: InstanceWhereInput
    orderBy?: InstanceOrderByWithRelationInput | InstanceOrderByWithRelationInput[]
    cursor?: InstanceWhereUniqueInput
    take?: number
    skip?: number
    distinct?: InstanceScalarFieldEnum | InstanceScalarFieldEnum[]
  }

  /**
   * EngineTier without action
   */
  export type EngineTierDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EngineTier
     */
    select?: EngineTierSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EngineTierInclude<ExtArgs> | null
  }


  /**
   * Model QpuTier
   */

  export type AggregateQpuTier = {
    _count: QpuTierCountAggregateOutputType | null
    _avg: QpuTierAvgAggregateOutputType | null
    _sum: QpuTierSumAggregateOutputType | null
    _min: QpuTierMinAggregateOutputType | null
    _max: QpuTierMaxAggregateOutputType | null
  }

  export type QpuTierAvgAggregateOutputType = {
    price: number | null
  }

  export type QpuTierSumAggregateOutputType = {
    price: number | null
  }

  export type QpuTierMinAggregateOutputType = {
    id: string | null
    name: string | null
    parallel: boolean | null
    price: number | null
  }

  export type QpuTierMaxAggregateOutputType = {
    id: string | null
    name: string | null
    parallel: boolean | null
    price: number | null
  }

  export type QpuTierCountAggregateOutputType = {
    id: number
    name: number
    parallel: number
    price: number
    _all: number
  }


  export type QpuTierAvgAggregateInputType = {
    price?: true
  }

  export type QpuTierSumAggregateInputType = {
    price?: true
  }

  export type QpuTierMinAggregateInputType = {
    id?: true
    name?: true
    parallel?: true
    price?: true
  }

  export type QpuTierMaxAggregateInputType = {
    id?: true
    name?: true
    parallel?: true
    price?: true
  }

  export type QpuTierCountAggregateInputType = {
    id?: true
    name?: true
    parallel?: true
    price?: true
    _all?: true
  }

  export type QpuTierAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which QpuTier to aggregate.
     */
    where?: QpuTierWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of QpuTiers to fetch.
     */
    orderBy?: QpuTierOrderByWithRelationInput | QpuTierOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: QpuTierWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` QpuTiers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` QpuTiers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned QpuTiers
    **/
    _count?: true | QpuTierCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: QpuTierAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: QpuTierSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: QpuTierMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: QpuTierMaxAggregateInputType
  }

  export type GetQpuTierAggregateType<T extends QpuTierAggregateArgs> = {
        [P in keyof T & keyof AggregateQpuTier]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateQpuTier[P]>
      : GetScalarType<T[P], AggregateQpuTier[P]>
  }




  export type QpuTierGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: QpuTierWhereInput
    orderBy?: QpuTierOrderByWithAggregationInput | QpuTierOrderByWithAggregationInput[]
    by: QpuTierScalarFieldEnum[] | QpuTierScalarFieldEnum
    having?: QpuTierScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: QpuTierCountAggregateInputType | true
    _avg?: QpuTierAvgAggregateInputType
    _sum?: QpuTierSumAggregateInputType
    _min?: QpuTierMinAggregateInputType
    _max?: QpuTierMaxAggregateInputType
  }

  export type QpuTierGroupByOutputType = {
    id: string
    name: string
    parallel: boolean
    price: number
    _count: QpuTierCountAggregateOutputType | null
    _avg: QpuTierAvgAggregateOutputType | null
    _sum: QpuTierSumAggregateOutputType | null
    _min: QpuTierMinAggregateOutputType | null
    _max: QpuTierMaxAggregateOutputType | null
  }

  type GetQpuTierGroupByPayload<T extends QpuTierGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<QpuTierGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof QpuTierGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], QpuTierGroupByOutputType[P]>
            : GetScalarType<T[P], QpuTierGroupByOutputType[P]>
        }
      >
    >


  export type QpuTierSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    parallel?: boolean
    price?: boolean
    instances?: boolean | QpuTier$instancesArgs<ExtArgs>
    _count?: boolean | QpuTierCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["qpuTier"]>

  export type QpuTierSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    parallel?: boolean
    price?: boolean
  }, ExtArgs["result"]["qpuTier"]>

  export type QpuTierSelectScalar = {
    id?: boolean
    name?: boolean
    parallel?: boolean
    price?: boolean
  }

  export type QpuTierInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    instances?: boolean | QpuTier$instancesArgs<ExtArgs>
    _count?: boolean | QpuTierCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type QpuTierIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $QpuTierPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "QpuTier"
    objects: {
      instances: Prisma.$InstancePayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      name: string
      parallel: boolean
      price: number
    }, ExtArgs["result"]["qpuTier"]>
    composites: {}
  }

  type QpuTierGetPayload<S extends boolean | null | undefined | QpuTierDefaultArgs> = $Result.GetResult<Prisma.$QpuTierPayload, S>

  type QpuTierCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<QpuTierFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: QpuTierCountAggregateInputType | true
    }

  export interface QpuTierDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['QpuTier'], meta: { name: 'QpuTier' } }
    /**
     * Find zero or one QpuTier that matches the filter.
     * @param {QpuTierFindUniqueArgs} args - Arguments to find a QpuTier
     * @example
     * // Get one QpuTier
     * const qpuTier = await prisma.qpuTier.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUnique<T extends QpuTierFindUniqueArgs<ExtArgs>>(
      args: SelectSubset<T, QpuTierFindUniqueArgs<ExtArgs>>
    ): Prisma__QpuTierClient<$Result.GetResult<Prisma.$QpuTierPayload<ExtArgs>, T, 'findUnique'> | null, null, ExtArgs>

    /**
     * Find one QpuTier that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {QpuTierFindUniqueOrThrowArgs} args - Arguments to find a QpuTier
     * @example
     * // Get one QpuTier
     * const qpuTier = await prisma.qpuTier.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUniqueOrThrow<T extends QpuTierFindUniqueOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, QpuTierFindUniqueOrThrowArgs<ExtArgs>>
    ): Prisma__QpuTierClient<$Result.GetResult<Prisma.$QpuTierPayload<ExtArgs>, T, 'findUniqueOrThrow'>, never, ExtArgs>

    /**
     * Find the first QpuTier that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {QpuTierFindFirstArgs} args - Arguments to find a QpuTier
     * @example
     * // Get one QpuTier
     * const qpuTier = await prisma.qpuTier.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirst<T extends QpuTierFindFirstArgs<ExtArgs>>(
      args?: SelectSubset<T, QpuTierFindFirstArgs<ExtArgs>>
    ): Prisma__QpuTierClient<$Result.GetResult<Prisma.$QpuTierPayload<ExtArgs>, T, 'findFirst'> | null, null, ExtArgs>

    /**
     * Find the first QpuTier that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {QpuTierFindFirstOrThrowArgs} args - Arguments to find a QpuTier
     * @example
     * // Get one QpuTier
     * const qpuTier = await prisma.qpuTier.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirstOrThrow<T extends QpuTierFindFirstOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, QpuTierFindFirstOrThrowArgs<ExtArgs>>
    ): Prisma__QpuTierClient<$Result.GetResult<Prisma.$QpuTierPayload<ExtArgs>, T, 'findFirstOrThrow'>, never, ExtArgs>

    /**
     * Find zero or more QpuTiers that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {QpuTierFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all QpuTiers
     * const qpuTiers = await prisma.qpuTier.findMany()
     * 
     * // Get first 10 QpuTiers
     * const qpuTiers = await prisma.qpuTier.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const qpuTierWithIdOnly = await prisma.qpuTier.findMany({ select: { id: true } })
     * 
    **/
    findMany<T extends QpuTierFindManyArgs<ExtArgs>>(
      args?: SelectSubset<T, QpuTierFindManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$QpuTierPayload<ExtArgs>, T, 'findMany'>>

    /**
     * Create a QpuTier.
     * @param {QpuTierCreateArgs} args - Arguments to create a QpuTier.
     * @example
     * // Create one QpuTier
     * const QpuTier = await prisma.qpuTier.create({
     *   data: {
     *     // ... data to create a QpuTier
     *   }
     * })
     * 
    **/
    create<T extends QpuTierCreateArgs<ExtArgs>>(
      args: SelectSubset<T, QpuTierCreateArgs<ExtArgs>>
    ): Prisma__QpuTierClient<$Result.GetResult<Prisma.$QpuTierPayload<ExtArgs>, T, 'create'>, never, ExtArgs>

    /**
     * Create many QpuTiers.
     * @param {QpuTierCreateManyArgs} args - Arguments to create many QpuTiers.
     * @example
     * // Create many QpuTiers
     * const qpuTier = await prisma.qpuTier.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
    **/
    createMany<T extends QpuTierCreateManyArgs<ExtArgs>>(
      args?: SelectSubset<T, QpuTierCreateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many QpuTiers and returns the data saved in the database.
     * @param {QpuTierCreateManyAndReturnArgs} args - Arguments to create many QpuTiers.
     * @example
     * // Create many QpuTiers
     * const qpuTier = await prisma.qpuTier.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many QpuTiers and only return the `id`
     * const qpuTierWithIdOnly = await prisma.qpuTier.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
    **/
    createManyAndReturn<T extends QpuTierCreateManyAndReturnArgs<ExtArgs>>(
      args?: SelectSubset<T, QpuTierCreateManyAndReturnArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$QpuTierPayload<ExtArgs>, T, 'createManyAndReturn'>>

    /**
     * Delete a QpuTier.
     * @param {QpuTierDeleteArgs} args - Arguments to delete one QpuTier.
     * @example
     * // Delete one QpuTier
     * const QpuTier = await prisma.qpuTier.delete({
     *   where: {
     *     // ... filter to delete one QpuTier
     *   }
     * })
     * 
    **/
    delete<T extends QpuTierDeleteArgs<ExtArgs>>(
      args: SelectSubset<T, QpuTierDeleteArgs<ExtArgs>>
    ): Prisma__QpuTierClient<$Result.GetResult<Prisma.$QpuTierPayload<ExtArgs>, T, 'delete'>, never, ExtArgs>

    /**
     * Update one QpuTier.
     * @param {QpuTierUpdateArgs} args - Arguments to update one QpuTier.
     * @example
     * // Update one QpuTier
     * const qpuTier = await prisma.qpuTier.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    update<T extends QpuTierUpdateArgs<ExtArgs>>(
      args: SelectSubset<T, QpuTierUpdateArgs<ExtArgs>>
    ): Prisma__QpuTierClient<$Result.GetResult<Prisma.$QpuTierPayload<ExtArgs>, T, 'update'>, never, ExtArgs>

    /**
     * Delete zero or more QpuTiers.
     * @param {QpuTierDeleteManyArgs} args - Arguments to filter QpuTiers to delete.
     * @example
     * // Delete a few QpuTiers
     * const { count } = await prisma.qpuTier.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
    **/
    deleteMany<T extends QpuTierDeleteManyArgs<ExtArgs>>(
      args?: SelectSubset<T, QpuTierDeleteManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more QpuTiers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {QpuTierUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many QpuTiers
     * const qpuTier = await prisma.qpuTier.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    updateMany<T extends QpuTierUpdateManyArgs<ExtArgs>>(
      args: SelectSubset<T, QpuTierUpdateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one QpuTier.
     * @param {QpuTierUpsertArgs} args - Arguments to update or create a QpuTier.
     * @example
     * // Update or create a QpuTier
     * const qpuTier = await prisma.qpuTier.upsert({
     *   create: {
     *     // ... data to create a QpuTier
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the QpuTier we want to update
     *   }
     * })
    **/
    upsert<T extends QpuTierUpsertArgs<ExtArgs>>(
      args: SelectSubset<T, QpuTierUpsertArgs<ExtArgs>>
    ): Prisma__QpuTierClient<$Result.GetResult<Prisma.$QpuTierPayload<ExtArgs>, T, 'upsert'>, never, ExtArgs>

    /**
     * Count the number of QpuTiers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {QpuTierCountArgs} args - Arguments to filter QpuTiers to count.
     * @example
     * // Count the number of QpuTiers
     * const count = await prisma.qpuTier.count({
     *   where: {
     *     // ... the filter for the QpuTiers we want to count
     *   }
     * })
    **/
    count<T extends QpuTierCountArgs>(
      args?: Subset<T, QpuTierCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], QpuTierCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a QpuTier.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {QpuTierAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends QpuTierAggregateArgs>(args: Subset<T, QpuTierAggregateArgs>): Prisma.PrismaPromise<GetQpuTierAggregateType<T>>

    /**
     * Group by QpuTier.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {QpuTierGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends QpuTierGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: QpuTierGroupByArgs['orderBy'] }
        : { orderBy?: QpuTierGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, QpuTierGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetQpuTierGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the QpuTier model
   */
  readonly fields: QpuTierFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for QpuTier.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__QpuTierClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: 'PrismaPromise';

    instances<T extends QpuTier$instancesArgs<ExtArgs> = {}>(args?: Subset<T, QpuTier$instancesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$InstancePayload<ExtArgs>, T, 'findMany'> | Null>;

    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>;
  }



  /**
   * Fields of the QpuTier model
   */ 
  interface QpuTierFieldRefs {
    readonly id: FieldRef<"QpuTier", 'String'>
    readonly name: FieldRef<"QpuTier", 'String'>
    readonly parallel: FieldRef<"QpuTier", 'Boolean'>
    readonly price: FieldRef<"QpuTier", 'Float'>
  }
    

  // Custom InputTypes
  /**
   * QpuTier findUnique
   */
  export type QpuTierFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the QpuTier
     */
    select?: QpuTierSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: QpuTierInclude<ExtArgs> | null
    /**
     * Filter, which QpuTier to fetch.
     */
    where: QpuTierWhereUniqueInput
  }

  /**
   * QpuTier findUniqueOrThrow
   */
  export type QpuTierFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the QpuTier
     */
    select?: QpuTierSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: QpuTierInclude<ExtArgs> | null
    /**
     * Filter, which QpuTier to fetch.
     */
    where: QpuTierWhereUniqueInput
  }

  /**
   * QpuTier findFirst
   */
  export type QpuTierFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the QpuTier
     */
    select?: QpuTierSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: QpuTierInclude<ExtArgs> | null
    /**
     * Filter, which QpuTier to fetch.
     */
    where?: QpuTierWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of QpuTiers to fetch.
     */
    orderBy?: QpuTierOrderByWithRelationInput | QpuTierOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for QpuTiers.
     */
    cursor?: QpuTierWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` QpuTiers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` QpuTiers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of QpuTiers.
     */
    distinct?: QpuTierScalarFieldEnum | QpuTierScalarFieldEnum[]
  }

  /**
   * QpuTier findFirstOrThrow
   */
  export type QpuTierFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the QpuTier
     */
    select?: QpuTierSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: QpuTierInclude<ExtArgs> | null
    /**
     * Filter, which QpuTier to fetch.
     */
    where?: QpuTierWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of QpuTiers to fetch.
     */
    orderBy?: QpuTierOrderByWithRelationInput | QpuTierOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for QpuTiers.
     */
    cursor?: QpuTierWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` QpuTiers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` QpuTiers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of QpuTiers.
     */
    distinct?: QpuTierScalarFieldEnum | QpuTierScalarFieldEnum[]
  }

  /**
   * QpuTier findMany
   */
  export type QpuTierFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the QpuTier
     */
    select?: QpuTierSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: QpuTierInclude<ExtArgs> | null
    /**
     * Filter, which QpuTiers to fetch.
     */
    where?: QpuTierWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of QpuTiers to fetch.
     */
    orderBy?: QpuTierOrderByWithRelationInput | QpuTierOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing QpuTiers.
     */
    cursor?: QpuTierWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` QpuTiers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` QpuTiers.
     */
    skip?: number
    distinct?: QpuTierScalarFieldEnum | QpuTierScalarFieldEnum[]
  }

  /**
   * QpuTier create
   */
  export type QpuTierCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the QpuTier
     */
    select?: QpuTierSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: QpuTierInclude<ExtArgs> | null
    /**
     * The data needed to create a QpuTier.
     */
    data: XOR<QpuTierCreateInput, QpuTierUncheckedCreateInput>
  }

  /**
   * QpuTier createMany
   */
  export type QpuTierCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many QpuTiers.
     */
    data: QpuTierCreateManyInput | QpuTierCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * QpuTier createManyAndReturn
   */
  export type QpuTierCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the QpuTier
     */
    select?: QpuTierSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many QpuTiers.
     */
    data: QpuTierCreateManyInput | QpuTierCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * QpuTier update
   */
  export type QpuTierUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the QpuTier
     */
    select?: QpuTierSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: QpuTierInclude<ExtArgs> | null
    /**
     * The data needed to update a QpuTier.
     */
    data: XOR<QpuTierUpdateInput, QpuTierUncheckedUpdateInput>
    /**
     * Choose, which QpuTier to update.
     */
    where: QpuTierWhereUniqueInput
  }

  /**
   * QpuTier updateMany
   */
  export type QpuTierUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update QpuTiers.
     */
    data: XOR<QpuTierUpdateManyMutationInput, QpuTierUncheckedUpdateManyInput>
    /**
     * Filter which QpuTiers to update
     */
    where?: QpuTierWhereInput
  }

  /**
   * QpuTier upsert
   */
  export type QpuTierUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the QpuTier
     */
    select?: QpuTierSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: QpuTierInclude<ExtArgs> | null
    /**
     * The filter to search for the QpuTier to update in case it exists.
     */
    where: QpuTierWhereUniqueInput
    /**
     * In case the QpuTier found by the `where` argument doesn't exist, create a new QpuTier with this data.
     */
    create: XOR<QpuTierCreateInput, QpuTierUncheckedCreateInput>
    /**
     * In case the QpuTier was found with the provided `where` argument, update it with this data.
     */
    update: XOR<QpuTierUpdateInput, QpuTierUncheckedUpdateInput>
  }

  /**
   * QpuTier delete
   */
  export type QpuTierDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the QpuTier
     */
    select?: QpuTierSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: QpuTierInclude<ExtArgs> | null
    /**
     * Filter which QpuTier to delete.
     */
    where: QpuTierWhereUniqueInput
  }

  /**
   * QpuTier deleteMany
   */
  export type QpuTierDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which QpuTiers to delete
     */
    where?: QpuTierWhereInput
  }

  /**
   * QpuTier.instances
   */
  export type QpuTier$instancesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Instance
     */
    select?: InstanceSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstanceInclude<ExtArgs> | null
    where?: InstanceWhereInput
    orderBy?: InstanceOrderByWithRelationInput | InstanceOrderByWithRelationInput[]
    cursor?: InstanceWhereUniqueInput
    take?: number
    skip?: number
    distinct?: InstanceScalarFieldEnum | InstanceScalarFieldEnum[]
  }

  /**
   * QpuTier without action
   */
  export type QpuTierDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the QpuTier
     */
    select?: QpuTierSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: QpuTierInclude<ExtArgs> | null
  }


  /**
   * Model OmegaTier
   */

  export type AggregateOmegaTier = {
    _count: OmegaTierCountAggregateOutputType | null
    _avg: OmegaTierAvgAggregateOutputType | null
    _sum: OmegaTierSumAggregateOutputType | null
    _min: OmegaTierMinAggregateOutputType | null
    _max: OmegaTierMaxAggregateOutputType | null
  }

  export type OmegaTierAvgAggregateOutputType = {
    price: number | null
  }

  export type OmegaTierSumAggregateOutputType = {
    price: number | null
  }

  export type OmegaTierMinAggregateOutputType = {
    id: string | null
    name: string | null
    cognitive: boolean | null
    price: number | null
  }

  export type OmegaTierMaxAggregateOutputType = {
    id: string | null
    name: string | null
    cognitive: boolean | null
    price: number | null
  }

  export type OmegaTierCountAggregateOutputType = {
    id: number
    name: number
    cognitive: number
    price: number
    _all: number
  }


  export type OmegaTierAvgAggregateInputType = {
    price?: true
  }

  export type OmegaTierSumAggregateInputType = {
    price?: true
  }

  export type OmegaTierMinAggregateInputType = {
    id?: true
    name?: true
    cognitive?: true
    price?: true
  }

  export type OmegaTierMaxAggregateInputType = {
    id?: true
    name?: true
    cognitive?: true
    price?: true
  }

  export type OmegaTierCountAggregateInputType = {
    id?: true
    name?: true
    cognitive?: true
    price?: true
    _all?: true
  }

  export type OmegaTierAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which OmegaTier to aggregate.
     */
    where?: OmegaTierWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of OmegaTiers to fetch.
     */
    orderBy?: OmegaTierOrderByWithRelationInput | OmegaTierOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: OmegaTierWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` OmegaTiers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` OmegaTiers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned OmegaTiers
    **/
    _count?: true | OmegaTierCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: OmegaTierAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: OmegaTierSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: OmegaTierMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: OmegaTierMaxAggregateInputType
  }

  export type GetOmegaTierAggregateType<T extends OmegaTierAggregateArgs> = {
        [P in keyof T & keyof AggregateOmegaTier]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateOmegaTier[P]>
      : GetScalarType<T[P], AggregateOmegaTier[P]>
  }




  export type OmegaTierGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: OmegaTierWhereInput
    orderBy?: OmegaTierOrderByWithAggregationInput | OmegaTierOrderByWithAggregationInput[]
    by: OmegaTierScalarFieldEnum[] | OmegaTierScalarFieldEnum
    having?: OmegaTierScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: OmegaTierCountAggregateInputType | true
    _avg?: OmegaTierAvgAggregateInputType
    _sum?: OmegaTierSumAggregateInputType
    _min?: OmegaTierMinAggregateInputType
    _max?: OmegaTierMaxAggregateInputType
  }

  export type OmegaTierGroupByOutputType = {
    id: string
    name: string
    cognitive: boolean
    price: number
    _count: OmegaTierCountAggregateOutputType | null
    _avg: OmegaTierAvgAggregateOutputType | null
    _sum: OmegaTierSumAggregateOutputType | null
    _min: OmegaTierMinAggregateOutputType | null
    _max: OmegaTierMaxAggregateOutputType | null
  }

  type GetOmegaTierGroupByPayload<T extends OmegaTierGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<OmegaTierGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof OmegaTierGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], OmegaTierGroupByOutputType[P]>
            : GetScalarType<T[P], OmegaTierGroupByOutputType[P]>
        }
      >
    >


  export type OmegaTierSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    cognitive?: boolean
    price?: boolean
    instances?: boolean | OmegaTier$instancesArgs<ExtArgs>
    _count?: boolean | OmegaTierCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["omegaTier"]>

  export type OmegaTierSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    cognitive?: boolean
    price?: boolean
  }, ExtArgs["result"]["omegaTier"]>

  export type OmegaTierSelectScalar = {
    id?: boolean
    name?: boolean
    cognitive?: boolean
    price?: boolean
  }

  export type OmegaTierInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    instances?: boolean | OmegaTier$instancesArgs<ExtArgs>
    _count?: boolean | OmegaTierCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type OmegaTierIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $OmegaTierPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "OmegaTier"
    objects: {
      instances: Prisma.$InstancePayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      name: string
      cognitive: boolean
      price: number
    }, ExtArgs["result"]["omegaTier"]>
    composites: {}
  }

  type OmegaTierGetPayload<S extends boolean | null | undefined | OmegaTierDefaultArgs> = $Result.GetResult<Prisma.$OmegaTierPayload, S>

  type OmegaTierCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<OmegaTierFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: OmegaTierCountAggregateInputType | true
    }

  export interface OmegaTierDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['OmegaTier'], meta: { name: 'OmegaTier' } }
    /**
     * Find zero or one OmegaTier that matches the filter.
     * @param {OmegaTierFindUniqueArgs} args - Arguments to find a OmegaTier
     * @example
     * // Get one OmegaTier
     * const omegaTier = await prisma.omegaTier.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUnique<T extends OmegaTierFindUniqueArgs<ExtArgs>>(
      args: SelectSubset<T, OmegaTierFindUniqueArgs<ExtArgs>>
    ): Prisma__OmegaTierClient<$Result.GetResult<Prisma.$OmegaTierPayload<ExtArgs>, T, 'findUnique'> | null, null, ExtArgs>

    /**
     * Find one OmegaTier that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {OmegaTierFindUniqueOrThrowArgs} args - Arguments to find a OmegaTier
     * @example
     * // Get one OmegaTier
     * const omegaTier = await prisma.omegaTier.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUniqueOrThrow<T extends OmegaTierFindUniqueOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, OmegaTierFindUniqueOrThrowArgs<ExtArgs>>
    ): Prisma__OmegaTierClient<$Result.GetResult<Prisma.$OmegaTierPayload<ExtArgs>, T, 'findUniqueOrThrow'>, never, ExtArgs>

    /**
     * Find the first OmegaTier that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OmegaTierFindFirstArgs} args - Arguments to find a OmegaTier
     * @example
     * // Get one OmegaTier
     * const omegaTier = await prisma.omegaTier.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirst<T extends OmegaTierFindFirstArgs<ExtArgs>>(
      args?: SelectSubset<T, OmegaTierFindFirstArgs<ExtArgs>>
    ): Prisma__OmegaTierClient<$Result.GetResult<Prisma.$OmegaTierPayload<ExtArgs>, T, 'findFirst'> | null, null, ExtArgs>

    /**
     * Find the first OmegaTier that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OmegaTierFindFirstOrThrowArgs} args - Arguments to find a OmegaTier
     * @example
     * // Get one OmegaTier
     * const omegaTier = await prisma.omegaTier.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirstOrThrow<T extends OmegaTierFindFirstOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, OmegaTierFindFirstOrThrowArgs<ExtArgs>>
    ): Prisma__OmegaTierClient<$Result.GetResult<Prisma.$OmegaTierPayload<ExtArgs>, T, 'findFirstOrThrow'>, never, ExtArgs>

    /**
     * Find zero or more OmegaTiers that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OmegaTierFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all OmegaTiers
     * const omegaTiers = await prisma.omegaTier.findMany()
     * 
     * // Get first 10 OmegaTiers
     * const omegaTiers = await prisma.omegaTier.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const omegaTierWithIdOnly = await prisma.omegaTier.findMany({ select: { id: true } })
     * 
    **/
    findMany<T extends OmegaTierFindManyArgs<ExtArgs>>(
      args?: SelectSubset<T, OmegaTierFindManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$OmegaTierPayload<ExtArgs>, T, 'findMany'>>

    /**
     * Create a OmegaTier.
     * @param {OmegaTierCreateArgs} args - Arguments to create a OmegaTier.
     * @example
     * // Create one OmegaTier
     * const OmegaTier = await prisma.omegaTier.create({
     *   data: {
     *     // ... data to create a OmegaTier
     *   }
     * })
     * 
    **/
    create<T extends OmegaTierCreateArgs<ExtArgs>>(
      args: SelectSubset<T, OmegaTierCreateArgs<ExtArgs>>
    ): Prisma__OmegaTierClient<$Result.GetResult<Prisma.$OmegaTierPayload<ExtArgs>, T, 'create'>, never, ExtArgs>

    /**
     * Create many OmegaTiers.
     * @param {OmegaTierCreateManyArgs} args - Arguments to create many OmegaTiers.
     * @example
     * // Create many OmegaTiers
     * const omegaTier = await prisma.omegaTier.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
    **/
    createMany<T extends OmegaTierCreateManyArgs<ExtArgs>>(
      args?: SelectSubset<T, OmegaTierCreateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many OmegaTiers and returns the data saved in the database.
     * @param {OmegaTierCreateManyAndReturnArgs} args - Arguments to create many OmegaTiers.
     * @example
     * // Create many OmegaTiers
     * const omegaTier = await prisma.omegaTier.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many OmegaTiers and only return the `id`
     * const omegaTierWithIdOnly = await prisma.omegaTier.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
    **/
    createManyAndReturn<T extends OmegaTierCreateManyAndReturnArgs<ExtArgs>>(
      args?: SelectSubset<T, OmegaTierCreateManyAndReturnArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$OmegaTierPayload<ExtArgs>, T, 'createManyAndReturn'>>

    /**
     * Delete a OmegaTier.
     * @param {OmegaTierDeleteArgs} args - Arguments to delete one OmegaTier.
     * @example
     * // Delete one OmegaTier
     * const OmegaTier = await prisma.omegaTier.delete({
     *   where: {
     *     // ... filter to delete one OmegaTier
     *   }
     * })
     * 
    **/
    delete<T extends OmegaTierDeleteArgs<ExtArgs>>(
      args: SelectSubset<T, OmegaTierDeleteArgs<ExtArgs>>
    ): Prisma__OmegaTierClient<$Result.GetResult<Prisma.$OmegaTierPayload<ExtArgs>, T, 'delete'>, never, ExtArgs>

    /**
     * Update one OmegaTier.
     * @param {OmegaTierUpdateArgs} args - Arguments to update one OmegaTier.
     * @example
     * // Update one OmegaTier
     * const omegaTier = await prisma.omegaTier.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    update<T extends OmegaTierUpdateArgs<ExtArgs>>(
      args: SelectSubset<T, OmegaTierUpdateArgs<ExtArgs>>
    ): Prisma__OmegaTierClient<$Result.GetResult<Prisma.$OmegaTierPayload<ExtArgs>, T, 'update'>, never, ExtArgs>

    /**
     * Delete zero or more OmegaTiers.
     * @param {OmegaTierDeleteManyArgs} args - Arguments to filter OmegaTiers to delete.
     * @example
     * // Delete a few OmegaTiers
     * const { count } = await prisma.omegaTier.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
    **/
    deleteMany<T extends OmegaTierDeleteManyArgs<ExtArgs>>(
      args?: SelectSubset<T, OmegaTierDeleteManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more OmegaTiers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OmegaTierUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many OmegaTiers
     * const omegaTier = await prisma.omegaTier.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    updateMany<T extends OmegaTierUpdateManyArgs<ExtArgs>>(
      args: SelectSubset<T, OmegaTierUpdateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one OmegaTier.
     * @param {OmegaTierUpsertArgs} args - Arguments to update or create a OmegaTier.
     * @example
     * // Update or create a OmegaTier
     * const omegaTier = await prisma.omegaTier.upsert({
     *   create: {
     *     // ... data to create a OmegaTier
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the OmegaTier we want to update
     *   }
     * })
    **/
    upsert<T extends OmegaTierUpsertArgs<ExtArgs>>(
      args: SelectSubset<T, OmegaTierUpsertArgs<ExtArgs>>
    ): Prisma__OmegaTierClient<$Result.GetResult<Prisma.$OmegaTierPayload<ExtArgs>, T, 'upsert'>, never, ExtArgs>

    /**
     * Count the number of OmegaTiers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OmegaTierCountArgs} args - Arguments to filter OmegaTiers to count.
     * @example
     * // Count the number of OmegaTiers
     * const count = await prisma.omegaTier.count({
     *   where: {
     *     // ... the filter for the OmegaTiers we want to count
     *   }
     * })
    **/
    count<T extends OmegaTierCountArgs>(
      args?: Subset<T, OmegaTierCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], OmegaTierCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a OmegaTier.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OmegaTierAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends OmegaTierAggregateArgs>(args: Subset<T, OmegaTierAggregateArgs>): Prisma.PrismaPromise<GetOmegaTierAggregateType<T>>

    /**
     * Group by OmegaTier.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OmegaTierGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends OmegaTierGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: OmegaTierGroupByArgs['orderBy'] }
        : { orderBy?: OmegaTierGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, OmegaTierGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetOmegaTierGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the OmegaTier model
   */
  readonly fields: OmegaTierFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for OmegaTier.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__OmegaTierClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: 'PrismaPromise';

    instances<T extends OmegaTier$instancesArgs<ExtArgs> = {}>(args?: Subset<T, OmegaTier$instancesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$InstancePayload<ExtArgs>, T, 'findMany'> | Null>;

    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>;
  }



  /**
   * Fields of the OmegaTier model
   */ 
  interface OmegaTierFieldRefs {
    readonly id: FieldRef<"OmegaTier", 'String'>
    readonly name: FieldRef<"OmegaTier", 'String'>
    readonly cognitive: FieldRef<"OmegaTier", 'Boolean'>
    readonly price: FieldRef<"OmegaTier", 'Float'>
  }
    

  // Custom InputTypes
  /**
   * OmegaTier findUnique
   */
  export type OmegaTierFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OmegaTier
     */
    select?: OmegaTierSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OmegaTierInclude<ExtArgs> | null
    /**
     * Filter, which OmegaTier to fetch.
     */
    where: OmegaTierWhereUniqueInput
  }

  /**
   * OmegaTier findUniqueOrThrow
   */
  export type OmegaTierFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OmegaTier
     */
    select?: OmegaTierSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OmegaTierInclude<ExtArgs> | null
    /**
     * Filter, which OmegaTier to fetch.
     */
    where: OmegaTierWhereUniqueInput
  }

  /**
   * OmegaTier findFirst
   */
  export type OmegaTierFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OmegaTier
     */
    select?: OmegaTierSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OmegaTierInclude<ExtArgs> | null
    /**
     * Filter, which OmegaTier to fetch.
     */
    where?: OmegaTierWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of OmegaTiers to fetch.
     */
    orderBy?: OmegaTierOrderByWithRelationInput | OmegaTierOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for OmegaTiers.
     */
    cursor?: OmegaTierWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` OmegaTiers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` OmegaTiers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of OmegaTiers.
     */
    distinct?: OmegaTierScalarFieldEnum | OmegaTierScalarFieldEnum[]
  }

  /**
   * OmegaTier findFirstOrThrow
   */
  export type OmegaTierFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OmegaTier
     */
    select?: OmegaTierSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OmegaTierInclude<ExtArgs> | null
    /**
     * Filter, which OmegaTier to fetch.
     */
    where?: OmegaTierWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of OmegaTiers to fetch.
     */
    orderBy?: OmegaTierOrderByWithRelationInput | OmegaTierOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for OmegaTiers.
     */
    cursor?: OmegaTierWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` OmegaTiers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` OmegaTiers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of OmegaTiers.
     */
    distinct?: OmegaTierScalarFieldEnum | OmegaTierScalarFieldEnum[]
  }

  /**
   * OmegaTier findMany
   */
  export type OmegaTierFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OmegaTier
     */
    select?: OmegaTierSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OmegaTierInclude<ExtArgs> | null
    /**
     * Filter, which OmegaTiers to fetch.
     */
    where?: OmegaTierWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of OmegaTiers to fetch.
     */
    orderBy?: OmegaTierOrderByWithRelationInput | OmegaTierOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing OmegaTiers.
     */
    cursor?: OmegaTierWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` OmegaTiers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` OmegaTiers.
     */
    skip?: number
    distinct?: OmegaTierScalarFieldEnum | OmegaTierScalarFieldEnum[]
  }

  /**
   * OmegaTier create
   */
  export type OmegaTierCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OmegaTier
     */
    select?: OmegaTierSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OmegaTierInclude<ExtArgs> | null
    /**
     * The data needed to create a OmegaTier.
     */
    data: XOR<OmegaTierCreateInput, OmegaTierUncheckedCreateInput>
  }

  /**
   * OmegaTier createMany
   */
  export type OmegaTierCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many OmegaTiers.
     */
    data: OmegaTierCreateManyInput | OmegaTierCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * OmegaTier createManyAndReturn
   */
  export type OmegaTierCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OmegaTier
     */
    select?: OmegaTierSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many OmegaTiers.
     */
    data: OmegaTierCreateManyInput | OmegaTierCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * OmegaTier update
   */
  export type OmegaTierUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OmegaTier
     */
    select?: OmegaTierSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OmegaTierInclude<ExtArgs> | null
    /**
     * The data needed to update a OmegaTier.
     */
    data: XOR<OmegaTierUpdateInput, OmegaTierUncheckedUpdateInput>
    /**
     * Choose, which OmegaTier to update.
     */
    where: OmegaTierWhereUniqueInput
  }

  /**
   * OmegaTier updateMany
   */
  export type OmegaTierUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update OmegaTiers.
     */
    data: XOR<OmegaTierUpdateManyMutationInput, OmegaTierUncheckedUpdateManyInput>
    /**
     * Filter which OmegaTiers to update
     */
    where?: OmegaTierWhereInput
  }

  /**
   * OmegaTier upsert
   */
  export type OmegaTierUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OmegaTier
     */
    select?: OmegaTierSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OmegaTierInclude<ExtArgs> | null
    /**
     * The filter to search for the OmegaTier to update in case it exists.
     */
    where: OmegaTierWhereUniqueInput
    /**
     * In case the OmegaTier found by the `where` argument doesn't exist, create a new OmegaTier with this data.
     */
    create: XOR<OmegaTierCreateInput, OmegaTierUncheckedCreateInput>
    /**
     * In case the OmegaTier was found with the provided `where` argument, update it with this data.
     */
    update: XOR<OmegaTierUpdateInput, OmegaTierUncheckedUpdateInput>
  }

  /**
   * OmegaTier delete
   */
  export type OmegaTierDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OmegaTier
     */
    select?: OmegaTierSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OmegaTierInclude<ExtArgs> | null
    /**
     * Filter which OmegaTier to delete.
     */
    where: OmegaTierWhereUniqueInput
  }

  /**
   * OmegaTier deleteMany
   */
  export type OmegaTierDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which OmegaTiers to delete
     */
    where?: OmegaTierWhereInput
  }

  /**
   * OmegaTier.instances
   */
  export type OmegaTier$instancesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Instance
     */
    select?: InstanceSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstanceInclude<ExtArgs> | null
    where?: InstanceWhereInput
    orderBy?: InstanceOrderByWithRelationInput | InstanceOrderByWithRelationInput[]
    cursor?: InstanceWhereUniqueInput
    take?: number
    skip?: number
    distinct?: InstanceScalarFieldEnum | InstanceScalarFieldEnum[]
  }

  /**
   * OmegaTier without action
   */
  export type OmegaTierDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OmegaTier
     */
    select?: OmegaTierSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OmegaTierInclude<ExtArgs> | null
  }


  /**
   * Model Snapshot
   */

  export type AggregateSnapshot = {
    _count: SnapshotCountAggregateOutputType | null
    _min: SnapshotMinAggregateOutputType | null
    _max: SnapshotMaxAggregateOutputType | null
  }

  export type SnapshotMinAggregateOutputType = {
    id: string | null
    instanceId: string | null
    createdAt: Date | null
  }

  export type SnapshotMaxAggregateOutputType = {
    id: string | null
    instanceId: string | null
    createdAt: Date | null
  }

  export type SnapshotCountAggregateOutputType = {
    id: number
    instanceId: number
    metadata: number
    createdAt: number
    _all: number
  }


  export type SnapshotMinAggregateInputType = {
    id?: true
    instanceId?: true
    createdAt?: true
  }

  export type SnapshotMaxAggregateInputType = {
    id?: true
    instanceId?: true
    createdAt?: true
  }

  export type SnapshotCountAggregateInputType = {
    id?: true
    instanceId?: true
    metadata?: true
    createdAt?: true
    _all?: true
  }

  export type SnapshotAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Snapshot to aggregate.
     */
    where?: SnapshotWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Snapshots to fetch.
     */
    orderBy?: SnapshotOrderByWithRelationInput | SnapshotOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: SnapshotWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Snapshots from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Snapshots.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Snapshots
    **/
    _count?: true | SnapshotCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: SnapshotMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: SnapshotMaxAggregateInputType
  }

  export type GetSnapshotAggregateType<T extends SnapshotAggregateArgs> = {
        [P in keyof T & keyof AggregateSnapshot]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateSnapshot[P]>
      : GetScalarType<T[P], AggregateSnapshot[P]>
  }




  export type SnapshotGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SnapshotWhereInput
    orderBy?: SnapshotOrderByWithAggregationInput | SnapshotOrderByWithAggregationInput[]
    by: SnapshotScalarFieldEnum[] | SnapshotScalarFieldEnum
    having?: SnapshotScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: SnapshotCountAggregateInputType | true
    _min?: SnapshotMinAggregateInputType
    _max?: SnapshotMaxAggregateInputType
  }

  export type SnapshotGroupByOutputType = {
    id: string
    instanceId: string
    metadata: JsonValue
    createdAt: Date
    _count: SnapshotCountAggregateOutputType | null
    _min: SnapshotMinAggregateOutputType | null
    _max: SnapshotMaxAggregateOutputType | null
  }

  type GetSnapshotGroupByPayload<T extends SnapshotGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<SnapshotGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof SnapshotGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], SnapshotGroupByOutputType[P]>
            : GetScalarType<T[P], SnapshotGroupByOutputType[P]>
        }
      >
    >


  export type SnapshotSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    instanceId?: boolean
    metadata?: boolean
    createdAt?: boolean
    instance?: boolean | InstanceDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["snapshot"]>

  export type SnapshotSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    instanceId?: boolean
    metadata?: boolean
    createdAt?: boolean
    instance?: boolean | InstanceDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["snapshot"]>

  export type SnapshotSelectScalar = {
    id?: boolean
    instanceId?: boolean
    metadata?: boolean
    createdAt?: boolean
  }

  export type SnapshotInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    instance?: boolean | InstanceDefaultArgs<ExtArgs>
  }
  export type SnapshotIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    instance?: boolean | InstanceDefaultArgs<ExtArgs>
  }

  export type $SnapshotPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Snapshot"
    objects: {
      instance: Prisma.$InstancePayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      instanceId: string
      metadata: Prisma.JsonValue
      createdAt: Date
    }, ExtArgs["result"]["snapshot"]>
    composites: {}
  }

  type SnapshotGetPayload<S extends boolean | null | undefined | SnapshotDefaultArgs> = $Result.GetResult<Prisma.$SnapshotPayload, S>

  type SnapshotCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<SnapshotFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: SnapshotCountAggregateInputType | true
    }

  export interface SnapshotDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Snapshot'], meta: { name: 'Snapshot' } }
    /**
     * Find zero or one Snapshot that matches the filter.
     * @param {SnapshotFindUniqueArgs} args - Arguments to find a Snapshot
     * @example
     * // Get one Snapshot
     * const snapshot = await prisma.snapshot.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUnique<T extends SnapshotFindUniqueArgs<ExtArgs>>(
      args: SelectSubset<T, SnapshotFindUniqueArgs<ExtArgs>>
    ): Prisma__SnapshotClient<$Result.GetResult<Prisma.$SnapshotPayload<ExtArgs>, T, 'findUnique'> | null, null, ExtArgs>

    /**
     * Find one Snapshot that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {SnapshotFindUniqueOrThrowArgs} args - Arguments to find a Snapshot
     * @example
     * // Get one Snapshot
     * const snapshot = await prisma.snapshot.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUniqueOrThrow<T extends SnapshotFindUniqueOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, SnapshotFindUniqueOrThrowArgs<ExtArgs>>
    ): Prisma__SnapshotClient<$Result.GetResult<Prisma.$SnapshotPayload<ExtArgs>, T, 'findUniqueOrThrow'>, never, ExtArgs>

    /**
     * Find the first Snapshot that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SnapshotFindFirstArgs} args - Arguments to find a Snapshot
     * @example
     * // Get one Snapshot
     * const snapshot = await prisma.snapshot.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirst<T extends SnapshotFindFirstArgs<ExtArgs>>(
      args?: SelectSubset<T, SnapshotFindFirstArgs<ExtArgs>>
    ): Prisma__SnapshotClient<$Result.GetResult<Prisma.$SnapshotPayload<ExtArgs>, T, 'findFirst'> | null, null, ExtArgs>

    /**
     * Find the first Snapshot that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SnapshotFindFirstOrThrowArgs} args - Arguments to find a Snapshot
     * @example
     * // Get one Snapshot
     * const snapshot = await prisma.snapshot.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirstOrThrow<T extends SnapshotFindFirstOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, SnapshotFindFirstOrThrowArgs<ExtArgs>>
    ): Prisma__SnapshotClient<$Result.GetResult<Prisma.$SnapshotPayload<ExtArgs>, T, 'findFirstOrThrow'>, never, ExtArgs>

    /**
     * Find zero or more Snapshots that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SnapshotFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Snapshots
     * const snapshots = await prisma.snapshot.findMany()
     * 
     * // Get first 10 Snapshots
     * const snapshots = await prisma.snapshot.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const snapshotWithIdOnly = await prisma.snapshot.findMany({ select: { id: true } })
     * 
    **/
    findMany<T extends SnapshotFindManyArgs<ExtArgs>>(
      args?: SelectSubset<T, SnapshotFindManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SnapshotPayload<ExtArgs>, T, 'findMany'>>

    /**
     * Create a Snapshot.
     * @param {SnapshotCreateArgs} args - Arguments to create a Snapshot.
     * @example
     * // Create one Snapshot
     * const Snapshot = await prisma.snapshot.create({
     *   data: {
     *     // ... data to create a Snapshot
     *   }
     * })
     * 
    **/
    create<T extends SnapshotCreateArgs<ExtArgs>>(
      args: SelectSubset<T, SnapshotCreateArgs<ExtArgs>>
    ): Prisma__SnapshotClient<$Result.GetResult<Prisma.$SnapshotPayload<ExtArgs>, T, 'create'>, never, ExtArgs>

    /**
     * Create many Snapshots.
     * @param {SnapshotCreateManyArgs} args - Arguments to create many Snapshots.
     * @example
     * // Create many Snapshots
     * const snapshot = await prisma.snapshot.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
    **/
    createMany<T extends SnapshotCreateManyArgs<ExtArgs>>(
      args?: SelectSubset<T, SnapshotCreateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Snapshots and returns the data saved in the database.
     * @param {SnapshotCreateManyAndReturnArgs} args - Arguments to create many Snapshots.
     * @example
     * // Create many Snapshots
     * const snapshot = await prisma.snapshot.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Snapshots and only return the `id`
     * const snapshotWithIdOnly = await prisma.snapshot.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
    **/
    createManyAndReturn<T extends SnapshotCreateManyAndReturnArgs<ExtArgs>>(
      args?: SelectSubset<T, SnapshotCreateManyAndReturnArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SnapshotPayload<ExtArgs>, T, 'createManyAndReturn'>>

    /**
     * Delete a Snapshot.
     * @param {SnapshotDeleteArgs} args - Arguments to delete one Snapshot.
     * @example
     * // Delete one Snapshot
     * const Snapshot = await prisma.snapshot.delete({
     *   where: {
     *     // ... filter to delete one Snapshot
     *   }
     * })
     * 
    **/
    delete<T extends SnapshotDeleteArgs<ExtArgs>>(
      args: SelectSubset<T, SnapshotDeleteArgs<ExtArgs>>
    ): Prisma__SnapshotClient<$Result.GetResult<Prisma.$SnapshotPayload<ExtArgs>, T, 'delete'>, never, ExtArgs>

    /**
     * Update one Snapshot.
     * @param {SnapshotUpdateArgs} args - Arguments to update one Snapshot.
     * @example
     * // Update one Snapshot
     * const snapshot = await prisma.snapshot.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    update<T extends SnapshotUpdateArgs<ExtArgs>>(
      args: SelectSubset<T, SnapshotUpdateArgs<ExtArgs>>
    ): Prisma__SnapshotClient<$Result.GetResult<Prisma.$SnapshotPayload<ExtArgs>, T, 'update'>, never, ExtArgs>

    /**
     * Delete zero or more Snapshots.
     * @param {SnapshotDeleteManyArgs} args - Arguments to filter Snapshots to delete.
     * @example
     * // Delete a few Snapshots
     * const { count } = await prisma.snapshot.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
    **/
    deleteMany<T extends SnapshotDeleteManyArgs<ExtArgs>>(
      args?: SelectSubset<T, SnapshotDeleteManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Snapshots.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SnapshotUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Snapshots
     * const snapshot = await prisma.snapshot.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    updateMany<T extends SnapshotUpdateManyArgs<ExtArgs>>(
      args: SelectSubset<T, SnapshotUpdateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Snapshot.
     * @param {SnapshotUpsertArgs} args - Arguments to update or create a Snapshot.
     * @example
     * // Update or create a Snapshot
     * const snapshot = await prisma.snapshot.upsert({
     *   create: {
     *     // ... data to create a Snapshot
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Snapshot we want to update
     *   }
     * })
    **/
    upsert<T extends SnapshotUpsertArgs<ExtArgs>>(
      args: SelectSubset<T, SnapshotUpsertArgs<ExtArgs>>
    ): Prisma__SnapshotClient<$Result.GetResult<Prisma.$SnapshotPayload<ExtArgs>, T, 'upsert'>, never, ExtArgs>

    /**
     * Count the number of Snapshots.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SnapshotCountArgs} args - Arguments to filter Snapshots to count.
     * @example
     * // Count the number of Snapshots
     * const count = await prisma.snapshot.count({
     *   where: {
     *     // ... the filter for the Snapshots we want to count
     *   }
     * })
    **/
    count<T extends SnapshotCountArgs>(
      args?: Subset<T, SnapshotCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], SnapshotCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Snapshot.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SnapshotAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends SnapshotAggregateArgs>(args: Subset<T, SnapshotAggregateArgs>): Prisma.PrismaPromise<GetSnapshotAggregateType<T>>

    /**
     * Group by Snapshot.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SnapshotGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends SnapshotGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: SnapshotGroupByArgs['orderBy'] }
        : { orderBy?: SnapshotGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, SnapshotGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetSnapshotGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Snapshot model
   */
  readonly fields: SnapshotFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Snapshot.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__SnapshotClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: 'PrismaPromise';

    instance<T extends InstanceDefaultArgs<ExtArgs> = {}>(args?: Subset<T, InstanceDefaultArgs<ExtArgs>>): Prisma__InstanceClient<$Result.GetResult<Prisma.$InstancePayload<ExtArgs>, T, 'findUniqueOrThrow'> | Null, Null, ExtArgs>;

    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>;
  }



  /**
   * Fields of the Snapshot model
   */ 
  interface SnapshotFieldRefs {
    readonly id: FieldRef<"Snapshot", 'String'>
    readonly instanceId: FieldRef<"Snapshot", 'String'>
    readonly metadata: FieldRef<"Snapshot", 'Json'>
    readonly createdAt: FieldRef<"Snapshot", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Snapshot findUnique
   */
  export type SnapshotFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Snapshot
     */
    select?: SnapshotSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SnapshotInclude<ExtArgs> | null
    /**
     * Filter, which Snapshot to fetch.
     */
    where: SnapshotWhereUniqueInput
  }

  /**
   * Snapshot findUniqueOrThrow
   */
  export type SnapshotFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Snapshot
     */
    select?: SnapshotSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SnapshotInclude<ExtArgs> | null
    /**
     * Filter, which Snapshot to fetch.
     */
    where: SnapshotWhereUniqueInput
  }

  /**
   * Snapshot findFirst
   */
  export type SnapshotFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Snapshot
     */
    select?: SnapshotSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SnapshotInclude<ExtArgs> | null
    /**
     * Filter, which Snapshot to fetch.
     */
    where?: SnapshotWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Snapshots to fetch.
     */
    orderBy?: SnapshotOrderByWithRelationInput | SnapshotOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Snapshots.
     */
    cursor?: SnapshotWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Snapshots from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Snapshots.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Snapshots.
     */
    distinct?: SnapshotScalarFieldEnum | SnapshotScalarFieldEnum[]
  }

  /**
   * Snapshot findFirstOrThrow
   */
  export type SnapshotFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Snapshot
     */
    select?: SnapshotSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SnapshotInclude<ExtArgs> | null
    /**
     * Filter, which Snapshot to fetch.
     */
    where?: SnapshotWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Snapshots to fetch.
     */
    orderBy?: SnapshotOrderByWithRelationInput | SnapshotOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Snapshots.
     */
    cursor?: SnapshotWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Snapshots from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Snapshots.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Snapshots.
     */
    distinct?: SnapshotScalarFieldEnum | SnapshotScalarFieldEnum[]
  }

  /**
   * Snapshot findMany
   */
  export type SnapshotFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Snapshot
     */
    select?: SnapshotSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SnapshotInclude<ExtArgs> | null
    /**
     * Filter, which Snapshots to fetch.
     */
    where?: SnapshotWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Snapshots to fetch.
     */
    orderBy?: SnapshotOrderByWithRelationInput | SnapshotOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Snapshots.
     */
    cursor?: SnapshotWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Snapshots from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Snapshots.
     */
    skip?: number
    distinct?: SnapshotScalarFieldEnum | SnapshotScalarFieldEnum[]
  }

  /**
   * Snapshot create
   */
  export type SnapshotCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Snapshot
     */
    select?: SnapshotSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SnapshotInclude<ExtArgs> | null
    /**
     * The data needed to create a Snapshot.
     */
    data: XOR<SnapshotCreateInput, SnapshotUncheckedCreateInput>
  }

  /**
   * Snapshot createMany
   */
  export type SnapshotCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Snapshots.
     */
    data: SnapshotCreateManyInput | SnapshotCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Snapshot createManyAndReturn
   */
  export type SnapshotCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Snapshot
     */
    select?: SnapshotSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many Snapshots.
     */
    data: SnapshotCreateManyInput | SnapshotCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SnapshotIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Snapshot update
   */
  export type SnapshotUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Snapshot
     */
    select?: SnapshotSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SnapshotInclude<ExtArgs> | null
    /**
     * The data needed to update a Snapshot.
     */
    data: XOR<SnapshotUpdateInput, SnapshotUncheckedUpdateInput>
    /**
     * Choose, which Snapshot to update.
     */
    where: SnapshotWhereUniqueInput
  }

  /**
   * Snapshot updateMany
   */
  export type SnapshotUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Snapshots.
     */
    data: XOR<SnapshotUpdateManyMutationInput, SnapshotUncheckedUpdateManyInput>
    /**
     * Filter which Snapshots to update
     */
    where?: SnapshotWhereInput
  }

  /**
   * Snapshot upsert
   */
  export type SnapshotUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Snapshot
     */
    select?: SnapshotSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SnapshotInclude<ExtArgs> | null
    /**
     * The filter to search for the Snapshot to update in case it exists.
     */
    where: SnapshotWhereUniqueInput
    /**
     * In case the Snapshot found by the `where` argument doesn't exist, create a new Snapshot with this data.
     */
    create: XOR<SnapshotCreateInput, SnapshotUncheckedCreateInput>
    /**
     * In case the Snapshot was found with the provided `where` argument, update it with this data.
     */
    update: XOR<SnapshotUpdateInput, SnapshotUncheckedUpdateInput>
  }

  /**
   * Snapshot delete
   */
  export type SnapshotDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Snapshot
     */
    select?: SnapshotSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SnapshotInclude<ExtArgs> | null
    /**
     * Filter which Snapshot to delete.
     */
    where: SnapshotWhereUniqueInput
  }

  /**
   * Snapshot deleteMany
   */
  export type SnapshotDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Snapshots to delete
     */
    where?: SnapshotWhereInput
  }

  /**
   * Snapshot without action
   */
  export type SnapshotDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Snapshot
     */
    select?: SnapshotSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SnapshotInclude<ExtArgs> | null
  }


  /**
   * Model InstanceLog
   */

  export type AggregateInstanceLog = {
    _count: InstanceLogCountAggregateOutputType | null
    _min: InstanceLogMinAggregateOutputType | null
    _max: InstanceLogMaxAggregateOutputType | null
  }

  export type InstanceLogMinAggregateOutputType = {
    id: string | null
    instanceId: string | null
    event: string | null
    createdAt: Date | null
  }

  export type InstanceLogMaxAggregateOutputType = {
    id: string | null
    instanceId: string | null
    event: string | null
    createdAt: Date | null
  }

  export type InstanceLogCountAggregateOutputType = {
    id: number
    instanceId: number
    event: number
    detail: number
    createdAt: number
    _all: number
  }


  export type InstanceLogMinAggregateInputType = {
    id?: true
    instanceId?: true
    event?: true
    createdAt?: true
  }

  export type InstanceLogMaxAggregateInputType = {
    id?: true
    instanceId?: true
    event?: true
    createdAt?: true
  }

  export type InstanceLogCountAggregateInputType = {
    id?: true
    instanceId?: true
    event?: true
    detail?: true
    createdAt?: true
    _all?: true
  }

  export type InstanceLogAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which InstanceLog to aggregate.
     */
    where?: InstanceLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of InstanceLogs to fetch.
     */
    orderBy?: InstanceLogOrderByWithRelationInput | InstanceLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: InstanceLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` InstanceLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` InstanceLogs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned InstanceLogs
    **/
    _count?: true | InstanceLogCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: InstanceLogMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: InstanceLogMaxAggregateInputType
  }

  export type GetInstanceLogAggregateType<T extends InstanceLogAggregateArgs> = {
        [P in keyof T & keyof AggregateInstanceLog]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateInstanceLog[P]>
      : GetScalarType<T[P], AggregateInstanceLog[P]>
  }




  export type InstanceLogGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: InstanceLogWhereInput
    orderBy?: InstanceLogOrderByWithAggregationInput | InstanceLogOrderByWithAggregationInput[]
    by: InstanceLogScalarFieldEnum[] | InstanceLogScalarFieldEnum
    having?: InstanceLogScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: InstanceLogCountAggregateInputType | true
    _min?: InstanceLogMinAggregateInputType
    _max?: InstanceLogMaxAggregateInputType
  }

  export type InstanceLogGroupByOutputType = {
    id: string
    instanceId: string
    event: string
    detail: JsonValue
    createdAt: Date
    _count: InstanceLogCountAggregateOutputType | null
    _min: InstanceLogMinAggregateOutputType | null
    _max: InstanceLogMaxAggregateOutputType | null
  }

  type GetInstanceLogGroupByPayload<T extends InstanceLogGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<InstanceLogGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof InstanceLogGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], InstanceLogGroupByOutputType[P]>
            : GetScalarType<T[P], InstanceLogGroupByOutputType[P]>
        }
      >
    >


  export type InstanceLogSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    instanceId?: boolean
    event?: boolean
    detail?: boolean
    createdAt?: boolean
    instance?: boolean | InstanceDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["instanceLog"]>

  export type InstanceLogSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    instanceId?: boolean
    event?: boolean
    detail?: boolean
    createdAt?: boolean
    instance?: boolean | InstanceDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["instanceLog"]>

  export type InstanceLogSelectScalar = {
    id?: boolean
    instanceId?: boolean
    event?: boolean
    detail?: boolean
    createdAt?: boolean
  }

  export type InstanceLogInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    instance?: boolean | InstanceDefaultArgs<ExtArgs>
  }
  export type InstanceLogIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    instance?: boolean | InstanceDefaultArgs<ExtArgs>
  }

  export type $InstanceLogPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "InstanceLog"
    objects: {
      instance: Prisma.$InstancePayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      instanceId: string
      event: string
      detail: Prisma.JsonValue
      createdAt: Date
    }, ExtArgs["result"]["instanceLog"]>
    composites: {}
  }

  type InstanceLogGetPayload<S extends boolean | null | undefined | InstanceLogDefaultArgs> = $Result.GetResult<Prisma.$InstanceLogPayload, S>

  type InstanceLogCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<InstanceLogFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: InstanceLogCountAggregateInputType | true
    }

  export interface InstanceLogDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['InstanceLog'], meta: { name: 'InstanceLog' } }
    /**
     * Find zero or one InstanceLog that matches the filter.
     * @param {InstanceLogFindUniqueArgs} args - Arguments to find a InstanceLog
     * @example
     * // Get one InstanceLog
     * const instanceLog = await prisma.instanceLog.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUnique<T extends InstanceLogFindUniqueArgs<ExtArgs>>(
      args: SelectSubset<T, InstanceLogFindUniqueArgs<ExtArgs>>
    ): Prisma__InstanceLogClient<$Result.GetResult<Prisma.$InstanceLogPayload<ExtArgs>, T, 'findUnique'> | null, null, ExtArgs>

    /**
     * Find one InstanceLog that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {InstanceLogFindUniqueOrThrowArgs} args - Arguments to find a InstanceLog
     * @example
     * // Get one InstanceLog
     * const instanceLog = await prisma.instanceLog.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUniqueOrThrow<T extends InstanceLogFindUniqueOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, InstanceLogFindUniqueOrThrowArgs<ExtArgs>>
    ): Prisma__InstanceLogClient<$Result.GetResult<Prisma.$InstanceLogPayload<ExtArgs>, T, 'findUniqueOrThrow'>, never, ExtArgs>

    /**
     * Find the first InstanceLog that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InstanceLogFindFirstArgs} args - Arguments to find a InstanceLog
     * @example
     * // Get one InstanceLog
     * const instanceLog = await prisma.instanceLog.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirst<T extends InstanceLogFindFirstArgs<ExtArgs>>(
      args?: SelectSubset<T, InstanceLogFindFirstArgs<ExtArgs>>
    ): Prisma__InstanceLogClient<$Result.GetResult<Prisma.$InstanceLogPayload<ExtArgs>, T, 'findFirst'> | null, null, ExtArgs>

    /**
     * Find the first InstanceLog that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InstanceLogFindFirstOrThrowArgs} args - Arguments to find a InstanceLog
     * @example
     * // Get one InstanceLog
     * const instanceLog = await prisma.instanceLog.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirstOrThrow<T extends InstanceLogFindFirstOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, InstanceLogFindFirstOrThrowArgs<ExtArgs>>
    ): Prisma__InstanceLogClient<$Result.GetResult<Prisma.$InstanceLogPayload<ExtArgs>, T, 'findFirstOrThrow'>, never, ExtArgs>

    /**
     * Find zero or more InstanceLogs that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InstanceLogFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all InstanceLogs
     * const instanceLogs = await prisma.instanceLog.findMany()
     * 
     * // Get first 10 InstanceLogs
     * const instanceLogs = await prisma.instanceLog.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const instanceLogWithIdOnly = await prisma.instanceLog.findMany({ select: { id: true } })
     * 
    **/
    findMany<T extends InstanceLogFindManyArgs<ExtArgs>>(
      args?: SelectSubset<T, InstanceLogFindManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$InstanceLogPayload<ExtArgs>, T, 'findMany'>>

    /**
     * Create a InstanceLog.
     * @param {InstanceLogCreateArgs} args - Arguments to create a InstanceLog.
     * @example
     * // Create one InstanceLog
     * const InstanceLog = await prisma.instanceLog.create({
     *   data: {
     *     // ... data to create a InstanceLog
     *   }
     * })
     * 
    **/
    create<T extends InstanceLogCreateArgs<ExtArgs>>(
      args: SelectSubset<T, InstanceLogCreateArgs<ExtArgs>>
    ): Prisma__InstanceLogClient<$Result.GetResult<Prisma.$InstanceLogPayload<ExtArgs>, T, 'create'>, never, ExtArgs>

    /**
     * Create many InstanceLogs.
     * @param {InstanceLogCreateManyArgs} args - Arguments to create many InstanceLogs.
     * @example
     * // Create many InstanceLogs
     * const instanceLog = await prisma.instanceLog.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
    **/
    createMany<T extends InstanceLogCreateManyArgs<ExtArgs>>(
      args?: SelectSubset<T, InstanceLogCreateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many InstanceLogs and returns the data saved in the database.
     * @param {InstanceLogCreateManyAndReturnArgs} args - Arguments to create many InstanceLogs.
     * @example
     * // Create many InstanceLogs
     * const instanceLog = await prisma.instanceLog.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many InstanceLogs and only return the `id`
     * const instanceLogWithIdOnly = await prisma.instanceLog.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
    **/
    createManyAndReturn<T extends InstanceLogCreateManyAndReturnArgs<ExtArgs>>(
      args?: SelectSubset<T, InstanceLogCreateManyAndReturnArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$InstanceLogPayload<ExtArgs>, T, 'createManyAndReturn'>>

    /**
     * Delete a InstanceLog.
     * @param {InstanceLogDeleteArgs} args - Arguments to delete one InstanceLog.
     * @example
     * // Delete one InstanceLog
     * const InstanceLog = await prisma.instanceLog.delete({
     *   where: {
     *     // ... filter to delete one InstanceLog
     *   }
     * })
     * 
    **/
    delete<T extends InstanceLogDeleteArgs<ExtArgs>>(
      args: SelectSubset<T, InstanceLogDeleteArgs<ExtArgs>>
    ): Prisma__InstanceLogClient<$Result.GetResult<Prisma.$InstanceLogPayload<ExtArgs>, T, 'delete'>, never, ExtArgs>

    /**
     * Update one InstanceLog.
     * @param {InstanceLogUpdateArgs} args - Arguments to update one InstanceLog.
     * @example
     * // Update one InstanceLog
     * const instanceLog = await prisma.instanceLog.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    update<T extends InstanceLogUpdateArgs<ExtArgs>>(
      args: SelectSubset<T, InstanceLogUpdateArgs<ExtArgs>>
    ): Prisma__InstanceLogClient<$Result.GetResult<Prisma.$InstanceLogPayload<ExtArgs>, T, 'update'>, never, ExtArgs>

    /**
     * Delete zero or more InstanceLogs.
     * @param {InstanceLogDeleteManyArgs} args - Arguments to filter InstanceLogs to delete.
     * @example
     * // Delete a few InstanceLogs
     * const { count } = await prisma.instanceLog.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
    **/
    deleteMany<T extends InstanceLogDeleteManyArgs<ExtArgs>>(
      args?: SelectSubset<T, InstanceLogDeleteManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more InstanceLogs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InstanceLogUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many InstanceLogs
     * const instanceLog = await prisma.instanceLog.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    updateMany<T extends InstanceLogUpdateManyArgs<ExtArgs>>(
      args: SelectSubset<T, InstanceLogUpdateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one InstanceLog.
     * @param {InstanceLogUpsertArgs} args - Arguments to update or create a InstanceLog.
     * @example
     * // Update or create a InstanceLog
     * const instanceLog = await prisma.instanceLog.upsert({
     *   create: {
     *     // ... data to create a InstanceLog
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the InstanceLog we want to update
     *   }
     * })
    **/
    upsert<T extends InstanceLogUpsertArgs<ExtArgs>>(
      args: SelectSubset<T, InstanceLogUpsertArgs<ExtArgs>>
    ): Prisma__InstanceLogClient<$Result.GetResult<Prisma.$InstanceLogPayload<ExtArgs>, T, 'upsert'>, never, ExtArgs>

    /**
     * Count the number of InstanceLogs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InstanceLogCountArgs} args - Arguments to filter InstanceLogs to count.
     * @example
     * // Count the number of InstanceLogs
     * const count = await prisma.instanceLog.count({
     *   where: {
     *     // ... the filter for the InstanceLogs we want to count
     *   }
     * })
    **/
    count<T extends InstanceLogCountArgs>(
      args?: Subset<T, InstanceLogCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], InstanceLogCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a InstanceLog.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InstanceLogAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends InstanceLogAggregateArgs>(args: Subset<T, InstanceLogAggregateArgs>): Prisma.PrismaPromise<GetInstanceLogAggregateType<T>>

    /**
     * Group by InstanceLog.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InstanceLogGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends InstanceLogGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: InstanceLogGroupByArgs['orderBy'] }
        : { orderBy?: InstanceLogGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, InstanceLogGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetInstanceLogGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the InstanceLog model
   */
  readonly fields: InstanceLogFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for InstanceLog.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__InstanceLogClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: 'PrismaPromise';

    instance<T extends InstanceDefaultArgs<ExtArgs> = {}>(args?: Subset<T, InstanceDefaultArgs<ExtArgs>>): Prisma__InstanceClient<$Result.GetResult<Prisma.$InstancePayload<ExtArgs>, T, 'findUniqueOrThrow'> | Null, Null, ExtArgs>;

    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>;
  }



  /**
   * Fields of the InstanceLog model
   */ 
  interface InstanceLogFieldRefs {
    readonly id: FieldRef<"InstanceLog", 'String'>
    readonly instanceId: FieldRef<"InstanceLog", 'String'>
    readonly event: FieldRef<"InstanceLog", 'String'>
    readonly detail: FieldRef<"InstanceLog", 'Json'>
    readonly createdAt: FieldRef<"InstanceLog", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * InstanceLog findUnique
   */
  export type InstanceLogFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InstanceLog
     */
    select?: InstanceLogSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstanceLogInclude<ExtArgs> | null
    /**
     * Filter, which InstanceLog to fetch.
     */
    where: InstanceLogWhereUniqueInput
  }

  /**
   * InstanceLog findUniqueOrThrow
   */
  export type InstanceLogFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InstanceLog
     */
    select?: InstanceLogSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstanceLogInclude<ExtArgs> | null
    /**
     * Filter, which InstanceLog to fetch.
     */
    where: InstanceLogWhereUniqueInput
  }

  /**
   * InstanceLog findFirst
   */
  export type InstanceLogFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InstanceLog
     */
    select?: InstanceLogSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstanceLogInclude<ExtArgs> | null
    /**
     * Filter, which InstanceLog to fetch.
     */
    where?: InstanceLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of InstanceLogs to fetch.
     */
    orderBy?: InstanceLogOrderByWithRelationInput | InstanceLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for InstanceLogs.
     */
    cursor?: InstanceLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` InstanceLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` InstanceLogs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of InstanceLogs.
     */
    distinct?: InstanceLogScalarFieldEnum | InstanceLogScalarFieldEnum[]
  }

  /**
   * InstanceLog findFirstOrThrow
   */
  export type InstanceLogFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InstanceLog
     */
    select?: InstanceLogSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstanceLogInclude<ExtArgs> | null
    /**
     * Filter, which InstanceLog to fetch.
     */
    where?: InstanceLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of InstanceLogs to fetch.
     */
    orderBy?: InstanceLogOrderByWithRelationInput | InstanceLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for InstanceLogs.
     */
    cursor?: InstanceLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` InstanceLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` InstanceLogs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of InstanceLogs.
     */
    distinct?: InstanceLogScalarFieldEnum | InstanceLogScalarFieldEnum[]
  }

  /**
   * InstanceLog findMany
   */
  export type InstanceLogFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InstanceLog
     */
    select?: InstanceLogSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstanceLogInclude<ExtArgs> | null
    /**
     * Filter, which InstanceLogs to fetch.
     */
    where?: InstanceLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of InstanceLogs to fetch.
     */
    orderBy?: InstanceLogOrderByWithRelationInput | InstanceLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing InstanceLogs.
     */
    cursor?: InstanceLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` InstanceLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` InstanceLogs.
     */
    skip?: number
    distinct?: InstanceLogScalarFieldEnum | InstanceLogScalarFieldEnum[]
  }

  /**
   * InstanceLog create
   */
  export type InstanceLogCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InstanceLog
     */
    select?: InstanceLogSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstanceLogInclude<ExtArgs> | null
    /**
     * The data needed to create a InstanceLog.
     */
    data: XOR<InstanceLogCreateInput, InstanceLogUncheckedCreateInput>
  }

  /**
   * InstanceLog createMany
   */
  export type InstanceLogCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many InstanceLogs.
     */
    data: InstanceLogCreateManyInput | InstanceLogCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * InstanceLog createManyAndReturn
   */
  export type InstanceLogCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InstanceLog
     */
    select?: InstanceLogSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many InstanceLogs.
     */
    data: InstanceLogCreateManyInput | InstanceLogCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstanceLogIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * InstanceLog update
   */
  export type InstanceLogUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InstanceLog
     */
    select?: InstanceLogSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstanceLogInclude<ExtArgs> | null
    /**
     * The data needed to update a InstanceLog.
     */
    data: XOR<InstanceLogUpdateInput, InstanceLogUncheckedUpdateInput>
    /**
     * Choose, which InstanceLog to update.
     */
    where: InstanceLogWhereUniqueInput
  }

  /**
   * InstanceLog updateMany
   */
  export type InstanceLogUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update InstanceLogs.
     */
    data: XOR<InstanceLogUpdateManyMutationInput, InstanceLogUncheckedUpdateManyInput>
    /**
     * Filter which InstanceLogs to update
     */
    where?: InstanceLogWhereInput
  }

  /**
   * InstanceLog upsert
   */
  export type InstanceLogUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InstanceLog
     */
    select?: InstanceLogSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstanceLogInclude<ExtArgs> | null
    /**
     * The filter to search for the InstanceLog to update in case it exists.
     */
    where: InstanceLogWhereUniqueInput
    /**
     * In case the InstanceLog found by the `where` argument doesn't exist, create a new InstanceLog with this data.
     */
    create: XOR<InstanceLogCreateInput, InstanceLogUncheckedCreateInput>
    /**
     * In case the InstanceLog was found with the provided `where` argument, update it with this data.
     */
    update: XOR<InstanceLogUpdateInput, InstanceLogUncheckedUpdateInput>
  }

  /**
   * InstanceLog delete
   */
  export type InstanceLogDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InstanceLog
     */
    select?: InstanceLogSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstanceLogInclude<ExtArgs> | null
    /**
     * Filter which InstanceLog to delete.
     */
    where: InstanceLogWhereUniqueInput
  }

  /**
   * InstanceLog deleteMany
   */
  export type InstanceLogDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which InstanceLogs to delete
     */
    where?: InstanceLogWhereInput
  }

  /**
   * InstanceLog without action
   */
  export type InstanceLogDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InstanceLog
     */
    select?: InstanceLogSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstanceLogInclude<ExtArgs> | null
  }


  /**
   * Model BillingRecord
   */

  export type AggregateBillingRecord = {
    _count: BillingRecordCountAggregateOutputType | null
    _avg: BillingRecordAvgAggregateOutputType | null
    _sum: BillingRecordSumAggregateOutputType | null
    _min: BillingRecordMinAggregateOutputType | null
    _max: BillingRecordMaxAggregateOutputType | null
  }

  export type BillingRecordAvgAggregateOutputType = {
    amount: number | null
  }

  export type BillingRecordSumAggregateOutputType = {
    amount: number | null
  }

  export type BillingRecordMinAggregateOutputType = {
    id: string | null
    instanceId: string | null
    amount: number | null
    reason: string | null
    createdAt: Date | null
  }

  export type BillingRecordMaxAggregateOutputType = {
    id: string | null
    instanceId: string | null
    amount: number | null
    reason: string | null
    createdAt: Date | null
  }

  export type BillingRecordCountAggregateOutputType = {
    id: number
    instanceId: number
    amount: number
    reason: number
    createdAt: number
    _all: number
  }


  export type BillingRecordAvgAggregateInputType = {
    amount?: true
  }

  export type BillingRecordSumAggregateInputType = {
    amount?: true
  }

  export type BillingRecordMinAggregateInputType = {
    id?: true
    instanceId?: true
    amount?: true
    reason?: true
    createdAt?: true
  }

  export type BillingRecordMaxAggregateInputType = {
    id?: true
    instanceId?: true
    amount?: true
    reason?: true
    createdAt?: true
  }

  export type BillingRecordCountAggregateInputType = {
    id?: true
    instanceId?: true
    amount?: true
    reason?: true
    createdAt?: true
    _all?: true
  }

  export type BillingRecordAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which BillingRecord to aggregate.
     */
    where?: BillingRecordWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of BillingRecords to fetch.
     */
    orderBy?: BillingRecordOrderByWithRelationInput | BillingRecordOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: BillingRecordWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` BillingRecords from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` BillingRecords.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned BillingRecords
    **/
    _count?: true | BillingRecordCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: BillingRecordAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: BillingRecordSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: BillingRecordMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: BillingRecordMaxAggregateInputType
  }

  export type GetBillingRecordAggregateType<T extends BillingRecordAggregateArgs> = {
        [P in keyof T & keyof AggregateBillingRecord]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateBillingRecord[P]>
      : GetScalarType<T[P], AggregateBillingRecord[P]>
  }




  export type BillingRecordGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: BillingRecordWhereInput
    orderBy?: BillingRecordOrderByWithAggregationInput | BillingRecordOrderByWithAggregationInput[]
    by: BillingRecordScalarFieldEnum[] | BillingRecordScalarFieldEnum
    having?: BillingRecordScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: BillingRecordCountAggregateInputType | true
    _avg?: BillingRecordAvgAggregateInputType
    _sum?: BillingRecordSumAggregateInputType
    _min?: BillingRecordMinAggregateInputType
    _max?: BillingRecordMaxAggregateInputType
  }

  export type BillingRecordGroupByOutputType = {
    id: string
    instanceId: string
    amount: number
    reason: string
    createdAt: Date
    _count: BillingRecordCountAggregateOutputType | null
    _avg: BillingRecordAvgAggregateOutputType | null
    _sum: BillingRecordSumAggregateOutputType | null
    _min: BillingRecordMinAggregateOutputType | null
    _max: BillingRecordMaxAggregateOutputType | null
  }

  type GetBillingRecordGroupByPayload<T extends BillingRecordGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<BillingRecordGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof BillingRecordGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], BillingRecordGroupByOutputType[P]>
            : GetScalarType<T[P], BillingRecordGroupByOutputType[P]>
        }
      >
    >


  export type BillingRecordSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    instanceId?: boolean
    amount?: boolean
    reason?: boolean
    createdAt?: boolean
    instance?: boolean | InstanceDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["billingRecord"]>

  export type BillingRecordSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    instanceId?: boolean
    amount?: boolean
    reason?: boolean
    createdAt?: boolean
    instance?: boolean | InstanceDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["billingRecord"]>

  export type BillingRecordSelectScalar = {
    id?: boolean
    instanceId?: boolean
    amount?: boolean
    reason?: boolean
    createdAt?: boolean
  }

  export type BillingRecordInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    instance?: boolean | InstanceDefaultArgs<ExtArgs>
  }
  export type BillingRecordIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    instance?: boolean | InstanceDefaultArgs<ExtArgs>
  }

  export type $BillingRecordPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "BillingRecord"
    objects: {
      instance: Prisma.$InstancePayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      instanceId: string
      amount: number
      reason: string
      createdAt: Date
    }, ExtArgs["result"]["billingRecord"]>
    composites: {}
  }

  type BillingRecordGetPayload<S extends boolean | null | undefined | BillingRecordDefaultArgs> = $Result.GetResult<Prisma.$BillingRecordPayload, S>

  type BillingRecordCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<BillingRecordFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: BillingRecordCountAggregateInputType | true
    }

  export interface BillingRecordDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['BillingRecord'], meta: { name: 'BillingRecord' } }
    /**
     * Find zero or one BillingRecord that matches the filter.
     * @param {BillingRecordFindUniqueArgs} args - Arguments to find a BillingRecord
     * @example
     * // Get one BillingRecord
     * const billingRecord = await prisma.billingRecord.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUnique<T extends BillingRecordFindUniqueArgs<ExtArgs>>(
      args: SelectSubset<T, BillingRecordFindUniqueArgs<ExtArgs>>
    ): Prisma__BillingRecordClient<$Result.GetResult<Prisma.$BillingRecordPayload<ExtArgs>, T, 'findUnique'> | null, null, ExtArgs>

    /**
     * Find one BillingRecord that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {BillingRecordFindUniqueOrThrowArgs} args - Arguments to find a BillingRecord
     * @example
     * // Get one BillingRecord
     * const billingRecord = await prisma.billingRecord.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUniqueOrThrow<T extends BillingRecordFindUniqueOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, BillingRecordFindUniqueOrThrowArgs<ExtArgs>>
    ): Prisma__BillingRecordClient<$Result.GetResult<Prisma.$BillingRecordPayload<ExtArgs>, T, 'findUniqueOrThrow'>, never, ExtArgs>

    /**
     * Find the first BillingRecord that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BillingRecordFindFirstArgs} args - Arguments to find a BillingRecord
     * @example
     * // Get one BillingRecord
     * const billingRecord = await prisma.billingRecord.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirst<T extends BillingRecordFindFirstArgs<ExtArgs>>(
      args?: SelectSubset<T, BillingRecordFindFirstArgs<ExtArgs>>
    ): Prisma__BillingRecordClient<$Result.GetResult<Prisma.$BillingRecordPayload<ExtArgs>, T, 'findFirst'> | null, null, ExtArgs>

    /**
     * Find the first BillingRecord that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BillingRecordFindFirstOrThrowArgs} args - Arguments to find a BillingRecord
     * @example
     * // Get one BillingRecord
     * const billingRecord = await prisma.billingRecord.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirstOrThrow<T extends BillingRecordFindFirstOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, BillingRecordFindFirstOrThrowArgs<ExtArgs>>
    ): Prisma__BillingRecordClient<$Result.GetResult<Prisma.$BillingRecordPayload<ExtArgs>, T, 'findFirstOrThrow'>, never, ExtArgs>

    /**
     * Find zero or more BillingRecords that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BillingRecordFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all BillingRecords
     * const billingRecords = await prisma.billingRecord.findMany()
     * 
     * // Get first 10 BillingRecords
     * const billingRecords = await prisma.billingRecord.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const billingRecordWithIdOnly = await prisma.billingRecord.findMany({ select: { id: true } })
     * 
    **/
    findMany<T extends BillingRecordFindManyArgs<ExtArgs>>(
      args?: SelectSubset<T, BillingRecordFindManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$BillingRecordPayload<ExtArgs>, T, 'findMany'>>

    /**
     * Create a BillingRecord.
     * @param {BillingRecordCreateArgs} args - Arguments to create a BillingRecord.
     * @example
     * // Create one BillingRecord
     * const BillingRecord = await prisma.billingRecord.create({
     *   data: {
     *     // ... data to create a BillingRecord
     *   }
     * })
     * 
    **/
    create<T extends BillingRecordCreateArgs<ExtArgs>>(
      args: SelectSubset<T, BillingRecordCreateArgs<ExtArgs>>
    ): Prisma__BillingRecordClient<$Result.GetResult<Prisma.$BillingRecordPayload<ExtArgs>, T, 'create'>, never, ExtArgs>

    /**
     * Create many BillingRecords.
     * @param {BillingRecordCreateManyArgs} args - Arguments to create many BillingRecords.
     * @example
     * // Create many BillingRecords
     * const billingRecord = await prisma.billingRecord.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
    **/
    createMany<T extends BillingRecordCreateManyArgs<ExtArgs>>(
      args?: SelectSubset<T, BillingRecordCreateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many BillingRecords and returns the data saved in the database.
     * @param {BillingRecordCreateManyAndReturnArgs} args - Arguments to create many BillingRecords.
     * @example
     * // Create many BillingRecords
     * const billingRecord = await prisma.billingRecord.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many BillingRecords and only return the `id`
     * const billingRecordWithIdOnly = await prisma.billingRecord.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
    **/
    createManyAndReturn<T extends BillingRecordCreateManyAndReturnArgs<ExtArgs>>(
      args?: SelectSubset<T, BillingRecordCreateManyAndReturnArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$BillingRecordPayload<ExtArgs>, T, 'createManyAndReturn'>>

    /**
     * Delete a BillingRecord.
     * @param {BillingRecordDeleteArgs} args - Arguments to delete one BillingRecord.
     * @example
     * // Delete one BillingRecord
     * const BillingRecord = await prisma.billingRecord.delete({
     *   where: {
     *     // ... filter to delete one BillingRecord
     *   }
     * })
     * 
    **/
    delete<T extends BillingRecordDeleteArgs<ExtArgs>>(
      args: SelectSubset<T, BillingRecordDeleteArgs<ExtArgs>>
    ): Prisma__BillingRecordClient<$Result.GetResult<Prisma.$BillingRecordPayload<ExtArgs>, T, 'delete'>, never, ExtArgs>

    /**
     * Update one BillingRecord.
     * @param {BillingRecordUpdateArgs} args - Arguments to update one BillingRecord.
     * @example
     * // Update one BillingRecord
     * const billingRecord = await prisma.billingRecord.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    update<T extends BillingRecordUpdateArgs<ExtArgs>>(
      args: SelectSubset<T, BillingRecordUpdateArgs<ExtArgs>>
    ): Prisma__BillingRecordClient<$Result.GetResult<Prisma.$BillingRecordPayload<ExtArgs>, T, 'update'>, never, ExtArgs>

    /**
     * Delete zero or more BillingRecords.
     * @param {BillingRecordDeleteManyArgs} args - Arguments to filter BillingRecords to delete.
     * @example
     * // Delete a few BillingRecords
     * const { count } = await prisma.billingRecord.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
    **/
    deleteMany<T extends BillingRecordDeleteManyArgs<ExtArgs>>(
      args?: SelectSubset<T, BillingRecordDeleteManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more BillingRecords.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BillingRecordUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many BillingRecords
     * const billingRecord = await prisma.billingRecord.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    updateMany<T extends BillingRecordUpdateManyArgs<ExtArgs>>(
      args: SelectSubset<T, BillingRecordUpdateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one BillingRecord.
     * @param {BillingRecordUpsertArgs} args - Arguments to update or create a BillingRecord.
     * @example
     * // Update or create a BillingRecord
     * const billingRecord = await prisma.billingRecord.upsert({
     *   create: {
     *     // ... data to create a BillingRecord
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the BillingRecord we want to update
     *   }
     * })
    **/
    upsert<T extends BillingRecordUpsertArgs<ExtArgs>>(
      args: SelectSubset<T, BillingRecordUpsertArgs<ExtArgs>>
    ): Prisma__BillingRecordClient<$Result.GetResult<Prisma.$BillingRecordPayload<ExtArgs>, T, 'upsert'>, never, ExtArgs>

    /**
     * Count the number of BillingRecords.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BillingRecordCountArgs} args - Arguments to filter BillingRecords to count.
     * @example
     * // Count the number of BillingRecords
     * const count = await prisma.billingRecord.count({
     *   where: {
     *     // ... the filter for the BillingRecords we want to count
     *   }
     * })
    **/
    count<T extends BillingRecordCountArgs>(
      args?: Subset<T, BillingRecordCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], BillingRecordCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a BillingRecord.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BillingRecordAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends BillingRecordAggregateArgs>(args: Subset<T, BillingRecordAggregateArgs>): Prisma.PrismaPromise<GetBillingRecordAggregateType<T>>

    /**
     * Group by BillingRecord.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BillingRecordGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends BillingRecordGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: BillingRecordGroupByArgs['orderBy'] }
        : { orderBy?: BillingRecordGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, BillingRecordGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetBillingRecordGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the BillingRecord model
   */
  readonly fields: BillingRecordFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for BillingRecord.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__BillingRecordClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: 'PrismaPromise';

    instance<T extends InstanceDefaultArgs<ExtArgs> = {}>(args?: Subset<T, InstanceDefaultArgs<ExtArgs>>): Prisma__InstanceClient<$Result.GetResult<Prisma.$InstancePayload<ExtArgs>, T, 'findUniqueOrThrow'> | Null, Null, ExtArgs>;

    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>;
  }



  /**
   * Fields of the BillingRecord model
   */ 
  interface BillingRecordFieldRefs {
    readonly id: FieldRef<"BillingRecord", 'String'>
    readonly instanceId: FieldRef<"BillingRecord", 'String'>
    readonly amount: FieldRef<"BillingRecord", 'Float'>
    readonly reason: FieldRef<"BillingRecord", 'String'>
    readonly createdAt: FieldRef<"BillingRecord", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * BillingRecord findUnique
   */
  export type BillingRecordFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BillingRecord
     */
    select?: BillingRecordSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BillingRecordInclude<ExtArgs> | null
    /**
     * Filter, which BillingRecord to fetch.
     */
    where: BillingRecordWhereUniqueInput
  }

  /**
   * BillingRecord findUniqueOrThrow
   */
  export type BillingRecordFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BillingRecord
     */
    select?: BillingRecordSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BillingRecordInclude<ExtArgs> | null
    /**
     * Filter, which BillingRecord to fetch.
     */
    where: BillingRecordWhereUniqueInput
  }

  /**
   * BillingRecord findFirst
   */
  export type BillingRecordFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BillingRecord
     */
    select?: BillingRecordSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BillingRecordInclude<ExtArgs> | null
    /**
     * Filter, which BillingRecord to fetch.
     */
    where?: BillingRecordWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of BillingRecords to fetch.
     */
    orderBy?: BillingRecordOrderByWithRelationInput | BillingRecordOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for BillingRecords.
     */
    cursor?: BillingRecordWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` BillingRecords from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` BillingRecords.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of BillingRecords.
     */
    distinct?: BillingRecordScalarFieldEnum | BillingRecordScalarFieldEnum[]
  }

  /**
   * BillingRecord findFirstOrThrow
   */
  export type BillingRecordFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BillingRecord
     */
    select?: BillingRecordSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BillingRecordInclude<ExtArgs> | null
    /**
     * Filter, which BillingRecord to fetch.
     */
    where?: BillingRecordWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of BillingRecords to fetch.
     */
    orderBy?: BillingRecordOrderByWithRelationInput | BillingRecordOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for BillingRecords.
     */
    cursor?: BillingRecordWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` BillingRecords from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` BillingRecords.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of BillingRecords.
     */
    distinct?: BillingRecordScalarFieldEnum | BillingRecordScalarFieldEnum[]
  }

  /**
   * BillingRecord findMany
   */
  export type BillingRecordFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BillingRecord
     */
    select?: BillingRecordSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BillingRecordInclude<ExtArgs> | null
    /**
     * Filter, which BillingRecords to fetch.
     */
    where?: BillingRecordWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of BillingRecords to fetch.
     */
    orderBy?: BillingRecordOrderByWithRelationInput | BillingRecordOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing BillingRecords.
     */
    cursor?: BillingRecordWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` BillingRecords from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` BillingRecords.
     */
    skip?: number
    distinct?: BillingRecordScalarFieldEnum | BillingRecordScalarFieldEnum[]
  }

  /**
   * BillingRecord create
   */
  export type BillingRecordCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BillingRecord
     */
    select?: BillingRecordSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BillingRecordInclude<ExtArgs> | null
    /**
     * The data needed to create a BillingRecord.
     */
    data: XOR<BillingRecordCreateInput, BillingRecordUncheckedCreateInput>
  }

  /**
   * BillingRecord createMany
   */
  export type BillingRecordCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many BillingRecords.
     */
    data: BillingRecordCreateManyInput | BillingRecordCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * BillingRecord createManyAndReturn
   */
  export type BillingRecordCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BillingRecord
     */
    select?: BillingRecordSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many BillingRecords.
     */
    data: BillingRecordCreateManyInput | BillingRecordCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BillingRecordIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * BillingRecord update
   */
  export type BillingRecordUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BillingRecord
     */
    select?: BillingRecordSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BillingRecordInclude<ExtArgs> | null
    /**
     * The data needed to update a BillingRecord.
     */
    data: XOR<BillingRecordUpdateInput, BillingRecordUncheckedUpdateInput>
    /**
     * Choose, which BillingRecord to update.
     */
    where: BillingRecordWhereUniqueInput
  }

  /**
   * BillingRecord updateMany
   */
  export type BillingRecordUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update BillingRecords.
     */
    data: XOR<BillingRecordUpdateManyMutationInput, BillingRecordUncheckedUpdateManyInput>
    /**
     * Filter which BillingRecords to update
     */
    where?: BillingRecordWhereInput
  }

  /**
   * BillingRecord upsert
   */
  export type BillingRecordUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BillingRecord
     */
    select?: BillingRecordSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BillingRecordInclude<ExtArgs> | null
    /**
     * The filter to search for the BillingRecord to update in case it exists.
     */
    where: BillingRecordWhereUniqueInput
    /**
     * In case the BillingRecord found by the `where` argument doesn't exist, create a new BillingRecord with this data.
     */
    create: XOR<BillingRecordCreateInput, BillingRecordUncheckedCreateInput>
    /**
     * In case the BillingRecord was found with the provided `where` argument, update it with this data.
     */
    update: XOR<BillingRecordUpdateInput, BillingRecordUncheckedUpdateInput>
  }

  /**
   * BillingRecord delete
   */
  export type BillingRecordDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BillingRecord
     */
    select?: BillingRecordSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BillingRecordInclude<ExtArgs> | null
    /**
     * Filter which BillingRecord to delete.
     */
    where: BillingRecordWhereUniqueInput
  }

  /**
   * BillingRecord deleteMany
   */
  export type BillingRecordDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which BillingRecords to delete
     */
    where?: BillingRecordWhereInput
  }

  /**
   * BillingRecord without action
   */
  export type BillingRecordDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BillingRecord
     */
    select?: BillingRecordSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BillingRecordInclude<ExtArgs> | null
  }


  /**
   * Model ExecutionGraph
   */

  export type AggregateExecutionGraph = {
    _count: ExecutionGraphCountAggregateOutputType | null
    _min: ExecutionGraphMinAggregateOutputType | null
    _max: ExecutionGraphMaxAggregateOutputType | null
  }

  export type ExecutionGraphMinAggregateOutputType = {
    id: string | null
    instanceId: string | null
    createdAt: Date | null
  }

  export type ExecutionGraphMaxAggregateOutputType = {
    id: string | null
    instanceId: string | null
    createdAt: Date | null
  }

  export type ExecutionGraphCountAggregateOutputType = {
    id: number
    instanceId: number
    graph: number
    createdAt: number
    _all: number
  }


  export type ExecutionGraphMinAggregateInputType = {
    id?: true
    instanceId?: true
    createdAt?: true
  }

  export type ExecutionGraphMaxAggregateInputType = {
    id?: true
    instanceId?: true
    createdAt?: true
  }

  export type ExecutionGraphCountAggregateInputType = {
    id?: true
    instanceId?: true
    graph?: true
    createdAt?: true
    _all?: true
  }

  export type ExecutionGraphAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ExecutionGraph to aggregate.
     */
    where?: ExecutionGraphWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ExecutionGraphs to fetch.
     */
    orderBy?: ExecutionGraphOrderByWithRelationInput | ExecutionGraphOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ExecutionGraphWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ExecutionGraphs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ExecutionGraphs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ExecutionGraphs
    **/
    _count?: true | ExecutionGraphCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ExecutionGraphMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ExecutionGraphMaxAggregateInputType
  }

  export type GetExecutionGraphAggregateType<T extends ExecutionGraphAggregateArgs> = {
        [P in keyof T & keyof AggregateExecutionGraph]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateExecutionGraph[P]>
      : GetScalarType<T[P], AggregateExecutionGraph[P]>
  }




  export type ExecutionGraphGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ExecutionGraphWhereInput
    orderBy?: ExecutionGraphOrderByWithAggregationInput | ExecutionGraphOrderByWithAggregationInput[]
    by: ExecutionGraphScalarFieldEnum[] | ExecutionGraphScalarFieldEnum
    having?: ExecutionGraphScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ExecutionGraphCountAggregateInputType | true
    _min?: ExecutionGraphMinAggregateInputType
    _max?: ExecutionGraphMaxAggregateInputType
  }

  export type ExecutionGraphGroupByOutputType = {
    id: string
    instanceId: string
    graph: JsonValue
    createdAt: Date
    _count: ExecutionGraphCountAggregateOutputType | null
    _min: ExecutionGraphMinAggregateOutputType | null
    _max: ExecutionGraphMaxAggregateOutputType | null
  }

  type GetExecutionGraphGroupByPayload<T extends ExecutionGraphGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ExecutionGraphGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ExecutionGraphGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ExecutionGraphGroupByOutputType[P]>
            : GetScalarType<T[P], ExecutionGraphGroupByOutputType[P]>
        }
      >
    >


  export type ExecutionGraphSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    instanceId?: boolean
    graph?: boolean
    createdAt?: boolean
    instance?: boolean | InstanceDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["executionGraph"]>

  export type ExecutionGraphSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    instanceId?: boolean
    graph?: boolean
    createdAt?: boolean
    instance?: boolean | InstanceDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["executionGraph"]>

  export type ExecutionGraphSelectScalar = {
    id?: boolean
    instanceId?: boolean
    graph?: boolean
    createdAt?: boolean
  }

  export type ExecutionGraphInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    instance?: boolean | InstanceDefaultArgs<ExtArgs>
  }
  export type ExecutionGraphIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    instance?: boolean | InstanceDefaultArgs<ExtArgs>
  }

  export type $ExecutionGraphPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ExecutionGraph"
    objects: {
      instance: Prisma.$InstancePayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      instanceId: string
      graph: Prisma.JsonValue
      createdAt: Date
    }, ExtArgs["result"]["executionGraph"]>
    composites: {}
  }

  type ExecutionGraphGetPayload<S extends boolean | null | undefined | ExecutionGraphDefaultArgs> = $Result.GetResult<Prisma.$ExecutionGraphPayload, S>

  type ExecutionGraphCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<ExecutionGraphFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: ExecutionGraphCountAggregateInputType | true
    }

  export interface ExecutionGraphDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ExecutionGraph'], meta: { name: 'ExecutionGraph' } }
    /**
     * Find zero or one ExecutionGraph that matches the filter.
     * @param {ExecutionGraphFindUniqueArgs} args - Arguments to find a ExecutionGraph
     * @example
     * // Get one ExecutionGraph
     * const executionGraph = await prisma.executionGraph.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUnique<T extends ExecutionGraphFindUniqueArgs<ExtArgs>>(
      args: SelectSubset<T, ExecutionGraphFindUniqueArgs<ExtArgs>>
    ): Prisma__ExecutionGraphClient<$Result.GetResult<Prisma.$ExecutionGraphPayload<ExtArgs>, T, 'findUnique'> | null, null, ExtArgs>

    /**
     * Find one ExecutionGraph that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {ExecutionGraphFindUniqueOrThrowArgs} args - Arguments to find a ExecutionGraph
     * @example
     * // Get one ExecutionGraph
     * const executionGraph = await prisma.executionGraph.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUniqueOrThrow<T extends ExecutionGraphFindUniqueOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, ExecutionGraphFindUniqueOrThrowArgs<ExtArgs>>
    ): Prisma__ExecutionGraphClient<$Result.GetResult<Prisma.$ExecutionGraphPayload<ExtArgs>, T, 'findUniqueOrThrow'>, never, ExtArgs>

    /**
     * Find the first ExecutionGraph that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ExecutionGraphFindFirstArgs} args - Arguments to find a ExecutionGraph
     * @example
     * // Get one ExecutionGraph
     * const executionGraph = await prisma.executionGraph.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirst<T extends ExecutionGraphFindFirstArgs<ExtArgs>>(
      args?: SelectSubset<T, ExecutionGraphFindFirstArgs<ExtArgs>>
    ): Prisma__ExecutionGraphClient<$Result.GetResult<Prisma.$ExecutionGraphPayload<ExtArgs>, T, 'findFirst'> | null, null, ExtArgs>

    /**
     * Find the first ExecutionGraph that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ExecutionGraphFindFirstOrThrowArgs} args - Arguments to find a ExecutionGraph
     * @example
     * // Get one ExecutionGraph
     * const executionGraph = await prisma.executionGraph.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirstOrThrow<T extends ExecutionGraphFindFirstOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, ExecutionGraphFindFirstOrThrowArgs<ExtArgs>>
    ): Prisma__ExecutionGraphClient<$Result.GetResult<Prisma.$ExecutionGraphPayload<ExtArgs>, T, 'findFirstOrThrow'>, never, ExtArgs>

    /**
     * Find zero or more ExecutionGraphs that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ExecutionGraphFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ExecutionGraphs
     * const executionGraphs = await prisma.executionGraph.findMany()
     * 
     * // Get first 10 ExecutionGraphs
     * const executionGraphs = await prisma.executionGraph.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const executionGraphWithIdOnly = await prisma.executionGraph.findMany({ select: { id: true } })
     * 
    **/
    findMany<T extends ExecutionGraphFindManyArgs<ExtArgs>>(
      args?: SelectSubset<T, ExecutionGraphFindManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ExecutionGraphPayload<ExtArgs>, T, 'findMany'>>

    /**
     * Create a ExecutionGraph.
     * @param {ExecutionGraphCreateArgs} args - Arguments to create a ExecutionGraph.
     * @example
     * // Create one ExecutionGraph
     * const ExecutionGraph = await prisma.executionGraph.create({
     *   data: {
     *     // ... data to create a ExecutionGraph
     *   }
     * })
     * 
    **/
    create<T extends ExecutionGraphCreateArgs<ExtArgs>>(
      args: SelectSubset<T, ExecutionGraphCreateArgs<ExtArgs>>
    ): Prisma__ExecutionGraphClient<$Result.GetResult<Prisma.$ExecutionGraphPayload<ExtArgs>, T, 'create'>, never, ExtArgs>

    /**
     * Create many ExecutionGraphs.
     * @param {ExecutionGraphCreateManyArgs} args - Arguments to create many ExecutionGraphs.
     * @example
     * // Create many ExecutionGraphs
     * const executionGraph = await prisma.executionGraph.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
    **/
    createMany<T extends ExecutionGraphCreateManyArgs<ExtArgs>>(
      args?: SelectSubset<T, ExecutionGraphCreateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ExecutionGraphs and returns the data saved in the database.
     * @param {ExecutionGraphCreateManyAndReturnArgs} args - Arguments to create many ExecutionGraphs.
     * @example
     * // Create many ExecutionGraphs
     * const executionGraph = await prisma.executionGraph.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ExecutionGraphs and only return the `id`
     * const executionGraphWithIdOnly = await prisma.executionGraph.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
    **/
    createManyAndReturn<T extends ExecutionGraphCreateManyAndReturnArgs<ExtArgs>>(
      args?: SelectSubset<T, ExecutionGraphCreateManyAndReturnArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ExecutionGraphPayload<ExtArgs>, T, 'createManyAndReturn'>>

    /**
     * Delete a ExecutionGraph.
     * @param {ExecutionGraphDeleteArgs} args - Arguments to delete one ExecutionGraph.
     * @example
     * // Delete one ExecutionGraph
     * const ExecutionGraph = await prisma.executionGraph.delete({
     *   where: {
     *     // ... filter to delete one ExecutionGraph
     *   }
     * })
     * 
    **/
    delete<T extends ExecutionGraphDeleteArgs<ExtArgs>>(
      args: SelectSubset<T, ExecutionGraphDeleteArgs<ExtArgs>>
    ): Prisma__ExecutionGraphClient<$Result.GetResult<Prisma.$ExecutionGraphPayload<ExtArgs>, T, 'delete'>, never, ExtArgs>

    /**
     * Update one ExecutionGraph.
     * @param {ExecutionGraphUpdateArgs} args - Arguments to update one ExecutionGraph.
     * @example
     * // Update one ExecutionGraph
     * const executionGraph = await prisma.executionGraph.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    update<T extends ExecutionGraphUpdateArgs<ExtArgs>>(
      args: SelectSubset<T, ExecutionGraphUpdateArgs<ExtArgs>>
    ): Prisma__ExecutionGraphClient<$Result.GetResult<Prisma.$ExecutionGraphPayload<ExtArgs>, T, 'update'>, never, ExtArgs>

    /**
     * Delete zero or more ExecutionGraphs.
     * @param {ExecutionGraphDeleteManyArgs} args - Arguments to filter ExecutionGraphs to delete.
     * @example
     * // Delete a few ExecutionGraphs
     * const { count } = await prisma.executionGraph.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
    **/
    deleteMany<T extends ExecutionGraphDeleteManyArgs<ExtArgs>>(
      args?: SelectSubset<T, ExecutionGraphDeleteManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ExecutionGraphs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ExecutionGraphUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ExecutionGraphs
     * const executionGraph = await prisma.executionGraph.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    updateMany<T extends ExecutionGraphUpdateManyArgs<ExtArgs>>(
      args: SelectSubset<T, ExecutionGraphUpdateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one ExecutionGraph.
     * @param {ExecutionGraphUpsertArgs} args - Arguments to update or create a ExecutionGraph.
     * @example
     * // Update or create a ExecutionGraph
     * const executionGraph = await prisma.executionGraph.upsert({
     *   create: {
     *     // ... data to create a ExecutionGraph
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ExecutionGraph we want to update
     *   }
     * })
    **/
    upsert<T extends ExecutionGraphUpsertArgs<ExtArgs>>(
      args: SelectSubset<T, ExecutionGraphUpsertArgs<ExtArgs>>
    ): Prisma__ExecutionGraphClient<$Result.GetResult<Prisma.$ExecutionGraphPayload<ExtArgs>, T, 'upsert'>, never, ExtArgs>

    /**
     * Count the number of ExecutionGraphs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ExecutionGraphCountArgs} args - Arguments to filter ExecutionGraphs to count.
     * @example
     * // Count the number of ExecutionGraphs
     * const count = await prisma.executionGraph.count({
     *   where: {
     *     // ... the filter for the ExecutionGraphs we want to count
     *   }
     * })
    **/
    count<T extends ExecutionGraphCountArgs>(
      args?: Subset<T, ExecutionGraphCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ExecutionGraphCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ExecutionGraph.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ExecutionGraphAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ExecutionGraphAggregateArgs>(args: Subset<T, ExecutionGraphAggregateArgs>): Prisma.PrismaPromise<GetExecutionGraphAggregateType<T>>

    /**
     * Group by ExecutionGraph.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ExecutionGraphGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ExecutionGraphGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ExecutionGraphGroupByArgs['orderBy'] }
        : { orderBy?: ExecutionGraphGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ExecutionGraphGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetExecutionGraphGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ExecutionGraph model
   */
  readonly fields: ExecutionGraphFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ExecutionGraph.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ExecutionGraphClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: 'PrismaPromise';

    instance<T extends InstanceDefaultArgs<ExtArgs> = {}>(args?: Subset<T, InstanceDefaultArgs<ExtArgs>>): Prisma__InstanceClient<$Result.GetResult<Prisma.$InstancePayload<ExtArgs>, T, 'findUniqueOrThrow'> | Null, Null, ExtArgs>;

    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>;
  }



  /**
   * Fields of the ExecutionGraph model
   */ 
  interface ExecutionGraphFieldRefs {
    readonly id: FieldRef<"ExecutionGraph", 'String'>
    readonly instanceId: FieldRef<"ExecutionGraph", 'String'>
    readonly graph: FieldRef<"ExecutionGraph", 'Json'>
    readonly createdAt: FieldRef<"ExecutionGraph", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * ExecutionGraph findUnique
   */
  export type ExecutionGraphFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExecutionGraph
     */
    select?: ExecutionGraphSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExecutionGraphInclude<ExtArgs> | null
    /**
     * Filter, which ExecutionGraph to fetch.
     */
    where: ExecutionGraphWhereUniqueInput
  }

  /**
   * ExecutionGraph findUniqueOrThrow
   */
  export type ExecutionGraphFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExecutionGraph
     */
    select?: ExecutionGraphSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExecutionGraphInclude<ExtArgs> | null
    /**
     * Filter, which ExecutionGraph to fetch.
     */
    where: ExecutionGraphWhereUniqueInput
  }

  /**
   * ExecutionGraph findFirst
   */
  export type ExecutionGraphFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExecutionGraph
     */
    select?: ExecutionGraphSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExecutionGraphInclude<ExtArgs> | null
    /**
     * Filter, which ExecutionGraph to fetch.
     */
    where?: ExecutionGraphWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ExecutionGraphs to fetch.
     */
    orderBy?: ExecutionGraphOrderByWithRelationInput | ExecutionGraphOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ExecutionGraphs.
     */
    cursor?: ExecutionGraphWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ExecutionGraphs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ExecutionGraphs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ExecutionGraphs.
     */
    distinct?: ExecutionGraphScalarFieldEnum | ExecutionGraphScalarFieldEnum[]
  }

  /**
   * ExecutionGraph findFirstOrThrow
   */
  export type ExecutionGraphFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExecutionGraph
     */
    select?: ExecutionGraphSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExecutionGraphInclude<ExtArgs> | null
    /**
     * Filter, which ExecutionGraph to fetch.
     */
    where?: ExecutionGraphWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ExecutionGraphs to fetch.
     */
    orderBy?: ExecutionGraphOrderByWithRelationInput | ExecutionGraphOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ExecutionGraphs.
     */
    cursor?: ExecutionGraphWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ExecutionGraphs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ExecutionGraphs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ExecutionGraphs.
     */
    distinct?: ExecutionGraphScalarFieldEnum | ExecutionGraphScalarFieldEnum[]
  }

  /**
   * ExecutionGraph findMany
   */
  export type ExecutionGraphFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExecutionGraph
     */
    select?: ExecutionGraphSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExecutionGraphInclude<ExtArgs> | null
    /**
     * Filter, which ExecutionGraphs to fetch.
     */
    where?: ExecutionGraphWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ExecutionGraphs to fetch.
     */
    orderBy?: ExecutionGraphOrderByWithRelationInput | ExecutionGraphOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ExecutionGraphs.
     */
    cursor?: ExecutionGraphWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ExecutionGraphs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ExecutionGraphs.
     */
    skip?: number
    distinct?: ExecutionGraphScalarFieldEnum | ExecutionGraphScalarFieldEnum[]
  }

  /**
   * ExecutionGraph create
   */
  export type ExecutionGraphCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExecutionGraph
     */
    select?: ExecutionGraphSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExecutionGraphInclude<ExtArgs> | null
    /**
     * The data needed to create a ExecutionGraph.
     */
    data: XOR<ExecutionGraphCreateInput, ExecutionGraphUncheckedCreateInput>
  }

  /**
   * ExecutionGraph createMany
   */
  export type ExecutionGraphCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ExecutionGraphs.
     */
    data: ExecutionGraphCreateManyInput | ExecutionGraphCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ExecutionGraph createManyAndReturn
   */
  export type ExecutionGraphCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExecutionGraph
     */
    select?: ExecutionGraphSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many ExecutionGraphs.
     */
    data: ExecutionGraphCreateManyInput | ExecutionGraphCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExecutionGraphIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * ExecutionGraph update
   */
  export type ExecutionGraphUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExecutionGraph
     */
    select?: ExecutionGraphSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExecutionGraphInclude<ExtArgs> | null
    /**
     * The data needed to update a ExecutionGraph.
     */
    data: XOR<ExecutionGraphUpdateInput, ExecutionGraphUncheckedUpdateInput>
    /**
     * Choose, which ExecutionGraph to update.
     */
    where: ExecutionGraphWhereUniqueInput
  }

  /**
   * ExecutionGraph updateMany
   */
  export type ExecutionGraphUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ExecutionGraphs.
     */
    data: XOR<ExecutionGraphUpdateManyMutationInput, ExecutionGraphUncheckedUpdateManyInput>
    /**
     * Filter which ExecutionGraphs to update
     */
    where?: ExecutionGraphWhereInput
  }

  /**
   * ExecutionGraph upsert
   */
  export type ExecutionGraphUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExecutionGraph
     */
    select?: ExecutionGraphSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExecutionGraphInclude<ExtArgs> | null
    /**
     * The filter to search for the ExecutionGraph to update in case it exists.
     */
    where: ExecutionGraphWhereUniqueInput
    /**
     * In case the ExecutionGraph found by the `where` argument doesn't exist, create a new ExecutionGraph with this data.
     */
    create: XOR<ExecutionGraphCreateInput, ExecutionGraphUncheckedCreateInput>
    /**
     * In case the ExecutionGraph was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ExecutionGraphUpdateInput, ExecutionGraphUncheckedUpdateInput>
  }

  /**
   * ExecutionGraph delete
   */
  export type ExecutionGraphDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExecutionGraph
     */
    select?: ExecutionGraphSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExecutionGraphInclude<ExtArgs> | null
    /**
     * Filter which ExecutionGraph to delete.
     */
    where: ExecutionGraphWhereUniqueInput
  }

  /**
   * ExecutionGraph deleteMany
   */
  export type ExecutionGraphDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ExecutionGraphs to delete
     */
    where?: ExecutionGraphWhereInput
  }

  /**
   * ExecutionGraph without action
   */
  export type ExecutionGraphDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExecutionGraph
     */
    select?: ExecutionGraphSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExecutionGraphInclude<ExtArgs> | null
  }


  /**
   * Model snapshot_history
   */

  export type AggregateSnapshot_history = {
    _count: Snapshot_historyCountAggregateOutputType | null
    _avg: Snapshot_historyAvgAggregateOutputType | null
    _sum: Snapshot_historySumAggregateOutputType | null
    _min: Snapshot_historyMinAggregateOutputType | null
    _max: Snapshot_historyMaxAggregateOutputType | null
  }

  export type Snapshot_historyAvgAggregateOutputType = {
    id: number | null
  }

  export type Snapshot_historySumAggregateOutputType = {
    id: number | null
  }

  export type Snapshot_historyMinAggregateOutputType = {
    id: number | null
    snapshot_name: string | null
    instance_id: string | null
    created_at: Date | null
  }

  export type Snapshot_historyMaxAggregateOutputType = {
    id: number | null
    snapshot_name: string | null
    instance_id: string | null
    created_at: Date | null
  }

  export type Snapshot_historyCountAggregateOutputType = {
    id: number
    snapshot_name: number
    instance_id: number
    created_at: number
    _all: number
  }


  export type Snapshot_historyAvgAggregateInputType = {
    id?: true
  }

  export type Snapshot_historySumAggregateInputType = {
    id?: true
  }

  export type Snapshot_historyMinAggregateInputType = {
    id?: true
    snapshot_name?: true
    instance_id?: true
    created_at?: true
  }

  export type Snapshot_historyMaxAggregateInputType = {
    id?: true
    snapshot_name?: true
    instance_id?: true
    created_at?: true
  }

  export type Snapshot_historyCountAggregateInputType = {
    id?: true
    snapshot_name?: true
    instance_id?: true
    created_at?: true
    _all?: true
  }

  export type Snapshot_historyAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which snapshot_history to aggregate.
     */
    where?: snapshot_historyWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of snapshot_histories to fetch.
     */
    orderBy?: snapshot_historyOrderByWithRelationInput | snapshot_historyOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: snapshot_historyWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` snapshot_histories from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` snapshot_histories.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned snapshot_histories
    **/
    _count?: true | Snapshot_historyCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: Snapshot_historyAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: Snapshot_historySumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: Snapshot_historyMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: Snapshot_historyMaxAggregateInputType
  }

  export type GetSnapshot_historyAggregateType<T extends Snapshot_historyAggregateArgs> = {
        [P in keyof T & keyof AggregateSnapshot_history]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateSnapshot_history[P]>
      : GetScalarType<T[P], AggregateSnapshot_history[P]>
  }




  export type snapshot_historyGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: snapshot_historyWhereInput
    orderBy?: snapshot_historyOrderByWithAggregationInput | snapshot_historyOrderByWithAggregationInput[]
    by: Snapshot_historyScalarFieldEnum[] | Snapshot_historyScalarFieldEnum
    having?: snapshot_historyScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: Snapshot_historyCountAggregateInputType | true
    _avg?: Snapshot_historyAvgAggregateInputType
    _sum?: Snapshot_historySumAggregateInputType
    _min?: Snapshot_historyMinAggregateInputType
    _max?: Snapshot_historyMaxAggregateInputType
  }

  export type Snapshot_historyGroupByOutputType = {
    id: number
    snapshot_name: string
    instance_id: string | null
    created_at: Date
    _count: Snapshot_historyCountAggregateOutputType | null
    _avg: Snapshot_historyAvgAggregateOutputType | null
    _sum: Snapshot_historySumAggregateOutputType | null
    _min: Snapshot_historyMinAggregateOutputType | null
    _max: Snapshot_historyMaxAggregateOutputType | null
  }

  type GetSnapshot_historyGroupByPayload<T extends snapshot_historyGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<Snapshot_historyGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof Snapshot_historyGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], Snapshot_historyGroupByOutputType[P]>
            : GetScalarType<T[P], Snapshot_historyGroupByOutputType[P]>
        }
      >
    >


  export type snapshot_historySelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    snapshot_name?: boolean
    instance_id?: boolean
    created_at?: boolean
  }, ExtArgs["result"]["snapshot_history"]>

  export type snapshot_historySelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    snapshot_name?: boolean
    instance_id?: boolean
    created_at?: boolean
  }, ExtArgs["result"]["snapshot_history"]>

  export type snapshot_historySelectScalar = {
    id?: boolean
    snapshot_name?: boolean
    instance_id?: boolean
    created_at?: boolean
  }


  export type $snapshot_historyPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "snapshot_history"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      snapshot_name: string
      instance_id: string | null
      created_at: Date
    }, ExtArgs["result"]["snapshot_history"]>
    composites: {}
  }

  type snapshot_historyGetPayload<S extends boolean | null | undefined | snapshot_historyDefaultArgs> = $Result.GetResult<Prisma.$snapshot_historyPayload, S>

  type snapshot_historyCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<snapshot_historyFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: Snapshot_historyCountAggregateInputType | true
    }

  export interface snapshot_historyDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['snapshot_history'], meta: { name: 'snapshot_history' } }
    /**
     * Find zero or one Snapshot_history that matches the filter.
     * @param {snapshot_historyFindUniqueArgs} args - Arguments to find a Snapshot_history
     * @example
     * // Get one Snapshot_history
     * const snapshot_history = await prisma.snapshot_history.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUnique<T extends snapshot_historyFindUniqueArgs<ExtArgs>>(
      args: SelectSubset<T, snapshot_historyFindUniqueArgs<ExtArgs>>
    ): Prisma__snapshot_historyClient<$Result.GetResult<Prisma.$snapshot_historyPayload<ExtArgs>, T, 'findUnique'> | null, null, ExtArgs>

    /**
     * Find one Snapshot_history that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {snapshot_historyFindUniqueOrThrowArgs} args - Arguments to find a Snapshot_history
     * @example
     * // Get one Snapshot_history
     * const snapshot_history = await prisma.snapshot_history.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUniqueOrThrow<T extends snapshot_historyFindUniqueOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, snapshot_historyFindUniqueOrThrowArgs<ExtArgs>>
    ): Prisma__snapshot_historyClient<$Result.GetResult<Prisma.$snapshot_historyPayload<ExtArgs>, T, 'findUniqueOrThrow'>, never, ExtArgs>

    /**
     * Find the first Snapshot_history that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {snapshot_historyFindFirstArgs} args - Arguments to find a Snapshot_history
     * @example
     * // Get one Snapshot_history
     * const snapshot_history = await prisma.snapshot_history.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirst<T extends snapshot_historyFindFirstArgs<ExtArgs>>(
      args?: SelectSubset<T, snapshot_historyFindFirstArgs<ExtArgs>>
    ): Prisma__snapshot_historyClient<$Result.GetResult<Prisma.$snapshot_historyPayload<ExtArgs>, T, 'findFirst'> | null, null, ExtArgs>

    /**
     * Find the first Snapshot_history that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {snapshot_historyFindFirstOrThrowArgs} args - Arguments to find a Snapshot_history
     * @example
     * // Get one Snapshot_history
     * const snapshot_history = await prisma.snapshot_history.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirstOrThrow<T extends snapshot_historyFindFirstOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, snapshot_historyFindFirstOrThrowArgs<ExtArgs>>
    ): Prisma__snapshot_historyClient<$Result.GetResult<Prisma.$snapshot_historyPayload<ExtArgs>, T, 'findFirstOrThrow'>, never, ExtArgs>

    /**
     * Find zero or more Snapshot_histories that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {snapshot_historyFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Snapshot_histories
     * const snapshot_histories = await prisma.snapshot_history.findMany()
     * 
     * // Get first 10 Snapshot_histories
     * const snapshot_histories = await prisma.snapshot_history.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const snapshot_historyWithIdOnly = await prisma.snapshot_history.findMany({ select: { id: true } })
     * 
    **/
    findMany<T extends snapshot_historyFindManyArgs<ExtArgs>>(
      args?: SelectSubset<T, snapshot_historyFindManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$snapshot_historyPayload<ExtArgs>, T, 'findMany'>>

    /**
     * Create a Snapshot_history.
     * @param {snapshot_historyCreateArgs} args - Arguments to create a Snapshot_history.
     * @example
     * // Create one Snapshot_history
     * const Snapshot_history = await prisma.snapshot_history.create({
     *   data: {
     *     // ... data to create a Snapshot_history
     *   }
     * })
     * 
    **/
    create<T extends snapshot_historyCreateArgs<ExtArgs>>(
      args: SelectSubset<T, snapshot_historyCreateArgs<ExtArgs>>
    ): Prisma__snapshot_historyClient<$Result.GetResult<Prisma.$snapshot_historyPayload<ExtArgs>, T, 'create'>, never, ExtArgs>

    /**
     * Create many Snapshot_histories.
     * @param {snapshot_historyCreateManyArgs} args - Arguments to create many Snapshot_histories.
     * @example
     * // Create many Snapshot_histories
     * const snapshot_history = await prisma.snapshot_history.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
    **/
    createMany<T extends snapshot_historyCreateManyArgs<ExtArgs>>(
      args?: SelectSubset<T, snapshot_historyCreateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Snapshot_histories and returns the data saved in the database.
     * @param {snapshot_historyCreateManyAndReturnArgs} args - Arguments to create many Snapshot_histories.
     * @example
     * // Create many Snapshot_histories
     * const snapshot_history = await prisma.snapshot_history.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Snapshot_histories and only return the `id`
     * const snapshot_historyWithIdOnly = await prisma.snapshot_history.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
    **/
    createManyAndReturn<T extends snapshot_historyCreateManyAndReturnArgs<ExtArgs>>(
      args?: SelectSubset<T, snapshot_historyCreateManyAndReturnArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$snapshot_historyPayload<ExtArgs>, T, 'createManyAndReturn'>>

    /**
     * Delete a Snapshot_history.
     * @param {snapshot_historyDeleteArgs} args - Arguments to delete one Snapshot_history.
     * @example
     * // Delete one Snapshot_history
     * const Snapshot_history = await prisma.snapshot_history.delete({
     *   where: {
     *     // ... filter to delete one Snapshot_history
     *   }
     * })
     * 
    **/
    delete<T extends snapshot_historyDeleteArgs<ExtArgs>>(
      args: SelectSubset<T, snapshot_historyDeleteArgs<ExtArgs>>
    ): Prisma__snapshot_historyClient<$Result.GetResult<Prisma.$snapshot_historyPayload<ExtArgs>, T, 'delete'>, never, ExtArgs>

    /**
     * Update one Snapshot_history.
     * @param {snapshot_historyUpdateArgs} args - Arguments to update one Snapshot_history.
     * @example
     * // Update one Snapshot_history
     * const snapshot_history = await prisma.snapshot_history.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    update<T extends snapshot_historyUpdateArgs<ExtArgs>>(
      args: SelectSubset<T, snapshot_historyUpdateArgs<ExtArgs>>
    ): Prisma__snapshot_historyClient<$Result.GetResult<Prisma.$snapshot_historyPayload<ExtArgs>, T, 'update'>, never, ExtArgs>

    /**
     * Delete zero or more Snapshot_histories.
     * @param {snapshot_historyDeleteManyArgs} args - Arguments to filter Snapshot_histories to delete.
     * @example
     * // Delete a few Snapshot_histories
     * const { count } = await prisma.snapshot_history.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
    **/
    deleteMany<T extends snapshot_historyDeleteManyArgs<ExtArgs>>(
      args?: SelectSubset<T, snapshot_historyDeleteManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Snapshot_histories.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {snapshot_historyUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Snapshot_histories
     * const snapshot_history = await prisma.snapshot_history.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    updateMany<T extends snapshot_historyUpdateManyArgs<ExtArgs>>(
      args: SelectSubset<T, snapshot_historyUpdateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Snapshot_history.
     * @param {snapshot_historyUpsertArgs} args - Arguments to update or create a Snapshot_history.
     * @example
     * // Update or create a Snapshot_history
     * const snapshot_history = await prisma.snapshot_history.upsert({
     *   create: {
     *     // ... data to create a Snapshot_history
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Snapshot_history we want to update
     *   }
     * })
    **/
    upsert<T extends snapshot_historyUpsertArgs<ExtArgs>>(
      args: SelectSubset<T, snapshot_historyUpsertArgs<ExtArgs>>
    ): Prisma__snapshot_historyClient<$Result.GetResult<Prisma.$snapshot_historyPayload<ExtArgs>, T, 'upsert'>, never, ExtArgs>

    /**
     * Count the number of Snapshot_histories.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {snapshot_historyCountArgs} args - Arguments to filter Snapshot_histories to count.
     * @example
     * // Count the number of Snapshot_histories
     * const count = await prisma.snapshot_history.count({
     *   where: {
     *     // ... the filter for the Snapshot_histories we want to count
     *   }
     * })
    **/
    count<T extends snapshot_historyCountArgs>(
      args?: Subset<T, snapshot_historyCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], Snapshot_historyCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Snapshot_history.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Snapshot_historyAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends Snapshot_historyAggregateArgs>(args: Subset<T, Snapshot_historyAggregateArgs>): Prisma.PrismaPromise<GetSnapshot_historyAggregateType<T>>

    /**
     * Group by Snapshot_history.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {snapshot_historyGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends snapshot_historyGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: snapshot_historyGroupByArgs['orderBy'] }
        : { orderBy?: snapshot_historyGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, snapshot_historyGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetSnapshot_historyGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the snapshot_history model
   */
  readonly fields: snapshot_historyFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for snapshot_history.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__snapshot_historyClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: 'PrismaPromise';


    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>;
  }



  /**
   * Fields of the snapshot_history model
   */ 
  interface snapshot_historyFieldRefs {
    readonly id: FieldRef<"snapshot_history", 'Int'>
    readonly snapshot_name: FieldRef<"snapshot_history", 'String'>
    readonly instance_id: FieldRef<"snapshot_history", 'String'>
    readonly created_at: FieldRef<"snapshot_history", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * snapshot_history findUnique
   */
  export type snapshot_historyFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the snapshot_history
     */
    select?: snapshot_historySelect<ExtArgs> | null
    /**
     * Filter, which snapshot_history to fetch.
     */
    where: snapshot_historyWhereUniqueInput
  }

  /**
   * snapshot_history findUniqueOrThrow
   */
  export type snapshot_historyFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the snapshot_history
     */
    select?: snapshot_historySelect<ExtArgs> | null
    /**
     * Filter, which snapshot_history to fetch.
     */
    where: snapshot_historyWhereUniqueInput
  }

  /**
   * snapshot_history findFirst
   */
  export type snapshot_historyFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the snapshot_history
     */
    select?: snapshot_historySelect<ExtArgs> | null
    /**
     * Filter, which snapshot_history to fetch.
     */
    where?: snapshot_historyWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of snapshot_histories to fetch.
     */
    orderBy?: snapshot_historyOrderByWithRelationInput | snapshot_historyOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for snapshot_histories.
     */
    cursor?: snapshot_historyWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` snapshot_histories from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` snapshot_histories.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of snapshot_histories.
     */
    distinct?: Snapshot_historyScalarFieldEnum | Snapshot_historyScalarFieldEnum[]
  }

  /**
   * snapshot_history findFirstOrThrow
   */
  export type snapshot_historyFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the snapshot_history
     */
    select?: snapshot_historySelect<ExtArgs> | null
    /**
     * Filter, which snapshot_history to fetch.
     */
    where?: snapshot_historyWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of snapshot_histories to fetch.
     */
    orderBy?: snapshot_historyOrderByWithRelationInput | snapshot_historyOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for snapshot_histories.
     */
    cursor?: snapshot_historyWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` snapshot_histories from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` snapshot_histories.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of snapshot_histories.
     */
    distinct?: Snapshot_historyScalarFieldEnum | Snapshot_historyScalarFieldEnum[]
  }

  /**
   * snapshot_history findMany
   */
  export type snapshot_historyFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the snapshot_history
     */
    select?: snapshot_historySelect<ExtArgs> | null
    /**
     * Filter, which snapshot_histories to fetch.
     */
    where?: snapshot_historyWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of snapshot_histories to fetch.
     */
    orderBy?: snapshot_historyOrderByWithRelationInput | snapshot_historyOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing snapshot_histories.
     */
    cursor?: snapshot_historyWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` snapshot_histories from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` snapshot_histories.
     */
    skip?: number
    distinct?: Snapshot_historyScalarFieldEnum | Snapshot_historyScalarFieldEnum[]
  }

  /**
   * snapshot_history create
   */
  export type snapshot_historyCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the snapshot_history
     */
    select?: snapshot_historySelect<ExtArgs> | null
    /**
     * The data needed to create a snapshot_history.
     */
    data: XOR<snapshot_historyCreateInput, snapshot_historyUncheckedCreateInput>
  }

  /**
   * snapshot_history createMany
   */
  export type snapshot_historyCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many snapshot_histories.
     */
    data: snapshot_historyCreateManyInput | snapshot_historyCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * snapshot_history createManyAndReturn
   */
  export type snapshot_historyCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the snapshot_history
     */
    select?: snapshot_historySelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many snapshot_histories.
     */
    data: snapshot_historyCreateManyInput | snapshot_historyCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * snapshot_history update
   */
  export type snapshot_historyUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the snapshot_history
     */
    select?: snapshot_historySelect<ExtArgs> | null
    /**
     * The data needed to update a snapshot_history.
     */
    data: XOR<snapshot_historyUpdateInput, snapshot_historyUncheckedUpdateInput>
    /**
     * Choose, which snapshot_history to update.
     */
    where: snapshot_historyWhereUniqueInput
  }

  /**
   * snapshot_history updateMany
   */
  export type snapshot_historyUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update snapshot_histories.
     */
    data: XOR<snapshot_historyUpdateManyMutationInput, snapshot_historyUncheckedUpdateManyInput>
    /**
     * Filter which snapshot_histories to update
     */
    where?: snapshot_historyWhereInput
  }

  /**
   * snapshot_history upsert
   */
  export type snapshot_historyUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the snapshot_history
     */
    select?: snapshot_historySelect<ExtArgs> | null
    /**
     * The filter to search for the snapshot_history to update in case it exists.
     */
    where: snapshot_historyWhereUniqueInput
    /**
     * In case the snapshot_history found by the `where` argument doesn't exist, create a new snapshot_history with this data.
     */
    create: XOR<snapshot_historyCreateInput, snapshot_historyUncheckedCreateInput>
    /**
     * In case the snapshot_history was found with the provided `where` argument, update it with this data.
     */
    update: XOR<snapshot_historyUpdateInput, snapshot_historyUncheckedUpdateInput>
  }

  /**
   * snapshot_history delete
   */
  export type snapshot_historyDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the snapshot_history
     */
    select?: snapshot_historySelect<ExtArgs> | null
    /**
     * Filter which snapshot_history to delete.
     */
    where: snapshot_historyWhereUniqueInput
  }

  /**
   * snapshot_history deleteMany
   */
  export type snapshot_historyDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which snapshot_histories to delete
     */
    where?: snapshot_historyWhereInput
  }

  /**
   * snapshot_history without action
   */
  export type snapshot_historyDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the snapshot_history
     */
    select?: snapshot_historySelect<ExtArgs> | null
  }


  /**
   * Model TerminalSession
   */

  export type AggregateTerminalSession = {
    _count: TerminalSessionCountAggregateOutputType | null
    _min: TerminalSessionMinAggregateOutputType | null
    _max: TerminalSessionMaxAggregateOutputType | null
  }

  export type TerminalSessionMinAggregateOutputType = {
    id: string | null
    token: string | null
    instanceId: string | null
    userId: string | null
    scope: string | null
    issuedAt: Date | null
    expiresAt: Date | null
    revokedAt: Date | null
    lastVerifiedAt: Date | null
  }

  export type TerminalSessionMaxAggregateOutputType = {
    id: string | null
    token: string | null
    instanceId: string | null
    userId: string | null
    scope: string | null
    issuedAt: Date | null
    expiresAt: Date | null
    revokedAt: Date | null
    lastVerifiedAt: Date | null
  }

  export type TerminalSessionCountAggregateOutputType = {
    id: number
    token: number
    instanceId: number
    userId: number
    scope: number
    issuedAt: number
    expiresAt: number
    revokedAt: number
    lastVerifiedAt: number
    _all: number
  }


  export type TerminalSessionMinAggregateInputType = {
    id?: true
    token?: true
    instanceId?: true
    userId?: true
    scope?: true
    issuedAt?: true
    expiresAt?: true
    revokedAt?: true
    lastVerifiedAt?: true
  }

  export type TerminalSessionMaxAggregateInputType = {
    id?: true
    token?: true
    instanceId?: true
    userId?: true
    scope?: true
    issuedAt?: true
    expiresAt?: true
    revokedAt?: true
    lastVerifiedAt?: true
  }

  export type TerminalSessionCountAggregateInputType = {
    id?: true
    token?: true
    instanceId?: true
    userId?: true
    scope?: true
    issuedAt?: true
    expiresAt?: true
    revokedAt?: true
    lastVerifiedAt?: true
    _all?: true
  }

  export type TerminalSessionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TerminalSession to aggregate.
     */
    where?: TerminalSessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TerminalSessions to fetch.
     */
    orderBy?: TerminalSessionOrderByWithRelationInput | TerminalSessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: TerminalSessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TerminalSessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TerminalSessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned TerminalSessions
    **/
    _count?: true | TerminalSessionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: TerminalSessionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: TerminalSessionMaxAggregateInputType
  }

  export type GetTerminalSessionAggregateType<T extends TerminalSessionAggregateArgs> = {
        [P in keyof T & keyof AggregateTerminalSession]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateTerminalSession[P]>
      : GetScalarType<T[P], AggregateTerminalSession[P]>
  }




  export type TerminalSessionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TerminalSessionWhereInput
    orderBy?: TerminalSessionOrderByWithAggregationInput | TerminalSessionOrderByWithAggregationInput[]
    by: TerminalSessionScalarFieldEnum[] | TerminalSessionScalarFieldEnum
    having?: TerminalSessionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: TerminalSessionCountAggregateInputType | true
    _min?: TerminalSessionMinAggregateInputType
    _max?: TerminalSessionMaxAggregateInputType
  }

  export type TerminalSessionGroupByOutputType = {
    id: string
    token: string
    instanceId: string
    userId: string
    scope: string
    issuedAt: Date
    expiresAt: Date
    revokedAt: Date | null
    lastVerifiedAt: Date | null
    _count: TerminalSessionCountAggregateOutputType | null
    _min: TerminalSessionMinAggregateOutputType | null
    _max: TerminalSessionMaxAggregateOutputType | null
  }

  type GetTerminalSessionGroupByPayload<T extends TerminalSessionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<TerminalSessionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof TerminalSessionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], TerminalSessionGroupByOutputType[P]>
            : GetScalarType<T[P], TerminalSessionGroupByOutputType[P]>
        }
      >
    >


  export type TerminalSessionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    token?: boolean
    instanceId?: boolean
    userId?: boolean
    scope?: boolean
    issuedAt?: boolean
    expiresAt?: boolean
    revokedAt?: boolean
    lastVerifiedAt?: boolean
    instance?: boolean | InstanceDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["terminalSession"]>

  export type TerminalSessionSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    token?: boolean
    instanceId?: boolean
    userId?: boolean
    scope?: boolean
    issuedAt?: boolean
    expiresAt?: boolean
    revokedAt?: boolean
    lastVerifiedAt?: boolean
    instance?: boolean | InstanceDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["terminalSession"]>

  export type TerminalSessionSelectScalar = {
    id?: boolean
    token?: boolean
    instanceId?: boolean
    userId?: boolean
    scope?: boolean
    issuedAt?: boolean
    expiresAt?: boolean
    revokedAt?: boolean
    lastVerifiedAt?: boolean
  }

  export type TerminalSessionInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    instance?: boolean | InstanceDefaultArgs<ExtArgs>
  }
  export type TerminalSessionIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    instance?: boolean | InstanceDefaultArgs<ExtArgs>
  }

  export type $TerminalSessionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "TerminalSession"
    objects: {
      instance: Prisma.$InstancePayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      token: string
      instanceId: string
      userId: string
      scope: string
      issuedAt: Date
      expiresAt: Date
      revokedAt: Date | null
      lastVerifiedAt: Date | null
    }, ExtArgs["result"]["terminalSession"]>
    composites: {}
  }

  type TerminalSessionGetPayload<S extends boolean | null | undefined | TerminalSessionDefaultArgs> = $Result.GetResult<Prisma.$TerminalSessionPayload, S>

  type TerminalSessionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<TerminalSessionFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: TerminalSessionCountAggregateInputType | true
    }

  export interface TerminalSessionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['TerminalSession'], meta: { name: 'TerminalSession' } }
    /**
     * Find zero or one TerminalSession that matches the filter.
     * @param {TerminalSessionFindUniqueArgs} args - Arguments to find a TerminalSession
     * @example
     * // Get one TerminalSession
     * const terminalSession = await prisma.terminalSession.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUnique<T extends TerminalSessionFindUniqueArgs<ExtArgs>>(
      args: SelectSubset<T, TerminalSessionFindUniqueArgs<ExtArgs>>
    ): Prisma__TerminalSessionClient<$Result.GetResult<Prisma.$TerminalSessionPayload<ExtArgs>, T, 'findUnique'> | null, null, ExtArgs>

    /**
     * Find one TerminalSession that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {TerminalSessionFindUniqueOrThrowArgs} args - Arguments to find a TerminalSession
     * @example
     * // Get one TerminalSession
     * const terminalSession = await prisma.terminalSession.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUniqueOrThrow<T extends TerminalSessionFindUniqueOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, TerminalSessionFindUniqueOrThrowArgs<ExtArgs>>
    ): Prisma__TerminalSessionClient<$Result.GetResult<Prisma.$TerminalSessionPayload<ExtArgs>, T, 'findUniqueOrThrow'>, never, ExtArgs>

    /**
     * Find the first TerminalSession that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TerminalSessionFindFirstArgs} args - Arguments to find a TerminalSession
     * @example
     * // Get one TerminalSession
     * const terminalSession = await prisma.terminalSession.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirst<T extends TerminalSessionFindFirstArgs<ExtArgs>>(
      args?: SelectSubset<T, TerminalSessionFindFirstArgs<ExtArgs>>
    ): Prisma__TerminalSessionClient<$Result.GetResult<Prisma.$TerminalSessionPayload<ExtArgs>, T, 'findFirst'> | null, null, ExtArgs>

    /**
     * Find the first TerminalSession that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TerminalSessionFindFirstOrThrowArgs} args - Arguments to find a TerminalSession
     * @example
     * // Get one TerminalSession
     * const terminalSession = await prisma.terminalSession.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirstOrThrow<T extends TerminalSessionFindFirstOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, TerminalSessionFindFirstOrThrowArgs<ExtArgs>>
    ): Prisma__TerminalSessionClient<$Result.GetResult<Prisma.$TerminalSessionPayload<ExtArgs>, T, 'findFirstOrThrow'>, never, ExtArgs>

    /**
     * Find zero or more TerminalSessions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TerminalSessionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all TerminalSessions
     * const terminalSessions = await prisma.terminalSession.findMany()
     * 
     * // Get first 10 TerminalSessions
     * const terminalSessions = await prisma.terminalSession.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const terminalSessionWithIdOnly = await prisma.terminalSession.findMany({ select: { id: true } })
     * 
    **/
    findMany<T extends TerminalSessionFindManyArgs<ExtArgs>>(
      args?: SelectSubset<T, TerminalSessionFindManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TerminalSessionPayload<ExtArgs>, T, 'findMany'>>

    /**
     * Create a TerminalSession.
     * @param {TerminalSessionCreateArgs} args - Arguments to create a TerminalSession.
     * @example
     * // Create one TerminalSession
     * const TerminalSession = await prisma.terminalSession.create({
     *   data: {
     *     // ... data to create a TerminalSession
     *   }
     * })
     * 
    **/
    create<T extends TerminalSessionCreateArgs<ExtArgs>>(
      args: SelectSubset<T, TerminalSessionCreateArgs<ExtArgs>>
    ): Prisma__TerminalSessionClient<$Result.GetResult<Prisma.$TerminalSessionPayload<ExtArgs>, T, 'create'>, never, ExtArgs>

    /**
     * Create many TerminalSessions.
     * @param {TerminalSessionCreateManyArgs} args - Arguments to create many TerminalSessions.
     * @example
     * // Create many TerminalSessions
     * const terminalSession = await prisma.terminalSession.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
    **/
    createMany<T extends TerminalSessionCreateManyArgs<ExtArgs>>(
      args?: SelectSubset<T, TerminalSessionCreateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many TerminalSessions and returns the data saved in the database.
     * @param {TerminalSessionCreateManyAndReturnArgs} args - Arguments to create many TerminalSessions.
     * @example
     * // Create many TerminalSessions
     * const terminalSession = await prisma.terminalSession.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many TerminalSessions and only return the `id`
     * const terminalSessionWithIdOnly = await prisma.terminalSession.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
    **/
    createManyAndReturn<T extends TerminalSessionCreateManyAndReturnArgs<ExtArgs>>(
      args?: SelectSubset<T, TerminalSessionCreateManyAndReturnArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TerminalSessionPayload<ExtArgs>, T, 'createManyAndReturn'>>

    /**
     * Delete a TerminalSession.
     * @param {TerminalSessionDeleteArgs} args - Arguments to delete one TerminalSession.
     * @example
     * // Delete one TerminalSession
     * const TerminalSession = await prisma.terminalSession.delete({
     *   where: {
     *     // ... filter to delete one TerminalSession
     *   }
     * })
     * 
    **/
    delete<T extends TerminalSessionDeleteArgs<ExtArgs>>(
      args: SelectSubset<T, TerminalSessionDeleteArgs<ExtArgs>>
    ): Prisma__TerminalSessionClient<$Result.GetResult<Prisma.$TerminalSessionPayload<ExtArgs>, T, 'delete'>, never, ExtArgs>

    /**
     * Update one TerminalSession.
     * @param {TerminalSessionUpdateArgs} args - Arguments to update one TerminalSession.
     * @example
     * // Update one TerminalSession
     * const terminalSession = await prisma.terminalSession.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    update<T extends TerminalSessionUpdateArgs<ExtArgs>>(
      args: SelectSubset<T, TerminalSessionUpdateArgs<ExtArgs>>
    ): Prisma__TerminalSessionClient<$Result.GetResult<Prisma.$TerminalSessionPayload<ExtArgs>, T, 'update'>, never, ExtArgs>

    /**
     * Delete zero or more TerminalSessions.
     * @param {TerminalSessionDeleteManyArgs} args - Arguments to filter TerminalSessions to delete.
     * @example
     * // Delete a few TerminalSessions
     * const { count } = await prisma.terminalSession.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
    **/
    deleteMany<T extends TerminalSessionDeleteManyArgs<ExtArgs>>(
      args?: SelectSubset<T, TerminalSessionDeleteManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more TerminalSessions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TerminalSessionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many TerminalSessions
     * const terminalSession = await prisma.terminalSession.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    updateMany<T extends TerminalSessionUpdateManyArgs<ExtArgs>>(
      args: SelectSubset<T, TerminalSessionUpdateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one TerminalSession.
     * @param {TerminalSessionUpsertArgs} args - Arguments to update or create a TerminalSession.
     * @example
     * // Update or create a TerminalSession
     * const terminalSession = await prisma.terminalSession.upsert({
     *   create: {
     *     // ... data to create a TerminalSession
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the TerminalSession we want to update
     *   }
     * })
    **/
    upsert<T extends TerminalSessionUpsertArgs<ExtArgs>>(
      args: SelectSubset<T, TerminalSessionUpsertArgs<ExtArgs>>
    ): Prisma__TerminalSessionClient<$Result.GetResult<Prisma.$TerminalSessionPayload<ExtArgs>, T, 'upsert'>, never, ExtArgs>

    /**
     * Count the number of TerminalSessions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TerminalSessionCountArgs} args - Arguments to filter TerminalSessions to count.
     * @example
     * // Count the number of TerminalSessions
     * const count = await prisma.terminalSession.count({
     *   where: {
     *     // ... the filter for the TerminalSessions we want to count
     *   }
     * })
    **/
    count<T extends TerminalSessionCountArgs>(
      args?: Subset<T, TerminalSessionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], TerminalSessionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a TerminalSession.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TerminalSessionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends TerminalSessionAggregateArgs>(args: Subset<T, TerminalSessionAggregateArgs>): Prisma.PrismaPromise<GetTerminalSessionAggregateType<T>>

    /**
     * Group by TerminalSession.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TerminalSessionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends TerminalSessionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: TerminalSessionGroupByArgs['orderBy'] }
        : { orderBy?: TerminalSessionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, TerminalSessionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetTerminalSessionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the TerminalSession model
   */
  readonly fields: TerminalSessionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for TerminalSession.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__TerminalSessionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: 'PrismaPromise';

    instance<T extends InstanceDefaultArgs<ExtArgs> = {}>(args?: Subset<T, InstanceDefaultArgs<ExtArgs>>): Prisma__InstanceClient<$Result.GetResult<Prisma.$InstancePayload<ExtArgs>, T, 'findUniqueOrThrow'> | Null, Null, ExtArgs>;

    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>;
  }



  /**
   * Fields of the TerminalSession model
   */ 
  interface TerminalSessionFieldRefs {
    readonly id: FieldRef<"TerminalSession", 'String'>
    readonly token: FieldRef<"TerminalSession", 'String'>
    readonly instanceId: FieldRef<"TerminalSession", 'String'>
    readonly userId: FieldRef<"TerminalSession", 'String'>
    readonly scope: FieldRef<"TerminalSession", 'String'>
    readonly issuedAt: FieldRef<"TerminalSession", 'DateTime'>
    readonly expiresAt: FieldRef<"TerminalSession", 'DateTime'>
    readonly revokedAt: FieldRef<"TerminalSession", 'DateTime'>
    readonly lastVerifiedAt: FieldRef<"TerminalSession", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * TerminalSession findUnique
   */
  export type TerminalSessionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TerminalSession
     */
    select?: TerminalSessionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TerminalSessionInclude<ExtArgs> | null
    /**
     * Filter, which TerminalSession to fetch.
     */
    where: TerminalSessionWhereUniqueInput
  }

  /**
   * TerminalSession findUniqueOrThrow
   */
  export type TerminalSessionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TerminalSession
     */
    select?: TerminalSessionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TerminalSessionInclude<ExtArgs> | null
    /**
     * Filter, which TerminalSession to fetch.
     */
    where: TerminalSessionWhereUniqueInput
  }

  /**
   * TerminalSession findFirst
   */
  export type TerminalSessionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TerminalSession
     */
    select?: TerminalSessionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TerminalSessionInclude<ExtArgs> | null
    /**
     * Filter, which TerminalSession to fetch.
     */
    where?: TerminalSessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TerminalSessions to fetch.
     */
    orderBy?: TerminalSessionOrderByWithRelationInput | TerminalSessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TerminalSessions.
     */
    cursor?: TerminalSessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TerminalSessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TerminalSessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TerminalSessions.
     */
    distinct?: TerminalSessionScalarFieldEnum | TerminalSessionScalarFieldEnum[]
  }

  /**
   * TerminalSession findFirstOrThrow
   */
  export type TerminalSessionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TerminalSession
     */
    select?: TerminalSessionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TerminalSessionInclude<ExtArgs> | null
    /**
     * Filter, which TerminalSession to fetch.
     */
    where?: TerminalSessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TerminalSessions to fetch.
     */
    orderBy?: TerminalSessionOrderByWithRelationInput | TerminalSessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TerminalSessions.
     */
    cursor?: TerminalSessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TerminalSessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TerminalSessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TerminalSessions.
     */
    distinct?: TerminalSessionScalarFieldEnum | TerminalSessionScalarFieldEnum[]
  }

  /**
   * TerminalSession findMany
   */
  export type TerminalSessionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TerminalSession
     */
    select?: TerminalSessionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TerminalSessionInclude<ExtArgs> | null
    /**
     * Filter, which TerminalSessions to fetch.
     */
    where?: TerminalSessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TerminalSessions to fetch.
     */
    orderBy?: TerminalSessionOrderByWithRelationInput | TerminalSessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing TerminalSessions.
     */
    cursor?: TerminalSessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TerminalSessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TerminalSessions.
     */
    skip?: number
    distinct?: TerminalSessionScalarFieldEnum | TerminalSessionScalarFieldEnum[]
  }

  /**
   * TerminalSession create
   */
  export type TerminalSessionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TerminalSession
     */
    select?: TerminalSessionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TerminalSessionInclude<ExtArgs> | null
    /**
     * The data needed to create a TerminalSession.
     */
    data: XOR<TerminalSessionCreateInput, TerminalSessionUncheckedCreateInput>
  }

  /**
   * TerminalSession createMany
   */
  export type TerminalSessionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many TerminalSessions.
     */
    data: TerminalSessionCreateManyInput | TerminalSessionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * TerminalSession createManyAndReturn
   */
  export type TerminalSessionCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TerminalSession
     */
    select?: TerminalSessionSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many TerminalSessions.
     */
    data: TerminalSessionCreateManyInput | TerminalSessionCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TerminalSessionIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * TerminalSession update
   */
  export type TerminalSessionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TerminalSession
     */
    select?: TerminalSessionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TerminalSessionInclude<ExtArgs> | null
    /**
     * The data needed to update a TerminalSession.
     */
    data: XOR<TerminalSessionUpdateInput, TerminalSessionUncheckedUpdateInput>
    /**
     * Choose, which TerminalSession to update.
     */
    where: TerminalSessionWhereUniqueInput
  }

  /**
   * TerminalSession updateMany
   */
  export type TerminalSessionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update TerminalSessions.
     */
    data: XOR<TerminalSessionUpdateManyMutationInput, TerminalSessionUncheckedUpdateManyInput>
    /**
     * Filter which TerminalSessions to update
     */
    where?: TerminalSessionWhereInput
  }

  /**
   * TerminalSession upsert
   */
  export type TerminalSessionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TerminalSession
     */
    select?: TerminalSessionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TerminalSessionInclude<ExtArgs> | null
    /**
     * The filter to search for the TerminalSession to update in case it exists.
     */
    where: TerminalSessionWhereUniqueInput
    /**
     * In case the TerminalSession found by the `where` argument doesn't exist, create a new TerminalSession with this data.
     */
    create: XOR<TerminalSessionCreateInput, TerminalSessionUncheckedCreateInput>
    /**
     * In case the TerminalSession was found with the provided `where` argument, update it with this data.
     */
    update: XOR<TerminalSessionUpdateInput, TerminalSessionUncheckedUpdateInput>
  }

  /**
   * TerminalSession delete
   */
  export type TerminalSessionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TerminalSession
     */
    select?: TerminalSessionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TerminalSessionInclude<ExtArgs> | null
    /**
     * Filter which TerminalSession to delete.
     */
    where: TerminalSessionWhereUniqueInput
  }

  /**
   * TerminalSession deleteMany
   */
  export type TerminalSessionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TerminalSessions to delete
     */
    where?: TerminalSessionWhereInput
  }

  /**
   * TerminalSession without action
   */
  export type TerminalSessionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TerminalSession
     */
    select?: TerminalSessionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TerminalSessionInclude<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const InstanceScalarFieldEnum: {
    id: 'id',
    name: 'name',
    ownerId: 'ownerId',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    cpuTierId: 'cpuTierId',
    nodeTierId: 'nodeTierId',
    engineTierId: 'engineTierId',
    qpuTierId: 'qpuTierId',
    omegaTierId: 'omegaTierId',
    status: 'status',
    autoscale: 'autoscale'
  };

  export type InstanceScalarFieldEnum = (typeof InstanceScalarFieldEnum)[keyof typeof InstanceScalarFieldEnum]


  export const InstanceEngineScalarFieldEnum: {
    id: 'id',
    instanceId: 'instanceId',
    engineType: 'engineType',
    enabled: 'enabled',
    defaultModel: 'defaultModel',
    allowedModels: 'allowedModels',
    createdAt: 'createdAt'
  };

  export type InstanceEngineScalarFieldEnum = (typeof InstanceEngineScalarFieldEnum)[keyof typeof InstanceEngineScalarFieldEnum]


  export const InstancePolicyScalarFieldEnum: {
    id: 'id',
    instanceId: 'instanceId',
    allowChat: 'allowChat',
    allowEmotion: 'allowEmotion',
    allowMemory: 'allowMemory',
    allowFinance: 'allowFinance',
    allowTerminal: 'allowTerminal',
    allowSSH: 'allowSSH',
    maxTokensPerDay: 'maxTokensPerDay',
    maxRequestsPerDay: 'maxRequestsPerDay',
    ipWhitelist: 'ipWhitelist',
    regionLock: 'regionLock',
    auditRequired: 'auditRequired',
    piiStrictMode: 'piiStrictMode',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type InstancePolicyScalarFieldEnum = (typeof InstancePolicyScalarFieldEnum)[keyof typeof InstancePolicyScalarFieldEnum]


  export const CpuTierScalarFieldEnum: {
    id: 'id',
    name: 'name',
    cores: 'cores',
    price: 'price'
  };

  export type CpuTierScalarFieldEnum = (typeof CpuTierScalarFieldEnum)[keyof typeof CpuTierScalarFieldEnum]


  export const NodeTierScalarFieldEnum: {
    id: 'id',
    name: 'name',
    nodes: 'nodes',
    price: 'price'
  };

  export type NodeTierScalarFieldEnum = (typeof NodeTierScalarFieldEnum)[keyof typeof NodeTierScalarFieldEnum]


  export const EngineTierScalarFieldEnum: {
    id: 'id',
    name: 'name',
    profile: 'profile',
    price: 'price'
  };

  export type EngineTierScalarFieldEnum = (typeof EngineTierScalarFieldEnum)[keyof typeof EngineTierScalarFieldEnum]


  export const QpuTierScalarFieldEnum: {
    id: 'id',
    name: 'name',
    parallel: 'parallel',
    price: 'price'
  };

  export type QpuTierScalarFieldEnum = (typeof QpuTierScalarFieldEnum)[keyof typeof QpuTierScalarFieldEnum]


  export const OmegaTierScalarFieldEnum: {
    id: 'id',
    name: 'name',
    cognitive: 'cognitive',
    price: 'price'
  };

  export type OmegaTierScalarFieldEnum = (typeof OmegaTierScalarFieldEnum)[keyof typeof OmegaTierScalarFieldEnum]


  export const SnapshotScalarFieldEnum: {
    id: 'id',
    instanceId: 'instanceId',
    metadata: 'metadata',
    createdAt: 'createdAt'
  };

  export type SnapshotScalarFieldEnum = (typeof SnapshotScalarFieldEnum)[keyof typeof SnapshotScalarFieldEnum]


  export const InstanceLogScalarFieldEnum: {
    id: 'id',
    instanceId: 'instanceId',
    event: 'event',
    detail: 'detail',
    createdAt: 'createdAt'
  };

  export type InstanceLogScalarFieldEnum = (typeof InstanceLogScalarFieldEnum)[keyof typeof InstanceLogScalarFieldEnum]


  export const BillingRecordScalarFieldEnum: {
    id: 'id',
    instanceId: 'instanceId',
    amount: 'amount',
    reason: 'reason',
    createdAt: 'createdAt'
  };

  export type BillingRecordScalarFieldEnum = (typeof BillingRecordScalarFieldEnum)[keyof typeof BillingRecordScalarFieldEnum]


  export const ExecutionGraphScalarFieldEnum: {
    id: 'id',
    instanceId: 'instanceId',
    graph: 'graph',
    createdAt: 'createdAt'
  };

  export type ExecutionGraphScalarFieldEnum = (typeof ExecutionGraphScalarFieldEnum)[keyof typeof ExecutionGraphScalarFieldEnum]


  export const Snapshot_historyScalarFieldEnum: {
    id: 'id',
    snapshot_name: 'snapshot_name',
    instance_id: 'instance_id',
    created_at: 'created_at'
  };

  export type Snapshot_historyScalarFieldEnum = (typeof Snapshot_historyScalarFieldEnum)[keyof typeof Snapshot_historyScalarFieldEnum]


  export const TerminalSessionScalarFieldEnum: {
    id: 'id',
    token: 'token',
    instanceId: 'instanceId',
    userId: 'userId',
    scope: 'scope',
    issuedAt: 'issuedAt',
    expiresAt: 'expiresAt',
    revokedAt: 'revokedAt',
    lastVerifiedAt: 'lastVerifiedAt'
  };

  export type TerminalSessionScalarFieldEnum = (typeof TerminalSessionScalarFieldEnum)[keyof typeof TerminalSessionScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const JsonNullValueInput: {
    JsonNull: typeof JsonNull
  };

  export type JsonNullValueInput = (typeof JsonNullValueInput)[keyof typeof JsonNullValueInput]


  export const NullableJsonNullValueInput: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull
  };

  export type NullableJsonNullValueInput = (typeof NullableJsonNullValueInput)[keyof typeof NullableJsonNullValueInput]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  export const JsonNullValueFilter: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull,
    AnyNull: typeof AnyNull
  };

  export type JsonNullValueFilter = (typeof JsonNullValueFilter)[keyof typeof JsonNullValueFilter]


  /**
   * Field references 
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'InstanceStatus'
   */
  export type EnumInstanceStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'InstanceStatus'>
    


  /**
   * Reference to a field of type 'InstanceStatus[]'
   */
  export type ListEnumInstanceStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'InstanceStatus[]'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'EngineType'
   */
  export type EnumEngineTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'EngineType'>
    


  /**
   * Reference to a field of type 'EngineType[]'
   */
  export type ListEnumEngineTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'EngineType[]'>
    


  /**
   * Reference to a field of type 'Json'
   */
  export type JsonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Json'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    
  /**
   * Deep Input Types
   */


  export type InstanceWhereInput = {
    AND?: InstanceWhereInput | InstanceWhereInput[]
    OR?: InstanceWhereInput[]
    NOT?: InstanceWhereInput | InstanceWhereInput[]
    id?: StringFilter<"Instance"> | string
    name?: StringFilter<"Instance"> | string
    ownerId?: StringFilter<"Instance"> | string
    createdAt?: DateTimeFilter<"Instance"> | Date | string
    updatedAt?: DateTimeFilter<"Instance"> | Date | string
    cpuTierId?: StringFilter<"Instance"> | string
    nodeTierId?: StringFilter<"Instance"> | string
    engineTierId?: StringFilter<"Instance"> | string
    qpuTierId?: StringNullableFilter<"Instance"> | string | null
    omegaTierId?: StringNullableFilter<"Instance"> | string | null
    status?: EnumInstanceStatusFilter<"Instance"> | $Enums.InstanceStatus
    autoscale?: BoolFilter<"Instance"> | boolean
    cpuTier?: XOR<CpuTierRelationFilter, CpuTierWhereInput>
    nodeTier?: XOR<NodeTierRelationFilter, NodeTierWhereInput>
    engineTier?: XOR<EngineTierRelationFilter, EngineTierWhereInput>
    qpuTier?: XOR<QpuTierNullableRelationFilter, QpuTierWhereInput> | null
    omegaTier?: XOR<OmegaTierNullableRelationFilter, OmegaTierWhereInput> | null
    engines?: InstanceEngineListRelationFilter
    policy?: XOR<InstancePolicyNullableRelationFilter, InstancePolicyWhereInput> | null
    terminalSessions?: TerminalSessionListRelationFilter
    snapshots?: SnapshotListRelationFilter
    logs?: InstanceLogListRelationFilter
    billingRecords?: BillingRecordListRelationFilter
    executionGraphs?: ExecutionGraphListRelationFilter
  }

  export type InstanceOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    ownerId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    cpuTierId?: SortOrder
    nodeTierId?: SortOrder
    engineTierId?: SortOrder
    qpuTierId?: SortOrderInput | SortOrder
    omegaTierId?: SortOrderInput | SortOrder
    status?: SortOrder
    autoscale?: SortOrder
    cpuTier?: CpuTierOrderByWithRelationInput
    nodeTier?: NodeTierOrderByWithRelationInput
    engineTier?: EngineTierOrderByWithRelationInput
    qpuTier?: QpuTierOrderByWithRelationInput
    omegaTier?: OmegaTierOrderByWithRelationInput
    engines?: InstanceEngineOrderByRelationAggregateInput
    policy?: InstancePolicyOrderByWithRelationInput
    terminalSessions?: TerminalSessionOrderByRelationAggregateInput
    snapshots?: SnapshotOrderByRelationAggregateInput
    logs?: InstanceLogOrderByRelationAggregateInput
    billingRecords?: BillingRecordOrderByRelationAggregateInput
    executionGraphs?: ExecutionGraphOrderByRelationAggregateInput
  }

  export type InstanceWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: InstanceWhereInput | InstanceWhereInput[]
    OR?: InstanceWhereInput[]
    NOT?: InstanceWhereInput | InstanceWhereInput[]
    name?: StringFilter<"Instance"> | string
    ownerId?: StringFilter<"Instance"> | string
    createdAt?: DateTimeFilter<"Instance"> | Date | string
    updatedAt?: DateTimeFilter<"Instance"> | Date | string
    cpuTierId?: StringFilter<"Instance"> | string
    nodeTierId?: StringFilter<"Instance"> | string
    engineTierId?: StringFilter<"Instance"> | string
    qpuTierId?: StringNullableFilter<"Instance"> | string | null
    omegaTierId?: StringNullableFilter<"Instance"> | string | null
    status?: EnumInstanceStatusFilter<"Instance"> | $Enums.InstanceStatus
    autoscale?: BoolFilter<"Instance"> | boolean
    cpuTier?: XOR<CpuTierRelationFilter, CpuTierWhereInput>
    nodeTier?: XOR<NodeTierRelationFilter, NodeTierWhereInput>
    engineTier?: XOR<EngineTierRelationFilter, EngineTierWhereInput>
    qpuTier?: XOR<QpuTierNullableRelationFilter, QpuTierWhereInput> | null
    omegaTier?: XOR<OmegaTierNullableRelationFilter, OmegaTierWhereInput> | null
    engines?: InstanceEngineListRelationFilter
    policy?: XOR<InstancePolicyNullableRelationFilter, InstancePolicyWhereInput> | null
    terminalSessions?: TerminalSessionListRelationFilter
    snapshots?: SnapshotListRelationFilter
    logs?: InstanceLogListRelationFilter
    billingRecords?: BillingRecordListRelationFilter
    executionGraphs?: ExecutionGraphListRelationFilter
  }, "id">

  export type InstanceOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    ownerId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    cpuTierId?: SortOrder
    nodeTierId?: SortOrder
    engineTierId?: SortOrder
    qpuTierId?: SortOrderInput | SortOrder
    omegaTierId?: SortOrderInput | SortOrder
    status?: SortOrder
    autoscale?: SortOrder
    _count?: InstanceCountOrderByAggregateInput
    _max?: InstanceMaxOrderByAggregateInput
    _min?: InstanceMinOrderByAggregateInput
  }

  export type InstanceScalarWhereWithAggregatesInput = {
    AND?: InstanceScalarWhereWithAggregatesInput | InstanceScalarWhereWithAggregatesInput[]
    OR?: InstanceScalarWhereWithAggregatesInput[]
    NOT?: InstanceScalarWhereWithAggregatesInput | InstanceScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Instance"> | string
    name?: StringWithAggregatesFilter<"Instance"> | string
    ownerId?: StringWithAggregatesFilter<"Instance"> | string
    createdAt?: DateTimeWithAggregatesFilter<"Instance"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Instance"> | Date | string
    cpuTierId?: StringWithAggregatesFilter<"Instance"> | string
    nodeTierId?: StringWithAggregatesFilter<"Instance"> | string
    engineTierId?: StringWithAggregatesFilter<"Instance"> | string
    qpuTierId?: StringNullableWithAggregatesFilter<"Instance"> | string | null
    omegaTierId?: StringNullableWithAggregatesFilter<"Instance"> | string | null
    status?: EnumInstanceStatusWithAggregatesFilter<"Instance"> | $Enums.InstanceStatus
    autoscale?: BoolWithAggregatesFilter<"Instance"> | boolean
  }

  export type InstanceEngineWhereInput = {
    AND?: InstanceEngineWhereInput | InstanceEngineWhereInput[]
    OR?: InstanceEngineWhereInput[]
    NOT?: InstanceEngineWhereInput | InstanceEngineWhereInput[]
    id?: StringFilter<"InstanceEngine"> | string
    instanceId?: StringFilter<"InstanceEngine"> | string
    engineType?: EnumEngineTypeFilter<"InstanceEngine"> | $Enums.EngineType
    enabled?: BoolFilter<"InstanceEngine"> | boolean
    defaultModel?: StringFilter<"InstanceEngine"> | string
    allowedModels?: JsonFilter<"InstanceEngine">
    createdAt?: DateTimeFilter<"InstanceEngine"> | Date | string
    instance?: XOR<InstanceRelationFilter, InstanceWhereInput>
  }

  export type InstanceEngineOrderByWithRelationInput = {
    id?: SortOrder
    instanceId?: SortOrder
    engineType?: SortOrder
    enabled?: SortOrder
    defaultModel?: SortOrder
    allowedModels?: SortOrder
    createdAt?: SortOrder
    instance?: InstanceOrderByWithRelationInput
  }

  export type InstanceEngineWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    instanceId_engineType?: InstanceEngineInstanceIdEngineTypeCompoundUniqueInput
    AND?: InstanceEngineWhereInput | InstanceEngineWhereInput[]
    OR?: InstanceEngineWhereInput[]
    NOT?: InstanceEngineWhereInput | InstanceEngineWhereInput[]
    instanceId?: StringFilter<"InstanceEngine"> | string
    engineType?: EnumEngineTypeFilter<"InstanceEngine"> | $Enums.EngineType
    enabled?: BoolFilter<"InstanceEngine"> | boolean
    defaultModel?: StringFilter<"InstanceEngine"> | string
    allowedModels?: JsonFilter<"InstanceEngine">
    createdAt?: DateTimeFilter<"InstanceEngine"> | Date | string
    instance?: XOR<InstanceRelationFilter, InstanceWhereInput>
  }, "id" | "instanceId_engineType">

  export type InstanceEngineOrderByWithAggregationInput = {
    id?: SortOrder
    instanceId?: SortOrder
    engineType?: SortOrder
    enabled?: SortOrder
    defaultModel?: SortOrder
    allowedModels?: SortOrder
    createdAt?: SortOrder
    _count?: InstanceEngineCountOrderByAggregateInput
    _max?: InstanceEngineMaxOrderByAggregateInput
    _min?: InstanceEngineMinOrderByAggregateInput
  }

  export type InstanceEngineScalarWhereWithAggregatesInput = {
    AND?: InstanceEngineScalarWhereWithAggregatesInput | InstanceEngineScalarWhereWithAggregatesInput[]
    OR?: InstanceEngineScalarWhereWithAggregatesInput[]
    NOT?: InstanceEngineScalarWhereWithAggregatesInput | InstanceEngineScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"InstanceEngine"> | string
    instanceId?: StringWithAggregatesFilter<"InstanceEngine"> | string
    engineType?: EnumEngineTypeWithAggregatesFilter<"InstanceEngine"> | $Enums.EngineType
    enabled?: BoolWithAggregatesFilter<"InstanceEngine"> | boolean
    defaultModel?: StringWithAggregatesFilter<"InstanceEngine"> | string
    allowedModels?: JsonWithAggregatesFilter<"InstanceEngine">
    createdAt?: DateTimeWithAggregatesFilter<"InstanceEngine"> | Date | string
  }

  export type InstancePolicyWhereInput = {
    AND?: InstancePolicyWhereInput | InstancePolicyWhereInput[]
    OR?: InstancePolicyWhereInput[]
    NOT?: InstancePolicyWhereInput | InstancePolicyWhereInput[]
    id?: StringFilter<"InstancePolicy"> | string
    instanceId?: StringFilter<"InstancePolicy"> | string
    allowChat?: BoolFilter<"InstancePolicy"> | boolean
    allowEmotion?: BoolFilter<"InstancePolicy"> | boolean
    allowMemory?: BoolFilter<"InstancePolicy"> | boolean
    allowFinance?: BoolFilter<"InstancePolicy"> | boolean
    allowTerminal?: BoolFilter<"InstancePolicy"> | boolean
    allowSSH?: BoolFilter<"InstancePolicy"> | boolean
    maxTokensPerDay?: IntNullableFilter<"InstancePolicy"> | number | null
    maxRequestsPerDay?: IntNullableFilter<"InstancePolicy"> | number | null
    ipWhitelist?: JsonNullableFilter<"InstancePolicy">
    regionLock?: StringNullableFilter<"InstancePolicy"> | string | null
    auditRequired?: BoolFilter<"InstancePolicy"> | boolean
    piiStrictMode?: BoolFilter<"InstancePolicy"> | boolean
    createdAt?: DateTimeFilter<"InstancePolicy"> | Date | string
    updatedAt?: DateTimeFilter<"InstancePolicy"> | Date | string
    instance?: XOR<InstanceRelationFilter, InstanceWhereInput>
  }

  export type InstancePolicyOrderByWithRelationInput = {
    id?: SortOrder
    instanceId?: SortOrder
    allowChat?: SortOrder
    allowEmotion?: SortOrder
    allowMemory?: SortOrder
    allowFinance?: SortOrder
    allowTerminal?: SortOrder
    allowSSH?: SortOrder
    maxTokensPerDay?: SortOrderInput | SortOrder
    maxRequestsPerDay?: SortOrderInput | SortOrder
    ipWhitelist?: SortOrderInput | SortOrder
    regionLock?: SortOrderInput | SortOrder
    auditRequired?: SortOrder
    piiStrictMode?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    instance?: InstanceOrderByWithRelationInput
  }

  export type InstancePolicyWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    instanceId?: string
    AND?: InstancePolicyWhereInput | InstancePolicyWhereInput[]
    OR?: InstancePolicyWhereInput[]
    NOT?: InstancePolicyWhereInput | InstancePolicyWhereInput[]
    allowChat?: BoolFilter<"InstancePolicy"> | boolean
    allowEmotion?: BoolFilter<"InstancePolicy"> | boolean
    allowMemory?: BoolFilter<"InstancePolicy"> | boolean
    allowFinance?: BoolFilter<"InstancePolicy"> | boolean
    allowTerminal?: BoolFilter<"InstancePolicy"> | boolean
    allowSSH?: BoolFilter<"InstancePolicy"> | boolean
    maxTokensPerDay?: IntNullableFilter<"InstancePolicy"> | number | null
    maxRequestsPerDay?: IntNullableFilter<"InstancePolicy"> | number | null
    ipWhitelist?: JsonNullableFilter<"InstancePolicy">
    regionLock?: StringNullableFilter<"InstancePolicy"> | string | null
    auditRequired?: BoolFilter<"InstancePolicy"> | boolean
    piiStrictMode?: BoolFilter<"InstancePolicy"> | boolean
    createdAt?: DateTimeFilter<"InstancePolicy"> | Date | string
    updatedAt?: DateTimeFilter<"InstancePolicy"> | Date | string
    instance?: XOR<InstanceRelationFilter, InstanceWhereInput>
  }, "id" | "instanceId">

  export type InstancePolicyOrderByWithAggregationInput = {
    id?: SortOrder
    instanceId?: SortOrder
    allowChat?: SortOrder
    allowEmotion?: SortOrder
    allowMemory?: SortOrder
    allowFinance?: SortOrder
    allowTerminal?: SortOrder
    allowSSH?: SortOrder
    maxTokensPerDay?: SortOrderInput | SortOrder
    maxRequestsPerDay?: SortOrderInput | SortOrder
    ipWhitelist?: SortOrderInput | SortOrder
    regionLock?: SortOrderInput | SortOrder
    auditRequired?: SortOrder
    piiStrictMode?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: InstancePolicyCountOrderByAggregateInput
    _avg?: InstancePolicyAvgOrderByAggregateInput
    _max?: InstancePolicyMaxOrderByAggregateInput
    _min?: InstancePolicyMinOrderByAggregateInput
    _sum?: InstancePolicySumOrderByAggregateInput
  }

  export type InstancePolicyScalarWhereWithAggregatesInput = {
    AND?: InstancePolicyScalarWhereWithAggregatesInput | InstancePolicyScalarWhereWithAggregatesInput[]
    OR?: InstancePolicyScalarWhereWithAggregatesInput[]
    NOT?: InstancePolicyScalarWhereWithAggregatesInput | InstancePolicyScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"InstancePolicy"> | string
    instanceId?: StringWithAggregatesFilter<"InstancePolicy"> | string
    allowChat?: BoolWithAggregatesFilter<"InstancePolicy"> | boolean
    allowEmotion?: BoolWithAggregatesFilter<"InstancePolicy"> | boolean
    allowMemory?: BoolWithAggregatesFilter<"InstancePolicy"> | boolean
    allowFinance?: BoolWithAggregatesFilter<"InstancePolicy"> | boolean
    allowTerminal?: BoolWithAggregatesFilter<"InstancePolicy"> | boolean
    allowSSH?: BoolWithAggregatesFilter<"InstancePolicy"> | boolean
    maxTokensPerDay?: IntNullableWithAggregatesFilter<"InstancePolicy"> | number | null
    maxRequestsPerDay?: IntNullableWithAggregatesFilter<"InstancePolicy"> | number | null
    ipWhitelist?: JsonNullableWithAggregatesFilter<"InstancePolicy">
    regionLock?: StringNullableWithAggregatesFilter<"InstancePolicy"> | string | null
    auditRequired?: BoolWithAggregatesFilter<"InstancePolicy"> | boolean
    piiStrictMode?: BoolWithAggregatesFilter<"InstancePolicy"> | boolean
    createdAt?: DateTimeWithAggregatesFilter<"InstancePolicy"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"InstancePolicy"> | Date | string
  }

  export type CpuTierWhereInput = {
    AND?: CpuTierWhereInput | CpuTierWhereInput[]
    OR?: CpuTierWhereInput[]
    NOT?: CpuTierWhereInput | CpuTierWhereInput[]
    id?: StringFilter<"CpuTier"> | string
    name?: StringFilter<"CpuTier"> | string
    cores?: IntFilter<"CpuTier"> | number
    price?: FloatFilter<"CpuTier"> | number
    instances?: InstanceListRelationFilter
  }

  export type CpuTierOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    cores?: SortOrder
    price?: SortOrder
    instances?: InstanceOrderByRelationAggregateInput
  }

  export type CpuTierWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: CpuTierWhereInput | CpuTierWhereInput[]
    OR?: CpuTierWhereInput[]
    NOT?: CpuTierWhereInput | CpuTierWhereInput[]
    name?: StringFilter<"CpuTier"> | string
    cores?: IntFilter<"CpuTier"> | number
    price?: FloatFilter<"CpuTier"> | number
    instances?: InstanceListRelationFilter
  }, "id">

  export type CpuTierOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    cores?: SortOrder
    price?: SortOrder
    _count?: CpuTierCountOrderByAggregateInput
    _avg?: CpuTierAvgOrderByAggregateInput
    _max?: CpuTierMaxOrderByAggregateInput
    _min?: CpuTierMinOrderByAggregateInput
    _sum?: CpuTierSumOrderByAggregateInput
  }

  export type CpuTierScalarWhereWithAggregatesInput = {
    AND?: CpuTierScalarWhereWithAggregatesInput | CpuTierScalarWhereWithAggregatesInput[]
    OR?: CpuTierScalarWhereWithAggregatesInput[]
    NOT?: CpuTierScalarWhereWithAggregatesInput | CpuTierScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"CpuTier"> | string
    name?: StringWithAggregatesFilter<"CpuTier"> | string
    cores?: IntWithAggregatesFilter<"CpuTier"> | number
    price?: FloatWithAggregatesFilter<"CpuTier"> | number
  }

  export type NodeTierWhereInput = {
    AND?: NodeTierWhereInput | NodeTierWhereInput[]
    OR?: NodeTierWhereInput[]
    NOT?: NodeTierWhereInput | NodeTierWhereInput[]
    id?: StringFilter<"NodeTier"> | string
    name?: StringFilter<"NodeTier"> | string
    nodes?: IntFilter<"NodeTier"> | number
    price?: FloatFilter<"NodeTier"> | number
    instances?: InstanceListRelationFilter
  }

  export type NodeTierOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    nodes?: SortOrder
    price?: SortOrder
    instances?: InstanceOrderByRelationAggregateInput
  }

  export type NodeTierWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: NodeTierWhereInput | NodeTierWhereInput[]
    OR?: NodeTierWhereInput[]
    NOT?: NodeTierWhereInput | NodeTierWhereInput[]
    name?: StringFilter<"NodeTier"> | string
    nodes?: IntFilter<"NodeTier"> | number
    price?: FloatFilter<"NodeTier"> | number
    instances?: InstanceListRelationFilter
  }, "id">

  export type NodeTierOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    nodes?: SortOrder
    price?: SortOrder
    _count?: NodeTierCountOrderByAggregateInput
    _avg?: NodeTierAvgOrderByAggregateInput
    _max?: NodeTierMaxOrderByAggregateInput
    _min?: NodeTierMinOrderByAggregateInput
    _sum?: NodeTierSumOrderByAggregateInput
  }

  export type NodeTierScalarWhereWithAggregatesInput = {
    AND?: NodeTierScalarWhereWithAggregatesInput | NodeTierScalarWhereWithAggregatesInput[]
    OR?: NodeTierScalarWhereWithAggregatesInput[]
    NOT?: NodeTierScalarWhereWithAggregatesInput | NodeTierScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"NodeTier"> | string
    name?: StringWithAggregatesFilter<"NodeTier"> | string
    nodes?: IntWithAggregatesFilter<"NodeTier"> | number
    price?: FloatWithAggregatesFilter<"NodeTier"> | number
  }

  export type EngineTierWhereInput = {
    AND?: EngineTierWhereInput | EngineTierWhereInput[]
    OR?: EngineTierWhereInput[]
    NOT?: EngineTierWhereInput | EngineTierWhereInput[]
    id?: StringFilter<"EngineTier"> | string
    name?: StringFilter<"EngineTier"> | string
    profile?: StringFilter<"EngineTier"> | string
    price?: FloatFilter<"EngineTier"> | number
    instances?: InstanceListRelationFilter
  }

  export type EngineTierOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    profile?: SortOrder
    price?: SortOrder
    instances?: InstanceOrderByRelationAggregateInput
  }

  export type EngineTierWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: EngineTierWhereInput | EngineTierWhereInput[]
    OR?: EngineTierWhereInput[]
    NOT?: EngineTierWhereInput | EngineTierWhereInput[]
    name?: StringFilter<"EngineTier"> | string
    profile?: StringFilter<"EngineTier"> | string
    price?: FloatFilter<"EngineTier"> | number
    instances?: InstanceListRelationFilter
  }, "id">

  export type EngineTierOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    profile?: SortOrder
    price?: SortOrder
    _count?: EngineTierCountOrderByAggregateInput
    _avg?: EngineTierAvgOrderByAggregateInput
    _max?: EngineTierMaxOrderByAggregateInput
    _min?: EngineTierMinOrderByAggregateInput
    _sum?: EngineTierSumOrderByAggregateInput
  }

  export type EngineTierScalarWhereWithAggregatesInput = {
    AND?: EngineTierScalarWhereWithAggregatesInput | EngineTierScalarWhereWithAggregatesInput[]
    OR?: EngineTierScalarWhereWithAggregatesInput[]
    NOT?: EngineTierScalarWhereWithAggregatesInput | EngineTierScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"EngineTier"> | string
    name?: StringWithAggregatesFilter<"EngineTier"> | string
    profile?: StringWithAggregatesFilter<"EngineTier"> | string
    price?: FloatWithAggregatesFilter<"EngineTier"> | number
  }

  export type QpuTierWhereInput = {
    AND?: QpuTierWhereInput | QpuTierWhereInput[]
    OR?: QpuTierWhereInput[]
    NOT?: QpuTierWhereInput | QpuTierWhereInput[]
    id?: StringFilter<"QpuTier"> | string
    name?: StringFilter<"QpuTier"> | string
    parallel?: BoolFilter<"QpuTier"> | boolean
    price?: FloatFilter<"QpuTier"> | number
    instances?: InstanceListRelationFilter
  }

  export type QpuTierOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    parallel?: SortOrder
    price?: SortOrder
    instances?: InstanceOrderByRelationAggregateInput
  }

  export type QpuTierWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: QpuTierWhereInput | QpuTierWhereInput[]
    OR?: QpuTierWhereInput[]
    NOT?: QpuTierWhereInput | QpuTierWhereInput[]
    name?: StringFilter<"QpuTier"> | string
    parallel?: BoolFilter<"QpuTier"> | boolean
    price?: FloatFilter<"QpuTier"> | number
    instances?: InstanceListRelationFilter
  }, "id">

  export type QpuTierOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    parallel?: SortOrder
    price?: SortOrder
    _count?: QpuTierCountOrderByAggregateInput
    _avg?: QpuTierAvgOrderByAggregateInput
    _max?: QpuTierMaxOrderByAggregateInput
    _min?: QpuTierMinOrderByAggregateInput
    _sum?: QpuTierSumOrderByAggregateInput
  }

  export type QpuTierScalarWhereWithAggregatesInput = {
    AND?: QpuTierScalarWhereWithAggregatesInput | QpuTierScalarWhereWithAggregatesInput[]
    OR?: QpuTierScalarWhereWithAggregatesInput[]
    NOT?: QpuTierScalarWhereWithAggregatesInput | QpuTierScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"QpuTier"> | string
    name?: StringWithAggregatesFilter<"QpuTier"> | string
    parallel?: BoolWithAggregatesFilter<"QpuTier"> | boolean
    price?: FloatWithAggregatesFilter<"QpuTier"> | number
  }

  export type OmegaTierWhereInput = {
    AND?: OmegaTierWhereInput | OmegaTierWhereInput[]
    OR?: OmegaTierWhereInput[]
    NOT?: OmegaTierWhereInput | OmegaTierWhereInput[]
    id?: StringFilter<"OmegaTier"> | string
    name?: StringFilter<"OmegaTier"> | string
    cognitive?: BoolFilter<"OmegaTier"> | boolean
    price?: FloatFilter<"OmegaTier"> | number
    instances?: InstanceListRelationFilter
  }

  export type OmegaTierOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    cognitive?: SortOrder
    price?: SortOrder
    instances?: InstanceOrderByRelationAggregateInput
  }

  export type OmegaTierWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: OmegaTierWhereInput | OmegaTierWhereInput[]
    OR?: OmegaTierWhereInput[]
    NOT?: OmegaTierWhereInput | OmegaTierWhereInput[]
    name?: StringFilter<"OmegaTier"> | string
    cognitive?: BoolFilter<"OmegaTier"> | boolean
    price?: FloatFilter<"OmegaTier"> | number
    instances?: InstanceListRelationFilter
  }, "id">

  export type OmegaTierOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    cognitive?: SortOrder
    price?: SortOrder
    _count?: OmegaTierCountOrderByAggregateInput
    _avg?: OmegaTierAvgOrderByAggregateInput
    _max?: OmegaTierMaxOrderByAggregateInput
    _min?: OmegaTierMinOrderByAggregateInput
    _sum?: OmegaTierSumOrderByAggregateInput
  }

  export type OmegaTierScalarWhereWithAggregatesInput = {
    AND?: OmegaTierScalarWhereWithAggregatesInput | OmegaTierScalarWhereWithAggregatesInput[]
    OR?: OmegaTierScalarWhereWithAggregatesInput[]
    NOT?: OmegaTierScalarWhereWithAggregatesInput | OmegaTierScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"OmegaTier"> | string
    name?: StringWithAggregatesFilter<"OmegaTier"> | string
    cognitive?: BoolWithAggregatesFilter<"OmegaTier"> | boolean
    price?: FloatWithAggregatesFilter<"OmegaTier"> | number
  }

  export type SnapshotWhereInput = {
    AND?: SnapshotWhereInput | SnapshotWhereInput[]
    OR?: SnapshotWhereInput[]
    NOT?: SnapshotWhereInput | SnapshotWhereInput[]
    id?: StringFilter<"Snapshot"> | string
    instanceId?: StringFilter<"Snapshot"> | string
    metadata?: JsonFilter<"Snapshot">
    createdAt?: DateTimeFilter<"Snapshot"> | Date | string
    instance?: XOR<InstanceRelationFilter, InstanceWhereInput>
  }

  export type SnapshotOrderByWithRelationInput = {
    id?: SortOrder
    instanceId?: SortOrder
    metadata?: SortOrder
    createdAt?: SortOrder
    instance?: InstanceOrderByWithRelationInput
  }

  export type SnapshotWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: SnapshotWhereInput | SnapshotWhereInput[]
    OR?: SnapshotWhereInput[]
    NOT?: SnapshotWhereInput | SnapshotWhereInput[]
    instanceId?: StringFilter<"Snapshot"> | string
    metadata?: JsonFilter<"Snapshot">
    createdAt?: DateTimeFilter<"Snapshot"> | Date | string
    instance?: XOR<InstanceRelationFilter, InstanceWhereInput>
  }, "id">

  export type SnapshotOrderByWithAggregationInput = {
    id?: SortOrder
    instanceId?: SortOrder
    metadata?: SortOrder
    createdAt?: SortOrder
    _count?: SnapshotCountOrderByAggregateInput
    _max?: SnapshotMaxOrderByAggregateInput
    _min?: SnapshotMinOrderByAggregateInput
  }

  export type SnapshotScalarWhereWithAggregatesInput = {
    AND?: SnapshotScalarWhereWithAggregatesInput | SnapshotScalarWhereWithAggregatesInput[]
    OR?: SnapshotScalarWhereWithAggregatesInput[]
    NOT?: SnapshotScalarWhereWithAggregatesInput | SnapshotScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Snapshot"> | string
    instanceId?: StringWithAggregatesFilter<"Snapshot"> | string
    metadata?: JsonWithAggregatesFilter<"Snapshot">
    createdAt?: DateTimeWithAggregatesFilter<"Snapshot"> | Date | string
  }

  export type InstanceLogWhereInput = {
    AND?: InstanceLogWhereInput | InstanceLogWhereInput[]
    OR?: InstanceLogWhereInput[]
    NOT?: InstanceLogWhereInput | InstanceLogWhereInput[]
    id?: StringFilter<"InstanceLog"> | string
    instanceId?: StringFilter<"InstanceLog"> | string
    event?: StringFilter<"InstanceLog"> | string
    detail?: JsonFilter<"InstanceLog">
    createdAt?: DateTimeFilter<"InstanceLog"> | Date | string
    instance?: XOR<InstanceRelationFilter, InstanceWhereInput>
  }

  export type InstanceLogOrderByWithRelationInput = {
    id?: SortOrder
    instanceId?: SortOrder
    event?: SortOrder
    detail?: SortOrder
    createdAt?: SortOrder
    instance?: InstanceOrderByWithRelationInput
  }

  export type InstanceLogWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: InstanceLogWhereInput | InstanceLogWhereInput[]
    OR?: InstanceLogWhereInput[]
    NOT?: InstanceLogWhereInput | InstanceLogWhereInput[]
    instanceId?: StringFilter<"InstanceLog"> | string
    event?: StringFilter<"InstanceLog"> | string
    detail?: JsonFilter<"InstanceLog">
    createdAt?: DateTimeFilter<"InstanceLog"> | Date | string
    instance?: XOR<InstanceRelationFilter, InstanceWhereInput>
  }, "id">

  export type InstanceLogOrderByWithAggregationInput = {
    id?: SortOrder
    instanceId?: SortOrder
    event?: SortOrder
    detail?: SortOrder
    createdAt?: SortOrder
    _count?: InstanceLogCountOrderByAggregateInput
    _max?: InstanceLogMaxOrderByAggregateInput
    _min?: InstanceLogMinOrderByAggregateInput
  }

  export type InstanceLogScalarWhereWithAggregatesInput = {
    AND?: InstanceLogScalarWhereWithAggregatesInput | InstanceLogScalarWhereWithAggregatesInput[]
    OR?: InstanceLogScalarWhereWithAggregatesInput[]
    NOT?: InstanceLogScalarWhereWithAggregatesInput | InstanceLogScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"InstanceLog"> | string
    instanceId?: StringWithAggregatesFilter<"InstanceLog"> | string
    event?: StringWithAggregatesFilter<"InstanceLog"> | string
    detail?: JsonWithAggregatesFilter<"InstanceLog">
    createdAt?: DateTimeWithAggregatesFilter<"InstanceLog"> | Date | string
  }

  export type BillingRecordWhereInput = {
    AND?: BillingRecordWhereInput | BillingRecordWhereInput[]
    OR?: BillingRecordWhereInput[]
    NOT?: BillingRecordWhereInput | BillingRecordWhereInput[]
    id?: StringFilter<"BillingRecord"> | string
    instanceId?: StringFilter<"BillingRecord"> | string
    amount?: FloatFilter<"BillingRecord"> | number
    reason?: StringFilter<"BillingRecord"> | string
    createdAt?: DateTimeFilter<"BillingRecord"> | Date | string
    instance?: XOR<InstanceRelationFilter, InstanceWhereInput>
  }

  export type BillingRecordOrderByWithRelationInput = {
    id?: SortOrder
    instanceId?: SortOrder
    amount?: SortOrder
    reason?: SortOrder
    createdAt?: SortOrder
    instance?: InstanceOrderByWithRelationInput
  }

  export type BillingRecordWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: BillingRecordWhereInput | BillingRecordWhereInput[]
    OR?: BillingRecordWhereInput[]
    NOT?: BillingRecordWhereInput | BillingRecordWhereInput[]
    instanceId?: StringFilter<"BillingRecord"> | string
    amount?: FloatFilter<"BillingRecord"> | number
    reason?: StringFilter<"BillingRecord"> | string
    createdAt?: DateTimeFilter<"BillingRecord"> | Date | string
    instance?: XOR<InstanceRelationFilter, InstanceWhereInput>
  }, "id">

  export type BillingRecordOrderByWithAggregationInput = {
    id?: SortOrder
    instanceId?: SortOrder
    amount?: SortOrder
    reason?: SortOrder
    createdAt?: SortOrder
    _count?: BillingRecordCountOrderByAggregateInput
    _avg?: BillingRecordAvgOrderByAggregateInput
    _max?: BillingRecordMaxOrderByAggregateInput
    _min?: BillingRecordMinOrderByAggregateInput
    _sum?: BillingRecordSumOrderByAggregateInput
  }

  export type BillingRecordScalarWhereWithAggregatesInput = {
    AND?: BillingRecordScalarWhereWithAggregatesInput | BillingRecordScalarWhereWithAggregatesInput[]
    OR?: BillingRecordScalarWhereWithAggregatesInput[]
    NOT?: BillingRecordScalarWhereWithAggregatesInput | BillingRecordScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"BillingRecord"> | string
    instanceId?: StringWithAggregatesFilter<"BillingRecord"> | string
    amount?: FloatWithAggregatesFilter<"BillingRecord"> | number
    reason?: StringWithAggregatesFilter<"BillingRecord"> | string
    createdAt?: DateTimeWithAggregatesFilter<"BillingRecord"> | Date | string
  }

  export type ExecutionGraphWhereInput = {
    AND?: ExecutionGraphWhereInput | ExecutionGraphWhereInput[]
    OR?: ExecutionGraphWhereInput[]
    NOT?: ExecutionGraphWhereInput | ExecutionGraphWhereInput[]
    id?: StringFilter<"ExecutionGraph"> | string
    instanceId?: StringFilter<"ExecutionGraph"> | string
    graph?: JsonFilter<"ExecutionGraph">
    createdAt?: DateTimeFilter<"ExecutionGraph"> | Date | string
    instance?: XOR<InstanceRelationFilter, InstanceWhereInput>
  }

  export type ExecutionGraphOrderByWithRelationInput = {
    id?: SortOrder
    instanceId?: SortOrder
    graph?: SortOrder
    createdAt?: SortOrder
    instance?: InstanceOrderByWithRelationInput
  }

  export type ExecutionGraphWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: ExecutionGraphWhereInput | ExecutionGraphWhereInput[]
    OR?: ExecutionGraphWhereInput[]
    NOT?: ExecutionGraphWhereInput | ExecutionGraphWhereInput[]
    instanceId?: StringFilter<"ExecutionGraph"> | string
    graph?: JsonFilter<"ExecutionGraph">
    createdAt?: DateTimeFilter<"ExecutionGraph"> | Date | string
    instance?: XOR<InstanceRelationFilter, InstanceWhereInput>
  }, "id">

  export type ExecutionGraphOrderByWithAggregationInput = {
    id?: SortOrder
    instanceId?: SortOrder
    graph?: SortOrder
    createdAt?: SortOrder
    _count?: ExecutionGraphCountOrderByAggregateInput
    _max?: ExecutionGraphMaxOrderByAggregateInput
    _min?: ExecutionGraphMinOrderByAggregateInput
  }

  export type ExecutionGraphScalarWhereWithAggregatesInput = {
    AND?: ExecutionGraphScalarWhereWithAggregatesInput | ExecutionGraphScalarWhereWithAggregatesInput[]
    OR?: ExecutionGraphScalarWhereWithAggregatesInput[]
    NOT?: ExecutionGraphScalarWhereWithAggregatesInput | ExecutionGraphScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"ExecutionGraph"> | string
    instanceId?: StringWithAggregatesFilter<"ExecutionGraph"> | string
    graph?: JsonWithAggregatesFilter<"ExecutionGraph">
    createdAt?: DateTimeWithAggregatesFilter<"ExecutionGraph"> | Date | string
  }

  export type snapshot_historyWhereInput = {
    AND?: snapshot_historyWhereInput | snapshot_historyWhereInput[]
    OR?: snapshot_historyWhereInput[]
    NOT?: snapshot_historyWhereInput | snapshot_historyWhereInput[]
    id?: IntFilter<"snapshot_history"> | number
    snapshot_name?: StringFilter<"snapshot_history"> | string
    instance_id?: StringNullableFilter<"snapshot_history"> | string | null
    created_at?: DateTimeFilter<"snapshot_history"> | Date | string
  }

  export type snapshot_historyOrderByWithRelationInput = {
    id?: SortOrder
    snapshot_name?: SortOrder
    instance_id?: SortOrderInput | SortOrder
    created_at?: SortOrder
  }

  export type snapshot_historyWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: snapshot_historyWhereInput | snapshot_historyWhereInput[]
    OR?: snapshot_historyWhereInput[]
    NOT?: snapshot_historyWhereInput | snapshot_historyWhereInput[]
    snapshot_name?: StringFilter<"snapshot_history"> | string
    instance_id?: StringNullableFilter<"snapshot_history"> | string | null
    created_at?: DateTimeFilter<"snapshot_history"> | Date | string
  }, "id">

  export type snapshot_historyOrderByWithAggregationInput = {
    id?: SortOrder
    snapshot_name?: SortOrder
    instance_id?: SortOrderInput | SortOrder
    created_at?: SortOrder
    _count?: snapshot_historyCountOrderByAggregateInput
    _avg?: snapshot_historyAvgOrderByAggregateInput
    _max?: snapshot_historyMaxOrderByAggregateInput
    _min?: snapshot_historyMinOrderByAggregateInput
    _sum?: snapshot_historySumOrderByAggregateInput
  }

  export type snapshot_historyScalarWhereWithAggregatesInput = {
    AND?: snapshot_historyScalarWhereWithAggregatesInput | snapshot_historyScalarWhereWithAggregatesInput[]
    OR?: snapshot_historyScalarWhereWithAggregatesInput[]
    NOT?: snapshot_historyScalarWhereWithAggregatesInput | snapshot_historyScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"snapshot_history"> | number
    snapshot_name?: StringWithAggregatesFilter<"snapshot_history"> | string
    instance_id?: StringNullableWithAggregatesFilter<"snapshot_history"> | string | null
    created_at?: DateTimeWithAggregatesFilter<"snapshot_history"> | Date | string
  }

  export type TerminalSessionWhereInput = {
    AND?: TerminalSessionWhereInput | TerminalSessionWhereInput[]
    OR?: TerminalSessionWhereInput[]
    NOT?: TerminalSessionWhereInput | TerminalSessionWhereInput[]
    id?: StringFilter<"TerminalSession"> | string
    token?: StringFilter<"TerminalSession"> | string
    instanceId?: StringFilter<"TerminalSession"> | string
    userId?: StringFilter<"TerminalSession"> | string
    scope?: StringFilter<"TerminalSession"> | string
    issuedAt?: DateTimeFilter<"TerminalSession"> | Date | string
    expiresAt?: DateTimeFilter<"TerminalSession"> | Date | string
    revokedAt?: DateTimeNullableFilter<"TerminalSession"> | Date | string | null
    lastVerifiedAt?: DateTimeNullableFilter<"TerminalSession"> | Date | string | null
    instance?: XOR<InstanceRelationFilter, InstanceWhereInput>
  }

  export type TerminalSessionOrderByWithRelationInput = {
    id?: SortOrder
    token?: SortOrder
    instanceId?: SortOrder
    userId?: SortOrder
    scope?: SortOrder
    issuedAt?: SortOrder
    expiresAt?: SortOrder
    revokedAt?: SortOrderInput | SortOrder
    lastVerifiedAt?: SortOrderInput | SortOrder
    instance?: InstanceOrderByWithRelationInput
  }

  export type TerminalSessionWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    token?: string
    AND?: TerminalSessionWhereInput | TerminalSessionWhereInput[]
    OR?: TerminalSessionWhereInput[]
    NOT?: TerminalSessionWhereInput | TerminalSessionWhereInput[]
    instanceId?: StringFilter<"TerminalSession"> | string
    userId?: StringFilter<"TerminalSession"> | string
    scope?: StringFilter<"TerminalSession"> | string
    issuedAt?: DateTimeFilter<"TerminalSession"> | Date | string
    expiresAt?: DateTimeFilter<"TerminalSession"> | Date | string
    revokedAt?: DateTimeNullableFilter<"TerminalSession"> | Date | string | null
    lastVerifiedAt?: DateTimeNullableFilter<"TerminalSession"> | Date | string | null
    instance?: XOR<InstanceRelationFilter, InstanceWhereInput>
  }, "id" | "token">

  export type TerminalSessionOrderByWithAggregationInput = {
    id?: SortOrder
    token?: SortOrder
    instanceId?: SortOrder
    userId?: SortOrder
    scope?: SortOrder
    issuedAt?: SortOrder
    expiresAt?: SortOrder
    revokedAt?: SortOrderInput | SortOrder
    lastVerifiedAt?: SortOrderInput | SortOrder
    _count?: TerminalSessionCountOrderByAggregateInput
    _max?: TerminalSessionMaxOrderByAggregateInput
    _min?: TerminalSessionMinOrderByAggregateInput
  }

  export type TerminalSessionScalarWhereWithAggregatesInput = {
    AND?: TerminalSessionScalarWhereWithAggregatesInput | TerminalSessionScalarWhereWithAggregatesInput[]
    OR?: TerminalSessionScalarWhereWithAggregatesInput[]
    NOT?: TerminalSessionScalarWhereWithAggregatesInput | TerminalSessionScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"TerminalSession"> | string
    token?: StringWithAggregatesFilter<"TerminalSession"> | string
    instanceId?: StringWithAggregatesFilter<"TerminalSession"> | string
    userId?: StringWithAggregatesFilter<"TerminalSession"> | string
    scope?: StringWithAggregatesFilter<"TerminalSession"> | string
    issuedAt?: DateTimeWithAggregatesFilter<"TerminalSession"> | Date | string
    expiresAt?: DateTimeWithAggregatesFilter<"TerminalSession"> | Date | string
    revokedAt?: DateTimeNullableWithAggregatesFilter<"TerminalSession"> | Date | string | null
    lastVerifiedAt?: DateTimeNullableWithAggregatesFilter<"TerminalSession"> | Date | string | null
  }

  export type InstanceCreateInput = {
    id?: string
    name: string
    ownerId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    status?: $Enums.InstanceStatus
    autoscale?: boolean
    cpuTier: CpuTierCreateNestedOneWithoutInstancesInput
    nodeTier: NodeTierCreateNestedOneWithoutInstancesInput
    engineTier: EngineTierCreateNestedOneWithoutInstancesInput
    qpuTier?: QpuTierCreateNestedOneWithoutInstancesInput
    omegaTier?: OmegaTierCreateNestedOneWithoutInstancesInput
    engines?: InstanceEngineCreateNestedManyWithoutInstanceInput
    policy?: InstancePolicyCreateNestedOneWithoutInstanceInput
    terminalSessions?: TerminalSessionCreateNestedManyWithoutInstanceInput
    snapshots?: SnapshotCreateNestedManyWithoutInstanceInput
    logs?: InstanceLogCreateNestedManyWithoutInstanceInput
    billingRecords?: BillingRecordCreateNestedManyWithoutInstanceInput
    executionGraphs?: ExecutionGraphCreateNestedManyWithoutInstanceInput
  }

  export type InstanceUncheckedCreateInput = {
    id?: string
    name: string
    ownerId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    cpuTierId: string
    nodeTierId: string
    engineTierId: string
    qpuTierId?: string | null
    omegaTierId?: string | null
    status?: $Enums.InstanceStatus
    autoscale?: boolean
    engines?: InstanceEngineUncheckedCreateNestedManyWithoutInstanceInput
    policy?: InstancePolicyUncheckedCreateNestedOneWithoutInstanceInput
    terminalSessions?: TerminalSessionUncheckedCreateNestedManyWithoutInstanceInput
    snapshots?: SnapshotUncheckedCreateNestedManyWithoutInstanceInput
    logs?: InstanceLogUncheckedCreateNestedManyWithoutInstanceInput
    billingRecords?: BillingRecordUncheckedCreateNestedManyWithoutInstanceInput
    executionGraphs?: ExecutionGraphUncheckedCreateNestedManyWithoutInstanceInput
  }

  export type InstanceUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    ownerId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: EnumInstanceStatusFieldUpdateOperationsInput | $Enums.InstanceStatus
    autoscale?: BoolFieldUpdateOperationsInput | boolean
    cpuTier?: CpuTierUpdateOneRequiredWithoutInstancesNestedInput
    nodeTier?: NodeTierUpdateOneRequiredWithoutInstancesNestedInput
    engineTier?: EngineTierUpdateOneRequiredWithoutInstancesNestedInput
    qpuTier?: QpuTierUpdateOneWithoutInstancesNestedInput
    omegaTier?: OmegaTierUpdateOneWithoutInstancesNestedInput
    engines?: InstanceEngineUpdateManyWithoutInstanceNestedInput
    policy?: InstancePolicyUpdateOneWithoutInstanceNestedInput
    terminalSessions?: TerminalSessionUpdateManyWithoutInstanceNestedInput
    snapshots?: SnapshotUpdateManyWithoutInstanceNestedInput
    logs?: InstanceLogUpdateManyWithoutInstanceNestedInput
    billingRecords?: BillingRecordUpdateManyWithoutInstanceNestedInput
    executionGraphs?: ExecutionGraphUpdateManyWithoutInstanceNestedInput
  }

  export type InstanceUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    ownerId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    cpuTierId?: StringFieldUpdateOperationsInput | string
    nodeTierId?: StringFieldUpdateOperationsInput | string
    engineTierId?: StringFieldUpdateOperationsInput | string
    qpuTierId?: NullableStringFieldUpdateOperationsInput | string | null
    omegaTierId?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumInstanceStatusFieldUpdateOperationsInput | $Enums.InstanceStatus
    autoscale?: BoolFieldUpdateOperationsInput | boolean
    engines?: InstanceEngineUncheckedUpdateManyWithoutInstanceNestedInput
    policy?: InstancePolicyUncheckedUpdateOneWithoutInstanceNestedInput
    terminalSessions?: TerminalSessionUncheckedUpdateManyWithoutInstanceNestedInput
    snapshots?: SnapshotUncheckedUpdateManyWithoutInstanceNestedInput
    logs?: InstanceLogUncheckedUpdateManyWithoutInstanceNestedInput
    billingRecords?: BillingRecordUncheckedUpdateManyWithoutInstanceNestedInput
    executionGraphs?: ExecutionGraphUncheckedUpdateManyWithoutInstanceNestedInput
  }

  export type InstanceCreateManyInput = {
    id?: string
    name: string
    ownerId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    cpuTierId: string
    nodeTierId: string
    engineTierId: string
    qpuTierId?: string | null
    omegaTierId?: string | null
    status?: $Enums.InstanceStatus
    autoscale?: boolean
  }

  export type InstanceUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    ownerId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: EnumInstanceStatusFieldUpdateOperationsInput | $Enums.InstanceStatus
    autoscale?: BoolFieldUpdateOperationsInput | boolean
  }

  export type InstanceUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    ownerId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    cpuTierId?: StringFieldUpdateOperationsInput | string
    nodeTierId?: StringFieldUpdateOperationsInput | string
    engineTierId?: StringFieldUpdateOperationsInput | string
    qpuTierId?: NullableStringFieldUpdateOperationsInput | string | null
    omegaTierId?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumInstanceStatusFieldUpdateOperationsInput | $Enums.InstanceStatus
    autoscale?: BoolFieldUpdateOperationsInput | boolean
  }

  export type InstanceEngineCreateInput = {
    id?: string
    engineType: $Enums.EngineType
    enabled?: boolean
    defaultModel: string
    allowedModels: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    instance: InstanceCreateNestedOneWithoutEnginesInput
  }

  export type InstanceEngineUncheckedCreateInput = {
    id?: string
    instanceId: string
    engineType: $Enums.EngineType
    enabled?: boolean
    defaultModel: string
    allowedModels: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type InstanceEngineUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    engineType?: EnumEngineTypeFieldUpdateOperationsInput | $Enums.EngineType
    enabled?: BoolFieldUpdateOperationsInput | boolean
    defaultModel?: StringFieldUpdateOperationsInput | string
    allowedModels?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    instance?: InstanceUpdateOneRequiredWithoutEnginesNestedInput
  }

  export type InstanceEngineUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    instanceId?: StringFieldUpdateOperationsInput | string
    engineType?: EnumEngineTypeFieldUpdateOperationsInput | $Enums.EngineType
    enabled?: BoolFieldUpdateOperationsInput | boolean
    defaultModel?: StringFieldUpdateOperationsInput | string
    allowedModels?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type InstanceEngineCreateManyInput = {
    id?: string
    instanceId: string
    engineType: $Enums.EngineType
    enabled?: boolean
    defaultModel: string
    allowedModels: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type InstanceEngineUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    engineType?: EnumEngineTypeFieldUpdateOperationsInput | $Enums.EngineType
    enabled?: BoolFieldUpdateOperationsInput | boolean
    defaultModel?: StringFieldUpdateOperationsInput | string
    allowedModels?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type InstanceEngineUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    instanceId?: StringFieldUpdateOperationsInput | string
    engineType?: EnumEngineTypeFieldUpdateOperationsInput | $Enums.EngineType
    enabled?: BoolFieldUpdateOperationsInput | boolean
    defaultModel?: StringFieldUpdateOperationsInput | string
    allowedModels?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type InstancePolicyCreateInput = {
    id?: string
    allowChat?: boolean
    allowEmotion?: boolean
    allowMemory?: boolean
    allowFinance?: boolean
    allowTerminal?: boolean
    allowSSH?: boolean
    maxTokensPerDay?: number | null
    maxRequestsPerDay?: number | null
    ipWhitelist?: NullableJsonNullValueInput | InputJsonValue
    regionLock?: string | null
    auditRequired?: boolean
    piiStrictMode?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    instance: InstanceCreateNestedOneWithoutPolicyInput
  }

  export type InstancePolicyUncheckedCreateInput = {
    id?: string
    instanceId: string
    allowChat?: boolean
    allowEmotion?: boolean
    allowMemory?: boolean
    allowFinance?: boolean
    allowTerminal?: boolean
    allowSSH?: boolean
    maxTokensPerDay?: number | null
    maxRequestsPerDay?: number | null
    ipWhitelist?: NullableJsonNullValueInput | InputJsonValue
    regionLock?: string | null
    auditRequired?: boolean
    piiStrictMode?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type InstancePolicyUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    allowChat?: BoolFieldUpdateOperationsInput | boolean
    allowEmotion?: BoolFieldUpdateOperationsInput | boolean
    allowMemory?: BoolFieldUpdateOperationsInput | boolean
    allowFinance?: BoolFieldUpdateOperationsInput | boolean
    allowTerminal?: BoolFieldUpdateOperationsInput | boolean
    allowSSH?: BoolFieldUpdateOperationsInput | boolean
    maxTokensPerDay?: NullableIntFieldUpdateOperationsInput | number | null
    maxRequestsPerDay?: NullableIntFieldUpdateOperationsInput | number | null
    ipWhitelist?: NullableJsonNullValueInput | InputJsonValue
    regionLock?: NullableStringFieldUpdateOperationsInput | string | null
    auditRequired?: BoolFieldUpdateOperationsInput | boolean
    piiStrictMode?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    instance?: InstanceUpdateOneRequiredWithoutPolicyNestedInput
  }

  export type InstancePolicyUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    instanceId?: StringFieldUpdateOperationsInput | string
    allowChat?: BoolFieldUpdateOperationsInput | boolean
    allowEmotion?: BoolFieldUpdateOperationsInput | boolean
    allowMemory?: BoolFieldUpdateOperationsInput | boolean
    allowFinance?: BoolFieldUpdateOperationsInput | boolean
    allowTerminal?: BoolFieldUpdateOperationsInput | boolean
    allowSSH?: BoolFieldUpdateOperationsInput | boolean
    maxTokensPerDay?: NullableIntFieldUpdateOperationsInput | number | null
    maxRequestsPerDay?: NullableIntFieldUpdateOperationsInput | number | null
    ipWhitelist?: NullableJsonNullValueInput | InputJsonValue
    regionLock?: NullableStringFieldUpdateOperationsInput | string | null
    auditRequired?: BoolFieldUpdateOperationsInput | boolean
    piiStrictMode?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type InstancePolicyCreateManyInput = {
    id?: string
    instanceId: string
    allowChat?: boolean
    allowEmotion?: boolean
    allowMemory?: boolean
    allowFinance?: boolean
    allowTerminal?: boolean
    allowSSH?: boolean
    maxTokensPerDay?: number | null
    maxRequestsPerDay?: number | null
    ipWhitelist?: NullableJsonNullValueInput | InputJsonValue
    regionLock?: string | null
    auditRequired?: boolean
    piiStrictMode?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type InstancePolicyUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    allowChat?: BoolFieldUpdateOperationsInput | boolean
    allowEmotion?: BoolFieldUpdateOperationsInput | boolean
    allowMemory?: BoolFieldUpdateOperationsInput | boolean
    allowFinance?: BoolFieldUpdateOperationsInput | boolean
    allowTerminal?: BoolFieldUpdateOperationsInput | boolean
    allowSSH?: BoolFieldUpdateOperationsInput | boolean
    maxTokensPerDay?: NullableIntFieldUpdateOperationsInput | number | null
    maxRequestsPerDay?: NullableIntFieldUpdateOperationsInput | number | null
    ipWhitelist?: NullableJsonNullValueInput | InputJsonValue
    regionLock?: NullableStringFieldUpdateOperationsInput | string | null
    auditRequired?: BoolFieldUpdateOperationsInput | boolean
    piiStrictMode?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type InstancePolicyUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    instanceId?: StringFieldUpdateOperationsInput | string
    allowChat?: BoolFieldUpdateOperationsInput | boolean
    allowEmotion?: BoolFieldUpdateOperationsInput | boolean
    allowMemory?: BoolFieldUpdateOperationsInput | boolean
    allowFinance?: BoolFieldUpdateOperationsInput | boolean
    allowTerminal?: BoolFieldUpdateOperationsInput | boolean
    allowSSH?: BoolFieldUpdateOperationsInput | boolean
    maxTokensPerDay?: NullableIntFieldUpdateOperationsInput | number | null
    maxRequestsPerDay?: NullableIntFieldUpdateOperationsInput | number | null
    ipWhitelist?: NullableJsonNullValueInput | InputJsonValue
    regionLock?: NullableStringFieldUpdateOperationsInput | string | null
    auditRequired?: BoolFieldUpdateOperationsInput | boolean
    piiStrictMode?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CpuTierCreateInput = {
    id?: string
    name: string
    cores: number
    price: number
    instances?: InstanceCreateNestedManyWithoutCpuTierInput
  }

  export type CpuTierUncheckedCreateInput = {
    id?: string
    name: string
    cores: number
    price: number
    instances?: InstanceUncheckedCreateNestedManyWithoutCpuTierInput
  }

  export type CpuTierUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    cores?: IntFieldUpdateOperationsInput | number
    price?: FloatFieldUpdateOperationsInput | number
    instances?: InstanceUpdateManyWithoutCpuTierNestedInput
  }

  export type CpuTierUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    cores?: IntFieldUpdateOperationsInput | number
    price?: FloatFieldUpdateOperationsInput | number
    instances?: InstanceUncheckedUpdateManyWithoutCpuTierNestedInput
  }

  export type CpuTierCreateManyInput = {
    id?: string
    name: string
    cores: number
    price: number
  }

  export type CpuTierUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    cores?: IntFieldUpdateOperationsInput | number
    price?: FloatFieldUpdateOperationsInput | number
  }

  export type CpuTierUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    cores?: IntFieldUpdateOperationsInput | number
    price?: FloatFieldUpdateOperationsInput | number
  }

  export type NodeTierCreateInput = {
    id?: string
    name: string
    nodes: number
    price: number
    instances?: InstanceCreateNestedManyWithoutNodeTierInput
  }

  export type NodeTierUncheckedCreateInput = {
    id?: string
    name: string
    nodes: number
    price: number
    instances?: InstanceUncheckedCreateNestedManyWithoutNodeTierInput
  }

  export type NodeTierUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    nodes?: IntFieldUpdateOperationsInput | number
    price?: FloatFieldUpdateOperationsInput | number
    instances?: InstanceUpdateManyWithoutNodeTierNestedInput
  }

  export type NodeTierUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    nodes?: IntFieldUpdateOperationsInput | number
    price?: FloatFieldUpdateOperationsInput | number
    instances?: InstanceUncheckedUpdateManyWithoutNodeTierNestedInput
  }

  export type NodeTierCreateManyInput = {
    id?: string
    name: string
    nodes: number
    price: number
  }

  export type NodeTierUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    nodes?: IntFieldUpdateOperationsInput | number
    price?: FloatFieldUpdateOperationsInput | number
  }

  export type NodeTierUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    nodes?: IntFieldUpdateOperationsInput | number
    price?: FloatFieldUpdateOperationsInput | number
  }

  export type EngineTierCreateInput = {
    id?: string
    name: string
    profile: string
    price: number
    instances?: InstanceCreateNestedManyWithoutEngineTierInput
  }

  export type EngineTierUncheckedCreateInput = {
    id?: string
    name: string
    profile: string
    price: number
    instances?: InstanceUncheckedCreateNestedManyWithoutEngineTierInput
  }

  export type EngineTierUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    profile?: StringFieldUpdateOperationsInput | string
    price?: FloatFieldUpdateOperationsInput | number
    instances?: InstanceUpdateManyWithoutEngineTierNestedInput
  }

  export type EngineTierUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    profile?: StringFieldUpdateOperationsInput | string
    price?: FloatFieldUpdateOperationsInput | number
    instances?: InstanceUncheckedUpdateManyWithoutEngineTierNestedInput
  }

  export type EngineTierCreateManyInput = {
    id?: string
    name: string
    profile: string
    price: number
  }

  export type EngineTierUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    profile?: StringFieldUpdateOperationsInput | string
    price?: FloatFieldUpdateOperationsInput | number
  }

  export type EngineTierUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    profile?: StringFieldUpdateOperationsInput | string
    price?: FloatFieldUpdateOperationsInput | number
  }

  export type QpuTierCreateInput = {
    id?: string
    name: string
    parallel: boolean
    price: number
    instances?: InstanceCreateNestedManyWithoutQpuTierInput
  }

  export type QpuTierUncheckedCreateInput = {
    id?: string
    name: string
    parallel: boolean
    price: number
    instances?: InstanceUncheckedCreateNestedManyWithoutQpuTierInput
  }

  export type QpuTierUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    parallel?: BoolFieldUpdateOperationsInput | boolean
    price?: FloatFieldUpdateOperationsInput | number
    instances?: InstanceUpdateManyWithoutQpuTierNestedInput
  }

  export type QpuTierUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    parallel?: BoolFieldUpdateOperationsInput | boolean
    price?: FloatFieldUpdateOperationsInput | number
    instances?: InstanceUncheckedUpdateManyWithoutQpuTierNestedInput
  }

  export type QpuTierCreateManyInput = {
    id?: string
    name: string
    parallel: boolean
    price: number
  }

  export type QpuTierUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    parallel?: BoolFieldUpdateOperationsInput | boolean
    price?: FloatFieldUpdateOperationsInput | number
  }

  export type QpuTierUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    parallel?: BoolFieldUpdateOperationsInput | boolean
    price?: FloatFieldUpdateOperationsInput | number
  }

  export type OmegaTierCreateInput = {
    id?: string
    name: string
    cognitive: boolean
    price: number
    instances?: InstanceCreateNestedManyWithoutOmegaTierInput
  }

  export type OmegaTierUncheckedCreateInput = {
    id?: string
    name: string
    cognitive: boolean
    price: number
    instances?: InstanceUncheckedCreateNestedManyWithoutOmegaTierInput
  }

  export type OmegaTierUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    cognitive?: BoolFieldUpdateOperationsInput | boolean
    price?: FloatFieldUpdateOperationsInput | number
    instances?: InstanceUpdateManyWithoutOmegaTierNestedInput
  }

  export type OmegaTierUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    cognitive?: BoolFieldUpdateOperationsInput | boolean
    price?: FloatFieldUpdateOperationsInput | number
    instances?: InstanceUncheckedUpdateManyWithoutOmegaTierNestedInput
  }

  export type OmegaTierCreateManyInput = {
    id?: string
    name: string
    cognitive: boolean
    price: number
  }

  export type OmegaTierUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    cognitive?: BoolFieldUpdateOperationsInput | boolean
    price?: FloatFieldUpdateOperationsInput | number
  }

  export type OmegaTierUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    cognitive?: BoolFieldUpdateOperationsInput | boolean
    price?: FloatFieldUpdateOperationsInput | number
  }

  export type SnapshotCreateInput = {
    id?: string
    metadata: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    instance: InstanceCreateNestedOneWithoutSnapshotsInput
  }

  export type SnapshotUncheckedCreateInput = {
    id?: string
    instanceId: string
    metadata: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type SnapshotUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    metadata?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    instance?: InstanceUpdateOneRequiredWithoutSnapshotsNestedInput
  }

  export type SnapshotUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    instanceId?: StringFieldUpdateOperationsInput | string
    metadata?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SnapshotCreateManyInput = {
    id?: string
    instanceId: string
    metadata: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type SnapshotUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    metadata?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SnapshotUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    instanceId?: StringFieldUpdateOperationsInput | string
    metadata?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type InstanceLogCreateInput = {
    id?: string
    event: string
    detail: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    instance: InstanceCreateNestedOneWithoutLogsInput
  }

  export type InstanceLogUncheckedCreateInput = {
    id?: string
    instanceId: string
    event: string
    detail: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type InstanceLogUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    event?: StringFieldUpdateOperationsInput | string
    detail?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    instance?: InstanceUpdateOneRequiredWithoutLogsNestedInput
  }

  export type InstanceLogUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    instanceId?: StringFieldUpdateOperationsInput | string
    event?: StringFieldUpdateOperationsInput | string
    detail?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type InstanceLogCreateManyInput = {
    id?: string
    instanceId: string
    event: string
    detail: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type InstanceLogUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    event?: StringFieldUpdateOperationsInput | string
    detail?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type InstanceLogUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    instanceId?: StringFieldUpdateOperationsInput | string
    event?: StringFieldUpdateOperationsInput | string
    detail?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BillingRecordCreateInput = {
    id?: string
    amount: number
    reason: string
    createdAt?: Date | string
    instance: InstanceCreateNestedOneWithoutBillingRecordsInput
  }

  export type BillingRecordUncheckedCreateInput = {
    id?: string
    instanceId: string
    amount: number
    reason: string
    createdAt?: Date | string
  }

  export type BillingRecordUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    amount?: FloatFieldUpdateOperationsInput | number
    reason?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    instance?: InstanceUpdateOneRequiredWithoutBillingRecordsNestedInput
  }

  export type BillingRecordUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    instanceId?: StringFieldUpdateOperationsInput | string
    amount?: FloatFieldUpdateOperationsInput | number
    reason?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BillingRecordCreateManyInput = {
    id?: string
    instanceId: string
    amount: number
    reason: string
    createdAt?: Date | string
  }

  export type BillingRecordUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    amount?: FloatFieldUpdateOperationsInput | number
    reason?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BillingRecordUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    instanceId?: StringFieldUpdateOperationsInput | string
    amount?: FloatFieldUpdateOperationsInput | number
    reason?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ExecutionGraphCreateInput = {
    id?: string
    graph: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    instance: InstanceCreateNestedOneWithoutExecutionGraphsInput
  }

  export type ExecutionGraphUncheckedCreateInput = {
    id?: string
    instanceId: string
    graph: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type ExecutionGraphUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    graph?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    instance?: InstanceUpdateOneRequiredWithoutExecutionGraphsNestedInput
  }

  export type ExecutionGraphUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    instanceId?: StringFieldUpdateOperationsInput | string
    graph?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ExecutionGraphCreateManyInput = {
    id?: string
    instanceId: string
    graph: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type ExecutionGraphUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    graph?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ExecutionGraphUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    instanceId?: StringFieldUpdateOperationsInput | string
    graph?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type snapshot_historyCreateInput = {
    snapshot_name: string
    instance_id?: string | null
    created_at?: Date | string
  }

  export type snapshot_historyUncheckedCreateInput = {
    id?: number
    snapshot_name: string
    instance_id?: string | null
    created_at?: Date | string
  }

  export type snapshot_historyUpdateInput = {
    snapshot_name?: StringFieldUpdateOperationsInput | string
    instance_id?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type snapshot_historyUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    snapshot_name?: StringFieldUpdateOperationsInput | string
    instance_id?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type snapshot_historyCreateManyInput = {
    id?: number
    snapshot_name: string
    instance_id?: string | null
    created_at?: Date | string
  }

  export type snapshot_historyUpdateManyMutationInput = {
    snapshot_name?: StringFieldUpdateOperationsInput | string
    instance_id?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type snapshot_historyUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    snapshot_name?: StringFieldUpdateOperationsInput | string
    instance_id?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TerminalSessionCreateInput = {
    id?: string
    token: string
    userId: string
    scope: string
    issuedAt?: Date | string
    expiresAt: Date | string
    revokedAt?: Date | string | null
    lastVerifiedAt?: Date | string | null
    instance: InstanceCreateNestedOneWithoutTerminalSessionsInput
  }

  export type TerminalSessionUncheckedCreateInput = {
    id?: string
    token: string
    instanceId: string
    userId: string
    scope: string
    issuedAt?: Date | string
    expiresAt: Date | string
    revokedAt?: Date | string | null
    lastVerifiedAt?: Date | string | null
  }

  export type TerminalSessionUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    token?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    scope?: StringFieldUpdateOperationsInput | string
    issuedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    revokedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastVerifiedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    instance?: InstanceUpdateOneRequiredWithoutTerminalSessionsNestedInput
  }

  export type TerminalSessionUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    token?: StringFieldUpdateOperationsInput | string
    instanceId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    scope?: StringFieldUpdateOperationsInput | string
    issuedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    revokedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastVerifiedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type TerminalSessionCreateManyInput = {
    id?: string
    token: string
    instanceId: string
    userId: string
    scope: string
    issuedAt?: Date | string
    expiresAt: Date | string
    revokedAt?: Date | string | null
    lastVerifiedAt?: Date | string | null
  }

  export type TerminalSessionUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    token?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    scope?: StringFieldUpdateOperationsInput | string
    issuedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    revokedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastVerifiedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type TerminalSessionUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    token?: StringFieldUpdateOperationsInput | string
    instanceId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    scope?: StringFieldUpdateOperationsInput | string
    issuedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    revokedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastVerifiedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type EnumInstanceStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.InstanceStatus | EnumInstanceStatusFieldRefInput<$PrismaModel>
    in?: $Enums.InstanceStatus[] | ListEnumInstanceStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.InstanceStatus[] | ListEnumInstanceStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumInstanceStatusFilter<$PrismaModel> | $Enums.InstanceStatus
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type CpuTierRelationFilter = {
    is?: CpuTierWhereInput
    isNot?: CpuTierWhereInput
  }

  export type NodeTierRelationFilter = {
    is?: NodeTierWhereInput
    isNot?: NodeTierWhereInput
  }

  export type EngineTierRelationFilter = {
    is?: EngineTierWhereInput
    isNot?: EngineTierWhereInput
  }

  export type QpuTierNullableRelationFilter = {
    is?: QpuTierWhereInput | null
    isNot?: QpuTierWhereInput | null
  }

  export type OmegaTierNullableRelationFilter = {
    is?: OmegaTierWhereInput | null
    isNot?: OmegaTierWhereInput | null
  }

  export type InstanceEngineListRelationFilter = {
    every?: InstanceEngineWhereInput
    some?: InstanceEngineWhereInput
    none?: InstanceEngineWhereInput
  }

  export type InstancePolicyNullableRelationFilter = {
    is?: InstancePolicyWhereInput | null
    isNot?: InstancePolicyWhereInput | null
  }

  export type TerminalSessionListRelationFilter = {
    every?: TerminalSessionWhereInput
    some?: TerminalSessionWhereInput
    none?: TerminalSessionWhereInput
  }

  export type SnapshotListRelationFilter = {
    every?: SnapshotWhereInput
    some?: SnapshotWhereInput
    none?: SnapshotWhereInput
  }

  export type InstanceLogListRelationFilter = {
    every?: InstanceLogWhereInput
    some?: InstanceLogWhereInput
    none?: InstanceLogWhereInput
  }

  export type BillingRecordListRelationFilter = {
    every?: BillingRecordWhereInput
    some?: BillingRecordWhereInput
    none?: BillingRecordWhereInput
  }

  export type ExecutionGraphListRelationFilter = {
    every?: ExecutionGraphWhereInput
    some?: ExecutionGraphWhereInput
    none?: ExecutionGraphWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type InstanceEngineOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type TerminalSessionOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type SnapshotOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type InstanceLogOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type BillingRecordOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type ExecutionGraphOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type InstanceCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    ownerId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    cpuTierId?: SortOrder
    nodeTierId?: SortOrder
    engineTierId?: SortOrder
    qpuTierId?: SortOrder
    omegaTierId?: SortOrder
    status?: SortOrder
    autoscale?: SortOrder
  }

  export type InstanceMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    ownerId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    cpuTierId?: SortOrder
    nodeTierId?: SortOrder
    engineTierId?: SortOrder
    qpuTierId?: SortOrder
    omegaTierId?: SortOrder
    status?: SortOrder
    autoscale?: SortOrder
  }

  export type InstanceMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    ownerId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    cpuTierId?: SortOrder
    nodeTierId?: SortOrder
    engineTierId?: SortOrder
    qpuTierId?: SortOrder
    omegaTierId?: SortOrder
    status?: SortOrder
    autoscale?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type EnumInstanceStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.InstanceStatus | EnumInstanceStatusFieldRefInput<$PrismaModel>
    in?: $Enums.InstanceStatus[] | ListEnumInstanceStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.InstanceStatus[] | ListEnumInstanceStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumInstanceStatusWithAggregatesFilter<$PrismaModel> | $Enums.InstanceStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumInstanceStatusFilter<$PrismaModel>
    _max?: NestedEnumInstanceStatusFilter<$PrismaModel>
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type EnumEngineTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.EngineType | EnumEngineTypeFieldRefInput<$PrismaModel>
    in?: $Enums.EngineType[] | ListEnumEngineTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.EngineType[] | ListEnumEngineTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumEngineTypeFilter<$PrismaModel> | $Enums.EngineType
  }
  export type JsonFilter<$PrismaModel = never> = 
    | PatchUndefined<
        Either<Required<JsonFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonFilterBase<$PrismaModel>>, 'path'>>

  export type JsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type InstanceRelationFilter = {
    is?: InstanceWhereInput
    isNot?: InstanceWhereInput
  }

  export type InstanceEngineInstanceIdEngineTypeCompoundUniqueInput = {
    instanceId: string
    engineType: $Enums.EngineType
  }

  export type InstanceEngineCountOrderByAggregateInput = {
    id?: SortOrder
    instanceId?: SortOrder
    engineType?: SortOrder
    enabled?: SortOrder
    defaultModel?: SortOrder
    allowedModels?: SortOrder
    createdAt?: SortOrder
  }

  export type InstanceEngineMaxOrderByAggregateInput = {
    id?: SortOrder
    instanceId?: SortOrder
    engineType?: SortOrder
    enabled?: SortOrder
    defaultModel?: SortOrder
    createdAt?: SortOrder
  }

  export type InstanceEngineMinOrderByAggregateInput = {
    id?: SortOrder
    instanceId?: SortOrder
    engineType?: SortOrder
    enabled?: SortOrder
    defaultModel?: SortOrder
    createdAt?: SortOrder
  }

  export type EnumEngineTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.EngineType | EnumEngineTypeFieldRefInput<$PrismaModel>
    in?: $Enums.EngineType[] | ListEnumEngineTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.EngineType[] | ListEnumEngineTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumEngineTypeWithAggregatesFilter<$PrismaModel> | $Enums.EngineType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumEngineTypeFilter<$PrismaModel>
    _max?: NestedEnumEngineTypeFilter<$PrismaModel>
  }
  export type JsonWithAggregatesFilter<$PrismaModel = never> = 
    | PatchUndefined<
        Either<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedJsonFilter<$PrismaModel>
    _max?: NestedJsonFilter<$PrismaModel>
  }

  export type IntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }
  export type JsonNullableFilter<$PrismaModel = never> = 
    | PatchUndefined<
        Either<Required<JsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type InstancePolicyCountOrderByAggregateInput = {
    id?: SortOrder
    instanceId?: SortOrder
    allowChat?: SortOrder
    allowEmotion?: SortOrder
    allowMemory?: SortOrder
    allowFinance?: SortOrder
    allowTerminal?: SortOrder
    allowSSH?: SortOrder
    maxTokensPerDay?: SortOrder
    maxRequestsPerDay?: SortOrder
    ipWhitelist?: SortOrder
    regionLock?: SortOrder
    auditRequired?: SortOrder
    piiStrictMode?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type InstancePolicyAvgOrderByAggregateInput = {
    maxTokensPerDay?: SortOrder
    maxRequestsPerDay?: SortOrder
  }

  export type InstancePolicyMaxOrderByAggregateInput = {
    id?: SortOrder
    instanceId?: SortOrder
    allowChat?: SortOrder
    allowEmotion?: SortOrder
    allowMemory?: SortOrder
    allowFinance?: SortOrder
    allowTerminal?: SortOrder
    allowSSH?: SortOrder
    maxTokensPerDay?: SortOrder
    maxRequestsPerDay?: SortOrder
    regionLock?: SortOrder
    auditRequired?: SortOrder
    piiStrictMode?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type InstancePolicyMinOrderByAggregateInput = {
    id?: SortOrder
    instanceId?: SortOrder
    allowChat?: SortOrder
    allowEmotion?: SortOrder
    allowMemory?: SortOrder
    allowFinance?: SortOrder
    allowTerminal?: SortOrder
    allowSSH?: SortOrder
    maxTokensPerDay?: SortOrder
    maxRequestsPerDay?: SortOrder
    regionLock?: SortOrder
    auditRequired?: SortOrder
    piiStrictMode?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type InstancePolicySumOrderByAggregateInput = {
    maxTokensPerDay?: SortOrder
    maxRequestsPerDay?: SortOrder
  }

  export type IntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }
  export type JsonNullableWithAggregatesFilter<$PrismaModel = never> = 
    | PatchUndefined<
        Either<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedJsonNullableFilter<$PrismaModel>
    _max?: NestedJsonNullableFilter<$PrismaModel>
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type FloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type InstanceListRelationFilter = {
    every?: InstanceWhereInput
    some?: InstanceWhereInput
    none?: InstanceWhereInput
  }

  export type InstanceOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type CpuTierCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    cores?: SortOrder
    price?: SortOrder
  }

  export type CpuTierAvgOrderByAggregateInput = {
    cores?: SortOrder
    price?: SortOrder
  }

  export type CpuTierMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    cores?: SortOrder
    price?: SortOrder
  }

  export type CpuTierMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    cores?: SortOrder
    price?: SortOrder
  }

  export type CpuTierSumOrderByAggregateInput = {
    cores?: SortOrder
    price?: SortOrder
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type FloatWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedFloatFilter<$PrismaModel>
    _min?: NestedFloatFilter<$PrismaModel>
    _max?: NestedFloatFilter<$PrismaModel>
  }

  export type NodeTierCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    nodes?: SortOrder
    price?: SortOrder
  }

  export type NodeTierAvgOrderByAggregateInput = {
    nodes?: SortOrder
    price?: SortOrder
  }

  export type NodeTierMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    nodes?: SortOrder
    price?: SortOrder
  }

  export type NodeTierMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    nodes?: SortOrder
    price?: SortOrder
  }

  export type NodeTierSumOrderByAggregateInput = {
    nodes?: SortOrder
    price?: SortOrder
  }

  export type EngineTierCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    profile?: SortOrder
    price?: SortOrder
  }

  export type EngineTierAvgOrderByAggregateInput = {
    price?: SortOrder
  }

  export type EngineTierMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    profile?: SortOrder
    price?: SortOrder
  }

  export type EngineTierMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    profile?: SortOrder
    price?: SortOrder
  }

  export type EngineTierSumOrderByAggregateInput = {
    price?: SortOrder
  }

  export type QpuTierCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    parallel?: SortOrder
    price?: SortOrder
  }

  export type QpuTierAvgOrderByAggregateInput = {
    price?: SortOrder
  }

  export type QpuTierMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    parallel?: SortOrder
    price?: SortOrder
  }

  export type QpuTierMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    parallel?: SortOrder
    price?: SortOrder
  }

  export type QpuTierSumOrderByAggregateInput = {
    price?: SortOrder
  }

  export type OmegaTierCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    cognitive?: SortOrder
    price?: SortOrder
  }

  export type OmegaTierAvgOrderByAggregateInput = {
    price?: SortOrder
  }

  export type OmegaTierMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    cognitive?: SortOrder
    price?: SortOrder
  }

  export type OmegaTierMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    cognitive?: SortOrder
    price?: SortOrder
  }

  export type OmegaTierSumOrderByAggregateInput = {
    price?: SortOrder
  }

  export type SnapshotCountOrderByAggregateInput = {
    id?: SortOrder
    instanceId?: SortOrder
    metadata?: SortOrder
    createdAt?: SortOrder
  }

  export type SnapshotMaxOrderByAggregateInput = {
    id?: SortOrder
    instanceId?: SortOrder
    createdAt?: SortOrder
  }

  export type SnapshotMinOrderByAggregateInput = {
    id?: SortOrder
    instanceId?: SortOrder
    createdAt?: SortOrder
  }

  export type InstanceLogCountOrderByAggregateInput = {
    id?: SortOrder
    instanceId?: SortOrder
    event?: SortOrder
    detail?: SortOrder
    createdAt?: SortOrder
  }

  export type InstanceLogMaxOrderByAggregateInput = {
    id?: SortOrder
    instanceId?: SortOrder
    event?: SortOrder
    createdAt?: SortOrder
  }

  export type InstanceLogMinOrderByAggregateInput = {
    id?: SortOrder
    instanceId?: SortOrder
    event?: SortOrder
    createdAt?: SortOrder
  }

  export type BillingRecordCountOrderByAggregateInput = {
    id?: SortOrder
    instanceId?: SortOrder
    amount?: SortOrder
    reason?: SortOrder
    createdAt?: SortOrder
  }

  export type BillingRecordAvgOrderByAggregateInput = {
    amount?: SortOrder
  }

  export type BillingRecordMaxOrderByAggregateInput = {
    id?: SortOrder
    instanceId?: SortOrder
    amount?: SortOrder
    reason?: SortOrder
    createdAt?: SortOrder
  }

  export type BillingRecordMinOrderByAggregateInput = {
    id?: SortOrder
    instanceId?: SortOrder
    amount?: SortOrder
    reason?: SortOrder
    createdAt?: SortOrder
  }

  export type BillingRecordSumOrderByAggregateInput = {
    amount?: SortOrder
  }

  export type ExecutionGraphCountOrderByAggregateInput = {
    id?: SortOrder
    instanceId?: SortOrder
    graph?: SortOrder
    createdAt?: SortOrder
  }

  export type ExecutionGraphMaxOrderByAggregateInput = {
    id?: SortOrder
    instanceId?: SortOrder
    createdAt?: SortOrder
  }

  export type ExecutionGraphMinOrderByAggregateInput = {
    id?: SortOrder
    instanceId?: SortOrder
    createdAt?: SortOrder
  }

  export type snapshot_historyCountOrderByAggregateInput = {
    id?: SortOrder
    snapshot_name?: SortOrder
    instance_id?: SortOrder
    created_at?: SortOrder
  }

  export type snapshot_historyAvgOrderByAggregateInput = {
    id?: SortOrder
  }

  export type snapshot_historyMaxOrderByAggregateInput = {
    id?: SortOrder
    snapshot_name?: SortOrder
    instance_id?: SortOrder
    created_at?: SortOrder
  }

  export type snapshot_historyMinOrderByAggregateInput = {
    id?: SortOrder
    snapshot_name?: SortOrder
    instance_id?: SortOrder
    created_at?: SortOrder
  }

  export type snapshot_historySumOrderByAggregateInput = {
    id?: SortOrder
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type TerminalSessionCountOrderByAggregateInput = {
    id?: SortOrder
    token?: SortOrder
    instanceId?: SortOrder
    userId?: SortOrder
    scope?: SortOrder
    issuedAt?: SortOrder
    expiresAt?: SortOrder
    revokedAt?: SortOrder
    lastVerifiedAt?: SortOrder
  }

  export type TerminalSessionMaxOrderByAggregateInput = {
    id?: SortOrder
    token?: SortOrder
    instanceId?: SortOrder
    userId?: SortOrder
    scope?: SortOrder
    issuedAt?: SortOrder
    expiresAt?: SortOrder
    revokedAt?: SortOrder
    lastVerifiedAt?: SortOrder
  }

  export type TerminalSessionMinOrderByAggregateInput = {
    id?: SortOrder
    token?: SortOrder
    instanceId?: SortOrder
    userId?: SortOrder
    scope?: SortOrder
    issuedAt?: SortOrder
    expiresAt?: SortOrder
    revokedAt?: SortOrder
    lastVerifiedAt?: SortOrder
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type CpuTierCreateNestedOneWithoutInstancesInput = {
    create?: XOR<CpuTierCreateWithoutInstancesInput, CpuTierUncheckedCreateWithoutInstancesInput>
    connectOrCreate?: CpuTierCreateOrConnectWithoutInstancesInput
    connect?: CpuTierWhereUniqueInput
  }

  export type NodeTierCreateNestedOneWithoutInstancesInput = {
    create?: XOR<NodeTierCreateWithoutInstancesInput, NodeTierUncheckedCreateWithoutInstancesInput>
    connectOrCreate?: NodeTierCreateOrConnectWithoutInstancesInput
    connect?: NodeTierWhereUniqueInput
  }

  export type EngineTierCreateNestedOneWithoutInstancesInput = {
    create?: XOR<EngineTierCreateWithoutInstancesInput, EngineTierUncheckedCreateWithoutInstancesInput>
    connectOrCreate?: EngineTierCreateOrConnectWithoutInstancesInput
    connect?: EngineTierWhereUniqueInput
  }

  export type QpuTierCreateNestedOneWithoutInstancesInput = {
    create?: XOR<QpuTierCreateWithoutInstancesInput, QpuTierUncheckedCreateWithoutInstancesInput>
    connectOrCreate?: QpuTierCreateOrConnectWithoutInstancesInput
    connect?: QpuTierWhereUniqueInput
  }

  export type OmegaTierCreateNestedOneWithoutInstancesInput = {
    create?: XOR<OmegaTierCreateWithoutInstancesInput, OmegaTierUncheckedCreateWithoutInstancesInput>
    connectOrCreate?: OmegaTierCreateOrConnectWithoutInstancesInput
    connect?: OmegaTierWhereUniqueInput
  }

  export type InstanceEngineCreateNestedManyWithoutInstanceInput = {
    create?: XOR<InstanceEngineCreateWithoutInstanceInput, InstanceEngineUncheckedCreateWithoutInstanceInput> | InstanceEngineCreateWithoutInstanceInput[] | InstanceEngineUncheckedCreateWithoutInstanceInput[]
    connectOrCreate?: InstanceEngineCreateOrConnectWithoutInstanceInput | InstanceEngineCreateOrConnectWithoutInstanceInput[]
    createMany?: InstanceEngineCreateManyInstanceInputEnvelope
    connect?: InstanceEngineWhereUniqueInput | InstanceEngineWhereUniqueInput[]
  }

  export type InstancePolicyCreateNestedOneWithoutInstanceInput = {
    create?: XOR<InstancePolicyCreateWithoutInstanceInput, InstancePolicyUncheckedCreateWithoutInstanceInput>
    connectOrCreate?: InstancePolicyCreateOrConnectWithoutInstanceInput
    connect?: InstancePolicyWhereUniqueInput
  }

  export type TerminalSessionCreateNestedManyWithoutInstanceInput = {
    create?: XOR<TerminalSessionCreateWithoutInstanceInput, TerminalSessionUncheckedCreateWithoutInstanceInput> | TerminalSessionCreateWithoutInstanceInput[] | TerminalSessionUncheckedCreateWithoutInstanceInput[]
    connectOrCreate?: TerminalSessionCreateOrConnectWithoutInstanceInput | TerminalSessionCreateOrConnectWithoutInstanceInput[]
    createMany?: TerminalSessionCreateManyInstanceInputEnvelope
    connect?: TerminalSessionWhereUniqueInput | TerminalSessionWhereUniqueInput[]
  }

  export type SnapshotCreateNestedManyWithoutInstanceInput = {
    create?: XOR<SnapshotCreateWithoutInstanceInput, SnapshotUncheckedCreateWithoutInstanceInput> | SnapshotCreateWithoutInstanceInput[] | SnapshotUncheckedCreateWithoutInstanceInput[]
    connectOrCreate?: SnapshotCreateOrConnectWithoutInstanceInput | SnapshotCreateOrConnectWithoutInstanceInput[]
    createMany?: SnapshotCreateManyInstanceInputEnvelope
    connect?: SnapshotWhereUniqueInput | SnapshotWhereUniqueInput[]
  }

  export type InstanceLogCreateNestedManyWithoutInstanceInput = {
    create?: XOR<InstanceLogCreateWithoutInstanceInput, InstanceLogUncheckedCreateWithoutInstanceInput> | InstanceLogCreateWithoutInstanceInput[] | InstanceLogUncheckedCreateWithoutInstanceInput[]
    connectOrCreate?: InstanceLogCreateOrConnectWithoutInstanceInput | InstanceLogCreateOrConnectWithoutInstanceInput[]
    createMany?: InstanceLogCreateManyInstanceInputEnvelope
    connect?: InstanceLogWhereUniqueInput | InstanceLogWhereUniqueInput[]
  }

  export type BillingRecordCreateNestedManyWithoutInstanceInput = {
    create?: XOR<BillingRecordCreateWithoutInstanceInput, BillingRecordUncheckedCreateWithoutInstanceInput> | BillingRecordCreateWithoutInstanceInput[] | BillingRecordUncheckedCreateWithoutInstanceInput[]
    connectOrCreate?: BillingRecordCreateOrConnectWithoutInstanceInput | BillingRecordCreateOrConnectWithoutInstanceInput[]
    createMany?: BillingRecordCreateManyInstanceInputEnvelope
    connect?: BillingRecordWhereUniqueInput | BillingRecordWhereUniqueInput[]
  }

  export type ExecutionGraphCreateNestedManyWithoutInstanceInput = {
    create?: XOR<ExecutionGraphCreateWithoutInstanceInput, ExecutionGraphUncheckedCreateWithoutInstanceInput> | ExecutionGraphCreateWithoutInstanceInput[] | ExecutionGraphUncheckedCreateWithoutInstanceInput[]
    connectOrCreate?: ExecutionGraphCreateOrConnectWithoutInstanceInput | ExecutionGraphCreateOrConnectWithoutInstanceInput[]
    createMany?: ExecutionGraphCreateManyInstanceInputEnvelope
    connect?: ExecutionGraphWhereUniqueInput | ExecutionGraphWhereUniqueInput[]
  }

  export type InstanceEngineUncheckedCreateNestedManyWithoutInstanceInput = {
    create?: XOR<InstanceEngineCreateWithoutInstanceInput, InstanceEngineUncheckedCreateWithoutInstanceInput> | InstanceEngineCreateWithoutInstanceInput[] | InstanceEngineUncheckedCreateWithoutInstanceInput[]
    connectOrCreate?: InstanceEngineCreateOrConnectWithoutInstanceInput | InstanceEngineCreateOrConnectWithoutInstanceInput[]
    createMany?: InstanceEngineCreateManyInstanceInputEnvelope
    connect?: InstanceEngineWhereUniqueInput | InstanceEngineWhereUniqueInput[]
  }

  export type InstancePolicyUncheckedCreateNestedOneWithoutInstanceInput = {
    create?: XOR<InstancePolicyCreateWithoutInstanceInput, InstancePolicyUncheckedCreateWithoutInstanceInput>
    connectOrCreate?: InstancePolicyCreateOrConnectWithoutInstanceInput
    connect?: InstancePolicyWhereUniqueInput
  }

  export type TerminalSessionUncheckedCreateNestedManyWithoutInstanceInput = {
    create?: XOR<TerminalSessionCreateWithoutInstanceInput, TerminalSessionUncheckedCreateWithoutInstanceInput> | TerminalSessionCreateWithoutInstanceInput[] | TerminalSessionUncheckedCreateWithoutInstanceInput[]
    connectOrCreate?: TerminalSessionCreateOrConnectWithoutInstanceInput | TerminalSessionCreateOrConnectWithoutInstanceInput[]
    createMany?: TerminalSessionCreateManyInstanceInputEnvelope
    connect?: TerminalSessionWhereUniqueInput | TerminalSessionWhereUniqueInput[]
  }

  export type SnapshotUncheckedCreateNestedManyWithoutInstanceInput = {
    create?: XOR<SnapshotCreateWithoutInstanceInput, SnapshotUncheckedCreateWithoutInstanceInput> | SnapshotCreateWithoutInstanceInput[] | SnapshotUncheckedCreateWithoutInstanceInput[]
    connectOrCreate?: SnapshotCreateOrConnectWithoutInstanceInput | SnapshotCreateOrConnectWithoutInstanceInput[]
    createMany?: SnapshotCreateManyInstanceInputEnvelope
    connect?: SnapshotWhereUniqueInput | SnapshotWhereUniqueInput[]
  }

  export type InstanceLogUncheckedCreateNestedManyWithoutInstanceInput = {
    create?: XOR<InstanceLogCreateWithoutInstanceInput, InstanceLogUncheckedCreateWithoutInstanceInput> | InstanceLogCreateWithoutInstanceInput[] | InstanceLogUncheckedCreateWithoutInstanceInput[]
    connectOrCreate?: InstanceLogCreateOrConnectWithoutInstanceInput | InstanceLogCreateOrConnectWithoutInstanceInput[]
    createMany?: InstanceLogCreateManyInstanceInputEnvelope
    connect?: InstanceLogWhereUniqueInput | InstanceLogWhereUniqueInput[]
  }

  export type BillingRecordUncheckedCreateNestedManyWithoutInstanceInput = {
    create?: XOR<BillingRecordCreateWithoutInstanceInput, BillingRecordUncheckedCreateWithoutInstanceInput> | BillingRecordCreateWithoutInstanceInput[] | BillingRecordUncheckedCreateWithoutInstanceInput[]
    connectOrCreate?: BillingRecordCreateOrConnectWithoutInstanceInput | BillingRecordCreateOrConnectWithoutInstanceInput[]
    createMany?: BillingRecordCreateManyInstanceInputEnvelope
    connect?: BillingRecordWhereUniqueInput | BillingRecordWhereUniqueInput[]
  }

  export type ExecutionGraphUncheckedCreateNestedManyWithoutInstanceInput = {
    create?: XOR<ExecutionGraphCreateWithoutInstanceInput, ExecutionGraphUncheckedCreateWithoutInstanceInput> | ExecutionGraphCreateWithoutInstanceInput[] | ExecutionGraphUncheckedCreateWithoutInstanceInput[]
    connectOrCreate?: ExecutionGraphCreateOrConnectWithoutInstanceInput | ExecutionGraphCreateOrConnectWithoutInstanceInput[]
    createMany?: ExecutionGraphCreateManyInstanceInputEnvelope
    connect?: ExecutionGraphWhereUniqueInput | ExecutionGraphWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type EnumInstanceStatusFieldUpdateOperationsInput = {
    set?: $Enums.InstanceStatus
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type CpuTierUpdateOneRequiredWithoutInstancesNestedInput = {
    create?: XOR<CpuTierCreateWithoutInstancesInput, CpuTierUncheckedCreateWithoutInstancesInput>
    connectOrCreate?: CpuTierCreateOrConnectWithoutInstancesInput
    upsert?: CpuTierUpsertWithoutInstancesInput
    connect?: CpuTierWhereUniqueInput
    update?: XOR<XOR<CpuTierUpdateToOneWithWhereWithoutInstancesInput, CpuTierUpdateWithoutInstancesInput>, CpuTierUncheckedUpdateWithoutInstancesInput>
  }

  export type NodeTierUpdateOneRequiredWithoutInstancesNestedInput = {
    create?: XOR<NodeTierCreateWithoutInstancesInput, NodeTierUncheckedCreateWithoutInstancesInput>
    connectOrCreate?: NodeTierCreateOrConnectWithoutInstancesInput
    upsert?: NodeTierUpsertWithoutInstancesInput
    connect?: NodeTierWhereUniqueInput
    update?: XOR<XOR<NodeTierUpdateToOneWithWhereWithoutInstancesInput, NodeTierUpdateWithoutInstancesInput>, NodeTierUncheckedUpdateWithoutInstancesInput>
  }

  export type EngineTierUpdateOneRequiredWithoutInstancesNestedInput = {
    create?: XOR<EngineTierCreateWithoutInstancesInput, EngineTierUncheckedCreateWithoutInstancesInput>
    connectOrCreate?: EngineTierCreateOrConnectWithoutInstancesInput
    upsert?: EngineTierUpsertWithoutInstancesInput
    connect?: EngineTierWhereUniqueInput
    update?: XOR<XOR<EngineTierUpdateToOneWithWhereWithoutInstancesInput, EngineTierUpdateWithoutInstancesInput>, EngineTierUncheckedUpdateWithoutInstancesInput>
  }

  export type QpuTierUpdateOneWithoutInstancesNestedInput = {
    create?: XOR<QpuTierCreateWithoutInstancesInput, QpuTierUncheckedCreateWithoutInstancesInput>
    connectOrCreate?: QpuTierCreateOrConnectWithoutInstancesInput
    upsert?: QpuTierUpsertWithoutInstancesInput
    disconnect?: QpuTierWhereInput | boolean
    delete?: QpuTierWhereInput | boolean
    connect?: QpuTierWhereUniqueInput
    update?: XOR<XOR<QpuTierUpdateToOneWithWhereWithoutInstancesInput, QpuTierUpdateWithoutInstancesInput>, QpuTierUncheckedUpdateWithoutInstancesInput>
  }

  export type OmegaTierUpdateOneWithoutInstancesNestedInput = {
    create?: XOR<OmegaTierCreateWithoutInstancesInput, OmegaTierUncheckedCreateWithoutInstancesInput>
    connectOrCreate?: OmegaTierCreateOrConnectWithoutInstancesInput
    upsert?: OmegaTierUpsertWithoutInstancesInput
    disconnect?: OmegaTierWhereInput | boolean
    delete?: OmegaTierWhereInput | boolean
    connect?: OmegaTierWhereUniqueInput
    update?: XOR<XOR<OmegaTierUpdateToOneWithWhereWithoutInstancesInput, OmegaTierUpdateWithoutInstancesInput>, OmegaTierUncheckedUpdateWithoutInstancesInput>
  }

  export type InstanceEngineUpdateManyWithoutInstanceNestedInput = {
    create?: XOR<InstanceEngineCreateWithoutInstanceInput, InstanceEngineUncheckedCreateWithoutInstanceInput> | InstanceEngineCreateWithoutInstanceInput[] | InstanceEngineUncheckedCreateWithoutInstanceInput[]
    connectOrCreate?: InstanceEngineCreateOrConnectWithoutInstanceInput | InstanceEngineCreateOrConnectWithoutInstanceInput[]
    upsert?: InstanceEngineUpsertWithWhereUniqueWithoutInstanceInput | InstanceEngineUpsertWithWhereUniqueWithoutInstanceInput[]
    createMany?: InstanceEngineCreateManyInstanceInputEnvelope
    set?: InstanceEngineWhereUniqueInput | InstanceEngineWhereUniqueInput[]
    disconnect?: InstanceEngineWhereUniqueInput | InstanceEngineWhereUniqueInput[]
    delete?: InstanceEngineWhereUniqueInput | InstanceEngineWhereUniqueInput[]
    connect?: InstanceEngineWhereUniqueInput | InstanceEngineWhereUniqueInput[]
    update?: InstanceEngineUpdateWithWhereUniqueWithoutInstanceInput | InstanceEngineUpdateWithWhereUniqueWithoutInstanceInput[]
    updateMany?: InstanceEngineUpdateManyWithWhereWithoutInstanceInput | InstanceEngineUpdateManyWithWhereWithoutInstanceInput[]
    deleteMany?: InstanceEngineScalarWhereInput | InstanceEngineScalarWhereInput[]
  }

  export type InstancePolicyUpdateOneWithoutInstanceNestedInput = {
    create?: XOR<InstancePolicyCreateWithoutInstanceInput, InstancePolicyUncheckedCreateWithoutInstanceInput>
    connectOrCreate?: InstancePolicyCreateOrConnectWithoutInstanceInput
    upsert?: InstancePolicyUpsertWithoutInstanceInput
    disconnect?: InstancePolicyWhereInput | boolean
    delete?: InstancePolicyWhereInput | boolean
    connect?: InstancePolicyWhereUniqueInput
    update?: XOR<XOR<InstancePolicyUpdateToOneWithWhereWithoutInstanceInput, InstancePolicyUpdateWithoutInstanceInput>, InstancePolicyUncheckedUpdateWithoutInstanceInput>
  }

  export type TerminalSessionUpdateManyWithoutInstanceNestedInput = {
    create?: XOR<TerminalSessionCreateWithoutInstanceInput, TerminalSessionUncheckedCreateWithoutInstanceInput> | TerminalSessionCreateWithoutInstanceInput[] | TerminalSessionUncheckedCreateWithoutInstanceInput[]
    connectOrCreate?: TerminalSessionCreateOrConnectWithoutInstanceInput | TerminalSessionCreateOrConnectWithoutInstanceInput[]
    upsert?: TerminalSessionUpsertWithWhereUniqueWithoutInstanceInput | TerminalSessionUpsertWithWhereUniqueWithoutInstanceInput[]
    createMany?: TerminalSessionCreateManyInstanceInputEnvelope
    set?: TerminalSessionWhereUniqueInput | TerminalSessionWhereUniqueInput[]
    disconnect?: TerminalSessionWhereUniqueInput | TerminalSessionWhereUniqueInput[]
    delete?: TerminalSessionWhereUniqueInput | TerminalSessionWhereUniqueInput[]
    connect?: TerminalSessionWhereUniqueInput | TerminalSessionWhereUniqueInput[]
    update?: TerminalSessionUpdateWithWhereUniqueWithoutInstanceInput | TerminalSessionUpdateWithWhereUniqueWithoutInstanceInput[]
    updateMany?: TerminalSessionUpdateManyWithWhereWithoutInstanceInput | TerminalSessionUpdateManyWithWhereWithoutInstanceInput[]
    deleteMany?: TerminalSessionScalarWhereInput | TerminalSessionScalarWhereInput[]
  }

  export type SnapshotUpdateManyWithoutInstanceNestedInput = {
    create?: XOR<SnapshotCreateWithoutInstanceInput, SnapshotUncheckedCreateWithoutInstanceInput> | SnapshotCreateWithoutInstanceInput[] | SnapshotUncheckedCreateWithoutInstanceInput[]
    connectOrCreate?: SnapshotCreateOrConnectWithoutInstanceInput | SnapshotCreateOrConnectWithoutInstanceInput[]
    upsert?: SnapshotUpsertWithWhereUniqueWithoutInstanceInput | SnapshotUpsertWithWhereUniqueWithoutInstanceInput[]
    createMany?: SnapshotCreateManyInstanceInputEnvelope
    set?: SnapshotWhereUniqueInput | SnapshotWhereUniqueInput[]
    disconnect?: SnapshotWhereUniqueInput | SnapshotWhereUniqueInput[]
    delete?: SnapshotWhereUniqueInput | SnapshotWhereUniqueInput[]
    connect?: SnapshotWhereUniqueInput | SnapshotWhereUniqueInput[]
    update?: SnapshotUpdateWithWhereUniqueWithoutInstanceInput | SnapshotUpdateWithWhereUniqueWithoutInstanceInput[]
    updateMany?: SnapshotUpdateManyWithWhereWithoutInstanceInput | SnapshotUpdateManyWithWhereWithoutInstanceInput[]
    deleteMany?: SnapshotScalarWhereInput | SnapshotScalarWhereInput[]
  }

  export type InstanceLogUpdateManyWithoutInstanceNestedInput = {
    create?: XOR<InstanceLogCreateWithoutInstanceInput, InstanceLogUncheckedCreateWithoutInstanceInput> | InstanceLogCreateWithoutInstanceInput[] | InstanceLogUncheckedCreateWithoutInstanceInput[]
    connectOrCreate?: InstanceLogCreateOrConnectWithoutInstanceInput | InstanceLogCreateOrConnectWithoutInstanceInput[]
    upsert?: InstanceLogUpsertWithWhereUniqueWithoutInstanceInput | InstanceLogUpsertWithWhereUniqueWithoutInstanceInput[]
    createMany?: InstanceLogCreateManyInstanceInputEnvelope
    set?: InstanceLogWhereUniqueInput | InstanceLogWhereUniqueInput[]
    disconnect?: InstanceLogWhereUniqueInput | InstanceLogWhereUniqueInput[]
    delete?: InstanceLogWhereUniqueInput | InstanceLogWhereUniqueInput[]
    connect?: InstanceLogWhereUniqueInput | InstanceLogWhereUniqueInput[]
    update?: InstanceLogUpdateWithWhereUniqueWithoutInstanceInput | InstanceLogUpdateWithWhereUniqueWithoutInstanceInput[]
    updateMany?: InstanceLogUpdateManyWithWhereWithoutInstanceInput | InstanceLogUpdateManyWithWhereWithoutInstanceInput[]
    deleteMany?: InstanceLogScalarWhereInput | InstanceLogScalarWhereInput[]
  }

  export type BillingRecordUpdateManyWithoutInstanceNestedInput = {
    create?: XOR<BillingRecordCreateWithoutInstanceInput, BillingRecordUncheckedCreateWithoutInstanceInput> | BillingRecordCreateWithoutInstanceInput[] | BillingRecordUncheckedCreateWithoutInstanceInput[]
    connectOrCreate?: BillingRecordCreateOrConnectWithoutInstanceInput | BillingRecordCreateOrConnectWithoutInstanceInput[]
    upsert?: BillingRecordUpsertWithWhereUniqueWithoutInstanceInput | BillingRecordUpsertWithWhereUniqueWithoutInstanceInput[]
    createMany?: BillingRecordCreateManyInstanceInputEnvelope
    set?: BillingRecordWhereUniqueInput | BillingRecordWhereUniqueInput[]
    disconnect?: BillingRecordWhereUniqueInput | BillingRecordWhereUniqueInput[]
    delete?: BillingRecordWhereUniqueInput | BillingRecordWhereUniqueInput[]
    connect?: BillingRecordWhereUniqueInput | BillingRecordWhereUniqueInput[]
    update?: BillingRecordUpdateWithWhereUniqueWithoutInstanceInput | BillingRecordUpdateWithWhereUniqueWithoutInstanceInput[]
    updateMany?: BillingRecordUpdateManyWithWhereWithoutInstanceInput | BillingRecordUpdateManyWithWhereWithoutInstanceInput[]
    deleteMany?: BillingRecordScalarWhereInput | BillingRecordScalarWhereInput[]
  }

  export type ExecutionGraphUpdateManyWithoutInstanceNestedInput = {
    create?: XOR<ExecutionGraphCreateWithoutInstanceInput, ExecutionGraphUncheckedCreateWithoutInstanceInput> | ExecutionGraphCreateWithoutInstanceInput[] | ExecutionGraphUncheckedCreateWithoutInstanceInput[]
    connectOrCreate?: ExecutionGraphCreateOrConnectWithoutInstanceInput | ExecutionGraphCreateOrConnectWithoutInstanceInput[]
    upsert?: ExecutionGraphUpsertWithWhereUniqueWithoutInstanceInput | ExecutionGraphUpsertWithWhereUniqueWithoutInstanceInput[]
    createMany?: ExecutionGraphCreateManyInstanceInputEnvelope
    set?: ExecutionGraphWhereUniqueInput | ExecutionGraphWhereUniqueInput[]
    disconnect?: ExecutionGraphWhereUniqueInput | ExecutionGraphWhereUniqueInput[]
    delete?: ExecutionGraphWhereUniqueInput | ExecutionGraphWhereUniqueInput[]
    connect?: ExecutionGraphWhereUniqueInput | ExecutionGraphWhereUniqueInput[]
    update?: ExecutionGraphUpdateWithWhereUniqueWithoutInstanceInput | ExecutionGraphUpdateWithWhereUniqueWithoutInstanceInput[]
    updateMany?: ExecutionGraphUpdateManyWithWhereWithoutInstanceInput | ExecutionGraphUpdateManyWithWhereWithoutInstanceInput[]
    deleteMany?: ExecutionGraphScalarWhereInput | ExecutionGraphScalarWhereInput[]
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type InstanceEngineUncheckedUpdateManyWithoutInstanceNestedInput = {
    create?: XOR<InstanceEngineCreateWithoutInstanceInput, InstanceEngineUncheckedCreateWithoutInstanceInput> | InstanceEngineCreateWithoutInstanceInput[] | InstanceEngineUncheckedCreateWithoutInstanceInput[]
    connectOrCreate?: InstanceEngineCreateOrConnectWithoutInstanceInput | InstanceEngineCreateOrConnectWithoutInstanceInput[]
    upsert?: InstanceEngineUpsertWithWhereUniqueWithoutInstanceInput | InstanceEngineUpsertWithWhereUniqueWithoutInstanceInput[]
    createMany?: InstanceEngineCreateManyInstanceInputEnvelope
    set?: InstanceEngineWhereUniqueInput | InstanceEngineWhereUniqueInput[]
    disconnect?: InstanceEngineWhereUniqueInput | InstanceEngineWhereUniqueInput[]
    delete?: InstanceEngineWhereUniqueInput | InstanceEngineWhereUniqueInput[]
    connect?: InstanceEngineWhereUniqueInput | InstanceEngineWhereUniqueInput[]
    update?: InstanceEngineUpdateWithWhereUniqueWithoutInstanceInput | InstanceEngineUpdateWithWhereUniqueWithoutInstanceInput[]
    updateMany?: InstanceEngineUpdateManyWithWhereWithoutInstanceInput | InstanceEngineUpdateManyWithWhereWithoutInstanceInput[]
    deleteMany?: InstanceEngineScalarWhereInput | InstanceEngineScalarWhereInput[]
  }

  export type InstancePolicyUncheckedUpdateOneWithoutInstanceNestedInput = {
    create?: XOR<InstancePolicyCreateWithoutInstanceInput, InstancePolicyUncheckedCreateWithoutInstanceInput>
    connectOrCreate?: InstancePolicyCreateOrConnectWithoutInstanceInput
    upsert?: InstancePolicyUpsertWithoutInstanceInput
    disconnect?: InstancePolicyWhereInput | boolean
    delete?: InstancePolicyWhereInput | boolean
    connect?: InstancePolicyWhereUniqueInput
    update?: XOR<XOR<InstancePolicyUpdateToOneWithWhereWithoutInstanceInput, InstancePolicyUpdateWithoutInstanceInput>, InstancePolicyUncheckedUpdateWithoutInstanceInput>
  }

  export type TerminalSessionUncheckedUpdateManyWithoutInstanceNestedInput = {
    create?: XOR<TerminalSessionCreateWithoutInstanceInput, TerminalSessionUncheckedCreateWithoutInstanceInput> | TerminalSessionCreateWithoutInstanceInput[] | TerminalSessionUncheckedCreateWithoutInstanceInput[]
    connectOrCreate?: TerminalSessionCreateOrConnectWithoutInstanceInput | TerminalSessionCreateOrConnectWithoutInstanceInput[]
    upsert?: TerminalSessionUpsertWithWhereUniqueWithoutInstanceInput | TerminalSessionUpsertWithWhereUniqueWithoutInstanceInput[]
    createMany?: TerminalSessionCreateManyInstanceInputEnvelope
    set?: TerminalSessionWhereUniqueInput | TerminalSessionWhereUniqueInput[]
    disconnect?: TerminalSessionWhereUniqueInput | TerminalSessionWhereUniqueInput[]
    delete?: TerminalSessionWhereUniqueInput | TerminalSessionWhereUniqueInput[]
    connect?: TerminalSessionWhereUniqueInput | TerminalSessionWhereUniqueInput[]
    update?: TerminalSessionUpdateWithWhereUniqueWithoutInstanceInput | TerminalSessionUpdateWithWhereUniqueWithoutInstanceInput[]
    updateMany?: TerminalSessionUpdateManyWithWhereWithoutInstanceInput | TerminalSessionUpdateManyWithWhereWithoutInstanceInput[]
    deleteMany?: TerminalSessionScalarWhereInput | TerminalSessionScalarWhereInput[]
  }

  export type SnapshotUncheckedUpdateManyWithoutInstanceNestedInput = {
    create?: XOR<SnapshotCreateWithoutInstanceInput, SnapshotUncheckedCreateWithoutInstanceInput> | SnapshotCreateWithoutInstanceInput[] | SnapshotUncheckedCreateWithoutInstanceInput[]
    connectOrCreate?: SnapshotCreateOrConnectWithoutInstanceInput | SnapshotCreateOrConnectWithoutInstanceInput[]
    upsert?: SnapshotUpsertWithWhereUniqueWithoutInstanceInput | SnapshotUpsertWithWhereUniqueWithoutInstanceInput[]
    createMany?: SnapshotCreateManyInstanceInputEnvelope
    set?: SnapshotWhereUniqueInput | SnapshotWhereUniqueInput[]
    disconnect?: SnapshotWhereUniqueInput | SnapshotWhereUniqueInput[]
    delete?: SnapshotWhereUniqueInput | SnapshotWhereUniqueInput[]
    connect?: SnapshotWhereUniqueInput | SnapshotWhereUniqueInput[]
    update?: SnapshotUpdateWithWhereUniqueWithoutInstanceInput | SnapshotUpdateWithWhereUniqueWithoutInstanceInput[]
    updateMany?: SnapshotUpdateManyWithWhereWithoutInstanceInput | SnapshotUpdateManyWithWhereWithoutInstanceInput[]
    deleteMany?: SnapshotScalarWhereInput | SnapshotScalarWhereInput[]
  }

  export type InstanceLogUncheckedUpdateManyWithoutInstanceNestedInput = {
    create?: XOR<InstanceLogCreateWithoutInstanceInput, InstanceLogUncheckedCreateWithoutInstanceInput> | InstanceLogCreateWithoutInstanceInput[] | InstanceLogUncheckedCreateWithoutInstanceInput[]
    connectOrCreate?: InstanceLogCreateOrConnectWithoutInstanceInput | InstanceLogCreateOrConnectWithoutInstanceInput[]
    upsert?: InstanceLogUpsertWithWhereUniqueWithoutInstanceInput | InstanceLogUpsertWithWhereUniqueWithoutInstanceInput[]
    createMany?: InstanceLogCreateManyInstanceInputEnvelope
    set?: InstanceLogWhereUniqueInput | InstanceLogWhereUniqueInput[]
    disconnect?: InstanceLogWhereUniqueInput | InstanceLogWhereUniqueInput[]
    delete?: InstanceLogWhereUniqueInput | InstanceLogWhereUniqueInput[]
    connect?: InstanceLogWhereUniqueInput | InstanceLogWhereUniqueInput[]
    update?: InstanceLogUpdateWithWhereUniqueWithoutInstanceInput | InstanceLogUpdateWithWhereUniqueWithoutInstanceInput[]
    updateMany?: InstanceLogUpdateManyWithWhereWithoutInstanceInput | InstanceLogUpdateManyWithWhereWithoutInstanceInput[]
    deleteMany?: InstanceLogScalarWhereInput | InstanceLogScalarWhereInput[]
  }

  export type BillingRecordUncheckedUpdateManyWithoutInstanceNestedInput = {
    create?: XOR<BillingRecordCreateWithoutInstanceInput, BillingRecordUncheckedCreateWithoutInstanceInput> | BillingRecordCreateWithoutInstanceInput[] | BillingRecordUncheckedCreateWithoutInstanceInput[]
    connectOrCreate?: BillingRecordCreateOrConnectWithoutInstanceInput | BillingRecordCreateOrConnectWithoutInstanceInput[]
    upsert?: BillingRecordUpsertWithWhereUniqueWithoutInstanceInput | BillingRecordUpsertWithWhereUniqueWithoutInstanceInput[]
    createMany?: BillingRecordCreateManyInstanceInputEnvelope
    set?: BillingRecordWhereUniqueInput | BillingRecordWhereUniqueInput[]
    disconnect?: BillingRecordWhereUniqueInput | BillingRecordWhereUniqueInput[]
    delete?: BillingRecordWhereUniqueInput | BillingRecordWhereUniqueInput[]
    connect?: BillingRecordWhereUniqueInput | BillingRecordWhereUniqueInput[]
    update?: BillingRecordUpdateWithWhereUniqueWithoutInstanceInput | BillingRecordUpdateWithWhereUniqueWithoutInstanceInput[]
    updateMany?: BillingRecordUpdateManyWithWhereWithoutInstanceInput | BillingRecordUpdateManyWithWhereWithoutInstanceInput[]
    deleteMany?: BillingRecordScalarWhereInput | BillingRecordScalarWhereInput[]
  }

  export type ExecutionGraphUncheckedUpdateManyWithoutInstanceNestedInput = {
    create?: XOR<ExecutionGraphCreateWithoutInstanceInput, ExecutionGraphUncheckedCreateWithoutInstanceInput> | ExecutionGraphCreateWithoutInstanceInput[] | ExecutionGraphUncheckedCreateWithoutInstanceInput[]
    connectOrCreate?: ExecutionGraphCreateOrConnectWithoutInstanceInput | ExecutionGraphCreateOrConnectWithoutInstanceInput[]
    upsert?: ExecutionGraphUpsertWithWhereUniqueWithoutInstanceInput | ExecutionGraphUpsertWithWhereUniqueWithoutInstanceInput[]
    createMany?: ExecutionGraphCreateManyInstanceInputEnvelope
    set?: ExecutionGraphWhereUniqueInput | ExecutionGraphWhereUniqueInput[]
    disconnect?: ExecutionGraphWhereUniqueInput | ExecutionGraphWhereUniqueInput[]
    delete?: ExecutionGraphWhereUniqueInput | ExecutionGraphWhereUniqueInput[]
    connect?: ExecutionGraphWhereUniqueInput | ExecutionGraphWhereUniqueInput[]
    update?: ExecutionGraphUpdateWithWhereUniqueWithoutInstanceInput | ExecutionGraphUpdateWithWhereUniqueWithoutInstanceInput[]
    updateMany?: ExecutionGraphUpdateManyWithWhereWithoutInstanceInput | ExecutionGraphUpdateManyWithWhereWithoutInstanceInput[]
    deleteMany?: ExecutionGraphScalarWhereInput | ExecutionGraphScalarWhereInput[]
  }

  export type InstanceCreateNestedOneWithoutEnginesInput = {
    create?: XOR<InstanceCreateWithoutEnginesInput, InstanceUncheckedCreateWithoutEnginesInput>
    connectOrCreate?: InstanceCreateOrConnectWithoutEnginesInput
    connect?: InstanceWhereUniqueInput
  }

  export type EnumEngineTypeFieldUpdateOperationsInput = {
    set?: $Enums.EngineType
  }

  export type InstanceUpdateOneRequiredWithoutEnginesNestedInput = {
    create?: XOR<InstanceCreateWithoutEnginesInput, InstanceUncheckedCreateWithoutEnginesInput>
    connectOrCreate?: InstanceCreateOrConnectWithoutEnginesInput
    upsert?: InstanceUpsertWithoutEnginesInput
    connect?: InstanceWhereUniqueInput
    update?: XOR<XOR<InstanceUpdateToOneWithWhereWithoutEnginesInput, InstanceUpdateWithoutEnginesInput>, InstanceUncheckedUpdateWithoutEnginesInput>
  }

  export type InstanceCreateNestedOneWithoutPolicyInput = {
    create?: XOR<InstanceCreateWithoutPolicyInput, InstanceUncheckedCreateWithoutPolicyInput>
    connectOrCreate?: InstanceCreateOrConnectWithoutPolicyInput
    connect?: InstanceWhereUniqueInput
  }

  export type NullableIntFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type InstanceUpdateOneRequiredWithoutPolicyNestedInput = {
    create?: XOR<InstanceCreateWithoutPolicyInput, InstanceUncheckedCreateWithoutPolicyInput>
    connectOrCreate?: InstanceCreateOrConnectWithoutPolicyInput
    upsert?: InstanceUpsertWithoutPolicyInput
    connect?: InstanceWhereUniqueInput
    update?: XOR<XOR<InstanceUpdateToOneWithWhereWithoutPolicyInput, InstanceUpdateWithoutPolicyInput>, InstanceUncheckedUpdateWithoutPolicyInput>
  }

  export type InstanceCreateNestedManyWithoutCpuTierInput = {
    create?: XOR<InstanceCreateWithoutCpuTierInput, InstanceUncheckedCreateWithoutCpuTierInput> | InstanceCreateWithoutCpuTierInput[] | InstanceUncheckedCreateWithoutCpuTierInput[]
    connectOrCreate?: InstanceCreateOrConnectWithoutCpuTierInput | InstanceCreateOrConnectWithoutCpuTierInput[]
    createMany?: InstanceCreateManyCpuTierInputEnvelope
    connect?: InstanceWhereUniqueInput | InstanceWhereUniqueInput[]
  }

  export type InstanceUncheckedCreateNestedManyWithoutCpuTierInput = {
    create?: XOR<InstanceCreateWithoutCpuTierInput, InstanceUncheckedCreateWithoutCpuTierInput> | InstanceCreateWithoutCpuTierInput[] | InstanceUncheckedCreateWithoutCpuTierInput[]
    connectOrCreate?: InstanceCreateOrConnectWithoutCpuTierInput | InstanceCreateOrConnectWithoutCpuTierInput[]
    createMany?: InstanceCreateManyCpuTierInputEnvelope
    connect?: InstanceWhereUniqueInput | InstanceWhereUniqueInput[]
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type FloatFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type InstanceUpdateManyWithoutCpuTierNestedInput = {
    create?: XOR<InstanceCreateWithoutCpuTierInput, InstanceUncheckedCreateWithoutCpuTierInput> | InstanceCreateWithoutCpuTierInput[] | InstanceUncheckedCreateWithoutCpuTierInput[]
    connectOrCreate?: InstanceCreateOrConnectWithoutCpuTierInput | InstanceCreateOrConnectWithoutCpuTierInput[]
    upsert?: InstanceUpsertWithWhereUniqueWithoutCpuTierInput | InstanceUpsertWithWhereUniqueWithoutCpuTierInput[]
    createMany?: InstanceCreateManyCpuTierInputEnvelope
    set?: InstanceWhereUniqueInput | InstanceWhereUniqueInput[]
    disconnect?: InstanceWhereUniqueInput | InstanceWhereUniqueInput[]
    delete?: InstanceWhereUniqueInput | InstanceWhereUniqueInput[]
    connect?: InstanceWhereUniqueInput | InstanceWhereUniqueInput[]
    update?: InstanceUpdateWithWhereUniqueWithoutCpuTierInput | InstanceUpdateWithWhereUniqueWithoutCpuTierInput[]
    updateMany?: InstanceUpdateManyWithWhereWithoutCpuTierInput | InstanceUpdateManyWithWhereWithoutCpuTierInput[]
    deleteMany?: InstanceScalarWhereInput | InstanceScalarWhereInput[]
  }

  export type InstanceUncheckedUpdateManyWithoutCpuTierNestedInput = {
    create?: XOR<InstanceCreateWithoutCpuTierInput, InstanceUncheckedCreateWithoutCpuTierInput> | InstanceCreateWithoutCpuTierInput[] | InstanceUncheckedCreateWithoutCpuTierInput[]
    connectOrCreate?: InstanceCreateOrConnectWithoutCpuTierInput | InstanceCreateOrConnectWithoutCpuTierInput[]
    upsert?: InstanceUpsertWithWhereUniqueWithoutCpuTierInput | InstanceUpsertWithWhereUniqueWithoutCpuTierInput[]
    createMany?: InstanceCreateManyCpuTierInputEnvelope
    set?: InstanceWhereUniqueInput | InstanceWhereUniqueInput[]
    disconnect?: InstanceWhereUniqueInput | InstanceWhereUniqueInput[]
    delete?: InstanceWhereUniqueInput | InstanceWhereUniqueInput[]
    connect?: InstanceWhereUniqueInput | InstanceWhereUniqueInput[]
    update?: InstanceUpdateWithWhereUniqueWithoutCpuTierInput | InstanceUpdateWithWhereUniqueWithoutCpuTierInput[]
    updateMany?: InstanceUpdateManyWithWhereWithoutCpuTierInput | InstanceUpdateManyWithWhereWithoutCpuTierInput[]
    deleteMany?: InstanceScalarWhereInput | InstanceScalarWhereInput[]
  }

  export type InstanceCreateNestedManyWithoutNodeTierInput = {
    create?: XOR<InstanceCreateWithoutNodeTierInput, InstanceUncheckedCreateWithoutNodeTierInput> | InstanceCreateWithoutNodeTierInput[] | InstanceUncheckedCreateWithoutNodeTierInput[]
    connectOrCreate?: InstanceCreateOrConnectWithoutNodeTierInput | InstanceCreateOrConnectWithoutNodeTierInput[]
    createMany?: InstanceCreateManyNodeTierInputEnvelope
    connect?: InstanceWhereUniqueInput | InstanceWhereUniqueInput[]
  }

  export type InstanceUncheckedCreateNestedManyWithoutNodeTierInput = {
    create?: XOR<InstanceCreateWithoutNodeTierInput, InstanceUncheckedCreateWithoutNodeTierInput> | InstanceCreateWithoutNodeTierInput[] | InstanceUncheckedCreateWithoutNodeTierInput[]
    connectOrCreate?: InstanceCreateOrConnectWithoutNodeTierInput | InstanceCreateOrConnectWithoutNodeTierInput[]
    createMany?: InstanceCreateManyNodeTierInputEnvelope
    connect?: InstanceWhereUniqueInput | InstanceWhereUniqueInput[]
  }

  export type InstanceUpdateManyWithoutNodeTierNestedInput = {
    create?: XOR<InstanceCreateWithoutNodeTierInput, InstanceUncheckedCreateWithoutNodeTierInput> | InstanceCreateWithoutNodeTierInput[] | InstanceUncheckedCreateWithoutNodeTierInput[]
    connectOrCreate?: InstanceCreateOrConnectWithoutNodeTierInput | InstanceCreateOrConnectWithoutNodeTierInput[]
    upsert?: InstanceUpsertWithWhereUniqueWithoutNodeTierInput | InstanceUpsertWithWhereUniqueWithoutNodeTierInput[]
    createMany?: InstanceCreateManyNodeTierInputEnvelope
    set?: InstanceWhereUniqueInput | InstanceWhereUniqueInput[]
    disconnect?: InstanceWhereUniqueInput | InstanceWhereUniqueInput[]
    delete?: InstanceWhereUniqueInput | InstanceWhereUniqueInput[]
    connect?: InstanceWhereUniqueInput | InstanceWhereUniqueInput[]
    update?: InstanceUpdateWithWhereUniqueWithoutNodeTierInput | InstanceUpdateWithWhereUniqueWithoutNodeTierInput[]
    updateMany?: InstanceUpdateManyWithWhereWithoutNodeTierInput | InstanceUpdateManyWithWhereWithoutNodeTierInput[]
    deleteMany?: InstanceScalarWhereInput | InstanceScalarWhereInput[]
  }

  export type InstanceUncheckedUpdateManyWithoutNodeTierNestedInput = {
    create?: XOR<InstanceCreateWithoutNodeTierInput, InstanceUncheckedCreateWithoutNodeTierInput> | InstanceCreateWithoutNodeTierInput[] | InstanceUncheckedCreateWithoutNodeTierInput[]
    connectOrCreate?: InstanceCreateOrConnectWithoutNodeTierInput | InstanceCreateOrConnectWithoutNodeTierInput[]
    upsert?: InstanceUpsertWithWhereUniqueWithoutNodeTierInput | InstanceUpsertWithWhereUniqueWithoutNodeTierInput[]
    createMany?: InstanceCreateManyNodeTierInputEnvelope
    set?: InstanceWhereUniqueInput | InstanceWhereUniqueInput[]
    disconnect?: InstanceWhereUniqueInput | InstanceWhereUniqueInput[]
    delete?: InstanceWhereUniqueInput | InstanceWhereUniqueInput[]
    connect?: InstanceWhereUniqueInput | InstanceWhereUniqueInput[]
    update?: InstanceUpdateWithWhereUniqueWithoutNodeTierInput | InstanceUpdateWithWhereUniqueWithoutNodeTierInput[]
    updateMany?: InstanceUpdateManyWithWhereWithoutNodeTierInput | InstanceUpdateManyWithWhereWithoutNodeTierInput[]
    deleteMany?: InstanceScalarWhereInput | InstanceScalarWhereInput[]
  }

  export type InstanceCreateNestedManyWithoutEngineTierInput = {
    create?: XOR<InstanceCreateWithoutEngineTierInput, InstanceUncheckedCreateWithoutEngineTierInput> | InstanceCreateWithoutEngineTierInput[] | InstanceUncheckedCreateWithoutEngineTierInput[]
    connectOrCreate?: InstanceCreateOrConnectWithoutEngineTierInput | InstanceCreateOrConnectWithoutEngineTierInput[]
    createMany?: InstanceCreateManyEngineTierInputEnvelope
    connect?: InstanceWhereUniqueInput | InstanceWhereUniqueInput[]
  }

  export type InstanceUncheckedCreateNestedManyWithoutEngineTierInput = {
    create?: XOR<InstanceCreateWithoutEngineTierInput, InstanceUncheckedCreateWithoutEngineTierInput> | InstanceCreateWithoutEngineTierInput[] | InstanceUncheckedCreateWithoutEngineTierInput[]
    connectOrCreate?: InstanceCreateOrConnectWithoutEngineTierInput | InstanceCreateOrConnectWithoutEngineTierInput[]
    createMany?: InstanceCreateManyEngineTierInputEnvelope
    connect?: InstanceWhereUniqueInput | InstanceWhereUniqueInput[]
  }

  export type InstanceUpdateManyWithoutEngineTierNestedInput = {
    create?: XOR<InstanceCreateWithoutEngineTierInput, InstanceUncheckedCreateWithoutEngineTierInput> | InstanceCreateWithoutEngineTierInput[] | InstanceUncheckedCreateWithoutEngineTierInput[]
    connectOrCreate?: InstanceCreateOrConnectWithoutEngineTierInput | InstanceCreateOrConnectWithoutEngineTierInput[]
    upsert?: InstanceUpsertWithWhereUniqueWithoutEngineTierInput | InstanceUpsertWithWhereUniqueWithoutEngineTierInput[]
    createMany?: InstanceCreateManyEngineTierInputEnvelope
    set?: InstanceWhereUniqueInput | InstanceWhereUniqueInput[]
    disconnect?: InstanceWhereUniqueInput | InstanceWhereUniqueInput[]
    delete?: InstanceWhereUniqueInput | InstanceWhereUniqueInput[]
    connect?: InstanceWhereUniqueInput | InstanceWhereUniqueInput[]
    update?: InstanceUpdateWithWhereUniqueWithoutEngineTierInput | InstanceUpdateWithWhereUniqueWithoutEngineTierInput[]
    updateMany?: InstanceUpdateManyWithWhereWithoutEngineTierInput | InstanceUpdateManyWithWhereWithoutEngineTierInput[]
    deleteMany?: InstanceScalarWhereInput | InstanceScalarWhereInput[]
  }

  export type InstanceUncheckedUpdateManyWithoutEngineTierNestedInput = {
    create?: XOR<InstanceCreateWithoutEngineTierInput, InstanceUncheckedCreateWithoutEngineTierInput> | InstanceCreateWithoutEngineTierInput[] | InstanceUncheckedCreateWithoutEngineTierInput[]
    connectOrCreate?: InstanceCreateOrConnectWithoutEngineTierInput | InstanceCreateOrConnectWithoutEngineTierInput[]
    upsert?: InstanceUpsertWithWhereUniqueWithoutEngineTierInput | InstanceUpsertWithWhereUniqueWithoutEngineTierInput[]
    createMany?: InstanceCreateManyEngineTierInputEnvelope
    set?: InstanceWhereUniqueInput | InstanceWhereUniqueInput[]
    disconnect?: InstanceWhereUniqueInput | InstanceWhereUniqueInput[]
    delete?: InstanceWhereUniqueInput | InstanceWhereUniqueInput[]
    connect?: InstanceWhereUniqueInput | InstanceWhereUniqueInput[]
    update?: InstanceUpdateWithWhereUniqueWithoutEngineTierInput | InstanceUpdateWithWhereUniqueWithoutEngineTierInput[]
    updateMany?: InstanceUpdateManyWithWhereWithoutEngineTierInput | InstanceUpdateManyWithWhereWithoutEngineTierInput[]
    deleteMany?: InstanceScalarWhereInput | InstanceScalarWhereInput[]
  }

  export type InstanceCreateNestedManyWithoutQpuTierInput = {
    create?: XOR<InstanceCreateWithoutQpuTierInput, InstanceUncheckedCreateWithoutQpuTierInput> | InstanceCreateWithoutQpuTierInput[] | InstanceUncheckedCreateWithoutQpuTierInput[]
    connectOrCreate?: InstanceCreateOrConnectWithoutQpuTierInput | InstanceCreateOrConnectWithoutQpuTierInput[]
    createMany?: InstanceCreateManyQpuTierInputEnvelope
    connect?: InstanceWhereUniqueInput | InstanceWhereUniqueInput[]
  }

  export type InstanceUncheckedCreateNestedManyWithoutQpuTierInput = {
    create?: XOR<InstanceCreateWithoutQpuTierInput, InstanceUncheckedCreateWithoutQpuTierInput> | InstanceCreateWithoutQpuTierInput[] | InstanceUncheckedCreateWithoutQpuTierInput[]
    connectOrCreate?: InstanceCreateOrConnectWithoutQpuTierInput | InstanceCreateOrConnectWithoutQpuTierInput[]
    createMany?: InstanceCreateManyQpuTierInputEnvelope
    connect?: InstanceWhereUniqueInput | InstanceWhereUniqueInput[]
  }

  export type InstanceUpdateManyWithoutQpuTierNestedInput = {
    create?: XOR<InstanceCreateWithoutQpuTierInput, InstanceUncheckedCreateWithoutQpuTierInput> | InstanceCreateWithoutQpuTierInput[] | InstanceUncheckedCreateWithoutQpuTierInput[]
    connectOrCreate?: InstanceCreateOrConnectWithoutQpuTierInput | InstanceCreateOrConnectWithoutQpuTierInput[]
    upsert?: InstanceUpsertWithWhereUniqueWithoutQpuTierInput | InstanceUpsertWithWhereUniqueWithoutQpuTierInput[]
    createMany?: InstanceCreateManyQpuTierInputEnvelope
    set?: InstanceWhereUniqueInput | InstanceWhereUniqueInput[]
    disconnect?: InstanceWhereUniqueInput | InstanceWhereUniqueInput[]
    delete?: InstanceWhereUniqueInput | InstanceWhereUniqueInput[]
    connect?: InstanceWhereUniqueInput | InstanceWhereUniqueInput[]
    update?: InstanceUpdateWithWhereUniqueWithoutQpuTierInput | InstanceUpdateWithWhereUniqueWithoutQpuTierInput[]
    updateMany?: InstanceUpdateManyWithWhereWithoutQpuTierInput | InstanceUpdateManyWithWhereWithoutQpuTierInput[]
    deleteMany?: InstanceScalarWhereInput | InstanceScalarWhereInput[]
  }

  export type InstanceUncheckedUpdateManyWithoutQpuTierNestedInput = {
    create?: XOR<InstanceCreateWithoutQpuTierInput, InstanceUncheckedCreateWithoutQpuTierInput> | InstanceCreateWithoutQpuTierInput[] | InstanceUncheckedCreateWithoutQpuTierInput[]
    connectOrCreate?: InstanceCreateOrConnectWithoutQpuTierInput | InstanceCreateOrConnectWithoutQpuTierInput[]
    upsert?: InstanceUpsertWithWhereUniqueWithoutQpuTierInput | InstanceUpsertWithWhereUniqueWithoutQpuTierInput[]
    createMany?: InstanceCreateManyQpuTierInputEnvelope
    set?: InstanceWhereUniqueInput | InstanceWhereUniqueInput[]
    disconnect?: InstanceWhereUniqueInput | InstanceWhereUniqueInput[]
    delete?: InstanceWhereUniqueInput | InstanceWhereUniqueInput[]
    connect?: InstanceWhereUniqueInput | InstanceWhereUniqueInput[]
    update?: InstanceUpdateWithWhereUniqueWithoutQpuTierInput | InstanceUpdateWithWhereUniqueWithoutQpuTierInput[]
    updateMany?: InstanceUpdateManyWithWhereWithoutQpuTierInput | InstanceUpdateManyWithWhereWithoutQpuTierInput[]
    deleteMany?: InstanceScalarWhereInput | InstanceScalarWhereInput[]
  }

  export type InstanceCreateNestedManyWithoutOmegaTierInput = {
    create?: XOR<InstanceCreateWithoutOmegaTierInput, InstanceUncheckedCreateWithoutOmegaTierInput> | InstanceCreateWithoutOmegaTierInput[] | InstanceUncheckedCreateWithoutOmegaTierInput[]
    connectOrCreate?: InstanceCreateOrConnectWithoutOmegaTierInput | InstanceCreateOrConnectWithoutOmegaTierInput[]
    createMany?: InstanceCreateManyOmegaTierInputEnvelope
    connect?: InstanceWhereUniqueInput | InstanceWhereUniqueInput[]
  }

  export type InstanceUncheckedCreateNestedManyWithoutOmegaTierInput = {
    create?: XOR<InstanceCreateWithoutOmegaTierInput, InstanceUncheckedCreateWithoutOmegaTierInput> | InstanceCreateWithoutOmegaTierInput[] | InstanceUncheckedCreateWithoutOmegaTierInput[]
    connectOrCreate?: InstanceCreateOrConnectWithoutOmegaTierInput | InstanceCreateOrConnectWithoutOmegaTierInput[]
    createMany?: InstanceCreateManyOmegaTierInputEnvelope
    connect?: InstanceWhereUniqueInput | InstanceWhereUniqueInput[]
  }

  export type InstanceUpdateManyWithoutOmegaTierNestedInput = {
    create?: XOR<InstanceCreateWithoutOmegaTierInput, InstanceUncheckedCreateWithoutOmegaTierInput> | InstanceCreateWithoutOmegaTierInput[] | InstanceUncheckedCreateWithoutOmegaTierInput[]
    connectOrCreate?: InstanceCreateOrConnectWithoutOmegaTierInput | InstanceCreateOrConnectWithoutOmegaTierInput[]
    upsert?: InstanceUpsertWithWhereUniqueWithoutOmegaTierInput | InstanceUpsertWithWhereUniqueWithoutOmegaTierInput[]
    createMany?: InstanceCreateManyOmegaTierInputEnvelope
    set?: InstanceWhereUniqueInput | InstanceWhereUniqueInput[]
    disconnect?: InstanceWhereUniqueInput | InstanceWhereUniqueInput[]
    delete?: InstanceWhereUniqueInput | InstanceWhereUniqueInput[]
    connect?: InstanceWhereUniqueInput | InstanceWhereUniqueInput[]
    update?: InstanceUpdateWithWhereUniqueWithoutOmegaTierInput | InstanceUpdateWithWhereUniqueWithoutOmegaTierInput[]
    updateMany?: InstanceUpdateManyWithWhereWithoutOmegaTierInput | InstanceUpdateManyWithWhereWithoutOmegaTierInput[]
    deleteMany?: InstanceScalarWhereInput | InstanceScalarWhereInput[]
  }

  export type InstanceUncheckedUpdateManyWithoutOmegaTierNestedInput = {
    create?: XOR<InstanceCreateWithoutOmegaTierInput, InstanceUncheckedCreateWithoutOmegaTierInput> | InstanceCreateWithoutOmegaTierInput[] | InstanceUncheckedCreateWithoutOmegaTierInput[]
    connectOrCreate?: InstanceCreateOrConnectWithoutOmegaTierInput | InstanceCreateOrConnectWithoutOmegaTierInput[]
    upsert?: InstanceUpsertWithWhereUniqueWithoutOmegaTierInput | InstanceUpsertWithWhereUniqueWithoutOmegaTierInput[]
    createMany?: InstanceCreateManyOmegaTierInputEnvelope
    set?: InstanceWhereUniqueInput | InstanceWhereUniqueInput[]
    disconnect?: InstanceWhereUniqueInput | InstanceWhereUniqueInput[]
    delete?: InstanceWhereUniqueInput | InstanceWhereUniqueInput[]
    connect?: InstanceWhereUniqueInput | InstanceWhereUniqueInput[]
    update?: InstanceUpdateWithWhereUniqueWithoutOmegaTierInput | InstanceUpdateWithWhereUniqueWithoutOmegaTierInput[]
    updateMany?: InstanceUpdateManyWithWhereWithoutOmegaTierInput | InstanceUpdateManyWithWhereWithoutOmegaTierInput[]
    deleteMany?: InstanceScalarWhereInput | InstanceScalarWhereInput[]
  }

  export type InstanceCreateNestedOneWithoutSnapshotsInput = {
    create?: XOR<InstanceCreateWithoutSnapshotsInput, InstanceUncheckedCreateWithoutSnapshotsInput>
    connectOrCreate?: InstanceCreateOrConnectWithoutSnapshotsInput
    connect?: InstanceWhereUniqueInput
  }

  export type InstanceUpdateOneRequiredWithoutSnapshotsNestedInput = {
    create?: XOR<InstanceCreateWithoutSnapshotsInput, InstanceUncheckedCreateWithoutSnapshotsInput>
    connectOrCreate?: InstanceCreateOrConnectWithoutSnapshotsInput
    upsert?: InstanceUpsertWithoutSnapshotsInput
    connect?: InstanceWhereUniqueInput
    update?: XOR<XOR<InstanceUpdateToOneWithWhereWithoutSnapshotsInput, InstanceUpdateWithoutSnapshotsInput>, InstanceUncheckedUpdateWithoutSnapshotsInput>
  }

  export type InstanceCreateNestedOneWithoutLogsInput = {
    create?: XOR<InstanceCreateWithoutLogsInput, InstanceUncheckedCreateWithoutLogsInput>
    connectOrCreate?: InstanceCreateOrConnectWithoutLogsInput
    connect?: InstanceWhereUniqueInput
  }

  export type InstanceUpdateOneRequiredWithoutLogsNestedInput = {
    create?: XOR<InstanceCreateWithoutLogsInput, InstanceUncheckedCreateWithoutLogsInput>
    connectOrCreate?: InstanceCreateOrConnectWithoutLogsInput
    upsert?: InstanceUpsertWithoutLogsInput
    connect?: InstanceWhereUniqueInput
    update?: XOR<XOR<InstanceUpdateToOneWithWhereWithoutLogsInput, InstanceUpdateWithoutLogsInput>, InstanceUncheckedUpdateWithoutLogsInput>
  }

  export type InstanceCreateNestedOneWithoutBillingRecordsInput = {
    create?: XOR<InstanceCreateWithoutBillingRecordsInput, InstanceUncheckedCreateWithoutBillingRecordsInput>
    connectOrCreate?: InstanceCreateOrConnectWithoutBillingRecordsInput
    connect?: InstanceWhereUniqueInput
  }

  export type InstanceUpdateOneRequiredWithoutBillingRecordsNestedInput = {
    create?: XOR<InstanceCreateWithoutBillingRecordsInput, InstanceUncheckedCreateWithoutBillingRecordsInput>
    connectOrCreate?: InstanceCreateOrConnectWithoutBillingRecordsInput
    upsert?: InstanceUpsertWithoutBillingRecordsInput
    connect?: InstanceWhereUniqueInput
    update?: XOR<XOR<InstanceUpdateToOneWithWhereWithoutBillingRecordsInput, InstanceUpdateWithoutBillingRecordsInput>, InstanceUncheckedUpdateWithoutBillingRecordsInput>
  }

  export type InstanceCreateNestedOneWithoutExecutionGraphsInput = {
    create?: XOR<InstanceCreateWithoutExecutionGraphsInput, InstanceUncheckedCreateWithoutExecutionGraphsInput>
    connectOrCreate?: InstanceCreateOrConnectWithoutExecutionGraphsInput
    connect?: InstanceWhereUniqueInput
  }

  export type InstanceUpdateOneRequiredWithoutExecutionGraphsNestedInput = {
    create?: XOR<InstanceCreateWithoutExecutionGraphsInput, InstanceUncheckedCreateWithoutExecutionGraphsInput>
    connectOrCreate?: InstanceCreateOrConnectWithoutExecutionGraphsInput
    upsert?: InstanceUpsertWithoutExecutionGraphsInput
    connect?: InstanceWhereUniqueInput
    update?: XOR<XOR<InstanceUpdateToOneWithWhereWithoutExecutionGraphsInput, InstanceUpdateWithoutExecutionGraphsInput>, InstanceUncheckedUpdateWithoutExecutionGraphsInput>
  }

  export type InstanceCreateNestedOneWithoutTerminalSessionsInput = {
    create?: XOR<InstanceCreateWithoutTerminalSessionsInput, InstanceUncheckedCreateWithoutTerminalSessionsInput>
    connectOrCreate?: InstanceCreateOrConnectWithoutTerminalSessionsInput
    connect?: InstanceWhereUniqueInput
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type InstanceUpdateOneRequiredWithoutTerminalSessionsNestedInput = {
    create?: XOR<InstanceCreateWithoutTerminalSessionsInput, InstanceUncheckedCreateWithoutTerminalSessionsInput>
    connectOrCreate?: InstanceCreateOrConnectWithoutTerminalSessionsInput
    upsert?: InstanceUpsertWithoutTerminalSessionsInput
    connect?: InstanceWhereUniqueInput
    update?: XOR<XOR<InstanceUpdateToOneWithWhereWithoutTerminalSessionsInput, InstanceUpdateWithoutTerminalSessionsInput>, InstanceUncheckedUpdateWithoutTerminalSessionsInput>
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedEnumInstanceStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.InstanceStatus | EnumInstanceStatusFieldRefInput<$PrismaModel>
    in?: $Enums.InstanceStatus[] | ListEnumInstanceStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.InstanceStatus[] | ListEnumInstanceStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumInstanceStatusFilter<$PrismaModel> | $Enums.InstanceStatus
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedEnumInstanceStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.InstanceStatus | EnumInstanceStatusFieldRefInput<$PrismaModel>
    in?: $Enums.InstanceStatus[] | ListEnumInstanceStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.InstanceStatus[] | ListEnumInstanceStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumInstanceStatusWithAggregatesFilter<$PrismaModel> | $Enums.InstanceStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumInstanceStatusFilter<$PrismaModel>
    _max?: NestedEnumInstanceStatusFilter<$PrismaModel>
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type NestedEnumEngineTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.EngineType | EnumEngineTypeFieldRefInput<$PrismaModel>
    in?: $Enums.EngineType[] | ListEnumEngineTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.EngineType[] | ListEnumEngineTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumEngineTypeFilter<$PrismaModel> | $Enums.EngineType
  }

  export type NestedEnumEngineTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.EngineType | EnumEngineTypeFieldRefInput<$PrismaModel>
    in?: $Enums.EngineType[] | ListEnumEngineTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.EngineType[] | ListEnumEngineTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumEngineTypeWithAggregatesFilter<$PrismaModel> | $Enums.EngineType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumEngineTypeFilter<$PrismaModel>
    _max?: NestedEnumEngineTypeFilter<$PrismaModel>
  }
  export type NestedJsonFilter<$PrismaModel = never> = 
    | PatchUndefined<
        Either<Required<NestedJsonFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type NestedIntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }
  export type NestedJsonNullableFilter<$PrismaModel = never> = 
    | PatchUndefined<
        Either<Required<NestedJsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonNullableFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedFloatFilter<$PrismaModel>
    _min?: NestedFloatFilter<$PrismaModel>
    _max?: NestedFloatFilter<$PrismaModel>
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type CpuTierCreateWithoutInstancesInput = {
    id?: string
    name: string
    cores: number
    price: number
  }

  export type CpuTierUncheckedCreateWithoutInstancesInput = {
    id?: string
    name: string
    cores: number
    price: number
  }

  export type CpuTierCreateOrConnectWithoutInstancesInput = {
    where: CpuTierWhereUniqueInput
    create: XOR<CpuTierCreateWithoutInstancesInput, CpuTierUncheckedCreateWithoutInstancesInput>
  }

  export type NodeTierCreateWithoutInstancesInput = {
    id?: string
    name: string
    nodes: number
    price: number
  }

  export type NodeTierUncheckedCreateWithoutInstancesInput = {
    id?: string
    name: string
    nodes: number
    price: number
  }

  export type NodeTierCreateOrConnectWithoutInstancesInput = {
    where: NodeTierWhereUniqueInput
    create: XOR<NodeTierCreateWithoutInstancesInput, NodeTierUncheckedCreateWithoutInstancesInput>
  }

  export type EngineTierCreateWithoutInstancesInput = {
    id?: string
    name: string
    profile: string
    price: number
  }

  export type EngineTierUncheckedCreateWithoutInstancesInput = {
    id?: string
    name: string
    profile: string
    price: number
  }

  export type EngineTierCreateOrConnectWithoutInstancesInput = {
    where: EngineTierWhereUniqueInput
    create: XOR<EngineTierCreateWithoutInstancesInput, EngineTierUncheckedCreateWithoutInstancesInput>
  }

  export type QpuTierCreateWithoutInstancesInput = {
    id?: string
    name: string
    parallel: boolean
    price: number
  }

  export type QpuTierUncheckedCreateWithoutInstancesInput = {
    id?: string
    name: string
    parallel: boolean
    price: number
  }

  export type QpuTierCreateOrConnectWithoutInstancesInput = {
    where: QpuTierWhereUniqueInput
    create: XOR<QpuTierCreateWithoutInstancesInput, QpuTierUncheckedCreateWithoutInstancesInput>
  }

  export type OmegaTierCreateWithoutInstancesInput = {
    id?: string
    name: string
    cognitive: boolean
    price: number
  }

  export type OmegaTierUncheckedCreateWithoutInstancesInput = {
    id?: string
    name: string
    cognitive: boolean
    price: number
  }

  export type OmegaTierCreateOrConnectWithoutInstancesInput = {
    where: OmegaTierWhereUniqueInput
    create: XOR<OmegaTierCreateWithoutInstancesInput, OmegaTierUncheckedCreateWithoutInstancesInput>
  }

  export type InstanceEngineCreateWithoutInstanceInput = {
    id?: string
    engineType: $Enums.EngineType
    enabled?: boolean
    defaultModel: string
    allowedModels: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type InstanceEngineUncheckedCreateWithoutInstanceInput = {
    id?: string
    engineType: $Enums.EngineType
    enabled?: boolean
    defaultModel: string
    allowedModels: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type InstanceEngineCreateOrConnectWithoutInstanceInput = {
    where: InstanceEngineWhereUniqueInput
    create: XOR<InstanceEngineCreateWithoutInstanceInput, InstanceEngineUncheckedCreateWithoutInstanceInput>
  }

  export type InstanceEngineCreateManyInstanceInputEnvelope = {
    data: InstanceEngineCreateManyInstanceInput | InstanceEngineCreateManyInstanceInput[]
    skipDuplicates?: boolean
  }

  export type InstancePolicyCreateWithoutInstanceInput = {
    id?: string
    allowChat?: boolean
    allowEmotion?: boolean
    allowMemory?: boolean
    allowFinance?: boolean
    allowTerminal?: boolean
    allowSSH?: boolean
    maxTokensPerDay?: number | null
    maxRequestsPerDay?: number | null
    ipWhitelist?: NullableJsonNullValueInput | InputJsonValue
    regionLock?: string | null
    auditRequired?: boolean
    piiStrictMode?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type InstancePolicyUncheckedCreateWithoutInstanceInput = {
    id?: string
    allowChat?: boolean
    allowEmotion?: boolean
    allowMemory?: boolean
    allowFinance?: boolean
    allowTerminal?: boolean
    allowSSH?: boolean
    maxTokensPerDay?: number | null
    maxRequestsPerDay?: number | null
    ipWhitelist?: NullableJsonNullValueInput | InputJsonValue
    regionLock?: string | null
    auditRequired?: boolean
    piiStrictMode?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type InstancePolicyCreateOrConnectWithoutInstanceInput = {
    where: InstancePolicyWhereUniqueInput
    create: XOR<InstancePolicyCreateWithoutInstanceInput, InstancePolicyUncheckedCreateWithoutInstanceInput>
  }

  export type TerminalSessionCreateWithoutInstanceInput = {
    id?: string
    token: string
    userId: string
    scope: string
    issuedAt?: Date | string
    expiresAt: Date | string
    revokedAt?: Date | string | null
    lastVerifiedAt?: Date | string | null
  }

  export type TerminalSessionUncheckedCreateWithoutInstanceInput = {
    id?: string
    token: string
    userId: string
    scope: string
    issuedAt?: Date | string
    expiresAt: Date | string
    revokedAt?: Date | string | null
    lastVerifiedAt?: Date | string | null
  }

  export type TerminalSessionCreateOrConnectWithoutInstanceInput = {
    where: TerminalSessionWhereUniqueInput
    create: XOR<TerminalSessionCreateWithoutInstanceInput, TerminalSessionUncheckedCreateWithoutInstanceInput>
  }

  export type TerminalSessionCreateManyInstanceInputEnvelope = {
    data: TerminalSessionCreateManyInstanceInput | TerminalSessionCreateManyInstanceInput[]
    skipDuplicates?: boolean
  }

  export type SnapshotCreateWithoutInstanceInput = {
    id?: string
    metadata: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type SnapshotUncheckedCreateWithoutInstanceInput = {
    id?: string
    metadata: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type SnapshotCreateOrConnectWithoutInstanceInput = {
    where: SnapshotWhereUniqueInput
    create: XOR<SnapshotCreateWithoutInstanceInput, SnapshotUncheckedCreateWithoutInstanceInput>
  }

  export type SnapshotCreateManyInstanceInputEnvelope = {
    data: SnapshotCreateManyInstanceInput | SnapshotCreateManyInstanceInput[]
    skipDuplicates?: boolean
  }

  export type InstanceLogCreateWithoutInstanceInput = {
    id?: string
    event: string
    detail: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type InstanceLogUncheckedCreateWithoutInstanceInput = {
    id?: string
    event: string
    detail: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type InstanceLogCreateOrConnectWithoutInstanceInput = {
    where: InstanceLogWhereUniqueInput
    create: XOR<InstanceLogCreateWithoutInstanceInput, InstanceLogUncheckedCreateWithoutInstanceInput>
  }

  export type InstanceLogCreateManyInstanceInputEnvelope = {
    data: InstanceLogCreateManyInstanceInput | InstanceLogCreateManyInstanceInput[]
    skipDuplicates?: boolean
  }

  export type BillingRecordCreateWithoutInstanceInput = {
    id?: string
    amount: number
    reason: string
    createdAt?: Date | string
  }

  export type BillingRecordUncheckedCreateWithoutInstanceInput = {
    id?: string
    amount: number
    reason: string
    createdAt?: Date | string
  }

  export type BillingRecordCreateOrConnectWithoutInstanceInput = {
    where: BillingRecordWhereUniqueInput
    create: XOR<BillingRecordCreateWithoutInstanceInput, BillingRecordUncheckedCreateWithoutInstanceInput>
  }

  export type BillingRecordCreateManyInstanceInputEnvelope = {
    data: BillingRecordCreateManyInstanceInput | BillingRecordCreateManyInstanceInput[]
    skipDuplicates?: boolean
  }

  export type ExecutionGraphCreateWithoutInstanceInput = {
    id?: string
    graph: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type ExecutionGraphUncheckedCreateWithoutInstanceInput = {
    id?: string
    graph: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type ExecutionGraphCreateOrConnectWithoutInstanceInput = {
    where: ExecutionGraphWhereUniqueInput
    create: XOR<ExecutionGraphCreateWithoutInstanceInput, ExecutionGraphUncheckedCreateWithoutInstanceInput>
  }

  export type ExecutionGraphCreateManyInstanceInputEnvelope = {
    data: ExecutionGraphCreateManyInstanceInput | ExecutionGraphCreateManyInstanceInput[]
    skipDuplicates?: boolean
  }

  export type CpuTierUpsertWithoutInstancesInput = {
    update: XOR<CpuTierUpdateWithoutInstancesInput, CpuTierUncheckedUpdateWithoutInstancesInput>
    create: XOR<CpuTierCreateWithoutInstancesInput, CpuTierUncheckedCreateWithoutInstancesInput>
    where?: CpuTierWhereInput
  }

  export type CpuTierUpdateToOneWithWhereWithoutInstancesInput = {
    where?: CpuTierWhereInput
    data: XOR<CpuTierUpdateWithoutInstancesInput, CpuTierUncheckedUpdateWithoutInstancesInput>
  }

  export type CpuTierUpdateWithoutInstancesInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    cores?: IntFieldUpdateOperationsInput | number
    price?: FloatFieldUpdateOperationsInput | number
  }

  export type CpuTierUncheckedUpdateWithoutInstancesInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    cores?: IntFieldUpdateOperationsInput | number
    price?: FloatFieldUpdateOperationsInput | number
  }

  export type NodeTierUpsertWithoutInstancesInput = {
    update: XOR<NodeTierUpdateWithoutInstancesInput, NodeTierUncheckedUpdateWithoutInstancesInput>
    create: XOR<NodeTierCreateWithoutInstancesInput, NodeTierUncheckedCreateWithoutInstancesInput>
    where?: NodeTierWhereInput
  }

  export type NodeTierUpdateToOneWithWhereWithoutInstancesInput = {
    where?: NodeTierWhereInput
    data: XOR<NodeTierUpdateWithoutInstancesInput, NodeTierUncheckedUpdateWithoutInstancesInput>
  }

  export type NodeTierUpdateWithoutInstancesInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    nodes?: IntFieldUpdateOperationsInput | number
    price?: FloatFieldUpdateOperationsInput | number
  }

  export type NodeTierUncheckedUpdateWithoutInstancesInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    nodes?: IntFieldUpdateOperationsInput | number
    price?: FloatFieldUpdateOperationsInput | number
  }

  export type EngineTierUpsertWithoutInstancesInput = {
    update: XOR<EngineTierUpdateWithoutInstancesInput, EngineTierUncheckedUpdateWithoutInstancesInput>
    create: XOR<EngineTierCreateWithoutInstancesInput, EngineTierUncheckedCreateWithoutInstancesInput>
    where?: EngineTierWhereInput
  }

  export type EngineTierUpdateToOneWithWhereWithoutInstancesInput = {
    where?: EngineTierWhereInput
    data: XOR<EngineTierUpdateWithoutInstancesInput, EngineTierUncheckedUpdateWithoutInstancesInput>
  }

  export type EngineTierUpdateWithoutInstancesInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    profile?: StringFieldUpdateOperationsInput | string
    price?: FloatFieldUpdateOperationsInput | number
  }

  export type EngineTierUncheckedUpdateWithoutInstancesInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    profile?: StringFieldUpdateOperationsInput | string
    price?: FloatFieldUpdateOperationsInput | number
  }

  export type QpuTierUpsertWithoutInstancesInput = {
    update: XOR<QpuTierUpdateWithoutInstancesInput, QpuTierUncheckedUpdateWithoutInstancesInput>
    create: XOR<QpuTierCreateWithoutInstancesInput, QpuTierUncheckedCreateWithoutInstancesInput>
    where?: QpuTierWhereInput
  }

  export type QpuTierUpdateToOneWithWhereWithoutInstancesInput = {
    where?: QpuTierWhereInput
    data: XOR<QpuTierUpdateWithoutInstancesInput, QpuTierUncheckedUpdateWithoutInstancesInput>
  }

  export type QpuTierUpdateWithoutInstancesInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    parallel?: BoolFieldUpdateOperationsInput | boolean
    price?: FloatFieldUpdateOperationsInput | number
  }

  export type QpuTierUncheckedUpdateWithoutInstancesInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    parallel?: BoolFieldUpdateOperationsInput | boolean
    price?: FloatFieldUpdateOperationsInput | number
  }

  export type OmegaTierUpsertWithoutInstancesInput = {
    update: XOR<OmegaTierUpdateWithoutInstancesInput, OmegaTierUncheckedUpdateWithoutInstancesInput>
    create: XOR<OmegaTierCreateWithoutInstancesInput, OmegaTierUncheckedCreateWithoutInstancesInput>
    where?: OmegaTierWhereInput
  }

  export type OmegaTierUpdateToOneWithWhereWithoutInstancesInput = {
    where?: OmegaTierWhereInput
    data: XOR<OmegaTierUpdateWithoutInstancesInput, OmegaTierUncheckedUpdateWithoutInstancesInput>
  }

  export type OmegaTierUpdateWithoutInstancesInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    cognitive?: BoolFieldUpdateOperationsInput | boolean
    price?: FloatFieldUpdateOperationsInput | number
  }

  export type OmegaTierUncheckedUpdateWithoutInstancesInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    cognitive?: BoolFieldUpdateOperationsInput | boolean
    price?: FloatFieldUpdateOperationsInput | number
  }

  export type InstanceEngineUpsertWithWhereUniqueWithoutInstanceInput = {
    where: InstanceEngineWhereUniqueInput
    update: XOR<InstanceEngineUpdateWithoutInstanceInput, InstanceEngineUncheckedUpdateWithoutInstanceInput>
    create: XOR<InstanceEngineCreateWithoutInstanceInput, InstanceEngineUncheckedCreateWithoutInstanceInput>
  }

  export type InstanceEngineUpdateWithWhereUniqueWithoutInstanceInput = {
    where: InstanceEngineWhereUniqueInput
    data: XOR<InstanceEngineUpdateWithoutInstanceInput, InstanceEngineUncheckedUpdateWithoutInstanceInput>
  }

  export type InstanceEngineUpdateManyWithWhereWithoutInstanceInput = {
    where: InstanceEngineScalarWhereInput
    data: XOR<InstanceEngineUpdateManyMutationInput, InstanceEngineUncheckedUpdateManyWithoutInstanceInput>
  }

  export type InstanceEngineScalarWhereInput = {
    AND?: InstanceEngineScalarWhereInput | InstanceEngineScalarWhereInput[]
    OR?: InstanceEngineScalarWhereInput[]
    NOT?: InstanceEngineScalarWhereInput | InstanceEngineScalarWhereInput[]
    id?: StringFilter<"InstanceEngine"> | string
    instanceId?: StringFilter<"InstanceEngine"> | string
    engineType?: EnumEngineTypeFilter<"InstanceEngine"> | $Enums.EngineType
    enabled?: BoolFilter<"InstanceEngine"> | boolean
    defaultModel?: StringFilter<"InstanceEngine"> | string
    allowedModels?: JsonFilter<"InstanceEngine">
    createdAt?: DateTimeFilter<"InstanceEngine"> | Date | string
  }

  export type InstancePolicyUpsertWithoutInstanceInput = {
    update: XOR<InstancePolicyUpdateWithoutInstanceInput, InstancePolicyUncheckedUpdateWithoutInstanceInput>
    create: XOR<InstancePolicyCreateWithoutInstanceInput, InstancePolicyUncheckedCreateWithoutInstanceInput>
    where?: InstancePolicyWhereInput
  }

  export type InstancePolicyUpdateToOneWithWhereWithoutInstanceInput = {
    where?: InstancePolicyWhereInput
    data: XOR<InstancePolicyUpdateWithoutInstanceInput, InstancePolicyUncheckedUpdateWithoutInstanceInput>
  }

  export type InstancePolicyUpdateWithoutInstanceInput = {
    id?: StringFieldUpdateOperationsInput | string
    allowChat?: BoolFieldUpdateOperationsInput | boolean
    allowEmotion?: BoolFieldUpdateOperationsInput | boolean
    allowMemory?: BoolFieldUpdateOperationsInput | boolean
    allowFinance?: BoolFieldUpdateOperationsInput | boolean
    allowTerminal?: BoolFieldUpdateOperationsInput | boolean
    allowSSH?: BoolFieldUpdateOperationsInput | boolean
    maxTokensPerDay?: NullableIntFieldUpdateOperationsInput | number | null
    maxRequestsPerDay?: NullableIntFieldUpdateOperationsInput | number | null
    ipWhitelist?: NullableJsonNullValueInput | InputJsonValue
    regionLock?: NullableStringFieldUpdateOperationsInput | string | null
    auditRequired?: BoolFieldUpdateOperationsInput | boolean
    piiStrictMode?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type InstancePolicyUncheckedUpdateWithoutInstanceInput = {
    id?: StringFieldUpdateOperationsInput | string
    allowChat?: BoolFieldUpdateOperationsInput | boolean
    allowEmotion?: BoolFieldUpdateOperationsInput | boolean
    allowMemory?: BoolFieldUpdateOperationsInput | boolean
    allowFinance?: BoolFieldUpdateOperationsInput | boolean
    allowTerminal?: BoolFieldUpdateOperationsInput | boolean
    allowSSH?: BoolFieldUpdateOperationsInput | boolean
    maxTokensPerDay?: NullableIntFieldUpdateOperationsInput | number | null
    maxRequestsPerDay?: NullableIntFieldUpdateOperationsInput | number | null
    ipWhitelist?: NullableJsonNullValueInput | InputJsonValue
    regionLock?: NullableStringFieldUpdateOperationsInput | string | null
    auditRequired?: BoolFieldUpdateOperationsInput | boolean
    piiStrictMode?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TerminalSessionUpsertWithWhereUniqueWithoutInstanceInput = {
    where: TerminalSessionWhereUniqueInput
    update: XOR<TerminalSessionUpdateWithoutInstanceInput, TerminalSessionUncheckedUpdateWithoutInstanceInput>
    create: XOR<TerminalSessionCreateWithoutInstanceInput, TerminalSessionUncheckedCreateWithoutInstanceInput>
  }

  export type TerminalSessionUpdateWithWhereUniqueWithoutInstanceInput = {
    where: TerminalSessionWhereUniqueInput
    data: XOR<TerminalSessionUpdateWithoutInstanceInput, TerminalSessionUncheckedUpdateWithoutInstanceInput>
  }

  export type TerminalSessionUpdateManyWithWhereWithoutInstanceInput = {
    where: TerminalSessionScalarWhereInput
    data: XOR<TerminalSessionUpdateManyMutationInput, TerminalSessionUncheckedUpdateManyWithoutInstanceInput>
  }

  export type TerminalSessionScalarWhereInput = {
    AND?: TerminalSessionScalarWhereInput | TerminalSessionScalarWhereInput[]
    OR?: TerminalSessionScalarWhereInput[]
    NOT?: TerminalSessionScalarWhereInput | TerminalSessionScalarWhereInput[]
    id?: StringFilter<"TerminalSession"> | string
    token?: StringFilter<"TerminalSession"> | string
    instanceId?: StringFilter<"TerminalSession"> | string
    userId?: StringFilter<"TerminalSession"> | string
    scope?: StringFilter<"TerminalSession"> | string
    issuedAt?: DateTimeFilter<"TerminalSession"> | Date | string
    expiresAt?: DateTimeFilter<"TerminalSession"> | Date | string
    revokedAt?: DateTimeNullableFilter<"TerminalSession"> | Date | string | null
    lastVerifiedAt?: DateTimeNullableFilter<"TerminalSession"> | Date | string | null
  }

  export type SnapshotUpsertWithWhereUniqueWithoutInstanceInput = {
    where: SnapshotWhereUniqueInput
    update: XOR<SnapshotUpdateWithoutInstanceInput, SnapshotUncheckedUpdateWithoutInstanceInput>
    create: XOR<SnapshotCreateWithoutInstanceInput, SnapshotUncheckedCreateWithoutInstanceInput>
  }

  export type SnapshotUpdateWithWhereUniqueWithoutInstanceInput = {
    where: SnapshotWhereUniqueInput
    data: XOR<SnapshotUpdateWithoutInstanceInput, SnapshotUncheckedUpdateWithoutInstanceInput>
  }

  export type SnapshotUpdateManyWithWhereWithoutInstanceInput = {
    where: SnapshotScalarWhereInput
    data: XOR<SnapshotUpdateManyMutationInput, SnapshotUncheckedUpdateManyWithoutInstanceInput>
  }

  export type SnapshotScalarWhereInput = {
    AND?: SnapshotScalarWhereInput | SnapshotScalarWhereInput[]
    OR?: SnapshotScalarWhereInput[]
    NOT?: SnapshotScalarWhereInput | SnapshotScalarWhereInput[]
    id?: StringFilter<"Snapshot"> | string
    instanceId?: StringFilter<"Snapshot"> | string
    metadata?: JsonFilter<"Snapshot">
    createdAt?: DateTimeFilter<"Snapshot"> | Date | string
  }

  export type InstanceLogUpsertWithWhereUniqueWithoutInstanceInput = {
    where: InstanceLogWhereUniqueInput
    update: XOR<InstanceLogUpdateWithoutInstanceInput, InstanceLogUncheckedUpdateWithoutInstanceInput>
    create: XOR<InstanceLogCreateWithoutInstanceInput, InstanceLogUncheckedCreateWithoutInstanceInput>
  }

  export type InstanceLogUpdateWithWhereUniqueWithoutInstanceInput = {
    where: InstanceLogWhereUniqueInput
    data: XOR<InstanceLogUpdateWithoutInstanceInput, InstanceLogUncheckedUpdateWithoutInstanceInput>
  }

  export type InstanceLogUpdateManyWithWhereWithoutInstanceInput = {
    where: InstanceLogScalarWhereInput
    data: XOR<InstanceLogUpdateManyMutationInput, InstanceLogUncheckedUpdateManyWithoutInstanceInput>
  }

  export type InstanceLogScalarWhereInput = {
    AND?: InstanceLogScalarWhereInput | InstanceLogScalarWhereInput[]
    OR?: InstanceLogScalarWhereInput[]
    NOT?: InstanceLogScalarWhereInput | InstanceLogScalarWhereInput[]
    id?: StringFilter<"InstanceLog"> | string
    instanceId?: StringFilter<"InstanceLog"> | string
    event?: StringFilter<"InstanceLog"> | string
    detail?: JsonFilter<"InstanceLog">
    createdAt?: DateTimeFilter<"InstanceLog"> | Date | string
  }

  export type BillingRecordUpsertWithWhereUniqueWithoutInstanceInput = {
    where: BillingRecordWhereUniqueInput
    update: XOR<BillingRecordUpdateWithoutInstanceInput, BillingRecordUncheckedUpdateWithoutInstanceInput>
    create: XOR<BillingRecordCreateWithoutInstanceInput, BillingRecordUncheckedCreateWithoutInstanceInput>
  }

  export type BillingRecordUpdateWithWhereUniqueWithoutInstanceInput = {
    where: BillingRecordWhereUniqueInput
    data: XOR<BillingRecordUpdateWithoutInstanceInput, BillingRecordUncheckedUpdateWithoutInstanceInput>
  }

  export type BillingRecordUpdateManyWithWhereWithoutInstanceInput = {
    where: BillingRecordScalarWhereInput
    data: XOR<BillingRecordUpdateManyMutationInput, BillingRecordUncheckedUpdateManyWithoutInstanceInput>
  }

  export type BillingRecordScalarWhereInput = {
    AND?: BillingRecordScalarWhereInput | BillingRecordScalarWhereInput[]
    OR?: BillingRecordScalarWhereInput[]
    NOT?: BillingRecordScalarWhereInput | BillingRecordScalarWhereInput[]
    id?: StringFilter<"BillingRecord"> | string
    instanceId?: StringFilter<"BillingRecord"> | string
    amount?: FloatFilter<"BillingRecord"> | number
    reason?: StringFilter<"BillingRecord"> | string
    createdAt?: DateTimeFilter<"BillingRecord"> | Date | string
  }

  export type ExecutionGraphUpsertWithWhereUniqueWithoutInstanceInput = {
    where: ExecutionGraphWhereUniqueInput
    update: XOR<ExecutionGraphUpdateWithoutInstanceInput, ExecutionGraphUncheckedUpdateWithoutInstanceInput>
    create: XOR<ExecutionGraphCreateWithoutInstanceInput, ExecutionGraphUncheckedCreateWithoutInstanceInput>
  }

  export type ExecutionGraphUpdateWithWhereUniqueWithoutInstanceInput = {
    where: ExecutionGraphWhereUniqueInput
    data: XOR<ExecutionGraphUpdateWithoutInstanceInput, ExecutionGraphUncheckedUpdateWithoutInstanceInput>
  }

  export type ExecutionGraphUpdateManyWithWhereWithoutInstanceInput = {
    where: ExecutionGraphScalarWhereInput
    data: XOR<ExecutionGraphUpdateManyMutationInput, ExecutionGraphUncheckedUpdateManyWithoutInstanceInput>
  }

  export type ExecutionGraphScalarWhereInput = {
    AND?: ExecutionGraphScalarWhereInput | ExecutionGraphScalarWhereInput[]
    OR?: ExecutionGraphScalarWhereInput[]
    NOT?: ExecutionGraphScalarWhereInput | ExecutionGraphScalarWhereInput[]
    id?: StringFilter<"ExecutionGraph"> | string
    instanceId?: StringFilter<"ExecutionGraph"> | string
    graph?: JsonFilter<"ExecutionGraph">
    createdAt?: DateTimeFilter<"ExecutionGraph"> | Date | string
  }

  export type InstanceCreateWithoutEnginesInput = {
    id?: string
    name: string
    ownerId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    status?: $Enums.InstanceStatus
    autoscale?: boolean
    cpuTier: CpuTierCreateNestedOneWithoutInstancesInput
    nodeTier: NodeTierCreateNestedOneWithoutInstancesInput
    engineTier: EngineTierCreateNestedOneWithoutInstancesInput
    qpuTier?: QpuTierCreateNestedOneWithoutInstancesInput
    omegaTier?: OmegaTierCreateNestedOneWithoutInstancesInput
    policy?: InstancePolicyCreateNestedOneWithoutInstanceInput
    terminalSessions?: TerminalSessionCreateNestedManyWithoutInstanceInput
    snapshots?: SnapshotCreateNestedManyWithoutInstanceInput
    logs?: InstanceLogCreateNestedManyWithoutInstanceInput
    billingRecords?: BillingRecordCreateNestedManyWithoutInstanceInput
    executionGraphs?: ExecutionGraphCreateNestedManyWithoutInstanceInput
  }

  export type InstanceUncheckedCreateWithoutEnginesInput = {
    id?: string
    name: string
    ownerId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    cpuTierId: string
    nodeTierId: string
    engineTierId: string
    qpuTierId?: string | null
    omegaTierId?: string | null
    status?: $Enums.InstanceStatus
    autoscale?: boolean
    policy?: InstancePolicyUncheckedCreateNestedOneWithoutInstanceInput
    terminalSessions?: TerminalSessionUncheckedCreateNestedManyWithoutInstanceInput
    snapshots?: SnapshotUncheckedCreateNestedManyWithoutInstanceInput
    logs?: InstanceLogUncheckedCreateNestedManyWithoutInstanceInput
    billingRecords?: BillingRecordUncheckedCreateNestedManyWithoutInstanceInput
    executionGraphs?: ExecutionGraphUncheckedCreateNestedManyWithoutInstanceInput
  }

  export type InstanceCreateOrConnectWithoutEnginesInput = {
    where: InstanceWhereUniqueInput
    create: XOR<InstanceCreateWithoutEnginesInput, InstanceUncheckedCreateWithoutEnginesInput>
  }

  export type InstanceUpsertWithoutEnginesInput = {
    update: XOR<InstanceUpdateWithoutEnginesInput, InstanceUncheckedUpdateWithoutEnginesInput>
    create: XOR<InstanceCreateWithoutEnginesInput, InstanceUncheckedCreateWithoutEnginesInput>
    where?: InstanceWhereInput
  }

  export type InstanceUpdateToOneWithWhereWithoutEnginesInput = {
    where?: InstanceWhereInput
    data: XOR<InstanceUpdateWithoutEnginesInput, InstanceUncheckedUpdateWithoutEnginesInput>
  }

  export type InstanceUpdateWithoutEnginesInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    ownerId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: EnumInstanceStatusFieldUpdateOperationsInput | $Enums.InstanceStatus
    autoscale?: BoolFieldUpdateOperationsInput | boolean
    cpuTier?: CpuTierUpdateOneRequiredWithoutInstancesNestedInput
    nodeTier?: NodeTierUpdateOneRequiredWithoutInstancesNestedInput
    engineTier?: EngineTierUpdateOneRequiredWithoutInstancesNestedInput
    qpuTier?: QpuTierUpdateOneWithoutInstancesNestedInput
    omegaTier?: OmegaTierUpdateOneWithoutInstancesNestedInput
    policy?: InstancePolicyUpdateOneWithoutInstanceNestedInput
    terminalSessions?: TerminalSessionUpdateManyWithoutInstanceNestedInput
    snapshots?: SnapshotUpdateManyWithoutInstanceNestedInput
    logs?: InstanceLogUpdateManyWithoutInstanceNestedInput
    billingRecords?: BillingRecordUpdateManyWithoutInstanceNestedInput
    executionGraphs?: ExecutionGraphUpdateManyWithoutInstanceNestedInput
  }

  export type InstanceUncheckedUpdateWithoutEnginesInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    ownerId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    cpuTierId?: StringFieldUpdateOperationsInput | string
    nodeTierId?: StringFieldUpdateOperationsInput | string
    engineTierId?: StringFieldUpdateOperationsInput | string
    qpuTierId?: NullableStringFieldUpdateOperationsInput | string | null
    omegaTierId?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumInstanceStatusFieldUpdateOperationsInput | $Enums.InstanceStatus
    autoscale?: BoolFieldUpdateOperationsInput | boolean
    policy?: InstancePolicyUncheckedUpdateOneWithoutInstanceNestedInput
    terminalSessions?: TerminalSessionUncheckedUpdateManyWithoutInstanceNestedInput
    snapshots?: SnapshotUncheckedUpdateManyWithoutInstanceNestedInput
    logs?: InstanceLogUncheckedUpdateManyWithoutInstanceNestedInput
    billingRecords?: BillingRecordUncheckedUpdateManyWithoutInstanceNestedInput
    executionGraphs?: ExecutionGraphUncheckedUpdateManyWithoutInstanceNestedInput
  }

  export type InstanceCreateWithoutPolicyInput = {
    id?: string
    name: string
    ownerId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    status?: $Enums.InstanceStatus
    autoscale?: boolean
    cpuTier: CpuTierCreateNestedOneWithoutInstancesInput
    nodeTier: NodeTierCreateNestedOneWithoutInstancesInput
    engineTier: EngineTierCreateNestedOneWithoutInstancesInput
    qpuTier?: QpuTierCreateNestedOneWithoutInstancesInput
    omegaTier?: OmegaTierCreateNestedOneWithoutInstancesInput
    engines?: InstanceEngineCreateNestedManyWithoutInstanceInput
    terminalSessions?: TerminalSessionCreateNestedManyWithoutInstanceInput
    snapshots?: SnapshotCreateNestedManyWithoutInstanceInput
    logs?: InstanceLogCreateNestedManyWithoutInstanceInput
    billingRecords?: BillingRecordCreateNestedManyWithoutInstanceInput
    executionGraphs?: ExecutionGraphCreateNestedManyWithoutInstanceInput
  }

  export type InstanceUncheckedCreateWithoutPolicyInput = {
    id?: string
    name: string
    ownerId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    cpuTierId: string
    nodeTierId: string
    engineTierId: string
    qpuTierId?: string | null
    omegaTierId?: string | null
    status?: $Enums.InstanceStatus
    autoscale?: boolean
    engines?: InstanceEngineUncheckedCreateNestedManyWithoutInstanceInput
    terminalSessions?: TerminalSessionUncheckedCreateNestedManyWithoutInstanceInput
    snapshots?: SnapshotUncheckedCreateNestedManyWithoutInstanceInput
    logs?: InstanceLogUncheckedCreateNestedManyWithoutInstanceInput
    billingRecords?: BillingRecordUncheckedCreateNestedManyWithoutInstanceInput
    executionGraphs?: ExecutionGraphUncheckedCreateNestedManyWithoutInstanceInput
  }

  export type InstanceCreateOrConnectWithoutPolicyInput = {
    where: InstanceWhereUniqueInput
    create: XOR<InstanceCreateWithoutPolicyInput, InstanceUncheckedCreateWithoutPolicyInput>
  }

  export type InstanceUpsertWithoutPolicyInput = {
    update: XOR<InstanceUpdateWithoutPolicyInput, InstanceUncheckedUpdateWithoutPolicyInput>
    create: XOR<InstanceCreateWithoutPolicyInput, InstanceUncheckedCreateWithoutPolicyInput>
    where?: InstanceWhereInput
  }

  export type InstanceUpdateToOneWithWhereWithoutPolicyInput = {
    where?: InstanceWhereInput
    data: XOR<InstanceUpdateWithoutPolicyInput, InstanceUncheckedUpdateWithoutPolicyInput>
  }

  export type InstanceUpdateWithoutPolicyInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    ownerId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: EnumInstanceStatusFieldUpdateOperationsInput | $Enums.InstanceStatus
    autoscale?: BoolFieldUpdateOperationsInput | boolean
    cpuTier?: CpuTierUpdateOneRequiredWithoutInstancesNestedInput
    nodeTier?: NodeTierUpdateOneRequiredWithoutInstancesNestedInput
    engineTier?: EngineTierUpdateOneRequiredWithoutInstancesNestedInput
    qpuTier?: QpuTierUpdateOneWithoutInstancesNestedInput
    omegaTier?: OmegaTierUpdateOneWithoutInstancesNestedInput
    engines?: InstanceEngineUpdateManyWithoutInstanceNestedInput
    terminalSessions?: TerminalSessionUpdateManyWithoutInstanceNestedInput
    snapshots?: SnapshotUpdateManyWithoutInstanceNestedInput
    logs?: InstanceLogUpdateManyWithoutInstanceNestedInput
    billingRecords?: BillingRecordUpdateManyWithoutInstanceNestedInput
    executionGraphs?: ExecutionGraphUpdateManyWithoutInstanceNestedInput
  }

  export type InstanceUncheckedUpdateWithoutPolicyInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    ownerId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    cpuTierId?: StringFieldUpdateOperationsInput | string
    nodeTierId?: StringFieldUpdateOperationsInput | string
    engineTierId?: StringFieldUpdateOperationsInput | string
    qpuTierId?: NullableStringFieldUpdateOperationsInput | string | null
    omegaTierId?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumInstanceStatusFieldUpdateOperationsInput | $Enums.InstanceStatus
    autoscale?: BoolFieldUpdateOperationsInput | boolean
    engines?: InstanceEngineUncheckedUpdateManyWithoutInstanceNestedInput
    terminalSessions?: TerminalSessionUncheckedUpdateManyWithoutInstanceNestedInput
    snapshots?: SnapshotUncheckedUpdateManyWithoutInstanceNestedInput
    logs?: InstanceLogUncheckedUpdateManyWithoutInstanceNestedInput
    billingRecords?: BillingRecordUncheckedUpdateManyWithoutInstanceNestedInput
    executionGraphs?: ExecutionGraphUncheckedUpdateManyWithoutInstanceNestedInput
  }

  export type InstanceCreateWithoutCpuTierInput = {
    id?: string
    name: string
    ownerId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    status?: $Enums.InstanceStatus
    autoscale?: boolean
    nodeTier: NodeTierCreateNestedOneWithoutInstancesInput
    engineTier: EngineTierCreateNestedOneWithoutInstancesInput
    qpuTier?: QpuTierCreateNestedOneWithoutInstancesInput
    omegaTier?: OmegaTierCreateNestedOneWithoutInstancesInput
    engines?: InstanceEngineCreateNestedManyWithoutInstanceInput
    policy?: InstancePolicyCreateNestedOneWithoutInstanceInput
    terminalSessions?: TerminalSessionCreateNestedManyWithoutInstanceInput
    snapshots?: SnapshotCreateNestedManyWithoutInstanceInput
    logs?: InstanceLogCreateNestedManyWithoutInstanceInput
    billingRecords?: BillingRecordCreateNestedManyWithoutInstanceInput
    executionGraphs?: ExecutionGraphCreateNestedManyWithoutInstanceInput
  }

  export type InstanceUncheckedCreateWithoutCpuTierInput = {
    id?: string
    name: string
    ownerId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    nodeTierId: string
    engineTierId: string
    qpuTierId?: string | null
    omegaTierId?: string | null
    status?: $Enums.InstanceStatus
    autoscale?: boolean
    engines?: InstanceEngineUncheckedCreateNestedManyWithoutInstanceInput
    policy?: InstancePolicyUncheckedCreateNestedOneWithoutInstanceInput
    terminalSessions?: TerminalSessionUncheckedCreateNestedManyWithoutInstanceInput
    snapshots?: SnapshotUncheckedCreateNestedManyWithoutInstanceInput
    logs?: InstanceLogUncheckedCreateNestedManyWithoutInstanceInput
    billingRecords?: BillingRecordUncheckedCreateNestedManyWithoutInstanceInput
    executionGraphs?: ExecutionGraphUncheckedCreateNestedManyWithoutInstanceInput
  }

  export type InstanceCreateOrConnectWithoutCpuTierInput = {
    where: InstanceWhereUniqueInput
    create: XOR<InstanceCreateWithoutCpuTierInput, InstanceUncheckedCreateWithoutCpuTierInput>
  }

  export type InstanceCreateManyCpuTierInputEnvelope = {
    data: InstanceCreateManyCpuTierInput | InstanceCreateManyCpuTierInput[]
    skipDuplicates?: boolean
  }

  export type InstanceUpsertWithWhereUniqueWithoutCpuTierInput = {
    where: InstanceWhereUniqueInput
    update: XOR<InstanceUpdateWithoutCpuTierInput, InstanceUncheckedUpdateWithoutCpuTierInput>
    create: XOR<InstanceCreateWithoutCpuTierInput, InstanceUncheckedCreateWithoutCpuTierInput>
  }

  export type InstanceUpdateWithWhereUniqueWithoutCpuTierInput = {
    where: InstanceWhereUniqueInput
    data: XOR<InstanceUpdateWithoutCpuTierInput, InstanceUncheckedUpdateWithoutCpuTierInput>
  }

  export type InstanceUpdateManyWithWhereWithoutCpuTierInput = {
    where: InstanceScalarWhereInput
    data: XOR<InstanceUpdateManyMutationInput, InstanceUncheckedUpdateManyWithoutCpuTierInput>
  }

  export type InstanceScalarWhereInput = {
    AND?: InstanceScalarWhereInput | InstanceScalarWhereInput[]
    OR?: InstanceScalarWhereInput[]
    NOT?: InstanceScalarWhereInput | InstanceScalarWhereInput[]
    id?: StringFilter<"Instance"> | string
    name?: StringFilter<"Instance"> | string
    ownerId?: StringFilter<"Instance"> | string
    createdAt?: DateTimeFilter<"Instance"> | Date | string
    updatedAt?: DateTimeFilter<"Instance"> | Date | string
    cpuTierId?: StringFilter<"Instance"> | string
    nodeTierId?: StringFilter<"Instance"> | string
    engineTierId?: StringFilter<"Instance"> | string
    qpuTierId?: StringNullableFilter<"Instance"> | string | null
    omegaTierId?: StringNullableFilter<"Instance"> | string | null
    status?: EnumInstanceStatusFilter<"Instance"> | $Enums.InstanceStatus
    autoscale?: BoolFilter<"Instance"> | boolean
  }

  export type InstanceCreateWithoutNodeTierInput = {
    id?: string
    name: string
    ownerId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    status?: $Enums.InstanceStatus
    autoscale?: boolean
    cpuTier: CpuTierCreateNestedOneWithoutInstancesInput
    engineTier: EngineTierCreateNestedOneWithoutInstancesInput
    qpuTier?: QpuTierCreateNestedOneWithoutInstancesInput
    omegaTier?: OmegaTierCreateNestedOneWithoutInstancesInput
    engines?: InstanceEngineCreateNestedManyWithoutInstanceInput
    policy?: InstancePolicyCreateNestedOneWithoutInstanceInput
    terminalSessions?: TerminalSessionCreateNestedManyWithoutInstanceInput
    snapshots?: SnapshotCreateNestedManyWithoutInstanceInput
    logs?: InstanceLogCreateNestedManyWithoutInstanceInput
    billingRecords?: BillingRecordCreateNestedManyWithoutInstanceInput
    executionGraphs?: ExecutionGraphCreateNestedManyWithoutInstanceInput
  }

  export type InstanceUncheckedCreateWithoutNodeTierInput = {
    id?: string
    name: string
    ownerId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    cpuTierId: string
    engineTierId: string
    qpuTierId?: string | null
    omegaTierId?: string | null
    status?: $Enums.InstanceStatus
    autoscale?: boolean
    engines?: InstanceEngineUncheckedCreateNestedManyWithoutInstanceInput
    policy?: InstancePolicyUncheckedCreateNestedOneWithoutInstanceInput
    terminalSessions?: TerminalSessionUncheckedCreateNestedManyWithoutInstanceInput
    snapshots?: SnapshotUncheckedCreateNestedManyWithoutInstanceInput
    logs?: InstanceLogUncheckedCreateNestedManyWithoutInstanceInput
    billingRecords?: BillingRecordUncheckedCreateNestedManyWithoutInstanceInput
    executionGraphs?: ExecutionGraphUncheckedCreateNestedManyWithoutInstanceInput
  }

  export type InstanceCreateOrConnectWithoutNodeTierInput = {
    where: InstanceWhereUniqueInput
    create: XOR<InstanceCreateWithoutNodeTierInput, InstanceUncheckedCreateWithoutNodeTierInput>
  }

  export type InstanceCreateManyNodeTierInputEnvelope = {
    data: InstanceCreateManyNodeTierInput | InstanceCreateManyNodeTierInput[]
    skipDuplicates?: boolean
  }

  export type InstanceUpsertWithWhereUniqueWithoutNodeTierInput = {
    where: InstanceWhereUniqueInput
    update: XOR<InstanceUpdateWithoutNodeTierInput, InstanceUncheckedUpdateWithoutNodeTierInput>
    create: XOR<InstanceCreateWithoutNodeTierInput, InstanceUncheckedCreateWithoutNodeTierInput>
  }

  export type InstanceUpdateWithWhereUniqueWithoutNodeTierInput = {
    where: InstanceWhereUniqueInput
    data: XOR<InstanceUpdateWithoutNodeTierInput, InstanceUncheckedUpdateWithoutNodeTierInput>
  }

  export type InstanceUpdateManyWithWhereWithoutNodeTierInput = {
    where: InstanceScalarWhereInput
    data: XOR<InstanceUpdateManyMutationInput, InstanceUncheckedUpdateManyWithoutNodeTierInput>
  }

  export type InstanceCreateWithoutEngineTierInput = {
    id?: string
    name: string
    ownerId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    status?: $Enums.InstanceStatus
    autoscale?: boolean
    cpuTier: CpuTierCreateNestedOneWithoutInstancesInput
    nodeTier: NodeTierCreateNestedOneWithoutInstancesInput
    qpuTier?: QpuTierCreateNestedOneWithoutInstancesInput
    omegaTier?: OmegaTierCreateNestedOneWithoutInstancesInput
    engines?: InstanceEngineCreateNestedManyWithoutInstanceInput
    policy?: InstancePolicyCreateNestedOneWithoutInstanceInput
    terminalSessions?: TerminalSessionCreateNestedManyWithoutInstanceInput
    snapshots?: SnapshotCreateNestedManyWithoutInstanceInput
    logs?: InstanceLogCreateNestedManyWithoutInstanceInput
    billingRecords?: BillingRecordCreateNestedManyWithoutInstanceInput
    executionGraphs?: ExecutionGraphCreateNestedManyWithoutInstanceInput
  }

  export type InstanceUncheckedCreateWithoutEngineTierInput = {
    id?: string
    name: string
    ownerId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    cpuTierId: string
    nodeTierId: string
    qpuTierId?: string | null
    omegaTierId?: string | null
    status?: $Enums.InstanceStatus
    autoscale?: boolean
    engines?: InstanceEngineUncheckedCreateNestedManyWithoutInstanceInput
    policy?: InstancePolicyUncheckedCreateNestedOneWithoutInstanceInput
    terminalSessions?: TerminalSessionUncheckedCreateNestedManyWithoutInstanceInput
    snapshots?: SnapshotUncheckedCreateNestedManyWithoutInstanceInput
    logs?: InstanceLogUncheckedCreateNestedManyWithoutInstanceInput
    billingRecords?: BillingRecordUncheckedCreateNestedManyWithoutInstanceInput
    executionGraphs?: ExecutionGraphUncheckedCreateNestedManyWithoutInstanceInput
  }

  export type InstanceCreateOrConnectWithoutEngineTierInput = {
    where: InstanceWhereUniqueInput
    create: XOR<InstanceCreateWithoutEngineTierInput, InstanceUncheckedCreateWithoutEngineTierInput>
  }

  export type InstanceCreateManyEngineTierInputEnvelope = {
    data: InstanceCreateManyEngineTierInput | InstanceCreateManyEngineTierInput[]
    skipDuplicates?: boolean
  }

  export type InstanceUpsertWithWhereUniqueWithoutEngineTierInput = {
    where: InstanceWhereUniqueInput
    update: XOR<InstanceUpdateWithoutEngineTierInput, InstanceUncheckedUpdateWithoutEngineTierInput>
    create: XOR<InstanceCreateWithoutEngineTierInput, InstanceUncheckedCreateWithoutEngineTierInput>
  }

  export type InstanceUpdateWithWhereUniqueWithoutEngineTierInput = {
    where: InstanceWhereUniqueInput
    data: XOR<InstanceUpdateWithoutEngineTierInput, InstanceUncheckedUpdateWithoutEngineTierInput>
  }

  export type InstanceUpdateManyWithWhereWithoutEngineTierInput = {
    where: InstanceScalarWhereInput
    data: XOR<InstanceUpdateManyMutationInput, InstanceUncheckedUpdateManyWithoutEngineTierInput>
  }

  export type InstanceCreateWithoutQpuTierInput = {
    id?: string
    name: string
    ownerId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    status?: $Enums.InstanceStatus
    autoscale?: boolean
    cpuTier: CpuTierCreateNestedOneWithoutInstancesInput
    nodeTier: NodeTierCreateNestedOneWithoutInstancesInput
    engineTier: EngineTierCreateNestedOneWithoutInstancesInput
    omegaTier?: OmegaTierCreateNestedOneWithoutInstancesInput
    engines?: InstanceEngineCreateNestedManyWithoutInstanceInput
    policy?: InstancePolicyCreateNestedOneWithoutInstanceInput
    terminalSessions?: TerminalSessionCreateNestedManyWithoutInstanceInput
    snapshots?: SnapshotCreateNestedManyWithoutInstanceInput
    logs?: InstanceLogCreateNestedManyWithoutInstanceInput
    billingRecords?: BillingRecordCreateNestedManyWithoutInstanceInput
    executionGraphs?: ExecutionGraphCreateNestedManyWithoutInstanceInput
  }

  export type InstanceUncheckedCreateWithoutQpuTierInput = {
    id?: string
    name: string
    ownerId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    cpuTierId: string
    nodeTierId: string
    engineTierId: string
    omegaTierId?: string | null
    status?: $Enums.InstanceStatus
    autoscale?: boolean
    engines?: InstanceEngineUncheckedCreateNestedManyWithoutInstanceInput
    policy?: InstancePolicyUncheckedCreateNestedOneWithoutInstanceInput
    terminalSessions?: TerminalSessionUncheckedCreateNestedManyWithoutInstanceInput
    snapshots?: SnapshotUncheckedCreateNestedManyWithoutInstanceInput
    logs?: InstanceLogUncheckedCreateNestedManyWithoutInstanceInput
    billingRecords?: BillingRecordUncheckedCreateNestedManyWithoutInstanceInput
    executionGraphs?: ExecutionGraphUncheckedCreateNestedManyWithoutInstanceInput
  }

  export type InstanceCreateOrConnectWithoutQpuTierInput = {
    where: InstanceWhereUniqueInput
    create: XOR<InstanceCreateWithoutQpuTierInput, InstanceUncheckedCreateWithoutQpuTierInput>
  }

  export type InstanceCreateManyQpuTierInputEnvelope = {
    data: InstanceCreateManyQpuTierInput | InstanceCreateManyQpuTierInput[]
    skipDuplicates?: boolean
  }

  export type InstanceUpsertWithWhereUniqueWithoutQpuTierInput = {
    where: InstanceWhereUniqueInput
    update: XOR<InstanceUpdateWithoutQpuTierInput, InstanceUncheckedUpdateWithoutQpuTierInput>
    create: XOR<InstanceCreateWithoutQpuTierInput, InstanceUncheckedCreateWithoutQpuTierInput>
  }

  export type InstanceUpdateWithWhereUniqueWithoutQpuTierInput = {
    where: InstanceWhereUniqueInput
    data: XOR<InstanceUpdateWithoutQpuTierInput, InstanceUncheckedUpdateWithoutQpuTierInput>
  }

  export type InstanceUpdateManyWithWhereWithoutQpuTierInput = {
    where: InstanceScalarWhereInput
    data: XOR<InstanceUpdateManyMutationInput, InstanceUncheckedUpdateManyWithoutQpuTierInput>
  }

  export type InstanceCreateWithoutOmegaTierInput = {
    id?: string
    name: string
    ownerId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    status?: $Enums.InstanceStatus
    autoscale?: boolean
    cpuTier: CpuTierCreateNestedOneWithoutInstancesInput
    nodeTier: NodeTierCreateNestedOneWithoutInstancesInput
    engineTier: EngineTierCreateNestedOneWithoutInstancesInput
    qpuTier?: QpuTierCreateNestedOneWithoutInstancesInput
    engines?: InstanceEngineCreateNestedManyWithoutInstanceInput
    policy?: InstancePolicyCreateNestedOneWithoutInstanceInput
    terminalSessions?: TerminalSessionCreateNestedManyWithoutInstanceInput
    snapshots?: SnapshotCreateNestedManyWithoutInstanceInput
    logs?: InstanceLogCreateNestedManyWithoutInstanceInput
    billingRecords?: BillingRecordCreateNestedManyWithoutInstanceInput
    executionGraphs?: ExecutionGraphCreateNestedManyWithoutInstanceInput
  }

  export type InstanceUncheckedCreateWithoutOmegaTierInput = {
    id?: string
    name: string
    ownerId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    cpuTierId: string
    nodeTierId: string
    engineTierId: string
    qpuTierId?: string | null
    status?: $Enums.InstanceStatus
    autoscale?: boolean
    engines?: InstanceEngineUncheckedCreateNestedManyWithoutInstanceInput
    policy?: InstancePolicyUncheckedCreateNestedOneWithoutInstanceInput
    terminalSessions?: TerminalSessionUncheckedCreateNestedManyWithoutInstanceInput
    snapshots?: SnapshotUncheckedCreateNestedManyWithoutInstanceInput
    logs?: InstanceLogUncheckedCreateNestedManyWithoutInstanceInput
    billingRecords?: BillingRecordUncheckedCreateNestedManyWithoutInstanceInput
    executionGraphs?: ExecutionGraphUncheckedCreateNestedManyWithoutInstanceInput
  }

  export type InstanceCreateOrConnectWithoutOmegaTierInput = {
    where: InstanceWhereUniqueInput
    create: XOR<InstanceCreateWithoutOmegaTierInput, InstanceUncheckedCreateWithoutOmegaTierInput>
  }

  export type InstanceCreateManyOmegaTierInputEnvelope = {
    data: InstanceCreateManyOmegaTierInput | InstanceCreateManyOmegaTierInput[]
    skipDuplicates?: boolean
  }

  export type InstanceUpsertWithWhereUniqueWithoutOmegaTierInput = {
    where: InstanceWhereUniqueInput
    update: XOR<InstanceUpdateWithoutOmegaTierInput, InstanceUncheckedUpdateWithoutOmegaTierInput>
    create: XOR<InstanceCreateWithoutOmegaTierInput, InstanceUncheckedCreateWithoutOmegaTierInput>
  }

  export type InstanceUpdateWithWhereUniqueWithoutOmegaTierInput = {
    where: InstanceWhereUniqueInput
    data: XOR<InstanceUpdateWithoutOmegaTierInput, InstanceUncheckedUpdateWithoutOmegaTierInput>
  }

  export type InstanceUpdateManyWithWhereWithoutOmegaTierInput = {
    where: InstanceScalarWhereInput
    data: XOR<InstanceUpdateManyMutationInput, InstanceUncheckedUpdateManyWithoutOmegaTierInput>
  }

  export type InstanceCreateWithoutSnapshotsInput = {
    id?: string
    name: string
    ownerId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    status?: $Enums.InstanceStatus
    autoscale?: boolean
    cpuTier: CpuTierCreateNestedOneWithoutInstancesInput
    nodeTier: NodeTierCreateNestedOneWithoutInstancesInput
    engineTier: EngineTierCreateNestedOneWithoutInstancesInput
    qpuTier?: QpuTierCreateNestedOneWithoutInstancesInput
    omegaTier?: OmegaTierCreateNestedOneWithoutInstancesInput
    engines?: InstanceEngineCreateNestedManyWithoutInstanceInput
    policy?: InstancePolicyCreateNestedOneWithoutInstanceInput
    terminalSessions?: TerminalSessionCreateNestedManyWithoutInstanceInput
    logs?: InstanceLogCreateNestedManyWithoutInstanceInput
    billingRecords?: BillingRecordCreateNestedManyWithoutInstanceInput
    executionGraphs?: ExecutionGraphCreateNestedManyWithoutInstanceInput
  }

  export type InstanceUncheckedCreateWithoutSnapshotsInput = {
    id?: string
    name: string
    ownerId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    cpuTierId: string
    nodeTierId: string
    engineTierId: string
    qpuTierId?: string | null
    omegaTierId?: string | null
    status?: $Enums.InstanceStatus
    autoscale?: boolean
    engines?: InstanceEngineUncheckedCreateNestedManyWithoutInstanceInput
    policy?: InstancePolicyUncheckedCreateNestedOneWithoutInstanceInput
    terminalSessions?: TerminalSessionUncheckedCreateNestedManyWithoutInstanceInput
    logs?: InstanceLogUncheckedCreateNestedManyWithoutInstanceInput
    billingRecords?: BillingRecordUncheckedCreateNestedManyWithoutInstanceInput
    executionGraphs?: ExecutionGraphUncheckedCreateNestedManyWithoutInstanceInput
  }

  export type InstanceCreateOrConnectWithoutSnapshotsInput = {
    where: InstanceWhereUniqueInput
    create: XOR<InstanceCreateWithoutSnapshotsInput, InstanceUncheckedCreateWithoutSnapshotsInput>
  }

  export type InstanceUpsertWithoutSnapshotsInput = {
    update: XOR<InstanceUpdateWithoutSnapshotsInput, InstanceUncheckedUpdateWithoutSnapshotsInput>
    create: XOR<InstanceCreateWithoutSnapshotsInput, InstanceUncheckedCreateWithoutSnapshotsInput>
    where?: InstanceWhereInput
  }

  export type InstanceUpdateToOneWithWhereWithoutSnapshotsInput = {
    where?: InstanceWhereInput
    data: XOR<InstanceUpdateWithoutSnapshotsInput, InstanceUncheckedUpdateWithoutSnapshotsInput>
  }

  export type InstanceUpdateWithoutSnapshotsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    ownerId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: EnumInstanceStatusFieldUpdateOperationsInput | $Enums.InstanceStatus
    autoscale?: BoolFieldUpdateOperationsInput | boolean
    cpuTier?: CpuTierUpdateOneRequiredWithoutInstancesNestedInput
    nodeTier?: NodeTierUpdateOneRequiredWithoutInstancesNestedInput
    engineTier?: EngineTierUpdateOneRequiredWithoutInstancesNestedInput
    qpuTier?: QpuTierUpdateOneWithoutInstancesNestedInput
    omegaTier?: OmegaTierUpdateOneWithoutInstancesNestedInput
    engines?: InstanceEngineUpdateManyWithoutInstanceNestedInput
    policy?: InstancePolicyUpdateOneWithoutInstanceNestedInput
    terminalSessions?: TerminalSessionUpdateManyWithoutInstanceNestedInput
    logs?: InstanceLogUpdateManyWithoutInstanceNestedInput
    billingRecords?: BillingRecordUpdateManyWithoutInstanceNestedInput
    executionGraphs?: ExecutionGraphUpdateManyWithoutInstanceNestedInput
  }

  export type InstanceUncheckedUpdateWithoutSnapshotsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    ownerId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    cpuTierId?: StringFieldUpdateOperationsInput | string
    nodeTierId?: StringFieldUpdateOperationsInput | string
    engineTierId?: StringFieldUpdateOperationsInput | string
    qpuTierId?: NullableStringFieldUpdateOperationsInput | string | null
    omegaTierId?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumInstanceStatusFieldUpdateOperationsInput | $Enums.InstanceStatus
    autoscale?: BoolFieldUpdateOperationsInput | boolean
    engines?: InstanceEngineUncheckedUpdateManyWithoutInstanceNestedInput
    policy?: InstancePolicyUncheckedUpdateOneWithoutInstanceNestedInput
    terminalSessions?: TerminalSessionUncheckedUpdateManyWithoutInstanceNestedInput
    logs?: InstanceLogUncheckedUpdateManyWithoutInstanceNestedInput
    billingRecords?: BillingRecordUncheckedUpdateManyWithoutInstanceNestedInput
    executionGraphs?: ExecutionGraphUncheckedUpdateManyWithoutInstanceNestedInput
  }

  export type InstanceCreateWithoutLogsInput = {
    id?: string
    name: string
    ownerId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    status?: $Enums.InstanceStatus
    autoscale?: boolean
    cpuTier: CpuTierCreateNestedOneWithoutInstancesInput
    nodeTier: NodeTierCreateNestedOneWithoutInstancesInput
    engineTier: EngineTierCreateNestedOneWithoutInstancesInput
    qpuTier?: QpuTierCreateNestedOneWithoutInstancesInput
    omegaTier?: OmegaTierCreateNestedOneWithoutInstancesInput
    engines?: InstanceEngineCreateNestedManyWithoutInstanceInput
    policy?: InstancePolicyCreateNestedOneWithoutInstanceInput
    terminalSessions?: TerminalSessionCreateNestedManyWithoutInstanceInput
    snapshots?: SnapshotCreateNestedManyWithoutInstanceInput
    billingRecords?: BillingRecordCreateNestedManyWithoutInstanceInput
    executionGraphs?: ExecutionGraphCreateNestedManyWithoutInstanceInput
  }

  export type InstanceUncheckedCreateWithoutLogsInput = {
    id?: string
    name: string
    ownerId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    cpuTierId: string
    nodeTierId: string
    engineTierId: string
    qpuTierId?: string | null
    omegaTierId?: string | null
    status?: $Enums.InstanceStatus
    autoscale?: boolean
    engines?: InstanceEngineUncheckedCreateNestedManyWithoutInstanceInput
    policy?: InstancePolicyUncheckedCreateNestedOneWithoutInstanceInput
    terminalSessions?: TerminalSessionUncheckedCreateNestedManyWithoutInstanceInput
    snapshots?: SnapshotUncheckedCreateNestedManyWithoutInstanceInput
    billingRecords?: BillingRecordUncheckedCreateNestedManyWithoutInstanceInput
    executionGraphs?: ExecutionGraphUncheckedCreateNestedManyWithoutInstanceInput
  }

  export type InstanceCreateOrConnectWithoutLogsInput = {
    where: InstanceWhereUniqueInput
    create: XOR<InstanceCreateWithoutLogsInput, InstanceUncheckedCreateWithoutLogsInput>
  }

  export type InstanceUpsertWithoutLogsInput = {
    update: XOR<InstanceUpdateWithoutLogsInput, InstanceUncheckedUpdateWithoutLogsInput>
    create: XOR<InstanceCreateWithoutLogsInput, InstanceUncheckedCreateWithoutLogsInput>
    where?: InstanceWhereInput
  }

  export type InstanceUpdateToOneWithWhereWithoutLogsInput = {
    where?: InstanceWhereInput
    data: XOR<InstanceUpdateWithoutLogsInput, InstanceUncheckedUpdateWithoutLogsInput>
  }

  export type InstanceUpdateWithoutLogsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    ownerId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: EnumInstanceStatusFieldUpdateOperationsInput | $Enums.InstanceStatus
    autoscale?: BoolFieldUpdateOperationsInput | boolean
    cpuTier?: CpuTierUpdateOneRequiredWithoutInstancesNestedInput
    nodeTier?: NodeTierUpdateOneRequiredWithoutInstancesNestedInput
    engineTier?: EngineTierUpdateOneRequiredWithoutInstancesNestedInput
    qpuTier?: QpuTierUpdateOneWithoutInstancesNestedInput
    omegaTier?: OmegaTierUpdateOneWithoutInstancesNestedInput
    engines?: InstanceEngineUpdateManyWithoutInstanceNestedInput
    policy?: InstancePolicyUpdateOneWithoutInstanceNestedInput
    terminalSessions?: TerminalSessionUpdateManyWithoutInstanceNestedInput
    snapshots?: SnapshotUpdateManyWithoutInstanceNestedInput
    billingRecords?: BillingRecordUpdateManyWithoutInstanceNestedInput
    executionGraphs?: ExecutionGraphUpdateManyWithoutInstanceNestedInput
  }

  export type InstanceUncheckedUpdateWithoutLogsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    ownerId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    cpuTierId?: StringFieldUpdateOperationsInput | string
    nodeTierId?: StringFieldUpdateOperationsInput | string
    engineTierId?: StringFieldUpdateOperationsInput | string
    qpuTierId?: NullableStringFieldUpdateOperationsInput | string | null
    omegaTierId?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumInstanceStatusFieldUpdateOperationsInput | $Enums.InstanceStatus
    autoscale?: BoolFieldUpdateOperationsInput | boolean
    engines?: InstanceEngineUncheckedUpdateManyWithoutInstanceNestedInput
    policy?: InstancePolicyUncheckedUpdateOneWithoutInstanceNestedInput
    terminalSessions?: TerminalSessionUncheckedUpdateManyWithoutInstanceNestedInput
    snapshots?: SnapshotUncheckedUpdateManyWithoutInstanceNestedInput
    billingRecords?: BillingRecordUncheckedUpdateManyWithoutInstanceNestedInput
    executionGraphs?: ExecutionGraphUncheckedUpdateManyWithoutInstanceNestedInput
  }

  export type InstanceCreateWithoutBillingRecordsInput = {
    id?: string
    name: string
    ownerId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    status?: $Enums.InstanceStatus
    autoscale?: boolean
    cpuTier: CpuTierCreateNestedOneWithoutInstancesInput
    nodeTier: NodeTierCreateNestedOneWithoutInstancesInput
    engineTier: EngineTierCreateNestedOneWithoutInstancesInput
    qpuTier?: QpuTierCreateNestedOneWithoutInstancesInput
    omegaTier?: OmegaTierCreateNestedOneWithoutInstancesInput
    engines?: InstanceEngineCreateNestedManyWithoutInstanceInput
    policy?: InstancePolicyCreateNestedOneWithoutInstanceInput
    terminalSessions?: TerminalSessionCreateNestedManyWithoutInstanceInput
    snapshots?: SnapshotCreateNestedManyWithoutInstanceInput
    logs?: InstanceLogCreateNestedManyWithoutInstanceInput
    executionGraphs?: ExecutionGraphCreateNestedManyWithoutInstanceInput
  }

  export type InstanceUncheckedCreateWithoutBillingRecordsInput = {
    id?: string
    name: string
    ownerId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    cpuTierId: string
    nodeTierId: string
    engineTierId: string
    qpuTierId?: string | null
    omegaTierId?: string | null
    status?: $Enums.InstanceStatus
    autoscale?: boolean
    engines?: InstanceEngineUncheckedCreateNestedManyWithoutInstanceInput
    policy?: InstancePolicyUncheckedCreateNestedOneWithoutInstanceInput
    terminalSessions?: TerminalSessionUncheckedCreateNestedManyWithoutInstanceInput
    snapshots?: SnapshotUncheckedCreateNestedManyWithoutInstanceInput
    logs?: InstanceLogUncheckedCreateNestedManyWithoutInstanceInput
    executionGraphs?: ExecutionGraphUncheckedCreateNestedManyWithoutInstanceInput
  }

  export type InstanceCreateOrConnectWithoutBillingRecordsInput = {
    where: InstanceWhereUniqueInput
    create: XOR<InstanceCreateWithoutBillingRecordsInput, InstanceUncheckedCreateWithoutBillingRecordsInput>
  }

  export type InstanceUpsertWithoutBillingRecordsInput = {
    update: XOR<InstanceUpdateWithoutBillingRecordsInput, InstanceUncheckedUpdateWithoutBillingRecordsInput>
    create: XOR<InstanceCreateWithoutBillingRecordsInput, InstanceUncheckedCreateWithoutBillingRecordsInput>
    where?: InstanceWhereInput
  }

  export type InstanceUpdateToOneWithWhereWithoutBillingRecordsInput = {
    where?: InstanceWhereInput
    data: XOR<InstanceUpdateWithoutBillingRecordsInput, InstanceUncheckedUpdateWithoutBillingRecordsInput>
  }

  export type InstanceUpdateWithoutBillingRecordsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    ownerId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: EnumInstanceStatusFieldUpdateOperationsInput | $Enums.InstanceStatus
    autoscale?: BoolFieldUpdateOperationsInput | boolean
    cpuTier?: CpuTierUpdateOneRequiredWithoutInstancesNestedInput
    nodeTier?: NodeTierUpdateOneRequiredWithoutInstancesNestedInput
    engineTier?: EngineTierUpdateOneRequiredWithoutInstancesNestedInput
    qpuTier?: QpuTierUpdateOneWithoutInstancesNestedInput
    omegaTier?: OmegaTierUpdateOneWithoutInstancesNestedInput
    engines?: InstanceEngineUpdateManyWithoutInstanceNestedInput
    policy?: InstancePolicyUpdateOneWithoutInstanceNestedInput
    terminalSessions?: TerminalSessionUpdateManyWithoutInstanceNestedInput
    snapshots?: SnapshotUpdateManyWithoutInstanceNestedInput
    logs?: InstanceLogUpdateManyWithoutInstanceNestedInput
    executionGraphs?: ExecutionGraphUpdateManyWithoutInstanceNestedInput
  }

  export type InstanceUncheckedUpdateWithoutBillingRecordsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    ownerId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    cpuTierId?: StringFieldUpdateOperationsInput | string
    nodeTierId?: StringFieldUpdateOperationsInput | string
    engineTierId?: StringFieldUpdateOperationsInput | string
    qpuTierId?: NullableStringFieldUpdateOperationsInput | string | null
    omegaTierId?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumInstanceStatusFieldUpdateOperationsInput | $Enums.InstanceStatus
    autoscale?: BoolFieldUpdateOperationsInput | boolean
    engines?: InstanceEngineUncheckedUpdateManyWithoutInstanceNestedInput
    policy?: InstancePolicyUncheckedUpdateOneWithoutInstanceNestedInput
    terminalSessions?: TerminalSessionUncheckedUpdateManyWithoutInstanceNestedInput
    snapshots?: SnapshotUncheckedUpdateManyWithoutInstanceNestedInput
    logs?: InstanceLogUncheckedUpdateManyWithoutInstanceNestedInput
    executionGraphs?: ExecutionGraphUncheckedUpdateManyWithoutInstanceNestedInput
  }

  export type InstanceCreateWithoutExecutionGraphsInput = {
    id?: string
    name: string
    ownerId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    status?: $Enums.InstanceStatus
    autoscale?: boolean
    cpuTier: CpuTierCreateNestedOneWithoutInstancesInput
    nodeTier: NodeTierCreateNestedOneWithoutInstancesInput
    engineTier: EngineTierCreateNestedOneWithoutInstancesInput
    qpuTier?: QpuTierCreateNestedOneWithoutInstancesInput
    omegaTier?: OmegaTierCreateNestedOneWithoutInstancesInput
    engines?: InstanceEngineCreateNestedManyWithoutInstanceInput
    policy?: InstancePolicyCreateNestedOneWithoutInstanceInput
    terminalSessions?: TerminalSessionCreateNestedManyWithoutInstanceInput
    snapshots?: SnapshotCreateNestedManyWithoutInstanceInput
    logs?: InstanceLogCreateNestedManyWithoutInstanceInput
    billingRecords?: BillingRecordCreateNestedManyWithoutInstanceInput
  }

  export type InstanceUncheckedCreateWithoutExecutionGraphsInput = {
    id?: string
    name: string
    ownerId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    cpuTierId: string
    nodeTierId: string
    engineTierId: string
    qpuTierId?: string | null
    omegaTierId?: string | null
    status?: $Enums.InstanceStatus
    autoscale?: boolean
    engines?: InstanceEngineUncheckedCreateNestedManyWithoutInstanceInput
    policy?: InstancePolicyUncheckedCreateNestedOneWithoutInstanceInput
    terminalSessions?: TerminalSessionUncheckedCreateNestedManyWithoutInstanceInput
    snapshots?: SnapshotUncheckedCreateNestedManyWithoutInstanceInput
    logs?: InstanceLogUncheckedCreateNestedManyWithoutInstanceInput
    billingRecords?: BillingRecordUncheckedCreateNestedManyWithoutInstanceInput
  }

  export type InstanceCreateOrConnectWithoutExecutionGraphsInput = {
    where: InstanceWhereUniqueInput
    create: XOR<InstanceCreateWithoutExecutionGraphsInput, InstanceUncheckedCreateWithoutExecutionGraphsInput>
  }

  export type InstanceUpsertWithoutExecutionGraphsInput = {
    update: XOR<InstanceUpdateWithoutExecutionGraphsInput, InstanceUncheckedUpdateWithoutExecutionGraphsInput>
    create: XOR<InstanceCreateWithoutExecutionGraphsInput, InstanceUncheckedCreateWithoutExecutionGraphsInput>
    where?: InstanceWhereInput
  }

  export type InstanceUpdateToOneWithWhereWithoutExecutionGraphsInput = {
    where?: InstanceWhereInput
    data: XOR<InstanceUpdateWithoutExecutionGraphsInput, InstanceUncheckedUpdateWithoutExecutionGraphsInput>
  }

  export type InstanceUpdateWithoutExecutionGraphsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    ownerId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: EnumInstanceStatusFieldUpdateOperationsInput | $Enums.InstanceStatus
    autoscale?: BoolFieldUpdateOperationsInput | boolean
    cpuTier?: CpuTierUpdateOneRequiredWithoutInstancesNestedInput
    nodeTier?: NodeTierUpdateOneRequiredWithoutInstancesNestedInput
    engineTier?: EngineTierUpdateOneRequiredWithoutInstancesNestedInput
    qpuTier?: QpuTierUpdateOneWithoutInstancesNestedInput
    omegaTier?: OmegaTierUpdateOneWithoutInstancesNestedInput
    engines?: InstanceEngineUpdateManyWithoutInstanceNestedInput
    policy?: InstancePolicyUpdateOneWithoutInstanceNestedInput
    terminalSessions?: TerminalSessionUpdateManyWithoutInstanceNestedInput
    snapshots?: SnapshotUpdateManyWithoutInstanceNestedInput
    logs?: InstanceLogUpdateManyWithoutInstanceNestedInput
    billingRecords?: BillingRecordUpdateManyWithoutInstanceNestedInput
  }

  export type InstanceUncheckedUpdateWithoutExecutionGraphsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    ownerId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    cpuTierId?: StringFieldUpdateOperationsInput | string
    nodeTierId?: StringFieldUpdateOperationsInput | string
    engineTierId?: StringFieldUpdateOperationsInput | string
    qpuTierId?: NullableStringFieldUpdateOperationsInput | string | null
    omegaTierId?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumInstanceStatusFieldUpdateOperationsInput | $Enums.InstanceStatus
    autoscale?: BoolFieldUpdateOperationsInput | boolean
    engines?: InstanceEngineUncheckedUpdateManyWithoutInstanceNestedInput
    policy?: InstancePolicyUncheckedUpdateOneWithoutInstanceNestedInput
    terminalSessions?: TerminalSessionUncheckedUpdateManyWithoutInstanceNestedInput
    snapshots?: SnapshotUncheckedUpdateManyWithoutInstanceNestedInput
    logs?: InstanceLogUncheckedUpdateManyWithoutInstanceNestedInput
    billingRecords?: BillingRecordUncheckedUpdateManyWithoutInstanceNestedInput
  }

  export type InstanceCreateWithoutTerminalSessionsInput = {
    id?: string
    name: string
    ownerId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    status?: $Enums.InstanceStatus
    autoscale?: boolean
    cpuTier: CpuTierCreateNestedOneWithoutInstancesInput
    nodeTier: NodeTierCreateNestedOneWithoutInstancesInput
    engineTier: EngineTierCreateNestedOneWithoutInstancesInput
    qpuTier?: QpuTierCreateNestedOneWithoutInstancesInput
    omegaTier?: OmegaTierCreateNestedOneWithoutInstancesInput
    engines?: InstanceEngineCreateNestedManyWithoutInstanceInput
    policy?: InstancePolicyCreateNestedOneWithoutInstanceInput
    snapshots?: SnapshotCreateNestedManyWithoutInstanceInput
    logs?: InstanceLogCreateNestedManyWithoutInstanceInput
    billingRecords?: BillingRecordCreateNestedManyWithoutInstanceInput
    executionGraphs?: ExecutionGraphCreateNestedManyWithoutInstanceInput
  }

  export type InstanceUncheckedCreateWithoutTerminalSessionsInput = {
    id?: string
    name: string
    ownerId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    cpuTierId: string
    nodeTierId: string
    engineTierId: string
    qpuTierId?: string | null
    omegaTierId?: string | null
    status?: $Enums.InstanceStatus
    autoscale?: boolean
    engines?: InstanceEngineUncheckedCreateNestedManyWithoutInstanceInput
    policy?: InstancePolicyUncheckedCreateNestedOneWithoutInstanceInput
    snapshots?: SnapshotUncheckedCreateNestedManyWithoutInstanceInput
    logs?: InstanceLogUncheckedCreateNestedManyWithoutInstanceInput
    billingRecords?: BillingRecordUncheckedCreateNestedManyWithoutInstanceInput
    executionGraphs?: ExecutionGraphUncheckedCreateNestedManyWithoutInstanceInput
  }

  export type InstanceCreateOrConnectWithoutTerminalSessionsInput = {
    where: InstanceWhereUniqueInput
    create: XOR<InstanceCreateWithoutTerminalSessionsInput, InstanceUncheckedCreateWithoutTerminalSessionsInput>
  }

  export type InstanceUpsertWithoutTerminalSessionsInput = {
    update: XOR<InstanceUpdateWithoutTerminalSessionsInput, InstanceUncheckedUpdateWithoutTerminalSessionsInput>
    create: XOR<InstanceCreateWithoutTerminalSessionsInput, InstanceUncheckedCreateWithoutTerminalSessionsInput>
    where?: InstanceWhereInput
  }

  export type InstanceUpdateToOneWithWhereWithoutTerminalSessionsInput = {
    where?: InstanceWhereInput
    data: XOR<InstanceUpdateWithoutTerminalSessionsInput, InstanceUncheckedUpdateWithoutTerminalSessionsInput>
  }

  export type InstanceUpdateWithoutTerminalSessionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    ownerId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: EnumInstanceStatusFieldUpdateOperationsInput | $Enums.InstanceStatus
    autoscale?: BoolFieldUpdateOperationsInput | boolean
    cpuTier?: CpuTierUpdateOneRequiredWithoutInstancesNestedInput
    nodeTier?: NodeTierUpdateOneRequiredWithoutInstancesNestedInput
    engineTier?: EngineTierUpdateOneRequiredWithoutInstancesNestedInput
    qpuTier?: QpuTierUpdateOneWithoutInstancesNestedInput
    omegaTier?: OmegaTierUpdateOneWithoutInstancesNestedInput
    engines?: InstanceEngineUpdateManyWithoutInstanceNestedInput
    policy?: InstancePolicyUpdateOneWithoutInstanceNestedInput
    snapshots?: SnapshotUpdateManyWithoutInstanceNestedInput
    logs?: InstanceLogUpdateManyWithoutInstanceNestedInput
    billingRecords?: BillingRecordUpdateManyWithoutInstanceNestedInput
    executionGraphs?: ExecutionGraphUpdateManyWithoutInstanceNestedInput
  }

  export type InstanceUncheckedUpdateWithoutTerminalSessionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    ownerId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    cpuTierId?: StringFieldUpdateOperationsInput | string
    nodeTierId?: StringFieldUpdateOperationsInput | string
    engineTierId?: StringFieldUpdateOperationsInput | string
    qpuTierId?: NullableStringFieldUpdateOperationsInput | string | null
    omegaTierId?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumInstanceStatusFieldUpdateOperationsInput | $Enums.InstanceStatus
    autoscale?: BoolFieldUpdateOperationsInput | boolean
    engines?: InstanceEngineUncheckedUpdateManyWithoutInstanceNestedInput
    policy?: InstancePolicyUncheckedUpdateOneWithoutInstanceNestedInput
    snapshots?: SnapshotUncheckedUpdateManyWithoutInstanceNestedInput
    logs?: InstanceLogUncheckedUpdateManyWithoutInstanceNestedInput
    billingRecords?: BillingRecordUncheckedUpdateManyWithoutInstanceNestedInput
    executionGraphs?: ExecutionGraphUncheckedUpdateManyWithoutInstanceNestedInput
  }

  export type InstanceEngineCreateManyInstanceInput = {
    id?: string
    engineType: $Enums.EngineType
    enabled?: boolean
    defaultModel: string
    allowedModels: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type TerminalSessionCreateManyInstanceInput = {
    id?: string
    token: string
    userId: string
    scope: string
    issuedAt?: Date | string
    expiresAt: Date | string
    revokedAt?: Date | string | null
    lastVerifiedAt?: Date | string | null
  }

  export type SnapshotCreateManyInstanceInput = {
    id?: string
    metadata: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type InstanceLogCreateManyInstanceInput = {
    id?: string
    event: string
    detail: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type BillingRecordCreateManyInstanceInput = {
    id?: string
    amount: number
    reason: string
    createdAt?: Date | string
  }

  export type ExecutionGraphCreateManyInstanceInput = {
    id?: string
    graph: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type InstanceEngineUpdateWithoutInstanceInput = {
    id?: StringFieldUpdateOperationsInput | string
    engineType?: EnumEngineTypeFieldUpdateOperationsInput | $Enums.EngineType
    enabled?: BoolFieldUpdateOperationsInput | boolean
    defaultModel?: StringFieldUpdateOperationsInput | string
    allowedModels?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type InstanceEngineUncheckedUpdateWithoutInstanceInput = {
    id?: StringFieldUpdateOperationsInput | string
    engineType?: EnumEngineTypeFieldUpdateOperationsInput | $Enums.EngineType
    enabled?: BoolFieldUpdateOperationsInput | boolean
    defaultModel?: StringFieldUpdateOperationsInput | string
    allowedModels?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type InstanceEngineUncheckedUpdateManyWithoutInstanceInput = {
    id?: StringFieldUpdateOperationsInput | string
    engineType?: EnumEngineTypeFieldUpdateOperationsInput | $Enums.EngineType
    enabled?: BoolFieldUpdateOperationsInput | boolean
    defaultModel?: StringFieldUpdateOperationsInput | string
    allowedModels?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TerminalSessionUpdateWithoutInstanceInput = {
    id?: StringFieldUpdateOperationsInput | string
    token?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    scope?: StringFieldUpdateOperationsInput | string
    issuedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    revokedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastVerifiedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type TerminalSessionUncheckedUpdateWithoutInstanceInput = {
    id?: StringFieldUpdateOperationsInput | string
    token?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    scope?: StringFieldUpdateOperationsInput | string
    issuedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    revokedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastVerifiedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type TerminalSessionUncheckedUpdateManyWithoutInstanceInput = {
    id?: StringFieldUpdateOperationsInput | string
    token?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    scope?: StringFieldUpdateOperationsInput | string
    issuedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    revokedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastVerifiedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type SnapshotUpdateWithoutInstanceInput = {
    id?: StringFieldUpdateOperationsInput | string
    metadata?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SnapshotUncheckedUpdateWithoutInstanceInput = {
    id?: StringFieldUpdateOperationsInput | string
    metadata?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SnapshotUncheckedUpdateManyWithoutInstanceInput = {
    id?: StringFieldUpdateOperationsInput | string
    metadata?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type InstanceLogUpdateWithoutInstanceInput = {
    id?: StringFieldUpdateOperationsInput | string
    event?: StringFieldUpdateOperationsInput | string
    detail?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type InstanceLogUncheckedUpdateWithoutInstanceInput = {
    id?: StringFieldUpdateOperationsInput | string
    event?: StringFieldUpdateOperationsInput | string
    detail?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type InstanceLogUncheckedUpdateManyWithoutInstanceInput = {
    id?: StringFieldUpdateOperationsInput | string
    event?: StringFieldUpdateOperationsInput | string
    detail?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BillingRecordUpdateWithoutInstanceInput = {
    id?: StringFieldUpdateOperationsInput | string
    amount?: FloatFieldUpdateOperationsInput | number
    reason?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BillingRecordUncheckedUpdateWithoutInstanceInput = {
    id?: StringFieldUpdateOperationsInput | string
    amount?: FloatFieldUpdateOperationsInput | number
    reason?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BillingRecordUncheckedUpdateManyWithoutInstanceInput = {
    id?: StringFieldUpdateOperationsInput | string
    amount?: FloatFieldUpdateOperationsInput | number
    reason?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ExecutionGraphUpdateWithoutInstanceInput = {
    id?: StringFieldUpdateOperationsInput | string
    graph?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ExecutionGraphUncheckedUpdateWithoutInstanceInput = {
    id?: StringFieldUpdateOperationsInput | string
    graph?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ExecutionGraphUncheckedUpdateManyWithoutInstanceInput = {
    id?: StringFieldUpdateOperationsInput | string
    graph?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type InstanceCreateManyCpuTierInput = {
    id?: string
    name: string
    ownerId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    nodeTierId: string
    engineTierId: string
    qpuTierId?: string | null
    omegaTierId?: string | null
    status?: $Enums.InstanceStatus
    autoscale?: boolean
  }

  export type InstanceUpdateWithoutCpuTierInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    ownerId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: EnumInstanceStatusFieldUpdateOperationsInput | $Enums.InstanceStatus
    autoscale?: BoolFieldUpdateOperationsInput | boolean
    nodeTier?: NodeTierUpdateOneRequiredWithoutInstancesNestedInput
    engineTier?: EngineTierUpdateOneRequiredWithoutInstancesNestedInput
    qpuTier?: QpuTierUpdateOneWithoutInstancesNestedInput
    omegaTier?: OmegaTierUpdateOneWithoutInstancesNestedInput
    engines?: InstanceEngineUpdateManyWithoutInstanceNestedInput
    policy?: InstancePolicyUpdateOneWithoutInstanceNestedInput
    terminalSessions?: TerminalSessionUpdateManyWithoutInstanceNestedInput
    snapshots?: SnapshotUpdateManyWithoutInstanceNestedInput
    logs?: InstanceLogUpdateManyWithoutInstanceNestedInput
    billingRecords?: BillingRecordUpdateManyWithoutInstanceNestedInput
    executionGraphs?: ExecutionGraphUpdateManyWithoutInstanceNestedInput
  }

  export type InstanceUncheckedUpdateWithoutCpuTierInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    ownerId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    nodeTierId?: StringFieldUpdateOperationsInput | string
    engineTierId?: StringFieldUpdateOperationsInput | string
    qpuTierId?: NullableStringFieldUpdateOperationsInput | string | null
    omegaTierId?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumInstanceStatusFieldUpdateOperationsInput | $Enums.InstanceStatus
    autoscale?: BoolFieldUpdateOperationsInput | boolean
    engines?: InstanceEngineUncheckedUpdateManyWithoutInstanceNestedInput
    policy?: InstancePolicyUncheckedUpdateOneWithoutInstanceNestedInput
    terminalSessions?: TerminalSessionUncheckedUpdateManyWithoutInstanceNestedInput
    snapshots?: SnapshotUncheckedUpdateManyWithoutInstanceNestedInput
    logs?: InstanceLogUncheckedUpdateManyWithoutInstanceNestedInput
    billingRecords?: BillingRecordUncheckedUpdateManyWithoutInstanceNestedInput
    executionGraphs?: ExecutionGraphUncheckedUpdateManyWithoutInstanceNestedInput
  }

  export type InstanceUncheckedUpdateManyWithoutCpuTierInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    ownerId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    nodeTierId?: StringFieldUpdateOperationsInput | string
    engineTierId?: StringFieldUpdateOperationsInput | string
    qpuTierId?: NullableStringFieldUpdateOperationsInput | string | null
    omegaTierId?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumInstanceStatusFieldUpdateOperationsInput | $Enums.InstanceStatus
    autoscale?: BoolFieldUpdateOperationsInput | boolean
  }

  export type InstanceCreateManyNodeTierInput = {
    id?: string
    name: string
    ownerId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    cpuTierId: string
    engineTierId: string
    qpuTierId?: string | null
    omegaTierId?: string | null
    status?: $Enums.InstanceStatus
    autoscale?: boolean
  }

  export type InstanceUpdateWithoutNodeTierInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    ownerId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: EnumInstanceStatusFieldUpdateOperationsInput | $Enums.InstanceStatus
    autoscale?: BoolFieldUpdateOperationsInput | boolean
    cpuTier?: CpuTierUpdateOneRequiredWithoutInstancesNestedInput
    engineTier?: EngineTierUpdateOneRequiredWithoutInstancesNestedInput
    qpuTier?: QpuTierUpdateOneWithoutInstancesNestedInput
    omegaTier?: OmegaTierUpdateOneWithoutInstancesNestedInput
    engines?: InstanceEngineUpdateManyWithoutInstanceNestedInput
    policy?: InstancePolicyUpdateOneWithoutInstanceNestedInput
    terminalSessions?: TerminalSessionUpdateManyWithoutInstanceNestedInput
    snapshots?: SnapshotUpdateManyWithoutInstanceNestedInput
    logs?: InstanceLogUpdateManyWithoutInstanceNestedInput
    billingRecords?: BillingRecordUpdateManyWithoutInstanceNestedInput
    executionGraphs?: ExecutionGraphUpdateManyWithoutInstanceNestedInput
  }

  export type InstanceUncheckedUpdateWithoutNodeTierInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    ownerId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    cpuTierId?: StringFieldUpdateOperationsInput | string
    engineTierId?: StringFieldUpdateOperationsInput | string
    qpuTierId?: NullableStringFieldUpdateOperationsInput | string | null
    omegaTierId?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumInstanceStatusFieldUpdateOperationsInput | $Enums.InstanceStatus
    autoscale?: BoolFieldUpdateOperationsInput | boolean
    engines?: InstanceEngineUncheckedUpdateManyWithoutInstanceNestedInput
    policy?: InstancePolicyUncheckedUpdateOneWithoutInstanceNestedInput
    terminalSessions?: TerminalSessionUncheckedUpdateManyWithoutInstanceNestedInput
    snapshots?: SnapshotUncheckedUpdateManyWithoutInstanceNestedInput
    logs?: InstanceLogUncheckedUpdateManyWithoutInstanceNestedInput
    billingRecords?: BillingRecordUncheckedUpdateManyWithoutInstanceNestedInput
    executionGraphs?: ExecutionGraphUncheckedUpdateManyWithoutInstanceNestedInput
  }

  export type InstanceUncheckedUpdateManyWithoutNodeTierInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    ownerId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    cpuTierId?: StringFieldUpdateOperationsInput | string
    engineTierId?: StringFieldUpdateOperationsInput | string
    qpuTierId?: NullableStringFieldUpdateOperationsInput | string | null
    omegaTierId?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumInstanceStatusFieldUpdateOperationsInput | $Enums.InstanceStatus
    autoscale?: BoolFieldUpdateOperationsInput | boolean
  }

  export type InstanceCreateManyEngineTierInput = {
    id?: string
    name: string
    ownerId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    cpuTierId: string
    nodeTierId: string
    qpuTierId?: string | null
    omegaTierId?: string | null
    status?: $Enums.InstanceStatus
    autoscale?: boolean
  }

  export type InstanceUpdateWithoutEngineTierInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    ownerId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: EnumInstanceStatusFieldUpdateOperationsInput | $Enums.InstanceStatus
    autoscale?: BoolFieldUpdateOperationsInput | boolean
    cpuTier?: CpuTierUpdateOneRequiredWithoutInstancesNestedInput
    nodeTier?: NodeTierUpdateOneRequiredWithoutInstancesNestedInput
    qpuTier?: QpuTierUpdateOneWithoutInstancesNestedInput
    omegaTier?: OmegaTierUpdateOneWithoutInstancesNestedInput
    engines?: InstanceEngineUpdateManyWithoutInstanceNestedInput
    policy?: InstancePolicyUpdateOneWithoutInstanceNestedInput
    terminalSessions?: TerminalSessionUpdateManyWithoutInstanceNestedInput
    snapshots?: SnapshotUpdateManyWithoutInstanceNestedInput
    logs?: InstanceLogUpdateManyWithoutInstanceNestedInput
    billingRecords?: BillingRecordUpdateManyWithoutInstanceNestedInput
    executionGraphs?: ExecutionGraphUpdateManyWithoutInstanceNestedInput
  }

  export type InstanceUncheckedUpdateWithoutEngineTierInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    ownerId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    cpuTierId?: StringFieldUpdateOperationsInput | string
    nodeTierId?: StringFieldUpdateOperationsInput | string
    qpuTierId?: NullableStringFieldUpdateOperationsInput | string | null
    omegaTierId?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumInstanceStatusFieldUpdateOperationsInput | $Enums.InstanceStatus
    autoscale?: BoolFieldUpdateOperationsInput | boolean
    engines?: InstanceEngineUncheckedUpdateManyWithoutInstanceNestedInput
    policy?: InstancePolicyUncheckedUpdateOneWithoutInstanceNestedInput
    terminalSessions?: TerminalSessionUncheckedUpdateManyWithoutInstanceNestedInput
    snapshots?: SnapshotUncheckedUpdateManyWithoutInstanceNestedInput
    logs?: InstanceLogUncheckedUpdateManyWithoutInstanceNestedInput
    billingRecords?: BillingRecordUncheckedUpdateManyWithoutInstanceNestedInput
    executionGraphs?: ExecutionGraphUncheckedUpdateManyWithoutInstanceNestedInput
  }

  export type InstanceUncheckedUpdateManyWithoutEngineTierInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    ownerId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    cpuTierId?: StringFieldUpdateOperationsInput | string
    nodeTierId?: StringFieldUpdateOperationsInput | string
    qpuTierId?: NullableStringFieldUpdateOperationsInput | string | null
    omegaTierId?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumInstanceStatusFieldUpdateOperationsInput | $Enums.InstanceStatus
    autoscale?: BoolFieldUpdateOperationsInput | boolean
  }

  export type InstanceCreateManyQpuTierInput = {
    id?: string
    name: string
    ownerId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    cpuTierId: string
    nodeTierId: string
    engineTierId: string
    omegaTierId?: string | null
    status?: $Enums.InstanceStatus
    autoscale?: boolean
  }

  export type InstanceUpdateWithoutQpuTierInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    ownerId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: EnumInstanceStatusFieldUpdateOperationsInput | $Enums.InstanceStatus
    autoscale?: BoolFieldUpdateOperationsInput | boolean
    cpuTier?: CpuTierUpdateOneRequiredWithoutInstancesNestedInput
    nodeTier?: NodeTierUpdateOneRequiredWithoutInstancesNestedInput
    engineTier?: EngineTierUpdateOneRequiredWithoutInstancesNestedInput
    omegaTier?: OmegaTierUpdateOneWithoutInstancesNestedInput
    engines?: InstanceEngineUpdateManyWithoutInstanceNestedInput
    policy?: InstancePolicyUpdateOneWithoutInstanceNestedInput
    terminalSessions?: TerminalSessionUpdateManyWithoutInstanceNestedInput
    snapshots?: SnapshotUpdateManyWithoutInstanceNestedInput
    logs?: InstanceLogUpdateManyWithoutInstanceNestedInput
    billingRecords?: BillingRecordUpdateManyWithoutInstanceNestedInput
    executionGraphs?: ExecutionGraphUpdateManyWithoutInstanceNestedInput
  }

  export type InstanceUncheckedUpdateWithoutQpuTierInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    ownerId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    cpuTierId?: StringFieldUpdateOperationsInput | string
    nodeTierId?: StringFieldUpdateOperationsInput | string
    engineTierId?: StringFieldUpdateOperationsInput | string
    omegaTierId?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumInstanceStatusFieldUpdateOperationsInput | $Enums.InstanceStatus
    autoscale?: BoolFieldUpdateOperationsInput | boolean
    engines?: InstanceEngineUncheckedUpdateManyWithoutInstanceNestedInput
    policy?: InstancePolicyUncheckedUpdateOneWithoutInstanceNestedInput
    terminalSessions?: TerminalSessionUncheckedUpdateManyWithoutInstanceNestedInput
    snapshots?: SnapshotUncheckedUpdateManyWithoutInstanceNestedInput
    logs?: InstanceLogUncheckedUpdateManyWithoutInstanceNestedInput
    billingRecords?: BillingRecordUncheckedUpdateManyWithoutInstanceNestedInput
    executionGraphs?: ExecutionGraphUncheckedUpdateManyWithoutInstanceNestedInput
  }

  export type InstanceUncheckedUpdateManyWithoutQpuTierInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    ownerId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    cpuTierId?: StringFieldUpdateOperationsInput | string
    nodeTierId?: StringFieldUpdateOperationsInput | string
    engineTierId?: StringFieldUpdateOperationsInput | string
    omegaTierId?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumInstanceStatusFieldUpdateOperationsInput | $Enums.InstanceStatus
    autoscale?: BoolFieldUpdateOperationsInput | boolean
  }

  export type InstanceCreateManyOmegaTierInput = {
    id?: string
    name: string
    ownerId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    cpuTierId: string
    nodeTierId: string
    engineTierId: string
    qpuTierId?: string | null
    status?: $Enums.InstanceStatus
    autoscale?: boolean
  }

  export type InstanceUpdateWithoutOmegaTierInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    ownerId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: EnumInstanceStatusFieldUpdateOperationsInput | $Enums.InstanceStatus
    autoscale?: BoolFieldUpdateOperationsInput | boolean
    cpuTier?: CpuTierUpdateOneRequiredWithoutInstancesNestedInput
    nodeTier?: NodeTierUpdateOneRequiredWithoutInstancesNestedInput
    engineTier?: EngineTierUpdateOneRequiredWithoutInstancesNestedInput
    qpuTier?: QpuTierUpdateOneWithoutInstancesNestedInput
    engines?: InstanceEngineUpdateManyWithoutInstanceNestedInput
    policy?: InstancePolicyUpdateOneWithoutInstanceNestedInput
    terminalSessions?: TerminalSessionUpdateManyWithoutInstanceNestedInput
    snapshots?: SnapshotUpdateManyWithoutInstanceNestedInput
    logs?: InstanceLogUpdateManyWithoutInstanceNestedInput
    billingRecords?: BillingRecordUpdateManyWithoutInstanceNestedInput
    executionGraphs?: ExecutionGraphUpdateManyWithoutInstanceNestedInput
  }

  export type InstanceUncheckedUpdateWithoutOmegaTierInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    ownerId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    cpuTierId?: StringFieldUpdateOperationsInput | string
    nodeTierId?: StringFieldUpdateOperationsInput | string
    engineTierId?: StringFieldUpdateOperationsInput | string
    qpuTierId?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumInstanceStatusFieldUpdateOperationsInput | $Enums.InstanceStatus
    autoscale?: BoolFieldUpdateOperationsInput | boolean
    engines?: InstanceEngineUncheckedUpdateManyWithoutInstanceNestedInput
    policy?: InstancePolicyUncheckedUpdateOneWithoutInstanceNestedInput
    terminalSessions?: TerminalSessionUncheckedUpdateManyWithoutInstanceNestedInput
    snapshots?: SnapshotUncheckedUpdateManyWithoutInstanceNestedInput
    logs?: InstanceLogUncheckedUpdateManyWithoutInstanceNestedInput
    billingRecords?: BillingRecordUncheckedUpdateManyWithoutInstanceNestedInput
    executionGraphs?: ExecutionGraphUncheckedUpdateManyWithoutInstanceNestedInput
  }

  export type InstanceUncheckedUpdateManyWithoutOmegaTierInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    ownerId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    cpuTierId?: StringFieldUpdateOperationsInput | string
    nodeTierId?: StringFieldUpdateOperationsInput | string
    engineTierId?: StringFieldUpdateOperationsInput | string
    qpuTierId?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumInstanceStatusFieldUpdateOperationsInput | $Enums.InstanceStatus
    autoscale?: BoolFieldUpdateOperationsInput | boolean
  }



  /**
   * Aliases for legacy arg types
   */
    /**
     * @deprecated Use InstanceCountOutputTypeDefaultArgs instead
     */
    export type InstanceCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = InstanceCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use CpuTierCountOutputTypeDefaultArgs instead
     */
    export type CpuTierCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = CpuTierCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use NodeTierCountOutputTypeDefaultArgs instead
     */
    export type NodeTierCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = NodeTierCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use EngineTierCountOutputTypeDefaultArgs instead
     */
    export type EngineTierCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = EngineTierCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use QpuTierCountOutputTypeDefaultArgs instead
     */
    export type QpuTierCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = QpuTierCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use OmegaTierCountOutputTypeDefaultArgs instead
     */
    export type OmegaTierCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = OmegaTierCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use InstanceDefaultArgs instead
     */
    export type InstanceArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = InstanceDefaultArgs<ExtArgs>
    /**
     * @deprecated Use InstanceEngineDefaultArgs instead
     */
    export type InstanceEngineArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = InstanceEngineDefaultArgs<ExtArgs>
    /**
     * @deprecated Use InstancePolicyDefaultArgs instead
     */
    export type InstancePolicyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = InstancePolicyDefaultArgs<ExtArgs>
    /**
     * @deprecated Use CpuTierDefaultArgs instead
     */
    export type CpuTierArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = CpuTierDefaultArgs<ExtArgs>
    /**
     * @deprecated Use NodeTierDefaultArgs instead
     */
    export type NodeTierArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = NodeTierDefaultArgs<ExtArgs>
    /**
     * @deprecated Use EngineTierDefaultArgs instead
     */
    export type EngineTierArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = EngineTierDefaultArgs<ExtArgs>
    /**
     * @deprecated Use QpuTierDefaultArgs instead
     */
    export type QpuTierArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = QpuTierDefaultArgs<ExtArgs>
    /**
     * @deprecated Use OmegaTierDefaultArgs instead
     */
    export type OmegaTierArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = OmegaTierDefaultArgs<ExtArgs>
    /**
     * @deprecated Use SnapshotDefaultArgs instead
     */
    export type SnapshotArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = SnapshotDefaultArgs<ExtArgs>
    /**
     * @deprecated Use InstanceLogDefaultArgs instead
     */
    export type InstanceLogArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = InstanceLogDefaultArgs<ExtArgs>
    /**
     * @deprecated Use BillingRecordDefaultArgs instead
     */
    export type BillingRecordArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = BillingRecordDefaultArgs<ExtArgs>
    /**
     * @deprecated Use ExecutionGraphDefaultArgs instead
     */
    export type ExecutionGraphArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = ExecutionGraphDefaultArgs<ExtArgs>
    /**
     * @deprecated Use snapshot_historyDefaultArgs instead
     */
    export type snapshot_historyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = snapshot_historyDefaultArgs<ExtArgs>
    /**
     * @deprecated Use TerminalSessionDefaultArgs instead
     */
    export type TerminalSessionArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = TerminalSessionDefaultArgs<ExtArgs>

  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}