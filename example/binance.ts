import { DatasourceManager, PoRClient, loadConfigFromFile } from "../src";

async function main() {
  try {
    const config = loadConfigFromFile();
    console.log("config:", JSON.stringify(config));
    const ds = new DatasourceManager(config.datasource);
    console.log("ds:", JSON.stringify(ds));

    const client = new PoRClient(config.app);
    console.log("client:", JSON.stringify(client));

    const result = await client.run({
      binanceSpot: () => ds.binance?.getSpotAccountInfoRequests()
    });
    console.log("result", JSON.stringify(result));
    console.log('proof fixture(json):', JSON.parse(result?.proof_fixture ?? "{}"));
  } catch (err: any) {
    console.log("err:", err?.message, JSON.stringify(err));
  }
}

main()
