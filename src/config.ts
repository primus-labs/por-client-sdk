import "dotenv/config";

export interface SdkConfig {
  token?: string;
  projectId?: string;
  programId?: string;

  logVerbose?: number;

  zkvmServiceUrl?: string;
  dataServiceUrl?: string;

  rpcUrl?: string;
  privateKey?: string;

  zktlsMode?: "POR" | string;
}

export function getDefaultConfig(): Required<SdkConfig> {
  return {
    token: "",
    projectId: "",
    programId: "",

    logVerbose: 0,

    zkvmServiceUrl: "https://api-por.primuslabs.xyz:38080",
    dataServiceUrl: "http://api-dev.padolabs.org:38101",

    rpcUrl: "https://mainnet.base.org",
    privateKey: "",

    zktlsMode: "POR",
  };
}

export function loadConfigFromEnv(): SdkConfig {
  const envConfig: SdkConfig = {
    token: process.env.TOKEN?.trim(),
    projectId: process.env.PROJECT_ID?.trim(),
    programId: process.env.PROGRAM_ID?.trim(),

    logVerbose: process.env.LOG_VERBOSE !== undefined ? Number(process.env.LOG_VERBOSE) : undefined,

    zkvmServiceUrl: process.env.ZKVM_SERVICE_URL?.trim(),
    dataServiceUrl: process.env.DATA_SERVICE_URL?.trim(),

    rpcUrl: process.env.RPC_URL?.trim(),
    privateKey: process.env.PRIVATE_KEY?.trim(),

    zktlsMode: process.env.ZKTLS_MODE?.trim(),
  };

  // filter undefined field
  return Object.fromEntries(Object.entries(envConfig).filter(([_, value]) => value !== undefined)) as Partial<SdkConfig>;
}


export function resolveSdkConfig(
  userConfig: SdkConfig = {}
): Required<SdkConfig> {
  const config: Required<SdkConfig> = {
    ...getDefaultConfig(),
    ...userConfig,
    ...loadConfigFromEnv(),
  };

  // validate
  if (config.zktlsMode === "POR") {
    if (!config.token || !config.projectId || !config.programId) {
      throw new Error("TOKEN, PROJECT_ID, PROGRAM_ID are required in POR mode");
    }
  }

  return config;
}

export function printConfig(config: SdkConfig, tag: string) {
  const maskedConfig = {
    ...config,
    token: config.token ? `${config.token.slice(0, 6)}***` : undefined,
    privateKey: config.privateKey ? `${config.privateKey.slice(0, 6)}***` : undefined,
  };
  const filterConfig = Object.fromEntries(Object.entries(maskedConfig).filter(([_, value]) => value !== undefined)) as Partial<SdkConfig>;
  console.log(tag, "config", filterConfig);
}

