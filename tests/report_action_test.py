"""Portable reporter regressions: no network, Keychain, or third-party packages."""

import importlib.util
import io
import json
import os
from pathlib import Path
import sys
import unittest
import urllib.error
from contextlib import redirect_stderr, redirect_stdout
from unittest.mock import patch


script = Path(__file__).resolve().parents[1] / "skills/monologue/scripts/report-action.py"
spec = importlib.util.spec_from_file_location("report_action", script)
reporter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reporter)


class ReportActionTests(unittest.TestCase):
    def setUp(self):
        self.environment = patch.dict(os.environ, {
            "MONOLOGUE_URL": "https://fixture.example.test/",
            "MONOLOGUE_API_KEY": "synthetic-reporter-key",
        }, clear=True)
        self.environment.start()
        self.addCleanup(self.environment.stop)
        self.keychain = patch.object(reporter, "keychain_api_key", return_value=None).start()
        self.urlopen = patch.object(reporter.urllib.request, "urlopen").start()
        self.addCleanup(patch.stopall)
        self.urlopen.return_value = io.BytesIO(b'{"success":true,"id":"fixture-event"}')

    def run_reporter(self, *extra):
        args = [str(script), "--agent", "Fixture agent", "--verb", "sent",
                "--summary", "Fixture: sent a message", "--category", "communication",
                "--system", "Email", *extra]
        stdout, stderr = io.StringIO(), io.StringIO()
        with patch.object(sys, "argv", args), redirect_stdout(stdout), redirect_stderr(stderr):
            result = reporter.main()
        # Credentials must never appear in the completion message or error output.
        self.assertNotIn("synthetic-reporter-key", stdout.getvalue() + stderr.getvalue())
        return result, stdout.getvalue(), stderr.getvalue()

    def test_reports_to_the_paired_url_with_a_bounded_timeout_and_event_receipt(self):
        result, stdout, stderr = self.run_reporter(
            "--external-id", "fixture-message", "--status", "pending",
            "--url", "https://fixture.example.test/messages/1",
            "--value", "12.5", "--currency", "USD",
            "--metadata", '{"messageId":"fixture-message"}',
        )
        self.assertEqual(result, 0)
        self.assertEqual(stdout.strip(), "Monologue: reported fixture-event")
        self.assertEqual(stderr, "")
        self.keychain.assert_not_called()
        request = self.urlopen.call_args.args[0]
        self.assertEqual(request.full_url, "https://fixture.example.test/api/actions")
        self.assertEqual(request.get_method(), "POST")
        self.assertEqual(request.get_header("Authorization"), "Bearer synthetic-reporter-key")
        self.assertEqual(self.urlopen.call_args.kwargs, {"timeout": 3})
        payload = json.loads(request.data)
        self.assertEqual(payload["agentName"], "Fixture agent")
        self.assertEqual(payload["status"], "pending")
        self.assertEqual(payload["source"], "self_reported")
        self.assertEqual(payload["externalId"], "fixture-message")
        self.assertEqual(payload["value"], 12.5)
        self.assertEqual(payload["metadata"], {"messageId": "fixture-message"})
        self.assertNotIn("agentId", payload)

    def test_reports_duplicate_delivery_with_the_original_event_receipt(self):
        self.urlopen.return_value = io.BytesIO(b'{"success":true,"id":"original-event","duplicate":true}')
        result, stdout, stderr = self.run_reporter("--external-id", "fixture-message")
        self.assertEqual((result, stdout.strip(), stderr), (0, "Monologue: reported original-event", ""))

    def test_missing_key_skips_delivery_without_failing_the_primary_task(self):
        os.environ.pop("MONOLOGUE_API_KEY")
        result, stdout, stderr = self.run_reporter()
        self.assertEqual(result, 0)
        self.assertEqual(stdout, "")
        self.assertIn("skipped", stderr)
        self.urlopen.assert_not_called()

    def test_keychain_fallback_uses_the_configured_instance(self):
        os.environ.pop("MONOLOGUE_API_KEY")
        self.keychain.return_value = "synthetic-reporter-key"
        self.assertEqual(self.run_reporter()[0], 0)
        self.keychain.assert_called_once()
        self.assertEqual(self.urlopen.call_args.args[0].full_url, "https://fixture.example.test/api/actions")

    def test_invalid_metadata_skips_before_network_access(self):
        for metadata in ["{", "[]", '"text"']:
            with self.subTest(metadata=metadata):
                result, stdout, stderr = self.run_reporter("--metadata", metadata)
                self.assertEqual(result, 0)
                self.assertEqual(stdout, "")
                self.assertIn("skipped", stderr)
        self.urlopen.assert_not_called()

    def test_delivery_errors_are_best_effort_and_do_not_claim_success(self):
        for error in [TimeoutError("fixture timeout"), urllib.error.URLError("fixture unavailable"),
                      urllib.error.HTTPError("https://fixture.example.test/api/actions", 401, "Unauthorized", {}, None)]:
            with self.subTest(error=type(error).__name__):
                self.urlopen.side_effect = error
                result, stdout, stderr = self.run_reporter()
                self.assertEqual(result, 0)
                self.assertEqual(stdout, "")
                self.assertIn("skipped", stderr)

    def test_malformed_response_is_not_reported_as_success(self):
        self.urlopen.return_value = io.BytesIO(b"not JSON")
        result, stdout, stderr = self.run_reporter()
        self.assertEqual(result, 0)
        self.assertEqual(stdout, "")
        self.assertIn("skipped", stderr)


if __name__ == "__main__":
    unittest.main()
