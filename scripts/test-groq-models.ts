import './_load-env';
import axios from 'axios';

async function main() {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY missing');
  const res = await axios.get('https://api.groq.com/openai/v1/models', {
    headers: { Authorization: `Bearer ${key}` },
  });
  for (const m of res.data.data) {
    console.log(m.id, '| context:', m.context_window ?? '-');
  }
}

main().catch((e) => {
  console.error('FAILED:', e?.response?.data ?? e.message);
  process.exit(1);
});
