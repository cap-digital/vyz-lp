// Tag de cache dos dados de uma conta: os dashboards marcam o que leem do
// armazém com ela (cacheTag) e a sincronização invalida ao terminar.

export const insightsTag = (adAccountId: string) => `insights:${adAccountId}`;
