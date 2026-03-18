declare module "pg" {
  type QueryResult<T> = {
    rows: T[];
    rowCount: number | null;
  };

  export class PoolClient {
    query<T = Record<string, unknown>>(
      text: string,
      params?: Array<unknown>
    ): Promise<QueryResult<T>>;
    release(): void;
  }

  export class Pool {
    constructor(config?: unknown);
    query<T = Record<string, unknown>>(
      text: string,
      params?: Array<unknown>
    ): Promise<QueryResult<T>>;
    connect(): Promise<PoolClient>;
  }
}
