import fs from "fs";
import path from "path";
import { z } from "zod";
import yaml from "js-yaml";

export type DATASOURCE = "binance" | "aster" | "grvt" | "bybit" | "okx" | "hyperliquid" | "pacifica" | "extended" | "lighter";

const BinanceKindSchema = z.enum(["spot", "usds-futures", "coin-futures", "unified", "margin", "funding"]);
export type BinanceKind = z.infer<typeof BinanceKindSchema>;
const AsterKindSchema = z.enum(["spot", "usds-futures"]);
export type AsterKind = z.infer<typeof AsterKindSchema>;
const GrvtKindSchema = z.enum(["main"]);
export type GrvtKind = z.infer<typeof GrvtKindSchema>;
const BybitKindSchema = z.enum(["main"]);
export type BybitKind = z.infer<typeof BybitKindSchema>;
const OkxKindSchema = z.enum(["main"]);
export type OkxKind = z.infer<typeof OkxKindSchema>;
const HyperliquidKindSchema = z.enum(["main"]);
export type HyperliquidKind = z.infer<typeof HyperliquidKindSchema>;
const PacificaKindSchema = z.enum(["main"]);
export type PacificaKind = z.infer<typeof PacificaKindSchema>;
const ExtendedKindSchema = z.enum(["main"]);
export type ExtendedKind = z.infer<typeof ExtendedKindSchema>;
const LighterKindSchema = z.enum(["main"]);
export type LighterKind = z.infer<typeof LighterKindSchema>;

const BaseAccountSchema = z.object({
  apiKey: z.string().optional().default(""),
  apiSecret: z.string().optional().default(""),
  enabled: z.boolean().optional().default(true),
  description: z.string().optional().default(""),
  subAccountId: z.string().optional().default(""), // grvt
  vaultId: z.string().optional().default(""), // grvt
  address: z.string().optional().default(""), // hyperliquid, pacifica, etc.
  accountIndex: z.string().optional().default(""), // lighter
  poolIndex: z.string().optional().default(""), // lighter
  passphrase: z.string().optional().default(""), // okx
});
const AccountSchema = <K extends z.ZodTypeAny>(kind: K) =>
  BaseAccountSchema.extend({
    kind: z.array(kind).min(1).refine(arr => new Set(arr).size === arr.length, { message: "kind must be unique" }),
  });

export const BinanceAccountSchema = AccountSchema(BinanceKindSchema);
export type BinanceAccount = z.infer<typeof BinanceAccountSchema>;
export const AsterAccountSchema = AccountSchema(AsterKindSchema);
export type AsterAccount = z.infer<typeof AsterAccountSchema>;
export const GrvtAccountSchema = AccountSchema(GrvtKindSchema);
export type GrvtAccount = z.infer<typeof GrvtAccountSchema>;
export const BybitAccountSchema = AccountSchema(BybitKindSchema);
export type BybitAccount = z.infer<typeof BybitAccountSchema>;
export const OkxAccountSchema = AccountSchema(OkxKindSchema);
export type OkxAccount = z.infer<typeof OkxAccountSchema>;
export const HyperliquidAccountSchema = AccountSchema(HyperliquidKindSchema);
export type HyperliquidAccount = z.infer<typeof HyperliquidAccountSchema>;
export const PacificaAccountSchema = AccountSchema(PacificaKindSchema);
export type PacificaAccount = z.infer<typeof PacificaAccountSchema>;
export const ExtendedAccountSchema = AccountSchema(ExtendedKindSchema);
export type ExtendedAccount = z.infer<typeof ExtendedAccountSchema>;
export const LighterAccountSchema = AccountSchema(LighterKindSchema);
export type LighterAccount = z.infer<typeof LighterAccountSchema>;

const AppIdentitySchema = z.object({
  userToken: z.string().min(1),
  projectId: z.string().min(1),
}).strict();

const AppRuntimeSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/).default("0.1.0"),
  env: z.enum(["development", "production"]).default("production"),
  logVerbose: z.number().int().min(0).max(5).default(0),
  jobInterval: z.number().int().min(10).default(1800),
}).strict();

const URL_PLACEHOLDER = "https://placeholder";
const ZkvmServiceSchema = z.object({
  url: z.url().default("https://api-por.primuslabs.xyz:38080"),
  getProofResultTimeout: z.number().int().min(10).default(2400),
}).strict();
export type ZkvmServiceConfig = z.infer<typeof ZkvmServiceSchema>;

const DataServiceSchema = z.object({
  url: z.url().default(URL_PLACEHOLDER),
}).strict();

const AppServicesSchema = z.object({
  zkvm: z.preprocess((v) => v ?? {}, ZkvmServiceSchema),
  data: z.preprocess((v) => v ?? {}, DataServiceSchema),
}).strict();

const BlockchainSignerSchema = z.object({
  privateKey: z.string(),
}).strict();

const BlockchainSchema = z.object({
  network: z.enum(["unknown", "base", "base-sepolia"]).default("unknown"),
  rpcUrl: z.url().optional(),
  signer: BlockchainSignerSchema.optional(),
}).strict();

const AppConfigSchema = z.object({
  identity: AppIdentitySchema,
  runtime: z.preprocess((v) => v ?? {}, AppRuntimeSchema),
  services: z.preprocess((v) => v ?? {}, AppServicesSchema),
  blockchain: z.preprocess((v) => v ?? {}, BlockchainSchema),
}).strict();

const DatasourceConfigSchema = z.object({
  binance: z.array(BinanceAccountSchema).optional(),
  aster: z.array(AsterAccountSchema).optional(),
  grvt: z.array(GrvtAccountSchema).optional(),
  bybit: z.array(BybitAccountSchema).optional(),
  okx: z.array(OkxAccountSchema).optional(),
  hyperliquid: z.array(HyperliquidAccountSchema).optional(),
  pacifica: z.array(PacificaAccountSchema).optional(),
  extended: z.array(ExtendedAccountSchema).optional(),
  lighter: z.array(LighterAccountSchema).optional(),
}).strict().refine(
  (data) => (data.binance?.length ?? 0) > 0
    || (data.aster?.length ?? 0) > 0
    || (data.grvt?.length ?? 0) > 0
    || (data.bybit?.length ?? 0) > 0
    || (data.okx?.length ?? 0) > 0
    || (data.hyperliquid?.length ?? 0) > 0
    || (data.pacifica?.length ?? 0) > 0
    || (data.extended?.length ?? 0) > 0
    || (data.lighter?.length ?? 0) > 0,
  {
    message: "At least one datasource account of [binance,aster,grvt,bybit,okx,hyperliquid,pacifica,extended,lighter] must be configured",
    path: ["datasource"],
  }
);

const DATA_URLS = {
  production: "https://api-por-data.primuslabs.xyz/por-admin",
  development: "http://api-dev.padolabs.org:38101",
} as const;
const BLOCKCHAIN_NETOWRKS = {
  production: "base",
  development: "base-sepolia",
} as const;

const ConfigSchema = z.object({
  app: AppConfigSchema,
  datasource: DatasourceConfigSchema,
}).strict().transform((cfg) => {
  const env = cfg.app.runtime.env;
  if (cfg.app.services.data.url === URL_PLACEHOLDER) {
    cfg.app.services.data.url = DATA_URLS[env];
  }
  if (cfg.app.blockchain.network === "unknown") {
    cfg.app.blockchain.network = BLOCKCHAIN_NETOWRKS[env];
  }
  return cfg;
});

export type AppConfig = z.infer<typeof AppConfigSchema>;
export type DatasourceConfig = z.infer<typeof DatasourceConfigSchema>;
export type Config = z.infer<typeof ConfigSchema>;


function mask(value: string | undefined): string {
  if (!value) return "";
  const len = value.length;
  if (len <= 8) return "*".repeat(len);
  return value.slice(0, 4) + "*".repeat(3) + value.slice(-4);
}

const SENSITIVE_KEYS = ["userToken", "privateKey", "apiKey", "apiSecret", "passphrase"];
function maskConfig(obj: any): any {
  if (Array.isArray(obj)) return obj.map(maskConfig);
  if (obj && typeof obj === "object") {
    const res: any = {};
    for (const key in obj) {
      if (SENSITIVE_KEYS.includes(key)) {
        res[key] = mask(obj[key]);
      } else {
        res[key] = maskConfig(obj[key]);
      }
    }
    return res;
  }
  return obj;
}


export function loadConfigFromFile(filePath: string = ".config.yml"): Config {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Config file not found: ${absolutePath}`);
  }

  const raw = fs.readFileSync(absolutePath, "utf-8");
  let parsed: unknown;
  try {
    parsed = yaml.load(raw);
  } catch (err) {
    throw new Error(`Failed to parse JSON config: ${(err as Error).message}`);
  }

  const config = ConfigSchema.parse(parsed);
  console.log(JSON.stringify(maskConfig(config), null, 2));
  return config;
}

