import express from 'express';
import env from 'dotenv';
import getTextToSpeech from '../services/textToSpeech';

env.config();

const app = express();
const port = 3001;

app.get('/', async (req, res) => {
	const text = 'Hello, world!';

	await getTextToSpeech(text);
	res.send('Done');
});

app.listen(port, () => {
	return console.log(`Express is listening at http://localhost:${port}`);
});
