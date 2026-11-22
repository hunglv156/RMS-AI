import { Injectable, OnModuleDestroy } from "@nestjs/common";
import knex, { Knex } from "knex";
import { loadConfig } from "../common/config";
export type Transaction = Knex.Transaction;
export interface TransactionRunner {
  transaction<T>(work: (tx: Transaction) => Promise<T>): Promise<T>;
}
@Injectable()
export class Database implements OnModuleDestroy, TransactionRunner {
  readonly connection = knex({
    client: "pg",
    connection: loadConfig().DATABASE_URL,
    pool: { min: 0, max: 10 },
    acquireConnectionTimeout: 2000,
  });
  transaction<T>(work: (tx: Transaction) => Promise<T>): Promise<T> {
    return this.connection.transaction(work);
  }
  async onModuleDestroy() {
    await this.connection.destroy();
  }
}
