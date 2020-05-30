const redis = {
  duplicate: () => redis,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  createRedlock: () => ({ lock: async () => ({ unlock: async () => {} }) }),
} as any;

export default redis;
