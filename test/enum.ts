export const LogLevel = {
  INFO: "info",
  WARN: "warn",
  ERROR: "error",
  SUCCESS: "success"
} as const

export type LogLevel = typeof LogLevel[keyof typeof LogLevel]
