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
const openai_1 = __importDefault(require("../lib/openai"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const speechFile = path_1.default.resolve('./speech/out.mp3');
function getTextToSpeech(text_1) {
    return __awaiter(this, arguments, void 0, function* (text, outputFile = speechFile) {
        try {
            const mp3 = yield openai_1.default.audio.speech.create({
                model: 'tts-1',
                voice: 'alloy',
                input: text,
            });
            const buffer = Buffer.from(yield mp3.arrayBuffer());
            yield fs_1.default.promises.writeFile(outputFile, buffer);
        }
        catch (err) {
            console.error(err.message || err);
        }
    });
}
exports.default = getTextToSpeech;
//# sourceMappingURL=textToSpeech.js.map