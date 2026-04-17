// Custom waitFor implementation for test utilities
export const waitFor = async (
  callback: () => boolean | void | Promise<boolean | void>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> => {
  const { timeout = 3000, interval = 50 } = options;
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const checkCondition = async () => {
      try {
        await callback();
        resolve();
        return;
      } catch (error) {
        // If callback throws, continue waiting
        if (Date.now() - startTime >= timeout) {
          reject(error);
          return;
        }
        setTimeout(checkCondition, interval);
      }
    };

    checkCondition();
  });
};
