declare module "qrcode" {
  // Minimal typings just for our usage in pdf.tsx
  export function toDataURL(
    text: string,
    options?: {
      margin?: number;
      width?: number;
      errorCorrectionLevel?: "L" | "M" | "Q" | "H";
    }
  ): Promise<string>;
}
