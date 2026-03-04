import { LogEvent, LogPandaOptions, LogPandaResponse } from "./types";
export declare class LogPanda {
    private readonly http;
    constructor(options: LogPandaOptions);
    log(event: LogEvent): Promise<LogPandaResponse>;
    info(event: string, payload?: Omit<LogEvent, "event" | "type">): Promise<LogPandaResponse>;
    warn(event: string, payload?: Omit<LogEvent, "event" | "type">): Promise<LogPandaResponse>;
    error(event: string, payload?: Omit<LogEvent, "event" | "type">): Promise<LogPandaResponse>;
    debug(event: string, payload?: Omit<LogEvent, "event" | "type">): Promise<LogPandaResponse>;
    security(event: string, payload?: Omit<LogEvent, "event" | "type">): Promise<LogPandaResponse>;
}
