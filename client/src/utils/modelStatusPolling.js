export async function pollModelUntilReady({
  apiClient,
  modelId,
  maxAttempts = 300,
  intervalMs = 2000,
  onAttemptError,
}) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));

    try {
      const response = await apiClient.get(`/models/status/${modelId}`);
      const data = response?.data || {};

      if (data.status === "ready") {
        return {
          ready: true,
          status: data.status,
          model: data.model || null,
          attempts: attempt + 1,
        };
      }
    } catch (error) {
      if (typeof onAttemptError === "function") {
        onAttemptError(error, attempt + 1);
      }
    }
  }

  return {
    ready: false,
    status: "generating",
    model: null,
    attempts: maxAttempts,
  };
}
