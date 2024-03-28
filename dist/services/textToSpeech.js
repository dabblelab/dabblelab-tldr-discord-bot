"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const openai_1 = __importDefault(require("../lib/openai"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const speechFile = path_1.default.resolve("./speech/out.mp3");
async function getTextToSpeech(text, outputFile = speechFile) {
    try {
        const mp3 = await openai_1.default.audio.speech.create({
            model: "tts-1",
            voice: "alloy",
            input: text,
        });
        const buffer = Buffer.from(await mp3.arrayBuffer());
        await fs_1.default.promises.writeFile(outputFile, buffer);
    }
    catch (err) {
        console.error(err.message || err);
    }
}
exports.default = getTextToSpeech;
//# sourceMappingURL=textToSpeech.js.map