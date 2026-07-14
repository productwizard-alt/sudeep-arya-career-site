# IndexNow submission utility

This utility submits added, materially updated, or intentionally deleted production URLs to the documented global IndexNow endpoint. It is dry-run by default and accepts only exact `https://sudeeparya.com/` URLs.

Dry-run a change before considering a live request:

```sh
python3 scripts/indexnow/submit.py \
  --change-type updated \
  https://sudeeparya.com/ \
  https://sudeeparya.com/contact/
```

After the changed page and root key file are live in production, make a live request explicitly:

```sh
python3 scripts/indexnow/submit.py \
  --apply \
  --change-type added \
  https://sudeeparya.com/new-page/
```

The utility validates, normalizes, and deduplicates URLs; enforces the 10,000-URL request limit; and verifies the exact production key URL before any live request. It rejects localhost, the permanent staging site, every Netlify domain, non-HTTPS URLs, and foreign hosts.

Use IndexNow only after a production URL is added, materially updated, or deliberately removed. Staging URLs must never be submitted. A deleted route should be submitted only intentionally; a live deleted-route request also requires `--confirm-deleted`:

```sh
python3 scripts/indexnow/submit.py \
  --apply \
  --change-type deleted \
  --confirm-deleted \
  https://sudeeparya.com/retired-page/
```

IndexNow notifies participating search engines of changes; it does not guarantee crawling or indexing. See the [official IndexNow FAQ](https://www.indexnow.org/faq) for protocol details.
