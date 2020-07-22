# httpstat

> **[EN]** HTTP timing statistics tool — measure DNS lookup, TCP connect, TLS handshake, time-to-first-byte and total transfer time for any URL.
> **[FR]** Outil de statistiques de timing HTTP — mesurez la résolution DNS, la connexion TCP, le handshake TLS, le temps jusqu'au premier octet et le temps total de transfert pour n'importe quelle URL.

---

## Features / Fonctionnalités

**[EN]**
- Breaks down request time into: DNS, TCP connect, TLS handshake, TTFB, data transfer
- Supports HTTP and HTTPS automatically based on URL scheme
- Custom HTTP method (`-X`), headers (`-H`) and request body (`-d`)
- Follow redirects with `-L` flag
- Skip TLS certificate verification with `-k` (insecure)
- Configurable timeout in milliseconds (`--timeout`)
- JSON output mode for scripting and CI (`--json`)
- Color-coded timing waterfall in terminal output

**[FR]**
- Décompose le temps de requête en : DNS, connexion TCP, handshake TLS, TTFB, transfert de données
- Supporte HTTP et HTTPS automatiquement selon le schéma URL
- Méthode HTTP personnalisée (`-X`), en-têtes (`-H`) et corps de requête (`-d`)
- Suivre les redirections avec le drapeau `-L`
- Ignorer la vérification du certificat TLS avec `-k` (insécurisé)
- Timeout configurable en millisecondes (`--timeout`)
- Mode de sortie JSON pour les scripts et le CI (`--json`)
- Cascade de timing colorée dans la sortie terminal

---

## Installation

```bash
npm install -g @idirdev/httpstat
```

---

## CLI Usage / Utilisation CLI

```bash
# Basic GET request / Requête GET basique
httpstat https://api.example.com/health

# POST with JSON body / POST avec corps JSON
httpstat https://api.example.com/users -X POST -d '{"name":"Alice"}' -H "Content-Type: application/json"

# Custom headers / En-têtes personnalisés
httpstat https://api.example.com/me -H "Authorization: Bearer mytoken123"

# Skip TLS verification / Ignorer la vérification TLS
httpstat https://self-signed.example.com -k

# Timeout after 5 seconds / Timeout après 5 secondes
httpstat https://slow.example.com --timeout 5000

# JSON output / Sortie JSON
httpstat https://api.example.com/health --json

# Follow redirects / Suivre les redirections
httpstat https://example.com -L
```

### Example Output / Exemple de sortie

```
  httpstat https://api.example.com/health

  Connected to 93.184.216.34:443

  DNS Lookup   TCP Connect   TLS Handshake   Server Processing   Content Transfer
      12ms  +      18ms  +        54ms     +         83ms       +        3ms
  ──────────────────────────────────────────────────────────────────────────────
  namelookup: 12ms
     connect: 30ms
  pretransfer: 84ms
   starttransfer: 167ms
       total: 170ms

  HTTP/1.1 200 OK  |  size: 48 bytes
```

---

## API (Programmatic) / API (Programmation)

```js
const { httpstat } = require('@idirdev/httpstat');

// Simple GET / GET simple
const result = await httpstat('https://api.example.com/health');

console.log(result.status);       // 200
console.log(result.body);         // '{"status":"ok"}'
console.log(result.bodySize);     // 15
console.log(result.timings);
// {
//   dns:      12,    // ms
//   connect:  18,
//   tls:      54,
//   ttfb:     83,
//   transfer:  3,
//   total:   170
// }

// POST request / Requête POST
const res = await httpstat('https://api.example.com/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'alice', password: 'pass' }),
  timeout: 5000,
  rejectUnauthorized: true,
});
console.log(res.status, res.headers['set-cookie']);
```

---

## License

MIT — idirdev
