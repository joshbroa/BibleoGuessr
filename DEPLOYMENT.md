# Deploying BibleoGuessr

Frontend on **Vercel**, backend on **Firebase** (Auth, Firestore, Cloud
Functions). The two are separate deployments: Vercel serves the static site, and
the browser talks to Firebase directly.

Work through this top to bottom the first time. Steps marked **(!)** will break
the site if skipped.

---

## 0. Before you start

| Requirement | Why |
| --- | --- |
| **Firebase Blaze plan** (!) | 2nd-gen Cloud Functions cannot be deployed on Spark. The free monthly allowances still apply, so a small game costs roughly nothing, but Google requires a card on file. |
| Node 22 | Matches the functions runtime. |
| Python 3 | Generates the Bible page data. `npm run pages` finds `py`, `python3` or `python` automatically. |
| Firebase CLI | `npm i -g firebase-tools`, then `firebase login`. |

Set a billing budget before you deploy: Google Cloud Console, then Billing,
then Budgets & alerts. Every function already caps itself at `maxInstances: 10`,
so a traffic spike cannot fan out indefinitely, but a budget alert is the
backstop.

---

## 1. Email (!)

Two emails matter: address verification and password reset. Both are sent by
Firebase Authentication rather than by this codebase, so no password and no mail
credential ever passes through our own code.

Out of the box they arrive from `noreply@bibleoguessr.firebaseapp.com`, free and
with nothing to configure. That works, but the sender is not your domain, so
some of it lands in spam and the link inside points somewhere that does not look
like your site.

There are two ways to fix that, and they are **alternatives, not layers**. Take
the first.

### 1.1 Firebase's own custom email domain — take this route

Firebase can send auth mail from your domain itself: no third-party provider, no
SMTP credential, no API key. It also rewrites the action link onto your domain,
so the whole email is consistent and nothing needs Firebase Hosting.

Console, then **Authentication**, then **Templates**, then edit a template and
click **customize domain**. Enter `bibleoguessr.com` and Firebase returns four
records:

| Name | Type | Purpose |
| --- | --- | --- |
| `@` (root) | `TXT` | `v=spf1 include:_spf.firebasemail.com ~all` — SPF |
| `@` (root) | `TXT` | `firebase=bibleoguessr` — proves you own the domain |
| `firebase1._domainkey` | `CNAME` | DKIM key 1 |
| `firebase2._domainkey` | `CNAME` | DKIM key 2 |

Take the CNAME values from the console; they are project-specific.

**(!) Do not add the SPF record blindly.** A name may carry only **one**
`v=spf1` record. Two is not more permissive, it is invalid, and it breaks SPF for
the entire domain — including the forwarding that delivers `support@` and
`privacy@`. Look at the existing root `TXT` records first:

- No `v=spf1` there → add Firebase's exactly as given.
- One already there → **edit that one**. Never add a second. Keep every
  `include:` it already has and add Firebase's alongside:

      v=spf1 include:_spf.firebasemail.com include:<whatever was already there> ~all

The other three records are safe as-is. Several `TXT` records on one name are
fine; it is only several *SPF* records that are invalid.

Entering them at Spaceship: the **Name** field wants the host part only —
`firebase1._domainkey`, and `@` for the root — not the fully written-out domain.
Firebase prints CNAME values with a trailing dot, which just means "this name is
absolute, do not append my zone". Enter it with the dot; if Spaceship rejects the
character, drop it. Either way, check what actually landed:

    Resolve-DnsName firebase1._domainkey.bibleoguessr.com -Type CNAME

Ending in `firebasemail.com` is right. Ending in
`firebasemail.com.bibleoguessr.com` means the value was treated as relative —
put the trailing dot back.

Verification takes up to 24 hours. When it finishes, click **Apply Custom
Domain**, then edit both templates so they read like this site rather than a
Google default.

Then look at the **From** field. If its local part is editable, set
`verify@bibleoguessr.com`; if it is fixed, you get `noreply@bibleoguessr.com`,
which is still your domain and still the win that matters. Either way set
**Reply to** to `support@bibleoguessr.com`, which forwards to Gmail — the sending
address itself needs no inbox.

### 1.2 Point the action URL at this app (!)

Applying the custom domain changes the From address **and the action links** —
the button in the email becomes `https://bibleoguessr.com/__/auth/action?…`.
Vercel serves that domain, not Firebase Hosting, so that path meets the SPA
rewrite in `vercel.json` and renders the 404 page. Verification and password
reset would break at the moment you apply the domain, having worked until then.

So the app ships its own handler and the templates point at it, which removes
the question of who serves `/__/auth/action` entirely. Console, then
Authentication, then Templates, then the pencil icon, then **customize action
URL**:

    https://bibleoguessr.com/auth/action

One action URL covers every template. `src/pages/AuthAction.jsx` handles
`verifyEmail`, `resetPassword`, `recoverEmail` and `verifyAndChangeEmail` in the
site's own styling, and returns people to the game through the `continueUrl`
the app attaches when it sends the mail.

**Order matters.** The handler has to be live before the templates point at it,
or any link sent in between lands on a page that does not exist yet:

1. Deploy to Vercel with `/auth/action` present.
2. Set the custom action URL.
3. Apply the custom domain.
4. Set From and Reply to, and rewrite the bodies.
5. Send yourself one of each and follow both links.

### 1.3 Custom SMTP through a provider — the fallback

Only worth it if you need a From address Firebase will not give you, or you want
one provider for auth mail and everything else later. Firebase then hands every
auth email to an SMTP server you nominate. With Resend that is:

| Field | Value |
| --- | --- |
| SMTP server address | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` (literally that word, not an address) |
| Password | a Resend API key with sending permission |
| Security mode | `SSL` |

**(!) Configuring SMTP and setting the From address must happen together.** With
SMTP configured, Firebase stops using its own sending domain — but the From
address stays `noreply@<project>.firebaseapp.com` until you edit the templates,
and a provider rejects mail whose From domain is not verified in *its* account,
which `firebaseapp.com` never will be. Leave it half-done and verification mail
stops arriving altogether, which is worse than the default you started from.

Going this way, verify the domain in the provider first, and keep its return-path
`MX` on a subdomain (`send.bibleoguessr.com` is Resend's default) so it cannot
collide with the root `MX` records that deliver your forwarded mail.

### 1.4 DMARC — the record Firebase does not ask for

Firebase's four records give you SPF and DKIM. They do not give you DMARC, and
its absence is now a deliverability problem in its own right: Gmail and Yahoo
both treat an unauthenticated-looking sender more harshly when the domain
publishes no policy at all.

Add one `TXT` record at Spaceship:

| Name | Value |
| --- | --- |
| `_dmarc` | `v=DMARC1; p=none; rua=mailto:support@bibleoguessr.com` |

`p=none` means "monitor, do not reject". That is the right starting point — a
strict policy on a domain you have not yet watched can silently destroy mail you
did want delivered. The `rua` address collects the weekly aggregate reports.

**Before ever tightening to `p=quarantine` or `p=reject`**, make sure the SPF
record covers *everything* that sends as this domain — Firebase, and whatever
path you use to reply as `support@` or `privacy@` from Gmail. Tightening the
policy while a sender is missing from SPF is how people take down their own
email.

Sanity-check the whole set in one go:

    Resolve-DnsName bibleoguessr.com -Type TXT

Exactly one `v=spf1` record, plus the `firebase=` token. Two SPF records is the
failure mode to look for.

### 1.5 Check it end to end

Sign up with a real address on the deployed site. The mail should arrive from
`@bibleoguessr.com`, the link inside should point at your domain, and following
it should clear the "Confirm your email" banner and offer a Continue button back
into the game.

## 2. Firebase

    firebase login
    firebase use bibleoguessr

### 2.1 Authentication

Console, then Authentication:

- **Sign-in method** - confirm **Email/Password** and **Anonymous** are enabled.
  Anonymous backs guest play; without it the landing page fails.
- **Settings, then Authorized domains** (!) - add `bibleoguessr.com`,
  `www.bibleoguessr.com`, and the exact hostname Vercel assigns the project,
  e.g. `bibleoguessr.vercel.app`.

  This field takes literal hostnames only — a wildcard like `*.vercel.app` is
  rejected as invalid. Vercel gives every preview deployment its own unique
  hostname, so previews cannot all be listed and email action links will not work
  from them. Test auth against production.

  Firebase refuses to send an action link whose continue URL points at an
  unlisted host, so signup quietly stops sending verification mail if the real
  domain is missing. `localhost` is listed by default, which is exactly why
  development never shows you this.
- **Settings, then User actions** - leave *email enumeration protection* on. The
  reset screen is written to assume it, and never reveals whether an address is
  registered.

### 2.2 Firestore

    npm run deploy:rules

Then set the TTL policy (!). This one is **not in the Firebase console** — TTL
lives in the Google Cloud console, on the same database:

<https://console.cloud.google.com/firestore/databases> → select `(default)` →
**Time-to-live** → **Create policy**

- Collection group: `games`
- Timestamp field: `expiresAt`

Leave **expiration offset** at `0`. It is not the retention period — it delays
deletion by that much *past* the timestamp in the field, and the retention is
already baked into the document by `GAME_RETENTION_DAYS` in
`functions/index.js`. An offset of 7 days there means 37 days in total, with the
number living in two places. Note that the offset cannot be edited in place: it
needs the policy deleted and recreated, and the backend rejects the new one with
`Cannot modify TTL offset` until the delete has finished propagating, which
takes ten minutes or more.

Both are free-text fields, so the policy can be created before a single game
exists. Do not go looking for `games` in the Firebase console's **Data** tab — a collection
only appears there once it holds a document, and nothing has played yet. The
**Indexes** tab does list `games` and `games_history`, but only because
`firestore.indexes.json` declares indexes for them; that is not evidence of data.

If the console gives you trouble, the same thing from the CLI:

    gcloud firestore fields ttls update expiresAt       --collection-group=games --enable-ttl --project=bibleoguessr

Game documents hold the full text of every target verse, and finished games are
already copied to `games_history`. Without this policy the collection grows
forever and eventually eats the free tier. The field is written automatically on
every new game; the policy is what acts on it.

### 2.3 Cloud Functions

    cp functions/.env.example functions/.env
    npm run deploy:functions

Leave `ALLOWED_ORIGINS` commented out for this first deploy — see below.

The CLI will ask how many days to keep container images, defaulting to 1:

    ? How many days do you want to keep container images before they're deleted? (1)

Press Enter. These are build artifacts in Artifact Registry, not the code that
runs; deleting them does not touch the deployed functions. The warning exists
because they otherwise pile up and cost a little every month.

`deploy:functions` regenerates the page data first. The functions read ~3,200
page files from their own bundle, so the data must exist locally before you
deploy. Expect the first deploy to take several minutes; it uploads about 40MB.

On `ALLOWED_ORIGINS`: there is a deliberate ordering here. You cannot know the
`*.vercel.app` origin until Vercel has built the project once, and an allowlist
that omits the origin you are testing from fails as a browser CORS error that
says nothing useful. So leave it unset for now — the functions accept any origin
and log a `[cors]` warning on every cold start — then fill it in and run
`npm run deploy:functions` again once §3 is done and the real origins exist.

This is hardening, not the gate: callables already require a valid Firebase ID
token for this project, and CORS only ever constrains browsers, never a script
calling the endpoint directly. Firebase App Check (§6) is the real control.

---

## 3. Vercel

1. Import the Git repository. Vercel reads `vercel.json`, so the build command,
   output directory, caching and security headers are already configured.
2. **Environment variables** (!) - add these for both Production and Preview,
   copying the values from your local `.env.local`:

       VITE_FIREBASE_API_KEY
       VITE_FIREBASE_AUTH_DOMAIN
       VITE_FIREBASE_PROJECT_ID
       VITE_FIREBASE_STORAGE_BUCKET
       VITE_FIREBASE_MESSAGING_SENDER_ID
       VITE_FIREBASE_APP_ID

   Do **not** set `VITE_USE_EMULATORS`. If it is ever set in Vercel the live site
   will try to reach a database on localhost and nothing will work.

   These values are public by design: they identify the project, they do not
   authorise anything. Firestore rules and the Cloud Functions enforce access.

3. Deploy. Note the exact `…vercel.app` hostname it gives you — Firebase needs
   it, and it does not exist until now.
4. **Back to Firebase, Authentication, Settings, Authorized domains** (!) - add
   that hostname verbatim.
5. **Vercel, then Settings, then Domains** - add `bibleoguessr.com` and
   `www.bibleoguessr.com`, then add the `A` / `CNAME` records Vercel asks for at
   Spaceship. Let Vercel redirect `www` to the apex.

   This is the one place the ordering is forced: the Vercel domain cannot be
   authorised in Firebase before Vercel exists, and Vercel cannot serve the
   domain until its DNS points there. Expect to go back and forth once.
6. Once the domain resolves, fill in `ALLOWED_ORIGINS` in `functions/.env` with
   all three origins and run `npm run deploy:functions` again.

### If the build fails on the page data

The build runs `node scripts/run-pages.mjs --if-missing`, which needs Python 3
in Vercel's build image. It is normally present. If the log shows "No working
Python 3 interpreter found", the fallback is to ship the generated data instead
of building it:

    npm run pages
    # then delete these three lines from .gitignore:
    #   public/bible_pages/
    #   functions/src/bible_pages/
    #   functions/src/verse_pool.json
    git add public/bible_pages functions/src
    git commit -m "Commit generated page data"

`--if-missing` then finds the data already present and skips generation. This
adds about 40MB and 6,400 files to the repository, which is why it is the
fallback rather than the default.

---

## 4. Fill in the legal details (!)

`src/lib/siteConfig.js` holds the details both policy pages quote verbatim.
While `CONTROLLER_NAME` or `CONTACT_EMAIL` is still a `TODO`, those pages show a
red "Not ready to publish" banner, so this cannot ship half-done:

- `CONTROLLER_NAME` - who is legally responsible for the data. Your own name is
  fine for a personal project.
- `CONTACT_EMAIL` - a monitored address for privacy and support enquiries.
- `SITE_URL` - your real origin.
- `GOVERNING_LAW` and `SUPERVISORY_AUTHORITY` - the defaults assume the UK.

`index.html` (`og:url` and `canonical`), `public/robots.txt` and
`public/sitemap.xml` carry the same origin hard-coded. They are set to
`https://bibleoguessr.com`; if that ever changes, change it in all four places.

**The policy text is a starting point, not legal advice.** It accurately
describes what the app does with data, which is the hard part, but if you are
unsure about your obligations have someone qualified read it.

---

## 5. After the first deploy

Check each of these on the live site:

- [X] Landing page loads, and Continue as Guest starts a session.
- [X] A full game plays: 3D Bible opens, pages turn, a guess scores.
- [ ] Sign up works, and the verification email arrives from
      `@bibleoguessr.com`. Check spam. The link inside should also be on
      `bibleoguessr.com`, not `firebaseapp.com`.
- [ ] Forgot password sends a reset link, and the link sets a new password.
- [X] Game history saves for a signed-in player.
- [ ] Account deletion works from Settings.
- [X] `/legal/privacy` and `/legal/terms` show no placeholder banner.
- [ ] A nonsense URL shows the 404 page rather than a blank screen.
- [ ] Functions log no `[cors]` warning: `firebase functions:log`.

---

## 6. Worth doing soon, not required to launch

- **Firebase App Check** - the real defence against someone hammering the
  backend from outside a browser. Register a reCAPTCHA v3 site key, initialise
  App Check in `src/firebase.js`, then set `enforceAppCheck: true` in
  `callableOptions`. Enforce it only after confirming clients send tokens, or you
  will lock everyone out.
- **Error reporting** - Sentry or similar. `ErrorBoundary` currently only logs to
  the browser console, so you will not hear about crashes in the wild.
- **Data export** - account deletion covers the right to erasure; a
  download-my-data button would cover portability.
