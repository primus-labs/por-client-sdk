import { AttNetworkRequest, AttNetworkResponseResolve } from "@primuslabs/network-core-sdk/dist/types";
export type VERIFY_TYPE = "HASH_COMPARISON";
export type RequestParams = {
  verifyType: VERIFY_TYPE;
  requests: AttNetworkRequest[];
  responseResolves: AttNetworkResponseResolve[][];
};
export type RequestParamsInput = RequestParams | RequestParams[];

export interface Options {
  sslCipher?: string;
  algorithmType?: string;
  specialTask?: any;
  noProxy?: boolean;
  runZkvm?: boolean;
  requestParamsCallback?: () => RequestParams;
}
