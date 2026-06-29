# 🎯 Trivia Buzzer

Buzzer multi-utente per quiz dal vivo / Multi-user buzzer for live quizzes.
Un arbitro, tanti partecipanti, **chi prenota per primo risponde**. Alternativa digitale all'alzata di mano.

Bilingue 🇮🇹 / 🇬🇧 con selettore lingua. Lo sfondo è blu, il pulsante cambia colore ad ogni domanda.

## Avvio / Start

```bash
npm install
npm start
```

Poi apri il link mostrato nel terminale:
- Su questo computer: `http://localhost:3000`
- Dai telefoni (stessa WiFi): `http://<IP-del-computer>:3000`

Cambiare la password arbitro:
```bash
REF_PASSWORD=lamiapassword npm start
```
Password di default: `arbitro`

## Come si gioca / How to play

1. **Arbitro**: apre il link, sceglie *Arbitro*, inserisce la password. Tieni questa schermata su un **monitor visibile a tutti**: mostra in grande il nickname di chi prenota per primo.
2. **Partecipanti**: aprono lo stesso link sul telefono, scelgono *Partecipante* e si registrano con un nickname.
3. L'arbitro preme **Apri prenotazioni** per ogni domanda.
4. I partecipanti premono il grande pulsante. Il **primo** (timestamp deciso dal server) può rispondere.
5. L'arbitro preme **Reset / Nuova domanda**: azzera le prenotazioni, passa alla domanda successiva e **cambia il colore** del pulsante.

## Architettura

- `server.js` — server Node.js + Socket.IO. Tiene lo stato di gioco e l'ordine di prenotazione (timestamp autorevole lato server).
- `public/index.html` — singola pagina con i tre ruoli (scelta ruolo / arbitro / partecipante), tutto lo stile e la logica client, dizionario IT/EN.
