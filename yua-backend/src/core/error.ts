export class YuaError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "YUA-EngineError";
  }
}
