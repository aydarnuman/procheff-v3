declare module "better-sqlite3" {
  class Database {
    constructor(filename: string, options?: any);
    prepare(sql: string): any;
    exec(sql: string): void;
    close(): void;
    pragma(str: string): any;
    transaction(fn: Function): Function;
  }
  
  export = Database;
}
