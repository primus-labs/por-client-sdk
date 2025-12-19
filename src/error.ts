/**
 * 
 */
export class ClientError extends Error {
  code: string;
  data?: any;

  constructor(code: string, message?: string, data?: any) {
    super(message ?? "");
    this.name = "ClientError";
    this.code = code;
    this.data = data;
  }
}