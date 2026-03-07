declare function test(name: string, fn: () => void | Promise<void>): void;
declare function describe(name: string, fn: () => void): void;
declare function expect(value: unknown): any;

