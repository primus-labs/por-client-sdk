import fs from "fs";
import path from "path";
import { z } from "zod";
import yaml from "js-yaml";

export type Exchanges = "binance" | "aster";

const BinanceKindSchema = z.enum(["spot", "usds-futures", "coin-futures", "unified"]);
const AsterKindSchema = z.enum(["spot", "usds-futures"]);
export type AsterKind = z.infer<typeof AsterKindSchema>;
export type BinanceKind = z.infer<typeof BinanceKindSchema>;

const BaseAccountSchema = z.object({
  apiKey: z.string().min(1),
  apiSecret: z.string().min(1),
  enabled: z.boolean().optional().default(true),
  description: z.string().optional().default(""),
});
const AccountSchema = <K extends z.ZodTypeAny>(kind: K) =>
  BaseAccountSchema.extend({
    kind: z.array(kind).min(1).refine(arr => new Set(arr).size === arr.length, { message: "kind must be unique" }),
  });

export const BinanceAccountSchema = AccountSchema(BinanceKindSchema);
export type BinanceAccount = z.infer<typeof BinanceAccountSchema>;

export const AsterAccountSchema = AccountSchema(AsterKindSchema);
export type AsterAccount = z.infer<typeof AsterAccountSchema>;

const AppIdentitySchema = z.object({
  token: z.string().min(1),
  projectId: z.string().min(1),
  programId: z.string().min(1),
}).strict();

const AppRuntimeSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  env: z.enum(["development", "production"]).default("production"),
  logVerbose: z.number().int().min(0).max(5).default(0),
  jobInterval: z.number().int().min(10).default(1800),
}).strict();

const ZkvmServiceSchema = z.object({
  url: z.url(),
}).strict();

const DataServiceSchema = z.object({
  url: z.url(),
}).strict();

const AppServicesSchema = z.object({
  zkvm: ZkvmServiceSchema,
  data: DataServiceSchema,
}).strict();

const BlockchainSignerSchema = z.object({
  privateKey: z.string(),
}).strict();

const BlockchainSchema = z.object({
  network: z.enum(["base", "base-sepolia"]).default("base"),
  rpcUrl: z.url().optional(),
  signer: BlockchainSignerSchema.optional(),
}).strict();

const AppConfigSchema = z.object({
  identity: AppIdentitySchema,
  runtime: AppRuntimeSchema,
  services: AppServicesSchema,
  blockchain: BlockchainSchema,
}).strict();

const ExchangesConfigSchema = z.object({
  binance: z.array(BinanceAccountSchema).optional(),
  aster: z.array(AsterAccountSchema).optional(),
}).strict().refine(
  (data) => (data.binance?.length ?? 0) > 0 || (data.aster?.length ?? 0) > 0,
  {
    message: "At least one exchange account of [binance,aster] must be configured",
    path: ["exchanges"],
  }
);

const ConfigSchema = z.object({
  app: AppConfigSchema,
  exchanges: ExchangesConfigSchema,
}).strict();

export type AppConfig = z.infer<typeof AppConfigSchema>;
export type ExchangesConfig = z.infer<typeof ExchangesConfigSchema>;
export type Config = z.infer<typeof ConfigSchema>;


function mask(value: string | undefined): string {
  if (!value) return "";
  const len = value.length;
  if (len <= 8) return "*".repeat(len);
  return value.slice(0, 4) + "*".repeat(3) + value.slice(-4);
}

const SENSITIVE_KEYS = ["token", "privateKey", "apiKey", "apiSecret"];
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

