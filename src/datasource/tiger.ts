// ============================================================================
// Imports
// ============================================================================
import { makeZkTlsRequestParams } from "./helper.js";
import { RequestParamsOutput } from "../types.js";
import { TigerKind, TigerAccount, DatasourceConfig } from "../config_schema.js";
import { BaseExchange } from "./base_exchange.js";
import { getMAC } from '@ctrl/mac-address';

// ============================================================================
// Common parameters shared by all API requests
// ============================================================================
interface CommonParams {
  tiger_id: string;        // Developer ID assigned by Tiger
  privateKey: string;      // RSA private key for signing
  device_id: string;       // Device identifier (here obtained via MAC address)
  charset?: 'UTF-8';       // Character encoding, default 'UTF-8'
  sign_type?: 'RSA';       // Signature algorithm, default 'RSA'
  version?: '2.0';         // API version, default '2.0'
  timestamp?: string;      // Optional; if omitted, current local time is used
}

// ============================================================================
// Business parameters for specific endpoints
// ============================================================================

// Parameters for the prime_assets endpoint (account assets)
interface PrimeAssetsBiz {
  account: string;
  base_currency: string;   // e.g., 'USD'
  consolidated: boolean;
  lang: string;            // e.g., 'zh_CN'
}

// Parameters for the positions endpoint (holdings)
interface PositionsBiz {
  account: string;
  currency: string;        // e.g., 'ALL'
  lang: string;
  market: string;          // e.g., 'ALL'
  sec_type: string;        // e.g., 'STK'
}

// Available API methods
type TigerMethod = 'prime_assets' | 'positions';

// ============================================================================
// Crypto and utility functions
// ============================================================================

//////!SECTION
import crypto from 'crypto';

/**
 * Generates the current local timestamp in the format: YYYY-MM-DD HH:mm:ss
 * @returns Formatted timestamp string
 */
function getCurrentTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

/**
 * Builds the canonical string that will be signed.
 * The order of fields must match the Tiger API specification.
 * @param method - API method name
 * @param bizContent - Business parameters as an object
 * @param common - Common parameters
 * @param timestamp - Timestamp string (already determined)
 * @returns The concatenated signing string
 */
function generateSignContent(
  method: TigerMethod,
  bizContent: Record<string, any>,
  common: CommonParams,
  timestamp: string
): string {
  const bizContentStr = JSON.stringify(bizContent); // compact JSON, no extra spaces
  const charset = common.charset || 'UTF-8';
  const device_id = common.device_id;
  const sign_type = common.sign_type || 'RSA';
  const tiger_id = common.tiger_id;
  const version = common.version || '2.0';

  // The ordering must match the Python SDK example exactly
  return `biz_content=${bizContentStr}&charset=${charset}&device_id=${device_id}&method=${method}&sign_type=${sign_type}&tiger_id=${tiger_id}&timestamp=${timestamp}&version=${version}`;
}

/**
 * Ensures the private key is in PEM format with proper headers and footers.
 * Accepts:
 *   - A complete PEM string that already contains BEGIN/END markers
 *   - A plain Base64 string (will be wrapped with RSA private key headers)
 * @param rawKey - The raw private key string
 * @returns Normalized PEM-formatted private key
 */
function normalizePrivateKey(rawKey: string): string {
  let key = rawKey.trim();
  if (key.startsWith('-----BEGIN')) {
    return key;
  }
  // Treat as plain Base64 and wrap with RSA private key PEM headers
  return `-----BEGIN RSA PRIVATE KEY-----\n${key}\n-----END RSA PRIVATE KEY-----`;
}

/**
 * Signs the content using RSA-SHA1 with PKCS#1 v1.5 padding.
 * Returns the signature as a Base64-encoded string.
 * @param privateKeyRaw - The raw private key (Base64 or PEM)
 * @param content - The content to sign
 * @returns Base64 signature
 */
function signWithRSA(privateKeyRaw: string, content: string): string {
  const privateKeyPem = normalizePrivateKey(privateKeyRaw);
  const sign = crypto.createSign('RSA-SHA1');
  sign.update(Buffer.from(content, 'utf8'));
  return sign.sign(privateKeyPem, 'base64');
}

// ============================================================================
// Request preparation
// ============================================================================

/**
 * Prepares the complete request parameters for any Tiger API method.
 * This includes generating the timestamp, signing the content, and assembling
 * all fields required by the API.
 * @param method - The API method name
 * @param bizContent - The business-specific parameters
 * @param common - The common parameters (tiger_id, privateKey, etc.)
 * @returns An object containing all request fields (method, version, biz_content,
 *          timestamp, tiger_id, charset, sign_type, device_id, sign)
 */
function prepareRequest(
  method: TigerMethod,
  bizContent: Record<string, any>,
  common: CommonParams
): Record<string, any> {
  const timestamp = common.timestamp || getCurrentTimestamp();
  const signContent = generateSignContent(method, bizContent, common, timestamp);
  const sign = signWithRSA(common.privateKey, signContent);

  return {
    method,
    version: common.version || '2.0',
    biz_content: JSON.stringify(bizContent),
    timestamp,
    tiger_id: common.tiger_id,
    charset: common.charset || 'UTF-8',
    sign_type: common.sign_type || 'RSA',
    device_id: common.device_id,
    sign,
  };
}

/**
 * Builds parameters for the prime_assets endpoint.
 * @param biz - Business parameters for assets
 * @param common - Common parameters
 * @returns Complete request parameters
 */
function makePrimeAssetsParams(biz: PrimeAssetsBiz, common: CommonParams) {
  return prepareRequest('prime_assets', biz, common);
}

/**
 * Builds parameters for the positions endpoint.
 * @param biz - Business parameters for positions
 * @param common - Common parameters
 * @returns Complete request parameters
 */
function makePositionsParams(biz: PositionsBiz, common: CommonParams) {
  return prepareRequest('positions', biz, common);
}

// ============================================================================
// Tiger Exchange Class
// ============================================================================

export class Tiger extends BaseExchange<TigerAccount, TigerKind> {
  constructor(accounts?: DatasourceConfig["tiger"]) {
    super(accounts);
  }

  /** Whether there is at least one main account configured */
  get hasMain() { return this.mainAccounts.length > 0; }

  /** Returns all accounts with kind "main" */
  get mainAccounts() { return this.getAccounts("main"); }

  // ==========================================================================
  // Public API: Get assets and positions for all main accounts
  // ==========================================================================

  /**
   * Generates the request parameters (wrapped via makeZkTlsRequestParams) for
   * fetching both assets and positions from all main Tiger accounts.
   * @param options - Optional configuration (e.g., verifyType, etc.)
   * @returns RequestParamsOutput suitable for the Zk-TLS pipeline, or undefined
   *          if no main accounts exist.
   * @throws Error if any account is missing tigerId, account number, or privateKey.
   */
  public getAssetAndPositions(options: any = {}): RequestParamsOutput {
    if (!this.hasMain) return undefined;

    const origRequests: any[] = [];
    for (const acc of this.mainAccounts) {
      // Validate required account fields
      if (!acc.tigerId || acc.tigerId == "") {
        throw new Error("Tiger tigerId is empty!")
      }
      if (!acc.account || acc.account == "") {
        throw new Error("Tiger account is empty!")
      }
      if (!acc.privateKey || acc.privateKey == "") {
        throw new Error("Tiger privateKey is empty!")
      }

      // Build common parameters for this account
      const commonConfig: CommonParams = {
        tiger_id: acc.tigerId,
        privateKey: acc.privateKey,
        device_id: getMAC(),   // MAC address as device identifier
      };

      // ---- Prime Assets request ----
      const assetsParams = makePrimeAssetsParams(
        {
          account: acc.account,
          base_currency: 'USD',
          consolidated: true,
          lang: 'zh_CN',
        },
        commonConfig
      );

      const requestPrimeAssets = {
        "url": "https://openapi.tigerfintech.com/hkg/gateway",
        "method": "POST",
        "headers": {
          "Content-Type": "application/json;charset=UTF-8",
          "Cache-Control": "no-cache",
          // "Connection": "Keep-Alive",
          "User-Agent": "openapi-python-sdk-3.7.2"
        },
        "body": assetsParams
      };

      // ---- Positions request ----
      const positionsParams = makePositionsParams(
        {
          account: acc.account,
          currency: 'ALL',
          lang: 'zh_CN',
          market: 'ALL',
          sec_type: 'STK',
        },
        commonConfig
      );

      const requestPositions = {
        "url": "https://openapi.tigerfintech.com/hkg/gateway",
        "method": "POST",
        "headers": {
          "Content-Type": "application/json;charset=UTF-8",
          "Cache-Control": "no-cache",
          // "Connection": "Keep-Alive",
          "User-Agent": "openapi-python-sdk-3.7.2"
        },
        "body": positionsParams
      };

      // Push both requests for this account
      origRequests.push(requestPrimeAssets);
      origRequests.push(requestPositions);
    }

    // Wrap all raw requests with Zk-TLS helper
    return makeZkTlsRequestParams(origRequests, options?.verifyType, options);
  }
}