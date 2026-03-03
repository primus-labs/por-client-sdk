import { PoRClient, loadConfigFromFile, makeZkTlsRequestParams, OrigRequest } from "../src";

function getSampleRequests() {
  const origRequests: OrigRequest[] = [
    {
      url: "https://www.okx.com/api/v5/public/instruments?instType=SPOT&instId=BTC-USD",
      method: "GET",
      headers: {},
      body: "",
    }
  ];
  return makeZkTlsRequestParams(origRequests);
}

async function main() {
  try {
    const config = loadConfigFromFile();
    const client = new PoRClient(config.app);
    const result = await client.run({
      okxSample: () => getSampleRequests()
    });
    console.log("result", JSON.stringify(result));
    console.log('proof fixture(json):', JSON.parse(result?.proof_fixture ?? "{}"));
  } catch (err: any) {
    console.log("err:", err?.message, JSON.stringify(err));
  }
}

main()
