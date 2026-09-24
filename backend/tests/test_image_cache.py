"""The cache must be a hard memory ceiling: the deploy target is 512 MB."""

import pytest

from app.routes import images


@pytest.fixture(autouse=True)
def _reset_cache():
    images._cache.clear()
    images._cache_bytes = 0
    yield
    images._cache.clear()
    images._cache_bytes = 0


def put(key: str, size: int) -> None:
    images._cache_put(key, (b"x" * size, "image/jpeg"))


def test_never_exceeds_the_byte_budget() -> None:
    chunk = 1024 * 1024  # 1 MB, under the per-entry cap
    for i in range(200):  # 200 MB offered into a 64 MB budget
        put(f"k{i}", chunk)
    entries, total = images.cache_stats()
    assert total <= images.CACHE_MAX_BYTES
    assert entries < 200


def test_oversized_bodies_are_never_retained() -> None:
    """A full-resolution download must not evict a gallery's worth of thumbnails."""
    put("thumb", 100_000)
    put("huge", images.CACHE_MAX_ENTRY_BYTES + 1)
    assert "huge" not in images._cache
    assert "thumb" in images._cache


def test_eviction_is_least_recently_used(monkeypatch: pytest.MonkeyPatch) -> None:
    # Shrink the budget rather than use huge entries: anything over
    # CACHE_MAX_ENTRY_BYTES is refused outright and would never be cached.
    monkeypatch.setattr(images, "CACHE_MAX_BYTES", 3 * 1024 * 1024)
    for name in ("a", "b", "c"):
        put(name, 1024 * 1024)
    images._cache_get("a")      # touch 'a' so 'b' is now the oldest
    put("d", 1024 * 1024)       # forces one eviction
    assert "b" not in images._cache
    assert "a" in images._cache
    assert "d" in images._cache


def test_replacing_a_key_does_not_double_count() -> None:
    put("k", 1024 * 1024)
    put("k", 1024 * 1024)
    entries, total = images.cache_stats()
    assert entries == 1
    assert total == 1024 * 1024


def test_accounting_stays_consistent_under_churn() -> None:
    for i in range(500):
        put(f"k{i % 40}", (i % 5 + 1) * 100_000)
    _, total = images.cache_stats()
    assert total == sum(len(body) for body, _ in images._cache.values())
    assert total <= images.CACHE_MAX_BYTES
