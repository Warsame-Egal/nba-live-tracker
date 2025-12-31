"""
Configuration module for NBA Tracker API.
Handles environment variables and configuration for nba_api.
"""
import os
import logging
from typing import Optional, List
import random

logger = logging.getLogger(__name__)


class ApiConfig:
    """Manages configuration for nba_api requests."""
    
    def __init__(self):
        """Initialize configuration from environment variables."""
        config_env = os.getenv("NBA_API_CONFIG", os.getenv("NBA_API_PROXY", ""))
        
        if config_env:
            self.config_list = [p.strip() for p in config_env.split(",") if p.strip()]
        else:
            self.config_list = []
    
    def get_config(self) -> Optional[str]:
        """Get configuration value. Returns None if not configured."""
        if not self.config_list:
            return None
        
        if len(self.config_list) == 1:
            return self.config_list[0]
        
        return random.choice(self.config_list)
    
    def get_config_dict(self) -> Optional[dict]:
        """Get configuration as a dict for requests library."""
        config = self.get_config()
        if not config:
            return None
        
        return {
            "http": config,
            "https": config,
        }


# Global configuration instance
api_config = ApiConfig()


def get_api_config() -> ApiConfig:
    """Get the global configuration instance."""
    return api_config


def get_api_kwargs() -> dict:
    """Get keyword arguments for nba_api endpoints."""
    config = api_config.get_config()
    if config:
        return {"proxy": config}
    return {}

