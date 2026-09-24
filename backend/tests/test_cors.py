import pytest
from fastapi.testclient import TestClient

from app.main import app

ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.mark.parametrize("origin", ORIGINS)
@pytest.mark.parametrize("method", ["GET", "POST", "PATCH"])
def test_preflight_is_allowed(client: TestClient, origin: str, method: str) -> None:
    """PATCH was missing from allow_methods, so publishing failed only in the browser."""
    response = client.options(
        "/api/admin/events/some-id/status",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": method,
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin


@pytest.mark.parametrize("origin", ORIGINS)
def test_actual_response_carries_cors_headers(client: TestClient, origin: str) -> None:
    response = client.get("/api/health", headers={"Origin": origin})
    assert response.headers["access-control-allow-origin"] == origin


def test_unknown_origin_is_rejected(client: TestClient) -> None:
    response = client.options(
        "/api/admin/events",
        headers={"Origin": "http://evil.example", "Access-Control-Request-Method": "POST"},
    )
    assert "access-control-allow-origin" not in response.headers


@pytest.mark.parametrize(
    "origin",
    [
        "http://localhost:5174",   # Vite's fallback when 5173 is taken
        "http://localhost:5175",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
    ],
)
def test_any_localhost_port_is_allowed_in_development(client: TestClient, origin: str) -> None:
    response = client.options(
        "/api/admin/events",
        headers={"Origin": origin, "Access-Control-Request-Method": "POST"},
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin
