const redis = {
  duplicate: () => redis,
  createRedlock: () => ({ lock: async () => ({ unlock: async () => undefined }) }),
} as any;

export default redis;
