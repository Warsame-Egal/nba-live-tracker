"""
Configuration module for NBA Tracker API.
Handles environment variables and proxy configuration for nba_api.
"""
import os
import logging
from typing import Optional, List
import random

logger = logging.getLogger(__name__)


class ProxyConfig:
    """Manages proxy configuration for nba_api requests."""
    
    def __init__(self):
        """Initialize proxy configuration from environment variables."""
        # Get proxy configuration from environment variable
        # Format: "http://proxy1:port,http://proxy2:port" or single "http://proxy:port"
        proxy_env = os.getenv("NBA_API_PROXY", "")
        
        if proxy_env:
            # Split multiple proxies by comma
            self.proxy_list = [p.strip() for p in proxy_env.split(",") if p.strip()]
        else:
            self.proxy_list = []
    
    def get_proxy(self) -> Optional[str]:
        """
        Get a proxy address. If multiple proxies are configured, randomly select one.
        Returns None if no proxy is configured.
        
        Returns:
            Optional[str]: Proxy URL (e.g., "http://proxy:port") or None
        """
        if not self.proxy_list:
            return None
        
        # If only one proxy, return it
        if len(self.proxy_list) == 1:
            return self.proxy_list[0]
        
        # If multiple proxies, randomly select one for load balancing
        return random.choice(self.proxy_list)
    
    def get_proxies_dict(self) -> Optional[dict]:
        """
        Get proxy configuration as a dict for requests library.
        Returns None if no proxy is configured.
        
        Returns:
            Optional[dict]: Proxy dict in format {"http": "proxy", "https": "proxy"} or None
        """
        proxy = self.get_proxy()
        if not proxy:
            return None
        
        return {
            "http": proxy,
            "https": proxy,
        }


# Global proxy configuration instance
proxy_config = ProxyConfig()


def get_proxy_config() -> ProxyConfig:
    """Get the global proxy configuration instance."""
    return proxy_config


def get_proxy_kwargs() -> dict:
    """
    Get keyword arguments for nba_api endpoints to use proxy.
    Returns empty dict if no proxy is configured.
    
    Returns:
        dict: Keyword arguments with 'proxy' key if proxy is configured
    """
    proxy = proxy_config.get_proxy()
    if proxy:
        logger.debug(f"Using proxy: {proxy}")
        return {"proxy": proxy}
    return {}

