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
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const openai_1 = __importDefault(require("openai"));
dotenv_1.default.config();
const openai = new openai_1.default();
const speechFile = path_1.default.resolve('./speech/out.mp3');
function getTextToSpeech(text) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const mp3 = yield openai.audio.speech.create({
                model: 'tts-1',
                voice: 'alloy',
                input: text,
            });
            const buffer = Buffer.from(yield mp3.arrayBuffer());
            yield fs_1.default.promises.writeFile(speechFile, buffer);
        }
        catch (err) {
            console.error(err.message || err);
        }
    });
}
const app = (0, express_1.default)();
const port = 3001;
app.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const text = `I went into self reflection mode and enjoyed taking a step back and think more about my goals and where I am heading toward.
Let me first share about

1. My long term goal

- I want to be a part of growth story of a company. After a couple of years I want to see myself as a part of a group who built a "company" and not just a guy who worked for a company/ has only been an employee. When I read about a company's growth story which started with a group of say 4-5 people and grew from there to something which people are now reading/talking about, I always feel connected and vision myselfto be doing the same.
- I want to feel the problems people face while building a company and learn how to solve them. Be it making a proper structure, figuring out how to optimize the use of resources and scale etc.
- Solve problem(s) using technology
- Independent.

2. General career goal

- Continue to grow my skills. Be good in everything and great in one thing (specialised). Open to experiment with new things.
- Learn how to talk to people, make them comfortable sharing their ideas/problems, talk and deal with clients. etc.
- Learn how to manage project, people and transform an idea into product from paper to something the end user uses.
- Learn about business side of things and not only remain a work machine.

3. What and who I want to work on/with

- I want to be at a place where work does not feel like work. I get to experiment and work on things I love, learn new skills and experiment/dabble with new technologies.
- I want to work with people who feel like friends, open, easy to talk, share anything.
- I want to surrounded by smarter people who always motivate me to learn more.
- I want to have a mentor who inspire me and help me solve any issue I am facing. I should always be thinking "How this person is able to do all these? How can I also do these? How can I be like him?"
4. Financial goal

- I do have some financial goal which should be met as I move forward in my career. At this stage, its all about balance between learning and earning. If I am learning a lot I don't think too much about earning..
- I am aware of the possibilities (a lot of the people are not , for example in my country). Chose to work in a US based remote startup and not Indian startup for the same reason.
- I'm more like "get invested in something potential when it is small and get higher returns later when it grows" than "get a fixed stable return from the begining itself".`;
    yield getTextToSpeech(text);
    res.send('Done');
}));
app.listen(port, () => {
    return console.log(`Express is listening at http://localhost:${port}`);
});
//# sourceMappingURL=app.js.map