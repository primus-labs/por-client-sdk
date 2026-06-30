import fs from 'fs';
import { VERIFY_TYPE, RequestParams, RequestParamsOutput } from "../types.js";
import { createHmac } from "node:crypto";

export function signQuery(secretKey: string, params: any) {
  const query = new URLSearchParams(params).toString();
  const signature = createHmac("sha256", secretKey).update(query).digest("hex");
  return `${query}&signature=${signature}`;
}

export function mergeManyRequestParams(
  list: RequestParamsOutput[]
): RequestParamsOutput {
  return list.reduce<RequestParamsOutput>((acc, cur) => {
    if (!acc) return cur;
    if (!cur) return acc;

    let p = {
      verifyType: acc.verifyType,
      requests: [...acc.requests, ...cur.requests],
      responseResolves: [...acc.responseResolves, ...cur.responseResolves],
    };
    let idx = 0;
    p.responseResolves = p.responseResolves.map(group =>
      group.map(item => ({
        ...item,
        keyName: `${idx++}`,
      }))
    );
    return p;
  }, undefined);
}

export interface OrigRequest {
  url: string;
  method?: string; // default "GET"
  body?: any;
  headers?: Record<string, string>;
}

function makeHashComparisonParams(origRequests: OrigRequest[], options?: any): RequestParams {
  if (!Array.isArray(origRequests)) {
    throw new Error("Invalid input: origRequests must be an array");
  }

  const requestParams: RequestParams = {
    verifyType: 'HASH_COMPARISON',
    requests: [],
    responseResolves: [],
    options,
  };

  for (let i = 0; i < origRequests.length; i++) {
    const origRequest = origRequests[i];

    requestParams.requests.push({
      url: origRequest.url,
      method: origRequest.method ?? "GET",
      header: { ...(origRequest.headers ?? {}) },
      body: origRequest.body,
    });

    requestParams.responseResolves.push([
      {
        keyName: `${i}`,
        parseType: "json",
        parsePath: "$",
        op: "SHA256_EX",
      },
    ]);
  }

  return requestParams;
}

export function makeZkTlsRequestParams(origRequests: OrigRequest[], verifyType: VERIFY_TYPE = 'HASH_COMPARISON', options?: any): RequestParams {
  if (verifyType == 'HASH_COMPARISON') {
    return makeHashComparisonParams(origRequests, options);
  }

  throw Error("not supported verify type");
}


export function readRequestFile(filepath: string): OrigRequest[] {
  try {
    if (!fs.existsSync(filepath)) {
      throw new Error(`File not found: ${filepath}`);
    }

    const content = fs.readFileSync(filepath, "utf-8");
    if (!content || content.trim() === '') {
      throw new Error(`${filepath} is empty`);
    }

    let data: any;
    try {
      data = JSON.parse(content);
    } catch (parseError) {
      throw new Error(`Invalid JSON in ${filepath}: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }

    if (!Array.isArray(data)) {
      throw new Error(`Parsed data is not an array in ${filepath}`);
    }

    if (data.length === 0) {
      throw new Error(`${filepath} contains empty array`);
    }

    const errors: string[] = [];
    const validRequests: OrigRequest[] = [];

    data.forEach((item, index) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        errors.push(`Item ${index} is not an object`);
        return;
      }

      // to-do: more check

      const validRequest: OrigRequest = {
        url: item.url,
        method: item.method,
        body: item.body,
        headers: item.headers,
      };
      validRequests.push(validRequest);
    });

    if (errors.length > 0) {
      throw new Error(`Validation errors in ${filepath}:\n${errors.join('\n')}`);
    }

    return validRequests;
  } catch (error) {
    throw error;
  }
}