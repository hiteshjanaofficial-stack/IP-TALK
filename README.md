# IP TALK
Room-based chat, made by Snehasish Jana.

Join a room with a **Room Number**, a **Room IP address**, and any **username** —
anyone with the same room number + room IP reaches the same live conversation,
no matter what network they're on.

## Honest note on "IP address"
A browser can't open a raw connection to an arbitrary IP address someone types
in — that's blocked for everyone's safety, by every browser, always. So here
the "room IP" you enter works as a second shared passcode, combined with the
room number, that this small server uses to place people in the same room.
That's the same trick every group chat / video call app uses under the hood
(a central relay) — it's just written here in plain, honest terms instead of
pretending your browser is dialing an IP directly.

---

## 1. Run it on your own computer

Requirements: [Node.js](https://nodejs.org) 18 or newer.

```bash
cd ip-talk
npm install
npm start
```

Open **http://localhost:3000**. To test with a "second person," open the same
address in another browser tab, or from another device on your wifi using
your computer's local IP (e.g. `http://192.168.1.23:3000`).

This alone only lets people on your own network reach it. For people on
*different* networks (the actual point of IP TALK), you need to put it on the
internet — step 2.

---

## 2. Put it on the internet (free options)

The app is a normal Node.js + Socket.io server, so any Node host works.
**Render** is the easiest free option:

1. Push this folder to a GitHub repository.
2. Go to [render.com](https://render.com) → **New** → **Web Service** → connect
   your repo.
3. Build command: `npm install`. Start command: `npm start`.
4. Deploy. Render gives you a URL like `https://ip-talk-xxxx.onrender.com` —
   that's already a real, working, publicly-reachable IP TALK. Anyone
   anywhere can open it and join a room right now.

Railway, Fly.io, and a plain VPS (DigitalOcean/AWS Lightsail) all work the
same way — install Node, `npm install`, `npm start`, keep it running (e.g.
with `pm2 start server.js`).

---

## 3. Point your own domain (sjsk) at it

"sjsk" is a name, not a domain by itself — you need to register it with an
extension, e.g. `sjsk.com`, `sjsk.in`, or `sjsk.app`. Steps:

1. **Check availability & buy it** at a registrar — Namecheap, GoDaddy, or (for
   `.in`) any ICANN/NIXI-accredited registrar. Prices are usually $5–15/yr
   depending on the extension.
2. **Point it at your host:**
   - If you deployed on Render: in your domain's DNS settings, add a `CNAME`
     record for `www` pointing to your Render URL, and follow Render's
     "Custom Domain" instructions in your service's Settings tab to verify it
     and get free HTTPS.
   - If you used a VPS with its own IP address: add an `A` record pointing
     your domain straight at that server's IP.
3. Wait for DNS to propagate (minutes to a few hours), then `sjsk.com` (or
   whichever extension you chose) loads IP TALK directly.

---

## 4. Get it showing up on Google

Google can only index a site once it's live at a real domain (step 3). Once
it is:

1. Create a free **Google Search Console** account at
   [search.google.com/search-console](https://search.google.com/search-console)
   and add your domain.
2. Verify ownership (Search Console gives you a DNS record or HTML file to add
   — takes a few minutes).
3. Submit your homepage URL for indexing under **URL Inspection → Request
   Indexing**.
4. Optional but helps: add a short `sitemap.xml` listing your homepage and
   submit it under **Sitemaps** in Search Console.
5. Indexing typically shows up in search results within a few days to two
   weeks — there's no way to force it instantly, that's Google's crawler on
   its own schedule.

---

## What's in this folder

```
ip-talk/
├── server.js        Node + Socket.io backend: rooms, join/leave, message relay
├── package.json
└── public/
    ├── index.html    Landing page + join form + chat UI (one page, two views)
    ├── style.css
    └── app.js        Client logic: joining, sending/receiving messages
```

Rooms and message history live in the server's memory only — restarting the
server clears all rooms. If you want messages to survive a restart, the next
step would be adding a small database (SQLite is enough for this scale).
