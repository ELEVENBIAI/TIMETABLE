# Perplexity via OpenRouter API Integration

Perplexity-Modelle werden über OpenRouter aufgerufen — kein separater Perplexity-Key nötig.

## Endpoint
`POST https://openrouter.ai/api/v1/chat/completions`

## Auth
`Authorization: Bearer ${OPENROUTER_API_KEY}`

## Modelle

| Modell | OpenRouter-Name | Verwendung | Kosten ca. |
|--------|----------------|-----------|-----------|
| `perplexity/sonar` | `perplexity/sonar` | QUICK-Fallback (wenn WebSearch nicht reicht) | $1/1M Input, $1/1M Output |
| `perplexity/sonar-deep-research` | `perplexity/sonar-deep-research` | DEEP-Tier (komplexe Multi-Aspekt-Recherchen) | $2/1M Input, $8/1M Output + $5/1000 Searches |

## Request-Format (OpenAI-kompatibel)

```javascript
const https = require('https');

function callPerplexityViaOpenRouter(query, model = 'perplexity/sonar-deep-research') {
  const apiKey = process.env.OPENROUTER_API_KEY;

  const body = JSON.stringify({
    model,
    messages: [
      {
        role: 'system',
        content: 'Du bist ein Research-Assistent. Liefere praezise, quellengestuetzte Antworten. Strukturiere nach Aspekten. Nenne immer die Quellen.'
      },
      {
        role: 'user',
        content: query
      }
    ],
    max_tokens: 4096,
    return_citations: true
  });

  const options = {
    hostname: 'openrouter.ai',
    path: '/api/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.APP_URL || 'https://your-project.com',
      'X-Title': process.env.APP_NAME || 'YourProject'
    },
    timeout: 120000
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          return reject(new Error(`OpenRouter/Perplexity ${res.statusCode}: ${data.slice(0, 300)}`));
        }
        const json = JSON.parse(data);
        resolve({
          content: json.choices?.[0]?.message?.content || '',
          citations: json.citations || []
        });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('OpenRouter/Perplexity timeout (120s)')); });
    req.write(body);
    req.end();
  });
}
```

## Response-Format

```json
{
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "Strukturierte Antwort mit Quellenverweisen [1][2]..."
    }
  }],
  "citations": [
    "https://example.com/source1",
    "https://example.com/source2"
  ],
  "usage": {
    "prompt_tokens": 150,
    "completion_tokens": 800
  }
}
```

## Wichtig
- `return_citations: true` liefert ein `citations[]` Array mit URLs
- Die Response referenziert Citations als `[1]`, `[2]` etc. im Text
- Timeout: 120s für sonar-deep-research (kann länger dauern als direkte Perplexity-API)
- `OPENROUTER_API_KEY` muss in der `.env` eingetragen sein — kein separater Perplexity-Key nötig
- Keine npm-Dependencies nötig — reines `https` stdlib
