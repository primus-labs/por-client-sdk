import { AttNetworkRequest, AttNetworkResponseResolve } from "@primuslabs/network-core-sdk/dist/types";
export type VERIFY_TYPE = "HASH_COMPARISON";
export type RequestParams = {
  verifyType: VERIFY_TYPE;
  requests: AttNetworkRequest[];
  responseResolves: AttNetworkResponseResolve[][];
};
export type RequestParamsInput = RequestParams | RequestParams[];
export type RequestParamsCallback = () => RequestParams;

export interface Options {
  sslCipher?: string;
  algorithmType?: string;
  specialTask?: any;
  noProxy?: boolean;
  runZkvm?: boolean;
  requestParamsCallback?: RequestParamsCallback | RequestParamsCallback[];
}

export function getDefaultOptions(options: Options): Options {
  const defaults: Options = {
    sslCipher: "ECDHE-RSA-AES128-GCM-SHA256",
    algorithmType: "mpctls",
    specialTask: undefined,
    noProxy: true,
    runZkvm: true,
    requestParamsCallback: undefined,
  };
  return { ...defaults, ...options };
}
