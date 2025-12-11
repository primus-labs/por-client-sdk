import { VERIFY_TYPE, RequestParams } from "../types.js";

export function makeHashComparisonParams(origRequests: any[], verifyType: VERIFY_TYPE): RequestParams {
  if (!Array.isArray(origRequests)) {
    throw new Error("Invalid input: origRequests must be an array");
  }

  const requestParams: RequestParams = {
    verifyType: 'HASH_COMPARISON',
    requests: [],
    responseResolves: [],
  };

  for (let i = 0; i < origRequests.length; i++) {
    const origRequest = origRequests[i];

    requestParams.requests.push({
      url: origRequest.url,
      method: "GET",
      header: { ...origRequest.headers },
      body: "",
    });

    if (verifyType == 'HASH_COMPARISON') {
      requestParams.responseResolves.push([
        {
          keyName: `${i}`,
          parseType: "json",
          parsePath: "$",
          op: "SHA256_EX",
        },
      ]);
    } else {
      throw Error("not supported verify type");
    }
  }

  return requestParams;
}
