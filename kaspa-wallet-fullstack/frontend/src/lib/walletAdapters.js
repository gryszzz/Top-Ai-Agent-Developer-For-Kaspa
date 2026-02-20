var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
export function hasKaswareProvider() {
    var _a;
    return (typeof window !== "undefined" &&
        Boolean(window.kasware) &&
        typeof ((_a = window.kasware) === null || _a === void 0 ? void 0 : _a.requestAccounts) === "function");
}
export function getKaswareProvider() {
    if (typeof window === "undefined") {
        return undefined;
    }
    return window.kasware;
}
export function hasKastleProvider() {
    var _a, _b;
    return (typeof window !== "undefined" &&
        Boolean(window.kastle) &&
        typeof ((_a = window.kastle) === null || _a === void 0 ? void 0 : _a.connect) === "function" &&
        typeof ((_b = window.kastle) === null || _b === void 0 ? void 0 : _b.getAccount) === "function");
}
export function getKastleProvider() {
    if (typeof window === "undefined") {
        return undefined;
    }
    return window.kastle;
}
function toStringArray(value) {
    if (!Array.isArray(value)) {
        return [];
    }
    return value.filter(function (item) { return typeof item === "string"; });
}
function toNetworkLabel(value) {
    if (typeof value === "string") {
        return value;
    }
    if (value && typeof value === "object" && "network" in value) {
        var candidate = value.network;
        if (typeof candidate === "string") {
            return candidate;
        }
    }
    return undefined;
}
export function subscribeKaswareEvents(handlers) {
    var provider = getKaswareProvider();
    if (!provider || typeof provider.on !== "function") {
        return function () { };
    }
    var accountHandler = function (value) {
        var _a;
        (_a = handlers.onAccountsChanged) === null || _a === void 0 ? void 0 : _a.call(handlers, toStringArray(value));
    };
    var networkHandler = function (value) {
        var _a;
        var network = toNetworkLabel(value);
        if (network) {
            (_a = handlers.onNetworkChanged) === null || _a === void 0 ? void 0 : _a.call(handlers, network);
        }
    };
    provider.on("accountsChanged", accountHandler);
    provider.on("networkChanged", networkHandler);
    return function () {
        if (typeof provider.removeListener === "function") {
            provider.removeListener("accountsChanged", accountHandler);
            provider.removeListener("networkChanged", networkHandler);
        }
    };
}
export function waitForKaswareProvider() {
    return __awaiter(this, arguments, void 0, function (timeoutMs, pollIntervalMs) {
        var startedAt;
        if (timeoutMs === void 0) { timeoutMs = 2500; }
        if (pollIntervalMs === void 0) { pollIntervalMs = 125; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (hasKaswareProvider()) {
                        return [2 /*return*/, true];
                    }
                    if (typeof window === "undefined") {
                        return [2 /*return*/, false];
                    }
                    startedAt = Date.now();
                    _a.label = 1;
                case 1:
                    if (!(Date.now() - startedAt < timeoutMs)) return [3 /*break*/, 3];
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, pollIntervalMs); })];
                case 2:
                    _a.sent();
                    if (hasKaswareProvider()) {
                        return [2 /*return*/, true];
                    }
                    return [3 /*break*/, 1];
                case 3: return [2 /*return*/, false];
            }
        });
    });
}
export function waitForKastleProvider() {
    return __awaiter(this, arguments, void 0, function (timeoutMs, pollIntervalMs) {
        var startedAt;
        if (timeoutMs === void 0) { timeoutMs = 2500; }
        if (pollIntervalMs === void 0) { pollIntervalMs = 125; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (hasKastleProvider()) {
                        return [2 /*return*/, true];
                    }
                    if (typeof window === "undefined") {
                        return [2 /*return*/, false];
                    }
                    startedAt = Date.now();
                    _a.label = 1;
                case 1:
                    if (!(Date.now() - startedAt < timeoutMs)) return [3 /*break*/, 3];
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, pollIntervalMs); })];
                case 2:
                    _a.sent();
                    if (hasKastleProvider()) {
                        return [2 /*return*/, true];
                    }
                    return [3 /*break*/, 1];
                case 3: return [2 /*return*/, false];
            }
        });
    });
}
function normalizeNetworkLabel(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/-/g, "_");
}
export function resolveWalletNetworkFamily(value) {
    var normalized = normalizeNetworkLabel(value);
    if (!normalized) {
        return "unknown";
    }
    if (normalized === "mainnet" ||
        normalized === "livenet" ||
        normalized === "kaspa_mainnet" ||
        normalized === "kaspa") {
        return "mainnet";
    }
    if (normalized.includes("testnet") ||
        normalized === "kaspa_testnet" ||
        normalized === "test") {
        return "testnet";
    }
    if (normalized.includes("devnet") || normalized === "kaspa_devnet" || normalized === "dev") {
        return "devnet";
    }
    if (normalized.includes("simnet") || normalized === "kaspa_simnet" || normalized === "sim") {
        return "simnet";
    }
    return "unknown";
}
export function areNetworksCompatible(walletNetwork, appNetwork) {
    var walletFamily = resolveWalletNetworkFamily(walletNetwork);
    var appFamily = resolveWalletNetworkFamily(appNetwork);
    if (walletFamily === "unknown" || appFamily === "unknown") {
        return true;
    }
    return walletFamily === appFamily;
}
function extractSignature(value) {
    if (typeof value === "string") {
        return value;
    }
    if (value.signature) {
        return value.signature;
    }
    throw new Error("Wallet returned an unsupported signature response");
}
export function connectKasware() {
    return __awaiter(this, arguments, void 0, function (options) {
        var provider, requestPermission, selectedAccounts, accounts, accounts, accounts, accounts, preferredAddress, preferredMatch, address, publicKey, _a, network, _b;
        var _c, _d;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    provider = getKaswareProvider();
                    if (!provider) {
                        throw new Error("Kasware extension not found");
                    }
                    requestPermission = (_c = options.requestPermission) !== null && _c !== void 0 ? _c : true;
                    selectedAccounts = [];
                    if (!requestPermission) return [3 /*break*/, 2];
                    return [4 /*yield*/, provider.requestAccounts()];
                case 1:
                    accounts = _e.sent();
                    selectedAccounts = accounts || [];
                    return [3 /*break*/, 4];
                case 2:
                    if (!provider.getAccounts) return [3 /*break*/, 4];
                    return [4 /*yield*/, provider.getAccounts()];
                case 3:
                    accounts = _e.sent();
                    selectedAccounts = accounts || [];
                    _e.label = 4;
                case 4:
                    if (!(selectedAccounts.length === 0 && provider.getAccounts)) return [3 /*break*/, 6];
                    return [4 /*yield*/, provider.getAccounts()];
                case 5:
                    accounts = _e.sent();
                    selectedAccounts = accounts || [];
                    _e.label = 6;
                case 6:
                    if (selectedAccounts.length === 0 && !requestPermission) {
                        throw new Error("Kasware account is unavailable. Reconnect from the Connect Kasware button.");
                    }
                    if (!(selectedAccounts.length === 0)) return [3 /*break*/, 8];
                    return [4 /*yield*/, provider.requestAccounts()];
                case 7:
                    accounts = _e.sent();
                    selectedAccounts = accounts || [];
                    _e.label = 8;
                case 8:
                    preferredAddress = (_d = options.preferredAddress) === null || _d === void 0 ? void 0 : _d.trim().toLowerCase();
                    preferredMatch = preferredAddress
                        ? selectedAccounts.find(function (candidate) { return candidate.trim().toLowerCase() === preferredAddress; })
                        : undefined;
                    address = preferredMatch || selectedAccounts[0];
                    if (!address) {
                        throw new Error("Kasware did not return an address");
                    }
                    if (!provider.getPublicKey) return [3 /*break*/, 10];
                    return [4 /*yield*/, provider.getPublicKey()];
                case 9:
                    _a = _e.sent();
                    return [3 /*break*/, 11];
                case 10:
                    _a = undefined;
                    _e.label = 11;
                case 11:
                    publicKey = _a;
                    if (!provider.getNetwork) return [3 /*break*/, 13];
                    return [4 /*yield*/, provider.getNetwork()];
                case 12:
                    _b = _e.sent();
                    return [3 /*break*/, 14];
                case 13:
                    _b = undefined;
                    _e.label = 14;
                case 14:
                    network = _b;
                    return [2 /*return*/, { address: address, publicKey: publicKey, network: network }];
            }
        });
    });
}
export function connectKastle() {
    return __awaiter(this, void 0, void 0, function () {
        var provider, connected, account, address, network, value;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    provider = getKastleProvider();
                    if (!provider) {
                        throw new Error("Kastle extension not found");
                    }
                    return [4 /*yield*/, provider.connect()];
                case 1:
                    connected = _b.sent();
                    if (!connected) {
                        throw new Error("Kastle connection was rejected");
                    }
                    return [4 /*yield*/, provider.getAccount()];
                case 2:
                    account = _b.sent();
                    address = (_a = account === null || account === void 0 ? void 0 : account.address) === null || _a === void 0 ? void 0 : _a.trim();
                    if (!address) {
                        throw new Error("Kastle did not return an address");
                    }
                    if (!(typeof provider.request === "function")) return [3 /*break*/, 4];
                    return [4 /*yield*/, provider.request("kas:get_network")];
                case 3:
                    value = _b.sent();
                    if (typeof value === "string") {
                        network = value;
                    }
                    _b.label = 4;
                case 4: return [2 /*return*/, {
                        address: address,
                        publicKey: account.publicKey,
                        network: network
                    }];
            }
        });
    });
}
export function signKaswareMessage(message) {
    return __awaiter(this, void 0, void 0, function () {
        var provider, signed, signed;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    provider = getKaswareProvider();
                    if (!provider) {
                        throw new Error("Kasware extension not found");
                    }
                    if (!provider.signMessage) return [3 /*break*/, 2];
                    return [4 /*yield*/, provider.signMessage(message, { type: "ecdsa" })];
                case 1:
                    signed = _a.sent();
                    return [2 /*return*/, extractSignature(signed)];
                case 2:
                    if (!provider.signData) return [3 /*break*/, 4];
                    return [4 /*yield*/, provider.signData(message)];
                case 3:
                    signed = _a.sent();
                    return [2 /*return*/, extractSignature(signed)];
                case 4: throw new Error("Kasware provider has no signMessage/signData method");
            }
        });
    });
}
export function signKastleMessage(message) {
    return __awaiter(this, void 0, void 0, function () {
        var provider, signature;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    provider = getKastleProvider();
                    if (!provider) {
                        throw new Error("Kastle extension not found");
                    }
                    return [4 /*yield*/, provider.signMessage(message)];
                case 1:
                    signature = _a.sent();
                    if (!signature || typeof signature !== "string") {
                        throw new Error("Kastle returned an invalid signature response");
                    }
                    return [2 /*return*/, signature];
            }
        });
    });
}
export function buildKaspaUri(address, amountKas, note) {
    var uri = new URL(address);
    if (amountKas) {
        uri.searchParams.set("amount", amountKas);
    }
    if (note) {
        uri.searchParams.set("message", note);
    }
    return uri.toString();
}
