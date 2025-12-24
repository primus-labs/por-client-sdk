import { DataSource, PoRClient } from "../src";

async function main() {
  try {
    const ds = new DataSource.Okx();
    const requestParams = ds.getSampleRequests();

    const client = new PoRClient();
    const result = await client.run(requestParams, { noProxy: false });
    // const result = await client.run([requestParams, requestParams], { noProxy: false },);
    console.log("result", JSON.stringify(result));
  } catch (err: any) {
    console.log("err:", err?.message, JSON.stringify(err));
  }
}

main()
