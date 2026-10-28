# Site and dashboard

One Next.js application. The theme lives in `src/app/globals.css`: a paper background, a display title, and a rust probe mark. The components are shadcn.

```bash
npm run dev
```

Site: http://127.0.0.1:44733/  
Site cabinet: http://127.0.0.1:44733/dashboard  
Admin cabinet: http://127.0.0.1:44733/admin

On the live names those are `dash.ledgesec.com` and `admin.ledgesec.com`. Sign-in goes to the API. An admin does not open the journal on the client host.

Local `npm run dev` proxies `/api` to the API when `LEDGESEC_DEV_API` is set, for example `http://127.0.0.1:18080`. Accounts are not in git: the admin is created in Postgres.
