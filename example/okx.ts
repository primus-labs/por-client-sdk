import { ZkTLSClient, ProverClient, saveToFile, RequestParams } from "../src";

function getRequestParams(): RequestParams {
  const requests = [
    {
      url: "https://www.okx.com/api/v5/public/instruments?instType=SPOT&instId=BTC-USD",
      method: "GET",
      header: {},
      body: "",
    }
  ];

  const responseResolves = [
    [
      {
        keyName: "hash-of-response-0",
        parseType: "json",
        parsePath: "$",
        op: "SHA256_EX"
      }
    ]
  ];
  console.log('requests', requests);
  console.log('responseResolves', responseResolves);
  return { verifyType: 'HASH_COMPARISON', requests, responseResolves };
}

async function main() {
  try {
    console.log("do zkTLS");
    const zktlsClient = new ZkTLSClient();
    const requestParams = getRequestParams();
    const zktlsResult = await zktlsClient.doZkTLS(requestParams, { noProxy: false });
    if (zktlsResult && zktlsResult.attestationData) {
      saveToFile("attestation.json", JSON.stringify(zktlsResult.attestationData));

      console.log("do prove");
      const proverClient = new ProverClient();
      const submitResult = await proverClient.submitTask(JSON.stringify(zktlsResult.attestationData))
      console.log("submitResult", submitResult);
      const result = await proverClient.getResult(submitResult.task_id);
      console.log("result", result);
    }
  } catch (err: any) {
    console.log("err:", err);
  }
}

main()
