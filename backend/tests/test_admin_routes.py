import pytest
from fastapi.testclient import TestClient

from app.dependencies import AuthenticatedUser, get_current_user
from app.main import app

ADMIN_PATHS = [
    ("get", "/api/admin/events"),
    ("get", "/api/admin/events/some-id"),
    ("post", "/api/admin/events"),
]


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def as_client_role():
    app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(
        id="user-1", email="viewer@example.com", role="client"
    )
    yield
    app.dependency_overrides.clear()


@pytest.mark.parametrize("method,path", ADMIN_PATHS)
def test_requires_a_bearer_token(client: TestClient, method: str, path: str) -> None:
    assert client.request(method, path).status_code == 401


@pytest.mark.parametrize("method,path", ADMIN_PATHS)
def test_client_role_is_forbidden(client: TestClient, as_client_role, method: str, path: str) -> None:
    assert client.request(method, path, json={"title": "A shoot"}).status_code == 403


@pytest.fixture
def as_superadmin():
    app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(
        id="user-0", email="studio@example.com", role="superadmin"
    )
    yield
    app.dependency_overrides.clear()


def test_rejects_unsupported_storage_type(client: TestClient, as_superadmin) -> None:
    response = client.post(
        "/api/admin/events",
        json={"title": "A shoot", "storage_type": "dropbox"},
    )
    assert response.status_code == 422
    assert "Google Drive" in response.json()["detail"]


def test_rejects_unparseable_drive_link(client: TestClient, as_superadmin) -> None:
    response = client.post(
        "/api/admin/events",
        json={"title": "A shoot", "storage_url": "https://example.com/not-drive"},
    )
    assert response.status_code == 422
    assert "Google Drive folder link" in response.json()["detail"]


def test_rejects_unknown_fields(client: TestClient, as_superadmin) -> None:
    response = client.post(
        "/api/admin/events",
        json={"title": "A shoot", "status": "published"},
    )
    assert response.status_code == 422
