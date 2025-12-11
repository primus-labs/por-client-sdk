import { DataSource, ZkTLSClient, ProverClient, saveToFile } from "../src";

async function main() {
  try {
    const ds = new DataSource.Okx();
    const requestParams = ds.getSampleRequests();

    console.log("do zkTLS");
    const zktlsClient = new ZkTLSClient();
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
