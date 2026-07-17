import type { CircleStatus } from "circlo-client";

export function statusLabel(status: CircleStatus): string {
  switch (status.tag) {
    case "Created":
      return "Forming";
    case "Active":
      return "Active";
    case "Completed":
      return "Completed";
  }
}

export function statusVariant(
  status: CircleStatus,
): "secondary" | "success" | "outline" {
  switch (status.tag) {
    case "Created":
      return "secondary";
    case "Active":
      return "success";
    case "Completed":
      return "outline";
  }
}

/** Formats a duration in seconds as the largest sensible unit. */
export function formatDuration(seconds: bigint | number): string {
  const s = Number(seconds);
  if (s % 86400 === 0 && s >= 86400) return `${s / 86400} day${s === 86400 ? "" : "s"}`;
  if (s % 3600 === 0 && s >= 3600) return `${s / 3600} hour${s === 3600 ? "" : "s"}`;
  if (s % 60 === 0 && s >= 60) return `${s / 60} minute${s === 60 ? "" : "s"}`;
  return `${s} second${s === 1 ? "" : "s"}`;
}

/** Formats a Unix-seconds deadline as a short relative countdown/overdue string. */
export function formatCountdown(deadlineSeconds: bigint | number): string {
  const deadlineMs = Number(deadlineSeconds) * 1000;
  const diffMs = deadlineMs - Date.now();
  const diffMin = Math.round(diffMs / 60_000);

  if (diffMs <= 0) {
    const overdueMin = Math.abs(diffMin);
    if (overdueMin < 60) return "Ready to settle";
    const hours = Math.floor(overdueMin / 60);
    if (hours < 24) return `Overdue ${hours}h`;
    return `Overdue ${Math.floor(hours / 24)}d`;
  }

  if (diffMin < 60) return `${diffMin}m left`;
  const hours = Math.floor(diffMin / 60);
  if (hours < 24) return `${hours}h left`;
  return `${Math.floor(hours / 24)}d left`;
}
