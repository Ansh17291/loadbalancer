"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
(() => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    for (let i = 0; i < 30; i++) {
        try {
            const res = yield axios_1.default.get('http://localhost:8080');
            console.log(`[${i}] -> Correct`, res.data);
        }
        catch (err) {
            // Log detailed error information (covers network errors and HTTP errors)
            const status = (_a = err.response) === null || _a === void 0 ? void 0 : _a.status;
            const statusText = (_b = err.response) === null || _b === void 0 ? void 0 : _b.statusText;
            const data = (_c = err.response) === null || _c === void 0 ? void 0 : _c.data;
            console.error(`[${i}] -> Err`, {
                status: status !== null && status !== void 0 ? status : 'NO_RESPONSE',
                statusText: statusText !== null && statusText !== void 0 ? statusText : null,
                data: data !== null && data !== void 0 ? data : null,
                message: err.message,
                code: (_d = err.code) !== null && _d !== void 0 ? _d : null,
            });
        }
    }
}))();
