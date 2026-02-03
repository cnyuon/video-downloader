"""
Simple in-memory rate limiter based on IP address.
For production, replace with Redis-based solution.
"""
import time
from collections import defaultdict
from typing import NamedTuple


class RateLimitInfo(NamedTuple):
    allowed: bool
    remaining: int
    reset_time: int  # Unix timestamp when limit resets


class RateLimiter:
    def __init__(self, max_requests: int = 10, window_seconds: int = 86400):
        """
        Initialize rate limiter.
        
        Args:
            max_requests: Maximum requests allowed per window (default: 10)
            window_seconds: Time window in seconds (default: 86400 = 24 hours)
        """
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._requests: dict[str, list[float]] = defaultdict(list)
    
    def check(self, identifier: str) -> RateLimitInfo:
        """
        Check if request is allowed for given identifier (usually IP).
        
        Args:
            identifier: Unique identifier for the client (IP address)
            
        Returns:
            RateLimitInfo with allowed status, remaining requests, and reset time
        """
        now = time.time()
        window_start = now - self.window_seconds
        
        # Clean up old requests outside the window
        self._requests[identifier] = [
            ts for ts in self._requests[identifier] 
            if ts > window_start
        ]
        
        current_count = len(self._requests[identifier])
        remaining = max(0, self.max_requests - current_count)
        
        # Calculate reset time (when the oldest request expires)
        if self._requests[identifier]:
            reset_time = int(self._requests[identifier][0] + self.window_seconds)
        else:
            reset_time = int(now + self.window_seconds)
        
        allowed = current_count < self.max_requests
        
        return RateLimitInfo(
            allowed=allowed,
            remaining=remaining,
            reset_time=reset_time
        )
    
    def record(self, identifier: str) -> None:
        """Record a request for the given identifier."""
        self._requests[identifier].append(time.time())
    
    def get_remaining(self, identifier: str) -> int:
        """Get remaining requests for identifier without recording."""
        return self.check(identifier).remaining


# Global rate limiter instance for downloads
# Set to very high limit (effectively disabled) - enable when needed for traffic management
download_limiter = RateLimiter(max_requests=999999, window_seconds=86400)
