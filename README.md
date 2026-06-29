# 🧠 Quiz Italia

Quiz multi-utente a risposta multipla, in italiano, per giocare dal vivo.
Un **arbitro** conduce, i **partecipanti** rispondono dal telefono. 300 domande di cultura
generale italiana (difficoltà medio-alta), proposte in ordine casuale senza ripetizioni.

## Avvio

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
Password di default: `arbitro` (l'accesso ignora maiuscole/spazi).

## Come si gioca

1. **Arbitro**: apre il link, sceglie *Arbitro*, inserisce la password. Tieni questa
   schermata su un **monitor visibile a tutti**: mostra la domanda, chi ha risposto e la
   classifica a barre (istogramma) dei punteggi.
2. **Partecipanti**: aprono lo stesso link sul telefono, scelgono *Partecipante* e si
   registrano con un nickname.
3. L'arbitro preme **Prossima domanda**: viene estratta una domanda casuale e il colore
   delle opzioni cambia.
4. I partecipanti toccano la risposta. Possono **cambiarla** finché l'arbitro non chiude.
5. L'arbitro preme **Mostra risposta**: si rivela quella corretta e si aggiornano i punti.
   - Risposta giusta **+1**, sbagliata **−1**, nessuna risposta **0**.
6. Il **Reset completo** azzera punteggi e domande usate e ricomincia.

La risposta corretta non viene mai inviata ai telefoni prima della chiusura (anti-trucco).

## Architettura

- `server.js` — server Node.js + Socket.IO: stato del gioco, punteggi, estrazione casuale.
- `questions.js` — banco delle 300 domande (testo, 4 opzioni, indice corretto).
- `public/index.html` — pagina unica con i ruoli (arbitro / partecipante), stile e logica.

Vedi `DEPLOY.md` per pubblicarlo online.
