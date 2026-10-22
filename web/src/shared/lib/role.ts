export const ADMIN = "admin" as const;
export const CLIENT = "client" as const;
export const USER = "user" as const;

export type CabinetMode = typeof ADMIN | typeof CLIENT;
