"""
Hashicorp Vault secret manager with environment variable fallback.

Provides the SecretManager class that attempts to retrieve secrets from
Vault (via hvac), with automatic fallback to environment variables (HH_
prefix) when Vault is unavailable or hvac is not installed.
"""

import logging
import os
import time
from functools import lru_cache

logger = logging.getLogger(__name__)


class SecretManager:
    """
    Retrieve secrets from Hashicorp Vault with env-var fallback.

    Caches retrieved secrets in memory with a configurable TTL (default 5 min).
    Gracefully degrades: if hvac is not installed, Vault is unreachable, or
    the path is not found in Vault, falls back to environment variables.
    """

    def __init__(
        self,
        vault_addr: str | None = None,
        vault_token: str | None = None,
        cache_ttl: int = 300,
    ):
        from src.core.config import get_settings

        settings = get_settings()
        self._vault_addr = vault_addr or settings.vault_addr
        self._vault_token = vault_token or settings.vault_token
        self._cache_ttl = cache_ttl
        self._cache: dict[str, tuple[dict, float]] = {}
        self._client = None

    def _get_client(self):
        """Lazy-initialise the hvac client. Returns None if hvac is not installed."""
        if self._client is not None:
            return self._client

        try:
            import hvac  # type: ignore[import-untyped]
        except ImportError:
            logger.warning(
                "hvac package is not installed — Vault integration disabled. "
                "Install with: pip install hvac"
            )
            return None

        if not self._vault_addr or not self._vault_token:
            logger.warning("VAULT_ADDR or VAULT_TOKEN not configured — Vault integration disabled.")
            return None

        try:
            self._client = hvac.Client(url=self._vault_addr, token=self._vault_token)
            if not self._client.is_authenticated():
                logger.warning("Vault client failed to authenticate")
                self._client = None
                return None
            logger.info("Vault client authenticated successfully at %s", self._vault_addr)
        except Exception as exc:
            logger.warning("Failed to initialise Vault client: %s", exc)
            self._client = None

        return self._client

    def _env_fallback(self, path: str) -> dict:
        """
        Fallback: read a secret path from environment variables.

        Converts the Vault secret path to an environment-variable key.
        For example, path='secret/data/hi-hired/db' tries:
        - HH_SECRET_DATA_HI_HIRED_DB (with prefix)
        - SECRET_DATA_HI_HIRED_DB (without prefix)
        - The raw path as a key (e.g., HH_secret/data/hi-hired/db → not valid)

        Returns the stored values as a flat dict, or empty dict if none found.
        """
        normalized = path.replace("/", "_").replace("-", "_").upper()
        result: dict = {}

        # Try with HH_ prefix
        env_key = f"HH_{normalized}"
        if env_key in os.environ:
            logger.debug("Found env fallback: %s", env_key)
            result[env_key] = os.environ[env_key]

        # Also try without prefix
        if normalized in os.environ:
            logger.debug("Found env fallback: %s", normalized)
            result[normalized] = os.environ[normalized]

        # Try generic HH_ prefixed keys that match common patterns
        # e.g., HH_DATABASE_URL, HH_API_KEY, etc.
        if not result:
            # Walk all HH_ env vars for loose matching
            prefix = f"HH_{normalized}"
            for key, value in os.environ.items():
                if key.startswith(prefix):
                    result[key] = value
                    logger.debug("Matched env var: %s", key)

        return result

    def _is_cache_valid(self, path: str) -> bool:
        """Check if the cached entry for *path* is still within its TTL."""
        if path not in self._cache:
            return False
        _, timestamp = self._cache[path]
        return (time.monotonic() - timestamp) < self._cache_ttl

    def get(self, path: str) -> dict:
        """
        Retrieve a secret by Vault path.

        Tries Vault first, falls back to environment variables, and caches
        the result for the configured TTL.

        Args:
            path: Vault secret path (e.g. 'secret/data/hi-hired/db').

        Returns:
            A dict of key-value pairs from the secret, or empty dict on failure.
        """
        # Return cached value if still valid
        if self._is_cache_valid(path):
            logger.debug("Cache hit for path: %s", path)
            data, _ = self._cache[path]
            return data

        # Try Vault
        client = self._get_client()
        if client is not None:
            try:
                response = client.secrets.kv.v2.read_secret_version(path=path, mount_point="secret")
                data = response.get("data", {}).get("data", {})
                if data:
                    self._cache[path] = (data, time.monotonic())
                    logger.info("Retrieved secret from Vault: %s", path)
                    return data
                else:
                    logger.warning("Vault returned empty data for path: %s", path)
            except Exception as exc:
                logger.warning(
                    "Vault read failed for path %s: %s — falling back to env vars",
                    path,
                    exc,
                )

        # Fallback to env vars
        logger.info("Falling back to environment variables for path: %s", path)
        data = self._env_fallback(path)
        if data:
            self._cache[path] = (data, time.monotonic())
        return data

    def invalidate_cache(self, path: str | None = None) -> None:
        """Invalidate the cache for *path*, or the entire cache if *path* is None."""
        if path is None:
            self._cache.clear()
            logger.debug("Secret cache cleared")
        else:
            self._cache.pop(path, None)
            logger.debug("Cache invalidated for path: %s", path)


# Module-level singleton for convenience
_default_manager: SecretManager | None = None


@lru_cache
def get_secret_manager() -> SecretManager:
    """Return the application-wide SecretManager singleton."""
    global _default_manager
    if _default_manager is None:
        _default_manager = SecretManager()
    return _default_manager
