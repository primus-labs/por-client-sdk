import fs from "fs";
import path from "path";
import { z } from "zod";
import yaml from "js-yaml";

export type DATASOURCE = "binance" | "aster";

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
  userToken: z.string().min(1),
  projectId: z.string().min(1),
}).strict();

const AppRuntimeSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/).default("0.1.0"),
  env: z.enum(["development", "production"]).default("production"),
  logVerbose: z.number().int().min(0).max(5).default(0),
  jobInterval: z.number().int().min(10).default(1800),
}).strict();

const ZkvmServiceSchema = z.object({
  url: z.url().default("https://api-por.primuslabs.xyz:38080"),
}).strict();

const DataServiceSchema = z.object({
  url: z.url().default("https://api-por-data.primuslabs.xyz/por-admin"),
}).strict();

const AppServicesSchema = z.object({
  zkvm: z.preprocess((v) => v ?? {}, ZkvmServiceSchema),
  data: z.preprocess((v) => v ?? {}, DataServiceSchema),
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
  runtime: z.preprocess((v) => v ?? {}, AppRuntimeSchema),
  services: z.preprocess((v) => v ?? {}, AppServicesSchema),
  blockchain: z.preprocess((v) => v ?? {}, BlockchainSchema),
}).strict();

const DatasourceConfigSchema = z.object({
  binance: z.array(BinanceAccountSchema).optional(),
  aster: z.array(AsterAccountSchema).optional(),
}).strict().refine(
  (data) => (data.binance?.length ?? 0) > 0 || (data.aster?.length ?? 0) > 0,
  {
    message: "At least one datasource account of [binance,aster] must be configured",
    path: ["datasource"],
  }
);

const ConfigSchema = z.object({
  app: AppConfigSchema,
  datasource: DatasourceConfigSchema,
}).strict();

export type AppConfig = z.infer<typeof AppConfigSchema>;
export type DatasourceConfig = z.infer<typeof DatasourceConfigSchema>;
export type Config = z.infer<typeof ConfigSchema>;


function mask(value: string | undefined): string {
  if (!value) return "";
  const len = value.length;
  if (len <= 8) return "*".repeat(len);
  return value.slice(0, 4) + "*".repeat(3) + value.slice(-4);
}

const SENSITIVE_KEYS = ["userToken", "privateKey", "apiKey", "apiSecret"];
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

