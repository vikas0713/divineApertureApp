"""Each way of supplying the service account must resolve identically."""

import base64
import json

import pytest

import app.drive as drive
from app.config import Settings, get_settings

# Structurally valid but not a real key: enough to prove the loader picks the
# right source. Signing is exercised against the live account elsewhere.
FAKE = {
    "type": "service_account",
    "project_id": "p",
    "private_key_id": "k",
    "private_key": "-----BEGIN PRIVATE KEY-----\nnot-a-real-key\n-----END PRIVATE KEY-----\n",
    "client_email": "svc@p.iam.gserviceaccount.com",
    "client_id": "1",
    "token_uri": "https://oauth2.googleapis.com/token",
}


@pytest.fixture(autouse=True)
def _isolated_settings(monkeypatch: pytest.MonkeyPatch):
    """Ignore the developer's backend/.env.

    Settings loads it, so monkeypatch.delenv alone cannot unset a variable that
    the file supplies — these tests would then pass or fail depending on whose
    machine they run on.
    """
    monkeypatch.setitem(Settings.model_config, "env_file", None)
    # Settings' required fields, which the ignored .env would otherwise supply.
    monkeypatch.setenv("SUPABASE_URL", "https://test.supabase.co")
    monkeypatch.setenv("SUPABASE_PUBLISHABLE_KEY", "test-publishable")
    get_settings.cache_clear()
    drive._credentials.cache_clear()
    yield
    get_settings.cache_clear()
    drive._credentials.cache_clear()


def test_b64_is_rejected_when_not_valid_base64_json(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GOOGLE_SERVICE_ACCOUNT_B64", "not-base64!!")
    with pytest.raises(drive.DriveError, match="base64"):
        drive._credentials()


def test_json_is_rejected_when_malformed(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("GOOGLE_SERVICE_ACCOUNT_B64", raising=False)
    monkeypatch.setenv("GOOGLE_SERVICE_ACCOUNT_JSON", "{not json")
    with pytest.raises(drive.DriveError, match="valid JSON"):
        drive._credentials()


def test_b64_wins_over_json_and_file(monkeypatch: pytest.MonkeyPatch, tmp_path) -> None:
    """Precedence matters: a stale FILE on a prod box must not shadow B64."""
    winner = {**FAKE, "client_email": "from-b64@p.iam.gserviceaccount.com"}
    monkeypatch.setenv("GOOGLE_SERVICE_ACCOUNT_B64", base64.b64encode(json.dumps(winner).encode()).decode())
    monkeypatch.setenv("GOOGLE_SERVICE_ACCOUNT_JSON", json.dumps(FAKE))
    path = tmp_path / "sa.json"
    path.write_text(json.dumps(FAKE))
    monkeypatch.setenv("GOOGLE_SERVICE_ACCOUNT_FILE", str(path))

    captured = {}
    monkeypatch.setattr(
        drive.service_account.Credentials,
        "from_service_account_info",
        classmethod(lambda cls, info, **kw: captured.update(info) or "creds"),
    )
    assert drive._credentials() == "creds"
    assert captured["client_email"] == "from-b64@p.iam.gserviceaccount.com"


def test_missing_key_file_names_the_deployment_fix(monkeypatch: pytest.MonkeyPatch) -> None:
    """The likeliest production mistake is carrying FILE over from .env.example."""
    monkeypatch.delenv("GOOGLE_SERVICE_ACCOUNT_B64", raising=False)
    monkeypatch.delenv("GOOGLE_SERVICE_ACCOUNT_JSON", raising=False)
    monkeypatch.setenv("GOOGLE_SERVICE_ACCOUNT_FILE", "/nonexistent/service-account.json")
    with pytest.raises(drive.DriveError, match="GOOGLE_SERVICE_ACCOUNT_B64"):
        drive._credentials()


@pytest.mark.parametrize(
    "var",
    [
        "GOOGLE_SERVICE_ACCOUNT_B64",
        "GOOGLE_SERVICE_ACCOUNT_JSON",
        "GOOGLE_SERVICE_ACCOUNT_FILE",
        "GOOGLE_API_KEY",
    ],
)
def test_any_single_credential_satisfies_the_guard(monkeypatch: pytest.MonkeyPatch, var: str) -> None:
    """A B64-only deployment must not be refused before it tries."""
    for name in ("GOOGLE_SERVICE_ACCOUNT_B64", "GOOGLE_SERVICE_ACCOUNT_JSON", "GOOGLE_SERVICE_ACCOUNT_FILE", "GOOGLE_API_KEY"):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv(var, "something")
    assert drive.has_credentials() is True


def test_guard_is_false_with_nothing_configured(monkeypatch: pytest.MonkeyPatch) -> None:
    for name in ("GOOGLE_SERVICE_ACCOUNT_B64", "GOOGLE_SERVICE_ACCOUNT_JSON", "GOOGLE_SERVICE_ACCOUNT_FILE", "GOOGLE_API_KEY"):
        monkeypatch.delenv(name, raising=False)
    assert drive.has_credentials() is False
