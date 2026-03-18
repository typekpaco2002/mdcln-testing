// Debug helper for troubleshooting

export const debugLog = (context, data) => {
  console.log(`🔍 [${context}]`, data);
};

export const debugError = (context, error) => {
  console.error(`❌ [${context}]`, {
    message: error.message,
    response: error.response?.data,
    status: error.response?.status
  });
};

export const debugSuccess = (context, data) => {
  console.log(`✅ [${context}]`, data);
};

export default { debugLog, debugError, debugSuccess };
