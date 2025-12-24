# PoR Client SDK

## Overview

The **PoR Client SDK** provides a client for interacting with **zkTLS** and **zkVM**, supporting authentication, program execution, and optional blockchain integration.


## Build

Install dependencies and build the project:

```bash
npm install
npm run build
```


## Getting Started

1. Copy `.env.example` to `.env` and configure your environment variables (see [Configuration](#configuration)).

2. Ensure required fields are set:

   * `TOKEN` and `PROJECT_ID` for authentication
   * `PROGRAM_ID` for program execution

3. Run an example:

  ```bash
  npx tsx example/okx.ts
  ```


## Configuration

The SDK allows flexible configuration from **three sources**, applied in **priority order (highest to lowest)**:

1. **Environment variables** (`.env` or `process.env`)
2. **User-provided options** (passed to the `PoRClient` constructor)
3. **Default values** defined in the SDK

> Higher-priority values overwrite lower-priority values.

### Configuration Fields and Defaults

| Env Variable       | SDK Field        | Type   | Required / Conditions | Default                                | Description                                                |
| ------------------ | ---------------- | ------ | --------------------- | -------------------------------------- | ---------------------------------------------------------- |
| `TOKEN`            | `token`          | string | Required              | `""`                                   | Authentication token assigned by Primus Labs.              |
| `PROJECT_ID`       | `projectId`      | string | Required              | `""`                                   | Project identifier associated with your account.           |
| `PROGRAM_ID`       | `programId`      | string | Required              | `""`                                   | Program identifier for zkVM execution.                     |
| `LOG_VERBOSE`      | `logVerbose`     | number | Optional              | `0`                                    | Logging verbosity level (`0` = off; higher = more detail). |
| `RPC_URL`          | `rpcUrl`         | string | Optional              | `https://mainnet.base.org`             | RPC endpoint for blockchain interactions.                  |


### User-provided Configuration Example

```ts
import { PoRClient } from "@primuslabs/por-client-sdk";

const client = new PoRClient({
  token: "my-token",
  projectId: "my-project",
  programId: "my-program",
  logVerbose: 2,
});
```


## Using the SDK

```ts
import { DataSource, PoRClient } from "@primuslabs/por-client-sdk";

async function main() {
  const ds = new DataSource.Okx();
  const requestParams = ds.getSampleRequests();

  const client = new PoRClient();
  const result = await client.run(requestParams);

  console.log("Result:", JSON.stringify(result));
}

main();
```


## Data Sources

> TODO: Document supported data sources and sample requests.

