export const Validator = {
  ensureString(value: any, field: string) {
    if (!value || typeof value !== "string") {
      throw new Error(`❌ ${field} must be a string`);
    }
  },

  ensureObject(value: any, field: string) {
    if (!value || typeof value !== "object") {
      throw new Error(`❌ ${field} must be an object`);
    }
  }
};
