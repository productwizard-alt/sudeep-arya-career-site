#!/usr/bin/env python3
"""Validate and optionally submit production URLs to IndexNow."""

from __future__ import annotations

import argparse
import ipaddress
import json
import sys
from pathlib import Path
from typing import Iterable
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit, urlunsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener


ENDPOINT = "https://api.indexnow.org/indexnow"
PRODUCTION_HOST = "sudeeparya.com"
PRODUCTION_ORIGIN = f"https://{PRODUCTION_HOST}"
PERMANENT_STAGING_HOST = "bucolic-duckanoo-637c85.netlify.app"
KEY = "36bcb98a24be4cc6937303e21fcf4bb2"
KEY_FILENAME = f"{KEY}.txt"
KEY_URL = f"{PRODUCTION_ORIGIN}/{KEY_FILENAME}"
MAX_URLS = 10_000
EXPECTED_KEY_BYTES = f"{KEY}\n".encode("ascii")
REPOSITORY_ROOT = Path(__file__).resolve().parents[2]


class ValidationError(ValueError):
    """Raised when a submission would violate IndexNow safety rules."""


class NoRedirects(HTTPRedirectHandler):
    """Reject redirects so the production key must exist at its exact URL."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):  # noqa: ANN001
        return None


def _is_local_host(host: str) -> bool:
    if host == "localhost" or host.endswith(".localhost"):
        return True
    try:
        return ipaddress.ip_address(host).is_loopback
    except ValueError:
        return False


def normalize_url(raw_url: str) -> str:
    """Validate one production URL and return its canonical submission form."""
    if not raw_url or any(char.isspace() for char in raw_url):
        raise ValidationError(f"Invalid URL: {raw_url!r}")

    try:
        parsed = urlsplit(raw_url)
        host = (parsed.hostname or "").lower()
        port = parsed.port
    except ValueError as exc:
        raise ValidationError(f"Invalid URL {raw_url!r}: {exc}") from exc

    if parsed.scheme.lower() != "https":
        raise ValidationError(f"Only HTTPS production URLs are allowed: {raw_url}")
    if parsed.username or parsed.password or port is not None:
        raise ValidationError(f"Credentials and explicit ports are not allowed: {raw_url}")
    if _is_local_host(host):
        raise ValidationError(f"Localhost URLs are never allowed: {raw_url}")
    if host == PERMANENT_STAGING_HOST:
        raise ValidationError(f"The permanent staging site is never allowed: {raw_url}")
    if host == "netlify.app" or host.endswith(".netlify.app"):
        raise ValidationError(f"Netlify URLs are never allowed: {raw_url}")
    if host != PRODUCTION_HOST:
        raise ValidationError(f"Foreign hosts are not allowed: {raw_url}")
    if parsed.path.startswith("//"):
        raise ValidationError(f"Ambiguous URL path is not allowed: {raw_url}")

    path = parsed.path or "/"
    return urlunsplit(("https", PRODUCTION_HOST, path, parsed.query, ""))


def normalize_urls(raw_urls: Iterable[str]) -> list[str]:
    """Normalize and deduplicate URLs while preserving input order."""
    normalized = list(dict.fromkeys(normalize_url(url) for url in raw_urls))
    if not normalized:
        raise ValidationError("At least one production URL is required.")
    if len(normalized) > MAX_URLS:
        raise ValidationError(
            f"IndexNow accepts at most {MAX_URLS:,} URLs per request; got {len(normalized):,}."
        )
    return normalized


def validate_local_key_file() -> None:
    key_path = REPOSITORY_ROOT / KEY_FILENAME
    try:
        contents = key_path.read_bytes()
    except OSError as exc:
        raise ValidationError(f"Cannot read repository key file {key_path}: {exc}") from exc
    if contents != EXPECTED_KEY_BYTES:
        raise ValidationError(
            f"Repository key file must contain exactly the 32-character key and one newline "
            f"({len(EXPECTED_KEY_BYTES)} bytes)."
        )


def verify_production_key(timeout: float) -> None:
    request = Request(KEY_URL, headers={"User-Agent": "sudeeparya-indexnow/1.0"})
    opener = build_opener(NoRedirects())
    try:
        with opener.open(request, timeout=timeout) as response:
            status = response.status
            final_url = response.geturl()
            contents = response.read(len(EXPECTED_KEY_BYTES) + 1)
    except (HTTPError, URLError, TimeoutError, OSError) as exc:
        raise RuntimeError(f"Production key verification failed: {exc}") from exc

    if status != 200 or final_url != KEY_URL or contents != EXPECTED_KEY_BYTES:
        raise RuntimeError(
            "Production key verification failed: expected HTTP 200 and exact key contents "
            f"at {KEY_URL}."
        )
    print(f"Production key verification: HTTP {status}, exact contents confirmed")


def build_payload(urls: list[str]) -> dict[str, object]:
    return {
        "host": PRODUCTION_HOST,
        "key": KEY,
        "keyLocation": KEY_URL,
        "urlList": urls,
    }


def submit(payload: dict[str, object], timeout: float) -> int:
    request = Request(
        ENDPOINT,
        data=json.dumps(payload, separators=(",", ":")).encode("utf-8"),
        headers={
            "Content-Type": "application/json; charset=utf-8",
            "User-Agent": "sudeeparya-indexnow/1.0",
        },
        method="POST",
    )
    try:
        with build_opener().open(request, timeout=timeout) as response:
            status = response.status
    except HTTPError as exc:
        print(f"IndexNow HTTP status: {exc.code}", file=sys.stderr)
        return 1
    except (URLError, TimeoutError, OSError) as exc:
        print(f"IndexNow request failed: {exc}", file=sys.stderr)
        return 1

    print(f"IndexNow HTTP status: {status}")
    return 0 if 200 <= status < 300 else 1


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Dry-run or submit changed sudeeparya.com URLs to IndexNow."
    )
    parser.add_argument("urls", nargs="+", help="One or more changed production URLs")
    parser.add_argument(
        "--change-type",
        choices=("added", "updated", "deleted"),
        default="updated",
        help="Reason for submission; used for operator review (default: updated)",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Verify the production key and perform the live IndexNow request",
    )
    parser.add_argument(
        "--confirm-deleted",
        action="store_true",
        help="Required with --apply for intentionally deleted routes",
    )
    parser.add_argument("--timeout", type=float, default=10.0, help=argparse.SUPPRESS)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        validate_local_key_file()
        urls = normalize_urls(args.urls)
        if args.timeout <= 0:
            raise ValidationError("Timeout must be greater than zero.")
        if args.apply and args.change_type == "deleted" and not args.confirm_deleted:
            raise ValidationError(
                "Live submission of deleted routes requires --confirm-deleted."
            )
    except ValidationError as exc:
        print(f"Validation error: {exc}", file=sys.stderr)
        return 2

    print(f"Mode: {'LIVE' if args.apply else 'DRY RUN'}")
    print(f"Change type: {args.change_type}")
    print(f"Endpoint: {ENDPOINT}")
    print(f"Host: {PRODUCTION_HOST}")
    print(f"Key location: {KEY_URL}")
    print(f"URL count: {len(urls)}")
    for url in urls:
        print(f"  - {url}")

    if not args.apply:
        print("IndexNow HTTP status: not sent (dry-run; use --apply for a live request)")
        return 0

    try:
        verify_production_key(args.timeout)
    except RuntimeError as exc:
        print(str(exc), file=sys.stderr)
        return 1
    return submit(build_payload(urls), args.timeout)


if __name__ == "__main__":
    raise SystemExit(main())
