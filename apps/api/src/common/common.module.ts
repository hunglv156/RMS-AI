import { Global, Module } from "@nestjs/common";
import { Database } from "../db/database";
/** Shared DB lifetime; feature modules add their own providers within their write scope. */
@Global()
@Module({ providers: [Database], exports: [Database] })
export class CommonModule {}
