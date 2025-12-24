# PoR Client SDK

## Overview

This project provides a client for **zkTLS** with **Primus Network** and **zkVM**.


## Build

Install dependencies and build the project:

```sh
npm install
npm run build
```

## Usage

1. Copy `.env.example` to `.env `and configure your environment variables. (See [Configuration](#configuration).)
2. Ensure required fields are set:
   - `TOKEN` and `PROJECT_ID` for authentication.
   - `PROGRAM_ID` for program.
3. Run the example:
   ```sh
   npx tsx example/okx.ts
   ```


## Configuration

The client relies on environment variables for authentication, program execution, Binance API access, and optional blockchain integration.

Below is a complete description of all fields defined in `.env.example`.


## 1. **User Configuration (Required)**

| Variable     | Required   | Description                                      |
| ------------ | ---------- | ------------------------------------------------ |
| `TOKEN`      | ✔ Required | Authentication token assigned by Primus Labs.    |
| `PROJECT_ID` | ✔ Required | Project identifier associated with your account. |


## 2. **Program Configuration (Required)**

| Variable     | Required   | Description                                               |
| ------------ | ---------- | --------------------------------------------------------- |
| `PROGRAM_ID` | ✔ Required | Program ID returned after uploading your zkVM executable. |


## 3. **Other Settings (Optional)**

| Variable           | Required | Description                                                  |
| ------------------ | -------- | ------------------------------------------------------------ |
| `LOG_VERBOSE`      | Optional | Logging verbosity (`0` = off; higher numbers = more detail). |


## 4. **Blockchain Configuration (Optional)**


| Variable      | Required | Description                                |
| ------------- | -------- | ------------------------------------------ |
| `RPC_URL`     | Optional | RPC endpoint for the selected chain.       |


