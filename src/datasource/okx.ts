import { makeHashComparisonParams } from "./helper.js";
import { VERIFY_TYPE, RequestParams } from "../types.js";


export class Okx {
  constructor() {
  }

  public getSampleRequests(verifyType: VERIFY_TYPE = 'HASH_COMPARISON'): RequestParams {
    const origRequests: any[] = [
      {
        url: "https://www.okx.com/api/v5/public/instruments?instType=SPOT&instId=BTC-USD",
        method: "GET",
        header: {},
        body: "",
      }
    ];
    return makeHashComparisonParams(origRequests, verifyType);
  }

}
