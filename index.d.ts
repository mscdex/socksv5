
declare module "@outtacontrol/socks/lib/Agents" {
    import { EventEmitter } from "events";
    import { Client, createConnection } from "@outtacontrol/socks/lib/client";

    export interface SocksAgentOptions {
        /**
         * Keep sockets around in a pool to be used by other requests in the future. Default = false
         */
        keepAlive?: boolean;
        /**
         * When using HTTP KeepAlive, how often to send TCP KeepAlive packets over sockets being kept alive. Default = 1000.
         * Only relevant if keepAlive is set to true.
         */
        keepAliveMsecs?: number;
        /**
         * Maximum number of sockets to allow per host. Default for Node 0.10 is 5, default for Node 0.12 is Infinity
         */
        maxSockets?: number;
        /**
         * Maximum number of sockets to leave open in a free state. Only relevant if keepAlive is set to true. Default = 256.
         */
        maxFreeSockets?: number;
    }

    export interface SocksAgentNameOptions {
        host?: string;
        port?: number | string;
        localAddress?: string;
    }

    export interface SocksHttpsAgentNameOptions extends SocksAgentNameOptions {
        ca?: string;
        cert?: string;
        ciphers?: string;
        key?: string;
        pfx?: string;
        rejectUnauthorized?: string | undefined;
    }

    export interface SocksNamedSocketList {
        [key: string]: Client[];
    }

    export class Agent extends EventEmitter {
        defaultPort: number;
        protocol: string;

        keepAliveMsecs: number;
        keepAlive: boolean;
        maxSockets: number;
        maxFreeSockets: number;
        sockets: SocksNamedSocketList;
        freeSockets: SocksNamedSocketList;
        requests: any;

        constructor(options?: SocksAgentOptions);

        createConnection(port: number, host?: string, listener?: () => void): Client;
        createConnection(path: string, listener?: () => void): Client;

        getName(options?: SocksAgentNameOptions): string;

        addRequest(req, options?: SocksAgentNameOptions): void;
        createSocket(req, options): Client;
        removeSocket(socket, options): void;

        destroy(): void;
    }

    export class HttpsAgent extends Agent { }
}

declare module "@outtacontrol/socks/lib/auth" {
    import { Socket } from "net";

    export interface AuthCallback {
        (done: boolean): void;
        (error: Error): void;
    }

    export interface Auth {
        client(stream: Socket, callback: AuthCallback): void;
        server(stream: Socket, callback: AuthCallback): void;
    }
}

declare module "@outtacontrol/socks/lib/auth/None" {
    import { Auth } from "@outtacontrol/socks/lib/auth";
    export default function None(): Auth;
}

declare module "@outtacontrol/socks/lib/auth/UserPassword" {
    import { Auth } from "@outtacontrol/socks/lib/auth";

    export interface DoneCallback {
        (success: boolean): void;
    }

    export interface AuthCallback {
        (username: string, password: string, callback: DoneCallback): void;
    }

    export default function UserPassword(username: string, password: string): Auth;
    export default function UserPassword(authCallback: AuthCallback): Auth;
}

declare module "@outtacontrol/socks/lib/client" {
    import { EventEmitter } from "events";

    export interface SocksClientOptions {
        host?: string;
        port?: number;
        localAddress?: string;
        proxyHost?: string;
        proxyPort?: number;
        localDNS?: string;
        strictLocalDNS?: string;
        auths?: any[];
    }

    export class Client extends EventEmitter {
        constructor(options?: SocksClientOptions);

        useAuth(auth: any): this;

        connect(options: SocksClientOptions, listener?: () => void): this;
        connect(port: number, host?: string, listener?: () => void): this;
        connect(path: string, listener?: () => void): this;

        addListener(event: string, listener: (...args: any[]) => void): this;
        addListener(event: "close", listener: (had_error: boolean) => void): this;
        addListener(event: "connect", listener: () => void): this;
        addListener(event: "data", listener: (data: Buffer) => void): this;
        addListener(event: "drain", listener: () => void): this;
        addListener(event: "end", listener: () => void): this;
        addListener(event: "error", listener: (err: Error) => void): this;
        addListener(event: "lookup", listener: (err: Error, address: string, family: string | number, host: string) => void): this;
        addListener(event: "timeout", listener: () => void): this;

        emit(event: string | symbol, ...args: any[]): boolean;
        emit(event: "close", had_error: boolean): boolean;
        emit(event: "connect"): boolean;
        emit(event: "data", data: Buffer): boolean;
        emit(event: "drain"): boolean;
        emit(event: "end"): boolean;
        emit(event: "error", err: Error): boolean;
        emit(event: "lookup", err: Error, address: string, family: string | number, host: string): boolean;
        emit(event: "timeout"): boolean;

        on(event: string, listener: (...args: any[]) => void): this;
        on(event: "close", listener: (had_error: boolean) => void): this;
        on(event: "connect", listener: () => void): this;
        on(event: "data", listener: (data: Buffer) => void): this;
        on(event: "drain", listener: () => void): this;
        on(event: "end", listener: () => void): this;
        on(event: "error", listener: (err: Error) => void): this;
        on(event: "lookup", listener: (err: Error, address: string, family: string | number, host: string) => void): this;
        on(event: "timeout", listener: () => void): this;

        once(event: string, listener: (...args: any[]) => void): this;
        once(event: "close", listener: (had_error: boolean) => void): this;
        once(event: "connect", listener: () => void): this;
        once(event: "data", listener: (data: Buffer) => void): this;
        once(event: "drain", listener: () => void): this;
        once(event: "end", listener: () => void): this;
        once(event: "error", listener: (err: Error) => void): this;
        once(event: "lookup", listener: (err: Error, address: string, family: string | number, host: string) => void): this;
        once(event: "timeout", listener: () => void): this;

        prependListener(event: string, listener: (...args: any[]) => void): this;
        prependListener(event: "close", listener: (had_error: boolean) => void): this;
        prependListener(event: "connect", listener: () => void): this;
        prependListener(event: "data", listener: (data: Buffer) => void): this;
        prependListener(event: "drain", listener: () => void): this;
        prependListener(event: "end", listener: () => void): this;
        prependListener(event: "error", listener: (err: Error) => void): this;
        prependListener(event: "lookup", listener: (err: Error, address: string, family: string | number, host: string) => void): this;
        prependListener(event: "timeout", listener: () => void): this;

        prependOnceListener(event: string, listener: (...args: any[]) => void): this;
        prependOnceListener(event: "close", listener: (had_error: boolean) => void): this;
        prependOnceListener(event: "connect", listener: () => void): this;
        prependOnceListener(event: "data", listener: (data: Buffer) => void): this;
        prependOnceListener(event: "drain", listener: () => void): this;
        prependOnceListener(event: "end", listener: () => void): this;
        prependOnceListener(event: "error", listener: (err: Error) => void): this;
        prependOnceListener(event: "lookup", listener: (err: Error, address: string, family: string | number, host: string) => void): this;
        prependOnceListener(event: "timeout", listener: () => void): this;
    }

    export function connect(port: number, host?: string, listener?: () => void): Client;
    export function connect(path: string, listener?: () => void): Client;
    export function createConnection(port: number, host?: string, listener?: () => void): Client;
    export function createConnection(path: string, listener?: () => void): Client;
}

declare module "@outtacontrol/socks/lib/client.parser" {
    import { Socket } from "net";
    import { EventEmitter } from "events";
    import { SocksBoundAddress, SocksProxyInfo } from "@outtacontrol/socks";

    export default class Parser extends EventEmitter {
        constructor(stream: Socket);
        start(): void;
        stop(): void;

        addListener(event: string, listener: (...args: any[]) => void): this;
        addListener(event: "method", listener: (method: number) => void);
        addListener(event: "reply", listener: (info: SocksBoundAddress) => void);
        addListener(event: "error", listener: (err: Error) => void);

        emit(event: string | symbol, ...args: any[]): boolean;
        emit(event: "method", method: number): boolean;
        emit(event: "request", info: SocksProxyInfo): boolean;
        emit(event: "error", err: Error): boolean;

        on(event: string, listener: (...args: any[]) => void): this;
        on(event: "method", listener: (method: number) => void);
        on(event: "reply", listener: (info: SocksBoundAddress) => void);
        on(event: "error", listener: (err: Error) => void);

        once(event: string, listener: (...args: any[]) => void): this;
        once(event: "method", listener: (method: number) => void);
        once(event: "reply", listener: (info: SocksBoundAddress) => void);
        once(event: "error", listener: (err: Error) => void);

        prependListener(event: string, listener: (...args: any[]) => void): this;
        prependListener(event: "method", listener: (method: number) => void);
        prependListener(event: "reply", listener: (info: SocksBoundAddress) => void);
        prependListener(event: "error", listener: (err: Error) => void);

        prependOnceListener(event: string, listener: (...args: any[]) => void): this;
        prependOnceListener(event: "method", listener: (method: number) => void);
        prependOnceListener(event: "reply", listener: (info: SocksBoundAddress) => void);
        prependOnceListener(event: "error", listener: (err: Error) => void);
    }
}

declare module "@outtacontrol/socks/lib/constants" {

    interface SocksCMD {
        CONNECT: number;
        BIND: number;
        UDP: number;
    }

    interface SocksATYP {
        IPv4: number;
        NAME: number;
        IPv6: number;
    }

    interface SocksREP {
        SUCCESS: number;
        GENFAIL: number;
        DISALLOW: number;
        NETUNREACH: number;
        HOSTUNREACH: number;
        CONNREFUSED: number;
        TTLEXPIRED: number;
        CMDUNSUPP: number;
        ATYPUNSUPP: number;
    }

    export const CMD: SocksCMD;
    export const ATYP: SocksATYP;
    export const REP: SocksREP;
}

declare module "@outtacontrol/socks/lib/server" {
    import { EventEmitter } from "events";
    import { Auth } from "@outtacontrol/socks/lib/auth";
    import { Socket, AddressInfo } from "net";
    import { SocksProxyInfo } from "@outtacontrol/socks";

    export interface SocksAcceptCallback {
        (intercept?: false): void;
        (intercept: true): Socket;
    }

    export interface SocksDenyCallback {
        (): void;
    }

    export interface SocksConnectionCallback {
        (info: SocksProxyInfo, accept: SocksAcceptCallback, deny: SocksDenyCallback);
    }

    export interface SocksServerOptions {
        allowHalfOpen?: boolean;
        pauseOnConnect?: boolean;
        auths?: Auth[];
        debug?: boolean;
    }

    export class Server extends EventEmitter {
        constructor(connectionCallback: SocksConnectionCallback);
        constructor(options?: SocksServerOptions, connectionCallback?: SocksConnectionCallback);

        useAuth(auth: Auth): this;

        address(): AddressInfo | string;
        close(callback?: Function): this;
        getConnections(cb: (error: Error | null, count: number) => void): void;

        listen(port: number, host?: string, listeningCallback?: () => void): this;
        listen(path: string, listeningCallback?: () => void): this;

        ref(): this;
        unref(): this;

        addListener(event: string, listener: (...args: any[]) => void): this;
        addListener(event: "close", listener: () => void): this;
        addListener(event: "connection", listener: (socket: Socket) => void): this;
        addListener(event: "error", listener: (err: Error) => void): this;
        addListener(event: "listening", listener: () => void): this;

        emit(event: string | symbol, ...args: any[]): boolean;
        emit(event: "close"): boolean;
        emit(event: "connection", socket: Socket): boolean;
        emit(event: "error", err: Error): boolean;
        emit(event: "listening"): boolean;

        on(event: string, listener: (...args: any[]) => void): this;
        on(event: "close", listener: () => void): this;
        on(event: "connection", listener: (socket: Socket) => void): this;
        on(event: "error", listener: (err: Error) => void): this;
        on(event: "listening", listener: () => void): this;

        once(event: string, listener: (...args: any[]) => void): this;
        once(event: "close", listener: () => void): this;
        once(event: "connection", listener: (socket: Socket) => void): this;
        once(event: "error", listener: (err: Error) => void): this;
        once(event: "listening", listener: () => void): this;

        prependListener(event: string, listener: (...args: any[]) => void): this;
        prependListener(event: "close", listener: () => void): this;
        prependListener(event: "connection", listener: (socket: Socket) => void): this;
        prependListener(event: "error", listener: (err: Error) => void): this;
        prependListener(event: "listening", listener: () => void): this;

        prependOnceListener(event: string, listener: (...args: any[]) => void): this;
        prependOnceListener(event: "close", listener: () => void): this;
        prependOnceListener(event: "connection", listener: (socket: Socket) => void): this;
        prependOnceListener(event: "error", listener: (err: Error) => void): this;
        prependOnceListener(event: "listening", listener: () => void): this;
    }

    export function createServer(): Server;
    export function createServer(connectionListener: SocksConnectionCallback): Server;
    export function createServer(options: SocksServerOptions, connectionListener: SocksConnectionCallback): Server;
}

declare module "@outtacontrol/socks/lib/server.parser" {
    import { Socket } from "net";
    import { SocksProxyInfo, SocksBoundAddress } from "@outtacontrol/socks";
    export default class Parser {
        constructor(stream: Socket);
        start(): void;
        stop(): void;

        addListener(event: string, listener: (...args: any[]) => void): this;
        addListener(event: "methods", listener: (methods: Buffer) => void);
        addListener(event: "request", listener: (info: SocksProxyInfo) => void);
        addListener(event: "error", listener: (err: Error) => void);

        emit(event: string | symbol, ...args: any[]): boolean;
        emit(event: "methods", methods: Buffer): boolean;
        emit(event: "request", info: SocksProxyInfo): boolean;
        emit(event: "error", err: Error): boolean;

        on(event: string, listener: (...args: any[]) => void): this;
        on(event: "methods", listener: (methods: Buffer) => void);
        on(event: "request", listener: (info: SocksProxyInfo) => void);
        on(event: "error", listener: (err: Error) => void);

        once(event: string, listener: (...args: any[]) => void): this;
        once(event: "methods", listener: (methods: Buffer) => void);
        once(event: "request", listener: (info: SocksProxyInfo) => void);
        once(event: "error", listener: (err: Error) => void);

        prependListener(event: string, listener: (...args: any[]) => void): this;
        prependListener(event: "methods", listener: (methods: Buffer) => void);
        prependListener(event: "request", listener: (info: SocksProxyInfo) => void);
        prependListener(event: "error", listener: (err: Error) => void);

        prependOnceListener(event: string, listener: (...args: any[]) => void): this;
        prependOnceListener(event: "methods", listener: (methods: Buffer) => void);
        prependOnceListener(event: "request", listener: (info: SocksProxyInfo) => void);
        prependOnceListener(event: "error", listener: (err: Error) => void);
    }
}

declare module "@outtacontrol/socks" {
    import None from "@outtacontrol/socks/lib/auth/None";
    import UserPassword from "@outtacontrol/socks/lib/auth/UserPassword";

    export interface SocksBoundAddress {
        bndAddr: string;
        bndPort: number;
    }

    export interface SocksProxyInfo {
        cmd: string;
        srcAddr?: string | undefined;
        srcPort?: number | undefined;
        dstAddr: string;
        dstPort: number;
    }

    export * from "@outtacontrol/socks/lib/Agents";
    export * from "@outtacontrol/socks/lib/client";
    export * from "@outtacontrol/socks/lib/server";

    export const auth: { None, UserPassword };
}