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

1. Copy `.config.example.yml` to `.config.yml` and configure your environment variables (see [Configuration](#configuration)).

2. Ensure required fields are set:

   * `app.identity.userToken` and `app.identity.projectId` for authentication

3. Run an example: (Need configure your Binance API Key first)

  ```bash
  npx tsx example/binance.ts
  ```


## Configuration

### Structure Overview

```yaml
app:               # Core application configuration
  identity:        # Application identity and authorization info
  runtime:         # Runtime environment configuration
  services:        # External service endpoints
  blockchain:      # Blockchain connection and signer info

datasource:        # Datasource account configurations
  binance:         # Binance exchange accounts
  aster:           # Aster exchange accounts
```


### Application Configuration (`app`)

#### 1. Identity (`app.identity`)

Contains application authorization and identification.

| Field     | Type   | Description                                      | Example           |
| --------- | ------ | ------------------------------------------------ | ----------------- |
| userToken | string | Authentication token issued for this application | `"my-auth-token"` |
| projectId | string | Unique project identifier                        | `"project-123"`   |

#### 2. Runtime (`app.runtime`)

Specifies the runtime environment and logging.

| Field       | Type    | Default        | Description                                            | Example        |
| ----------- | ------- | -------------- | ------------------------------------------------------ | -------------- |
| version     | string  | -              | Application version in semantic version format (x.y.z) | `"1.0.0"`      |
| env         | string  | `"production"` | Runtime environment (`development` or `production`)    | `"production"` |
| logVerbose  | integer | `0`            | Log verbosity (default 0 = off, higher = more detail)  | `3`            |
| jobInterval | integer | `1800`         | Interval between jobs in seconds (default 1800)        | `3600`         |

#### 3. Services (`app.services`)

External service endpoints used by the application.

##### zkVM Service (`app.services.zkvm`)

| Field | Type   | Description               | Example                      |
| ----- | ------ | ------------------------- | ---------------------------- |
| url   | string | zkVM service endpoint URL | `"https://zkvm.example.com"` |

##### Data Service (`app.services.data`)

| Field | Type   | Description               | Example                      |
| ----- | ------ | ------------------------- | ---------------------------- |
| url   | string | Data service endpoint URL | `"https://data.example.com"` |

#### 4. Blockchain (`app.blockchain`)

Blockchain connection and signer configuration.

| Field   | Type   | Default  | Description                                                                  | Example                     |
| ------- | ------ | -------- | ---------------------------------------------------------------------------- | --------------------------- |
| network | string | `"base"` | Target blockchain network (`base`, `base-sepolia`, `bsc-mainnet`, `bsc-testnet`)                         | `"base-sepolia"`            |
| rpcUrl  | string | -        | Optional custom RPC URL. If not set, default RPC for the network is used     | `"https://rpc.example.com"` |
| signer  | object | -        | Transaction signer info (required if `subscriptionType` is `PLAN_SELF_PAID`) | -                           |

##### Signer (`app.blockchain.signer`)

| Field      | Type   | Description                                 | Example            |
| ---------- | ------ | ------------------------------------------- | ------------------ |
| privateKey | string | Private key to sign blockchain transactions | `"0xabcdef123..."` |

---

### Datasource Accounts

Supports multiple datasource accounts. At least one datasource is required. Now only support Binance and Aster.

#### Fields of each `datasource`

| Field       | Type    | Description                                    | Example                     |
| ----------- | ------- | ---------------------------------------------- | --------------------------- |
| apiKey      | string  | API key used to authenticate with Binance      | `"binance-key-123"`         |
| apiSecret   | string  | API secret corresponding to the API key        | `"binance-secret-abc"`      |
| enabled     | boolean | Whether this account is active (default: true) | `true`                      |
| description | string  | Optional description for this account          | `"My Binance spot account"` |
| kind        | array   | Supported Binance account types                | `["spot","usds-futures"]`   |


## Data Sources

Supported datasources:
* Binance
* Aster
