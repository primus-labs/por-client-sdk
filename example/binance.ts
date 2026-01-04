import { DataSource, PoRClient, loadConfigFromFile } from "../src";

async function main() {
  try {
    const config = loadConfigFromFile();
    console.log("config:", JSON.stringify(config));
    const ds = new DataSource.ExchangeManager(config.exchanges);
    console.log("ds:", JSON.stringify(ds));

    const client = new PoRClient(config.app);
    console.log("client:", JSON.stringify(client));

    if (ds.binance?.hasSpot) {
      const requestParams = ds.binance?.getSpotAccountInfoRequests();
      const result = await client.run(requestParams);
      console.log("result", JSON.stringify(result));
      console.log('proof fixture(json):', JSON.parse(result?.proof_fixture ?? "{}"));
    }

  } catch (err: any) {
    console.log("err:", err?.message, JSON.stringify(err));
  }
}

main()
