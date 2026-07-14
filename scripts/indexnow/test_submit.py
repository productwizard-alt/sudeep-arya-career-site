#!/usr/bin/env python3
"""Offline safety tests for the IndexNow submission utility."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parent))

import submit  # noqa: E402


class IndexNowSafetyTests(unittest.TestCase):
    def test_normalizes_and_deduplicates_production_urls(self) -> None:
        self.assertEqual(
            submit.normalize_urls(
                [
                    "https://sudeeparya.com",
                    "https://sudeeparya.com/#section",
                    "https://SUDEEPARYA.COM/contact/?source=test#form",
                ]
            ),
            [
                "https://sudeeparya.com/",
                "https://sudeeparya.com/contact/?source=test",
            ],
        )

    def test_rejects_non_production_hosts(self) -> None:
        rejected = [
            "http://localhost:8000/",
            "https://127.0.0.1/",
            "https://bucolic-duckanoo-637c85.netlify.app/",
            "https://another-site.netlify.app/",
            "https://example.com/",
            "http://sudeeparya.com/",
            "https://www.sudeeparya.com/",
        ]
        for url in rejected:
            with self.subTest(url=url), self.assertRaises(submit.ValidationError):
                submit.normalize_url(url)

    def test_enforces_batch_limit_after_deduplication(self) -> None:
        urls = [f"https://sudeeparya.com/?id={index}" for index in range(10_001)]
        with self.assertRaisesRegex(submit.ValidationError, "at most 10,000"):
            submit.normalize_urls(urls)

    def test_local_key_is_exact(self) -> None:
        submit.validate_local_key_file()
        key_path = submit.REPOSITORY_ROOT / submit.KEY_FILENAME
        self.assertEqual(key_path.read_bytes(), submit.EXPECTED_KEY_BYTES)
        self.assertEqual(len(key_path.read_bytes()), 33)

    def test_payload_uses_documented_endpoint_fields(self) -> None:
        payload = submit.build_payload(["https://sudeeparya.com/"])
        self.assertEqual(payload["host"], "sudeeparya.com")
        self.assertEqual(payload["keyLocation"], submit.KEY_URL)
        self.assertEqual(payload["urlList"], ["https://sudeeparya.com/"])


if __name__ == "__main__":
    unittest.main()
