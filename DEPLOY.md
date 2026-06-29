# 🚀 Deploy

Tre modi, dal più semplice al più "permanente". Scegli in base a come giocate.

---

## 0. Stessa stanza / stessa WiFi — NESSUN deploy

Se giocate tutti nello stesso posto, non serve nulla:
```bash
npm install && npm start
```
I telefoni aprono `http://<IP-del-tuo-computer>:3000` (l'IP appare nel terminale).
✅ Il più semplice. ❌ Funziona solo sulla stessa rete.

---

## 1. ngrok — giocare SUBITO con persone lontane (tunnel)

Il server resta sul tuo computer, ngrok gli dà un indirizzo pubblico https temporaneo.

1. Crea un account gratuito su https://ngrok.com e copia il tuo *authtoken*.
2. Installa ngrok:
   ```bash
   brew install ngrok        # su Mac con Homebrew
   ngrok config add-authtoken IL_TUO_TOKEN
   ```
3. In un terminale avvia l'app: `npm start`
4. In un secondo terminale: `ngrok http 3000`
5. ngrok mostra un indirizzo tipo `https://abcd-1234.ngrok-free.app` — **condividilo**: è il link che aprono tutti.

✅ Pronto in 2 minuti, funziona ovunque.
❌ Il tuo computer deve restare acceso; l'indirizzo cambia ad ogni riavvio (gratis).

---

## 2. Render.com — URL permanente, gratis, computer spento

Hosting nel cloud: l'app vive online, non serve tenere il PC acceso.

1. Carica il progetto su GitHub (vedi sotto "Pubblicare su GitHub").
2. Vai su https://render.com → accedi con GitHub → **New → Web Service**.
3. Seleziona il repository `trivia-buzzer`.
4. Render legge tutto da solo. Verifica:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
5. (Consigliato) **Environment → Add Environment Variable**:
   `REF_PASSWORD` = la tua password arbitro.
6. **Create Web Service**. Dopo qualche minuto avrai un link tipo
   `https://trivia-buzzer.onrender.com` da condividere con tutti.

✅ Link fisso, sempre online, supporta i WebSocket (Socket.IO).
❗ Sul piano gratuito l'app "si addormenta" dopo inattività: la **prima** apertura può metterci 30-60 secondi, poi è veloce.

### Pubblicare su GitHub
Il repo git è già pronto. Dopo aver creato un repository vuoto su GitHub:
```bash
cd trivia-buzzer
git remote add origin https://github.com/<tuo-utente>/trivia-buzzer.git
git branch -M main
git push -u origin main
```

---

## Quale scegliere?

| Situazione | Usa |
|---|---|
| Tutti nella stessa sala/WiFi | **0. Locale** |
| Una serata, persone sparse, veloce | **1. ngrok** |
| Lo riuserai spesso, link stabile | **2. Render** |

Alternative equivalenti a Render con piani gratuiti e supporto WebSocket: **Railway**, **Fly.io**, **Koyeb**.
