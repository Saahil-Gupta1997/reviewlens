export function providerErrorMessage(status:number,code:string) {
  if(status===401)return 'The OpenAI API key was rejected. Update it in Settings, or choose on-device search without a key.';
  if(status===429){
    if(['insufficient_quota','credit_balance_exhausted'].includes(code))return 'Your OpenAI API account has no available quota or credits. ChatGPT Plus does not include API credits. Choose on-device semantic search in Settings to continue without API charges.';
    if(['organization_spend_limit_exceeded','project_spend_limit_exceeded','organization_usage_limit_exceeded'].includes(code))return 'Your OpenAI account or project has reached its spending or usage limit. Check API billing, or choose on-device semantic search without API charges.';
    return 'OpenAI temporarily limited this request, or your API quota is unavailable. Retry later, check API billing, or choose on-device semantic search. ChatGPT Plus does not include API credits.';
  }
  return 'OpenAI could not complete this request. Retry later or choose on-device semantic search.';
}
