const redis = {
  createRedlock: () => ({
    lock: async () => ({
      unlock: async () => {},
    }),
  }),

  duplicate: () => redis,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

export default redis;
