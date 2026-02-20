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
import { describe, expect, it } from "vitest";
import { areNetworksCompatible, buildKaspaUri, connectKastle, connectKasware, signKastleMessage, resolveWalletNetworkFamily } from "../src/lib/walletAdapters";
describe("buildKaspaUri", function () {
    it("builds a URI with amount and note", function () {
        var result = buildKaspaUri("kaspatest:qpv7fcvdlz6th4hqjtm9qkkms2dw0raem963x3hm8glu3kjgj7922vy69hv85", "1.25", "hello");
        expect(result).toContain("kaspatest:");
        expect(result).toContain("amount=1.25");
        expect(result).toContain("message=hello");
    });
});
describe("resolveWalletNetworkFamily", function () {
    it("maps Kasware labels to a comparable family", function () {
        expect(resolveWalletNetworkFamily("kaspa_mainnet")).toBe("mainnet");
        expect(resolveWalletNetworkFamily("kaspa_testnet")).toBe("testnet");
        expect(resolveWalletNetworkFamily("testnet-10")).toBe("testnet");
        expect(resolveWalletNetworkFamily("kaspa_devnet")).toBe("devnet");
        expect(resolveWalletNetworkFamily("unknown-network")).toBe("unknown");
    });
});
describe("areNetworksCompatible", function () {
    it("accepts matching network families and rejects mismatches", function () {
        expect(areNetworksCompatible("kaspa_testnet", "testnet-10")).toBe(true);
        expect(areNetworksCompatible("kaspa_mainnet", "testnet-10")).toBe(false);
        expect(areNetworksCompatible(undefined, "testnet-10")).toBe(true);
    });
});
describe("connectKasware", function () {
    it("uses passive account read when requestPermission=false", function () { return __awaiter(void 0, void 0, void 0, function () {
        var originalWindow, requestCalls, getAccountsCalls, provider, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    originalWindow = globalThis.window;
                    requestCalls = 0;
                    getAccountsCalls = 0;
                    provider = {
                        requestAccounts: function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                requestCalls += 1;
                                return [2 /*return*/, ["kaspatest:requestaccount"]];
                            });
                        }); },
                        getAccounts: function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                getAccountsCalls += 1;
                                return [2 /*return*/, ["kaspatest:passiveaccount"]];
                            });
                        }); },
                        getPublicKey: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, "abcd"];
                        }); }); },
                        getNetwork: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, "kaspa_testnet"];
                        }); }); }
                    };
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, , 3, 4]);
                    globalThis.window = { kasware: provider };
                    return [4 /*yield*/, connectKasware({ requestPermission: false })];
                case 2:
                    result = _a.sent();
                    expect(result.address).toBe("kaspatest:passiveaccount");
                    expect(requestCalls).toBe(0);
                    expect(getAccountsCalls).toBeGreaterThan(0);
                    return [3 /*break*/, 4];
                case 3:
                    globalThis.window = originalWindow;
                    return [7 /*endfinally*/];
                case 4: return [2 /*return*/];
            }
        });
    }); });
    it("prefers the requested account when available", function () { return __awaiter(void 0, void 0, void 0, function () {
        var originalWindow, provider, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    originalWindow = globalThis.window;
                    provider = {
                        requestAccounts: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, ["kaspatest:first", "kaspatest:second"]];
                        }); }); },
                        getAccounts: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, ["kaspatest:first", "kaspatest:second"]];
                        }); }); },
                        getPublicKey: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, "abcd"];
                        }); }); },
                        getNetwork: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, "kaspa_testnet"];
                        }); }); }
                    };
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, , 3, 4]);
                    globalThis.window = { kasware: provider };
                    return [4 /*yield*/, connectKasware({
                            requestPermission: false,
                            preferredAddress: "kaspatest:second"
                        })];
                case 2:
                    result = _a.sent();
                    expect(result.address).toBe("kaspatest:second");
                    return [3 /*break*/, 4];
                case 3:
                    globalThis.window = originalWindow;
                    return [7 /*endfinally*/];
                case 4: return [2 /*return*/];
            }
        });
    }); });
});
describe("connectKastle", function () {
    it("connects and resolves address/public key/network", function () { return __awaiter(void 0, void 0, void 0, function () {
        var originalWindow, provider, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    originalWindow = globalThis.window;
                    provider = {
                        connect: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, true];
                        }); }); },
                        getAccount: function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                return [2 /*return*/, ({
                                        address: "kaspatest:kastleaccount",
                                        publicKey: "abcd"
                                    })];
                            });
                        }); },
                        request: function (method) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, (method === "kas:get_network" ? "kaspa_testnet" : null)];
                        }); }); },
                        signMessage: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, "signature"];
                        }); }); }
                    };
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, , 3, 4]);
                    globalThis.window = { kastle: provider };
                    return [4 /*yield*/, connectKastle()];
                case 2:
                    result = _a.sent();
                    expect(result.address).toBe("kaspatest:kastleaccount");
                    expect(result.publicKey).toBe("abcd");
                    expect(result.network).toBe("kaspa_testnet");
                    return [3 /*break*/, 4];
                case 3:
                    globalThis.window = originalWindow;
                    return [7 /*endfinally*/];
                case 4: return [2 /*return*/];
            }
        });
    }); });
});
describe("signKastleMessage", function () {
    it("returns string signature from provider", function () { return __awaiter(void 0, void 0, void 0, function () {
        var originalWindow, provider, signature;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    originalWindow = globalThis.window;
                    provider = {
                        connect: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, true];
                        }); }); },
                        getAccount: function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                return [2 /*return*/, ({
                                        address: "kaspatest:kastleaccount"
                                    })];
                            });
                        }); },
                        signMessage: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, "signed-message"];
                        }); }); },
                        request: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, "kaspa_testnet"];
                        }); }); }
                    };
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, , 3, 4]);
                    globalThis.window = { kastle: provider };
                    return [4 /*yield*/, signKastleMessage("hello")];
                case 2:
                    signature = _a.sent();
                    expect(signature).toBe("signed-message");
                    return [3 /*break*/, 4];
                case 3:
                    globalThis.window = originalWindow;
                    return [7 /*endfinally*/];
                case 4: return [2 /*return*/];
            }
        });
    }); });
});
