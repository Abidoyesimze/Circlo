import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function truncateAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/** Converts a stroop-denominated i128 amount (7dp) to a display string. */
export function formatTokenAmount(amount: bigint | number, decimals = 7): string {
  const value = typeof amount === "bigint" ? amount : BigInt(Math.round(amount));
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const divisor = 10n ** BigInt(decimals);
  const whole = abs / divisor;
  const fraction = abs % divisor;
  const fractionStr = fraction.toString().padStart(decimals, "0").replace(/0+$/, "");
  const sign = negative ? "-" : "";
  return fractionStr ? `${sign}${whole}.${fractionStr}` : `${sign}${whole}`;
}

/** Converts a human-entered decimal string to a stroop-denominated bigint. */
export function parseTokenAmount(input: string, decimals = 7): bigint {
  const trimmed = input.trim();
  if (!trimmed) return 0n;
  const [wholeRaw, fractionRaw = ""] = trimmed.split(".");
  const whole = wholeRaw ? BigInt(wholeRaw) : 0n;
  const fraction = fractionRaw.slice(0, decimals).padEnd(decimals, "0");
  return whole * 10n ** BigInt(decimals) + BigInt(fraction || "0");
}
