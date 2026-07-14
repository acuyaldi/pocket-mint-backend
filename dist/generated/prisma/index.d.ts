
/**
 * Client
**/

import * as runtime from './runtime/client.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model User
 * 
 */
export type User = $Result.DefaultSelection<Prisma.$UserPayload>
/**
 * Model Wallet
 * 
 */
export type Wallet = $Result.DefaultSelection<Prisma.$WalletPayload>
/**
 * Model Category
 * 
 */
export type Category = $Result.DefaultSelection<Prisma.$CategoryPayload>
/**
 * Model Transaction
 * 
 */
export type Transaction = $Result.DefaultSelection<Prisma.$TransactionPayload>
/**
 * Model Installment
 * 
 */
export type Installment = $Result.DefaultSelection<Prisma.$InstallmentPayload>
/**
 * Model Transfer
 * 
 */
export type Transfer = $Result.DefaultSelection<Prisma.$TransferPayload>

/**
 * Enums
 */
export namespace $Enums {
  export const WalletType: {
  CASH: 'CASH',
  BANK: 'BANK',
  E_WALLET: 'E_WALLET',
  CREDIT_CARD: 'CREDIT_CARD',
  LOAN_PAYLATER: 'LOAN_PAYLATER'
};

export type WalletType = (typeof WalletType)[keyof typeof WalletType]


export const CategoryType: {
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE'
};

export type CategoryType = (typeof CategoryType)[keyof typeof CategoryType]


export const TransactionType: {
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE',
  TRANSFER: 'TRANSFER'
};

export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType]


export const AdminFeeType: {
  FLAT: 'FLAT',
  PERCENT: 'PERCENT'
};

export type AdminFeeType = (typeof AdminFeeType)[keyof typeof AdminFeeType]


export const InstallmentStatus: {
  ACTIVE: 'ACTIVE',
  SETTLED: 'SETTLED',
  CANCELLED: 'CANCELLED'
};

export type InstallmentStatus = (typeof InstallmentStatus)[keyof typeof InstallmentStatus]

}

export type WalletType = $Enums.WalletType

export const WalletType: typeof $Enums.WalletType

export type CategoryType = $Enums.CategoryType

export const CategoryType: typeof $Enums.CategoryType

export type TransactionType = $Enums.TransactionType

export const TransactionType: typeof $Enums.TransactionType

export type AdminFeeType = $Enums.AdminFeeType

export const AdminFeeType: typeof $Enums.AdminFeeType

export type InstallmentStatus = $Enums.InstallmentStatus

export const InstallmentStatus: typeof $Enums.InstallmentStatus

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient({
 *   adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
 * })
 * // Fetch zero or more Users
 * const users = await prisma.user.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://pris.ly/d/client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  const U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient({
   *   adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
   * })
   * // Fetch zero or more Users
   * const users = await prisma.user.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://pris.ly/d/client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
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
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
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
   * Read more in our [docs](https://pris.ly/d/raw-queries).
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
   * Read more in our [docs](https://www.prisma.io/docs/orm/prisma-client/queries/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>

  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.user`: Exposes CRUD operations for the **User** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Users
    * const users = await prisma.user.findMany()
    * ```
    */
  get user(): Prisma.UserDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.wallet`: Exposes CRUD operations for the **Wallet** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Wallets
    * const wallets = await prisma.wallet.findMany()
    * ```
    */
  get wallet(): Prisma.WalletDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.category`: Exposes CRUD operations for the **Category** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Categories
    * const categories = await prisma.category.findMany()
    * ```
    */
  get category(): Prisma.CategoryDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.transaction`: Exposes CRUD operations for the **Transaction** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Transactions
    * const transactions = await prisma.transaction.findMany()
    * ```
    */
  get transaction(): Prisma.TransactionDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.installment`: Exposes CRUD operations for the **Installment** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Installments
    * const installments = await prisma.installment.findMany()
    * ```
    */
  get installment(): Prisma.InstallmentDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.transfer`: Exposes CRUD operations for the **Transfer** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Transfers
    * const transfers = await prisma.transfer.findMany()
    * ```
    */
  get transfer(): Prisma.TransferDelegate<ExtArgs, ClientOptions>;
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
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 7.8.0
   * Query Engine version: 3c6e192761c0362d496ed980de936e2f3cebcd3a
   */
  export type PrismaVersion = {
    client: string
    engine: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import Bytes = runtime.Bytes
  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

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
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
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
    User: 'User',
    Wallet: 'Wallet',
    Category: 'Category',
    Transaction: 'Transaction',
    Installment: 'Installment',
    Transfer: 'Transfer'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]



  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "user" | "wallet" | "category" | "transaction" | "installment" | "transfer"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      User: {
        payload: Prisma.$UserPayload<ExtArgs>
        fields: Prisma.UserFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UserFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UserFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findFirst: {
            args: Prisma.UserFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UserFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findMany: {
            args: Prisma.UserFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          create: {
            args: Prisma.UserCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          createMany: {
            args: Prisma.UserCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.UserCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          delete: {
            args: Prisma.UserDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          update: {
            args: Prisma.UserUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          deleteMany: {
            args: Prisma.UserDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.UserUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.UserUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          upsert: {
            args: Prisma.UserUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          aggregate: {
            args: Prisma.UserAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUser>
          }
          groupBy: {
            args: Prisma.UserGroupByArgs<ExtArgs>
            result: $Utils.Optional<UserGroupByOutputType>[]
          }
          count: {
            args: Prisma.UserCountArgs<ExtArgs>
            result: $Utils.Optional<UserCountAggregateOutputType> | number
          }
        }
      }
      Wallet: {
        payload: Prisma.$WalletPayload<ExtArgs>
        fields: Prisma.WalletFieldRefs
        operations: {
          findUnique: {
            args: Prisma.WalletFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WalletPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.WalletFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WalletPayload>
          }
          findFirst: {
            args: Prisma.WalletFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WalletPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.WalletFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WalletPayload>
          }
          findMany: {
            args: Prisma.WalletFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WalletPayload>[]
          }
          create: {
            args: Prisma.WalletCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WalletPayload>
          }
          createMany: {
            args: Prisma.WalletCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.WalletCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WalletPayload>[]
          }
          delete: {
            args: Prisma.WalletDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WalletPayload>
          }
          update: {
            args: Prisma.WalletUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WalletPayload>
          }
          deleteMany: {
            args: Prisma.WalletDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.WalletUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.WalletUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WalletPayload>[]
          }
          upsert: {
            args: Prisma.WalletUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WalletPayload>
          }
          aggregate: {
            args: Prisma.WalletAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateWallet>
          }
          groupBy: {
            args: Prisma.WalletGroupByArgs<ExtArgs>
            result: $Utils.Optional<WalletGroupByOutputType>[]
          }
          count: {
            args: Prisma.WalletCountArgs<ExtArgs>
            result: $Utils.Optional<WalletCountAggregateOutputType> | number
          }
        }
      }
      Category: {
        payload: Prisma.$CategoryPayload<ExtArgs>
        fields: Prisma.CategoryFieldRefs
        operations: {
          findUnique: {
            args: Prisma.CategoryFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CategoryPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.CategoryFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CategoryPayload>
          }
          findFirst: {
            args: Prisma.CategoryFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CategoryPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.CategoryFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CategoryPayload>
          }
          findMany: {
            args: Prisma.CategoryFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CategoryPayload>[]
          }
          create: {
            args: Prisma.CategoryCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CategoryPayload>
          }
          createMany: {
            args: Prisma.CategoryCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.CategoryCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CategoryPayload>[]
          }
          delete: {
            args: Prisma.CategoryDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CategoryPayload>
          }
          update: {
            args: Prisma.CategoryUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CategoryPayload>
          }
          deleteMany: {
            args: Prisma.CategoryDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.CategoryUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.CategoryUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CategoryPayload>[]
          }
          upsert: {
            args: Prisma.CategoryUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CategoryPayload>
          }
          aggregate: {
            args: Prisma.CategoryAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateCategory>
          }
          groupBy: {
            args: Prisma.CategoryGroupByArgs<ExtArgs>
            result: $Utils.Optional<CategoryGroupByOutputType>[]
          }
          count: {
            args: Prisma.CategoryCountArgs<ExtArgs>
            result: $Utils.Optional<CategoryCountAggregateOutputType> | number
          }
        }
      }
      Transaction: {
        payload: Prisma.$TransactionPayload<ExtArgs>
        fields: Prisma.TransactionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.TransactionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TransactionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.TransactionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TransactionPayload>
          }
          findFirst: {
            args: Prisma.TransactionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TransactionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.TransactionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TransactionPayload>
          }
          findMany: {
            args: Prisma.TransactionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TransactionPayload>[]
          }
          create: {
            args: Prisma.TransactionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TransactionPayload>
          }
          createMany: {
            args: Prisma.TransactionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.TransactionCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TransactionPayload>[]
          }
          delete: {
            args: Prisma.TransactionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TransactionPayload>
          }
          update: {
            args: Prisma.TransactionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TransactionPayload>
          }
          deleteMany: {
            args: Prisma.TransactionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.TransactionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.TransactionUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TransactionPayload>[]
          }
          upsert: {
            args: Prisma.TransactionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TransactionPayload>
          }
          aggregate: {
            args: Prisma.TransactionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateTransaction>
          }
          groupBy: {
            args: Prisma.TransactionGroupByArgs<ExtArgs>
            result: $Utils.Optional<TransactionGroupByOutputType>[]
          }
          count: {
            args: Prisma.TransactionCountArgs<ExtArgs>
            result: $Utils.Optional<TransactionCountAggregateOutputType> | number
          }
        }
      }
      Installment: {
        payload: Prisma.$InstallmentPayload<ExtArgs>
        fields: Prisma.InstallmentFieldRefs
        operations: {
          findUnique: {
            args: Prisma.InstallmentFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InstallmentPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.InstallmentFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InstallmentPayload>
          }
          findFirst: {
            args: Prisma.InstallmentFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InstallmentPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.InstallmentFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InstallmentPayload>
          }
          findMany: {
            args: Prisma.InstallmentFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InstallmentPayload>[]
          }
          create: {
            args: Prisma.InstallmentCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InstallmentPayload>
          }
          createMany: {
            args: Prisma.InstallmentCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.InstallmentCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InstallmentPayload>[]
          }
          delete: {
            args: Prisma.InstallmentDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InstallmentPayload>
          }
          update: {
            args: Prisma.InstallmentUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InstallmentPayload>
          }
          deleteMany: {
            args: Prisma.InstallmentDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.InstallmentUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.InstallmentUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InstallmentPayload>[]
          }
          upsert: {
            args: Prisma.InstallmentUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InstallmentPayload>
          }
          aggregate: {
            args: Prisma.InstallmentAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateInstallment>
          }
          groupBy: {
            args: Prisma.InstallmentGroupByArgs<ExtArgs>
            result: $Utils.Optional<InstallmentGroupByOutputType>[]
          }
          count: {
            args: Prisma.InstallmentCountArgs<ExtArgs>
            result: $Utils.Optional<InstallmentCountAggregateOutputType> | number
          }
        }
      }
      Transfer: {
        payload: Prisma.$TransferPayload<ExtArgs>
        fields: Prisma.TransferFieldRefs
        operations: {
          findUnique: {
            args: Prisma.TransferFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TransferPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.TransferFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TransferPayload>
          }
          findFirst: {
            args: Prisma.TransferFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TransferPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.TransferFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TransferPayload>
          }
          findMany: {
            args: Prisma.TransferFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TransferPayload>[]
          }
          create: {
            args: Prisma.TransferCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TransferPayload>
          }
          createMany: {
            args: Prisma.TransferCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.TransferCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TransferPayload>[]
          }
          delete: {
            args: Prisma.TransferDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TransferPayload>
          }
          update: {
            args: Prisma.TransferUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TransferPayload>
          }
          deleteMany: {
            args: Prisma.TransferDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.TransferUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.TransferUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TransferPayload>[]
          }
          upsert: {
            args: Prisma.TransferUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TransferPayload>
          }
          aggregate: {
            args: Prisma.TransferAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateTransfer>
          }
          groupBy: {
            args: Prisma.TransferGroupByArgs<ExtArgs>
            result: $Utils.Optional<TransferGroupByOutputType>[]
          }
          count: {
            args: Prisma.TransferCountArgs<ExtArgs>
            result: $Utils.Optional<TransferCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Shorthand for `emit: 'stdout'`
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events only
     * log: [
     *   { emit: 'event', level: 'query' },
     *   { emit: 'event', level: 'info' },
     *   { emit: 'event', level: 'warn' }
     *   { emit: 'event', level: 'error' }
     * ]
     * 
     * / Emit as events and log to stdout
     * og: [
     *  { emit: 'stdout', level: 'query' },
     *  { emit: 'stdout', level: 'info' },
     *  { emit: 'stdout', level: 'warn' }
     *  { emit: 'stdout', level: 'error' }
     * 
     * ```
     * Read more in our [docs](https://pris.ly/d/logging).
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
    /**
     * Instance of a Driver Adapter, e.g., like one provided by `@prisma/adapter-planetscale`
     */
    adapter?: runtime.SqlDriverAdapterFactory
    /**
     * Prisma Accelerate URL allowing the client to connect through Accelerate instead of a direct database.
     */
    accelerateUrl?: string
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
    /**
     * SQL commenter plugins that add metadata to SQL queries as comments.
     * Comments follow the sqlcommenter format: https://google.github.io/sqlcommenter/
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   adapter,
     *   comments: [
     *     traceContext(),
     *     queryInsights(),
     *   ],
     * })
     * ```
     */
    comments?: runtime.SqlCommenterPlugin[]
  }
  export type GlobalOmitConfig = {
    user?: UserOmit
    wallet?: WalletOmit
    category?: CategoryOmit
    transaction?: TransactionOmit
    installment?: InstallmentOmit
    transfer?: TransferOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type CheckIsLogLevel<T> = T extends LogLevel ? T : never;

  export type GetLogType<T> = CheckIsLogLevel<
    T extends LogDefinition ? T['level'] : T
  >;

  export type GetEvents<T extends any[]> = T extends Array<LogLevel | LogDefinition>
    ? GetLogType<T[number]>
    : never;

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
    | 'updateManyAndReturn'
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
   * Count Type UserCountOutputType
   */

  export type UserCountOutputType = {
    wallets: number
    categories: number
    transactions: number
    installments: number
    transfers: number
  }

  export type UserCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    wallets?: boolean | UserCountOutputTypeCountWalletsArgs
    categories?: boolean | UserCountOutputTypeCountCategoriesArgs
    transactions?: boolean | UserCountOutputTypeCountTransactionsArgs
    installments?: boolean | UserCountOutputTypeCountInstallmentsArgs
    transfers?: boolean | UserCountOutputTypeCountTransfersArgs
  }

  // Custom InputTypes
  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserCountOutputType
     */
    select?: UserCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountWalletsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: WalletWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountCategoriesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CategoryWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountTransactionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TransactionWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountInstallmentsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: InstallmentWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountTransfersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TransferWhereInput
  }


  /**
   * Count Type WalletCountOutputType
   */

  export type WalletCountOutputType = {
    transactions: number
    toTransactions: number
    installments: number
    fromTransfers: number
    toTransfers: number
  }

  export type WalletCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    transactions?: boolean | WalletCountOutputTypeCountTransactionsArgs
    toTransactions?: boolean | WalletCountOutputTypeCountToTransactionsArgs
    installments?: boolean | WalletCountOutputTypeCountInstallmentsArgs
    fromTransfers?: boolean | WalletCountOutputTypeCountFromTransfersArgs
    toTransfers?: boolean | WalletCountOutputTypeCountToTransfersArgs
  }

  // Custom InputTypes
  /**
   * WalletCountOutputType without action
   */
  export type WalletCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WalletCountOutputType
     */
    select?: WalletCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * WalletCountOutputType without action
   */
  export type WalletCountOutputTypeCountTransactionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TransactionWhereInput
  }

  /**
   * WalletCountOutputType without action
   */
  export type WalletCountOutputTypeCountToTransactionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TransactionWhereInput
  }

  /**
   * WalletCountOutputType without action
   */
  export type WalletCountOutputTypeCountInstallmentsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: InstallmentWhereInput
  }

  /**
   * WalletCountOutputType without action
   */
  export type WalletCountOutputTypeCountFromTransfersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TransferWhereInput
  }

  /**
   * WalletCountOutputType without action
   */
  export type WalletCountOutputTypeCountToTransfersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TransferWhereInput
  }


  /**
   * Count Type CategoryCountOutputType
   */

  export type CategoryCountOutputType = {
    transactions: number
  }

  export type CategoryCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    transactions?: boolean | CategoryCountOutputTypeCountTransactionsArgs
  }

  // Custom InputTypes
  /**
   * CategoryCountOutputType without action
   */
  export type CategoryCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CategoryCountOutputType
     */
    select?: CategoryCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * CategoryCountOutputType without action
   */
  export type CategoryCountOutputTypeCountTransactionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TransactionWhereInput
  }


  /**
   * Count Type InstallmentCountOutputType
   */

  export type InstallmentCountOutputType = {
    transactions: number
  }

  export type InstallmentCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    transactions?: boolean | InstallmentCountOutputTypeCountTransactionsArgs
  }

  // Custom InputTypes
  /**
   * InstallmentCountOutputType without action
   */
  export type InstallmentCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InstallmentCountOutputType
     */
    select?: InstallmentCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * InstallmentCountOutputType without action
   */
  export type InstallmentCountOutputTypeCountTransactionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TransactionWhereInput
  }


  /**
   * Models
   */

  /**
   * Model User
   */

  export type AggregateUser = {
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  export type UserMinAggregateOutputType = {
    id: string | null
    email: string | null
    name: string | null
    avatarUrl: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserMaxAggregateOutputType = {
    id: string | null
    email: string | null
    name: string | null
    avatarUrl: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserCountAggregateOutputType = {
    id: number
    email: number
    name: number
    avatarUrl: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type UserMinAggregateInputType = {
    id?: true
    email?: true
    name?: true
    avatarUrl?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserMaxAggregateInputType = {
    id?: true
    email?: true
    name?: true
    avatarUrl?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserCountAggregateInputType = {
    id?: true
    email?: true
    name?: true
    avatarUrl?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type UserAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which User to aggregate.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Users
    **/
    _count?: true | UserCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UserMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UserMaxAggregateInputType
  }

  export type GetUserAggregateType<T extends UserAggregateArgs> = {
        [P in keyof T & keyof AggregateUser]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUser[P]>
      : GetScalarType<T[P], AggregateUser[P]>
  }




  export type UserGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserWhereInput
    orderBy?: UserOrderByWithAggregationInput | UserOrderByWithAggregationInput[]
    by: UserScalarFieldEnum[] | UserScalarFieldEnum
    having?: UserScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UserCountAggregateInputType | true
    _min?: UserMinAggregateInputType
    _max?: UserMaxAggregateInputType
  }

  export type UserGroupByOutputType = {
    id: string
    email: string
    name: string
    avatarUrl: string | null
    createdAt: Date
    updatedAt: Date
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  type GetUserGroupByPayload<T extends UserGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UserGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UserGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UserGroupByOutputType[P]>
            : GetScalarType<T[P], UserGroupByOutputType[P]>
        }
      >
    >


  export type UserSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    email?: boolean
    name?: boolean
    avatarUrl?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    wallets?: boolean | User$walletsArgs<ExtArgs>
    categories?: boolean | User$categoriesArgs<ExtArgs>
    transactions?: boolean | User$transactionsArgs<ExtArgs>
    installments?: boolean | User$installmentsArgs<ExtArgs>
    transfers?: boolean | User$transfersArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["user"]>

  export type UserSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    email?: boolean
    name?: boolean
    avatarUrl?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    email?: boolean
    name?: boolean
    avatarUrl?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectScalar = {
    id?: boolean
    email?: boolean
    name?: boolean
    avatarUrl?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type UserOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "email" | "name" | "avatarUrl" | "createdAt" | "updatedAt", ExtArgs["result"]["user"]>
  export type UserInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    wallets?: boolean | User$walletsArgs<ExtArgs>
    categories?: boolean | User$categoriesArgs<ExtArgs>
    transactions?: boolean | User$transactionsArgs<ExtArgs>
    installments?: boolean | User$installmentsArgs<ExtArgs>
    transfers?: boolean | User$transfersArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type UserIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type UserIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $UserPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "User"
    objects: {
      wallets: Prisma.$WalletPayload<ExtArgs>[]
      categories: Prisma.$CategoryPayload<ExtArgs>[]
      transactions: Prisma.$TransactionPayload<ExtArgs>[]
      installments: Prisma.$InstallmentPayload<ExtArgs>[]
      transfers: Prisma.$TransferPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      email: string
      name: string
      avatarUrl: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["user"]>
    composites: {}
  }

  type UserGetPayload<S extends boolean | null | undefined | UserDefaultArgs> = $Result.GetResult<Prisma.$UserPayload, S>

  type UserCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<UserFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: UserCountAggregateInputType | true
    }

  export interface UserDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['User'], meta: { name: 'User' } }
    /**
     * Find zero or one User that matches the filter.
     * @param {UserFindUniqueArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends UserFindUniqueArgs>(args: SelectSubset<T, UserFindUniqueArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one User that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {UserFindUniqueOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends UserFindUniqueOrThrowArgs>(args: SelectSubset<T, UserFindUniqueOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends UserFindFirstArgs>(args?: SelectSubset<T, UserFindFirstArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends UserFindFirstOrThrowArgs>(args?: SelectSubset<T, UserFindFirstOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Users that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Users
     * const users = await prisma.user.findMany()
     * 
     * // Get first 10 Users
     * const users = await prisma.user.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const userWithIdOnly = await prisma.user.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends UserFindManyArgs>(args?: SelectSubset<T, UserFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a User.
     * @param {UserCreateArgs} args - Arguments to create a User.
     * @example
     * // Create one User
     * const User = await prisma.user.create({
     *   data: {
     *     // ... data to create a User
     *   }
     * })
     * 
     */
    create<T extends UserCreateArgs>(args: SelectSubset<T, UserCreateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Users.
     * @param {UserCreateManyArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends UserCreateManyArgs>(args?: SelectSubset<T, UserCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Users and returns the data saved in the database.
     * @param {UserCreateManyAndReturnArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Users and only return the `id`
     * const userWithIdOnly = await prisma.user.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends UserCreateManyAndReturnArgs>(args?: SelectSubset<T, UserCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a User.
     * @param {UserDeleteArgs} args - Arguments to delete one User.
     * @example
     * // Delete one User
     * const User = await prisma.user.delete({
     *   where: {
     *     // ... filter to delete one User
     *   }
     * })
     * 
     */
    delete<T extends UserDeleteArgs>(args: SelectSubset<T, UserDeleteArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one User.
     * @param {UserUpdateArgs} args - Arguments to update one User.
     * @example
     * // Update one User
     * const user = await prisma.user.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends UserUpdateArgs>(args: SelectSubset<T, UserUpdateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Users.
     * @param {UserDeleteManyArgs} args - Arguments to filter Users to delete.
     * @example
     * // Delete a few Users
     * const { count } = await prisma.user.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends UserDeleteManyArgs>(args?: SelectSubset<T, UserDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends UserUpdateManyArgs>(args: SelectSubset<T, UserUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users and returns the data updated in the database.
     * @param {UserUpdateManyAndReturnArgs} args - Arguments to update many Users.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Users and only return the `id`
     * const userWithIdOnly = await prisma.user.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends UserUpdateManyAndReturnArgs>(args: SelectSubset<T, UserUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one User.
     * @param {UserUpsertArgs} args - Arguments to update or create a User.
     * @example
     * // Update or create a User
     * const user = await prisma.user.upsert({
     *   create: {
     *     // ... data to create a User
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the User we want to update
     *   }
     * })
     */
    upsert<T extends UserUpsertArgs>(args: SelectSubset<T, UserUpsertArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserCountArgs} args - Arguments to filter Users to count.
     * @example
     * // Count the number of Users
     * const count = await prisma.user.count({
     *   where: {
     *     // ... the filter for the Users we want to count
     *   }
     * })
    **/
    count<T extends UserCountArgs>(
      args?: Subset<T, UserCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UserCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
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
    aggregate<T extends UserAggregateArgs>(args: Subset<T, UserAggregateArgs>): Prisma.PrismaPromise<GetUserAggregateType<T>>

    /**
     * Group by User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserGroupByArgs} args - Group by arguments.
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
      T extends UserGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UserGroupByArgs['orderBy'] }
        : { orderBy?: UserGroupByArgs['orderBy'] },
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
    >(args: SubsetIntersection<T, UserGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUserGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the User model
   */
  readonly fields: UserFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for User.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UserClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    wallets<T extends User$walletsArgs<ExtArgs> = {}>(args?: Subset<T, User$walletsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$WalletPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    categories<T extends User$categoriesArgs<ExtArgs> = {}>(args?: Subset<T, User$categoriesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CategoryPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    transactions<T extends User$transactionsArgs<ExtArgs> = {}>(args?: Subset<T, User$transactionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TransactionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    installments<T extends User$installmentsArgs<ExtArgs> = {}>(args?: Subset<T, User$installmentsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$InstallmentPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    transfers<T extends User$transfersArgs<ExtArgs> = {}>(args?: Subset<T, User$transfersArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TransferPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the User model
   */
  interface UserFieldRefs {
    readonly id: FieldRef<"User", 'String'>
    readonly email: FieldRef<"User", 'String'>
    readonly name: FieldRef<"User", 'String'>
    readonly avatarUrl: FieldRef<"User", 'String'>
    readonly createdAt: FieldRef<"User", 'DateTime'>
    readonly updatedAt: FieldRef<"User", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * User findUnique
   */
  export type UserFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findUniqueOrThrow
   */
  export type UserFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findFirst
   */
  export type UserFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findFirstOrThrow
   */
  export type UserFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findMany
   */
  export type UserFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which Users to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User create
   */
  export type UserCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to create a User.
     */
    data: XOR<UserCreateInput, UserUncheckedCreateInput>
  }

  /**
   * User createMany
   */
  export type UserCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User createManyAndReturn
   */
  export type UserCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User update
   */
  export type UserUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to update a User.
     */
    data: XOR<UserUpdateInput, UserUncheckedUpdateInput>
    /**
     * Choose, which User to update.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User updateMany
   */
  export type UserUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to update.
     */
    limit?: number
  }

  /**
   * User updateManyAndReturn
   */
  export type UserUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to update.
     */
    limit?: number
  }

  /**
   * User upsert
   */
  export type UserUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The filter to search for the User to update in case it exists.
     */
    where: UserWhereUniqueInput
    /**
     * In case the User found by the `where` argument doesn't exist, create a new User with this data.
     */
    create: XOR<UserCreateInput, UserUncheckedCreateInput>
    /**
     * In case the User was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UserUpdateInput, UserUncheckedUpdateInput>
  }

  /**
   * User delete
   */
  export type UserDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter which User to delete.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User deleteMany
   */
  export type UserDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Users to delete
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to delete.
     */
    limit?: number
  }

  /**
   * User.wallets
   */
  export type User$walletsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Wallet
     */
    select?: WalletSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Wallet
     */
    omit?: WalletOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WalletInclude<ExtArgs> | null
    where?: WalletWhereInput
    orderBy?: WalletOrderByWithRelationInput | WalletOrderByWithRelationInput[]
    cursor?: WalletWhereUniqueInput
    take?: number
    skip?: number
    distinct?: WalletScalarFieldEnum | WalletScalarFieldEnum[]
  }

  /**
   * User.categories
   */
  export type User$categoriesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Category
     */
    select?: CategorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Category
     */
    omit?: CategoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CategoryInclude<ExtArgs> | null
    where?: CategoryWhereInput
    orderBy?: CategoryOrderByWithRelationInput | CategoryOrderByWithRelationInput[]
    cursor?: CategoryWhereUniqueInput
    take?: number
    skip?: number
    distinct?: CategoryScalarFieldEnum | CategoryScalarFieldEnum[]
  }

  /**
   * User.transactions
   */
  export type User$transactionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionInclude<ExtArgs> | null
    where?: TransactionWhereInput
    orderBy?: TransactionOrderByWithRelationInput | TransactionOrderByWithRelationInput[]
    cursor?: TransactionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TransactionScalarFieldEnum | TransactionScalarFieldEnum[]
  }

  /**
   * User.installments
   */
  export type User$installmentsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Installment
     */
    select?: InstallmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Installment
     */
    omit?: InstallmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstallmentInclude<ExtArgs> | null
    where?: InstallmentWhereInput
    orderBy?: InstallmentOrderByWithRelationInput | InstallmentOrderByWithRelationInput[]
    cursor?: InstallmentWhereUniqueInput
    take?: number
    skip?: number
    distinct?: InstallmentScalarFieldEnum | InstallmentScalarFieldEnum[]
  }

  /**
   * User.transfers
   */
  export type User$transfersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transfer
     */
    select?: TransferSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transfer
     */
    omit?: TransferOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransferInclude<ExtArgs> | null
    where?: TransferWhereInput
    orderBy?: TransferOrderByWithRelationInput | TransferOrderByWithRelationInput[]
    cursor?: TransferWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TransferScalarFieldEnum | TransferScalarFieldEnum[]
  }

  /**
   * User without action
   */
  export type UserDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
  }


  /**
   * Model Wallet
   */

  export type AggregateWallet = {
    _count: WalletCountAggregateOutputType | null
    _avg: WalletAvgAggregateOutputType | null
    _sum: WalletSumAggregateOutputType | null
    _min: WalletMinAggregateOutputType | null
    _max: WalletMaxAggregateOutputType | null
  }

  export type WalletAvgAggregateOutputType = {
    balance: Decimal | null
    creditLimit: Decimal | null
    initialBalance: Decimal | null
    interestRate: Decimal | null
    adminFee: Decimal | null
  }

  export type WalletSumAggregateOutputType = {
    balance: Decimal | null
    creditLimit: Decimal | null
    initialBalance: Decimal | null
    interestRate: Decimal | null
    adminFee: Decimal | null
  }

  export type WalletMinAggregateOutputType = {
    id: string | null
    userId: string | null
    name: string | null
    type: $Enums.WalletType | null
    balance: Decimal | null
    creditLimit: Decimal | null
    initialBalance: Decimal | null
    icon: string | null
    color: string | null
    interestRate: Decimal | null
    isArchived: boolean | null
    adminFee: Decimal | null
    adminFeeType: $Enums.AdminFeeType | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type WalletMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    name: string | null
    type: $Enums.WalletType | null
    balance: Decimal | null
    creditLimit: Decimal | null
    initialBalance: Decimal | null
    icon: string | null
    color: string | null
    interestRate: Decimal | null
    isArchived: boolean | null
    adminFee: Decimal | null
    adminFeeType: $Enums.AdminFeeType | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type WalletCountAggregateOutputType = {
    id: number
    userId: number
    name: number
    type: number
    balance: number
    creditLimit: number
    initialBalance: number
    icon: number
    color: number
    interestRate: number
    isArchived: number
    adminFee: number
    adminFeeType: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type WalletAvgAggregateInputType = {
    balance?: true
    creditLimit?: true
    initialBalance?: true
    interestRate?: true
    adminFee?: true
  }

  export type WalletSumAggregateInputType = {
    balance?: true
    creditLimit?: true
    initialBalance?: true
    interestRate?: true
    adminFee?: true
  }

  export type WalletMinAggregateInputType = {
    id?: true
    userId?: true
    name?: true
    type?: true
    balance?: true
    creditLimit?: true
    initialBalance?: true
    icon?: true
    color?: true
    interestRate?: true
    isArchived?: true
    adminFee?: true
    adminFeeType?: true
    createdAt?: true
    updatedAt?: true
  }

  export type WalletMaxAggregateInputType = {
    id?: true
    userId?: true
    name?: true
    type?: true
    balance?: true
    creditLimit?: true
    initialBalance?: true
    icon?: true
    color?: true
    interestRate?: true
    isArchived?: true
    adminFee?: true
    adminFeeType?: true
    createdAt?: true
    updatedAt?: true
  }

  export type WalletCountAggregateInputType = {
    id?: true
    userId?: true
    name?: true
    type?: true
    balance?: true
    creditLimit?: true
    initialBalance?: true
    icon?: true
    color?: true
    interestRate?: true
    isArchived?: true
    adminFee?: true
    adminFeeType?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type WalletAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Wallet to aggregate.
     */
    where?: WalletWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Wallets to fetch.
     */
    orderBy?: WalletOrderByWithRelationInput | WalletOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: WalletWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Wallets from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Wallets.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Wallets
    **/
    _count?: true | WalletCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: WalletAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: WalletSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: WalletMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: WalletMaxAggregateInputType
  }

  export type GetWalletAggregateType<T extends WalletAggregateArgs> = {
        [P in keyof T & keyof AggregateWallet]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateWallet[P]>
      : GetScalarType<T[P], AggregateWallet[P]>
  }




  export type WalletGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: WalletWhereInput
    orderBy?: WalletOrderByWithAggregationInput | WalletOrderByWithAggregationInput[]
    by: WalletScalarFieldEnum[] | WalletScalarFieldEnum
    having?: WalletScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: WalletCountAggregateInputType | true
    _avg?: WalletAvgAggregateInputType
    _sum?: WalletSumAggregateInputType
    _min?: WalletMinAggregateInputType
    _max?: WalletMaxAggregateInputType
  }

  export type WalletGroupByOutputType = {
    id: string
    userId: string
    name: string
    type: $Enums.WalletType
    balance: Decimal
    creditLimit: Decimal
    initialBalance: Decimal
    icon: string | null
    color: string | null
    interestRate: Decimal
    isArchived: boolean
    adminFee: Decimal
    adminFeeType: $Enums.AdminFeeType
    createdAt: Date
    updatedAt: Date
    _count: WalletCountAggregateOutputType | null
    _avg: WalletAvgAggregateOutputType | null
    _sum: WalletSumAggregateOutputType | null
    _min: WalletMinAggregateOutputType | null
    _max: WalletMaxAggregateOutputType | null
  }

  type GetWalletGroupByPayload<T extends WalletGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<WalletGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof WalletGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], WalletGroupByOutputType[P]>
            : GetScalarType<T[P], WalletGroupByOutputType[P]>
        }
      >
    >


  export type WalletSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    name?: boolean
    type?: boolean
    balance?: boolean
    creditLimit?: boolean
    initialBalance?: boolean
    icon?: boolean
    color?: boolean
    interestRate?: boolean
    isArchived?: boolean
    adminFee?: boolean
    adminFeeType?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    transactions?: boolean | Wallet$transactionsArgs<ExtArgs>
    toTransactions?: boolean | Wallet$toTransactionsArgs<ExtArgs>
    installments?: boolean | Wallet$installmentsArgs<ExtArgs>
    fromTransfers?: boolean | Wallet$fromTransfersArgs<ExtArgs>
    toTransfers?: boolean | Wallet$toTransfersArgs<ExtArgs>
    _count?: boolean | WalletCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["wallet"]>

  export type WalletSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    name?: boolean
    type?: boolean
    balance?: boolean
    creditLimit?: boolean
    initialBalance?: boolean
    icon?: boolean
    color?: boolean
    interestRate?: boolean
    isArchived?: boolean
    adminFee?: boolean
    adminFeeType?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["wallet"]>

  export type WalletSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    name?: boolean
    type?: boolean
    balance?: boolean
    creditLimit?: boolean
    initialBalance?: boolean
    icon?: boolean
    color?: boolean
    interestRate?: boolean
    isArchived?: boolean
    adminFee?: boolean
    adminFeeType?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["wallet"]>

  export type WalletSelectScalar = {
    id?: boolean
    userId?: boolean
    name?: boolean
    type?: boolean
    balance?: boolean
    creditLimit?: boolean
    initialBalance?: boolean
    icon?: boolean
    color?: boolean
    interestRate?: boolean
    isArchived?: boolean
    adminFee?: boolean
    adminFeeType?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type WalletOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "userId" | "name" | "type" | "balance" | "creditLimit" | "initialBalance" | "icon" | "color" | "interestRate" | "isArchived" | "adminFee" | "adminFeeType" | "createdAt" | "updatedAt", ExtArgs["result"]["wallet"]>
  export type WalletInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    transactions?: boolean | Wallet$transactionsArgs<ExtArgs>
    toTransactions?: boolean | Wallet$toTransactionsArgs<ExtArgs>
    installments?: boolean | Wallet$installmentsArgs<ExtArgs>
    fromTransfers?: boolean | Wallet$fromTransfersArgs<ExtArgs>
    toTransfers?: boolean | Wallet$toTransfersArgs<ExtArgs>
    _count?: boolean | WalletCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type WalletIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type WalletIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $WalletPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Wallet"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
      transactions: Prisma.$TransactionPayload<ExtArgs>[]
      toTransactions: Prisma.$TransactionPayload<ExtArgs>[]
      installments: Prisma.$InstallmentPayload<ExtArgs>[]
      fromTransfers: Prisma.$TransferPayload<ExtArgs>[]
      toTransfers: Prisma.$TransferPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      userId: string
      name: string
      type: $Enums.WalletType
      balance: Prisma.Decimal
      creditLimit: Prisma.Decimal
      initialBalance: Prisma.Decimal
      icon: string | null
      color: string | null
      interestRate: Prisma.Decimal
      isArchived: boolean
      adminFee: Prisma.Decimal
      adminFeeType: $Enums.AdminFeeType
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["wallet"]>
    composites: {}
  }

  type WalletGetPayload<S extends boolean | null | undefined | WalletDefaultArgs> = $Result.GetResult<Prisma.$WalletPayload, S>

  type WalletCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<WalletFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: WalletCountAggregateInputType | true
    }

  export interface WalletDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Wallet'], meta: { name: 'Wallet' } }
    /**
     * Find zero or one Wallet that matches the filter.
     * @param {WalletFindUniqueArgs} args - Arguments to find a Wallet
     * @example
     * // Get one Wallet
     * const wallet = await prisma.wallet.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends WalletFindUniqueArgs>(args: SelectSubset<T, WalletFindUniqueArgs<ExtArgs>>): Prisma__WalletClient<$Result.GetResult<Prisma.$WalletPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Wallet that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {WalletFindUniqueOrThrowArgs} args - Arguments to find a Wallet
     * @example
     * // Get one Wallet
     * const wallet = await prisma.wallet.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends WalletFindUniqueOrThrowArgs>(args: SelectSubset<T, WalletFindUniqueOrThrowArgs<ExtArgs>>): Prisma__WalletClient<$Result.GetResult<Prisma.$WalletPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Wallet that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WalletFindFirstArgs} args - Arguments to find a Wallet
     * @example
     * // Get one Wallet
     * const wallet = await prisma.wallet.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends WalletFindFirstArgs>(args?: SelectSubset<T, WalletFindFirstArgs<ExtArgs>>): Prisma__WalletClient<$Result.GetResult<Prisma.$WalletPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Wallet that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WalletFindFirstOrThrowArgs} args - Arguments to find a Wallet
     * @example
     * // Get one Wallet
     * const wallet = await prisma.wallet.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends WalletFindFirstOrThrowArgs>(args?: SelectSubset<T, WalletFindFirstOrThrowArgs<ExtArgs>>): Prisma__WalletClient<$Result.GetResult<Prisma.$WalletPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Wallets that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WalletFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Wallets
     * const wallets = await prisma.wallet.findMany()
     * 
     * // Get first 10 Wallets
     * const wallets = await prisma.wallet.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const walletWithIdOnly = await prisma.wallet.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends WalletFindManyArgs>(args?: SelectSubset<T, WalletFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$WalletPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Wallet.
     * @param {WalletCreateArgs} args - Arguments to create a Wallet.
     * @example
     * // Create one Wallet
     * const Wallet = await prisma.wallet.create({
     *   data: {
     *     // ... data to create a Wallet
     *   }
     * })
     * 
     */
    create<T extends WalletCreateArgs>(args: SelectSubset<T, WalletCreateArgs<ExtArgs>>): Prisma__WalletClient<$Result.GetResult<Prisma.$WalletPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Wallets.
     * @param {WalletCreateManyArgs} args - Arguments to create many Wallets.
     * @example
     * // Create many Wallets
     * const wallet = await prisma.wallet.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends WalletCreateManyArgs>(args?: SelectSubset<T, WalletCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Wallets and returns the data saved in the database.
     * @param {WalletCreateManyAndReturnArgs} args - Arguments to create many Wallets.
     * @example
     * // Create many Wallets
     * const wallet = await prisma.wallet.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Wallets and only return the `id`
     * const walletWithIdOnly = await prisma.wallet.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends WalletCreateManyAndReturnArgs>(args?: SelectSubset<T, WalletCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$WalletPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Wallet.
     * @param {WalletDeleteArgs} args - Arguments to delete one Wallet.
     * @example
     * // Delete one Wallet
     * const Wallet = await prisma.wallet.delete({
     *   where: {
     *     // ... filter to delete one Wallet
     *   }
     * })
     * 
     */
    delete<T extends WalletDeleteArgs>(args: SelectSubset<T, WalletDeleteArgs<ExtArgs>>): Prisma__WalletClient<$Result.GetResult<Prisma.$WalletPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Wallet.
     * @param {WalletUpdateArgs} args - Arguments to update one Wallet.
     * @example
     * // Update one Wallet
     * const wallet = await prisma.wallet.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends WalletUpdateArgs>(args: SelectSubset<T, WalletUpdateArgs<ExtArgs>>): Prisma__WalletClient<$Result.GetResult<Prisma.$WalletPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Wallets.
     * @param {WalletDeleteManyArgs} args - Arguments to filter Wallets to delete.
     * @example
     * // Delete a few Wallets
     * const { count } = await prisma.wallet.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends WalletDeleteManyArgs>(args?: SelectSubset<T, WalletDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Wallets.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WalletUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Wallets
     * const wallet = await prisma.wallet.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends WalletUpdateManyArgs>(args: SelectSubset<T, WalletUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Wallets and returns the data updated in the database.
     * @param {WalletUpdateManyAndReturnArgs} args - Arguments to update many Wallets.
     * @example
     * // Update many Wallets
     * const wallet = await prisma.wallet.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Wallets and only return the `id`
     * const walletWithIdOnly = await prisma.wallet.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends WalletUpdateManyAndReturnArgs>(args: SelectSubset<T, WalletUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$WalletPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Wallet.
     * @param {WalletUpsertArgs} args - Arguments to update or create a Wallet.
     * @example
     * // Update or create a Wallet
     * const wallet = await prisma.wallet.upsert({
     *   create: {
     *     // ... data to create a Wallet
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Wallet we want to update
     *   }
     * })
     */
    upsert<T extends WalletUpsertArgs>(args: SelectSubset<T, WalletUpsertArgs<ExtArgs>>): Prisma__WalletClient<$Result.GetResult<Prisma.$WalletPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Wallets.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WalletCountArgs} args - Arguments to filter Wallets to count.
     * @example
     * // Count the number of Wallets
     * const count = await prisma.wallet.count({
     *   where: {
     *     // ... the filter for the Wallets we want to count
     *   }
     * })
    **/
    count<T extends WalletCountArgs>(
      args?: Subset<T, WalletCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], WalletCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Wallet.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WalletAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
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
    aggregate<T extends WalletAggregateArgs>(args: Subset<T, WalletAggregateArgs>): Prisma.PrismaPromise<GetWalletAggregateType<T>>

    /**
     * Group by Wallet.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WalletGroupByArgs} args - Group by arguments.
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
      T extends WalletGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: WalletGroupByArgs['orderBy'] }
        : { orderBy?: WalletGroupByArgs['orderBy'] },
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
    >(args: SubsetIntersection<T, WalletGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetWalletGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Wallet model
   */
  readonly fields: WalletFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Wallet.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__WalletClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    transactions<T extends Wallet$transactionsArgs<ExtArgs> = {}>(args?: Subset<T, Wallet$transactionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TransactionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    toTransactions<T extends Wallet$toTransactionsArgs<ExtArgs> = {}>(args?: Subset<T, Wallet$toTransactionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TransactionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    installments<T extends Wallet$installmentsArgs<ExtArgs> = {}>(args?: Subset<T, Wallet$installmentsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$InstallmentPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    fromTransfers<T extends Wallet$fromTransfersArgs<ExtArgs> = {}>(args?: Subset<T, Wallet$fromTransfersArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TransferPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    toTransfers<T extends Wallet$toTransfersArgs<ExtArgs> = {}>(args?: Subset<T, Wallet$toTransfersArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TransferPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Wallet model
   */
  interface WalletFieldRefs {
    readonly id: FieldRef<"Wallet", 'String'>
    readonly userId: FieldRef<"Wallet", 'String'>
    readonly name: FieldRef<"Wallet", 'String'>
    readonly type: FieldRef<"Wallet", 'WalletType'>
    readonly balance: FieldRef<"Wallet", 'Decimal'>
    readonly creditLimit: FieldRef<"Wallet", 'Decimal'>
    readonly initialBalance: FieldRef<"Wallet", 'Decimal'>
    readonly icon: FieldRef<"Wallet", 'String'>
    readonly color: FieldRef<"Wallet", 'String'>
    readonly interestRate: FieldRef<"Wallet", 'Decimal'>
    readonly isArchived: FieldRef<"Wallet", 'Boolean'>
    readonly adminFee: FieldRef<"Wallet", 'Decimal'>
    readonly adminFeeType: FieldRef<"Wallet", 'AdminFeeType'>
    readonly createdAt: FieldRef<"Wallet", 'DateTime'>
    readonly updatedAt: FieldRef<"Wallet", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Wallet findUnique
   */
  export type WalletFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Wallet
     */
    select?: WalletSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Wallet
     */
    omit?: WalletOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WalletInclude<ExtArgs> | null
    /**
     * Filter, which Wallet to fetch.
     */
    where: WalletWhereUniqueInput
  }

  /**
   * Wallet findUniqueOrThrow
   */
  export type WalletFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Wallet
     */
    select?: WalletSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Wallet
     */
    omit?: WalletOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WalletInclude<ExtArgs> | null
    /**
     * Filter, which Wallet to fetch.
     */
    where: WalletWhereUniqueInput
  }

  /**
   * Wallet findFirst
   */
  export type WalletFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Wallet
     */
    select?: WalletSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Wallet
     */
    omit?: WalletOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WalletInclude<ExtArgs> | null
    /**
     * Filter, which Wallet to fetch.
     */
    where?: WalletWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Wallets to fetch.
     */
    orderBy?: WalletOrderByWithRelationInput | WalletOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Wallets.
     */
    cursor?: WalletWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Wallets from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Wallets.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Wallets.
     */
    distinct?: WalletScalarFieldEnum | WalletScalarFieldEnum[]
  }

  /**
   * Wallet findFirstOrThrow
   */
  export type WalletFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Wallet
     */
    select?: WalletSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Wallet
     */
    omit?: WalletOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WalletInclude<ExtArgs> | null
    /**
     * Filter, which Wallet to fetch.
     */
    where?: WalletWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Wallets to fetch.
     */
    orderBy?: WalletOrderByWithRelationInput | WalletOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Wallets.
     */
    cursor?: WalletWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Wallets from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Wallets.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Wallets.
     */
    distinct?: WalletScalarFieldEnum | WalletScalarFieldEnum[]
  }

  /**
   * Wallet findMany
   */
  export type WalletFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Wallet
     */
    select?: WalletSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Wallet
     */
    omit?: WalletOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WalletInclude<ExtArgs> | null
    /**
     * Filter, which Wallets to fetch.
     */
    where?: WalletWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Wallets to fetch.
     */
    orderBy?: WalletOrderByWithRelationInput | WalletOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Wallets.
     */
    cursor?: WalletWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Wallets from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Wallets.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Wallets.
     */
    distinct?: WalletScalarFieldEnum | WalletScalarFieldEnum[]
  }

  /**
   * Wallet create
   */
  export type WalletCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Wallet
     */
    select?: WalletSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Wallet
     */
    omit?: WalletOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WalletInclude<ExtArgs> | null
    /**
     * The data needed to create a Wallet.
     */
    data: XOR<WalletCreateInput, WalletUncheckedCreateInput>
  }

  /**
   * Wallet createMany
   */
  export type WalletCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Wallets.
     */
    data: WalletCreateManyInput | WalletCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Wallet createManyAndReturn
   */
  export type WalletCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Wallet
     */
    select?: WalletSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Wallet
     */
    omit?: WalletOmit<ExtArgs> | null
    /**
     * The data used to create many Wallets.
     */
    data: WalletCreateManyInput | WalletCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WalletIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Wallet update
   */
  export type WalletUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Wallet
     */
    select?: WalletSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Wallet
     */
    omit?: WalletOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WalletInclude<ExtArgs> | null
    /**
     * The data needed to update a Wallet.
     */
    data: XOR<WalletUpdateInput, WalletUncheckedUpdateInput>
    /**
     * Choose, which Wallet to update.
     */
    where: WalletWhereUniqueInput
  }

  /**
   * Wallet updateMany
   */
  export type WalletUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Wallets.
     */
    data: XOR<WalletUpdateManyMutationInput, WalletUncheckedUpdateManyInput>
    /**
     * Filter which Wallets to update
     */
    where?: WalletWhereInput
    /**
     * Limit how many Wallets to update.
     */
    limit?: number
  }

  /**
   * Wallet updateManyAndReturn
   */
  export type WalletUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Wallet
     */
    select?: WalletSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Wallet
     */
    omit?: WalletOmit<ExtArgs> | null
    /**
     * The data used to update Wallets.
     */
    data: XOR<WalletUpdateManyMutationInput, WalletUncheckedUpdateManyInput>
    /**
     * Filter which Wallets to update
     */
    where?: WalletWhereInput
    /**
     * Limit how many Wallets to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WalletIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Wallet upsert
   */
  export type WalletUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Wallet
     */
    select?: WalletSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Wallet
     */
    omit?: WalletOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WalletInclude<ExtArgs> | null
    /**
     * The filter to search for the Wallet to update in case it exists.
     */
    where: WalletWhereUniqueInput
    /**
     * In case the Wallet found by the `where` argument doesn't exist, create a new Wallet with this data.
     */
    create: XOR<WalletCreateInput, WalletUncheckedCreateInput>
    /**
     * In case the Wallet was found with the provided `where` argument, update it with this data.
     */
    update: XOR<WalletUpdateInput, WalletUncheckedUpdateInput>
  }

  /**
   * Wallet delete
   */
  export type WalletDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Wallet
     */
    select?: WalletSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Wallet
     */
    omit?: WalletOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WalletInclude<ExtArgs> | null
    /**
     * Filter which Wallet to delete.
     */
    where: WalletWhereUniqueInput
  }

  /**
   * Wallet deleteMany
   */
  export type WalletDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Wallets to delete
     */
    where?: WalletWhereInput
    /**
     * Limit how many Wallets to delete.
     */
    limit?: number
  }

  /**
   * Wallet.transactions
   */
  export type Wallet$transactionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionInclude<ExtArgs> | null
    where?: TransactionWhereInput
    orderBy?: TransactionOrderByWithRelationInput | TransactionOrderByWithRelationInput[]
    cursor?: TransactionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TransactionScalarFieldEnum | TransactionScalarFieldEnum[]
  }

  /**
   * Wallet.toTransactions
   */
  export type Wallet$toTransactionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionInclude<ExtArgs> | null
    where?: TransactionWhereInput
    orderBy?: TransactionOrderByWithRelationInput | TransactionOrderByWithRelationInput[]
    cursor?: TransactionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TransactionScalarFieldEnum | TransactionScalarFieldEnum[]
  }

  /**
   * Wallet.installments
   */
  export type Wallet$installmentsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Installment
     */
    select?: InstallmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Installment
     */
    omit?: InstallmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstallmentInclude<ExtArgs> | null
    where?: InstallmentWhereInput
    orderBy?: InstallmentOrderByWithRelationInput | InstallmentOrderByWithRelationInput[]
    cursor?: InstallmentWhereUniqueInput
    take?: number
    skip?: number
    distinct?: InstallmentScalarFieldEnum | InstallmentScalarFieldEnum[]
  }

  /**
   * Wallet.fromTransfers
   */
  export type Wallet$fromTransfersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transfer
     */
    select?: TransferSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transfer
     */
    omit?: TransferOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransferInclude<ExtArgs> | null
    where?: TransferWhereInput
    orderBy?: TransferOrderByWithRelationInput | TransferOrderByWithRelationInput[]
    cursor?: TransferWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TransferScalarFieldEnum | TransferScalarFieldEnum[]
  }

  /**
   * Wallet.toTransfers
   */
  export type Wallet$toTransfersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transfer
     */
    select?: TransferSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transfer
     */
    omit?: TransferOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransferInclude<ExtArgs> | null
    where?: TransferWhereInput
    orderBy?: TransferOrderByWithRelationInput | TransferOrderByWithRelationInput[]
    cursor?: TransferWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TransferScalarFieldEnum | TransferScalarFieldEnum[]
  }

  /**
   * Wallet without action
   */
  export type WalletDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Wallet
     */
    select?: WalletSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Wallet
     */
    omit?: WalletOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WalletInclude<ExtArgs> | null
  }


  /**
   * Model Category
   */

  export type AggregateCategory = {
    _count: CategoryCountAggregateOutputType | null
    _min: CategoryMinAggregateOutputType | null
    _max: CategoryMaxAggregateOutputType | null
  }

  export type CategoryMinAggregateOutputType = {
    id: string | null
    userId: string | null
    name: string | null
    type: $Enums.CategoryType | null
    icon: string | null
    color: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type CategoryMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    name: string | null
    type: $Enums.CategoryType | null
    icon: string | null
    color: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type CategoryCountAggregateOutputType = {
    id: number
    userId: number
    name: number
    type: number
    icon: number
    color: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type CategoryMinAggregateInputType = {
    id?: true
    userId?: true
    name?: true
    type?: true
    icon?: true
    color?: true
    createdAt?: true
    updatedAt?: true
  }

  export type CategoryMaxAggregateInputType = {
    id?: true
    userId?: true
    name?: true
    type?: true
    icon?: true
    color?: true
    createdAt?: true
    updatedAt?: true
  }

  export type CategoryCountAggregateInputType = {
    id?: true
    userId?: true
    name?: true
    type?: true
    icon?: true
    color?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type CategoryAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Category to aggregate.
     */
    where?: CategoryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Categories to fetch.
     */
    orderBy?: CategoryOrderByWithRelationInput | CategoryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: CategoryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Categories from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Categories.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Categories
    **/
    _count?: true | CategoryCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: CategoryMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: CategoryMaxAggregateInputType
  }

  export type GetCategoryAggregateType<T extends CategoryAggregateArgs> = {
        [P in keyof T & keyof AggregateCategory]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateCategory[P]>
      : GetScalarType<T[P], AggregateCategory[P]>
  }




  export type CategoryGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CategoryWhereInput
    orderBy?: CategoryOrderByWithAggregationInput | CategoryOrderByWithAggregationInput[]
    by: CategoryScalarFieldEnum[] | CategoryScalarFieldEnum
    having?: CategoryScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: CategoryCountAggregateInputType | true
    _min?: CategoryMinAggregateInputType
    _max?: CategoryMaxAggregateInputType
  }

  export type CategoryGroupByOutputType = {
    id: string
    userId: string
    name: string
    type: $Enums.CategoryType
    icon: string | null
    color: string | null
    createdAt: Date
    updatedAt: Date
    _count: CategoryCountAggregateOutputType | null
    _min: CategoryMinAggregateOutputType | null
    _max: CategoryMaxAggregateOutputType | null
  }

  type GetCategoryGroupByPayload<T extends CategoryGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<CategoryGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof CategoryGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], CategoryGroupByOutputType[P]>
            : GetScalarType<T[P], CategoryGroupByOutputType[P]>
        }
      >
    >


  export type CategorySelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    name?: boolean
    type?: boolean
    icon?: boolean
    color?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    transactions?: boolean | Category$transactionsArgs<ExtArgs>
    _count?: boolean | CategoryCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["category"]>

  export type CategorySelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    name?: boolean
    type?: boolean
    icon?: boolean
    color?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["category"]>

  export type CategorySelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    name?: boolean
    type?: boolean
    icon?: boolean
    color?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["category"]>

  export type CategorySelectScalar = {
    id?: boolean
    userId?: boolean
    name?: boolean
    type?: boolean
    icon?: boolean
    color?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type CategoryOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "userId" | "name" | "type" | "icon" | "color" | "createdAt" | "updatedAt", ExtArgs["result"]["category"]>
  export type CategoryInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    transactions?: boolean | Category$transactionsArgs<ExtArgs>
    _count?: boolean | CategoryCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type CategoryIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type CategoryIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $CategoryPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Category"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
      transactions: Prisma.$TransactionPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      userId: string
      name: string
      type: $Enums.CategoryType
      icon: string | null
      color: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["category"]>
    composites: {}
  }

  type CategoryGetPayload<S extends boolean | null | undefined | CategoryDefaultArgs> = $Result.GetResult<Prisma.$CategoryPayload, S>

  type CategoryCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<CategoryFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: CategoryCountAggregateInputType | true
    }

  export interface CategoryDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Category'], meta: { name: 'Category' } }
    /**
     * Find zero or one Category that matches the filter.
     * @param {CategoryFindUniqueArgs} args - Arguments to find a Category
     * @example
     * // Get one Category
     * const category = await prisma.category.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends CategoryFindUniqueArgs>(args: SelectSubset<T, CategoryFindUniqueArgs<ExtArgs>>): Prisma__CategoryClient<$Result.GetResult<Prisma.$CategoryPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Category that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {CategoryFindUniqueOrThrowArgs} args - Arguments to find a Category
     * @example
     * // Get one Category
     * const category = await prisma.category.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends CategoryFindUniqueOrThrowArgs>(args: SelectSubset<T, CategoryFindUniqueOrThrowArgs<ExtArgs>>): Prisma__CategoryClient<$Result.GetResult<Prisma.$CategoryPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Category that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CategoryFindFirstArgs} args - Arguments to find a Category
     * @example
     * // Get one Category
     * const category = await prisma.category.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends CategoryFindFirstArgs>(args?: SelectSubset<T, CategoryFindFirstArgs<ExtArgs>>): Prisma__CategoryClient<$Result.GetResult<Prisma.$CategoryPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Category that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CategoryFindFirstOrThrowArgs} args - Arguments to find a Category
     * @example
     * // Get one Category
     * const category = await prisma.category.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends CategoryFindFirstOrThrowArgs>(args?: SelectSubset<T, CategoryFindFirstOrThrowArgs<ExtArgs>>): Prisma__CategoryClient<$Result.GetResult<Prisma.$CategoryPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Categories that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CategoryFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Categories
     * const categories = await prisma.category.findMany()
     * 
     * // Get first 10 Categories
     * const categories = await prisma.category.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const categoryWithIdOnly = await prisma.category.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends CategoryFindManyArgs>(args?: SelectSubset<T, CategoryFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CategoryPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Category.
     * @param {CategoryCreateArgs} args - Arguments to create a Category.
     * @example
     * // Create one Category
     * const Category = await prisma.category.create({
     *   data: {
     *     // ... data to create a Category
     *   }
     * })
     * 
     */
    create<T extends CategoryCreateArgs>(args: SelectSubset<T, CategoryCreateArgs<ExtArgs>>): Prisma__CategoryClient<$Result.GetResult<Prisma.$CategoryPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Categories.
     * @param {CategoryCreateManyArgs} args - Arguments to create many Categories.
     * @example
     * // Create many Categories
     * const category = await prisma.category.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends CategoryCreateManyArgs>(args?: SelectSubset<T, CategoryCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Categories and returns the data saved in the database.
     * @param {CategoryCreateManyAndReturnArgs} args - Arguments to create many Categories.
     * @example
     * // Create many Categories
     * const category = await prisma.category.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Categories and only return the `id`
     * const categoryWithIdOnly = await prisma.category.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends CategoryCreateManyAndReturnArgs>(args?: SelectSubset<T, CategoryCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CategoryPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Category.
     * @param {CategoryDeleteArgs} args - Arguments to delete one Category.
     * @example
     * // Delete one Category
     * const Category = await prisma.category.delete({
     *   where: {
     *     // ... filter to delete one Category
     *   }
     * })
     * 
     */
    delete<T extends CategoryDeleteArgs>(args: SelectSubset<T, CategoryDeleteArgs<ExtArgs>>): Prisma__CategoryClient<$Result.GetResult<Prisma.$CategoryPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Category.
     * @param {CategoryUpdateArgs} args - Arguments to update one Category.
     * @example
     * // Update one Category
     * const category = await prisma.category.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends CategoryUpdateArgs>(args: SelectSubset<T, CategoryUpdateArgs<ExtArgs>>): Prisma__CategoryClient<$Result.GetResult<Prisma.$CategoryPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Categories.
     * @param {CategoryDeleteManyArgs} args - Arguments to filter Categories to delete.
     * @example
     * // Delete a few Categories
     * const { count } = await prisma.category.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends CategoryDeleteManyArgs>(args?: SelectSubset<T, CategoryDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Categories.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CategoryUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Categories
     * const category = await prisma.category.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends CategoryUpdateManyArgs>(args: SelectSubset<T, CategoryUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Categories and returns the data updated in the database.
     * @param {CategoryUpdateManyAndReturnArgs} args - Arguments to update many Categories.
     * @example
     * // Update many Categories
     * const category = await prisma.category.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Categories and only return the `id`
     * const categoryWithIdOnly = await prisma.category.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends CategoryUpdateManyAndReturnArgs>(args: SelectSubset<T, CategoryUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CategoryPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Category.
     * @param {CategoryUpsertArgs} args - Arguments to update or create a Category.
     * @example
     * // Update or create a Category
     * const category = await prisma.category.upsert({
     *   create: {
     *     // ... data to create a Category
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Category we want to update
     *   }
     * })
     */
    upsert<T extends CategoryUpsertArgs>(args: SelectSubset<T, CategoryUpsertArgs<ExtArgs>>): Prisma__CategoryClient<$Result.GetResult<Prisma.$CategoryPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Categories.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CategoryCountArgs} args - Arguments to filter Categories to count.
     * @example
     * // Count the number of Categories
     * const count = await prisma.category.count({
     *   where: {
     *     // ... the filter for the Categories we want to count
     *   }
     * })
    **/
    count<T extends CategoryCountArgs>(
      args?: Subset<T, CategoryCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], CategoryCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Category.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CategoryAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
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
    aggregate<T extends CategoryAggregateArgs>(args: Subset<T, CategoryAggregateArgs>): Prisma.PrismaPromise<GetCategoryAggregateType<T>>

    /**
     * Group by Category.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CategoryGroupByArgs} args - Group by arguments.
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
      T extends CategoryGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: CategoryGroupByArgs['orderBy'] }
        : { orderBy?: CategoryGroupByArgs['orderBy'] },
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
    >(args: SubsetIntersection<T, CategoryGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetCategoryGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Category model
   */
  readonly fields: CategoryFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Category.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__CategoryClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    transactions<T extends Category$transactionsArgs<ExtArgs> = {}>(args?: Subset<T, Category$transactionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TransactionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Category model
   */
  interface CategoryFieldRefs {
    readonly id: FieldRef<"Category", 'String'>
    readonly userId: FieldRef<"Category", 'String'>
    readonly name: FieldRef<"Category", 'String'>
    readonly type: FieldRef<"Category", 'CategoryType'>
    readonly icon: FieldRef<"Category", 'String'>
    readonly color: FieldRef<"Category", 'String'>
    readonly createdAt: FieldRef<"Category", 'DateTime'>
    readonly updatedAt: FieldRef<"Category", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Category findUnique
   */
  export type CategoryFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Category
     */
    select?: CategorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Category
     */
    omit?: CategoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CategoryInclude<ExtArgs> | null
    /**
     * Filter, which Category to fetch.
     */
    where: CategoryWhereUniqueInput
  }

  /**
   * Category findUniqueOrThrow
   */
  export type CategoryFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Category
     */
    select?: CategorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Category
     */
    omit?: CategoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CategoryInclude<ExtArgs> | null
    /**
     * Filter, which Category to fetch.
     */
    where: CategoryWhereUniqueInput
  }

  /**
   * Category findFirst
   */
  export type CategoryFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Category
     */
    select?: CategorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Category
     */
    omit?: CategoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CategoryInclude<ExtArgs> | null
    /**
     * Filter, which Category to fetch.
     */
    where?: CategoryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Categories to fetch.
     */
    orderBy?: CategoryOrderByWithRelationInput | CategoryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Categories.
     */
    cursor?: CategoryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Categories from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Categories.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Categories.
     */
    distinct?: CategoryScalarFieldEnum | CategoryScalarFieldEnum[]
  }

  /**
   * Category findFirstOrThrow
   */
  export type CategoryFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Category
     */
    select?: CategorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Category
     */
    omit?: CategoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CategoryInclude<ExtArgs> | null
    /**
     * Filter, which Category to fetch.
     */
    where?: CategoryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Categories to fetch.
     */
    orderBy?: CategoryOrderByWithRelationInput | CategoryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Categories.
     */
    cursor?: CategoryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Categories from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Categories.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Categories.
     */
    distinct?: CategoryScalarFieldEnum | CategoryScalarFieldEnum[]
  }

  /**
   * Category findMany
   */
  export type CategoryFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Category
     */
    select?: CategorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Category
     */
    omit?: CategoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CategoryInclude<ExtArgs> | null
    /**
     * Filter, which Categories to fetch.
     */
    where?: CategoryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Categories to fetch.
     */
    orderBy?: CategoryOrderByWithRelationInput | CategoryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Categories.
     */
    cursor?: CategoryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Categories from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Categories.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Categories.
     */
    distinct?: CategoryScalarFieldEnum | CategoryScalarFieldEnum[]
  }

  /**
   * Category create
   */
  export type CategoryCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Category
     */
    select?: CategorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Category
     */
    omit?: CategoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CategoryInclude<ExtArgs> | null
    /**
     * The data needed to create a Category.
     */
    data: XOR<CategoryCreateInput, CategoryUncheckedCreateInput>
  }

  /**
   * Category createMany
   */
  export type CategoryCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Categories.
     */
    data: CategoryCreateManyInput | CategoryCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Category createManyAndReturn
   */
  export type CategoryCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Category
     */
    select?: CategorySelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Category
     */
    omit?: CategoryOmit<ExtArgs> | null
    /**
     * The data used to create many Categories.
     */
    data: CategoryCreateManyInput | CategoryCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CategoryIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Category update
   */
  export type CategoryUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Category
     */
    select?: CategorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Category
     */
    omit?: CategoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CategoryInclude<ExtArgs> | null
    /**
     * The data needed to update a Category.
     */
    data: XOR<CategoryUpdateInput, CategoryUncheckedUpdateInput>
    /**
     * Choose, which Category to update.
     */
    where: CategoryWhereUniqueInput
  }

  /**
   * Category updateMany
   */
  export type CategoryUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Categories.
     */
    data: XOR<CategoryUpdateManyMutationInput, CategoryUncheckedUpdateManyInput>
    /**
     * Filter which Categories to update
     */
    where?: CategoryWhereInput
    /**
     * Limit how many Categories to update.
     */
    limit?: number
  }

  /**
   * Category updateManyAndReturn
   */
  export type CategoryUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Category
     */
    select?: CategorySelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Category
     */
    omit?: CategoryOmit<ExtArgs> | null
    /**
     * The data used to update Categories.
     */
    data: XOR<CategoryUpdateManyMutationInput, CategoryUncheckedUpdateManyInput>
    /**
     * Filter which Categories to update
     */
    where?: CategoryWhereInput
    /**
     * Limit how many Categories to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CategoryIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Category upsert
   */
  export type CategoryUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Category
     */
    select?: CategorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Category
     */
    omit?: CategoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CategoryInclude<ExtArgs> | null
    /**
     * The filter to search for the Category to update in case it exists.
     */
    where: CategoryWhereUniqueInput
    /**
     * In case the Category found by the `where` argument doesn't exist, create a new Category with this data.
     */
    create: XOR<CategoryCreateInput, CategoryUncheckedCreateInput>
    /**
     * In case the Category was found with the provided `where` argument, update it with this data.
     */
    update: XOR<CategoryUpdateInput, CategoryUncheckedUpdateInput>
  }

  /**
   * Category delete
   */
  export type CategoryDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Category
     */
    select?: CategorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Category
     */
    omit?: CategoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CategoryInclude<ExtArgs> | null
    /**
     * Filter which Category to delete.
     */
    where: CategoryWhereUniqueInput
  }

  /**
   * Category deleteMany
   */
  export type CategoryDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Categories to delete
     */
    where?: CategoryWhereInput
    /**
     * Limit how many Categories to delete.
     */
    limit?: number
  }

  /**
   * Category.transactions
   */
  export type Category$transactionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionInclude<ExtArgs> | null
    where?: TransactionWhereInput
    orderBy?: TransactionOrderByWithRelationInput | TransactionOrderByWithRelationInput[]
    cursor?: TransactionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TransactionScalarFieldEnum | TransactionScalarFieldEnum[]
  }

  /**
   * Category without action
   */
  export type CategoryDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Category
     */
    select?: CategorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Category
     */
    omit?: CategoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CategoryInclude<ExtArgs> | null
  }


  /**
   * Model Transaction
   */

  export type AggregateTransaction = {
    _count: TransactionCountAggregateOutputType | null
    _avg: TransactionAvgAggregateOutputType | null
    _sum: TransactionSumAggregateOutputType | null
    _min: TransactionMinAggregateOutputType | null
    _max: TransactionMaxAggregateOutputType | null
  }

  export type TransactionAvgAggregateOutputType = {
    amount: Decimal | null
  }

  export type TransactionSumAggregateOutputType = {
    amount: Decimal | null
  }

  export type TransactionMinAggregateOutputType = {
    id: string | null
    userId: string | null
    walletId: string | null
    toWalletId: string | null
    categoryId: string | null
    type: $Enums.TransactionType | null
    amount: Decimal | null
    description: string | null
    isInstallment: boolean | null
    installmentId: string | null
    date: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type TransactionMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    walletId: string | null
    toWalletId: string | null
    categoryId: string | null
    type: $Enums.TransactionType | null
    amount: Decimal | null
    description: string | null
    isInstallment: boolean | null
    installmentId: string | null
    date: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type TransactionCountAggregateOutputType = {
    id: number
    userId: number
    walletId: number
    toWalletId: number
    categoryId: number
    type: number
    amount: number
    description: number
    isInstallment: number
    installmentId: number
    date: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type TransactionAvgAggregateInputType = {
    amount?: true
  }

  export type TransactionSumAggregateInputType = {
    amount?: true
  }

  export type TransactionMinAggregateInputType = {
    id?: true
    userId?: true
    walletId?: true
    toWalletId?: true
    categoryId?: true
    type?: true
    amount?: true
    description?: true
    isInstallment?: true
    installmentId?: true
    date?: true
    createdAt?: true
    updatedAt?: true
  }

  export type TransactionMaxAggregateInputType = {
    id?: true
    userId?: true
    walletId?: true
    toWalletId?: true
    categoryId?: true
    type?: true
    amount?: true
    description?: true
    isInstallment?: true
    installmentId?: true
    date?: true
    createdAt?: true
    updatedAt?: true
  }

  export type TransactionCountAggregateInputType = {
    id?: true
    userId?: true
    walletId?: true
    toWalletId?: true
    categoryId?: true
    type?: true
    amount?: true
    description?: true
    isInstallment?: true
    installmentId?: true
    date?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type TransactionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Transaction to aggregate.
     */
    where?: TransactionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Transactions to fetch.
     */
    orderBy?: TransactionOrderByWithRelationInput | TransactionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: TransactionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Transactions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Transactions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Transactions
    **/
    _count?: true | TransactionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: TransactionAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: TransactionSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: TransactionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: TransactionMaxAggregateInputType
  }

  export type GetTransactionAggregateType<T extends TransactionAggregateArgs> = {
        [P in keyof T & keyof AggregateTransaction]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateTransaction[P]>
      : GetScalarType<T[P], AggregateTransaction[P]>
  }




  export type TransactionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TransactionWhereInput
    orderBy?: TransactionOrderByWithAggregationInput | TransactionOrderByWithAggregationInput[]
    by: TransactionScalarFieldEnum[] | TransactionScalarFieldEnum
    having?: TransactionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: TransactionCountAggregateInputType | true
    _avg?: TransactionAvgAggregateInputType
    _sum?: TransactionSumAggregateInputType
    _min?: TransactionMinAggregateInputType
    _max?: TransactionMaxAggregateInputType
  }

  export type TransactionGroupByOutputType = {
    id: string
    userId: string
    walletId: string
    toWalletId: string | null
    categoryId: string | null
    type: $Enums.TransactionType
    amount: Decimal
    description: string | null
    isInstallment: boolean
    installmentId: string | null
    date: Date
    createdAt: Date
    updatedAt: Date
    _count: TransactionCountAggregateOutputType | null
    _avg: TransactionAvgAggregateOutputType | null
    _sum: TransactionSumAggregateOutputType | null
    _min: TransactionMinAggregateOutputType | null
    _max: TransactionMaxAggregateOutputType | null
  }

  type GetTransactionGroupByPayload<T extends TransactionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<TransactionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof TransactionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], TransactionGroupByOutputType[P]>
            : GetScalarType<T[P], TransactionGroupByOutputType[P]>
        }
      >
    >


  export type TransactionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    walletId?: boolean
    toWalletId?: boolean
    categoryId?: boolean
    type?: boolean
    amount?: boolean
    description?: boolean
    isInstallment?: boolean
    installmentId?: boolean
    date?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    wallet?: boolean | WalletDefaultArgs<ExtArgs>
    toWallet?: boolean | Transaction$toWalletArgs<ExtArgs>
    category?: boolean | Transaction$categoryArgs<ExtArgs>
    installment?: boolean | Transaction$installmentArgs<ExtArgs>
  }, ExtArgs["result"]["transaction"]>

  export type TransactionSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    walletId?: boolean
    toWalletId?: boolean
    categoryId?: boolean
    type?: boolean
    amount?: boolean
    description?: boolean
    isInstallment?: boolean
    installmentId?: boolean
    date?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    wallet?: boolean | WalletDefaultArgs<ExtArgs>
    toWallet?: boolean | Transaction$toWalletArgs<ExtArgs>
    category?: boolean | Transaction$categoryArgs<ExtArgs>
    installment?: boolean | Transaction$installmentArgs<ExtArgs>
  }, ExtArgs["result"]["transaction"]>

  export type TransactionSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    walletId?: boolean
    toWalletId?: boolean
    categoryId?: boolean
    type?: boolean
    amount?: boolean
    description?: boolean
    isInstallment?: boolean
    installmentId?: boolean
    date?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    wallet?: boolean | WalletDefaultArgs<ExtArgs>
    toWallet?: boolean | Transaction$toWalletArgs<ExtArgs>
    category?: boolean | Transaction$categoryArgs<ExtArgs>
    installment?: boolean | Transaction$installmentArgs<ExtArgs>
  }, ExtArgs["result"]["transaction"]>

  export type TransactionSelectScalar = {
    id?: boolean
    userId?: boolean
    walletId?: boolean
    toWalletId?: boolean
    categoryId?: boolean
    type?: boolean
    amount?: boolean
    description?: boolean
    isInstallment?: boolean
    installmentId?: boolean
    date?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type TransactionOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "userId" | "walletId" | "toWalletId" | "categoryId" | "type" | "amount" | "description" | "isInstallment" | "installmentId" | "date" | "createdAt" | "updatedAt", ExtArgs["result"]["transaction"]>
  export type TransactionInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    wallet?: boolean | WalletDefaultArgs<ExtArgs>
    toWallet?: boolean | Transaction$toWalletArgs<ExtArgs>
    category?: boolean | Transaction$categoryArgs<ExtArgs>
    installment?: boolean | Transaction$installmentArgs<ExtArgs>
  }
  export type TransactionIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    wallet?: boolean | WalletDefaultArgs<ExtArgs>
    toWallet?: boolean | Transaction$toWalletArgs<ExtArgs>
    category?: boolean | Transaction$categoryArgs<ExtArgs>
    installment?: boolean | Transaction$installmentArgs<ExtArgs>
  }
  export type TransactionIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    wallet?: boolean | WalletDefaultArgs<ExtArgs>
    toWallet?: boolean | Transaction$toWalletArgs<ExtArgs>
    category?: boolean | Transaction$categoryArgs<ExtArgs>
    installment?: boolean | Transaction$installmentArgs<ExtArgs>
  }

  export type $TransactionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Transaction"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
      wallet: Prisma.$WalletPayload<ExtArgs>
      toWallet: Prisma.$WalletPayload<ExtArgs> | null
      category: Prisma.$CategoryPayload<ExtArgs> | null
      installment: Prisma.$InstallmentPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      userId: string
      walletId: string
      toWalletId: string | null
      categoryId: string | null
      type: $Enums.TransactionType
      amount: Prisma.Decimal
      description: string | null
      isInstallment: boolean
      installmentId: string | null
      date: Date
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["transaction"]>
    composites: {}
  }

  type TransactionGetPayload<S extends boolean | null | undefined | TransactionDefaultArgs> = $Result.GetResult<Prisma.$TransactionPayload, S>

  type TransactionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<TransactionFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: TransactionCountAggregateInputType | true
    }

  export interface TransactionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Transaction'], meta: { name: 'Transaction' } }
    /**
     * Find zero or one Transaction that matches the filter.
     * @param {TransactionFindUniqueArgs} args - Arguments to find a Transaction
     * @example
     * // Get one Transaction
     * const transaction = await prisma.transaction.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends TransactionFindUniqueArgs>(args: SelectSubset<T, TransactionFindUniqueArgs<ExtArgs>>): Prisma__TransactionClient<$Result.GetResult<Prisma.$TransactionPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Transaction that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {TransactionFindUniqueOrThrowArgs} args - Arguments to find a Transaction
     * @example
     * // Get one Transaction
     * const transaction = await prisma.transaction.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends TransactionFindUniqueOrThrowArgs>(args: SelectSubset<T, TransactionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__TransactionClient<$Result.GetResult<Prisma.$TransactionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Transaction that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TransactionFindFirstArgs} args - Arguments to find a Transaction
     * @example
     * // Get one Transaction
     * const transaction = await prisma.transaction.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends TransactionFindFirstArgs>(args?: SelectSubset<T, TransactionFindFirstArgs<ExtArgs>>): Prisma__TransactionClient<$Result.GetResult<Prisma.$TransactionPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Transaction that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TransactionFindFirstOrThrowArgs} args - Arguments to find a Transaction
     * @example
     * // Get one Transaction
     * const transaction = await prisma.transaction.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends TransactionFindFirstOrThrowArgs>(args?: SelectSubset<T, TransactionFindFirstOrThrowArgs<ExtArgs>>): Prisma__TransactionClient<$Result.GetResult<Prisma.$TransactionPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Transactions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TransactionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Transactions
     * const transactions = await prisma.transaction.findMany()
     * 
     * // Get first 10 Transactions
     * const transactions = await prisma.transaction.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const transactionWithIdOnly = await prisma.transaction.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends TransactionFindManyArgs>(args?: SelectSubset<T, TransactionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TransactionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Transaction.
     * @param {TransactionCreateArgs} args - Arguments to create a Transaction.
     * @example
     * // Create one Transaction
     * const Transaction = await prisma.transaction.create({
     *   data: {
     *     // ... data to create a Transaction
     *   }
     * })
     * 
     */
    create<T extends TransactionCreateArgs>(args: SelectSubset<T, TransactionCreateArgs<ExtArgs>>): Prisma__TransactionClient<$Result.GetResult<Prisma.$TransactionPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Transactions.
     * @param {TransactionCreateManyArgs} args - Arguments to create many Transactions.
     * @example
     * // Create many Transactions
     * const transaction = await prisma.transaction.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends TransactionCreateManyArgs>(args?: SelectSubset<T, TransactionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Transactions and returns the data saved in the database.
     * @param {TransactionCreateManyAndReturnArgs} args - Arguments to create many Transactions.
     * @example
     * // Create many Transactions
     * const transaction = await prisma.transaction.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Transactions and only return the `id`
     * const transactionWithIdOnly = await prisma.transaction.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends TransactionCreateManyAndReturnArgs>(args?: SelectSubset<T, TransactionCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TransactionPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Transaction.
     * @param {TransactionDeleteArgs} args - Arguments to delete one Transaction.
     * @example
     * // Delete one Transaction
     * const Transaction = await prisma.transaction.delete({
     *   where: {
     *     // ... filter to delete one Transaction
     *   }
     * })
     * 
     */
    delete<T extends TransactionDeleteArgs>(args: SelectSubset<T, TransactionDeleteArgs<ExtArgs>>): Prisma__TransactionClient<$Result.GetResult<Prisma.$TransactionPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Transaction.
     * @param {TransactionUpdateArgs} args - Arguments to update one Transaction.
     * @example
     * // Update one Transaction
     * const transaction = await prisma.transaction.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends TransactionUpdateArgs>(args: SelectSubset<T, TransactionUpdateArgs<ExtArgs>>): Prisma__TransactionClient<$Result.GetResult<Prisma.$TransactionPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Transactions.
     * @param {TransactionDeleteManyArgs} args - Arguments to filter Transactions to delete.
     * @example
     * // Delete a few Transactions
     * const { count } = await prisma.transaction.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends TransactionDeleteManyArgs>(args?: SelectSubset<T, TransactionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Transactions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TransactionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Transactions
     * const transaction = await prisma.transaction.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends TransactionUpdateManyArgs>(args: SelectSubset<T, TransactionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Transactions and returns the data updated in the database.
     * @param {TransactionUpdateManyAndReturnArgs} args - Arguments to update many Transactions.
     * @example
     * // Update many Transactions
     * const transaction = await prisma.transaction.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Transactions and only return the `id`
     * const transactionWithIdOnly = await prisma.transaction.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends TransactionUpdateManyAndReturnArgs>(args: SelectSubset<T, TransactionUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TransactionPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Transaction.
     * @param {TransactionUpsertArgs} args - Arguments to update or create a Transaction.
     * @example
     * // Update or create a Transaction
     * const transaction = await prisma.transaction.upsert({
     *   create: {
     *     // ... data to create a Transaction
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Transaction we want to update
     *   }
     * })
     */
    upsert<T extends TransactionUpsertArgs>(args: SelectSubset<T, TransactionUpsertArgs<ExtArgs>>): Prisma__TransactionClient<$Result.GetResult<Prisma.$TransactionPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Transactions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TransactionCountArgs} args - Arguments to filter Transactions to count.
     * @example
     * // Count the number of Transactions
     * const count = await prisma.transaction.count({
     *   where: {
     *     // ... the filter for the Transactions we want to count
     *   }
     * })
    **/
    count<T extends TransactionCountArgs>(
      args?: Subset<T, TransactionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], TransactionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Transaction.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TransactionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
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
    aggregate<T extends TransactionAggregateArgs>(args: Subset<T, TransactionAggregateArgs>): Prisma.PrismaPromise<GetTransactionAggregateType<T>>

    /**
     * Group by Transaction.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TransactionGroupByArgs} args - Group by arguments.
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
      T extends TransactionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: TransactionGroupByArgs['orderBy'] }
        : { orderBy?: TransactionGroupByArgs['orderBy'] },
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
    >(args: SubsetIntersection<T, TransactionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetTransactionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Transaction model
   */
  readonly fields: TransactionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Transaction.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__TransactionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    wallet<T extends WalletDefaultArgs<ExtArgs> = {}>(args?: Subset<T, WalletDefaultArgs<ExtArgs>>): Prisma__WalletClient<$Result.GetResult<Prisma.$WalletPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    toWallet<T extends Transaction$toWalletArgs<ExtArgs> = {}>(args?: Subset<T, Transaction$toWalletArgs<ExtArgs>>): Prisma__WalletClient<$Result.GetResult<Prisma.$WalletPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    category<T extends Transaction$categoryArgs<ExtArgs> = {}>(args?: Subset<T, Transaction$categoryArgs<ExtArgs>>): Prisma__CategoryClient<$Result.GetResult<Prisma.$CategoryPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    installment<T extends Transaction$installmentArgs<ExtArgs> = {}>(args?: Subset<T, Transaction$installmentArgs<ExtArgs>>): Prisma__InstallmentClient<$Result.GetResult<Prisma.$InstallmentPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Transaction model
   */
  interface TransactionFieldRefs {
    readonly id: FieldRef<"Transaction", 'String'>
    readonly userId: FieldRef<"Transaction", 'String'>
    readonly walletId: FieldRef<"Transaction", 'String'>
    readonly toWalletId: FieldRef<"Transaction", 'String'>
    readonly categoryId: FieldRef<"Transaction", 'String'>
    readonly type: FieldRef<"Transaction", 'TransactionType'>
    readonly amount: FieldRef<"Transaction", 'Decimal'>
    readonly description: FieldRef<"Transaction", 'String'>
    readonly isInstallment: FieldRef<"Transaction", 'Boolean'>
    readonly installmentId: FieldRef<"Transaction", 'String'>
    readonly date: FieldRef<"Transaction", 'DateTime'>
    readonly createdAt: FieldRef<"Transaction", 'DateTime'>
    readonly updatedAt: FieldRef<"Transaction", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Transaction findUnique
   */
  export type TransactionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionInclude<ExtArgs> | null
    /**
     * Filter, which Transaction to fetch.
     */
    where: TransactionWhereUniqueInput
  }

  /**
   * Transaction findUniqueOrThrow
   */
  export type TransactionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionInclude<ExtArgs> | null
    /**
     * Filter, which Transaction to fetch.
     */
    where: TransactionWhereUniqueInput
  }

  /**
   * Transaction findFirst
   */
  export type TransactionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionInclude<ExtArgs> | null
    /**
     * Filter, which Transaction to fetch.
     */
    where?: TransactionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Transactions to fetch.
     */
    orderBy?: TransactionOrderByWithRelationInput | TransactionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Transactions.
     */
    cursor?: TransactionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Transactions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Transactions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Transactions.
     */
    distinct?: TransactionScalarFieldEnum | TransactionScalarFieldEnum[]
  }

  /**
   * Transaction findFirstOrThrow
   */
  export type TransactionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionInclude<ExtArgs> | null
    /**
     * Filter, which Transaction to fetch.
     */
    where?: TransactionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Transactions to fetch.
     */
    orderBy?: TransactionOrderByWithRelationInput | TransactionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Transactions.
     */
    cursor?: TransactionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Transactions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Transactions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Transactions.
     */
    distinct?: TransactionScalarFieldEnum | TransactionScalarFieldEnum[]
  }

  /**
   * Transaction findMany
   */
  export type TransactionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionInclude<ExtArgs> | null
    /**
     * Filter, which Transactions to fetch.
     */
    where?: TransactionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Transactions to fetch.
     */
    orderBy?: TransactionOrderByWithRelationInput | TransactionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Transactions.
     */
    cursor?: TransactionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Transactions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Transactions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Transactions.
     */
    distinct?: TransactionScalarFieldEnum | TransactionScalarFieldEnum[]
  }

  /**
   * Transaction create
   */
  export type TransactionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionInclude<ExtArgs> | null
    /**
     * The data needed to create a Transaction.
     */
    data: XOR<TransactionCreateInput, TransactionUncheckedCreateInput>
  }

  /**
   * Transaction createMany
   */
  export type TransactionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Transactions.
     */
    data: TransactionCreateManyInput | TransactionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Transaction createManyAndReturn
   */
  export type TransactionCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * The data used to create many Transactions.
     */
    data: TransactionCreateManyInput | TransactionCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Transaction update
   */
  export type TransactionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionInclude<ExtArgs> | null
    /**
     * The data needed to update a Transaction.
     */
    data: XOR<TransactionUpdateInput, TransactionUncheckedUpdateInput>
    /**
     * Choose, which Transaction to update.
     */
    where: TransactionWhereUniqueInput
  }

  /**
   * Transaction updateMany
   */
  export type TransactionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Transactions.
     */
    data: XOR<TransactionUpdateManyMutationInput, TransactionUncheckedUpdateManyInput>
    /**
     * Filter which Transactions to update
     */
    where?: TransactionWhereInput
    /**
     * Limit how many Transactions to update.
     */
    limit?: number
  }

  /**
   * Transaction updateManyAndReturn
   */
  export type TransactionUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * The data used to update Transactions.
     */
    data: XOR<TransactionUpdateManyMutationInput, TransactionUncheckedUpdateManyInput>
    /**
     * Filter which Transactions to update
     */
    where?: TransactionWhereInput
    /**
     * Limit how many Transactions to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Transaction upsert
   */
  export type TransactionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionInclude<ExtArgs> | null
    /**
     * The filter to search for the Transaction to update in case it exists.
     */
    where: TransactionWhereUniqueInput
    /**
     * In case the Transaction found by the `where` argument doesn't exist, create a new Transaction with this data.
     */
    create: XOR<TransactionCreateInput, TransactionUncheckedCreateInput>
    /**
     * In case the Transaction was found with the provided `where` argument, update it with this data.
     */
    update: XOR<TransactionUpdateInput, TransactionUncheckedUpdateInput>
  }

  /**
   * Transaction delete
   */
  export type TransactionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionInclude<ExtArgs> | null
    /**
     * Filter which Transaction to delete.
     */
    where: TransactionWhereUniqueInput
  }

  /**
   * Transaction deleteMany
   */
  export type TransactionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Transactions to delete
     */
    where?: TransactionWhereInput
    /**
     * Limit how many Transactions to delete.
     */
    limit?: number
  }

  /**
   * Transaction.toWallet
   */
  export type Transaction$toWalletArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Wallet
     */
    select?: WalletSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Wallet
     */
    omit?: WalletOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WalletInclude<ExtArgs> | null
    where?: WalletWhereInput
  }

  /**
   * Transaction.category
   */
  export type Transaction$categoryArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Category
     */
    select?: CategorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Category
     */
    omit?: CategoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CategoryInclude<ExtArgs> | null
    where?: CategoryWhereInput
  }

  /**
   * Transaction.installment
   */
  export type Transaction$installmentArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Installment
     */
    select?: InstallmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Installment
     */
    omit?: InstallmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstallmentInclude<ExtArgs> | null
    where?: InstallmentWhereInput
  }

  /**
   * Transaction without action
   */
  export type TransactionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionInclude<ExtArgs> | null
  }


  /**
   * Model Installment
   */

  export type AggregateInstallment = {
    _count: InstallmentCountAggregateOutputType | null
    _avg: InstallmentAvgAggregateOutputType | null
    _sum: InstallmentSumAggregateOutputType | null
    _min: InstallmentMinAggregateOutputType | null
    _max: InstallmentMaxAggregateOutputType | null
  }

  export type InstallmentAvgAggregateOutputType = {
    totalAmount: Decimal | null
    interestRate: Decimal | null
    totalInterest: Decimal | null
    adminFee: Decimal | null
    totalAdminFee: Decimal | null
    grandTotal: Decimal | null
    installmentMonths: number | null
    currentTerm: number | null
    monthlyAmount: Decimal | null
  }

  export type InstallmentSumAggregateOutputType = {
    totalAmount: Decimal | null
    interestRate: Decimal | null
    totalInterest: Decimal | null
    adminFee: Decimal | null
    totalAdminFee: Decimal | null
    grandTotal: Decimal | null
    installmentMonths: number | null
    currentTerm: number | null
    monthlyAmount: Decimal | null
  }

  export type InstallmentMinAggregateOutputType = {
    id: string | null
    userId: string | null
    walletId: string | null
    totalAmount: Decimal | null
    interestRate: Decimal | null
    totalInterest: Decimal | null
    adminFee: Decimal | null
    adminFeeType: $Enums.AdminFeeType | null
    totalAdminFee: Decimal | null
    grandTotal: Decimal | null
    installmentMonths: number | null
    currentTerm: number | null
    monthlyAmount: Decimal | null
    status: $Enums.InstallmentStatus | null
    startDate: Date | null
    description: string | null
    balanceDeducted: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type InstallmentMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    walletId: string | null
    totalAmount: Decimal | null
    interestRate: Decimal | null
    totalInterest: Decimal | null
    adminFee: Decimal | null
    adminFeeType: $Enums.AdminFeeType | null
    totalAdminFee: Decimal | null
    grandTotal: Decimal | null
    installmentMonths: number | null
    currentTerm: number | null
    monthlyAmount: Decimal | null
    status: $Enums.InstallmentStatus | null
    startDate: Date | null
    description: string | null
    balanceDeducted: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type InstallmentCountAggregateOutputType = {
    id: number
    userId: number
    walletId: number
    totalAmount: number
    interestRate: number
    totalInterest: number
    adminFee: number
    adminFeeType: number
    totalAdminFee: number
    grandTotal: number
    installmentMonths: number
    currentTerm: number
    monthlyAmount: number
    status: number
    startDate: number
    description: number
    balanceDeducted: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type InstallmentAvgAggregateInputType = {
    totalAmount?: true
    interestRate?: true
    totalInterest?: true
    adminFee?: true
    totalAdminFee?: true
    grandTotal?: true
    installmentMonths?: true
    currentTerm?: true
    monthlyAmount?: true
  }

  export type InstallmentSumAggregateInputType = {
    totalAmount?: true
    interestRate?: true
    totalInterest?: true
    adminFee?: true
    totalAdminFee?: true
    grandTotal?: true
    installmentMonths?: true
    currentTerm?: true
    monthlyAmount?: true
  }

  export type InstallmentMinAggregateInputType = {
    id?: true
    userId?: true
    walletId?: true
    totalAmount?: true
    interestRate?: true
    totalInterest?: true
    adminFee?: true
    adminFeeType?: true
    totalAdminFee?: true
    grandTotal?: true
    installmentMonths?: true
    currentTerm?: true
    monthlyAmount?: true
    status?: true
    startDate?: true
    description?: true
    balanceDeducted?: true
    createdAt?: true
    updatedAt?: true
  }

  export type InstallmentMaxAggregateInputType = {
    id?: true
    userId?: true
    walletId?: true
    totalAmount?: true
    interestRate?: true
    totalInterest?: true
    adminFee?: true
    adminFeeType?: true
    totalAdminFee?: true
    grandTotal?: true
    installmentMonths?: true
    currentTerm?: true
    monthlyAmount?: true
    status?: true
    startDate?: true
    description?: true
    balanceDeducted?: true
    createdAt?: true
    updatedAt?: true
  }

  export type InstallmentCountAggregateInputType = {
    id?: true
    userId?: true
    walletId?: true
    totalAmount?: true
    interestRate?: true
    totalInterest?: true
    adminFee?: true
    adminFeeType?: true
    totalAdminFee?: true
    grandTotal?: true
    installmentMonths?: true
    currentTerm?: true
    monthlyAmount?: true
    status?: true
    startDate?: true
    description?: true
    balanceDeducted?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type InstallmentAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Installment to aggregate.
     */
    where?: InstallmentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Installments to fetch.
     */
    orderBy?: InstallmentOrderByWithRelationInput | InstallmentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: InstallmentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Installments from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Installments.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Installments
    **/
    _count?: true | InstallmentCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: InstallmentAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: InstallmentSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: InstallmentMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: InstallmentMaxAggregateInputType
  }

  export type GetInstallmentAggregateType<T extends InstallmentAggregateArgs> = {
        [P in keyof T & keyof AggregateInstallment]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateInstallment[P]>
      : GetScalarType<T[P], AggregateInstallment[P]>
  }




  export type InstallmentGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: InstallmentWhereInput
    orderBy?: InstallmentOrderByWithAggregationInput | InstallmentOrderByWithAggregationInput[]
    by: InstallmentScalarFieldEnum[] | InstallmentScalarFieldEnum
    having?: InstallmentScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: InstallmentCountAggregateInputType | true
    _avg?: InstallmentAvgAggregateInputType
    _sum?: InstallmentSumAggregateInputType
    _min?: InstallmentMinAggregateInputType
    _max?: InstallmentMaxAggregateInputType
  }

  export type InstallmentGroupByOutputType = {
    id: string
    userId: string
    walletId: string
    totalAmount: Decimal
    interestRate: Decimal
    totalInterest: Decimal
    adminFee: Decimal
    adminFeeType: $Enums.AdminFeeType
    totalAdminFee: Decimal
    grandTotal: Decimal
    installmentMonths: number
    currentTerm: number
    monthlyAmount: Decimal
    status: $Enums.InstallmentStatus
    startDate: Date
    description: string | null
    balanceDeducted: boolean
    createdAt: Date
    updatedAt: Date
    _count: InstallmentCountAggregateOutputType | null
    _avg: InstallmentAvgAggregateOutputType | null
    _sum: InstallmentSumAggregateOutputType | null
    _min: InstallmentMinAggregateOutputType | null
    _max: InstallmentMaxAggregateOutputType | null
  }

  type GetInstallmentGroupByPayload<T extends InstallmentGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<InstallmentGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof InstallmentGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], InstallmentGroupByOutputType[P]>
            : GetScalarType<T[P], InstallmentGroupByOutputType[P]>
        }
      >
    >


  export type InstallmentSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    walletId?: boolean
    totalAmount?: boolean
    interestRate?: boolean
    totalInterest?: boolean
    adminFee?: boolean
    adminFeeType?: boolean
    totalAdminFee?: boolean
    grandTotal?: boolean
    installmentMonths?: boolean
    currentTerm?: boolean
    monthlyAmount?: boolean
    status?: boolean
    startDate?: boolean
    description?: boolean
    balanceDeducted?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    wallet?: boolean | WalletDefaultArgs<ExtArgs>
    transactions?: boolean | Installment$transactionsArgs<ExtArgs>
    _count?: boolean | InstallmentCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["installment"]>

  export type InstallmentSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    walletId?: boolean
    totalAmount?: boolean
    interestRate?: boolean
    totalInterest?: boolean
    adminFee?: boolean
    adminFeeType?: boolean
    totalAdminFee?: boolean
    grandTotal?: boolean
    installmentMonths?: boolean
    currentTerm?: boolean
    monthlyAmount?: boolean
    status?: boolean
    startDate?: boolean
    description?: boolean
    balanceDeducted?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    wallet?: boolean | WalletDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["installment"]>

  export type InstallmentSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    walletId?: boolean
    totalAmount?: boolean
    interestRate?: boolean
    totalInterest?: boolean
    adminFee?: boolean
    adminFeeType?: boolean
    totalAdminFee?: boolean
    grandTotal?: boolean
    installmentMonths?: boolean
    currentTerm?: boolean
    monthlyAmount?: boolean
    status?: boolean
    startDate?: boolean
    description?: boolean
    balanceDeducted?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    wallet?: boolean | WalletDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["installment"]>

  export type InstallmentSelectScalar = {
    id?: boolean
    userId?: boolean
    walletId?: boolean
    totalAmount?: boolean
    interestRate?: boolean
    totalInterest?: boolean
    adminFee?: boolean
    adminFeeType?: boolean
    totalAdminFee?: boolean
    grandTotal?: boolean
    installmentMonths?: boolean
    currentTerm?: boolean
    monthlyAmount?: boolean
    status?: boolean
    startDate?: boolean
    description?: boolean
    balanceDeducted?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type InstallmentOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "userId" | "walletId" | "totalAmount" | "interestRate" | "totalInterest" | "adminFee" | "adminFeeType" | "totalAdminFee" | "grandTotal" | "installmentMonths" | "currentTerm" | "monthlyAmount" | "status" | "startDate" | "description" | "balanceDeducted" | "createdAt" | "updatedAt", ExtArgs["result"]["installment"]>
  export type InstallmentInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    wallet?: boolean | WalletDefaultArgs<ExtArgs>
    transactions?: boolean | Installment$transactionsArgs<ExtArgs>
    _count?: boolean | InstallmentCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type InstallmentIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    wallet?: boolean | WalletDefaultArgs<ExtArgs>
  }
  export type InstallmentIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    wallet?: boolean | WalletDefaultArgs<ExtArgs>
  }

  export type $InstallmentPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Installment"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
      wallet: Prisma.$WalletPayload<ExtArgs>
      transactions: Prisma.$TransactionPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      userId: string
      walletId: string
      totalAmount: Prisma.Decimal
      interestRate: Prisma.Decimal
      totalInterest: Prisma.Decimal
      adminFee: Prisma.Decimal
      adminFeeType: $Enums.AdminFeeType
      totalAdminFee: Prisma.Decimal
      grandTotal: Prisma.Decimal
      installmentMonths: number
      currentTerm: number
      monthlyAmount: Prisma.Decimal
      status: $Enums.InstallmentStatus
      startDate: Date
      description: string | null
      balanceDeducted: boolean
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["installment"]>
    composites: {}
  }

  type InstallmentGetPayload<S extends boolean | null | undefined | InstallmentDefaultArgs> = $Result.GetResult<Prisma.$InstallmentPayload, S>

  type InstallmentCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<InstallmentFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: InstallmentCountAggregateInputType | true
    }

  export interface InstallmentDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Installment'], meta: { name: 'Installment' } }
    /**
     * Find zero or one Installment that matches the filter.
     * @param {InstallmentFindUniqueArgs} args - Arguments to find a Installment
     * @example
     * // Get one Installment
     * const installment = await prisma.installment.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends InstallmentFindUniqueArgs>(args: SelectSubset<T, InstallmentFindUniqueArgs<ExtArgs>>): Prisma__InstallmentClient<$Result.GetResult<Prisma.$InstallmentPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Installment that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {InstallmentFindUniqueOrThrowArgs} args - Arguments to find a Installment
     * @example
     * // Get one Installment
     * const installment = await prisma.installment.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends InstallmentFindUniqueOrThrowArgs>(args: SelectSubset<T, InstallmentFindUniqueOrThrowArgs<ExtArgs>>): Prisma__InstallmentClient<$Result.GetResult<Prisma.$InstallmentPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Installment that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InstallmentFindFirstArgs} args - Arguments to find a Installment
     * @example
     * // Get one Installment
     * const installment = await prisma.installment.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends InstallmentFindFirstArgs>(args?: SelectSubset<T, InstallmentFindFirstArgs<ExtArgs>>): Prisma__InstallmentClient<$Result.GetResult<Prisma.$InstallmentPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Installment that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InstallmentFindFirstOrThrowArgs} args - Arguments to find a Installment
     * @example
     * // Get one Installment
     * const installment = await prisma.installment.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends InstallmentFindFirstOrThrowArgs>(args?: SelectSubset<T, InstallmentFindFirstOrThrowArgs<ExtArgs>>): Prisma__InstallmentClient<$Result.GetResult<Prisma.$InstallmentPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Installments that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InstallmentFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Installments
     * const installments = await prisma.installment.findMany()
     * 
     * // Get first 10 Installments
     * const installments = await prisma.installment.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const installmentWithIdOnly = await prisma.installment.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends InstallmentFindManyArgs>(args?: SelectSubset<T, InstallmentFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$InstallmentPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Installment.
     * @param {InstallmentCreateArgs} args - Arguments to create a Installment.
     * @example
     * // Create one Installment
     * const Installment = await prisma.installment.create({
     *   data: {
     *     // ... data to create a Installment
     *   }
     * })
     * 
     */
    create<T extends InstallmentCreateArgs>(args: SelectSubset<T, InstallmentCreateArgs<ExtArgs>>): Prisma__InstallmentClient<$Result.GetResult<Prisma.$InstallmentPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Installments.
     * @param {InstallmentCreateManyArgs} args - Arguments to create many Installments.
     * @example
     * // Create many Installments
     * const installment = await prisma.installment.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends InstallmentCreateManyArgs>(args?: SelectSubset<T, InstallmentCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Installments and returns the data saved in the database.
     * @param {InstallmentCreateManyAndReturnArgs} args - Arguments to create many Installments.
     * @example
     * // Create many Installments
     * const installment = await prisma.installment.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Installments and only return the `id`
     * const installmentWithIdOnly = await prisma.installment.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends InstallmentCreateManyAndReturnArgs>(args?: SelectSubset<T, InstallmentCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$InstallmentPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Installment.
     * @param {InstallmentDeleteArgs} args - Arguments to delete one Installment.
     * @example
     * // Delete one Installment
     * const Installment = await prisma.installment.delete({
     *   where: {
     *     // ... filter to delete one Installment
     *   }
     * })
     * 
     */
    delete<T extends InstallmentDeleteArgs>(args: SelectSubset<T, InstallmentDeleteArgs<ExtArgs>>): Prisma__InstallmentClient<$Result.GetResult<Prisma.$InstallmentPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Installment.
     * @param {InstallmentUpdateArgs} args - Arguments to update one Installment.
     * @example
     * // Update one Installment
     * const installment = await prisma.installment.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends InstallmentUpdateArgs>(args: SelectSubset<T, InstallmentUpdateArgs<ExtArgs>>): Prisma__InstallmentClient<$Result.GetResult<Prisma.$InstallmentPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Installments.
     * @param {InstallmentDeleteManyArgs} args - Arguments to filter Installments to delete.
     * @example
     * // Delete a few Installments
     * const { count } = await prisma.installment.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends InstallmentDeleteManyArgs>(args?: SelectSubset<T, InstallmentDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Installments.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InstallmentUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Installments
     * const installment = await prisma.installment.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends InstallmentUpdateManyArgs>(args: SelectSubset<T, InstallmentUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Installments and returns the data updated in the database.
     * @param {InstallmentUpdateManyAndReturnArgs} args - Arguments to update many Installments.
     * @example
     * // Update many Installments
     * const installment = await prisma.installment.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Installments and only return the `id`
     * const installmentWithIdOnly = await prisma.installment.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends InstallmentUpdateManyAndReturnArgs>(args: SelectSubset<T, InstallmentUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$InstallmentPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Installment.
     * @param {InstallmentUpsertArgs} args - Arguments to update or create a Installment.
     * @example
     * // Update or create a Installment
     * const installment = await prisma.installment.upsert({
     *   create: {
     *     // ... data to create a Installment
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Installment we want to update
     *   }
     * })
     */
    upsert<T extends InstallmentUpsertArgs>(args: SelectSubset<T, InstallmentUpsertArgs<ExtArgs>>): Prisma__InstallmentClient<$Result.GetResult<Prisma.$InstallmentPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Installments.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InstallmentCountArgs} args - Arguments to filter Installments to count.
     * @example
     * // Count the number of Installments
     * const count = await prisma.installment.count({
     *   where: {
     *     // ... the filter for the Installments we want to count
     *   }
     * })
    **/
    count<T extends InstallmentCountArgs>(
      args?: Subset<T, InstallmentCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], InstallmentCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Installment.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InstallmentAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
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
    aggregate<T extends InstallmentAggregateArgs>(args: Subset<T, InstallmentAggregateArgs>): Prisma.PrismaPromise<GetInstallmentAggregateType<T>>

    /**
     * Group by Installment.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InstallmentGroupByArgs} args - Group by arguments.
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
      T extends InstallmentGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: InstallmentGroupByArgs['orderBy'] }
        : { orderBy?: InstallmentGroupByArgs['orderBy'] },
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
    >(args: SubsetIntersection<T, InstallmentGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetInstallmentGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Installment model
   */
  readonly fields: InstallmentFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Installment.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__InstallmentClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    wallet<T extends WalletDefaultArgs<ExtArgs> = {}>(args?: Subset<T, WalletDefaultArgs<ExtArgs>>): Prisma__WalletClient<$Result.GetResult<Prisma.$WalletPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    transactions<T extends Installment$transactionsArgs<ExtArgs> = {}>(args?: Subset<T, Installment$transactionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TransactionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Installment model
   */
  interface InstallmentFieldRefs {
    readonly id: FieldRef<"Installment", 'String'>
    readonly userId: FieldRef<"Installment", 'String'>
    readonly walletId: FieldRef<"Installment", 'String'>
    readonly totalAmount: FieldRef<"Installment", 'Decimal'>
    readonly interestRate: FieldRef<"Installment", 'Decimal'>
    readonly totalInterest: FieldRef<"Installment", 'Decimal'>
    readonly adminFee: FieldRef<"Installment", 'Decimal'>
    readonly adminFeeType: FieldRef<"Installment", 'AdminFeeType'>
    readonly totalAdminFee: FieldRef<"Installment", 'Decimal'>
    readonly grandTotal: FieldRef<"Installment", 'Decimal'>
    readonly installmentMonths: FieldRef<"Installment", 'Int'>
    readonly currentTerm: FieldRef<"Installment", 'Int'>
    readonly monthlyAmount: FieldRef<"Installment", 'Decimal'>
    readonly status: FieldRef<"Installment", 'InstallmentStatus'>
    readonly startDate: FieldRef<"Installment", 'DateTime'>
    readonly description: FieldRef<"Installment", 'String'>
    readonly balanceDeducted: FieldRef<"Installment", 'Boolean'>
    readonly createdAt: FieldRef<"Installment", 'DateTime'>
    readonly updatedAt: FieldRef<"Installment", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Installment findUnique
   */
  export type InstallmentFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Installment
     */
    select?: InstallmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Installment
     */
    omit?: InstallmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstallmentInclude<ExtArgs> | null
    /**
     * Filter, which Installment to fetch.
     */
    where: InstallmentWhereUniqueInput
  }

  /**
   * Installment findUniqueOrThrow
   */
  export type InstallmentFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Installment
     */
    select?: InstallmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Installment
     */
    omit?: InstallmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstallmentInclude<ExtArgs> | null
    /**
     * Filter, which Installment to fetch.
     */
    where: InstallmentWhereUniqueInput
  }

  /**
   * Installment findFirst
   */
  export type InstallmentFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Installment
     */
    select?: InstallmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Installment
     */
    omit?: InstallmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstallmentInclude<ExtArgs> | null
    /**
     * Filter, which Installment to fetch.
     */
    where?: InstallmentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Installments to fetch.
     */
    orderBy?: InstallmentOrderByWithRelationInput | InstallmentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Installments.
     */
    cursor?: InstallmentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Installments from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Installments.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Installments.
     */
    distinct?: InstallmentScalarFieldEnum | InstallmentScalarFieldEnum[]
  }

  /**
   * Installment findFirstOrThrow
   */
  export type InstallmentFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Installment
     */
    select?: InstallmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Installment
     */
    omit?: InstallmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstallmentInclude<ExtArgs> | null
    /**
     * Filter, which Installment to fetch.
     */
    where?: InstallmentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Installments to fetch.
     */
    orderBy?: InstallmentOrderByWithRelationInput | InstallmentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Installments.
     */
    cursor?: InstallmentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Installments from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Installments.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Installments.
     */
    distinct?: InstallmentScalarFieldEnum | InstallmentScalarFieldEnum[]
  }

  /**
   * Installment findMany
   */
  export type InstallmentFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Installment
     */
    select?: InstallmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Installment
     */
    omit?: InstallmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstallmentInclude<ExtArgs> | null
    /**
     * Filter, which Installments to fetch.
     */
    where?: InstallmentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Installments to fetch.
     */
    orderBy?: InstallmentOrderByWithRelationInput | InstallmentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Installments.
     */
    cursor?: InstallmentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Installments from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Installments.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Installments.
     */
    distinct?: InstallmentScalarFieldEnum | InstallmentScalarFieldEnum[]
  }

  /**
   * Installment create
   */
  export type InstallmentCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Installment
     */
    select?: InstallmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Installment
     */
    omit?: InstallmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstallmentInclude<ExtArgs> | null
    /**
     * The data needed to create a Installment.
     */
    data: XOR<InstallmentCreateInput, InstallmentUncheckedCreateInput>
  }

  /**
   * Installment createMany
   */
  export type InstallmentCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Installments.
     */
    data: InstallmentCreateManyInput | InstallmentCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Installment createManyAndReturn
   */
  export type InstallmentCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Installment
     */
    select?: InstallmentSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Installment
     */
    omit?: InstallmentOmit<ExtArgs> | null
    /**
     * The data used to create many Installments.
     */
    data: InstallmentCreateManyInput | InstallmentCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstallmentIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Installment update
   */
  export type InstallmentUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Installment
     */
    select?: InstallmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Installment
     */
    omit?: InstallmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstallmentInclude<ExtArgs> | null
    /**
     * The data needed to update a Installment.
     */
    data: XOR<InstallmentUpdateInput, InstallmentUncheckedUpdateInput>
    /**
     * Choose, which Installment to update.
     */
    where: InstallmentWhereUniqueInput
  }

  /**
   * Installment updateMany
   */
  export type InstallmentUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Installments.
     */
    data: XOR<InstallmentUpdateManyMutationInput, InstallmentUncheckedUpdateManyInput>
    /**
     * Filter which Installments to update
     */
    where?: InstallmentWhereInput
    /**
     * Limit how many Installments to update.
     */
    limit?: number
  }

  /**
   * Installment updateManyAndReturn
   */
  export type InstallmentUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Installment
     */
    select?: InstallmentSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Installment
     */
    omit?: InstallmentOmit<ExtArgs> | null
    /**
     * The data used to update Installments.
     */
    data: XOR<InstallmentUpdateManyMutationInput, InstallmentUncheckedUpdateManyInput>
    /**
     * Filter which Installments to update
     */
    where?: InstallmentWhereInput
    /**
     * Limit how many Installments to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstallmentIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Installment upsert
   */
  export type InstallmentUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Installment
     */
    select?: InstallmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Installment
     */
    omit?: InstallmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstallmentInclude<ExtArgs> | null
    /**
     * The filter to search for the Installment to update in case it exists.
     */
    where: InstallmentWhereUniqueInput
    /**
     * In case the Installment found by the `where` argument doesn't exist, create a new Installment with this data.
     */
    create: XOR<InstallmentCreateInput, InstallmentUncheckedCreateInput>
    /**
     * In case the Installment was found with the provided `where` argument, update it with this data.
     */
    update: XOR<InstallmentUpdateInput, InstallmentUncheckedUpdateInput>
  }

  /**
   * Installment delete
   */
  export type InstallmentDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Installment
     */
    select?: InstallmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Installment
     */
    omit?: InstallmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstallmentInclude<ExtArgs> | null
    /**
     * Filter which Installment to delete.
     */
    where: InstallmentWhereUniqueInput
  }

  /**
   * Installment deleteMany
   */
  export type InstallmentDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Installments to delete
     */
    where?: InstallmentWhereInput
    /**
     * Limit how many Installments to delete.
     */
    limit?: number
  }

  /**
   * Installment.transactions
   */
  export type Installment$transactionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionInclude<ExtArgs> | null
    where?: TransactionWhereInput
    orderBy?: TransactionOrderByWithRelationInput | TransactionOrderByWithRelationInput[]
    cursor?: TransactionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TransactionScalarFieldEnum | TransactionScalarFieldEnum[]
  }

  /**
   * Installment without action
   */
  export type InstallmentDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Installment
     */
    select?: InstallmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Installment
     */
    omit?: InstallmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InstallmentInclude<ExtArgs> | null
  }


  /**
   * Model Transfer
   */

  export type AggregateTransfer = {
    _count: TransferCountAggregateOutputType | null
    _avg: TransferAvgAggregateOutputType | null
    _sum: TransferSumAggregateOutputType | null
    _min: TransferMinAggregateOutputType | null
    _max: TransferMaxAggregateOutputType | null
  }

  export type TransferAvgAggregateOutputType = {
    amount: Decimal | null
  }

  export type TransferSumAggregateOutputType = {
    amount: Decimal | null
  }

  export type TransferMinAggregateOutputType = {
    id: string | null
    userId: string | null
    fromWalletId: string | null
    toWalletId: string | null
    amount: Decimal | null
    note: string | null
    date: Date | null
    createdAt: Date | null
  }

  export type TransferMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    fromWalletId: string | null
    toWalletId: string | null
    amount: Decimal | null
    note: string | null
    date: Date | null
    createdAt: Date | null
  }

  export type TransferCountAggregateOutputType = {
    id: number
    userId: number
    fromWalletId: number
    toWalletId: number
    amount: number
    note: number
    date: number
    createdAt: number
    _all: number
  }


  export type TransferAvgAggregateInputType = {
    amount?: true
  }

  export type TransferSumAggregateInputType = {
    amount?: true
  }

  export type TransferMinAggregateInputType = {
    id?: true
    userId?: true
    fromWalletId?: true
    toWalletId?: true
    amount?: true
    note?: true
    date?: true
    createdAt?: true
  }

  export type TransferMaxAggregateInputType = {
    id?: true
    userId?: true
    fromWalletId?: true
    toWalletId?: true
    amount?: true
    note?: true
    date?: true
    createdAt?: true
  }

  export type TransferCountAggregateInputType = {
    id?: true
    userId?: true
    fromWalletId?: true
    toWalletId?: true
    amount?: true
    note?: true
    date?: true
    createdAt?: true
    _all?: true
  }

  export type TransferAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Transfer to aggregate.
     */
    where?: TransferWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Transfers to fetch.
     */
    orderBy?: TransferOrderByWithRelationInput | TransferOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: TransferWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Transfers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Transfers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Transfers
    **/
    _count?: true | TransferCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: TransferAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: TransferSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: TransferMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: TransferMaxAggregateInputType
  }

  export type GetTransferAggregateType<T extends TransferAggregateArgs> = {
        [P in keyof T & keyof AggregateTransfer]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateTransfer[P]>
      : GetScalarType<T[P], AggregateTransfer[P]>
  }




  export type TransferGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TransferWhereInput
    orderBy?: TransferOrderByWithAggregationInput | TransferOrderByWithAggregationInput[]
    by: TransferScalarFieldEnum[] | TransferScalarFieldEnum
    having?: TransferScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: TransferCountAggregateInputType | true
    _avg?: TransferAvgAggregateInputType
    _sum?: TransferSumAggregateInputType
    _min?: TransferMinAggregateInputType
    _max?: TransferMaxAggregateInputType
  }

  export type TransferGroupByOutputType = {
    id: string
    userId: string
    fromWalletId: string
    toWalletId: string
    amount: Decimal
    note: string | null
    date: Date
    createdAt: Date
    _count: TransferCountAggregateOutputType | null
    _avg: TransferAvgAggregateOutputType | null
    _sum: TransferSumAggregateOutputType | null
    _min: TransferMinAggregateOutputType | null
    _max: TransferMaxAggregateOutputType | null
  }

  type GetTransferGroupByPayload<T extends TransferGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<TransferGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof TransferGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], TransferGroupByOutputType[P]>
            : GetScalarType<T[P], TransferGroupByOutputType[P]>
        }
      >
    >


  export type TransferSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    fromWalletId?: boolean
    toWalletId?: boolean
    amount?: boolean
    note?: boolean
    date?: boolean
    createdAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    fromWallet?: boolean | WalletDefaultArgs<ExtArgs>
    toWallet?: boolean | WalletDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["transfer"]>

  export type TransferSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    fromWalletId?: boolean
    toWalletId?: boolean
    amount?: boolean
    note?: boolean
    date?: boolean
    createdAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    fromWallet?: boolean | WalletDefaultArgs<ExtArgs>
    toWallet?: boolean | WalletDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["transfer"]>

  export type TransferSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    fromWalletId?: boolean
    toWalletId?: boolean
    amount?: boolean
    note?: boolean
    date?: boolean
    createdAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    fromWallet?: boolean | WalletDefaultArgs<ExtArgs>
    toWallet?: boolean | WalletDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["transfer"]>

  export type TransferSelectScalar = {
    id?: boolean
    userId?: boolean
    fromWalletId?: boolean
    toWalletId?: boolean
    amount?: boolean
    note?: boolean
    date?: boolean
    createdAt?: boolean
  }

  export type TransferOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "userId" | "fromWalletId" | "toWalletId" | "amount" | "note" | "date" | "createdAt", ExtArgs["result"]["transfer"]>
  export type TransferInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    fromWallet?: boolean | WalletDefaultArgs<ExtArgs>
    toWallet?: boolean | WalletDefaultArgs<ExtArgs>
  }
  export type TransferIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    fromWallet?: boolean | WalletDefaultArgs<ExtArgs>
    toWallet?: boolean | WalletDefaultArgs<ExtArgs>
  }
  export type TransferIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    fromWallet?: boolean | WalletDefaultArgs<ExtArgs>
    toWallet?: boolean | WalletDefaultArgs<ExtArgs>
  }

  export type $TransferPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Transfer"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
      fromWallet: Prisma.$WalletPayload<ExtArgs>
      toWallet: Prisma.$WalletPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      userId: string
      fromWalletId: string
      toWalletId: string
      amount: Prisma.Decimal
      note: string | null
      date: Date
      createdAt: Date
    }, ExtArgs["result"]["transfer"]>
    composites: {}
  }

  type TransferGetPayload<S extends boolean | null | undefined | TransferDefaultArgs> = $Result.GetResult<Prisma.$TransferPayload, S>

  type TransferCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<TransferFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: TransferCountAggregateInputType | true
    }

  export interface TransferDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Transfer'], meta: { name: 'Transfer' } }
    /**
     * Find zero or one Transfer that matches the filter.
     * @param {TransferFindUniqueArgs} args - Arguments to find a Transfer
     * @example
     * // Get one Transfer
     * const transfer = await prisma.transfer.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends TransferFindUniqueArgs>(args: SelectSubset<T, TransferFindUniqueArgs<ExtArgs>>): Prisma__TransferClient<$Result.GetResult<Prisma.$TransferPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Transfer that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {TransferFindUniqueOrThrowArgs} args - Arguments to find a Transfer
     * @example
     * // Get one Transfer
     * const transfer = await prisma.transfer.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends TransferFindUniqueOrThrowArgs>(args: SelectSubset<T, TransferFindUniqueOrThrowArgs<ExtArgs>>): Prisma__TransferClient<$Result.GetResult<Prisma.$TransferPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Transfer that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TransferFindFirstArgs} args - Arguments to find a Transfer
     * @example
     * // Get one Transfer
     * const transfer = await prisma.transfer.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends TransferFindFirstArgs>(args?: SelectSubset<T, TransferFindFirstArgs<ExtArgs>>): Prisma__TransferClient<$Result.GetResult<Prisma.$TransferPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Transfer that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TransferFindFirstOrThrowArgs} args - Arguments to find a Transfer
     * @example
     * // Get one Transfer
     * const transfer = await prisma.transfer.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends TransferFindFirstOrThrowArgs>(args?: SelectSubset<T, TransferFindFirstOrThrowArgs<ExtArgs>>): Prisma__TransferClient<$Result.GetResult<Prisma.$TransferPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Transfers that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TransferFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Transfers
     * const transfers = await prisma.transfer.findMany()
     * 
     * // Get first 10 Transfers
     * const transfers = await prisma.transfer.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const transferWithIdOnly = await prisma.transfer.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends TransferFindManyArgs>(args?: SelectSubset<T, TransferFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TransferPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Transfer.
     * @param {TransferCreateArgs} args - Arguments to create a Transfer.
     * @example
     * // Create one Transfer
     * const Transfer = await prisma.transfer.create({
     *   data: {
     *     // ... data to create a Transfer
     *   }
     * })
     * 
     */
    create<T extends TransferCreateArgs>(args: SelectSubset<T, TransferCreateArgs<ExtArgs>>): Prisma__TransferClient<$Result.GetResult<Prisma.$TransferPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Transfers.
     * @param {TransferCreateManyArgs} args - Arguments to create many Transfers.
     * @example
     * // Create many Transfers
     * const transfer = await prisma.transfer.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends TransferCreateManyArgs>(args?: SelectSubset<T, TransferCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Transfers and returns the data saved in the database.
     * @param {TransferCreateManyAndReturnArgs} args - Arguments to create many Transfers.
     * @example
     * // Create many Transfers
     * const transfer = await prisma.transfer.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Transfers and only return the `id`
     * const transferWithIdOnly = await prisma.transfer.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends TransferCreateManyAndReturnArgs>(args?: SelectSubset<T, TransferCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TransferPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Transfer.
     * @param {TransferDeleteArgs} args - Arguments to delete one Transfer.
     * @example
     * // Delete one Transfer
     * const Transfer = await prisma.transfer.delete({
     *   where: {
     *     // ... filter to delete one Transfer
     *   }
     * })
     * 
     */
    delete<T extends TransferDeleteArgs>(args: SelectSubset<T, TransferDeleteArgs<ExtArgs>>): Prisma__TransferClient<$Result.GetResult<Prisma.$TransferPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Transfer.
     * @param {TransferUpdateArgs} args - Arguments to update one Transfer.
     * @example
     * // Update one Transfer
     * const transfer = await prisma.transfer.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends TransferUpdateArgs>(args: SelectSubset<T, TransferUpdateArgs<ExtArgs>>): Prisma__TransferClient<$Result.GetResult<Prisma.$TransferPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Transfers.
     * @param {TransferDeleteManyArgs} args - Arguments to filter Transfers to delete.
     * @example
     * // Delete a few Transfers
     * const { count } = await prisma.transfer.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends TransferDeleteManyArgs>(args?: SelectSubset<T, TransferDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Transfers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TransferUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Transfers
     * const transfer = await prisma.transfer.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends TransferUpdateManyArgs>(args: SelectSubset<T, TransferUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Transfers and returns the data updated in the database.
     * @param {TransferUpdateManyAndReturnArgs} args - Arguments to update many Transfers.
     * @example
     * // Update many Transfers
     * const transfer = await prisma.transfer.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Transfers and only return the `id`
     * const transferWithIdOnly = await prisma.transfer.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends TransferUpdateManyAndReturnArgs>(args: SelectSubset<T, TransferUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TransferPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Transfer.
     * @param {TransferUpsertArgs} args - Arguments to update or create a Transfer.
     * @example
     * // Update or create a Transfer
     * const transfer = await prisma.transfer.upsert({
     *   create: {
     *     // ... data to create a Transfer
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Transfer we want to update
     *   }
     * })
     */
    upsert<T extends TransferUpsertArgs>(args: SelectSubset<T, TransferUpsertArgs<ExtArgs>>): Prisma__TransferClient<$Result.GetResult<Prisma.$TransferPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Transfers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TransferCountArgs} args - Arguments to filter Transfers to count.
     * @example
     * // Count the number of Transfers
     * const count = await prisma.transfer.count({
     *   where: {
     *     // ... the filter for the Transfers we want to count
     *   }
     * })
    **/
    count<T extends TransferCountArgs>(
      args?: Subset<T, TransferCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], TransferCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Transfer.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TransferAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
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
    aggregate<T extends TransferAggregateArgs>(args: Subset<T, TransferAggregateArgs>): Prisma.PrismaPromise<GetTransferAggregateType<T>>

    /**
     * Group by Transfer.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TransferGroupByArgs} args - Group by arguments.
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
      T extends TransferGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: TransferGroupByArgs['orderBy'] }
        : { orderBy?: TransferGroupByArgs['orderBy'] },
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
    >(args: SubsetIntersection<T, TransferGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetTransferGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Transfer model
   */
  readonly fields: TransferFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Transfer.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__TransferClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    fromWallet<T extends WalletDefaultArgs<ExtArgs> = {}>(args?: Subset<T, WalletDefaultArgs<ExtArgs>>): Prisma__WalletClient<$Result.GetResult<Prisma.$WalletPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    toWallet<T extends WalletDefaultArgs<ExtArgs> = {}>(args?: Subset<T, WalletDefaultArgs<ExtArgs>>): Prisma__WalletClient<$Result.GetResult<Prisma.$WalletPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Transfer model
   */
  interface TransferFieldRefs {
    readonly id: FieldRef<"Transfer", 'String'>
    readonly userId: FieldRef<"Transfer", 'String'>
    readonly fromWalletId: FieldRef<"Transfer", 'String'>
    readonly toWalletId: FieldRef<"Transfer", 'String'>
    readonly amount: FieldRef<"Transfer", 'Decimal'>
    readonly note: FieldRef<"Transfer", 'String'>
    readonly date: FieldRef<"Transfer", 'DateTime'>
    readonly createdAt: FieldRef<"Transfer", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Transfer findUnique
   */
  export type TransferFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transfer
     */
    select?: TransferSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transfer
     */
    omit?: TransferOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransferInclude<ExtArgs> | null
    /**
     * Filter, which Transfer to fetch.
     */
    where: TransferWhereUniqueInput
  }

  /**
   * Transfer findUniqueOrThrow
   */
  export type TransferFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transfer
     */
    select?: TransferSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transfer
     */
    omit?: TransferOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransferInclude<ExtArgs> | null
    /**
     * Filter, which Transfer to fetch.
     */
    where: TransferWhereUniqueInput
  }

  /**
   * Transfer findFirst
   */
  export type TransferFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transfer
     */
    select?: TransferSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transfer
     */
    omit?: TransferOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransferInclude<ExtArgs> | null
    /**
     * Filter, which Transfer to fetch.
     */
    where?: TransferWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Transfers to fetch.
     */
    orderBy?: TransferOrderByWithRelationInput | TransferOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Transfers.
     */
    cursor?: TransferWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Transfers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Transfers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Transfers.
     */
    distinct?: TransferScalarFieldEnum | TransferScalarFieldEnum[]
  }

  /**
   * Transfer findFirstOrThrow
   */
  export type TransferFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transfer
     */
    select?: TransferSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transfer
     */
    omit?: TransferOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransferInclude<ExtArgs> | null
    /**
     * Filter, which Transfer to fetch.
     */
    where?: TransferWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Transfers to fetch.
     */
    orderBy?: TransferOrderByWithRelationInput | TransferOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Transfers.
     */
    cursor?: TransferWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Transfers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Transfers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Transfers.
     */
    distinct?: TransferScalarFieldEnum | TransferScalarFieldEnum[]
  }

  /**
   * Transfer findMany
   */
  export type TransferFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transfer
     */
    select?: TransferSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transfer
     */
    omit?: TransferOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransferInclude<ExtArgs> | null
    /**
     * Filter, which Transfers to fetch.
     */
    where?: TransferWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Transfers to fetch.
     */
    orderBy?: TransferOrderByWithRelationInput | TransferOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Transfers.
     */
    cursor?: TransferWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Transfers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Transfers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Transfers.
     */
    distinct?: TransferScalarFieldEnum | TransferScalarFieldEnum[]
  }

  /**
   * Transfer create
   */
  export type TransferCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transfer
     */
    select?: TransferSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transfer
     */
    omit?: TransferOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransferInclude<ExtArgs> | null
    /**
     * The data needed to create a Transfer.
     */
    data: XOR<TransferCreateInput, TransferUncheckedCreateInput>
  }

  /**
   * Transfer createMany
   */
  export type TransferCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Transfers.
     */
    data: TransferCreateManyInput | TransferCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Transfer createManyAndReturn
   */
  export type TransferCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transfer
     */
    select?: TransferSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Transfer
     */
    omit?: TransferOmit<ExtArgs> | null
    /**
     * The data used to create many Transfers.
     */
    data: TransferCreateManyInput | TransferCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransferIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Transfer update
   */
  export type TransferUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transfer
     */
    select?: TransferSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transfer
     */
    omit?: TransferOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransferInclude<ExtArgs> | null
    /**
     * The data needed to update a Transfer.
     */
    data: XOR<TransferUpdateInput, TransferUncheckedUpdateInput>
    /**
     * Choose, which Transfer to update.
     */
    where: TransferWhereUniqueInput
  }

  /**
   * Transfer updateMany
   */
  export type TransferUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Transfers.
     */
    data: XOR<TransferUpdateManyMutationInput, TransferUncheckedUpdateManyInput>
    /**
     * Filter which Transfers to update
     */
    where?: TransferWhereInput
    /**
     * Limit how many Transfers to update.
     */
    limit?: number
  }

  /**
   * Transfer updateManyAndReturn
   */
  export type TransferUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transfer
     */
    select?: TransferSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Transfer
     */
    omit?: TransferOmit<ExtArgs> | null
    /**
     * The data used to update Transfers.
     */
    data: XOR<TransferUpdateManyMutationInput, TransferUncheckedUpdateManyInput>
    /**
     * Filter which Transfers to update
     */
    where?: TransferWhereInput
    /**
     * Limit how many Transfers to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransferIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Transfer upsert
   */
  export type TransferUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transfer
     */
    select?: TransferSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transfer
     */
    omit?: TransferOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransferInclude<ExtArgs> | null
    /**
     * The filter to search for the Transfer to update in case it exists.
     */
    where: TransferWhereUniqueInput
    /**
     * In case the Transfer found by the `where` argument doesn't exist, create a new Transfer with this data.
     */
    create: XOR<TransferCreateInput, TransferUncheckedCreateInput>
    /**
     * In case the Transfer was found with the provided `where` argument, update it with this data.
     */
    update: XOR<TransferUpdateInput, TransferUncheckedUpdateInput>
  }

  /**
   * Transfer delete
   */
  export type TransferDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transfer
     */
    select?: TransferSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transfer
     */
    omit?: TransferOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransferInclude<ExtArgs> | null
    /**
     * Filter which Transfer to delete.
     */
    where: TransferWhereUniqueInput
  }

  /**
   * Transfer deleteMany
   */
  export type TransferDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Transfers to delete
     */
    where?: TransferWhereInput
    /**
     * Limit how many Transfers to delete.
     */
    limit?: number
  }

  /**
   * Transfer without action
   */
  export type TransferDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transfer
     */
    select?: TransferSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transfer
     */
    omit?: TransferOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransferInclude<ExtArgs> | null
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


  export const UserScalarFieldEnum: {
    id: 'id',
    email: 'email',
    name: 'name',
    avatarUrl: 'avatarUrl',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type UserScalarFieldEnum = (typeof UserScalarFieldEnum)[keyof typeof UserScalarFieldEnum]


  export const WalletScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    name: 'name',
    type: 'type',
    balance: 'balance',
    creditLimit: 'creditLimit',
    initialBalance: 'initialBalance',
    icon: 'icon',
    color: 'color',
    interestRate: 'interestRate',
    isArchived: 'isArchived',
    adminFee: 'adminFee',
    adminFeeType: 'adminFeeType',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type WalletScalarFieldEnum = (typeof WalletScalarFieldEnum)[keyof typeof WalletScalarFieldEnum]


  export const CategoryScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    name: 'name',
    type: 'type',
    icon: 'icon',
    color: 'color',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type CategoryScalarFieldEnum = (typeof CategoryScalarFieldEnum)[keyof typeof CategoryScalarFieldEnum]


  export const TransactionScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    walletId: 'walletId',
    toWalletId: 'toWalletId',
    categoryId: 'categoryId',
    type: 'type',
    amount: 'amount',
    description: 'description',
    isInstallment: 'isInstallment',
    installmentId: 'installmentId',
    date: 'date',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type TransactionScalarFieldEnum = (typeof TransactionScalarFieldEnum)[keyof typeof TransactionScalarFieldEnum]


  export const InstallmentScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    walletId: 'walletId',
    totalAmount: 'totalAmount',
    interestRate: 'interestRate',
    totalInterest: 'totalInterest',
    adminFee: 'adminFee',
    adminFeeType: 'adminFeeType',
    totalAdminFee: 'totalAdminFee',
    grandTotal: 'grandTotal',
    installmentMonths: 'installmentMonths',
    currentTerm: 'currentTerm',
    monthlyAmount: 'monthlyAmount',
    status: 'status',
    startDate: 'startDate',
    description: 'description',
    balanceDeducted: 'balanceDeducted',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type InstallmentScalarFieldEnum = (typeof InstallmentScalarFieldEnum)[keyof typeof InstallmentScalarFieldEnum]


  export const TransferScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    fromWalletId: 'fromWalletId',
    toWalletId: 'toWalletId',
    amount: 'amount',
    note: 'note',
    date: 'date',
    createdAt: 'createdAt'
  };

  export type TransferScalarFieldEnum = (typeof TransferScalarFieldEnum)[keyof typeof TransferScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


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
   * Reference to a field of type 'WalletType'
   */
  export type EnumWalletTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'WalletType'>
    


  /**
   * Reference to a field of type 'WalletType[]'
   */
  export type ListEnumWalletTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'WalletType[]'>
    


  /**
   * Reference to a field of type 'Decimal'
   */
  export type DecimalFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Decimal'>
    


  /**
   * Reference to a field of type 'Decimal[]'
   */
  export type ListDecimalFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Decimal[]'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'AdminFeeType'
   */
  export type EnumAdminFeeTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'AdminFeeType'>
    


  /**
   * Reference to a field of type 'AdminFeeType[]'
   */
  export type ListEnumAdminFeeTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'AdminFeeType[]'>
    


  /**
   * Reference to a field of type 'CategoryType'
   */
  export type EnumCategoryTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'CategoryType'>
    


  /**
   * Reference to a field of type 'CategoryType[]'
   */
  export type ListEnumCategoryTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'CategoryType[]'>
    


  /**
   * Reference to a field of type 'TransactionType'
   */
  export type EnumTransactionTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'TransactionType'>
    


  /**
   * Reference to a field of type 'TransactionType[]'
   */
  export type ListEnumTransactionTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'TransactionType[]'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'InstallmentStatus'
   */
  export type EnumInstallmentStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'InstallmentStatus'>
    


  /**
   * Reference to a field of type 'InstallmentStatus[]'
   */
  export type ListEnumInstallmentStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'InstallmentStatus[]'>
    


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


  export type UserWhereInput = {
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    id?: StringFilter<"User"> | string
    email?: StringFilter<"User"> | string
    name?: StringFilter<"User"> | string
    avatarUrl?: StringNullableFilter<"User"> | string | null
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
    wallets?: WalletListRelationFilter
    categories?: CategoryListRelationFilter
    transactions?: TransactionListRelationFilter
    installments?: InstallmentListRelationFilter
    transfers?: TransferListRelationFilter
  }

  export type UserOrderByWithRelationInput = {
    id?: SortOrder
    email?: SortOrder
    name?: SortOrder
    avatarUrl?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    wallets?: WalletOrderByRelationAggregateInput
    categories?: CategoryOrderByRelationAggregateInput
    transactions?: TransactionOrderByRelationAggregateInput
    installments?: InstallmentOrderByRelationAggregateInput
    transfers?: TransferOrderByRelationAggregateInput
  }

  export type UserWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    email?: string
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    name?: StringFilter<"User"> | string
    avatarUrl?: StringNullableFilter<"User"> | string | null
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
    wallets?: WalletListRelationFilter
    categories?: CategoryListRelationFilter
    transactions?: TransactionListRelationFilter
    installments?: InstallmentListRelationFilter
    transfers?: TransferListRelationFilter
  }, "id" | "email">

  export type UserOrderByWithAggregationInput = {
    id?: SortOrder
    email?: SortOrder
    name?: SortOrder
    avatarUrl?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: UserCountOrderByAggregateInput
    _max?: UserMaxOrderByAggregateInput
    _min?: UserMinOrderByAggregateInput
  }

  export type UserScalarWhereWithAggregatesInput = {
    AND?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    OR?: UserScalarWhereWithAggregatesInput[]
    NOT?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"User"> | string
    email?: StringWithAggregatesFilter<"User"> | string
    name?: StringWithAggregatesFilter<"User"> | string
    avatarUrl?: StringNullableWithAggregatesFilter<"User"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
  }

  export type WalletWhereInput = {
    AND?: WalletWhereInput | WalletWhereInput[]
    OR?: WalletWhereInput[]
    NOT?: WalletWhereInput | WalletWhereInput[]
    id?: StringFilter<"Wallet"> | string
    userId?: StringFilter<"Wallet"> | string
    name?: StringFilter<"Wallet"> | string
    type?: EnumWalletTypeFilter<"Wallet"> | $Enums.WalletType
    balance?: DecimalFilter<"Wallet"> | Decimal | DecimalJsLike | number | string
    creditLimit?: DecimalFilter<"Wallet"> | Decimal | DecimalJsLike | number | string
    initialBalance?: DecimalFilter<"Wallet"> | Decimal | DecimalJsLike | number | string
    icon?: StringNullableFilter<"Wallet"> | string | null
    color?: StringNullableFilter<"Wallet"> | string | null
    interestRate?: DecimalFilter<"Wallet"> | Decimal | DecimalJsLike | number | string
    isArchived?: BoolFilter<"Wallet"> | boolean
    adminFee?: DecimalFilter<"Wallet"> | Decimal | DecimalJsLike | number | string
    adminFeeType?: EnumAdminFeeTypeFilter<"Wallet"> | $Enums.AdminFeeType
    createdAt?: DateTimeFilter<"Wallet"> | Date | string
    updatedAt?: DateTimeFilter<"Wallet"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    transactions?: TransactionListRelationFilter
    toTransactions?: TransactionListRelationFilter
    installments?: InstallmentListRelationFilter
    fromTransfers?: TransferListRelationFilter
    toTransfers?: TransferListRelationFilter
  }

  export type WalletOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    type?: SortOrder
    balance?: SortOrder
    creditLimit?: SortOrder
    initialBalance?: SortOrder
    icon?: SortOrderInput | SortOrder
    color?: SortOrderInput | SortOrder
    interestRate?: SortOrder
    isArchived?: SortOrder
    adminFee?: SortOrder
    adminFeeType?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    user?: UserOrderByWithRelationInput
    transactions?: TransactionOrderByRelationAggregateInput
    toTransactions?: TransactionOrderByRelationAggregateInput
    installments?: InstallmentOrderByRelationAggregateInput
    fromTransfers?: TransferOrderByRelationAggregateInput
    toTransfers?: TransferOrderByRelationAggregateInput
  }

  export type WalletWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: WalletWhereInput | WalletWhereInput[]
    OR?: WalletWhereInput[]
    NOT?: WalletWhereInput | WalletWhereInput[]
    userId?: StringFilter<"Wallet"> | string
    name?: StringFilter<"Wallet"> | string
    type?: EnumWalletTypeFilter<"Wallet"> | $Enums.WalletType
    balance?: DecimalFilter<"Wallet"> | Decimal | DecimalJsLike | number | string
    creditLimit?: DecimalFilter<"Wallet"> | Decimal | DecimalJsLike | number | string
    initialBalance?: DecimalFilter<"Wallet"> | Decimal | DecimalJsLike | number | string
    icon?: StringNullableFilter<"Wallet"> | string | null
    color?: StringNullableFilter<"Wallet"> | string | null
    interestRate?: DecimalFilter<"Wallet"> | Decimal | DecimalJsLike | number | string
    isArchived?: BoolFilter<"Wallet"> | boolean
    adminFee?: DecimalFilter<"Wallet"> | Decimal | DecimalJsLike | number | string
    adminFeeType?: EnumAdminFeeTypeFilter<"Wallet"> | $Enums.AdminFeeType
    createdAt?: DateTimeFilter<"Wallet"> | Date | string
    updatedAt?: DateTimeFilter<"Wallet"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    transactions?: TransactionListRelationFilter
    toTransactions?: TransactionListRelationFilter
    installments?: InstallmentListRelationFilter
    fromTransfers?: TransferListRelationFilter
    toTransfers?: TransferListRelationFilter
  }, "id">

  export type WalletOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    type?: SortOrder
    balance?: SortOrder
    creditLimit?: SortOrder
    initialBalance?: SortOrder
    icon?: SortOrderInput | SortOrder
    color?: SortOrderInput | SortOrder
    interestRate?: SortOrder
    isArchived?: SortOrder
    adminFee?: SortOrder
    adminFeeType?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: WalletCountOrderByAggregateInput
    _avg?: WalletAvgOrderByAggregateInput
    _max?: WalletMaxOrderByAggregateInput
    _min?: WalletMinOrderByAggregateInput
    _sum?: WalletSumOrderByAggregateInput
  }

  export type WalletScalarWhereWithAggregatesInput = {
    AND?: WalletScalarWhereWithAggregatesInput | WalletScalarWhereWithAggregatesInput[]
    OR?: WalletScalarWhereWithAggregatesInput[]
    NOT?: WalletScalarWhereWithAggregatesInput | WalletScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Wallet"> | string
    userId?: StringWithAggregatesFilter<"Wallet"> | string
    name?: StringWithAggregatesFilter<"Wallet"> | string
    type?: EnumWalletTypeWithAggregatesFilter<"Wallet"> | $Enums.WalletType
    balance?: DecimalWithAggregatesFilter<"Wallet"> | Decimal | DecimalJsLike | number | string
    creditLimit?: DecimalWithAggregatesFilter<"Wallet"> | Decimal | DecimalJsLike | number | string
    initialBalance?: DecimalWithAggregatesFilter<"Wallet"> | Decimal | DecimalJsLike | number | string
    icon?: StringNullableWithAggregatesFilter<"Wallet"> | string | null
    color?: StringNullableWithAggregatesFilter<"Wallet"> | string | null
    interestRate?: DecimalWithAggregatesFilter<"Wallet"> | Decimal | DecimalJsLike | number | string
    isArchived?: BoolWithAggregatesFilter<"Wallet"> | boolean
    adminFee?: DecimalWithAggregatesFilter<"Wallet"> | Decimal | DecimalJsLike | number | string
    adminFeeType?: EnumAdminFeeTypeWithAggregatesFilter<"Wallet"> | $Enums.AdminFeeType
    createdAt?: DateTimeWithAggregatesFilter<"Wallet"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Wallet"> | Date | string
  }

  export type CategoryWhereInput = {
    AND?: CategoryWhereInput | CategoryWhereInput[]
    OR?: CategoryWhereInput[]
    NOT?: CategoryWhereInput | CategoryWhereInput[]
    id?: StringFilter<"Category"> | string
    userId?: StringFilter<"Category"> | string
    name?: StringFilter<"Category"> | string
    type?: EnumCategoryTypeFilter<"Category"> | $Enums.CategoryType
    icon?: StringNullableFilter<"Category"> | string | null
    color?: StringNullableFilter<"Category"> | string | null
    createdAt?: DateTimeFilter<"Category"> | Date | string
    updatedAt?: DateTimeFilter<"Category"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    transactions?: TransactionListRelationFilter
  }

  export type CategoryOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    type?: SortOrder
    icon?: SortOrderInput | SortOrder
    color?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    user?: UserOrderByWithRelationInput
    transactions?: TransactionOrderByRelationAggregateInput
  }

  export type CategoryWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    userId_name_type?: CategoryUserIdNameTypeCompoundUniqueInput
    AND?: CategoryWhereInput | CategoryWhereInput[]
    OR?: CategoryWhereInput[]
    NOT?: CategoryWhereInput | CategoryWhereInput[]
    userId?: StringFilter<"Category"> | string
    name?: StringFilter<"Category"> | string
    type?: EnumCategoryTypeFilter<"Category"> | $Enums.CategoryType
    icon?: StringNullableFilter<"Category"> | string | null
    color?: StringNullableFilter<"Category"> | string | null
    createdAt?: DateTimeFilter<"Category"> | Date | string
    updatedAt?: DateTimeFilter<"Category"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    transactions?: TransactionListRelationFilter
  }, "id" | "userId_name_type">

  export type CategoryOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    type?: SortOrder
    icon?: SortOrderInput | SortOrder
    color?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: CategoryCountOrderByAggregateInput
    _max?: CategoryMaxOrderByAggregateInput
    _min?: CategoryMinOrderByAggregateInput
  }

  export type CategoryScalarWhereWithAggregatesInput = {
    AND?: CategoryScalarWhereWithAggregatesInput | CategoryScalarWhereWithAggregatesInput[]
    OR?: CategoryScalarWhereWithAggregatesInput[]
    NOT?: CategoryScalarWhereWithAggregatesInput | CategoryScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Category"> | string
    userId?: StringWithAggregatesFilter<"Category"> | string
    name?: StringWithAggregatesFilter<"Category"> | string
    type?: EnumCategoryTypeWithAggregatesFilter<"Category"> | $Enums.CategoryType
    icon?: StringNullableWithAggregatesFilter<"Category"> | string | null
    color?: StringNullableWithAggregatesFilter<"Category"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Category"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Category"> | Date | string
  }

  export type TransactionWhereInput = {
    AND?: TransactionWhereInput | TransactionWhereInput[]
    OR?: TransactionWhereInput[]
    NOT?: TransactionWhereInput | TransactionWhereInput[]
    id?: StringFilter<"Transaction"> | string
    userId?: StringFilter<"Transaction"> | string
    walletId?: StringFilter<"Transaction"> | string
    toWalletId?: StringNullableFilter<"Transaction"> | string | null
    categoryId?: StringNullableFilter<"Transaction"> | string | null
    type?: EnumTransactionTypeFilter<"Transaction"> | $Enums.TransactionType
    amount?: DecimalFilter<"Transaction"> | Decimal | DecimalJsLike | number | string
    description?: StringNullableFilter<"Transaction"> | string | null
    isInstallment?: BoolFilter<"Transaction"> | boolean
    installmentId?: StringNullableFilter<"Transaction"> | string | null
    date?: DateTimeFilter<"Transaction"> | Date | string
    createdAt?: DateTimeFilter<"Transaction"> | Date | string
    updatedAt?: DateTimeFilter<"Transaction"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    wallet?: XOR<WalletScalarRelationFilter, WalletWhereInput>
    toWallet?: XOR<WalletNullableScalarRelationFilter, WalletWhereInput> | null
    category?: XOR<CategoryNullableScalarRelationFilter, CategoryWhereInput> | null
    installment?: XOR<InstallmentNullableScalarRelationFilter, InstallmentWhereInput> | null
  }

  export type TransactionOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrder
    walletId?: SortOrder
    toWalletId?: SortOrderInput | SortOrder
    categoryId?: SortOrderInput | SortOrder
    type?: SortOrder
    amount?: SortOrder
    description?: SortOrderInput | SortOrder
    isInstallment?: SortOrder
    installmentId?: SortOrderInput | SortOrder
    date?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    user?: UserOrderByWithRelationInput
    wallet?: WalletOrderByWithRelationInput
    toWallet?: WalletOrderByWithRelationInput
    category?: CategoryOrderByWithRelationInput
    installment?: InstallmentOrderByWithRelationInput
  }

  export type TransactionWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: TransactionWhereInput | TransactionWhereInput[]
    OR?: TransactionWhereInput[]
    NOT?: TransactionWhereInput | TransactionWhereInput[]
    userId?: StringFilter<"Transaction"> | string
    walletId?: StringFilter<"Transaction"> | string
    toWalletId?: StringNullableFilter<"Transaction"> | string | null
    categoryId?: StringNullableFilter<"Transaction"> | string | null
    type?: EnumTransactionTypeFilter<"Transaction"> | $Enums.TransactionType
    amount?: DecimalFilter<"Transaction"> | Decimal | DecimalJsLike | number | string
    description?: StringNullableFilter<"Transaction"> | string | null
    isInstallment?: BoolFilter<"Transaction"> | boolean
    installmentId?: StringNullableFilter<"Transaction"> | string | null
    date?: DateTimeFilter<"Transaction"> | Date | string
    createdAt?: DateTimeFilter<"Transaction"> | Date | string
    updatedAt?: DateTimeFilter<"Transaction"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    wallet?: XOR<WalletScalarRelationFilter, WalletWhereInput>
    toWallet?: XOR<WalletNullableScalarRelationFilter, WalletWhereInput> | null
    category?: XOR<CategoryNullableScalarRelationFilter, CategoryWhereInput> | null
    installment?: XOR<InstallmentNullableScalarRelationFilter, InstallmentWhereInput> | null
  }, "id">

  export type TransactionOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrder
    walletId?: SortOrder
    toWalletId?: SortOrderInput | SortOrder
    categoryId?: SortOrderInput | SortOrder
    type?: SortOrder
    amount?: SortOrder
    description?: SortOrderInput | SortOrder
    isInstallment?: SortOrder
    installmentId?: SortOrderInput | SortOrder
    date?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: TransactionCountOrderByAggregateInput
    _avg?: TransactionAvgOrderByAggregateInput
    _max?: TransactionMaxOrderByAggregateInput
    _min?: TransactionMinOrderByAggregateInput
    _sum?: TransactionSumOrderByAggregateInput
  }

  export type TransactionScalarWhereWithAggregatesInput = {
    AND?: TransactionScalarWhereWithAggregatesInput | TransactionScalarWhereWithAggregatesInput[]
    OR?: TransactionScalarWhereWithAggregatesInput[]
    NOT?: TransactionScalarWhereWithAggregatesInput | TransactionScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Transaction"> | string
    userId?: StringWithAggregatesFilter<"Transaction"> | string
    walletId?: StringWithAggregatesFilter<"Transaction"> | string
    toWalletId?: StringNullableWithAggregatesFilter<"Transaction"> | string | null
    categoryId?: StringNullableWithAggregatesFilter<"Transaction"> | string | null
    type?: EnumTransactionTypeWithAggregatesFilter<"Transaction"> | $Enums.TransactionType
    amount?: DecimalWithAggregatesFilter<"Transaction"> | Decimal | DecimalJsLike | number | string
    description?: StringNullableWithAggregatesFilter<"Transaction"> | string | null
    isInstallment?: BoolWithAggregatesFilter<"Transaction"> | boolean
    installmentId?: StringNullableWithAggregatesFilter<"Transaction"> | string | null
    date?: DateTimeWithAggregatesFilter<"Transaction"> | Date | string
    createdAt?: DateTimeWithAggregatesFilter<"Transaction"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Transaction"> | Date | string
  }

  export type InstallmentWhereInput = {
    AND?: InstallmentWhereInput | InstallmentWhereInput[]
    OR?: InstallmentWhereInput[]
    NOT?: InstallmentWhereInput | InstallmentWhereInput[]
    id?: StringFilter<"Installment"> | string
    userId?: StringFilter<"Installment"> | string
    walletId?: StringFilter<"Installment"> | string
    totalAmount?: DecimalFilter<"Installment"> | Decimal | DecimalJsLike | number | string
    interestRate?: DecimalFilter<"Installment"> | Decimal | DecimalJsLike | number | string
    totalInterest?: DecimalFilter<"Installment"> | Decimal | DecimalJsLike | number | string
    adminFee?: DecimalFilter<"Installment"> | Decimal | DecimalJsLike | number | string
    adminFeeType?: EnumAdminFeeTypeFilter<"Installment"> | $Enums.AdminFeeType
    totalAdminFee?: DecimalFilter<"Installment"> | Decimal | DecimalJsLike | number | string
    grandTotal?: DecimalFilter<"Installment"> | Decimal | DecimalJsLike | number | string
    installmentMonths?: IntFilter<"Installment"> | number
    currentTerm?: IntFilter<"Installment"> | number
    monthlyAmount?: DecimalFilter<"Installment"> | Decimal | DecimalJsLike | number | string
    status?: EnumInstallmentStatusFilter<"Installment"> | $Enums.InstallmentStatus
    startDate?: DateTimeFilter<"Installment"> | Date | string
    description?: StringNullableFilter<"Installment"> | string | null
    balanceDeducted?: BoolFilter<"Installment"> | boolean
    createdAt?: DateTimeFilter<"Installment"> | Date | string
    updatedAt?: DateTimeFilter<"Installment"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    wallet?: XOR<WalletScalarRelationFilter, WalletWhereInput>
    transactions?: TransactionListRelationFilter
  }

  export type InstallmentOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrder
    walletId?: SortOrder
    totalAmount?: SortOrder
    interestRate?: SortOrder
    totalInterest?: SortOrder
    adminFee?: SortOrder
    adminFeeType?: SortOrder
    totalAdminFee?: SortOrder
    grandTotal?: SortOrder
    installmentMonths?: SortOrder
    currentTerm?: SortOrder
    monthlyAmount?: SortOrder
    status?: SortOrder
    startDate?: SortOrder
    description?: SortOrderInput | SortOrder
    balanceDeducted?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    user?: UserOrderByWithRelationInput
    wallet?: WalletOrderByWithRelationInput
    transactions?: TransactionOrderByRelationAggregateInput
  }

  export type InstallmentWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: InstallmentWhereInput | InstallmentWhereInput[]
    OR?: InstallmentWhereInput[]
    NOT?: InstallmentWhereInput | InstallmentWhereInput[]
    userId?: StringFilter<"Installment"> | string
    walletId?: StringFilter<"Installment"> | string
    totalAmount?: DecimalFilter<"Installment"> | Decimal | DecimalJsLike | number | string
    interestRate?: DecimalFilter<"Installment"> | Decimal | DecimalJsLike | number | string
    totalInterest?: DecimalFilter<"Installment"> | Decimal | DecimalJsLike | number | string
    adminFee?: DecimalFilter<"Installment"> | Decimal | DecimalJsLike | number | string
    adminFeeType?: EnumAdminFeeTypeFilter<"Installment"> | $Enums.AdminFeeType
    totalAdminFee?: DecimalFilter<"Installment"> | Decimal | DecimalJsLike | number | string
    grandTotal?: DecimalFilter<"Installment"> | Decimal | DecimalJsLike | number | string
    installmentMonths?: IntFilter<"Installment"> | number
    currentTerm?: IntFilter<"Installment"> | number
    monthlyAmount?: DecimalFilter<"Installment"> | Decimal | DecimalJsLike | number | string
    status?: EnumInstallmentStatusFilter<"Installment"> | $Enums.InstallmentStatus
    startDate?: DateTimeFilter<"Installment"> | Date | string
    description?: StringNullableFilter<"Installment"> | string | null
    balanceDeducted?: BoolFilter<"Installment"> | boolean
    createdAt?: DateTimeFilter<"Installment"> | Date | string
    updatedAt?: DateTimeFilter<"Installment"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    wallet?: XOR<WalletScalarRelationFilter, WalletWhereInput>
    transactions?: TransactionListRelationFilter
  }, "id">

  export type InstallmentOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrder
    walletId?: SortOrder
    totalAmount?: SortOrder
    interestRate?: SortOrder
    totalInterest?: SortOrder
    adminFee?: SortOrder
    adminFeeType?: SortOrder
    totalAdminFee?: SortOrder
    grandTotal?: SortOrder
    installmentMonths?: SortOrder
    currentTerm?: SortOrder
    monthlyAmount?: SortOrder
    status?: SortOrder
    startDate?: SortOrder
    description?: SortOrderInput | SortOrder
    balanceDeducted?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: InstallmentCountOrderByAggregateInput
    _avg?: InstallmentAvgOrderByAggregateInput
    _max?: InstallmentMaxOrderByAggregateInput
    _min?: InstallmentMinOrderByAggregateInput
    _sum?: InstallmentSumOrderByAggregateInput
  }

  export type InstallmentScalarWhereWithAggregatesInput = {
    AND?: InstallmentScalarWhereWithAggregatesInput | InstallmentScalarWhereWithAggregatesInput[]
    OR?: InstallmentScalarWhereWithAggregatesInput[]
    NOT?: InstallmentScalarWhereWithAggregatesInput | InstallmentScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Installment"> | string
    userId?: StringWithAggregatesFilter<"Installment"> | string
    walletId?: StringWithAggregatesFilter<"Installment"> | string
    totalAmount?: DecimalWithAggregatesFilter<"Installment"> | Decimal | DecimalJsLike | number | string
    interestRate?: DecimalWithAggregatesFilter<"Installment"> | Decimal | DecimalJsLike | number | string
    totalInterest?: DecimalWithAggregatesFilter<"Installment"> | Decimal | DecimalJsLike | number | string
    adminFee?: DecimalWithAggregatesFilter<"Installment"> | Decimal | DecimalJsLike | number | string
    adminFeeType?: EnumAdminFeeTypeWithAggregatesFilter<"Installment"> | $Enums.AdminFeeType
    totalAdminFee?: DecimalWithAggregatesFilter<"Installment"> | Decimal | DecimalJsLike | number | string
    grandTotal?: DecimalWithAggregatesFilter<"Installment"> | Decimal | DecimalJsLike | number | string
    installmentMonths?: IntWithAggregatesFilter<"Installment"> | number
    currentTerm?: IntWithAggregatesFilter<"Installment"> | number
    monthlyAmount?: DecimalWithAggregatesFilter<"Installment"> | Decimal | DecimalJsLike | number | string
    status?: EnumInstallmentStatusWithAggregatesFilter<"Installment"> | $Enums.InstallmentStatus
    startDate?: DateTimeWithAggregatesFilter<"Installment"> | Date | string
    description?: StringNullableWithAggregatesFilter<"Installment"> | string | null
    balanceDeducted?: BoolWithAggregatesFilter<"Installment"> | boolean
    createdAt?: DateTimeWithAggregatesFilter<"Installment"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Installment"> | Date | string
  }

  export type TransferWhereInput = {
    AND?: TransferWhereInput | TransferWhereInput[]
    OR?: TransferWhereInput[]
    NOT?: TransferWhereInput | TransferWhereInput[]
    id?: StringFilter<"Transfer"> | string
    userId?: StringFilter<"Transfer"> | string
    fromWalletId?: StringFilter<"Transfer"> | string
    toWalletId?: StringFilter<"Transfer"> | string
    amount?: DecimalFilter<"Transfer"> | Decimal | DecimalJsLike | number | string
    note?: StringNullableFilter<"Transfer"> | string | null
    date?: DateTimeFilter<"Transfer"> | Date | string
    createdAt?: DateTimeFilter<"Transfer"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    fromWallet?: XOR<WalletScalarRelationFilter, WalletWhereInput>
    toWallet?: XOR<WalletScalarRelationFilter, WalletWhereInput>
  }

  export type TransferOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrder
    fromWalletId?: SortOrder
    toWalletId?: SortOrder
    amount?: SortOrder
    note?: SortOrderInput | SortOrder
    date?: SortOrder
    createdAt?: SortOrder
    user?: UserOrderByWithRelationInput
    fromWallet?: WalletOrderByWithRelationInput
    toWallet?: WalletOrderByWithRelationInput
  }

  export type TransferWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: TransferWhereInput | TransferWhereInput[]
    OR?: TransferWhereInput[]
    NOT?: TransferWhereInput | TransferWhereInput[]
    userId?: StringFilter<"Transfer"> | string
    fromWalletId?: StringFilter<"Transfer"> | string
    toWalletId?: StringFilter<"Transfer"> | string
    amount?: DecimalFilter<"Transfer"> | Decimal | DecimalJsLike | number | string
    note?: StringNullableFilter<"Transfer"> | string | null
    date?: DateTimeFilter<"Transfer"> | Date | string
    createdAt?: DateTimeFilter<"Transfer"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    fromWallet?: XOR<WalletScalarRelationFilter, WalletWhereInput>
    toWallet?: XOR<WalletScalarRelationFilter, WalletWhereInput>
  }, "id">

  export type TransferOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrder
    fromWalletId?: SortOrder
    toWalletId?: SortOrder
    amount?: SortOrder
    note?: SortOrderInput | SortOrder
    date?: SortOrder
    createdAt?: SortOrder
    _count?: TransferCountOrderByAggregateInput
    _avg?: TransferAvgOrderByAggregateInput
    _max?: TransferMaxOrderByAggregateInput
    _min?: TransferMinOrderByAggregateInput
    _sum?: TransferSumOrderByAggregateInput
  }

  export type TransferScalarWhereWithAggregatesInput = {
    AND?: TransferScalarWhereWithAggregatesInput | TransferScalarWhereWithAggregatesInput[]
    OR?: TransferScalarWhereWithAggregatesInput[]
    NOT?: TransferScalarWhereWithAggregatesInput | TransferScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Transfer"> | string
    userId?: StringWithAggregatesFilter<"Transfer"> | string
    fromWalletId?: StringWithAggregatesFilter<"Transfer"> | string
    toWalletId?: StringWithAggregatesFilter<"Transfer"> | string
    amount?: DecimalWithAggregatesFilter<"Transfer"> | Decimal | DecimalJsLike | number | string
    note?: StringNullableWithAggregatesFilter<"Transfer"> | string | null
    date?: DateTimeWithAggregatesFilter<"Transfer"> | Date | string
    createdAt?: DateTimeWithAggregatesFilter<"Transfer"> | Date | string
  }

  export type UserCreateInput = {
    id?: string
    email: string
    name: string
    avatarUrl?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    wallets?: WalletCreateNestedManyWithoutUserInput
    categories?: CategoryCreateNestedManyWithoutUserInput
    transactions?: TransactionCreateNestedManyWithoutUserInput
    installments?: InstallmentCreateNestedManyWithoutUserInput
    transfers?: TransferCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateInput = {
    id?: string
    email: string
    name: string
    avatarUrl?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    wallets?: WalletUncheckedCreateNestedManyWithoutUserInput
    categories?: CategoryUncheckedCreateNestedManyWithoutUserInput
    transactions?: TransactionUncheckedCreateNestedManyWithoutUserInput
    installments?: InstallmentUncheckedCreateNestedManyWithoutUserInput
    transfers?: TransferUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    wallets?: WalletUpdateManyWithoutUserNestedInput
    categories?: CategoryUpdateManyWithoutUserNestedInput
    transactions?: TransactionUpdateManyWithoutUserNestedInput
    installments?: InstallmentUpdateManyWithoutUserNestedInput
    transfers?: TransferUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    wallets?: WalletUncheckedUpdateManyWithoutUserNestedInput
    categories?: CategoryUncheckedUpdateManyWithoutUserNestedInput
    transactions?: TransactionUncheckedUpdateManyWithoutUserNestedInput
    installments?: InstallmentUncheckedUpdateManyWithoutUserNestedInput
    transfers?: TransferUncheckedUpdateManyWithoutUserNestedInput
  }

  export type UserCreateManyInput = {
    id?: string
    email: string
    name: string
    avatarUrl?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type WalletCreateInput = {
    id?: string
    name: string
    type?: $Enums.WalletType
    balance?: Decimal | DecimalJsLike | number | string
    creditLimit?: Decimal | DecimalJsLike | number | string
    initialBalance?: Decimal | DecimalJsLike | number | string
    icon?: string | null
    color?: string | null
    interestRate?: Decimal | DecimalJsLike | number | string
    isArchived?: boolean
    adminFee?: Decimal | DecimalJsLike | number | string
    adminFeeType?: $Enums.AdminFeeType
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutWalletsInput
    transactions?: TransactionCreateNestedManyWithoutWalletInput
    toTransactions?: TransactionCreateNestedManyWithoutToWalletInput
    installments?: InstallmentCreateNestedManyWithoutWalletInput
    fromTransfers?: TransferCreateNestedManyWithoutFromWalletInput
    toTransfers?: TransferCreateNestedManyWithoutToWalletInput
  }

  export type WalletUncheckedCreateInput = {
    id?: string
    userId: string
    name: string
    type?: $Enums.WalletType
    balance?: Decimal | DecimalJsLike | number | string
    creditLimit?: Decimal | DecimalJsLike | number | string
    initialBalance?: Decimal | DecimalJsLike | number | string
    icon?: string | null
    color?: string | null
    interestRate?: Decimal | DecimalJsLike | number | string
    isArchived?: boolean
    adminFee?: Decimal | DecimalJsLike | number | string
    adminFeeType?: $Enums.AdminFeeType
    createdAt?: Date | string
    updatedAt?: Date | string
    transactions?: TransactionUncheckedCreateNestedManyWithoutWalletInput
    toTransactions?: TransactionUncheckedCreateNestedManyWithoutToWalletInput
    installments?: InstallmentUncheckedCreateNestedManyWithoutWalletInput
    fromTransfers?: TransferUncheckedCreateNestedManyWithoutFromWalletInput
    toTransfers?: TransferUncheckedCreateNestedManyWithoutToWalletInput
  }

  export type WalletUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    type?: EnumWalletTypeFieldUpdateOperationsInput | $Enums.WalletType
    balance?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    creditLimit?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    initialBalance?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    icon?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    interestRate?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    isArchived?: BoolFieldUpdateOperationsInput | boolean
    adminFee?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    adminFeeType?: EnumAdminFeeTypeFieldUpdateOperationsInput | $Enums.AdminFeeType
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutWalletsNestedInput
    transactions?: TransactionUpdateManyWithoutWalletNestedInput
    toTransactions?: TransactionUpdateManyWithoutToWalletNestedInput
    installments?: InstallmentUpdateManyWithoutWalletNestedInput
    fromTransfers?: TransferUpdateManyWithoutFromWalletNestedInput
    toTransfers?: TransferUpdateManyWithoutToWalletNestedInput
  }

  export type WalletUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    type?: EnumWalletTypeFieldUpdateOperationsInput | $Enums.WalletType
    balance?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    creditLimit?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    initialBalance?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    icon?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    interestRate?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    isArchived?: BoolFieldUpdateOperationsInput | boolean
    adminFee?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    adminFeeType?: EnumAdminFeeTypeFieldUpdateOperationsInput | $Enums.AdminFeeType
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    transactions?: TransactionUncheckedUpdateManyWithoutWalletNestedInput
    toTransactions?: TransactionUncheckedUpdateManyWithoutToWalletNestedInput
    installments?: InstallmentUncheckedUpdateManyWithoutWalletNestedInput
    fromTransfers?: TransferUncheckedUpdateManyWithoutFromWalletNestedInput
    toTransfers?: TransferUncheckedUpdateManyWithoutToWalletNestedInput
  }

  export type WalletCreateManyInput = {
    id?: string
    userId: string
    name: string
    type?: $Enums.WalletType
    balance?: Decimal | DecimalJsLike | number | string
    creditLimit?: Decimal | DecimalJsLike | number | string
    initialBalance?: Decimal | DecimalJsLike | number | string
    icon?: string | null
    color?: string | null
    interestRate?: Decimal | DecimalJsLike | number | string
    isArchived?: boolean
    adminFee?: Decimal | DecimalJsLike | number | string
    adminFeeType?: $Enums.AdminFeeType
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type WalletUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    type?: EnumWalletTypeFieldUpdateOperationsInput | $Enums.WalletType
    balance?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    creditLimit?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    initialBalance?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    icon?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    interestRate?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    isArchived?: BoolFieldUpdateOperationsInput | boolean
    adminFee?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    adminFeeType?: EnumAdminFeeTypeFieldUpdateOperationsInput | $Enums.AdminFeeType
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type WalletUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    type?: EnumWalletTypeFieldUpdateOperationsInput | $Enums.WalletType
    balance?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    creditLimit?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    initialBalance?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    icon?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    interestRate?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    isArchived?: BoolFieldUpdateOperationsInput | boolean
    adminFee?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    adminFeeType?: EnumAdminFeeTypeFieldUpdateOperationsInput | $Enums.AdminFeeType
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CategoryCreateInput = {
    id?: string
    name: string
    type: $Enums.CategoryType
    icon?: string | null
    color?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutCategoriesInput
    transactions?: TransactionCreateNestedManyWithoutCategoryInput
  }

  export type CategoryUncheckedCreateInput = {
    id?: string
    userId: string
    name: string
    type: $Enums.CategoryType
    icon?: string | null
    color?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    transactions?: TransactionUncheckedCreateNestedManyWithoutCategoryInput
  }

  export type CategoryUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    type?: EnumCategoryTypeFieldUpdateOperationsInput | $Enums.CategoryType
    icon?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutCategoriesNestedInput
    transactions?: TransactionUpdateManyWithoutCategoryNestedInput
  }

  export type CategoryUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    type?: EnumCategoryTypeFieldUpdateOperationsInput | $Enums.CategoryType
    icon?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    transactions?: TransactionUncheckedUpdateManyWithoutCategoryNestedInput
  }

  export type CategoryCreateManyInput = {
    id?: string
    userId: string
    name: string
    type: $Enums.CategoryType
    icon?: string | null
    color?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type CategoryUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    type?: EnumCategoryTypeFieldUpdateOperationsInput | $Enums.CategoryType
    icon?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CategoryUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    type?: EnumCategoryTypeFieldUpdateOperationsInput | $Enums.CategoryType
    icon?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TransactionCreateInput = {
    id?: string
    type: $Enums.TransactionType
    amount: Decimal | DecimalJsLike | number | string
    description?: string | null
    isInstallment?: boolean
    date: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutTransactionsInput
    wallet: WalletCreateNestedOneWithoutTransactionsInput
    toWallet?: WalletCreateNestedOneWithoutToTransactionsInput
    category?: CategoryCreateNestedOneWithoutTransactionsInput
    installment?: InstallmentCreateNestedOneWithoutTransactionsInput
  }

  export type TransactionUncheckedCreateInput = {
    id?: string
    userId: string
    walletId: string
    toWalletId?: string | null
    categoryId?: string | null
    type: $Enums.TransactionType
    amount: Decimal | DecimalJsLike | number | string
    description?: string | null
    isInstallment?: boolean
    installmentId?: string | null
    date: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TransactionUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    type?: EnumTransactionTypeFieldUpdateOperationsInput | $Enums.TransactionType
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    isInstallment?: BoolFieldUpdateOperationsInput | boolean
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutTransactionsNestedInput
    wallet?: WalletUpdateOneRequiredWithoutTransactionsNestedInput
    toWallet?: WalletUpdateOneWithoutToTransactionsNestedInput
    category?: CategoryUpdateOneWithoutTransactionsNestedInput
    installment?: InstallmentUpdateOneWithoutTransactionsNestedInput
  }

  export type TransactionUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    walletId?: StringFieldUpdateOperationsInput | string
    toWalletId?: NullableStringFieldUpdateOperationsInput | string | null
    categoryId?: NullableStringFieldUpdateOperationsInput | string | null
    type?: EnumTransactionTypeFieldUpdateOperationsInput | $Enums.TransactionType
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    isInstallment?: BoolFieldUpdateOperationsInput | boolean
    installmentId?: NullableStringFieldUpdateOperationsInput | string | null
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TransactionCreateManyInput = {
    id?: string
    userId: string
    walletId: string
    toWalletId?: string | null
    categoryId?: string | null
    type: $Enums.TransactionType
    amount: Decimal | DecimalJsLike | number | string
    description?: string | null
    isInstallment?: boolean
    installmentId?: string | null
    date: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TransactionUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    type?: EnumTransactionTypeFieldUpdateOperationsInput | $Enums.TransactionType
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    isInstallment?: BoolFieldUpdateOperationsInput | boolean
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TransactionUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    walletId?: StringFieldUpdateOperationsInput | string
    toWalletId?: NullableStringFieldUpdateOperationsInput | string | null
    categoryId?: NullableStringFieldUpdateOperationsInput | string | null
    type?: EnumTransactionTypeFieldUpdateOperationsInput | $Enums.TransactionType
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    isInstallment?: BoolFieldUpdateOperationsInput | boolean
    installmentId?: NullableStringFieldUpdateOperationsInput | string | null
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type InstallmentCreateInput = {
    id?: string
    totalAmount: Decimal | DecimalJsLike | number | string
    interestRate?: Decimal | DecimalJsLike | number | string
    totalInterest?: Decimal | DecimalJsLike | number | string
    adminFee?: Decimal | DecimalJsLike | number | string
    adminFeeType?: $Enums.AdminFeeType
    totalAdminFee?: Decimal | DecimalJsLike | number | string
    grandTotal?: Decimal | DecimalJsLike | number | string
    installmentMonths: number
    currentTerm?: number
    monthlyAmount: Decimal | DecimalJsLike | number | string
    status?: $Enums.InstallmentStatus
    startDate: Date | string
    description?: string | null
    balanceDeducted?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutInstallmentsInput
    wallet: WalletCreateNestedOneWithoutInstallmentsInput
    transactions?: TransactionCreateNestedManyWithoutInstallmentInput
  }

  export type InstallmentUncheckedCreateInput = {
    id?: string
    userId: string
    walletId: string
    totalAmount: Decimal | DecimalJsLike | number | string
    interestRate?: Decimal | DecimalJsLike | number | string
    totalInterest?: Decimal | DecimalJsLike | number | string
    adminFee?: Decimal | DecimalJsLike | number | string
    adminFeeType?: $Enums.AdminFeeType
    totalAdminFee?: Decimal | DecimalJsLike | number | string
    grandTotal?: Decimal | DecimalJsLike | number | string
    installmentMonths: number
    currentTerm?: number
    monthlyAmount: Decimal | DecimalJsLike | number | string
    status?: $Enums.InstallmentStatus
    startDate: Date | string
    description?: string | null
    balanceDeducted?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    transactions?: TransactionUncheckedCreateNestedManyWithoutInstallmentInput
  }

  export type InstallmentUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    totalAmount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    interestRate?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    totalInterest?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    adminFee?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    adminFeeType?: EnumAdminFeeTypeFieldUpdateOperationsInput | $Enums.AdminFeeType
    totalAdminFee?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    grandTotal?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    installmentMonths?: IntFieldUpdateOperationsInput | number
    currentTerm?: IntFieldUpdateOperationsInput | number
    monthlyAmount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    status?: EnumInstallmentStatusFieldUpdateOperationsInput | $Enums.InstallmentStatus
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    balanceDeducted?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutInstallmentsNestedInput
    wallet?: WalletUpdateOneRequiredWithoutInstallmentsNestedInput
    transactions?: TransactionUpdateManyWithoutInstallmentNestedInput
  }

  export type InstallmentUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    walletId?: StringFieldUpdateOperationsInput | string
    totalAmount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    interestRate?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    totalInterest?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    adminFee?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    adminFeeType?: EnumAdminFeeTypeFieldUpdateOperationsInput | $Enums.AdminFeeType
    totalAdminFee?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    grandTotal?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    installmentMonths?: IntFieldUpdateOperationsInput | number
    currentTerm?: IntFieldUpdateOperationsInput | number
    monthlyAmount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    status?: EnumInstallmentStatusFieldUpdateOperationsInput | $Enums.InstallmentStatus
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    balanceDeducted?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    transactions?: TransactionUncheckedUpdateManyWithoutInstallmentNestedInput
  }

  export type InstallmentCreateManyInput = {
    id?: string
    userId: string
    walletId: string
    totalAmount: Decimal | DecimalJsLike | number | string
    interestRate?: Decimal | DecimalJsLike | number | string
    totalInterest?: Decimal | DecimalJsLike | number | string
    adminFee?: Decimal | DecimalJsLike | number | string
    adminFeeType?: $Enums.AdminFeeType
    totalAdminFee?: Decimal | DecimalJsLike | number | string
    grandTotal?: Decimal | DecimalJsLike | number | string
    installmentMonths: number
    currentTerm?: number
    monthlyAmount: Decimal | DecimalJsLike | number | string
    status?: $Enums.InstallmentStatus
    startDate: Date | string
    description?: string | null
    balanceDeducted?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type InstallmentUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    totalAmount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    interestRate?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    totalInterest?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    adminFee?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    adminFeeType?: EnumAdminFeeTypeFieldUpdateOperationsInput | $Enums.AdminFeeType
    totalAdminFee?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    grandTotal?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    installmentMonths?: IntFieldUpdateOperationsInput | number
    currentTerm?: IntFieldUpdateOperationsInput | number
    monthlyAmount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    status?: EnumInstallmentStatusFieldUpdateOperationsInput | $Enums.InstallmentStatus
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    balanceDeducted?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type InstallmentUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    walletId?: StringFieldUpdateOperationsInput | string
    totalAmount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    interestRate?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    totalInterest?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    adminFee?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    adminFeeType?: EnumAdminFeeTypeFieldUpdateOperationsInput | $Enums.AdminFeeType
    totalAdminFee?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    grandTotal?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    installmentMonths?: IntFieldUpdateOperationsInput | number
    currentTerm?: IntFieldUpdateOperationsInput | number
    monthlyAmount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    status?: EnumInstallmentStatusFieldUpdateOperationsInput | $Enums.InstallmentStatus
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    balanceDeducted?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TransferCreateInput = {
    id?: string
    amount: Decimal | DecimalJsLike | number | string
    note?: string | null
    date: Date | string
    createdAt?: Date | string
    user: UserCreateNestedOneWithoutTransfersInput
    fromWallet: WalletCreateNestedOneWithoutFromTransfersInput
    toWallet: WalletCreateNestedOneWithoutToTransfersInput
  }

  export type TransferUncheckedCreateInput = {
    id?: string
    userId: string
    fromWalletId: string
    toWalletId: string
    amount: Decimal | DecimalJsLike | number | string
    note?: string | null
    date: Date | string
    createdAt?: Date | string
  }

  export type TransferUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    note?: NullableStringFieldUpdateOperationsInput | string | null
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutTransfersNestedInput
    fromWallet?: WalletUpdateOneRequiredWithoutFromTransfersNestedInput
    toWallet?: WalletUpdateOneRequiredWithoutToTransfersNestedInput
  }

  export type TransferUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    fromWalletId?: StringFieldUpdateOperationsInput | string
    toWalletId?: StringFieldUpdateOperationsInput | string
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    note?: NullableStringFieldUpdateOperationsInput | string | null
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TransferCreateManyInput = {
    id?: string
    userId: string
    fromWalletId: string
    toWalletId: string
    amount: Decimal | DecimalJsLike | number | string
    note?: string | null
    date: Date | string
    createdAt?: Date | string
  }

  export type TransferUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    note?: NullableStringFieldUpdateOperationsInput | string | null
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TransferUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    fromWalletId?: StringFieldUpdateOperationsInput | string
    toWalletId?: StringFieldUpdateOperationsInput | string
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    note?: NullableStringFieldUpdateOperationsInput | string | null
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
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

  export type WalletListRelationFilter = {
    every?: WalletWhereInput
    some?: WalletWhereInput
    none?: WalletWhereInput
  }

  export type CategoryListRelationFilter = {
    every?: CategoryWhereInput
    some?: CategoryWhereInput
    none?: CategoryWhereInput
  }

  export type TransactionListRelationFilter = {
    every?: TransactionWhereInput
    some?: TransactionWhereInput
    none?: TransactionWhereInput
  }

  export type InstallmentListRelationFilter = {
    every?: InstallmentWhereInput
    some?: InstallmentWhereInput
    none?: InstallmentWhereInput
  }

  export type TransferListRelationFilter = {
    every?: TransferWhereInput
    some?: TransferWhereInput
    none?: TransferWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type WalletOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type CategoryOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type TransactionOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type InstallmentOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type TransferOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type UserCountOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    name?: SortOrder
    avatarUrl?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserMaxOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    name?: SortOrder
    avatarUrl?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserMinOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    name?: SortOrder
    avatarUrl?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
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

  export type EnumWalletTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.WalletType | EnumWalletTypeFieldRefInput<$PrismaModel>
    in?: $Enums.WalletType[] | ListEnumWalletTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.WalletType[] | ListEnumWalletTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumWalletTypeFilter<$PrismaModel> | $Enums.WalletType
  }

  export type DecimalFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type EnumAdminFeeTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.AdminFeeType | EnumAdminFeeTypeFieldRefInput<$PrismaModel>
    in?: $Enums.AdminFeeType[] | ListEnumAdminFeeTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.AdminFeeType[] | ListEnumAdminFeeTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumAdminFeeTypeFilter<$PrismaModel> | $Enums.AdminFeeType
  }

  export type UserScalarRelationFilter = {
    is?: UserWhereInput
    isNot?: UserWhereInput
  }

  export type WalletCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    type?: SortOrder
    balance?: SortOrder
    creditLimit?: SortOrder
    initialBalance?: SortOrder
    icon?: SortOrder
    color?: SortOrder
    interestRate?: SortOrder
    isArchived?: SortOrder
    adminFee?: SortOrder
    adminFeeType?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type WalletAvgOrderByAggregateInput = {
    balance?: SortOrder
    creditLimit?: SortOrder
    initialBalance?: SortOrder
    interestRate?: SortOrder
    adminFee?: SortOrder
  }

  export type WalletMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    type?: SortOrder
    balance?: SortOrder
    creditLimit?: SortOrder
    initialBalance?: SortOrder
    icon?: SortOrder
    color?: SortOrder
    interestRate?: SortOrder
    isArchived?: SortOrder
    adminFee?: SortOrder
    adminFeeType?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type WalletMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    type?: SortOrder
    balance?: SortOrder
    creditLimit?: SortOrder
    initialBalance?: SortOrder
    icon?: SortOrder
    color?: SortOrder
    interestRate?: SortOrder
    isArchived?: SortOrder
    adminFee?: SortOrder
    adminFeeType?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type WalletSumOrderByAggregateInput = {
    balance?: SortOrder
    creditLimit?: SortOrder
    initialBalance?: SortOrder
    interestRate?: SortOrder
    adminFee?: SortOrder
  }

  export type EnumWalletTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.WalletType | EnumWalletTypeFieldRefInput<$PrismaModel>
    in?: $Enums.WalletType[] | ListEnumWalletTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.WalletType[] | ListEnumWalletTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumWalletTypeWithAggregatesFilter<$PrismaModel> | $Enums.WalletType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumWalletTypeFilter<$PrismaModel>
    _max?: NestedEnumWalletTypeFilter<$PrismaModel>
  }

  export type DecimalWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedDecimalFilter<$PrismaModel>
    _sum?: NestedDecimalFilter<$PrismaModel>
    _min?: NestedDecimalFilter<$PrismaModel>
    _max?: NestedDecimalFilter<$PrismaModel>
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type EnumAdminFeeTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.AdminFeeType | EnumAdminFeeTypeFieldRefInput<$PrismaModel>
    in?: $Enums.AdminFeeType[] | ListEnumAdminFeeTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.AdminFeeType[] | ListEnumAdminFeeTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumAdminFeeTypeWithAggregatesFilter<$PrismaModel> | $Enums.AdminFeeType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumAdminFeeTypeFilter<$PrismaModel>
    _max?: NestedEnumAdminFeeTypeFilter<$PrismaModel>
  }

  export type EnumCategoryTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.CategoryType | EnumCategoryTypeFieldRefInput<$PrismaModel>
    in?: $Enums.CategoryType[] | ListEnumCategoryTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.CategoryType[] | ListEnumCategoryTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumCategoryTypeFilter<$PrismaModel> | $Enums.CategoryType
  }

  export type CategoryUserIdNameTypeCompoundUniqueInput = {
    userId: string
    name: string
    type: $Enums.CategoryType
  }

  export type CategoryCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    type?: SortOrder
    icon?: SortOrder
    color?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type CategoryMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    type?: SortOrder
    icon?: SortOrder
    color?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type CategoryMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    type?: SortOrder
    icon?: SortOrder
    color?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type EnumCategoryTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.CategoryType | EnumCategoryTypeFieldRefInput<$PrismaModel>
    in?: $Enums.CategoryType[] | ListEnumCategoryTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.CategoryType[] | ListEnumCategoryTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumCategoryTypeWithAggregatesFilter<$PrismaModel> | $Enums.CategoryType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumCategoryTypeFilter<$PrismaModel>
    _max?: NestedEnumCategoryTypeFilter<$PrismaModel>
  }

  export type EnumTransactionTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.TransactionType | EnumTransactionTypeFieldRefInput<$PrismaModel>
    in?: $Enums.TransactionType[] | ListEnumTransactionTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.TransactionType[] | ListEnumTransactionTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumTransactionTypeFilter<$PrismaModel> | $Enums.TransactionType
  }

  export type WalletScalarRelationFilter = {
    is?: WalletWhereInput
    isNot?: WalletWhereInput
  }

  export type WalletNullableScalarRelationFilter = {
    is?: WalletWhereInput | null
    isNot?: WalletWhereInput | null
  }

  export type CategoryNullableScalarRelationFilter = {
    is?: CategoryWhereInput | null
    isNot?: CategoryWhereInput | null
  }

  export type InstallmentNullableScalarRelationFilter = {
    is?: InstallmentWhereInput | null
    isNot?: InstallmentWhereInput | null
  }

  export type TransactionCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    walletId?: SortOrder
    toWalletId?: SortOrder
    categoryId?: SortOrder
    type?: SortOrder
    amount?: SortOrder
    description?: SortOrder
    isInstallment?: SortOrder
    installmentId?: SortOrder
    date?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type TransactionAvgOrderByAggregateInput = {
    amount?: SortOrder
  }

  export type TransactionMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    walletId?: SortOrder
    toWalletId?: SortOrder
    categoryId?: SortOrder
    type?: SortOrder
    amount?: SortOrder
    description?: SortOrder
    isInstallment?: SortOrder
    installmentId?: SortOrder
    date?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type TransactionMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    walletId?: SortOrder
    toWalletId?: SortOrder
    categoryId?: SortOrder
    type?: SortOrder
    amount?: SortOrder
    description?: SortOrder
    isInstallment?: SortOrder
    installmentId?: SortOrder
    date?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type TransactionSumOrderByAggregateInput = {
    amount?: SortOrder
  }

  export type EnumTransactionTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TransactionType | EnumTransactionTypeFieldRefInput<$PrismaModel>
    in?: $Enums.TransactionType[] | ListEnumTransactionTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.TransactionType[] | ListEnumTransactionTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumTransactionTypeWithAggregatesFilter<$PrismaModel> | $Enums.TransactionType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTransactionTypeFilter<$PrismaModel>
    _max?: NestedEnumTransactionTypeFilter<$PrismaModel>
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

  export type EnumInstallmentStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.InstallmentStatus | EnumInstallmentStatusFieldRefInput<$PrismaModel>
    in?: $Enums.InstallmentStatus[] | ListEnumInstallmentStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.InstallmentStatus[] | ListEnumInstallmentStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumInstallmentStatusFilter<$PrismaModel> | $Enums.InstallmentStatus
  }

  export type InstallmentCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    walletId?: SortOrder
    totalAmount?: SortOrder
    interestRate?: SortOrder
    totalInterest?: SortOrder
    adminFee?: SortOrder
    adminFeeType?: SortOrder
    totalAdminFee?: SortOrder
    grandTotal?: SortOrder
    installmentMonths?: SortOrder
    currentTerm?: SortOrder
    monthlyAmount?: SortOrder
    status?: SortOrder
    startDate?: SortOrder
    description?: SortOrder
    balanceDeducted?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type InstallmentAvgOrderByAggregateInput = {
    totalAmount?: SortOrder
    interestRate?: SortOrder
    totalInterest?: SortOrder
    adminFee?: SortOrder
    totalAdminFee?: SortOrder
    grandTotal?: SortOrder
    installmentMonths?: SortOrder
    currentTerm?: SortOrder
    monthlyAmount?: SortOrder
  }

  export type InstallmentMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    walletId?: SortOrder
    totalAmount?: SortOrder
    interestRate?: SortOrder
    totalInterest?: SortOrder
    adminFee?: SortOrder
    adminFeeType?: SortOrder
    totalAdminFee?: SortOrder
    grandTotal?: SortOrder
    installmentMonths?: SortOrder
    currentTerm?: SortOrder
    monthlyAmount?: SortOrder
    status?: SortOrder
    startDate?: SortOrder
    description?: SortOrder
    balanceDeducted?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type InstallmentMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    walletId?: SortOrder
    totalAmount?: SortOrder
    interestRate?: SortOrder
    totalInterest?: SortOrder
    adminFee?: SortOrder
    adminFeeType?: SortOrder
    totalAdminFee?: SortOrder
    grandTotal?: SortOrder
    installmentMonths?: SortOrder
    currentTerm?: SortOrder
    monthlyAmount?: SortOrder
    status?: SortOrder
    startDate?: SortOrder
    description?: SortOrder
    balanceDeducted?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type InstallmentSumOrderByAggregateInput = {
    totalAmount?: SortOrder
    interestRate?: SortOrder
    totalInterest?: SortOrder
    adminFee?: SortOrder
    totalAdminFee?: SortOrder
    grandTotal?: SortOrder
    installmentMonths?: SortOrder
    currentTerm?: SortOrder
    monthlyAmount?: SortOrder
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

  export type EnumInstallmentStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.InstallmentStatus | EnumInstallmentStatusFieldRefInput<$PrismaModel>
    in?: $Enums.InstallmentStatus[] | ListEnumInstallmentStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.InstallmentStatus[] | ListEnumInstallmentStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumInstallmentStatusWithAggregatesFilter<$PrismaModel> | $Enums.InstallmentStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumInstallmentStatusFilter<$PrismaModel>
    _max?: NestedEnumInstallmentStatusFilter<$PrismaModel>
  }

  export type TransferCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    fromWalletId?: SortOrder
    toWalletId?: SortOrder
    amount?: SortOrder
    note?: SortOrder
    date?: SortOrder
    createdAt?: SortOrder
  }

  export type TransferAvgOrderByAggregateInput = {
    amount?: SortOrder
  }

  export type TransferMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    fromWalletId?: SortOrder
    toWalletId?: SortOrder
    amount?: SortOrder
    note?: SortOrder
    date?: SortOrder
    createdAt?: SortOrder
  }

  export type TransferMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    fromWalletId?: SortOrder
    toWalletId?: SortOrder
    amount?: SortOrder
    note?: SortOrder
    date?: SortOrder
    createdAt?: SortOrder
  }

  export type TransferSumOrderByAggregateInput = {
    amount?: SortOrder
  }

  export type WalletCreateNestedManyWithoutUserInput = {
    create?: XOR<WalletCreateWithoutUserInput, WalletUncheckedCreateWithoutUserInput> | WalletCreateWithoutUserInput[] | WalletUncheckedCreateWithoutUserInput[]
    connectOrCreate?: WalletCreateOrConnectWithoutUserInput | WalletCreateOrConnectWithoutUserInput[]
    createMany?: WalletCreateManyUserInputEnvelope
    connect?: WalletWhereUniqueInput | WalletWhereUniqueInput[]
  }

  export type CategoryCreateNestedManyWithoutUserInput = {
    create?: XOR<CategoryCreateWithoutUserInput, CategoryUncheckedCreateWithoutUserInput> | CategoryCreateWithoutUserInput[] | CategoryUncheckedCreateWithoutUserInput[]
    connectOrCreate?: CategoryCreateOrConnectWithoutUserInput | CategoryCreateOrConnectWithoutUserInput[]
    createMany?: CategoryCreateManyUserInputEnvelope
    connect?: CategoryWhereUniqueInput | CategoryWhereUniqueInput[]
  }

  export type TransactionCreateNestedManyWithoutUserInput = {
    create?: XOR<TransactionCreateWithoutUserInput, TransactionUncheckedCreateWithoutUserInput> | TransactionCreateWithoutUserInput[] | TransactionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: TransactionCreateOrConnectWithoutUserInput | TransactionCreateOrConnectWithoutUserInput[]
    createMany?: TransactionCreateManyUserInputEnvelope
    connect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
  }

  export type InstallmentCreateNestedManyWithoutUserInput = {
    create?: XOR<InstallmentCreateWithoutUserInput, InstallmentUncheckedCreateWithoutUserInput> | InstallmentCreateWithoutUserInput[] | InstallmentUncheckedCreateWithoutUserInput[]
    connectOrCreate?: InstallmentCreateOrConnectWithoutUserInput | InstallmentCreateOrConnectWithoutUserInput[]
    createMany?: InstallmentCreateManyUserInputEnvelope
    connect?: InstallmentWhereUniqueInput | InstallmentWhereUniqueInput[]
  }

  export type TransferCreateNestedManyWithoutUserInput = {
    create?: XOR<TransferCreateWithoutUserInput, TransferUncheckedCreateWithoutUserInput> | TransferCreateWithoutUserInput[] | TransferUncheckedCreateWithoutUserInput[]
    connectOrCreate?: TransferCreateOrConnectWithoutUserInput | TransferCreateOrConnectWithoutUserInput[]
    createMany?: TransferCreateManyUserInputEnvelope
    connect?: TransferWhereUniqueInput | TransferWhereUniqueInput[]
  }

  export type WalletUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<WalletCreateWithoutUserInput, WalletUncheckedCreateWithoutUserInput> | WalletCreateWithoutUserInput[] | WalletUncheckedCreateWithoutUserInput[]
    connectOrCreate?: WalletCreateOrConnectWithoutUserInput | WalletCreateOrConnectWithoutUserInput[]
    createMany?: WalletCreateManyUserInputEnvelope
    connect?: WalletWhereUniqueInput | WalletWhereUniqueInput[]
  }

  export type CategoryUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<CategoryCreateWithoutUserInput, CategoryUncheckedCreateWithoutUserInput> | CategoryCreateWithoutUserInput[] | CategoryUncheckedCreateWithoutUserInput[]
    connectOrCreate?: CategoryCreateOrConnectWithoutUserInput | CategoryCreateOrConnectWithoutUserInput[]
    createMany?: CategoryCreateManyUserInputEnvelope
    connect?: CategoryWhereUniqueInput | CategoryWhereUniqueInput[]
  }

  export type TransactionUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<TransactionCreateWithoutUserInput, TransactionUncheckedCreateWithoutUserInput> | TransactionCreateWithoutUserInput[] | TransactionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: TransactionCreateOrConnectWithoutUserInput | TransactionCreateOrConnectWithoutUserInput[]
    createMany?: TransactionCreateManyUserInputEnvelope
    connect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
  }

  export type InstallmentUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<InstallmentCreateWithoutUserInput, InstallmentUncheckedCreateWithoutUserInput> | InstallmentCreateWithoutUserInput[] | InstallmentUncheckedCreateWithoutUserInput[]
    connectOrCreate?: InstallmentCreateOrConnectWithoutUserInput | InstallmentCreateOrConnectWithoutUserInput[]
    createMany?: InstallmentCreateManyUserInputEnvelope
    connect?: InstallmentWhereUniqueInput | InstallmentWhereUniqueInput[]
  }

  export type TransferUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<TransferCreateWithoutUserInput, TransferUncheckedCreateWithoutUserInput> | TransferCreateWithoutUserInput[] | TransferUncheckedCreateWithoutUserInput[]
    connectOrCreate?: TransferCreateOrConnectWithoutUserInput | TransferCreateOrConnectWithoutUserInput[]
    createMany?: TransferCreateManyUserInputEnvelope
    connect?: TransferWhereUniqueInput | TransferWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type WalletUpdateManyWithoutUserNestedInput = {
    create?: XOR<WalletCreateWithoutUserInput, WalletUncheckedCreateWithoutUserInput> | WalletCreateWithoutUserInput[] | WalletUncheckedCreateWithoutUserInput[]
    connectOrCreate?: WalletCreateOrConnectWithoutUserInput | WalletCreateOrConnectWithoutUserInput[]
    upsert?: WalletUpsertWithWhereUniqueWithoutUserInput | WalletUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: WalletCreateManyUserInputEnvelope
    set?: WalletWhereUniqueInput | WalletWhereUniqueInput[]
    disconnect?: WalletWhereUniqueInput | WalletWhereUniqueInput[]
    delete?: WalletWhereUniqueInput | WalletWhereUniqueInput[]
    connect?: WalletWhereUniqueInput | WalletWhereUniqueInput[]
    update?: WalletUpdateWithWhereUniqueWithoutUserInput | WalletUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: WalletUpdateManyWithWhereWithoutUserInput | WalletUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: WalletScalarWhereInput | WalletScalarWhereInput[]
  }

  export type CategoryUpdateManyWithoutUserNestedInput = {
    create?: XOR<CategoryCreateWithoutUserInput, CategoryUncheckedCreateWithoutUserInput> | CategoryCreateWithoutUserInput[] | CategoryUncheckedCreateWithoutUserInput[]
    connectOrCreate?: CategoryCreateOrConnectWithoutUserInput | CategoryCreateOrConnectWithoutUserInput[]
    upsert?: CategoryUpsertWithWhereUniqueWithoutUserInput | CategoryUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: CategoryCreateManyUserInputEnvelope
    set?: CategoryWhereUniqueInput | CategoryWhereUniqueInput[]
    disconnect?: CategoryWhereUniqueInput | CategoryWhereUniqueInput[]
    delete?: CategoryWhereUniqueInput | CategoryWhereUniqueInput[]
    connect?: CategoryWhereUniqueInput | CategoryWhereUniqueInput[]
    update?: CategoryUpdateWithWhereUniqueWithoutUserInput | CategoryUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: CategoryUpdateManyWithWhereWithoutUserInput | CategoryUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: CategoryScalarWhereInput | CategoryScalarWhereInput[]
  }

  export type TransactionUpdateManyWithoutUserNestedInput = {
    create?: XOR<TransactionCreateWithoutUserInput, TransactionUncheckedCreateWithoutUserInput> | TransactionCreateWithoutUserInput[] | TransactionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: TransactionCreateOrConnectWithoutUserInput | TransactionCreateOrConnectWithoutUserInput[]
    upsert?: TransactionUpsertWithWhereUniqueWithoutUserInput | TransactionUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: TransactionCreateManyUserInputEnvelope
    set?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    disconnect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    delete?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    connect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    update?: TransactionUpdateWithWhereUniqueWithoutUserInput | TransactionUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: TransactionUpdateManyWithWhereWithoutUserInput | TransactionUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: TransactionScalarWhereInput | TransactionScalarWhereInput[]
  }

  export type InstallmentUpdateManyWithoutUserNestedInput = {
    create?: XOR<InstallmentCreateWithoutUserInput, InstallmentUncheckedCreateWithoutUserInput> | InstallmentCreateWithoutUserInput[] | InstallmentUncheckedCreateWithoutUserInput[]
    connectOrCreate?: InstallmentCreateOrConnectWithoutUserInput | InstallmentCreateOrConnectWithoutUserInput[]
    upsert?: InstallmentUpsertWithWhereUniqueWithoutUserInput | InstallmentUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: InstallmentCreateManyUserInputEnvelope
    set?: InstallmentWhereUniqueInput | InstallmentWhereUniqueInput[]
    disconnect?: InstallmentWhereUniqueInput | InstallmentWhereUniqueInput[]
    delete?: InstallmentWhereUniqueInput | InstallmentWhereUniqueInput[]
    connect?: InstallmentWhereUniqueInput | InstallmentWhereUniqueInput[]
    update?: InstallmentUpdateWithWhereUniqueWithoutUserInput | InstallmentUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: InstallmentUpdateManyWithWhereWithoutUserInput | InstallmentUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: InstallmentScalarWhereInput | InstallmentScalarWhereInput[]
  }

  export type TransferUpdateManyWithoutUserNestedInput = {
    create?: XOR<TransferCreateWithoutUserInput, TransferUncheckedCreateWithoutUserInput> | TransferCreateWithoutUserInput[] | TransferUncheckedCreateWithoutUserInput[]
    connectOrCreate?: TransferCreateOrConnectWithoutUserInput | TransferCreateOrConnectWithoutUserInput[]
    upsert?: TransferUpsertWithWhereUniqueWithoutUserInput | TransferUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: TransferCreateManyUserInputEnvelope
    set?: TransferWhereUniqueInput | TransferWhereUniqueInput[]
    disconnect?: TransferWhereUniqueInput | TransferWhereUniqueInput[]
    delete?: TransferWhereUniqueInput | TransferWhereUniqueInput[]
    connect?: TransferWhereUniqueInput | TransferWhereUniqueInput[]
    update?: TransferUpdateWithWhereUniqueWithoutUserInput | TransferUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: TransferUpdateManyWithWhereWithoutUserInput | TransferUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: TransferScalarWhereInput | TransferScalarWhereInput[]
  }

  export type WalletUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<WalletCreateWithoutUserInput, WalletUncheckedCreateWithoutUserInput> | WalletCreateWithoutUserInput[] | WalletUncheckedCreateWithoutUserInput[]
    connectOrCreate?: WalletCreateOrConnectWithoutUserInput | WalletCreateOrConnectWithoutUserInput[]
    upsert?: WalletUpsertWithWhereUniqueWithoutUserInput | WalletUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: WalletCreateManyUserInputEnvelope
    set?: WalletWhereUniqueInput | WalletWhereUniqueInput[]
    disconnect?: WalletWhereUniqueInput | WalletWhereUniqueInput[]
    delete?: WalletWhereUniqueInput | WalletWhereUniqueInput[]
    connect?: WalletWhereUniqueInput | WalletWhereUniqueInput[]
    update?: WalletUpdateWithWhereUniqueWithoutUserInput | WalletUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: WalletUpdateManyWithWhereWithoutUserInput | WalletUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: WalletScalarWhereInput | WalletScalarWhereInput[]
  }

  export type CategoryUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<CategoryCreateWithoutUserInput, CategoryUncheckedCreateWithoutUserInput> | CategoryCreateWithoutUserInput[] | CategoryUncheckedCreateWithoutUserInput[]
    connectOrCreate?: CategoryCreateOrConnectWithoutUserInput | CategoryCreateOrConnectWithoutUserInput[]
    upsert?: CategoryUpsertWithWhereUniqueWithoutUserInput | CategoryUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: CategoryCreateManyUserInputEnvelope
    set?: CategoryWhereUniqueInput | CategoryWhereUniqueInput[]
    disconnect?: CategoryWhereUniqueInput | CategoryWhereUniqueInput[]
    delete?: CategoryWhereUniqueInput | CategoryWhereUniqueInput[]
    connect?: CategoryWhereUniqueInput | CategoryWhereUniqueInput[]
    update?: CategoryUpdateWithWhereUniqueWithoutUserInput | CategoryUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: CategoryUpdateManyWithWhereWithoutUserInput | CategoryUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: CategoryScalarWhereInput | CategoryScalarWhereInput[]
  }

  export type TransactionUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<TransactionCreateWithoutUserInput, TransactionUncheckedCreateWithoutUserInput> | TransactionCreateWithoutUserInput[] | TransactionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: TransactionCreateOrConnectWithoutUserInput | TransactionCreateOrConnectWithoutUserInput[]
    upsert?: TransactionUpsertWithWhereUniqueWithoutUserInput | TransactionUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: TransactionCreateManyUserInputEnvelope
    set?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    disconnect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    delete?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    connect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    update?: TransactionUpdateWithWhereUniqueWithoutUserInput | TransactionUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: TransactionUpdateManyWithWhereWithoutUserInput | TransactionUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: TransactionScalarWhereInput | TransactionScalarWhereInput[]
  }

  export type InstallmentUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<InstallmentCreateWithoutUserInput, InstallmentUncheckedCreateWithoutUserInput> | InstallmentCreateWithoutUserInput[] | InstallmentUncheckedCreateWithoutUserInput[]
    connectOrCreate?: InstallmentCreateOrConnectWithoutUserInput | InstallmentCreateOrConnectWithoutUserInput[]
    upsert?: InstallmentUpsertWithWhereUniqueWithoutUserInput | InstallmentUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: InstallmentCreateManyUserInputEnvelope
    set?: InstallmentWhereUniqueInput | InstallmentWhereUniqueInput[]
    disconnect?: InstallmentWhereUniqueInput | InstallmentWhereUniqueInput[]
    delete?: InstallmentWhereUniqueInput | InstallmentWhereUniqueInput[]
    connect?: InstallmentWhereUniqueInput | InstallmentWhereUniqueInput[]
    update?: InstallmentUpdateWithWhereUniqueWithoutUserInput | InstallmentUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: InstallmentUpdateManyWithWhereWithoutUserInput | InstallmentUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: InstallmentScalarWhereInput | InstallmentScalarWhereInput[]
  }

  export type TransferUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<TransferCreateWithoutUserInput, TransferUncheckedCreateWithoutUserInput> | TransferCreateWithoutUserInput[] | TransferUncheckedCreateWithoutUserInput[]
    connectOrCreate?: TransferCreateOrConnectWithoutUserInput | TransferCreateOrConnectWithoutUserInput[]
    upsert?: TransferUpsertWithWhereUniqueWithoutUserInput | TransferUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: TransferCreateManyUserInputEnvelope
    set?: TransferWhereUniqueInput | TransferWhereUniqueInput[]
    disconnect?: TransferWhereUniqueInput | TransferWhereUniqueInput[]
    delete?: TransferWhereUniqueInput | TransferWhereUniqueInput[]
    connect?: TransferWhereUniqueInput | TransferWhereUniqueInput[]
    update?: TransferUpdateWithWhereUniqueWithoutUserInput | TransferUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: TransferUpdateManyWithWhereWithoutUserInput | TransferUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: TransferScalarWhereInput | TransferScalarWhereInput[]
  }

  export type UserCreateNestedOneWithoutWalletsInput = {
    create?: XOR<UserCreateWithoutWalletsInput, UserUncheckedCreateWithoutWalletsInput>
    connectOrCreate?: UserCreateOrConnectWithoutWalletsInput
    connect?: UserWhereUniqueInput
  }

  export type TransactionCreateNestedManyWithoutWalletInput = {
    create?: XOR<TransactionCreateWithoutWalletInput, TransactionUncheckedCreateWithoutWalletInput> | TransactionCreateWithoutWalletInput[] | TransactionUncheckedCreateWithoutWalletInput[]
    connectOrCreate?: TransactionCreateOrConnectWithoutWalletInput | TransactionCreateOrConnectWithoutWalletInput[]
    createMany?: TransactionCreateManyWalletInputEnvelope
    connect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
  }

  export type TransactionCreateNestedManyWithoutToWalletInput = {
    create?: XOR<TransactionCreateWithoutToWalletInput, TransactionUncheckedCreateWithoutToWalletInput> | TransactionCreateWithoutToWalletInput[] | TransactionUncheckedCreateWithoutToWalletInput[]
    connectOrCreate?: TransactionCreateOrConnectWithoutToWalletInput | TransactionCreateOrConnectWithoutToWalletInput[]
    createMany?: TransactionCreateManyToWalletInputEnvelope
    connect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
  }

  export type InstallmentCreateNestedManyWithoutWalletInput = {
    create?: XOR<InstallmentCreateWithoutWalletInput, InstallmentUncheckedCreateWithoutWalletInput> | InstallmentCreateWithoutWalletInput[] | InstallmentUncheckedCreateWithoutWalletInput[]
    connectOrCreate?: InstallmentCreateOrConnectWithoutWalletInput | InstallmentCreateOrConnectWithoutWalletInput[]
    createMany?: InstallmentCreateManyWalletInputEnvelope
    connect?: InstallmentWhereUniqueInput | InstallmentWhereUniqueInput[]
  }

  export type TransferCreateNestedManyWithoutFromWalletInput = {
    create?: XOR<TransferCreateWithoutFromWalletInput, TransferUncheckedCreateWithoutFromWalletInput> | TransferCreateWithoutFromWalletInput[] | TransferUncheckedCreateWithoutFromWalletInput[]
    connectOrCreate?: TransferCreateOrConnectWithoutFromWalletInput | TransferCreateOrConnectWithoutFromWalletInput[]
    createMany?: TransferCreateManyFromWalletInputEnvelope
    connect?: TransferWhereUniqueInput | TransferWhereUniqueInput[]
  }

  export type TransferCreateNestedManyWithoutToWalletInput = {
    create?: XOR<TransferCreateWithoutToWalletInput, TransferUncheckedCreateWithoutToWalletInput> | TransferCreateWithoutToWalletInput[] | TransferUncheckedCreateWithoutToWalletInput[]
    connectOrCreate?: TransferCreateOrConnectWithoutToWalletInput | TransferCreateOrConnectWithoutToWalletInput[]
    createMany?: TransferCreateManyToWalletInputEnvelope
    connect?: TransferWhereUniqueInput | TransferWhereUniqueInput[]
  }

  export type TransactionUncheckedCreateNestedManyWithoutWalletInput = {
    create?: XOR<TransactionCreateWithoutWalletInput, TransactionUncheckedCreateWithoutWalletInput> | TransactionCreateWithoutWalletInput[] | TransactionUncheckedCreateWithoutWalletInput[]
    connectOrCreate?: TransactionCreateOrConnectWithoutWalletInput | TransactionCreateOrConnectWithoutWalletInput[]
    createMany?: TransactionCreateManyWalletInputEnvelope
    connect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
  }

  export type TransactionUncheckedCreateNestedManyWithoutToWalletInput = {
    create?: XOR<TransactionCreateWithoutToWalletInput, TransactionUncheckedCreateWithoutToWalletInput> | TransactionCreateWithoutToWalletInput[] | TransactionUncheckedCreateWithoutToWalletInput[]
    connectOrCreate?: TransactionCreateOrConnectWithoutToWalletInput | TransactionCreateOrConnectWithoutToWalletInput[]
    createMany?: TransactionCreateManyToWalletInputEnvelope
    connect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
  }

  export type InstallmentUncheckedCreateNestedManyWithoutWalletInput = {
    create?: XOR<InstallmentCreateWithoutWalletInput, InstallmentUncheckedCreateWithoutWalletInput> | InstallmentCreateWithoutWalletInput[] | InstallmentUncheckedCreateWithoutWalletInput[]
    connectOrCreate?: InstallmentCreateOrConnectWithoutWalletInput | InstallmentCreateOrConnectWithoutWalletInput[]
    createMany?: InstallmentCreateManyWalletInputEnvelope
    connect?: InstallmentWhereUniqueInput | InstallmentWhereUniqueInput[]
  }

  export type TransferUncheckedCreateNestedManyWithoutFromWalletInput = {
    create?: XOR<TransferCreateWithoutFromWalletInput, TransferUncheckedCreateWithoutFromWalletInput> | TransferCreateWithoutFromWalletInput[] | TransferUncheckedCreateWithoutFromWalletInput[]
    connectOrCreate?: TransferCreateOrConnectWithoutFromWalletInput | TransferCreateOrConnectWithoutFromWalletInput[]
    createMany?: TransferCreateManyFromWalletInputEnvelope
    connect?: TransferWhereUniqueInput | TransferWhereUniqueInput[]
  }

  export type TransferUncheckedCreateNestedManyWithoutToWalletInput = {
    create?: XOR<TransferCreateWithoutToWalletInput, TransferUncheckedCreateWithoutToWalletInput> | TransferCreateWithoutToWalletInput[] | TransferUncheckedCreateWithoutToWalletInput[]
    connectOrCreate?: TransferCreateOrConnectWithoutToWalletInput | TransferCreateOrConnectWithoutToWalletInput[]
    createMany?: TransferCreateManyToWalletInputEnvelope
    connect?: TransferWhereUniqueInput | TransferWhereUniqueInput[]
  }

  export type EnumWalletTypeFieldUpdateOperationsInput = {
    set?: $Enums.WalletType
  }

  export type DecimalFieldUpdateOperationsInput = {
    set?: Decimal | DecimalJsLike | number | string
    increment?: Decimal | DecimalJsLike | number | string
    decrement?: Decimal | DecimalJsLike | number | string
    multiply?: Decimal | DecimalJsLike | number | string
    divide?: Decimal | DecimalJsLike | number | string
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type EnumAdminFeeTypeFieldUpdateOperationsInput = {
    set?: $Enums.AdminFeeType
  }

  export type UserUpdateOneRequiredWithoutWalletsNestedInput = {
    create?: XOR<UserCreateWithoutWalletsInput, UserUncheckedCreateWithoutWalletsInput>
    connectOrCreate?: UserCreateOrConnectWithoutWalletsInput
    upsert?: UserUpsertWithoutWalletsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutWalletsInput, UserUpdateWithoutWalletsInput>, UserUncheckedUpdateWithoutWalletsInput>
  }

  export type TransactionUpdateManyWithoutWalletNestedInput = {
    create?: XOR<TransactionCreateWithoutWalletInput, TransactionUncheckedCreateWithoutWalletInput> | TransactionCreateWithoutWalletInput[] | TransactionUncheckedCreateWithoutWalletInput[]
    connectOrCreate?: TransactionCreateOrConnectWithoutWalletInput | TransactionCreateOrConnectWithoutWalletInput[]
    upsert?: TransactionUpsertWithWhereUniqueWithoutWalletInput | TransactionUpsertWithWhereUniqueWithoutWalletInput[]
    createMany?: TransactionCreateManyWalletInputEnvelope
    set?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    disconnect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    delete?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    connect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    update?: TransactionUpdateWithWhereUniqueWithoutWalletInput | TransactionUpdateWithWhereUniqueWithoutWalletInput[]
    updateMany?: TransactionUpdateManyWithWhereWithoutWalletInput | TransactionUpdateManyWithWhereWithoutWalletInput[]
    deleteMany?: TransactionScalarWhereInput | TransactionScalarWhereInput[]
  }

  export type TransactionUpdateManyWithoutToWalletNestedInput = {
    create?: XOR<TransactionCreateWithoutToWalletInput, TransactionUncheckedCreateWithoutToWalletInput> | TransactionCreateWithoutToWalletInput[] | TransactionUncheckedCreateWithoutToWalletInput[]
    connectOrCreate?: TransactionCreateOrConnectWithoutToWalletInput | TransactionCreateOrConnectWithoutToWalletInput[]
    upsert?: TransactionUpsertWithWhereUniqueWithoutToWalletInput | TransactionUpsertWithWhereUniqueWithoutToWalletInput[]
    createMany?: TransactionCreateManyToWalletInputEnvelope
    set?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    disconnect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    delete?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    connect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    update?: TransactionUpdateWithWhereUniqueWithoutToWalletInput | TransactionUpdateWithWhereUniqueWithoutToWalletInput[]
    updateMany?: TransactionUpdateManyWithWhereWithoutToWalletInput | TransactionUpdateManyWithWhereWithoutToWalletInput[]
    deleteMany?: TransactionScalarWhereInput | TransactionScalarWhereInput[]
  }

  export type InstallmentUpdateManyWithoutWalletNestedInput = {
    create?: XOR<InstallmentCreateWithoutWalletInput, InstallmentUncheckedCreateWithoutWalletInput> | InstallmentCreateWithoutWalletInput[] | InstallmentUncheckedCreateWithoutWalletInput[]
    connectOrCreate?: InstallmentCreateOrConnectWithoutWalletInput | InstallmentCreateOrConnectWithoutWalletInput[]
    upsert?: InstallmentUpsertWithWhereUniqueWithoutWalletInput | InstallmentUpsertWithWhereUniqueWithoutWalletInput[]
    createMany?: InstallmentCreateManyWalletInputEnvelope
    set?: InstallmentWhereUniqueInput | InstallmentWhereUniqueInput[]
    disconnect?: InstallmentWhereUniqueInput | InstallmentWhereUniqueInput[]
    delete?: InstallmentWhereUniqueInput | InstallmentWhereUniqueInput[]
    connect?: InstallmentWhereUniqueInput | InstallmentWhereUniqueInput[]
    update?: InstallmentUpdateWithWhereUniqueWithoutWalletInput | InstallmentUpdateWithWhereUniqueWithoutWalletInput[]
    updateMany?: InstallmentUpdateManyWithWhereWithoutWalletInput | InstallmentUpdateManyWithWhereWithoutWalletInput[]
    deleteMany?: InstallmentScalarWhereInput | InstallmentScalarWhereInput[]
  }

  export type TransferUpdateManyWithoutFromWalletNestedInput = {
    create?: XOR<TransferCreateWithoutFromWalletInput, TransferUncheckedCreateWithoutFromWalletInput> | TransferCreateWithoutFromWalletInput[] | TransferUncheckedCreateWithoutFromWalletInput[]
    connectOrCreate?: TransferCreateOrConnectWithoutFromWalletInput | TransferCreateOrConnectWithoutFromWalletInput[]
    upsert?: TransferUpsertWithWhereUniqueWithoutFromWalletInput | TransferUpsertWithWhereUniqueWithoutFromWalletInput[]
    createMany?: TransferCreateManyFromWalletInputEnvelope
    set?: TransferWhereUniqueInput | TransferWhereUniqueInput[]
    disconnect?: TransferWhereUniqueInput | TransferWhereUniqueInput[]
    delete?: TransferWhereUniqueInput | TransferWhereUniqueInput[]
    connect?: TransferWhereUniqueInput | TransferWhereUniqueInput[]
    update?: TransferUpdateWithWhereUniqueWithoutFromWalletInput | TransferUpdateWithWhereUniqueWithoutFromWalletInput[]
    updateMany?: TransferUpdateManyWithWhereWithoutFromWalletInput | TransferUpdateManyWithWhereWithoutFromWalletInput[]
    deleteMany?: TransferScalarWhereInput | TransferScalarWhereInput[]
  }

  export type TransferUpdateManyWithoutToWalletNestedInput = {
    create?: XOR<TransferCreateWithoutToWalletInput, TransferUncheckedCreateWithoutToWalletInput> | TransferCreateWithoutToWalletInput[] | TransferUncheckedCreateWithoutToWalletInput[]
    connectOrCreate?: TransferCreateOrConnectWithoutToWalletInput | TransferCreateOrConnectWithoutToWalletInput[]
    upsert?: TransferUpsertWithWhereUniqueWithoutToWalletInput | TransferUpsertWithWhereUniqueWithoutToWalletInput[]
    createMany?: TransferCreateManyToWalletInputEnvelope
    set?: TransferWhereUniqueInput | TransferWhereUniqueInput[]
    disconnect?: TransferWhereUniqueInput | TransferWhereUniqueInput[]
    delete?: TransferWhereUniqueInput | TransferWhereUniqueInput[]
    connect?: TransferWhereUniqueInput | TransferWhereUniqueInput[]
    update?: TransferUpdateWithWhereUniqueWithoutToWalletInput | TransferUpdateWithWhereUniqueWithoutToWalletInput[]
    updateMany?: TransferUpdateManyWithWhereWithoutToWalletInput | TransferUpdateManyWithWhereWithoutToWalletInput[]
    deleteMany?: TransferScalarWhereInput | TransferScalarWhereInput[]
  }

  export type TransactionUncheckedUpdateManyWithoutWalletNestedInput = {
    create?: XOR<TransactionCreateWithoutWalletInput, TransactionUncheckedCreateWithoutWalletInput> | TransactionCreateWithoutWalletInput[] | TransactionUncheckedCreateWithoutWalletInput[]
    connectOrCreate?: TransactionCreateOrConnectWithoutWalletInput | TransactionCreateOrConnectWithoutWalletInput[]
    upsert?: TransactionUpsertWithWhereUniqueWithoutWalletInput | TransactionUpsertWithWhereUniqueWithoutWalletInput[]
    createMany?: TransactionCreateManyWalletInputEnvelope
    set?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    disconnect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    delete?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    connect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    update?: TransactionUpdateWithWhereUniqueWithoutWalletInput | TransactionUpdateWithWhereUniqueWithoutWalletInput[]
    updateMany?: TransactionUpdateManyWithWhereWithoutWalletInput | TransactionUpdateManyWithWhereWithoutWalletInput[]
    deleteMany?: TransactionScalarWhereInput | TransactionScalarWhereInput[]
  }

  export type TransactionUncheckedUpdateManyWithoutToWalletNestedInput = {
    create?: XOR<TransactionCreateWithoutToWalletInput, TransactionUncheckedCreateWithoutToWalletInput> | TransactionCreateWithoutToWalletInput[] | TransactionUncheckedCreateWithoutToWalletInput[]
    connectOrCreate?: TransactionCreateOrConnectWithoutToWalletInput | TransactionCreateOrConnectWithoutToWalletInput[]
    upsert?: TransactionUpsertWithWhereUniqueWithoutToWalletInput | TransactionUpsertWithWhereUniqueWithoutToWalletInput[]
    createMany?: TransactionCreateManyToWalletInputEnvelope
    set?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    disconnect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    delete?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    connect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    update?: TransactionUpdateWithWhereUniqueWithoutToWalletInput | TransactionUpdateWithWhereUniqueWithoutToWalletInput[]
    updateMany?: TransactionUpdateManyWithWhereWithoutToWalletInput | TransactionUpdateManyWithWhereWithoutToWalletInput[]
    deleteMany?: TransactionScalarWhereInput | TransactionScalarWhereInput[]
  }

  export type InstallmentUncheckedUpdateManyWithoutWalletNestedInput = {
    create?: XOR<InstallmentCreateWithoutWalletInput, InstallmentUncheckedCreateWithoutWalletInput> | InstallmentCreateWithoutWalletInput[] | InstallmentUncheckedCreateWithoutWalletInput[]
    connectOrCreate?: InstallmentCreateOrConnectWithoutWalletInput | InstallmentCreateOrConnectWithoutWalletInput[]
    upsert?: InstallmentUpsertWithWhereUniqueWithoutWalletInput | InstallmentUpsertWithWhereUniqueWithoutWalletInput[]
    createMany?: InstallmentCreateManyWalletInputEnvelope
    set?: InstallmentWhereUniqueInput | InstallmentWhereUniqueInput[]
    disconnect?: InstallmentWhereUniqueInput | InstallmentWhereUniqueInput[]
    delete?: InstallmentWhereUniqueInput | InstallmentWhereUniqueInput[]
    connect?: InstallmentWhereUniqueInput | InstallmentWhereUniqueInput[]
    update?: InstallmentUpdateWithWhereUniqueWithoutWalletInput | InstallmentUpdateWithWhereUniqueWithoutWalletInput[]
    updateMany?: InstallmentUpdateManyWithWhereWithoutWalletInput | InstallmentUpdateManyWithWhereWithoutWalletInput[]
    deleteMany?: InstallmentScalarWhereInput | InstallmentScalarWhereInput[]
  }

  export type TransferUncheckedUpdateManyWithoutFromWalletNestedInput = {
    create?: XOR<TransferCreateWithoutFromWalletInput, TransferUncheckedCreateWithoutFromWalletInput> | TransferCreateWithoutFromWalletInput[] | TransferUncheckedCreateWithoutFromWalletInput[]
    connectOrCreate?: TransferCreateOrConnectWithoutFromWalletInput | TransferCreateOrConnectWithoutFromWalletInput[]
    upsert?: TransferUpsertWithWhereUniqueWithoutFromWalletInput | TransferUpsertWithWhereUniqueWithoutFromWalletInput[]
    createMany?: TransferCreateManyFromWalletInputEnvelope
    set?: TransferWhereUniqueInput | TransferWhereUniqueInput[]
    disconnect?: TransferWhereUniqueInput | TransferWhereUniqueInput[]
    delete?: TransferWhereUniqueInput | TransferWhereUniqueInput[]
    connect?: TransferWhereUniqueInput | TransferWhereUniqueInput[]
    update?: TransferUpdateWithWhereUniqueWithoutFromWalletInput | TransferUpdateWithWhereUniqueWithoutFromWalletInput[]
    updateMany?: TransferUpdateManyWithWhereWithoutFromWalletInput | TransferUpdateManyWithWhereWithoutFromWalletInput[]
    deleteMany?: TransferScalarWhereInput | TransferScalarWhereInput[]
  }

  export type TransferUncheckedUpdateManyWithoutToWalletNestedInput = {
    create?: XOR<TransferCreateWithoutToWalletInput, TransferUncheckedCreateWithoutToWalletInput> | TransferCreateWithoutToWalletInput[] | TransferUncheckedCreateWithoutToWalletInput[]
    connectOrCreate?: TransferCreateOrConnectWithoutToWalletInput | TransferCreateOrConnectWithoutToWalletInput[]
    upsert?: TransferUpsertWithWhereUniqueWithoutToWalletInput | TransferUpsertWithWhereUniqueWithoutToWalletInput[]
    createMany?: TransferCreateManyToWalletInputEnvelope
    set?: TransferWhereUniqueInput | TransferWhereUniqueInput[]
    disconnect?: TransferWhereUniqueInput | TransferWhereUniqueInput[]
    delete?: TransferWhereUniqueInput | TransferWhereUniqueInput[]
    connect?: TransferWhereUniqueInput | TransferWhereUniqueInput[]
    update?: TransferUpdateWithWhereUniqueWithoutToWalletInput | TransferUpdateWithWhereUniqueWithoutToWalletInput[]
    updateMany?: TransferUpdateManyWithWhereWithoutToWalletInput | TransferUpdateManyWithWhereWithoutToWalletInput[]
    deleteMany?: TransferScalarWhereInput | TransferScalarWhereInput[]
  }

  export type UserCreateNestedOneWithoutCategoriesInput = {
    create?: XOR<UserCreateWithoutCategoriesInput, UserUncheckedCreateWithoutCategoriesInput>
    connectOrCreate?: UserCreateOrConnectWithoutCategoriesInput
    connect?: UserWhereUniqueInput
  }

  export type TransactionCreateNestedManyWithoutCategoryInput = {
    create?: XOR<TransactionCreateWithoutCategoryInput, TransactionUncheckedCreateWithoutCategoryInput> | TransactionCreateWithoutCategoryInput[] | TransactionUncheckedCreateWithoutCategoryInput[]
    connectOrCreate?: TransactionCreateOrConnectWithoutCategoryInput | TransactionCreateOrConnectWithoutCategoryInput[]
    createMany?: TransactionCreateManyCategoryInputEnvelope
    connect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
  }

  export type TransactionUncheckedCreateNestedManyWithoutCategoryInput = {
    create?: XOR<TransactionCreateWithoutCategoryInput, TransactionUncheckedCreateWithoutCategoryInput> | TransactionCreateWithoutCategoryInput[] | TransactionUncheckedCreateWithoutCategoryInput[]
    connectOrCreate?: TransactionCreateOrConnectWithoutCategoryInput | TransactionCreateOrConnectWithoutCategoryInput[]
    createMany?: TransactionCreateManyCategoryInputEnvelope
    connect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
  }

  export type EnumCategoryTypeFieldUpdateOperationsInput = {
    set?: $Enums.CategoryType
  }

  export type UserUpdateOneRequiredWithoutCategoriesNestedInput = {
    create?: XOR<UserCreateWithoutCategoriesInput, UserUncheckedCreateWithoutCategoriesInput>
    connectOrCreate?: UserCreateOrConnectWithoutCategoriesInput
    upsert?: UserUpsertWithoutCategoriesInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutCategoriesInput, UserUpdateWithoutCategoriesInput>, UserUncheckedUpdateWithoutCategoriesInput>
  }

  export type TransactionUpdateManyWithoutCategoryNestedInput = {
    create?: XOR<TransactionCreateWithoutCategoryInput, TransactionUncheckedCreateWithoutCategoryInput> | TransactionCreateWithoutCategoryInput[] | TransactionUncheckedCreateWithoutCategoryInput[]
    connectOrCreate?: TransactionCreateOrConnectWithoutCategoryInput | TransactionCreateOrConnectWithoutCategoryInput[]
    upsert?: TransactionUpsertWithWhereUniqueWithoutCategoryInput | TransactionUpsertWithWhereUniqueWithoutCategoryInput[]
    createMany?: TransactionCreateManyCategoryInputEnvelope
    set?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    disconnect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    delete?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    connect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    update?: TransactionUpdateWithWhereUniqueWithoutCategoryInput | TransactionUpdateWithWhereUniqueWithoutCategoryInput[]
    updateMany?: TransactionUpdateManyWithWhereWithoutCategoryInput | TransactionUpdateManyWithWhereWithoutCategoryInput[]
    deleteMany?: TransactionScalarWhereInput | TransactionScalarWhereInput[]
  }

  export type TransactionUncheckedUpdateManyWithoutCategoryNestedInput = {
    create?: XOR<TransactionCreateWithoutCategoryInput, TransactionUncheckedCreateWithoutCategoryInput> | TransactionCreateWithoutCategoryInput[] | TransactionUncheckedCreateWithoutCategoryInput[]
    connectOrCreate?: TransactionCreateOrConnectWithoutCategoryInput | TransactionCreateOrConnectWithoutCategoryInput[]
    upsert?: TransactionUpsertWithWhereUniqueWithoutCategoryInput | TransactionUpsertWithWhereUniqueWithoutCategoryInput[]
    createMany?: TransactionCreateManyCategoryInputEnvelope
    set?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    disconnect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    delete?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    connect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    update?: TransactionUpdateWithWhereUniqueWithoutCategoryInput | TransactionUpdateWithWhereUniqueWithoutCategoryInput[]
    updateMany?: TransactionUpdateManyWithWhereWithoutCategoryInput | TransactionUpdateManyWithWhereWithoutCategoryInput[]
    deleteMany?: TransactionScalarWhereInput | TransactionScalarWhereInput[]
  }

  export type UserCreateNestedOneWithoutTransactionsInput = {
    create?: XOR<UserCreateWithoutTransactionsInput, UserUncheckedCreateWithoutTransactionsInput>
    connectOrCreate?: UserCreateOrConnectWithoutTransactionsInput
    connect?: UserWhereUniqueInput
  }

  export type WalletCreateNestedOneWithoutTransactionsInput = {
    create?: XOR<WalletCreateWithoutTransactionsInput, WalletUncheckedCreateWithoutTransactionsInput>
    connectOrCreate?: WalletCreateOrConnectWithoutTransactionsInput
    connect?: WalletWhereUniqueInput
  }

  export type WalletCreateNestedOneWithoutToTransactionsInput = {
    create?: XOR<WalletCreateWithoutToTransactionsInput, WalletUncheckedCreateWithoutToTransactionsInput>
    connectOrCreate?: WalletCreateOrConnectWithoutToTransactionsInput
    connect?: WalletWhereUniqueInput
  }

  export type CategoryCreateNestedOneWithoutTransactionsInput = {
    create?: XOR<CategoryCreateWithoutTransactionsInput, CategoryUncheckedCreateWithoutTransactionsInput>
    connectOrCreate?: CategoryCreateOrConnectWithoutTransactionsInput
    connect?: CategoryWhereUniqueInput
  }

  export type InstallmentCreateNestedOneWithoutTransactionsInput = {
    create?: XOR<InstallmentCreateWithoutTransactionsInput, InstallmentUncheckedCreateWithoutTransactionsInput>
    connectOrCreate?: InstallmentCreateOrConnectWithoutTransactionsInput
    connect?: InstallmentWhereUniqueInput
  }

  export type EnumTransactionTypeFieldUpdateOperationsInput = {
    set?: $Enums.TransactionType
  }

  export type UserUpdateOneRequiredWithoutTransactionsNestedInput = {
    create?: XOR<UserCreateWithoutTransactionsInput, UserUncheckedCreateWithoutTransactionsInput>
    connectOrCreate?: UserCreateOrConnectWithoutTransactionsInput
    upsert?: UserUpsertWithoutTransactionsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutTransactionsInput, UserUpdateWithoutTransactionsInput>, UserUncheckedUpdateWithoutTransactionsInput>
  }

  export type WalletUpdateOneRequiredWithoutTransactionsNestedInput = {
    create?: XOR<WalletCreateWithoutTransactionsInput, WalletUncheckedCreateWithoutTransactionsInput>
    connectOrCreate?: WalletCreateOrConnectWithoutTransactionsInput
    upsert?: WalletUpsertWithoutTransactionsInput
    connect?: WalletWhereUniqueInput
    update?: XOR<XOR<WalletUpdateToOneWithWhereWithoutTransactionsInput, WalletUpdateWithoutTransactionsInput>, WalletUncheckedUpdateWithoutTransactionsInput>
  }

  export type WalletUpdateOneWithoutToTransactionsNestedInput = {
    create?: XOR<WalletCreateWithoutToTransactionsInput, WalletUncheckedCreateWithoutToTransactionsInput>
    connectOrCreate?: WalletCreateOrConnectWithoutToTransactionsInput
    upsert?: WalletUpsertWithoutToTransactionsInput
    disconnect?: WalletWhereInput | boolean
    delete?: WalletWhereInput | boolean
    connect?: WalletWhereUniqueInput
    update?: XOR<XOR<WalletUpdateToOneWithWhereWithoutToTransactionsInput, WalletUpdateWithoutToTransactionsInput>, WalletUncheckedUpdateWithoutToTransactionsInput>
  }

  export type CategoryUpdateOneWithoutTransactionsNestedInput = {
    create?: XOR<CategoryCreateWithoutTransactionsInput, CategoryUncheckedCreateWithoutTransactionsInput>
    connectOrCreate?: CategoryCreateOrConnectWithoutTransactionsInput
    upsert?: CategoryUpsertWithoutTransactionsInput
    disconnect?: CategoryWhereInput | boolean
    delete?: CategoryWhereInput | boolean
    connect?: CategoryWhereUniqueInput
    update?: XOR<XOR<CategoryUpdateToOneWithWhereWithoutTransactionsInput, CategoryUpdateWithoutTransactionsInput>, CategoryUncheckedUpdateWithoutTransactionsInput>
  }

  export type InstallmentUpdateOneWithoutTransactionsNestedInput = {
    create?: XOR<InstallmentCreateWithoutTransactionsInput, InstallmentUncheckedCreateWithoutTransactionsInput>
    connectOrCreate?: InstallmentCreateOrConnectWithoutTransactionsInput
    upsert?: InstallmentUpsertWithoutTransactionsInput
    disconnect?: InstallmentWhereInput | boolean
    delete?: InstallmentWhereInput | boolean
    connect?: InstallmentWhereUniqueInput
    update?: XOR<XOR<InstallmentUpdateToOneWithWhereWithoutTransactionsInput, InstallmentUpdateWithoutTransactionsInput>, InstallmentUncheckedUpdateWithoutTransactionsInput>
  }

  export type UserCreateNestedOneWithoutInstallmentsInput = {
    create?: XOR<UserCreateWithoutInstallmentsInput, UserUncheckedCreateWithoutInstallmentsInput>
    connectOrCreate?: UserCreateOrConnectWithoutInstallmentsInput
    connect?: UserWhereUniqueInput
  }

  export type WalletCreateNestedOneWithoutInstallmentsInput = {
    create?: XOR<WalletCreateWithoutInstallmentsInput, WalletUncheckedCreateWithoutInstallmentsInput>
    connectOrCreate?: WalletCreateOrConnectWithoutInstallmentsInput
    connect?: WalletWhereUniqueInput
  }

  export type TransactionCreateNestedManyWithoutInstallmentInput = {
    create?: XOR<TransactionCreateWithoutInstallmentInput, TransactionUncheckedCreateWithoutInstallmentInput> | TransactionCreateWithoutInstallmentInput[] | TransactionUncheckedCreateWithoutInstallmentInput[]
    connectOrCreate?: TransactionCreateOrConnectWithoutInstallmentInput | TransactionCreateOrConnectWithoutInstallmentInput[]
    createMany?: TransactionCreateManyInstallmentInputEnvelope
    connect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
  }

  export type TransactionUncheckedCreateNestedManyWithoutInstallmentInput = {
    create?: XOR<TransactionCreateWithoutInstallmentInput, TransactionUncheckedCreateWithoutInstallmentInput> | TransactionCreateWithoutInstallmentInput[] | TransactionUncheckedCreateWithoutInstallmentInput[]
    connectOrCreate?: TransactionCreateOrConnectWithoutInstallmentInput | TransactionCreateOrConnectWithoutInstallmentInput[]
    createMany?: TransactionCreateManyInstallmentInputEnvelope
    connect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type EnumInstallmentStatusFieldUpdateOperationsInput = {
    set?: $Enums.InstallmentStatus
  }

  export type UserUpdateOneRequiredWithoutInstallmentsNestedInput = {
    create?: XOR<UserCreateWithoutInstallmentsInput, UserUncheckedCreateWithoutInstallmentsInput>
    connectOrCreate?: UserCreateOrConnectWithoutInstallmentsInput
    upsert?: UserUpsertWithoutInstallmentsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutInstallmentsInput, UserUpdateWithoutInstallmentsInput>, UserUncheckedUpdateWithoutInstallmentsInput>
  }

  export type WalletUpdateOneRequiredWithoutInstallmentsNestedInput = {
    create?: XOR<WalletCreateWithoutInstallmentsInput, WalletUncheckedCreateWithoutInstallmentsInput>
    connectOrCreate?: WalletCreateOrConnectWithoutInstallmentsInput
    upsert?: WalletUpsertWithoutInstallmentsInput
    connect?: WalletWhereUniqueInput
    update?: XOR<XOR<WalletUpdateToOneWithWhereWithoutInstallmentsInput, WalletUpdateWithoutInstallmentsInput>, WalletUncheckedUpdateWithoutInstallmentsInput>
  }

  export type TransactionUpdateManyWithoutInstallmentNestedInput = {
    create?: XOR<TransactionCreateWithoutInstallmentInput, TransactionUncheckedCreateWithoutInstallmentInput> | TransactionCreateWithoutInstallmentInput[] | TransactionUncheckedCreateWithoutInstallmentInput[]
    connectOrCreate?: TransactionCreateOrConnectWithoutInstallmentInput | TransactionCreateOrConnectWithoutInstallmentInput[]
    upsert?: TransactionUpsertWithWhereUniqueWithoutInstallmentInput | TransactionUpsertWithWhereUniqueWithoutInstallmentInput[]
    createMany?: TransactionCreateManyInstallmentInputEnvelope
    set?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    disconnect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    delete?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    connect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    update?: TransactionUpdateWithWhereUniqueWithoutInstallmentInput | TransactionUpdateWithWhereUniqueWithoutInstallmentInput[]
    updateMany?: TransactionUpdateManyWithWhereWithoutInstallmentInput | TransactionUpdateManyWithWhereWithoutInstallmentInput[]
    deleteMany?: TransactionScalarWhereInput | TransactionScalarWhereInput[]
  }

  export type TransactionUncheckedUpdateManyWithoutInstallmentNestedInput = {
    create?: XOR<TransactionCreateWithoutInstallmentInput, TransactionUncheckedCreateWithoutInstallmentInput> | TransactionCreateWithoutInstallmentInput[] | TransactionUncheckedCreateWithoutInstallmentInput[]
    connectOrCreate?: TransactionCreateOrConnectWithoutInstallmentInput | TransactionCreateOrConnectWithoutInstallmentInput[]
    upsert?: TransactionUpsertWithWhereUniqueWithoutInstallmentInput | TransactionUpsertWithWhereUniqueWithoutInstallmentInput[]
    createMany?: TransactionCreateManyInstallmentInputEnvelope
    set?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    disconnect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    delete?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    connect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    update?: TransactionUpdateWithWhereUniqueWithoutInstallmentInput | TransactionUpdateWithWhereUniqueWithoutInstallmentInput[]
    updateMany?: TransactionUpdateManyWithWhereWithoutInstallmentInput | TransactionUpdateManyWithWhereWithoutInstallmentInput[]
    deleteMany?: TransactionScalarWhereInput | TransactionScalarWhereInput[]
  }

  export type UserCreateNestedOneWithoutTransfersInput = {
    create?: XOR<UserCreateWithoutTransfersInput, UserUncheckedCreateWithoutTransfersInput>
    connectOrCreate?: UserCreateOrConnectWithoutTransfersInput
    connect?: UserWhereUniqueInput
  }

  export type WalletCreateNestedOneWithoutFromTransfersInput = {
    create?: XOR<WalletCreateWithoutFromTransfersInput, WalletUncheckedCreateWithoutFromTransfersInput>
    connectOrCreate?: WalletCreateOrConnectWithoutFromTransfersInput
    connect?: WalletWhereUniqueInput
  }

  export type WalletCreateNestedOneWithoutToTransfersInput = {
    create?: XOR<WalletCreateWithoutToTransfersInput, WalletUncheckedCreateWithoutToTransfersInput>
    connectOrCreate?: WalletCreateOrConnectWithoutToTransfersInput
    connect?: WalletWhereUniqueInput
  }

  export type UserUpdateOneRequiredWithoutTransfersNestedInput = {
    create?: XOR<UserCreateWithoutTransfersInput, UserUncheckedCreateWithoutTransfersInput>
    connectOrCreate?: UserCreateOrConnectWithoutTransfersInput
    upsert?: UserUpsertWithoutTransfersInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutTransfersInput, UserUpdateWithoutTransfersInput>, UserUncheckedUpdateWithoutTransfersInput>
  }

  export type WalletUpdateOneRequiredWithoutFromTransfersNestedInput = {
    create?: XOR<WalletCreateWithoutFromTransfersInput, WalletUncheckedCreateWithoutFromTransfersInput>
    connectOrCreate?: WalletCreateOrConnectWithoutFromTransfersInput
    upsert?: WalletUpsertWithoutFromTransfersInput
    connect?: WalletWhereUniqueInput
    update?: XOR<XOR<WalletUpdateToOneWithWhereWithoutFromTransfersInput, WalletUpdateWithoutFromTransfersInput>, WalletUncheckedUpdateWithoutFromTransfersInput>
  }

  export type WalletUpdateOneRequiredWithoutToTransfersNestedInput = {
    create?: XOR<WalletCreateWithoutToTransfersInput, WalletUncheckedCreateWithoutToTransfersInput>
    connectOrCreate?: WalletCreateOrConnectWithoutToTransfersInput
    upsert?: WalletUpsertWithoutToTransfersInput
    connect?: WalletWhereUniqueInput
    update?: XOR<XOR<WalletUpdateToOneWithWhereWithoutToTransfersInput, WalletUpdateWithoutToTransfersInput>, WalletUncheckedUpdateWithoutToTransfersInput>
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

  export type NestedEnumWalletTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.WalletType | EnumWalletTypeFieldRefInput<$PrismaModel>
    in?: $Enums.WalletType[] | ListEnumWalletTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.WalletType[] | ListEnumWalletTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumWalletTypeFilter<$PrismaModel> | $Enums.WalletType
  }

  export type NestedDecimalFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedEnumAdminFeeTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.AdminFeeType | EnumAdminFeeTypeFieldRefInput<$PrismaModel>
    in?: $Enums.AdminFeeType[] | ListEnumAdminFeeTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.AdminFeeType[] | ListEnumAdminFeeTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumAdminFeeTypeFilter<$PrismaModel> | $Enums.AdminFeeType
  }

  export type NestedEnumWalletTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.WalletType | EnumWalletTypeFieldRefInput<$PrismaModel>
    in?: $Enums.WalletType[] | ListEnumWalletTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.WalletType[] | ListEnumWalletTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumWalletTypeWithAggregatesFilter<$PrismaModel> | $Enums.WalletType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumWalletTypeFilter<$PrismaModel>
    _max?: NestedEnumWalletTypeFilter<$PrismaModel>
  }

  export type NestedDecimalWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedDecimalFilter<$PrismaModel>
    _sum?: NestedDecimalFilter<$PrismaModel>
    _min?: NestedDecimalFilter<$PrismaModel>
    _max?: NestedDecimalFilter<$PrismaModel>
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type NestedEnumAdminFeeTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.AdminFeeType | EnumAdminFeeTypeFieldRefInput<$PrismaModel>
    in?: $Enums.AdminFeeType[] | ListEnumAdminFeeTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.AdminFeeType[] | ListEnumAdminFeeTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumAdminFeeTypeWithAggregatesFilter<$PrismaModel> | $Enums.AdminFeeType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumAdminFeeTypeFilter<$PrismaModel>
    _max?: NestedEnumAdminFeeTypeFilter<$PrismaModel>
  }

  export type NestedEnumCategoryTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.CategoryType | EnumCategoryTypeFieldRefInput<$PrismaModel>
    in?: $Enums.CategoryType[] | ListEnumCategoryTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.CategoryType[] | ListEnumCategoryTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumCategoryTypeFilter<$PrismaModel> | $Enums.CategoryType
  }

  export type NestedEnumCategoryTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.CategoryType | EnumCategoryTypeFieldRefInput<$PrismaModel>
    in?: $Enums.CategoryType[] | ListEnumCategoryTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.CategoryType[] | ListEnumCategoryTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumCategoryTypeWithAggregatesFilter<$PrismaModel> | $Enums.CategoryType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumCategoryTypeFilter<$PrismaModel>
    _max?: NestedEnumCategoryTypeFilter<$PrismaModel>
  }

  export type NestedEnumTransactionTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.TransactionType | EnumTransactionTypeFieldRefInput<$PrismaModel>
    in?: $Enums.TransactionType[] | ListEnumTransactionTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.TransactionType[] | ListEnumTransactionTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumTransactionTypeFilter<$PrismaModel> | $Enums.TransactionType
  }

  export type NestedEnumTransactionTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TransactionType | EnumTransactionTypeFieldRefInput<$PrismaModel>
    in?: $Enums.TransactionType[] | ListEnumTransactionTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.TransactionType[] | ListEnumTransactionTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumTransactionTypeWithAggregatesFilter<$PrismaModel> | $Enums.TransactionType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTransactionTypeFilter<$PrismaModel>
    _max?: NestedEnumTransactionTypeFilter<$PrismaModel>
  }

  export type NestedEnumInstallmentStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.InstallmentStatus | EnumInstallmentStatusFieldRefInput<$PrismaModel>
    in?: $Enums.InstallmentStatus[] | ListEnumInstallmentStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.InstallmentStatus[] | ListEnumInstallmentStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumInstallmentStatusFilter<$PrismaModel> | $Enums.InstallmentStatus
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

  export type NestedEnumInstallmentStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.InstallmentStatus | EnumInstallmentStatusFieldRefInput<$PrismaModel>
    in?: $Enums.InstallmentStatus[] | ListEnumInstallmentStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.InstallmentStatus[] | ListEnumInstallmentStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumInstallmentStatusWithAggregatesFilter<$PrismaModel> | $Enums.InstallmentStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumInstallmentStatusFilter<$PrismaModel>
    _max?: NestedEnumInstallmentStatusFilter<$PrismaModel>
  }

  export type WalletCreateWithoutUserInput = {
    id?: string
    name: string
    type?: $Enums.WalletType
    balance?: Decimal | DecimalJsLike | number | string
    creditLimit?: Decimal | DecimalJsLike | number | string
    initialBalance?: Decimal | DecimalJsLike | number | string
    icon?: string | null
    color?: string | null
    interestRate?: Decimal | DecimalJsLike | number | string
    isArchived?: boolean
    adminFee?: Decimal | DecimalJsLike | number | string
    adminFeeType?: $Enums.AdminFeeType
    createdAt?: Date | string
    updatedAt?: Date | string
    transactions?: TransactionCreateNestedManyWithoutWalletInput
    toTransactions?: TransactionCreateNestedManyWithoutToWalletInput
    installments?: InstallmentCreateNestedManyWithoutWalletInput
    fromTransfers?: TransferCreateNestedManyWithoutFromWalletInput
    toTransfers?: TransferCreateNestedManyWithoutToWalletInput
  }

  export type WalletUncheckedCreateWithoutUserInput = {
    id?: string
    name: string
    type?: $Enums.WalletType
    balance?: Decimal | DecimalJsLike | number | string
    creditLimit?: Decimal | DecimalJsLike | number | string
    initialBalance?: Decimal | DecimalJsLike | number | string
    icon?: string | null
    color?: string | null
    interestRate?: Decimal | DecimalJsLike | number | string
    isArchived?: boolean
    adminFee?: Decimal | DecimalJsLike | number | string
    adminFeeType?: $Enums.AdminFeeType
    createdAt?: Date | string
    updatedAt?: Date | string
    transactions?: TransactionUncheckedCreateNestedManyWithoutWalletInput
    toTransactions?: TransactionUncheckedCreateNestedManyWithoutToWalletInput
    installments?: InstallmentUncheckedCreateNestedManyWithoutWalletInput
    fromTransfers?: TransferUncheckedCreateNestedManyWithoutFromWalletInput
    toTransfers?: TransferUncheckedCreateNestedManyWithoutToWalletInput
  }

  export type WalletCreateOrConnectWithoutUserInput = {
    where: WalletWhereUniqueInput
    create: XOR<WalletCreateWithoutUserInput, WalletUncheckedCreateWithoutUserInput>
  }

  export type WalletCreateManyUserInputEnvelope = {
    data: WalletCreateManyUserInput | WalletCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type CategoryCreateWithoutUserInput = {
    id?: string
    name: string
    type: $Enums.CategoryType
    icon?: string | null
    color?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    transactions?: TransactionCreateNestedManyWithoutCategoryInput
  }

  export type CategoryUncheckedCreateWithoutUserInput = {
    id?: string
    name: string
    type: $Enums.CategoryType
    icon?: string | null
    color?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    transactions?: TransactionUncheckedCreateNestedManyWithoutCategoryInput
  }

  export type CategoryCreateOrConnectWithoutUserInput = {
    where: CategoryWhereUniqueInput
    create: XOR<CategoryCreateWithoutUserInput, CategoryUncheckedCreateWithoutUserInput>
  }

  export type CategoryCreateManyUserInputEnvelope = {
    data: CategoryCreateManyUserInput | CategoryCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type TransactionCreateWithoutUserInput = {
    id?: string
    type: $Enums.TransactionType
    amount: Decimal | DecimalJsLike | number | string
    description?: string | null
    isInstallment?: boolean
    date: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
    wallet: WalletCreateNestedOneWithoutTransactionsInput
    toWallet?: WalletCreateNestedOneWithoutToTransactionsInput
    category?: CategoryCreateNestedOneWithoutTransactionsInput
    installment?: InstallmentCreateNestedOneWithoutTransactionsInput
  }

  export type TransactionUncheckedCreateWithoutUserInput = {
    id?: string
    walletId: string
    toWalletId?: string | null
    categoryId?: string | null
    type: $Enums.TransactionType
    amount: Decimal | DecimalJsLike | number | string
    description?: string | null
    isInstallment?: boolean
    installmentId?: string | null
    date: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TransactionCreateOrConnectWithoutUserInput = {
    where: TransactionWhereUniqueInput
    create: XOR<TransactionCreateWithoutUserInput, TransactionUncheckedCreateWithoutUserInput>
  }

  export type TransactionCreateManyUserInputEnvelope = {
    data: TransactionCreateManyUserInput | TransactionCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type InstallmentCreateWithoutUserInput = {
    id?: string
    totalAmount: Decimal | DecimalJsLike | number | string
    interestRate?: Decimal | DecimalJsLike | number | string
    totalInterest?: Decimal | DecimalJsLike | number | string
    adminFee?: Decimal | DecimalJsLike | number | string
    adminFeeType?: $Enums.AdminFeeType
    totalAdminFee?: Decimal | DecimalJsLike | number | string
    grandTotal?: Decimal | DecimalJsLike | number | string
    installmentMonths: number
    currentTerm?: number
    monthlyAmount: Decimal | DecimalJsLike | number | string
    status?: $Enums.InstallmentStatus
    startDate: Date | string
    description?: string | null
    balanceDeducted?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    wallet: WalletCreateNestedOneWithoutInstallmentsInput
    transactions?: TransactionCreateNestedManyWithoutInstallmentInput
  }

  export type InstallmentUncheckedCreateWithoutUserInput = {
    id?: string
    walletId: string
    totalAmount: Decimal | DecimalJsLike | number | string
    interestRate?: Decimal | DecimalJsLike | number | string
    totalInterest?: Decimal | DecimalJsLike | number | string
    adminFee?: Decimal | DecimalJsLike | number | string
    adminFeeType?: $Enums.AdminFeeType
    totalAdminFee?: Decimal | DecimalJsLike | number | string
    grandTotal?: Decimal | DecimalJsLike | number | string
    installmentMonths: number
    currentTerm?: number
    monthlyAmount: Decimal | DecimalJsLike | number | string
    status?: $Enums.InstallmentStatus
    startDate: Date | string
    description?: string | null
    balanceDeducted?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    transactions?: TransactionUncheckedCreateNestedManyWithoutInstallmentInput
  }

  export type InstallmentCreateOrConnectWithoutUserInput = {
    where: InstallmentWhereUniqueInput
    create: XOR<InstallmentCreateWithoutUserInput, InstallmentUncheckedCreateWithoutUserInput>
  }

  export type InstallmentCreateManyUserInputEnvelope = {
    data: InstallmentCreateManyUserInput | InstallmentCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type TransferCreateWithoutUserInput = {
    id?: string
    amount: Decimal | DecimalJsLike | number | string
    note?: string | null
    date: Date | string
    createdAt?: Date | string
    fromWallet: WalletCreateNestedOneWithoutFromTransfersInput
    toWallet: WalletCreateNestedOneWithoutToTransfersInput
  }

  export type TransferUncheckedCreateWithoutUserInput = {
    id?: string
    fromWalletId: string
    toWalletId: string
    amount: Decimal | DecimalJsLike | number | string
    note?: string | null
    date: Date | string
    createdAt?: Date | string
  }

  export type TransferCreateOrConnectWithoutUserInput = {
    where: TransferWhereUniqueInput
    create: XOR<TransferCreateWithoutUserInput, TransferUncheckedCreateWithoutUserInput>
  }

  export type TransferCreateManyUserInputEnvelope = {
    data: TransferCreateManyUserInput | TransferCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type WalletUpsertWithWhereUniqueWithoutUserInput = {
    where: WalletWhereUniqueInput
    update: XOR<WalletUpdateWithoutUserInput, WalletUncheckedUpdateWithoutUserInput>
    create: XOR<WalletCreateWithoutUserInput, WalletUncheckedCreateWithoutUserInput>
  }

  export type WalletUpdateWithWhereUniqueWithoutUserInput = {
    where: WalletWhereUniqueInput
    data: XOR<WalletUpdateWithoutUserInput, WalletUncheckedUpdateWithoutUserInput>
  }

  export type WalletUpdateManyWithWhereWithoutUserInput = {
    where: WalletScalarWhereInput
    data: XOR<WalletUpdateManyMutationInput, WalletUncheckedUpdateManyWithoutUserInput>
  }

  export type WalletScalarWhereInput = {
    AND?: WalletScalarWhereInput | WalletScalarWhereInput[]
    OR?: WalletScalarWhereInput[]
    NOT?: WalletScalarWhereInput | WalletScalarWhereInput[]
    id?: StringFilter<"Wallet"> | string
    userId?: StringFilter<"Wallet"> | string
    name?: StringFilter<"Wallet"> | string
    type?: EnumWalletTypeFilter<"Wallet"> | $Enums.WalletType
    balance?: DecimalFilter<"Wallet"> | Decimal | DecimalJsLike | number | string
    creditLimit?: DecimalFilter<"Wallet"> | Decimal | DecimalJsLike | number | string
    initialBalance?: DecimalFilter<"Wallet"> | Decimal | DecimalJsLike | number | string
    icon?: StringNullableFilter<"Wallet"> | string | null
    color?: StringNullableFilter<"Wallet"> | string | null
    interestRate?: DecimalFilter<"Wallet"> | Decimal | DecimalJsLike | number | string
    isArchived?: BoolFilter<"Wallet"> | boolean
    adminFee?: DecimalFilter<"Wallet"> | Decimal | DecimalJsLike | number | string
    adminFeeType?: EnumAdminFeeTypeFilter<"Wallet"> | $Enums.AdminFeeType
    createdAt?: DateTimeFilter<"Wallet"> | Date | string
    updatedAt?: DateTimeFilter<"Wallet"> | Date | string
  }

  export type CategoryUpsertWithWhereUniqueWithoutUserInput = {
    where: CategoryWhereUniqueInput
    update: XOR<CategoryUpdateWithoutUserInput, CategoryUncheckedUpdateWithoutUserInput>
    create: XOR<CategoryCreateWithoutUserInput, CategoryUncheckedCreateWithoutUserInput>
  }

  export type CategoryUpdateWithWhereUniqueWithoutUserInput = {
    where: CategoryWhereUniqueInput
    data: XOR<CategoryUpdateWithoutUserInput, CategoryUncheckedUpdateWithoutUserInput>
  }

  export type CategoryUpdateManyWithWhereWithoutUserInput = {
    where: CategoryScalarWhereInput
    data: XOR<CategoryUpdateManyMutationInput, CategoryUncheckedUpdateManyWithoutUserInput>
  }

  export type CategoryScalarWhereInput = {
    AND?: CategoryScalarWhereInput | CategoryScalarWhereInput[]
    OR?: CategoryScalarWhereInput[]
    NOT?: CategoryScalarWhereInput | CategoryScalarWhereInput[]
    id?: StringFilter<"Category"> | string
    userId?: StringFilter<"Category"> | string
    name?: StringFilter<"Category"> | string
    type?: EnumCategoryTypeFilter<"Category"> | $Enums.CategoryType
    icon?: StringNullableFilter<"Category"> | string | null
    color?: StringNullableFilter<"Category"> | string | null
    createdAt?: DateTimeFilter<"Category"> | Date | string
    updatedAt?: DateTimeFilter<"Category"> | Date | string
  }

  export type TransactionUpsertWithWhereUniqueWithoutUserInput = {
    where: TransactionWhereUniqueInput
    update: XOR<TransactionUpdateWithoutUserInput, TransactionUncheckedUpdateWithoutUserInput>
    create: XOR<TransactionCreateWithoutUserInput, TransactionUncheckedCreateWithoutUserInput>
  }

  export type TransactionUpdateWithWhereUniqueWithoutUserInput = {
    where: TransactionWhereUniqueInput
    data: XOR<TransactionUpdateWithoutUserInput, TransactionUncheckedUpdateWithoutUserInput>
  }

  export type TransactionUpdateManyWithWhereWithoutUserInput = {
    where: TransactionScalarWhereInput
    data: XOR<TransactionUpdateManyMutationInput, TransactionUncheckedUpdateManyWithoutUserInput>
  }

  export type TransactionScalarWhereInput = {
    AND?: TransactionScalarWhereInput | TransactionScalarWhereInput[]
    OR?: TransactionScalarWhereInput[]
    NOT?: TransactionScalarWhereInput | TransactionScalarWhereInput[]
    id?: StringFilter<"Transaction"> | string
    userId?: StringFilter<"Transaction"> | string
    walletId?: StringFilter<"Transaction"> | string
    toWalletId?: StringNullableFilter<"Transaction"> | string | null
    categoryId?: StringNullableFilter<"Transaction"> | string | null
    type?: EnumTransactionTypeFilter<"Transaction"> | $Enums.TransactionType
    amount?: DecimalFilter<"Transaction"> | Decimal | DecimalJsLike | number | string
    description?: StringNullableFilter<"Transaction"> | string | null
    isInstallment?: BoolFilter<"Transaction"> | boolean
    installmentId?: StringNullableFilter<"Transaction"> | string | null
    date?: DateTimeFilter<"Transaction"> | Date | string
    createdAt?: DateTimeFilter<"Transaction"> | Date | string
    updatedAt?: DateTimeFilter<"Transaction"> | Date | string
  }

  export type InstallmentUpsertWithWhereUniqueWithoutUserInput = {
    where: InstallmentWhereUniqueInput
    update: XOR<InstallmentUpdateWithoutUserInput, InstallmentUncheckedUpdateWithoutUserInput>
    create: XOR<InstallmentCreateWithoutUserInput, InstallmentUncheckedCreateWithoutUserInput>
  }

  export type InstallmentUpdateWithWhereUniqueWithoutUserInput = {
    where: InstallmentWhereUniqueInput
    data: XOR<InstallmentUpdateWithoutUserInput, InstallmentUncheckedUpdateWithoutUserInput>
  }

  export type InstallmentUpdateManyWithWhereWithoutUserInput = {
    where: InstallmentScalarWhereInput
    data: XOR<InstallmentUpdateManyMutationInput, InstallmentUncheckedUpdateManyWithoutUserInput>
  }

  export type InstallmentScalarWhereInput = {
    AND?: InstallmentScalarWhereInput | InstallmentScalarWhereInput[]
    OR?: InstallmentScalarWhereInput[]
    NOT?: InstallmentScalarWhereInput | InstallmentScalarWhereInput[]
    id?: StringFilter<"Installment"> | string
    userId?: StringFilter<"Installment"> | string
    walletId?: StringFilter<"Installment"> | string
    totalAmount?: DecimalFilter<"Installment"> | Decimal | DecimalJsLike | number | string
    interestRate?: DecimalFilter<"Installment"> | Decimal | DecimalJsLike | number | string
    totalInterest?: DecimalFilter<"Installment"> | Decimal | DecimalJsLike | number | string
    adminFee?: DecimalFilter<"Installment"> | Decimal | DecimalJsLike | number | string
    adminFeeType?: EnumAdminFeeTypeFilter<"Installment"> | $Enums.AdminFeeType
    totalAdminFee?: DecimalFilter<"Installment"> | Decimal | DecimalJsLike | number | string
    grandTotal?: DecimalFilter<"Installment"> | Decimal | DecimalJsLike | number | string
    installmentMonths?: IntFilter<"Installment"> | number
    currentTerm?: IntFilter<"Installment"> | number
    monthlyAmount?: DecimalFilter<"Installment"> | Decimal | DecimalJsLike | number | string
    status?: EnumInstallmentStatusFilter<"Installment"> | $Enums.InstallmentStatus
    startDate?: DateTimeFilter<"Installment"> | Date | string
    description?: StringNullableFilter<"Installment"> | string | null
    balanceDeducted?: BoolFilter<"Installment"> | boolean
    createdAt?: DateTimeFilter<"Installment"> | Date | string
    updatedAt?: DateTimeFilter<"Installment"> | Date | string
  }

  export type TransferUpsertWithWhereUniqueWithoutUserInput = {
    where: TransferWhereUniqueInput
    update: XOR<TransferUpdateWithoutUserInput, TransferUncheckedUpdateWithoutUserInput>
    create: XOR<TransferCreateWithoutUserInput, TransferUncheckedCreateWithoutUserInput>
  }

  export type TransferUpdateWithWhereUniqueWithoutUserInput = {
    where: TransferWhereUniqueInput
    data: XOR<TransferUpdateWithoutUserInput, TransferUncheckedUpdateWithoutUserInput>
  }

  export type TransferUpdateManyWithWhereWithoutUserInput = {
    where: TransferScalarWhereInput
    data: XOR<TransferUpdateManyMutationInput, TransferUncheckedUpdateManyWithoutUserInput>
  }

  export type TransferScalarWhereInput = {
    AND?: TransferScalarWhereInput | TransferScalarWhereInput[]
    OR?: TransferScalarWhereInput[]
    NOT?: TransferScalarWhereInput | TransferScalarWhereInput[]
    id?: StringFilter<"Transfer"> | string
    userId?: StringFilter<"Transfer"> | string
    fromWalletId?: StringFilter<"Transfer"> | string
    toWalletId?: StringFilter<"Transfer"> | string
    amount?: DecimalFilter<"Transfer"> | Decimal | DecimalJsLike | number | string
    note?: StringNullableFilter<"Transfer"> | string | null
    date?: DateTimeFilter<"Transfer"> | Date | string
    createdAt?: DateTimeFilter<"Transfer"> | Date | string
  }

  export type UserCreateWithoutWalletsInput = {
    id?: string
    email: string
    name: string
    avatarUrl?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    categories?: CategoryCreateNestedManyWithoutUserInput
    transactions?: TransactionCreateNestedManyWithoutUserInput
    installments?: InstallmentCreateNestedManyWithoutUserInput
    transfers?: TransferCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutWalletsInput = {
    id?: string
    email: string
    name: string
    avatarUrl?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    categories?: CategoryUncheckedCreateNestedManyWithoutUserInput
    transactions?: TransactionUncheckedCreateNestedManyWithoutUserInput
    installments?: InstallmentUncheckedCreateNestedManyWithoutUserInput
    transfers?: TransferUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutWalletsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutWalletsInput, UserUncheckedCreateWithoutWalletsInput>
  }

  export type TransactionCreateWithoutWalletInput = {
    id?: string
    type: $Enums.TransactionType
    amount: Decimal | DecimalJsLike | number | string
    description?: string | null
    isInstallment?: boolean
    date: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutTransactionsInput
    toWallet?: WalletCreateNestedOneWithoutToTransactionsInput
    category?: CategoryCreateNestedOneWithoutTransactionsInput
    installment?: InstallmentCreateNestedOneWithoutTransactionsInput
  }

  export type TransactionUncheckedCreateWithoutWalletInput = {
    id?: string
    userId: string
    toWalletId?: string | null
    categoryId?: string | null
    type: $Enums.TransactionType
    amount: Decimal | DecimalJsLike | number | string
    description?: string | null
    isInstallment?: boolean
    installmentId?: string | null
    date: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TransactionCreateOrConnectWithoutWalletInput = {
    where: TransactionWhereUniqueInput
    create: XOR<TransactionCreateWithoutWalletInput, TransactionUncheckedCreateWithoutWalletInput>
  }

  export type TransactionCreateManyWalletInputEnvelope = {
    data: TransactionCreateManyWalletInput | TransactionCreateManyWalletInput[]
    skipDuplicates?: boolean
  }

  export type TransactionCreateWithoutToWalletInput = {
    id?: string
    type: $Enums.TransactionType
    amount: Decimal | DecimalJsLike | number | string
    description?: string | null
    isInstallment?: boolean
    date: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutTransactionsInput
    wallet: WalletCreateNestedOneWithoutTransactionsInput
    category?: CategoryCreateNestedOneWithoutTransactionsInput
    installment?: InstallmentCreateNestedOneWithoutTransactionsInput
  }

  export type TransactionUncheckedCreateWithoutToWalletInput = {
    id?: string
    userId: string
    walletId: string
    categoryId?: string | null
    type: $Enums.TransactionType
    amount: Decimal | DecimalJsLike | number | string
    description?: string | null
    isInstallment?: boolean
    installmentId?: string | null
    date: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TransactionCreateOrConnectWithoutToWalletInput = {
    where: TransactionWhereUniqueInput
    create: XOR<TransactionCreateWithoutToWalletInput, TransactionUncheckedCreateWithoutToWalletInput>
  }

  export type TransactionCreateManyToWalletInputEnvelope = {
    data: TransactionCreateManyToWalletInput | TransactionCreateManyToWalletInput[]
    skipDuplicates?: boolean
  }

  export type InstallmentCreateWithoutWalletInput = {
    id?: string
    totalAmount: Decimal | DecimalJsLike | number | string
    interestRate?: Decimal | DecimalJsLike | number | string
    totalInterest?: Decimal | DecimalJsLike | number | string
    adminFee?: Decimal | DecimalJsLike | number | string
    adminFeeType?: $Enums.AdminFeeType
    totalAdminFee?: Decimal | DecimalJsLike | number | string
    grandTotal?: Decimal | DecimalJsLike | number | string
    installmentMonths: number
    currentTerm?: number
    monthlyAmount: Decimal | DecimalJsLike | number | string
    status?: $Enums.InstallmentStatus
    startDate: Date | string
    description?: string | null
    balanceDeducted?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutInstallmentsInput
    transactions?: TransactionCreateNestedManyWithoutInstallmentInput
  }

  export type InstallmentUncheckedCreateWithoutWalletInput = {
    id?: string
    userId: string
    totalAmount: Decimal | DecimalJsLike | number | string
    interestRate?: Decimal | DecimalJsLike | number | string
    totalInterest?: Decimal | DecimalJsLike | number | string
    adminFee?: Decimal | DecimalJsLike | number | string
    adminFeeType?: $Enums.AdminFeeType
    totalAdminFee?: Decimal | DecimalJsLike | number | string
    grandTotal?: Decimal | DecimalJsLike | number | string
    installmentMonths: number
    currentTerm?: number
    monthlyAmount: Decimal | DecimalJsLike | number | string
    status?: $Enums.InstallmentStatus
    startDate: Date | string
    description?: string | null
    balanceDeducted?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    transactions?: TransactionUncheckedCreateNestedManyWithoutInstallmentInput
  }

  export type InstallmentCreateOrConnectWithoutWalletInput = {
    where: InstallmentWhereUniqueInput
    create: XOR<InstallmentCreateWithoutWalletInput, InstallmentUncheckedCreateWithoutWalletInput>
  }

  export type InstallmentCreateManyWalletInputEnvelope = {
    data: InstallmentCreateManyWalletInput | InstallmentCreateManyWalletInput[]
    skipDuplicates?: boolean
  }

  export type TransferCreateWithoutFromWalletInput = {
    id?: string
    amount: Decimal | DecimalJsLike | number | string
    note?: string | null
    date: Date | string
    createdAt?: Date | string
    user: UserCreateNestedOneWithoutTransfersInput
    toWallet: WalletCreateNestedOneWithoutToTransfersInput
  }

  export type TransferUncheckedCreateWithoutFromWalletInput = {
    id?: string
    userId: string
    toWalletId: string
    amount: Decimal | DecimalJsLike | number | string
    note?: string | null
    date: Date | string
    createdAt?: Date | string
  }

  export type TransferCreateOrConnectWithoutFromWalletInput = {
    where: TransferWhereUniqueInput
    create: XOR<TransferCreateWithoutFromWalletInput, TransferUncheckedCreateWithoutFromWalletInput>
  }

  export type TransferCreateManyFromWalletInputEnvelope = {
    data: TransferCreateManyFromWalletInput | TransferCreateManyFromWalletInput[]
    skipDuplicates?: boolean
  }

  export type TransferCreateWithoutToWalletInput = {
    id?: string
    amount: Decimal | DecimalJsLike | number | string
    note?: string | null
    date: Date | string
    createdAt?: Date | string
    user: UserCreateNestedOneWithoutTransfersInput
    fromWallet: WalletCreateNestedOneWithoutFromTransfersInput
  }

  export type TransferUncheckedCreateWithoutToWalletInput = {
    id?: string
    userId: string
    fromWalletId: string
    amount: Decimal | DecimalJsLike | number | string
    note?: string | null
    date: Date | string
    createdAt?: Date | string
  }

  export type TransferCreateOrConnectWithoutToWalletInput = {
    where: TransferWhereUniqueInput
    create: XOR<TransferCreateWithoutToWalletInput, TransferUncheckedCreateWithoutToWalletInput>
  }

  export type TransferCreateManyToWalletInputEnvelope = {
    data: TransferCreateManyToWalletInput | TransferCreateManyToWalletInput[]
    skipDuplicates?: boolean
  }

  export type UserUpsertWithoutWalletsInput = {
    update: XOR<UserUpdateWithoutWalletsInput, UserUncheckedUpdateWithoutWalletsInput>
    create: XOR<UserCreateWithoutWalletsInput, UserUncheckedCreateWithoutWalletsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutWalletsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutWalletsInput, UserUncheckedUpdateWithoutWalletsInput>
  }

  export type UserUpdateWithoutWalletsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    categories?: CategoryUpdateManyWithoutUserNestedInput
    transactions?: TransactionUpdateManyWithoutUserNestedInput
    installments?: InstallmentUpdateManyWithoutUserNestedInput
    transfers?: TransferUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutWalletsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    categories?: CategoryUncheckedUpdateManyWithoutUserNestedInput
    transactions?: TransactionUncheckedUpdateManyWithoutUserNestedInput
    installments?: InstallmentUncheckedUpdateManyWithoutUserNestedInput
    transfers?: TransferUncheckedUpdateManyWithoutUserNestedInput
  }

  export type TransactionUpsertWithWhereUniqueWithoutWalletInput = {
    where: TransactionWhereUniqueInput
    update: XOR<TransactionUpdateWithoutWalletInput, TransactionUncheckedUpdateWithoutWalletInput>
    create: XOR<TransactionCreateWithoutWalletInput, TransactionUncheckedCreateWithoutWalletInput>
  }

  export type TransactionUpdateWithWhereUniqueWithoutWalletInput = {
    where: TransactionWhereUniqueInput
    data: XOR<TransactionUpdateWithoutWalletInput, TransactionUncheckedUpdateWithoutWalletInput>
  }

  export type TransactionUpdateManyWithWhereWithoutWalletInput = {
    where: TransactionScalarWhereInput
    data: XOR<TransactionUpdateManyMutationInput, TransactionUncheckedUpdateManyWithoutWalletInput>
  }

  export type TransactionUpsertWithWhereUniqueWithoutToWalletInput = {
    where: TransactionWhereUniqueInput
    update: XOR<TransactionUpdateWithoutToWalletInput, TransactionUncheckedUpdateWithoutToWalletInput>
    create: XOR<TransactionCreateWithoutToWalletInput, TransactionUncheckedCreateWithoutToWalletInput>
  }

  export type TransactionUpdateWithWhereUniqueWithoutToWalletInput = {
    where: TransactionWhereUniqueInput
    data: XOR<TransactionUpdateWithoutToWalletInput, TransactionUncheckedUpdateWithoutToWalletInput>
  }

  export type TransactionUpdateManyWithWhereWithoutToWalletInput = {
    where: TransactionScalarWhereInput
    data: XOR<TransactionUpdateManyMutationInput, TransactionUncheckedUpdateManyWithoutToWalletInput>
  }

  export type InstallmentUpsertWithWhereUniqueWithoutWalletInput = {
    where: InstallmentWhereUniqueInput
    update: XOR<InstallmentUpdateWithoutWalletInput, InstallmentUncheckedUpdateWithoutWalletInput>
    create: XOR<InstallmentCreateWithoutWalletInput, InstallmentUncheckedCreateWithoutWalletInput>
  }

  export type InstallmentUpdateWithWhereUniqueWithoutWalletInput = {
    where: InstallmentWhereUniqueInput
    data: XOR<InstallmentUpdateWithoutWalletInput, InstallmentUncheckedUpdateWithoutWalletInput>
  }

  export type InstallmentUpdateManyWithWhereWithoutWalletInput = {
    where: InstallmentScalarWhereInput
    data: XOR<InstallmentUpdateManyMutationInput, InstallmentUncheckedUpdateManyWithoutWalletInput>
  }

  export type TransferUpsertWithWhereUniqueWithoutFromWalletInput = {
    where: TransferWhereUniqueInput
    update: XOR<TransferUpdateWithoutFromWalletInput, TransferUncheckedUpdateWithoutFromWalletInput>
    create: XOR<TransferCreateWithoutFromWalletInput, TransferUncheckedCreateWithoutFromWalletInput>
  }

  export type TransferUpdateWithWhereUniqueWithoutFromWalletInput = {
    where: TransferWhereUniqueInput
    data: XOR<TransferUpdateWithoutFromWalletInput, TransferUncheckedUpdateWithoutFromWalletInput>
  }

  export type TransferUpdateManyWithWhereWithoutFromWalletInput = {
    where: TransferScalarWhereInput
    data: XOR<TransferUpdateManyMutationInput, TransferUncheckedUpdateManyWithoutFromWalletInput>
  }

  export type TransferUpsertWithWhereUniqueWithoutToWalletInput = {
    where: TransferWhereUniqueInput
    update: XOR<TransferUpdateWithoutToWalletInput, TransferUncheckedUpdateWithoutToWalletInput>
    create: XOR<TransferCreateWithoutToWalletInput, TransferUncheckedCreateWithoutToWalletInput>
  }

  export type TransferUpdateWithWhereUniqueWithoutToWalletInput = {
    where: TransferWhereUniqueInput
    data: XOR<TransferUpdateWithoutToWalletInput, TransferUncheckedUpdateWithoutToWalletInput>
  }

  export type TransferUpdateManyWithWhereWithoutToWalletInput = {
    where: TransferScalarWhereInput
    data: XOR<TransferUpdateManyMutationInput, TransferUncheckedUpdateManyWithoutToWalletInput>
  }

  export type UserCreateWithoutCategoriesInput = {
    id?: string
    email: string
    name: string
    avatarUrl?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    wallets?: WalletCreateNestedManyWithoutUserInput
    transactions?: TransactionCreateNestedManyWithoutUserInput
    installments?: InstallmentCreateNestedManyWithoutUserInput
    transfers?: TransferCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutCategoriesInput = {
    id?: string
    email: string
    name: string
    avatarUrl?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    wallets?: WalletUncheckedCreateNestedManyWithoutUserInput
    transactions?: TransactionUncheckedCreateNestedManyWithoutUserInput
    installments?: InstallmentUncheckedCreateNestedManyWithoutUserInput
    transfers?: TransferUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutCategoriesInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutCategoriesInput, UserUncheckedCreateWithoutCategoriesInput>
  }

  export type TransactionCreateWithoutCategoryInput = {
    id?: string
    type: $Enums.TransactionType
    amount: Decimal | DecimalJsLike | number | string
    description?: string | null
    isInstallment?: boolean
    date: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutTransactionsInput
    wallet: WalletCreateNestedOneWithoutTransactionsInput
    toWallet?: WalletCreateNestedOneWithoutToTransactionsInput
    installment?: InstallmentCreateNestedOneWithoutTransactionsInput
  }

  export type TransactionUncheckedCreateWithoutCategoryInput = {
    id?: string
    userId: string
    walletId: string
    toWalletId?: string | null
    type: $Enums.TransactionType
    amount: Decimal | DecimalJsLike | number | string
    description?: string | null
    isInstallment?: boolean
    installmentId?: string | null
    date: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TransactionCreateOrConnectWithoutCategoryInput = {
    where: TransactionWhereUniqueInput
    create: XOR<TransactionCreateWithoutCategoryInput, TransactionUncheckedCreateWithoutCategoryInput>
  }

  export type TransactionCreateManyCategoryInputEnvelope = {
    data: TransactionCreateManyCategoryInput | TransactionCreateManyCategoryInput[]
    skipDuplicates?: boolean
  }

  export type UserUpsertWithoutCategoriesInput = {
    update: XOR<UserUpdateWithoutCategoriesInput, UserUncheckedUpdateWithoutCategoriesInput>
    create: XOR<UserCreateWithoutCategoriesInput, UserUncheckedCreateWithoutCategoriesInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutCategoriesInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutCategoriesInput, UserUncheckedUpdateWithoutCategoriesInput>
  }

  export type UserUpdateWithoutCategoriesInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    wallets?: WalletUpdateManyWithoutUserNestedInput
    transactions?: TransactionUpdateManyWithoutUserNestedInput
    installments?: InstallmentUpdateManyWithoutUserNestedInput
    transfers?: TransferUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutCategoriesInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    wallets?: WalletUncheckedUpdateManyWithoutUserNestedInput
    transactions?: TransactionUncheckedUpdateManyWithoutUserNestedInput
    installments?: InstallmentUncheckedUpdateManyWithoutUserNestedInput
    transfers?: TransferUncheckedUpdateManyWithoutUserNestedInput
  }

  export type TransactionUpsertWithWhereUniqueWithoutCategoryInput = {
    where: TransactionWhereUniqueInput
    update: XOR<TransactionUpdateWithoutCategoryInput, TransactionUncheckedUpdateWithoutCategoryInput>
    create: XOR<TransactionCreateWithoutCategoryInput, TransactionUncheckedCreateWithoutCategoryInput>
  }

  export type TransactionUpdateWithWhereUniqueWithoutCategoryInput = {
    where: TransactionWhereUniqueInput
    data: XOR<TransactionUpdateWithoutCategoryInput, TransactionUncheckedUpdateWithoutCategoryInput>
  }

  export type TransactionUpdateManyWithWhereWithoutCategoryInput = {
    where: TransactionScalarWhereInput
    data: XOR<TransactionUpdateManyMutationInput, TransactionUncheckedUpdateManyWithoutCategoryInput>
  }

  export type UserCreateWithoutTransactionsInput = {
    id?: string
    email: string
    name: string
    avatarUrl?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    wallets?: WalletCreateNestedManyWithoutUserInput
    categories?: CategoryCreateNestedManyWithoutUserInput
    installments?: InstallmentCreateNestedManyWithoutUserInput
    transfers?: TransferCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutTransactionsInput = {
    id?: string
    email: string
    name: string
    avatarUrl?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    wallets?: WalletUncheckedCreateNestedManyWithoutUserInput
    categories?: CategoryUncheckedCreateNestedManyWithoutUserInput
    installments?: InstallmentUncheckedCreateNestedManyWithoutUserInput
    transfers?: TransferUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutTransactionsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutTransactionsInput, UserUncheckedCreateWithoutTransactionsInput>
  }

  export type WalletCreateWithoutTransactionsInput = {
    id?: string
    name: string
    type?: $Enums.WalletType
    balance?: Decimal | DecimalJsLike | number | string
    creditLimit?: Decimal | DecimalJsLike | number | string
    initialBalance?: Decimal | DecimalJsLike | number | string
    icon?: string | null
    color?: string | null
    interestRate?: Decimal | DecimalJsLike | number | string
    isArchived?: boolean
    adminFee?: Decimal | DecimalJsLike | number | string
    adminFeeType?: $Enums.AdminFeeType
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutWalletsInput
    toTransactions?: TransactionCreateNestedManyWithoutToWalletInput
    installments?: InstallmentCreateNestedManyWithoutWalletInput
    fromTransfers?: TransferCreateNestedManyWithoutFromWalletInput
    toTransfers?: TransferCreateNestedManyWithoutToWalletInput
  }

  export type WalletUncheckedCreateWithoutTransactionsInput = {
    id?: string
    userId: string
    name: string
    type?: $Enums.WalletType
    balance?: Decimal | DecimalJsLike | number | string
    creditLimit?: Decimal | DecimalJsLike | number | string
    initialBalance?: Decimal | DecimalJsLike | number | string
    icon?: string | null
    color?: string | null
    interestRate?: Decimal | DecimalJsLike | number | string
    isArchived?: boolean
    adminFee?: Decimal | DecimalJsLike | number | string
    adminFeeType?: $Enums.AdminFeeType
    createdAt?: Date | string
    updatedAt?: Date | string
    toTransactions?: TransactionUncheckedCreateNestedManyWithoutToWalletInput
    installments?: InstallmentUncheckedCreateNestedManyWithoutWalletInput
    fromTransfers?: TransferUncheckedCreateNestedManyWithoutFromWalletInput
    toTransfers?: TransferUncheckedCreateNestedManyWithoutToWalletInput
  }

  export type WalletCreateOrConnectWithoutTransactionsInput = {
    where: WalletWhereUniqueInput
    create: XOR<WalletCreateWithoutTransactionsInput, WalletUncheckedCreateWithoutTransactionsInput>
  }

  export type WalletCreateWithoutToTransactionsInput = {
    id?: string
    name: string
    type?: $Enums.WalletType
    balance?: Decimal | DecimalJsLike | number | string
    creditLimit?: Decimal | DecimalJsLike | number | string
    initialBalance?: Decimal | DecimalJsLike | number | string
    icon?: string | null
    color?: string | null
    interestRate?: Decimal | DecimalJsLike | number | string
    isArchived?: boolean
    adminFee?: Decimal | DecimalJsLike | number | string
    adminFeeType?: $Enums.AdminFeeType
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutWalletsInput
    transactions?: TransactionCreateNestedManyWithoutWalletInput
    installments?: InstallmentCreateNestedManyWithoutWalletInput
    fromTransfers?: TransferCreateNestedManyWithoutFromWalletInput
    toTransfers?: TransferCreateNestedManyWithoutToWalletInput
  }

  export type WalletUncheckedCreateWithoutToTransactionsInput = {
    id?: string
    userId: string
    name: string
    type?: $Enums.WalletType
    balance?: Decimal | DecimalJsLike | number | string
    creditLimit?: Decimal | DecimalJsLike | number | string
    initialBalance?: Decimal | DecimalJsLike | number | string
    icon?: string | null
    color?: string | null
    interestRate?: Decimal | DecimalJsLike | number | string
    isArchived?: boolean
    adminFee?: Decimal | DecimalJsLike | number | string
    adminFeeType?: $Enums.AdminFeeType
    createdAt?: Date | string
    updatedAt?: Date | string
    transactions?: TransactionUncheckedCreateNestedManyWithoutWalletInput
    installments?: InstallmentUncheckedCreateNestedManyWithoutWalletInput
    fromTransfers?: TransferUncheckedCreateNestedManyWithoutFromWalletInput
    toTransfers?: TransferUncheckedCreateNestedManyWithoutToWalletInput
  }

  export type WalletCreateOrConnectWithoutToTransactionsInput = {
    where: WalletWhereUniqueInput
    create: XOR<WalletCreateWithoutToTransactionsInput, WalletUncheckedCreateWithoutToTransactionsInput>
  }

  export type CategoryCreateWithoutTransactionsInput = {
    id?: string
    name: string
    type: $Enums.CategoryType
    icon?: string | null
    color?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutCategoriesInput
  }

  export type CategoryUncheckedCreateWithoutTransactionsInput = {
    id?: string
    userId: string
    name: string
    type: $Enums.CategoryType
    icon?: string | null
    color?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type CategoryCreateOrConnectWithoutTransactionsInput = {
    where: CategoryWhereUniqueInput
    create: XOR<CategoryCreateWithoutTransactionsInput, CategoryUncheckedCreateWithoutTransactionsInput>
  }

  export type InstallmentCreateWithoutTransactionsInput = {
    id?: string
    totalAmount: Decimal | DecimalJsLike | number | string
    interestRate?: Decimal | DecimalJsLike | number | string
    totalInterest?: Decimal | DecimalJsLike | number | string
    adminFee?: Decimal | DecimalJsLike | number | string
    adminFeeType?: $Enums.AdminFeeType
    totalAdminFee?: Decimal | DecimalJsLike | number | string
    grandTotal?: Decimal | DecimalJsLike | number | string
    installmentMonths: number
    currentTerm?: number
    monthlyAmount: Decimal | DecimalJsLike | number | string
    status?: $Enums.InstallmentStatus
    startDate: Date | string
    description?: string | null
    balanceDeducted?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutInstallmentsInput
    wallet: WalletCreateNestedOneWithoutInstallmentsInput
  }

  export type InstallmentUncheckedCreateWithoutTransactionsInput = {
    id?: string
    userId: string
    walletId: string
    totalAmount: Decimal | DecimalJsLike | number | string
    interestRate?: Decimal | DecimalJsLike | number | string
    totalInterest?: Decimal | DecimalJsLike | number | string
    adminFee?: Decimal | DecimalJsLike | number | string
    adminFeeType?: $Enums.AdminFeeType
    totalAdminFee?: Decimal | DecimalJsLike | number | string
    grandTotal?: Decimal | DecimalJsLike | number | string
    installmentMonths: number
    currentTerm?: number
    monthlyAmount: Decimal | DecimalJsLike | number | string
    status?: $Enums.InstallmentStatus
    startDate: Date | string
    description?: string | null
    balanceDeducted?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type InstallmentCreateOrConnectWithoutTransactionsInput = {
    where: InstallmentWhereUniqueInput
    create: XOR<InstallmentCreateWithoutTransactionsInput, InstallmentUncheckedCreateWithoutTransactionsInput>
  }

  export type UserUpsertWithoutTransactionsInput = {
    update: XOR<UserUpdateWithoutTransactionsInput, UserUncheckedUpdateWithoutTransactionsInput>
    create: XOR<UserCreateWithoutTransactionsInput, UserUncheckedCreateWithoutTransactionsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutTransactionsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutTransactionsInput, UserUncheckedUpdateWithoutTransactionsInput>
  }

  export type UserUpdateWithoutTransactionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    wallets?: WalletUpdateManyWithoutUserNestedInput
    categories?: CategoryUpdateManyWithoutUserNestedInput
    installments?: InstallmentUpdateManyWithoutUserNestedInput
    transfers?: TransferUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutTransactionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    wallets?: WalletUncheckedUpdateManyWithoutUserNestedInput
    categories?: CategoryUncheckedUpdateManyWithoutUserNestedInput
    installments?: InstallmentUncheckedUpdateManyWithoutUserNestedInput
    transfers?: TransferUncheckedUpdateManyWithoutUserNestedInput
  }

  export type WalletUpsertWithoutTransactionsInput = {
    update: XOR<WalletUpdateWithoutTransactionsInput, WalletUncheckedUpdateWithoutTransactionsInput>
    create: XOR<WalletCreateWithoutTransactionsInput, WalletUncheckedCreateWithoutTransactionsInput>
    where?: WalletWhereInput
  }

  export type WalletUpdateToOneWithWhereWithoutTransactionsInput = {
    where?: WalletWhereInput
    data: XOR<WalletUpdateWithoutTransactionsInput, WalletUncheckedUpdateWithoutTransactionsInput>
  }

  export type WalletUpdateWithoutTransactionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    type?: EnumWalletTypeFieldUpdateOperationsInput | $Enums.WalletType
    balance?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    creditLimit?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    initialBalance?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    icon?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    interestRate?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    isArchived?: BoolFieldUpdateOperationsInput | boolean
    adminFee?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    adminFeeType?: EnumAdminFeeTypeFieldUpdateOperationsInput | $Enums.AdminFeeType
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutWalletsNestedInput
    toTransactions?: TransactionUpdateManyWithoutToWalletNestedInput
    installments?: InstallmentUpdateManyWithoutWalletNestedInput
    fromTransfers?: TransferUpdateManyWithoutFromWalletNestedInput
    toTransfers?: TransferUpdateManyWithoutToWalletNestedInput
  }

  export type WalletUncheckedUpdateWithoutTransactionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    type?: EnumWalletTypeFieldUpdateOperationsInput | $Enums.WalletType
    balance?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    creditLimit?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    initialBalance?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    icon?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    interestRate?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    isArchived?: BoolFieldUpdateOperationsInput | boolean
    adminFee?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    adminFeeType?: EnumAdminFeeTypeFieldUpdateOperationsInput | $Enums.AdminFeeType
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    toTransactions?: TransactionUncheckedUpdateManyWithoutToWalletNestedInput
    installments?: InstallmentUncheckedUpdateManyWithoutWalletNestedInput
    fromTransfers?: TransferUncheckedUpdateManyWithoutFromWalletNestedInput
    toTransfers?: TransferUncheckedUpdateManyWithoutToWalletNestedInput
  }

  export type WalletUpsertWithoutToTransactionsInput = {
    update: XOR<WalletUpdateWithoutToTransactionsInput, WalletUncheckedUpdateWithoutToTransactionsInput>
    create: XOR<WalletCreateWithoutToTransactionsInput, WalletUncheckedCreateWithoutToTransactionsInput>
    where?: WalletWhereInput
  }

  export type WalletUpdateToOneWithWhereWithoutToTransactionsInput = {
    where?: WalletWhereInput
    data: XOR<WalletUpdateWithoutToTransactionsInput, WalletUncheckedUpdateWithoutToTransactionsInput>
  }

  export type WalletUpdateWithoutToTransactionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    type?: EnumWalletTypeFieldUpdateOperationsInput | $Enums.WalletType
    balance?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    creditLimit?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    initialBalance?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    icon?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    interestRate?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    isArchived?: BoolFieldUpdateOperationsInput | boolean
    adminFee?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    adminFeeType?: EnumAdminFeeTypeFieldUpdateOperationsInput | $Enums.AdminFeeType
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutWalletsNestedInput
    transactions?: TransactionUpdateManyWithoutWalletNestedInput
    installments?: InstallmentUpdateManyWithoutWalletNestedInput
    fromTransfers?: TransferUpdateManyWithoutFromWalletNestedInput
    toTransfers?: TransferUpdateManyWithoutToWalletNestedInput
  }

  export type WalletUncheckedUpdateWithoutToTransactionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    type?: EnumWalletTypeFieldUpdateOperationsInput | $Enums.WalletType
    balance?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    creditLimit?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    initialBalance?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    icon?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    interestRate?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    isArchived?: BoolFieldUpdateOperationsInput | boolean
    adminFee?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    adminFeeType?: EnumAdminFeeTypeFieldUpdateOperationsInput | $Enums.AdminFeeType
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    transactions?: TransactionUncheckedUpdateManyWithoutWalletNestedInput
    installments?: InstallmentUncheckedUpdateManyWithoutWalletNestedInput
    fromTransfers?: TransferUncheckedUpdateManyWithoutFromWalletNestedInput
    toTransfers?: TransferUncheckedUpdateManyWithoutToWalletNestedInput
  }

  export type CategoryUpsertWithoutTransactionsInput = {
    update: XOR<CategoryUpdateWithoutTransactionsInput, CategoryUncheckedUpdateWithoutTransactionsInput>
    create: XOR<CategoryCreateWithoutTransactionsInput, CategoryUncheckedCreateWithoutTransactionsInput>
    where?: CategoryWhereInput
  }

  export type CategoryUpdateToOneWithWhereWithoutTransactionsInput = {
    where?: CategoryWhereInput
    data: XOR<CategoryUpdateWithoutTransactionsInput, CategoryUncheckedUpdateWithoutTransactionsInput>
  }

  export type CategoryUpdateWithoutTransactionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    type?: EnumCategoryTypeFieldUpdateOperationsInput | $Enums.CategoryType
    icon?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutCategoriesNestedInput
  }

  export type CategoryUncheckedUpdateWithoutTransactionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    type?: EnumCategoryTypeFieldUpdateOperationsInput | $Enums.CategoryType
    icon?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type InstallmentUpsertWithoutTransactionsInput = {
    update: XOR<InstallmentUpdateWithoutTransactionsInput, InstallmentUncheckedUpdateWithoutTransactionsInput>
    create: XOR<InstallmentCreateWithoutTransactionsInput, InstallmentUncheckedCreateWithoutTransactionsInput>
    where?: InstallmentWhereInput
  }

  export type InstallmentUpdateToOneWithWhereWithoutTransactionsInput = {
    where?: InstallmentWhereInput
    data: XOR<InstallmentUpdateWithoutTransactionsInput, InstallmentUncheckedUpdateWithoutTransactionsInput>
  }

  export type InstallmentUpdateWithoutTransactionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    totalAmount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    interestRate?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    totalInterest?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    adminFee?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    adminFeeType?: EnumAdminFeeTypeFieldUpdateOperationsInput | $Enums.AdminFeeType
    totalAdminFee?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    grandTotal?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    installmentMonths?: IntFieldUpdateOperationsInput | number
    currentTerm?: IntFieldUpdateOperationsInput | number
    monthlyAmount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    status?: EnumInstallmentStatusFieldUpdateOperationsInput | $Enums.InstallmentStatus
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    balanceDeducted?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutInstallmentsNestedInput
    wallet?: WalletUpdateOneRequiredWithoutInstallmentsNestedInput
  }

  export type InstallmentUncheckedUpdateWithoutTransactionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    walletId?: StringFieldUpdateOperationsInput | string
    totalAmount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    interestRate?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    totalInterest?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    adminFee?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    adminFeeType?: EnumAdminFeeTypeFieldUpdateOperationsInput | $Enums.AdminFeeType
    totalAdminFee?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    grandTotal?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    installmentMonths?: IntFieldUpdateOperationsInput | number
    currentTerm?: IntFieldUpdateOperationsInput | number
    monthlyAmount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    status?: EnumInstallmentStatusFieldUpdateOperationsInput | $Enums.InstallmentStatus
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    balanceDeducted?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserCreateWithoutInstallmentsInput = {
    id?: string
    email: string
    name: string
    avatarUrl?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    wallets?: WalletCreateNestedManyWithoutUserInput
    categories?: CategoryCreateNestedManyWithoutUserInput
    transactions?: TransactionCreateNestedManyWithoutUserInput
    transfers?: TransferCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutInstallmentsInput = {
    id?: string
    email: string
    name: string
    avatarUrl?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    wallets?: WalletUncheckedCreateNestedManyWithoutUserInput
    categories?: CategoryUncheckedCreateNestedManyWithoutUserInput
    transactions?: TransactionUncheckedCreateNestedManyWithoutUserInput
    transfers?: TransferUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutInstallmentsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutInstallmentsInput, UserUncheckedCreateWithoutInstallmentsInput>
  }

  export type WalletCreateWithoutInstallmentsInput = {
    id?: string
    name: string
    type?: $Enums.WalletType
    balance?: Decimal | DecimalJsLike | number | string
    creditLimit?: Decimal | DecimalJsLike | number | string
    initialBalance?: Decimal | DecimalJsLike | number | string
    icon?: string | null
    color?: string | null
    interestRate?: Decimal | DecimalJsLike | number | string
    isArchived?: boolean
    adminFee?: Decimal | DecimalJsLike | number | string
    adminFeeType?: $Enums.AdminFeeType
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutWalletsInput
    transactions?: TransactionCreateNestedManyWithoutWalletInput
    toTransactions?: TransactionCreateNestedManyWithoutToWalletInput
    fromTransfers?: TransferCreateNestedManyWithoutFromWalletInput
    toTransfers?: TransferCreateNestedManyWithoutToWalletInput
  }

  export type WalletUncheckedCreateWithoutInstallmentsInput = {
    id?: string
    userId: string
    name: string
    type?: $Enums.WalletType
    balance?: Decimal | DecimalJsLike | number | string
    creditLimit?: Decimal | DecimalJsLike | number | string
    initialBalance?: Decimal | DecimalJsLike | number | string
    icon?: string | null
    color?: string | null
    interestRate?: Decimal | DecimalJsLike | number | string
    isArchived?: boolean
    adminFee?: Decimal | DecimalJsLike | number | string
    adminFeeType?: $Enums.AdminFeeType
    createdAt?: Date | string
    updatedAt?: Date | string
    transactions?: TransactionUncheckedCreateNestedManyWithoutWalletInput
    toTransactions?: TransactionUncheckedCreateNestedManyWithoutToWalletInput
    fromTransfers?: TransferUncheckedCreateNestedManyWithoutFromWalletInput
    toTransfers?: TransferUncheckedCreateNestedManyWithoutToWalletInput
  }

  export type WalletCreateOrConnectWithoutInstallmentsInput = {
    where: WalletWhereUniqueInput
    create: XOR<WalletCreateWithoutInstallmentsInput, WalletUncheckedCreateWithoutInstallmentsInput>
  }

  export type TransactionCreateWithoutInstallmentInput = {
    id?: string
    type: $Enums.TransactionType
    amount: Decimal | DecimalJsLike | number | string
    description?: string | null
    isInstallment?: boolean
    date: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutTransactionsInput
    wallet: WalletCreateNestedOneWithoutTransactionsInput
    toWallet?: WalletCreateNestedOneWithoutToTransactionsInput
    category?: CategoryCreateNestedOneWithoutTransactionsInput
  }

  export type TransactionUncheckedCreateWithoutInstallmentInput = {
    id?: string
    userId: string
    walletId: string
    toWalletId?: string | null
    categoryId?: string | null
    type: $Enums.TransactionType
    amount: Decimal | DecimalJsLike | number | string
    description?: string | null
    isInstallment?: boolean
    date: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TransactionCreateOrConnectWithoutInstallmentInput = {
    where: TransactionWhereUniqueInput
    create: XOR<TransactionCreateWithoutInstallmentInput, TransactionUncheckedCreateWithoutInstallmentInput>
  }

  export type TransactionCreateManyInstallmentInputEnvelope = {
    data: TransactionCreateManyInstallmentInput | TransactionCreateManyInstallmentInput[]
    skipDuplicates?: boolean
  }

  export type UserUpsertWithoutInstallmentsInput = {
    update: XOR<UserUpdateWithoutInstallmentsInput, UserUncheckedUpdateWithoutInstallmentsInput>
    create: XOR<UserCreateWithoutInstallmentsInput, UserUncheckedCreateWithoutInstallmentsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutInstallmentsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutInstallmentsInput, UserUncheckedUpdateWithoutInstallmentsInput>
  }

  export type UserUpdateWithoutInstallmentsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    wallets?: WalletUpdateManyWithoutUserNestedInput
    categories?: CategoryUpdateManyWithoutUserNestedInput
    transactions?: TransactionUpdateManyWithoutUserNestedInput
    transfers?: TransferUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutInstallmentsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    wallets?: WalletUncheckedUpdateManyWithoutUserNestedInput
    categories?: CategoryUncheckedUpdateManyWithoutUserNestedInput
    transactions?: TransactionUncheckedUpdateManyWithoutUserNestedInput
    transfers?: TransferUncheckedUpdateManyWithoutUserNestedInput
  }

  export type WalletUpsertWithoutInstallmentsInput = {
    update: XOR<WalletUpdateWithoutInstallmentsInput, WalletUncheckedUpdateWithoutInstallmentsInput>
    create: XOR<WalletCreateWithoutInstallmentsInput, WalletUncheckedCreateWithoutInstallmentsInput>
    where?: WalletWhereInput
  }

  export type WalletUpdateToOneWithWhereWithoutInstallmentsInput = {
    where?: WalletWhereInput
    data: XOR<WalletUpdateWithoutInstallmentsInput, WalletUncheckedUpdateWithoutInstallmentsInput>
  }

  export type WalletUpdateWithoutInstallmentsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    type?: EnumWalletTypeFieldUpdateOperationsInput | $Enums.WalletType
    balance?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    creditLimit?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    initialBalance?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    icon?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    interestRate?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    isArchived?: BoolFieldUpdateOperationsInput | boolean
    adminFee?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    adminFeeType?: EnumAdminFeeTypeFieldUpdateOperationsInput | $Enums.AdminFeeType
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutWalletsNestedInput
    transactions?: TransactionUpdateManyWithoutWalletNestedInput
    toTransactions?: TransactionUpdateManyWithoutToWalletNestedInput
    fromTransfers?: TransferUpdateManyWithoutFromWalletNestedInput
    toTransfers?: TransferUpdateManyWithoutToWalletNestedInput
  }

  export type WalletUncheckedUpdateWithoutInstallmentsInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    type?: EnumWalletTypeFieldUpdateOperationsInput | $Enums.WalletType
    balance?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    creditLimit?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    initialBalance?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    icon?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    interestRate?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    isArchived?: BoolFieldUpdateOperationsInput | boolean
    adminFee?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    adminFeeType?: EnumAdminFeeTypeFieldUpdateOperationsInput | $Enums.AdminFeeType
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    transactions?: TransactionUncheckedUpdateManyWithoutWalletNestedInput
    toTransactions?: TransactionUncheckedUpdateManyWithoutToWalletNestedInput
    fromTransfers?: TransferUncheckedUpdateManyWithoutFromWalletNestedInput
    toTransfers?: TransferUncheckedUpdateManyWithoutToWalletNestedInput
  }

  export type TransactionUpsertWithWhereUniqueWithoutInstallmentInput = {
    where: TransactionWhereUniqueInput
    update: XOR<TransactionUpdateWithoutInstallmentInput, TransactionUncheckedUpdateWithoutInstallmentInput>
    create: XOR<TransactionCreateWithoutInstallmentInput, TransactionUncheckedCreateWithoutInstallmentInput>
  }

  export type TransactionUpdateWithWhereUniqueWithoutInstallmentInput = {
    where: TransactionWhereUniqueInput
    data: XOR<TransactionUpdateWithoutInstallmentInput, TransactionUncheckedUpdateWithoutInstallmentInput>
  }

  export type TransactionUpdateManyWithWhereWithoutInstallmentInput = {
    where: TransactionScalarWhereInput
    data: XOR<TransactionUpdateManyMutationInput, TransactionUncheckedUpdateManyWithoutInstallmentInput>
  }

  export type UserCreateWithoutTransfersInput = {
    id?: string
    email: string
    name: string
    avatarUrl?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    wallets?: WalletCreateNestedManyWithoutUserInput
    categories?: CategoryCreateNestedManyWithoutUserInput
    transactions?: TransactionCreateNestedManyWithoutUserInput
    installments?: InstallmentCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutTransfersInput = {
    id?: string
    email: string
    name: string
    avatarUrl?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    wallets?: WalletUncheckedCreateNestedManyWithoutUserInput
    categories?: CategoryUncheckedCreateNestedManyWithoutUserInput
    transactions?: TransactionUncheckedCreateNestedManyWithoutUserInput
    installments?: InstallmentUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutTransfersInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutTransfersInput, UserUncheckedCreateWithoutTransfersInput>
  }

  export type WalletCreateWithoutFromTransfersInput = {
    id?: string
    name: string
    type?: $Enums.WalletType
    balance?: Decimal | DecimalJsLike | number | string
    creditLimit?: Decimal | DecimalJsLike | number | string
    initialBalance?: Decimal | DecimalJsLike | number | string
    icon?: string | null
    color?: string | null
    interestRate?: Decimal | DecimalJsLike | number | string
    isArchived?: boolean
    adminFee?: Decimal | DecimalJsLike | number | string
    adminFeeType?: $Enums.AdminFeeType
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutWalletsInput
    transactions?: TransactionCreateNestedManyWithoutWalletInput
    toTransactions?: TransactionCreateNestedManyWithoutToWalletInput
    installments?: InstallmentCreateNestedManyWithoutWalletInput
    toTransfers?: TransferCreateNestedManyWithoutToWalletInput
  }

  export type WalletUncheckedCreateWithoutFromTransfersInput = {
    id?: string
    userId: string
    name: string
    type?: $Enums.WalletType
    balance?: Decimal | DecimalJsLike | number | string
    creditLimit?: Decimal | DecimalJsLike | number | string
    initialBalance?: Decimal | DecimalJsLike | number | string
    icon?: string | null
    color?: string | null
    interestRate?: Decimal | DecimalJsLike | number | string
    isArchived?: boolean
    adminFee?: Decimal | DecimalJsLike | number | string
    adminFeeType?: $Enums.AdminFeeType
    createdAt?: Date | string
    updatedAt?: Date | string
    transactions?: TransactionUncheckedCreateNestedManyWithoutWalletInput
    toTransactions?: TransactionUncheckedCreateNestedManyWithoutToWalletInput
    installments?: InstallmentUncheckedCreateNestedManyWithoutWalletInput
    toTransfers?: TransferUncheckedCreateNestedManyWithoutToWalletInput
  }

  export type WalletCreateOrConnectWithoutFromTransfersInput = {
    where: WalletWhereUniqueInput
    create: XOR<WalletCreateWithoutFromTransfersInput, WalletUncheckedCreateWithoutFromTransfersInput>
  }

  export type WalletCreateWithoutToTransfersInput = {
    id?: string
    name: string
    type?: $Enums.WalletType
    balance?: Decimal | DecimalJsLike | number | string
    creditLimit?: Decimal | DecimalJsLike | number | string
    initialBalance?: Decimal | DecimalJsLike | number | string
    icon?: string | null
    color?: string | null
    interestRate?: Decimal | DecimalJsLike | number | string
    isArchived?: boolean
    adminFee?: Decimal | DecimalJsLike | number | string
    adminFeeType?: $Enums.AdminFeeType
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutWalletsInput
    transactions?: TransactionCreateNestedManyWithoutWalletInput
    toTransactions?: TransactionCreateNestedManyWithoutToWalletInput
    installments?: InstallmentCreateNestedManyWithoutWalletInput
    fromTransfers?: TransferCreateNestedManyWithoutFromWalletInput
  }

  export type WalletUncheckedCreateWithoutToTransfersInput = {
    id?: string
    userId: string
    name: string
    type?: $Enums.WalletType
    balance?: Decimal | DecimalJsLike | number | string
    creditLimit?: Decimal | DecimalJsLike | number | string
    initialBalance?: Decimal | DecimalJsLike | number | string
    icon?: string | null
    color?: string | null
    interestRate?: Decimal | DecimalJsLike | number | string
    isArchived?: boolean
    adminFee?: Decimal | DecimalJsLike | number | string
    adminFeeType?: $Enums.AdminFeeType
    createdAt?: Date | string
    updatedAt?: Date | string
    transactions?: TransactionUncheckedCreateNestedManyWithoutWalletInput
    toTransactions?: TransactionUncheckedCreateNestedManyWithoutToWalletInput
    installments?: InstallmentUncheckedCreateNestedManyWithoutWalletInput
    fromTransfers?: TransferUncheckedCreateNestedManyWithoutFromWalletInput
  }

  export type WalletCreateOrConnectWithoutToTransfersInput = {
    where: WalletWhereUniqueInput
    create: XOR<WalletCreateWithoutToTransfersInput, WalletUncheckedCreateWithoutToTransfersInput>
  }

  export type UserUpsertWithoutTransfersInput = {
    update: XOR<UserUpdateWithoutTransfersInput, UserUncheckedUpdateWithoutTransfersInput>
    create: XOR<UserCreateWithoutTransfersInput, UserUncheckedCreateWithoutTransfersInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutTransfersInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutTransfersInput, UserUncheckedUpdateWithoutTransfersInput>
  }

  export type UserUpdateWithoutTransfersInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    wallets?: WalletUpdateManyWithoutUserNestedInput
    categories?: CategoryUpdateManyWithoutUserNestedInput
    transactions?: TransactionUpdateManyWithoutUserNestedInput
    installments?: InstallmentUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutTransfersInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    wallets?: WalletUncheckedUpdateManyWithoutUserNestedInput
    categories?: CategoryUncheckedUpdateManyWithoutUserNestedInput
    transactions?: TransactionUncheckedUpdateManyWithoutUserNestedInput
    installments?: InstallmentUncheckedUpdateManyWithoutUserNestedInput
  }

  export type WalletUpsertWithoutFromTransfersInput = {
    update: XOR<WalletUpdateWithoutFromTransfersInput, WalletUncheckedUpdateWithoutFromTransfersInput>
    create: XOR<WalletCreateWithoutFromTransfersInput, WalletUncheckedCreateWithoutFromTransfersInput>
    where?: WalletWhereInput
  }

  export type WalletUpdateToOneWithWhereWithoutFromTransfersInput = {
    where?: WalletWhereInput
    data: XOR<WalletUpdateWithoutFromTransfersInput, WalletUncheckedUpdateWithoutFromTransfersInput>
  }

  export type WalletUpdateWithoutFromTransfersInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    type?: EnumWalletTypeFieldUpdateOperationsInput | $Enums.WalletType
    balance?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    creditLimit?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    initialBalance?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    icon?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    interestRate?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    isArchived?: BoolFieldUpdateOperationsInput | boolean
    adminFee?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    adminFeeType?: EnumAdminFeeTypeFieldUpdateOperationsInput | $Enums.AdminFeeType
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutWalletsNestedInput
    transactions?: TransactionUpdateManyWithoutWalletNestedInput
    toTransactions?: TransactionUpdateManyWithoutToWalletNestedInput
    installments?: InstallmentUpdateManyWithoutWalletNestedInput
    toTransfers?: TransferUpdateManyWithoutToWalletNestedInput
  }

  export type WalletUncheckedUpdateWithoutFromTransfersInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    type?: EnumWalletTypeFieldUpdateOperationsInput | $Enums.WalletType
    balance?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    creditLimit?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    initialBalance?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    icon?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    interestRate?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    isArchived?: BoolFieldUpdateOperationsInput | boolean
    adminFee?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    adminFeeType?: EnumAdminFeeTypeFieldUpdateOperationsInput | $Enums.AdminFeeType
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    transactions?: TransactionUncheckedUpdateManyWithoutWalletNestedInput
    toTransactions?: TransactionUncheckedUpdateManyWithoutToWalletNestedInput
    installments?: InstallmentUncheckedUpdateManyWithoutWalletNestedInput
    toTransfers?: TransferUncheckedUpdateManyWithoutToWalletNestedInput
  }

  export type WalletUpsertWithoutToTransfersInput = {
    update: XOR<WalletUpdateWithoutToTransfersInput, WalletUncheckedUpdateWithoutToTransfersInput>
    create: XOR<WalletCreateWithoutToTransfersInput, WalletUncheckedCreateWithoutToTransfersInput>
    where?: WalletWhereInput
  }

  export type WalletUpdateToOneWithWhereWithoutToTransfersInput = {
    where?: WalletWhereInput
    data: XOR<WalletUpdateWithoutToTransfersInput, WalletUncheckedUpdateWithoutToTransfersInput>
  }

  export type WalletUpdateWithoutToTransfersInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    type?: EnumWalletTypeFieldUpdateOperationsInput | $Enums.WalletType
    balance?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    creditLimit?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    initialBalance?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    icon?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    interestRate?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    isArchived?: BoolFieldUpdateOperationsInput | boolean
    adminFee?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    adminFeeType?: EnumAdminFeeTypeFieldUpdateOperationsInput | $Enums.AdminFeeType
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutWalletsNestedInput
    transactions?: TransactionUpdateManyWithoutWalletNestedInput
    toTransactions?: TransactionUpdateManyWithoutToWalletNestedInput
    installments?: InstallmentUpdateManyWithoutWalletNestedInput
    fromTransfers?: TransferUpdateManyWithoutFromWalletNestedInput
  }

  export type WalletUncheckedUpdateWithoutToTransfersInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    type?: EnumWalletTypeFieldUpdateOperationsInput | $Enums.WalletType
    balance?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    creditLimit?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    initialBalance?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    icon?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    interestRate?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    isArchived?: BoolFieldUpdateOperationsInput | boolean
    adminFee?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    adminFeeType?: EnumAdminFeeTypeFieldUpdateOperationsInput | $Enums.AdminFeeType
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    transactions?: TransactionUncheckedUpdateManyWithoutWalletNestedInput
    toTransactions?: TransactionUncheckedUpdateManyWithoutToWalletNestedInput
    installments?: InstallmentUncheckedUpdateManyWithoutWalletNestedInput
    fromTransfers?: TransferUncheckedUpdateManyWithoutFromWalletNestedInput
  }

  export type WalletCreateManyUserInput = {
    id?: string
    name: string
    type?: $Enums.WalletType
    balance?: Decimal | DecimalJsLike | number | string
    creditLimit?: Decimal | DecimalJsLike | number | string
    initialBalance?: Decimal | DecimalJsLike | number | string
    icon?: string | null
    color?: string | null
    interestRate?: Decimal | DecimalJsLike | number | string
    isArchived?: boolean
    adminFee?: Decimal | DecimalJsLike | number | string
    adminFeeType?: $Enums.AdminFeeType
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type CategoryCreateManyUserInput = {
    id?: string
    name: string
    type: $Enums.CategoryType
    icon?: string | null
    color?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TransactionCreateManyUserInput = {
    id?: string
    walletId: string
    toWalletId?: string | null
    categoryId?: string | null
    type: $Enums.TransactionType
    amount: Decimal | DecimalJsLike | number | string
    description?: string | null
    isInstallment?: boolean
    installmentId?: string | null
    date: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type InstallmentCreateManyUserInput = {
    id?: string
    walletId: string
    totalAmount: Decimal | DecimalJsLike | number | string
    interestRate?: Decimal | DecimalJsLike | number | string
    totalInterest?: Decimal | DecimalJsLike | number | string
    adminFee?: Decimal | DecimalJsLike | number | string
    adminFeeType?: $Enums.AdminFeeType
    totalAdminFee?: Decimal | DecimalJsLike | number | string
    grandTotal?: Decimal | DecimalJsLike | number | string
    installmentMonths: number
    currentTerm?: number
    monthlyAmount: Decimal | DecimalJsLike | number | string
    status?: $Enums.InstallmentStatus
    startDate: Date | string
    description?: string | null
    balanceDeducted?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TransferCreateManyUserInput = {
    id?: string
    fromWalletId: string
    toWalletId: string
    amount: Decimal | DecimalJsLike | number | string
    note?: string | null
    date: Date | string
    createdAt?: Date | string
  }

  export type WalletUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    type?: EnumWalletTypeFieldUpdateOperationsInput | $Enums.WalletType
    balance?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    creditLimit?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    initialBalance?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    icon?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    interestRate?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    isArchived?: BoolFieldUpdateOperationsInput | boolean
    adminFee?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    adminFeeType?: EnumAdminFeeTypeFieldUpdateOperationsInput | $Enums.AdminFeeType
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    transactions?: TransactionUpdateManyWithoutWalletNestedInput
    toTransactions?: TransactionUpdateManyWithoutToWalletNestedInput
    installments?: InstallmentUpdateManyWithoutWalletNestedInput
    fromTransfers?: TransferUpdateManyWithoutFromWalletNestedInput
    toTransfers?: TransferUpdateManyWithoutToWalletNestedInput
  }

  export type WalletUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    type?: EnumWalletTypeFieldUpdateOperationsInput | $Enums.WalletType
    balance?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    creditLimit?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    initialBalance?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    icon?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    interestRate?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    isArchived?: BoolFieldUpdateOperationsInput | boolean
    adminFee?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    adminFeeType?: EnumAdminFeeTypeFieldUpdateOperationsInput | $Enums.AdminFeeType
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    transactions?: TransactionUncheckedUpdateManyWithoutWalletNestedInput
    toTransactions?: TransactionUncheckedUpdateManyWithoutToWalletNestedInput
    installments?: InstallmentUncheckedUpdateManyWithoutWalletNestedInput
    fromTransfers?: TransferUncheckedUpdateManyWithoutFromWalletNestedInput
    toTransfers?: TransferUncheckedUpdateManyWithoutToWalletNestedInput
  }

  export type WalletUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    type?: EnumWalletTypeFieldUpdateOperationsInput | $Enums.WalletType
    balance?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    creditLimit?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    initialBalance?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    icon?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    interestRate?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    isArchived?: BoolFieldUpdateOperationsInput | boolean
    adminFee?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    adminFeeType?: EnumAdminFeeTypeFieldUpdateOperationsInput | $Enums.AdminFeeType
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CategoryUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    type?: EnumCategoryTypeFieldUpdateOperationsInput | $Enums.CategoryType
    icon?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    transactions?: TransactionUpdateManyWithoutCategoryNestedInput
  }

  export type CategoryUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    type?: EnumCategoryTypeFieldUpdateOperationsInput | $Enums.CategoryType
    icon?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    transactions?: TransactionUncheckedUpdateManyWithoutCategoryNestedInput
  }

  export type CategoryUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    type?: EnumCategoryTypeFieldUpdateOperationsInput | $Enums.CategoryType
    icon?: NullableStringFieldUpdateOperationsInput | string | null
    color?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TransactionUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    type?: EnumTransactionTypeFieldUpdateOperationsInput | $Enums.TransactionType
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    isInstallment?: BoolFieldUpdateOperationsInput | boolean
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    wallet?: WalletUpdateOneRequiredWithoutTransactionsNestedInput
    toWallet?: WalletUpdateOneWithoutToTransactionsNestedInput
    category?: CategoryUpdateOneWithoutTransactionsNestedInput
    installment?: InstallmentUpdateOneWithoutTransactionsNestedInput
  }

  export type TransactionUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    walletId?: StringFieldUpdateOperationsInput | string
    toWalletId?: NullableStringFieldUpdateOperationsInput | string | null
    categoryId?: NullableStringFieldUpdateOperationsInput | string | null
    type?: EnumTransactionTypeFieldUpdateOperationsInput | $Enums.TransactionType
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    isInstallment?: BoolFieldUpdateOperationsInput | boolean
    installmentId?: NullableStringFieldUpdateOperationsInput | string | null
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TransactionUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    walletId?: StringFieldUpdateOperationsInput | string
    toWalletId?: NullableStringFieldUpdateOperationsInput | string | null
    categoryId?: NullableStringFieldUpdateOperationsInput | string | null
    type?: EnumTransactionTypeFieldUpdateOperationsInput | $Enums.TransactionType
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    isInstallment?: BoolFieldUpdateOperationsInput | boolean
    installmentId?: NullableStringFieldUpdateOperationsInput | string | null
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type InstallmentUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    totalAmount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    interestRate?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    totalInterest?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    adminFee?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    adminFeeType?: EnumAdminFeeTypeFieldUpdateOperationsInput | $Enums.AdminFeeType
    totalAdminFee?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    grandTotal?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    installmentMonths?: IntFieldUpdateOperationsInput | number
    currentTerm?: IntFieldUpdateOperationsInput | number
    monthlyAmount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    status?: EnumInstallmentStatusFieldUpdateOperationsInput | $Enums.InstallmentStatus
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    balanceDeducted?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    wallet?: WalletUpdateOneRequiredWithoutInstallmentsNestedInput
    transactions?: TransactionUpdateManyWithoutInstallmentNestedInput
  }

  export type InstallmentUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    walletId?: StringFieldUpdateOperationsInput | string
    totalAmount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    interestRate?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    totalInterest?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    adminFee?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    adminFeeType?: EnumAdminFeeTypeFieldUpdateOperationsInput | $Enums.AdminFeeType
    totalAdminFee?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    grandTotal?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    installmentMonths?: IntFieldUpdateOperationsInput | number
    currentTerm?: IntFieldUpdateOperationsInput | number
    monthlyAmount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    status?: EnumInstallmentStatusFieldUpdateOperationsInput | $Enums.InstallmentStatus
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    balanceDeducted?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    transactions?: TransactionUncheckedUpdateManyWithoutInstallmentNestedInput
  }

  export type InstallmentUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    walletId?: StringFieldUpdateOperationsInput | string
    totalAmount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    interestRate?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    totalInterest?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    adminFee?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    adminFeeType?: EnumAdminFeeTypeFieldUpdateOperationsInput | $Enums.AdminFeeType
    totalAdminFee?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    grandTotal?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    installmentMonths?: IntFieldUpdateOperationsInput | number
    currentTerm?: IntFieldUpdateOperationsInput | number
    monthlyAmount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    status?: EnumInstallmentStatusFieldUpdateOperationsInput | $Enums.InstallmentStatus
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    balanceDeducted?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TransferUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    note?: NullableStringFieldUpdateOperationsInput | string | null
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    fromWallet?: WalletUpdateOneRequiredWithoutFromTransfersNestedInput
    toWallet?: WalletUpdateOneRequiredWithoutToTransfersNestedInput
  }

  export type TransferUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    fromWalletId?: StringFieldUpdateOperationsInput | string
    toWalletId?: StringFieldUpdateOperationsInput | string
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    note?: NullableStringFieldUpdateOperationsInput | string | null
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TransferUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    fromWalletId?: StringFieldUpdateOperationsInput | string
    toWalletId?: StringFieldUpdateOperationsInput | string
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    note?: NullableStringFieldUpdateOperationsInput | string | null
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TransactionCreateManyWalletInput = {
    id?: string
    userId: string
    toWalletId?: string | null
    categoryId?: string | null
    type: $Enums.TransactionType
    amount: Decimal | DecimalJsLike | number | string
    description?: string | null
    isInstallment?: boolean
    installmentId?: string | null
    date: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TransactionCreateManyToWalletInput = {
    id?: string
    userId: string
    walletId: string
    categoryId?: string | null
    type: $Enums.TransactionType
    amount: Decimal | DecimalJsLike | number | string
    description?: string | null
    isInstallment?: boolean
    installmentId?: string | null
    date: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type InstallmentCreateManyWalletInput = {
    id?: string
    userId: string
    totalAmount: Decimal | DecimalJsLike | number | string
    interestRate?: Decimal | DecimalJsLike | number | string
    totalInterest?: Decimal | DecimalJsLike | number | string
    adminFee?: Decimal | DecimalJsLike | number | string
    adminFeeType?: $Enums.AdminFeeType
    totalAdminFee?: Decimal | DecimalJsLike | number | string
    grandTotal?: Decimal | DecimalJsLike | number | string
    installmentMonths: number
    currentTerm?: number
    monthlyAmount: Decimal | DecimalJsLike | number | string
    status?: $Enums.InstallmentStatus
    startDate: Date | string
    description?: string | null
    balanceDeducted?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TransferCreateManyFromWalletInput = {
    id?: string
    userId: string
    toWalletId: string
    amount: Decimal | DecimalJsLike | number | string
    note?: string | null
    date: Date | string
    createdAt?: Date | string
  }

  export type TransferCreateManyToWalletInput = {
    id?: string
    userId: string
    fromWalletId: string
    amount: Decimal | DecimalJsLike | number | string
    note?: string | null
    date: Date | string
    createdAt?: Date | string
  }

  export type TransactionUpdateWithoutWalletInput = {
    id?: StringFieldUpdateOperationsInput | string
    type?: EnumTransactionTypeFieldUpdateOperationsInput | $Enums.TransactionType
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    isInstallment?: BoolFieldUpdateOperationsInput | boolean
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutTransactionsNestedInput
    toWallet?: WalletUpdateOneWithoutToTransactionsNestedInput
    category?: CategoryUpdateOneWithoutTransactionsNestedInput
    installment?: InstallmentUpdateOneWithoutTransactionsNestedInput
  }

  export type TransactionUncheckedUpdateWithoutWalletInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    toWalletId?: NullableStringFieldUpdateOperationsInput | string | null
    categoryId?: NullableStringFieldUpdateOperationsInput | string | null
    type?: EnumTransactionTypeFieldUpdateOperationsInput | $Enums.TransactionType
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    isInstallment?: BoolFieldUpdateOperationsInput | boolean
    installmentId?: NullableStringFieldUpdateOperationsInput | string | null
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TransactionUncheckedUpdateManyWithoutWalletInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    toWalletId?: NullableStringFieldUpdateOperationsInput | string | null
    categoryId?: NullableStringFieldUpdateOperationsInput | string | null
    type?: EnumTransactionTypeFieldUpdateOperationsInput | $Enums.TransactionType
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    isInstallment?: BoolFieldUpdateOperationsInput | boolean
    installmentId?: NullableStringFieldUpdateOperationsInput | string | null
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TransactionUpdateWithoutToWalletInput = {
    id?: StringFieldUpdateOperationsInput | string
    type?: EnumTransactionTypeFieldUpdateOperationsInput | $Enums.TransactionType
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    isInstallment?: BoolFieldUpdateOperationsInput | boolean
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutTransactionsNestedInput
    wallet?: WalletUpdateOneRequiredWithoutTransactionsNestedInput
    category?: CategoryUpdateOneWithoutTransactionsNestedInput
    installment?: InstallmentUpdateOneWithoutTransactionsNestedInput
  }

  export type TransactionUncheckedUpdateWithoutToWalletInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    walletId?: StringFieldUpdateOperationsInput | string
    categoryId?: NullableStringFieldUpdateOperationsInput | string | null
    type?: EnumTransactionTypeFieldUpdateOperationsInput | $Enums.TransactionType
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    isInstallment?: BoolFieldUpdateOperationsInput | boolean
    installmentId?: NullableStringFieldUpdateOperationsInput | string | null
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TransactionUncheckedUpdateManyWithoutToWalletInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    walletId?: StringFieldUpdateOperationsInput | string
    categoryId?: NullableStringFieldUpdateOperationsInput | string | null
    type?: EnumTransactionTypeFieldUpdateOperationsInput | $Enums.TransactionType
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    isInstallment?: BoolFieldUpdateOperationsInput | boolean
    installmentId?: NullableStringFieldUpdateOperationsInput | string | null
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type InstallmentUpdateWithoutWalletInput = {
    id?: StringFieldUpdateOperationsInput | string
    totalAmount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    interestRate?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    totalInterest?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    adminFee?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    adminFeeType?: EnumAdminFeeTypeFieldUpdateOperationsInput | $Enums.AdminFeeType
    totalAdminFee?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    grandTotal?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    installmentMonths?: IntFieldUpdateOperationsInput | number
    currentTerm?: IntFieldUpdateOperationsInput | number
    monthlyAmount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    status?: EnumInstallmentStatusFieldUpdateOperationsInput | $Enums.InstallmentStatus
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    balanceDeducted?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutInstallmentsNestedInput
    transactions?: TransactionUpdateManyWithoutInstallmentNestedInput
  }

  export type InstallmentUncheckedUpdateWithoutWalletInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    totalAmount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    interestRate?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    totalInterest?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    adminFee?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    adminFeeType?: EnumAdminFeeTypeFieldUpdateOperationsInput | $Enums.AdminFeeType
    totalAdminFee?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    grandTotal?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    installmentMonths?: IntFieldUpdateOperationsInput | number
    currentTerm?: IntFieldUpdateOperationsInput | number
    monthlyAmount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    status?: EnumInstallmentStatusFieldUpdateOperationsInput | $Enums.InstallmentStatus
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    balanceDeducted?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    transactions?: TransactionUncheckedUpdateManyWithoutInstallmentNestedInput
  }

  export type InstallmentUncheckedUpdateManyWithoutWalletInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    totalAmount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    interestRate?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    totalInterest?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    adminFee?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    adminFeeType?: EnumAdminFeeTypeFieldUpdateOperationsInput | $Enums.AdminFeeType
    totalAdminFee?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    grandTotal?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    installmentMonths?: IntFieldUpdateOperationsInput | number
    currentTerm?: IntFieldUpdateOperationsInput | number
    monthlyAmount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    status?: EnumInstallmentStatusFieldUpdateOperationsInput | $Enums.InstallmentStatus
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    balanceDeducted?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TransferUpdateWithoutFromWalletInput = {
    id?: StringFieldUpdateOperationsInput | string
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    note?: NullableStringFieldUpdateOperationsInput | string | null
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutTransfersNestedInput
    toWallet?: WalletUpdateOneRequiredWithoutToTransfersNestedInput
  }

  export type TransferUncheckedUpdateWithoutFromWalletInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    toWalletId?: StringFieldUpdateOperationsInput | string
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    note?: NullableStringFieldUpdateOperationsInput | string | null
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TransferUncheckedUpdateManyWithoutFromWalletInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    toWalletId?: StringFieldUpdateOperationsInput | string
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    note?: NullableStringFieldUpdateOperationsInput | string | null
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TransferUpdateWithoutToWalletInput = {
    id?: StringFieldUpdateOperationsInput | string
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    note?: NullableStringFieldUpdateOperationsInput | string | null
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutTransfersNestedInput
    fromWallet?: WalletUpdateOneRequiredWithoutFromTransfersNestedInput
  }

  export type TransferUncheckedUpdateWithoutToWalletInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    fromWalletId?: StringFieldUpdateOperationsInput | string
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    note?: NullableStringFieldUpdateOperationsInput | string | null
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TransferUncheckedUpdateManyWithoutToWalletInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    fromWalletId?: StringFieldUpdateOperationsInput | string
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    note?: NullableStringFieldUpdateOperationsInput | string | null
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TransactionCreateManyCategoryInput = {
    id?: string
    userId: string
    walletId: string
    toWalletId?: string | null
    type: $Enums.TransactionType
    amount: Decimal | DecimalJsLike | number | string
    description?: string | null
    isInstallment?: boolean
    installmentId?: string | null
    date: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TransactionUpdateWithoutCategoryInput = {
    id?: StringFieldUpdateOperationsInput | string
    type?: EnumTransactionTypeFieldUpdateOperationsInput | $Enums.TransactionType
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    isInstallment?: BoolFieldUpdateOperationsInput | boolean
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutTransactionsNestedInput
    wallet?: WalletUpdateOneRequiredWithoutTransactionsNestedInput
    toWallet?: WalletUpdateOneWithoutToTransactionsNestedInput
    installment?: InstallmentUpdateOneWithoutTransactionsNestedInput
  }

  export type TransactionUncheckedUpdateWithoutCategoryInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    walletId?: StringFieldUpdateOperationsInput | string
    toWalletId?: NullableStringFieldUpdateOperationsInput | string | null
    type?: EnumTransactionTypeFieldUpdateOperationsInput | $Enums.TransactionType
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    isInstallment?: BoolFieldUpdateOperationsInput | boolean
    installmentId?: NullableStringFieldUpdateOperationsInput | string | null
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TransactionUncheckedUpdateManyWithoutCategoryInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    walletId?: StringFieldUpdateOperationsInput | string
    toWalletId?: NullableStringFieldUpdateOperationsInput | string | null
    type?: EnumTransactionTypeFieldUpdateOperationsInput | $Enums.TransactionType
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    isInstallment?: BoolFieldUpdateOperationsInput | boolean
    installmentId?: NullableStringFieldUpdateOperationsInput | string | null
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TransactionCreateManyInstallmentInput = {
    id?: string
    userId: string
    walletId: string
    toWalletId?: string | null
    categoryId?: string | null
    type: $Enums.TransactionType
    amount: Decimal | DecimalJsLike | number | string
    description?: string | null
    isInstallment?: boolean
    date: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TransactionUpdateWithoutInstallmentInput = {
    id?: StringFieldUpdateOperationsInput | string
    type?: EnumTransactionTypeFieldUpdateOperationsInput | $Enums.TransactionType
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    isInstallment?: BoolFieldUpdateOperationsInput | boolean
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutTransactionsNestedInput
    wallet?: WalletUpdateOneRequiredWithoutTransactionsNestedInput
    toWallet?: WalletUpdateOneWithoutToTransactionsNestedInput
    category?: CategoryUpdateOneWithoutTransactionsNestedInput
  }

  export type TransactionUncheckedUpdateWithoutInstallmentInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    walletId?: StringFieldUpdateOperationsInput | string
    toWalletId?: NullableStringFieldUpdateOperationsInput | string | null
    categoryId?: NullableStringFieldUpdateOperationsInput | string | null
    type?: EnumTransactionTypeFieldUpdateOperationsInput | $Enums.TransactionType
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    isInstallment?: BoolFieldUpdateOperationsInput | boolean
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TransactionUncheckedUpdateManyWithoutInstallmentInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    walletId?: StringFieldUpdateOperationsInput | string
    toWalletId?: NullableStringFieldUpdateOperationsInput | string | null
    categoryId?: NullableStringFieldUpdateOperationsInput | string | null
    type?: EnumTransactionTypeFieldUpdateOperationsInput | $Enums.TransactionType
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    isInstallment?: BoolFieldUpdateOperationsInput | boolean
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }



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