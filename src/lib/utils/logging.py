#!/usr/bin/env python3
"""
Logging Utility for Procheff-v3
Enhanced logging system with structured output and AI integration tracking.
"""

import json
import logging
import sys
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, Optional, Union


class LogLevel(Enum):
    """Log levels for structured logging."""
    DEBUG = "debug"
    INFO = "info"
    WARN = "warn"
    ERROR = "error"
    SUCCESS = "success"


class AILogger:
    """
    Enhanced logger for AI operations and general application logging.
    Compatible with the existing TypeScript AILogger structure.
    """
    
    def __init__(self, 
                 name: str = "procheff",
                 log_file: Optional[str] = None,
                 console_output: bool = True):
        """
        Initialize the logger.
        
        Args:
            name: Logger name
            log_file: Optional log file path
            console_output: Whether to output to console
        """
        self.name = name
        self.console_output = console_output
        
        # Setup Python logging
        self.logger = logging.getLogger(name)
        self.logger.setLevel(logging.DEBUG)
        
        # Clear existing handlers
        self.logger.handlers.clear()
        
        # Console handler
        if console_output:
            console_handler = logging.StreamHandler(sys.stdout)
            console_handler.setFormatter(self._get_formatter())
            self.logger.addHandler(console_handler)
        
        # File handler
        if log_file:
            file_handler = logging.FileHandler(log_file)
            file_handler.setFormatter(self._get_formatter())
            self.logger.addHandler(file_handler)
    
    def _get_formatter(self) -> logging.Formatter:
        """Get logging formatter."""
        return logging.Formatter(
            '%(asctime)s | %(levelname)-7s | %(name)s | %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
    
    def _log_structured(self, 
                       level: LogLevel, 
                       message: str, 
                       context: Optional[Dict[str, Any]] = None) -> None:
        """
        Log with structured format compatible with TypeScript AILogger.
        
        Args:
            level: Log level
            message: Log message
            context: Optional context data
        """
        timestamp = datetime.utcnow().isoformat() + "Z"
        
        log_entry = {
            "timestamp": timestamp,
            "level": level.value,
            "message": message,
            "logger": self.name
        }
        
        if context:
            log_entry["context"] = context
        
        # Console output with colors
        if self.console_output:
            color_map = {
                LogLevel.DEBUG: "\033[90m",    # Gray
                LogLevel.INFO: "\033[94m",     # Blue
                LogLevel.WARN: "\033[93m",     # Yellow
                LogLevel.ERROR: "\033[91m",    # Red
                LogLevel.SUCCESS: "\033[92m",  # Green
            }
            reset = "\033[0m"
            
            color = color_map.get(level, "")
            print(f"{color}[{timestamp}] {level.value.upper()}: {message}{reset}")
            
            if context:
                print(f"{color}Context: {json.dumps(context, indent=2)}{reset}")
        
        # Python logging for file output
        python_level_map = {
            LogLevel.DEBUG: logging.DEBUG,
            LogLevel.INFO: logging.INFO,
            LogLevel.WARN: logging.WARNING,
            LogLevel.ERROR: logging.ERROR,
            LogLevel.SUCCESS: logging.INFO,
        }
        
        self.logger.log(
            python_level_map[level], 
            f"{message} {json.dumps(context) if context else ''}"
        )
    
    def debug(self, message: str, context: Optional[Dict[str, Any]] = None) -> None:
        """Log debug message."""
        self._log_structured(LogLevel.DEBUG, message, context)
    
    def info(self, message: str, context: Optional[Dict[str, Any]] = None) -> None:
        """Log info message."""
        self._log_structured(LogLevel.INFO, message, context)
    
    def warn(self, message: str, context: Optional[Dict[str, Any]] = None) -> None:
        """Log warning message."""
        self._log_structured(LogLevel.WARN, message, context)
    
    def error(self, message: str, context: Optional[Dict[str, Any]] = None) -> None:
        """Log error message."""
        self._log_structured(LogLevel.ERROR, message, context)
    
    def success(self, message: str, context: Optional[Dict[str, Any]] = None) -> None:
        """Log success message."""
        self._log_structured(LogLevel.SUCCESS, message, context)


class AIOperationLogger:
    """
    Specialized logger for AI operations (Claude, Gemini, etc.)
    Tracks tokens, costs, and performance metrics.
    """
    
    def __init__(self, ai_logger: AILogger):
        self.logger = ai_logger
    
    def log_ai_request(self, 
                      provider: str, 
                      model: str, 
                      prompt_tokens: Optional[int] = None,
                      context: Optional[Dict[str, Any]] = None) -> None:
        """Log AI request start."""
        ai_context = {
            "provider": provider,
            "model": model,
            "prompt_tokens": prompt_tokens,
            "operation": "request_start",
            **(context or {})
        }
        
        self.logger.info(f"[AI] Starting {provider} request", ai_context)
    
    def log_ai_response(self, 
                       provider: str, 
                       model: str,
                       completion_tokens: Optional[int] = None,
                       total_tokens: Optional[int] = None,
                       duration_ms: Optional[int] = None,
                       context: Optional[Dict[str, Any]] = None) -> None:
        """Log AI response completion."""
        ai_context = {
            "provider": provider,
            "model": model,
            "completion_tokens": completion_tokens,
            "total_tokens": total_tokens,
            "duration_ms": duration_ms,
            "operation": "response_complete",
            **(context or {})
        }
        
        self.logger.success(f"[AI] Completed {provider} request", ai_context)
    
    def log_ai_error(self, 
                    provider: str, 
                    model: str,
                    error: Union[str, Exception],
                    context: Optional[Dict[str, Any]] = None) -> None:
        """Log AI operation error."""
        error_message = str(error) if isinstance(error, Exception) else error
        
        ai_context = {
            "provider": provider,
            "model": model,
            "error": error_message,
            "operation": "error",
            **(context or {})
        }
        
        self.logger.error(f"[AI] {provider} request failed", ai_context)


# Global logger instance (similar to TypeScript singleton pattern)
_default_logger = AILogger()
_ai_operation_logger = AIOperationLogger(_default_logger)


# Convenience functions for direct usage
def debug(message: str, context: Optional[Dict[str, Any]] = None) -> None:
    """Global debug log function."""
    _default_logger.debug(message, context)


def info(message: str, context: Optional[Dict[str, Any]] = None) -> None:
    """Global info log function."""
    _default_logger.info(message, context)


def warn(message: str, context: Optional[Dict[str, Any]] = None) -> None:
    """Global warning log function."""
    _default_logger.warn(message, context)


def error(message: str, context: Optional[Dict[str, Any]] = None) -> None:
    """Global error log function."""
    _default_logger.error(message, context)


def success(message: str, context: Optional[Dict[str, Any]] = None) -> None:
    """Global success log function."""
    _default_logger.success(message, context)


# AI operation shortcuts
def log_claude_request(model: str, prompt_tokens: Optional[int] = None, 
                      context: Optional[Dict[str, Any]] = None) -> None:
    """Log Claude AI request."""
    _ai_operation_logger.log_ai_request("claude", model, prompt_tokens, context)


def log_claude_response(model: str, completion_tokens: Optional[int] = None,
                       total_tokens: Optional[int] = None,
                       duration_ms: Optional[int] = None,
                       context: Optional[Dict[str, Any]] = None) -> None:
    """Log Claude AI response."""
    _ai_operation_logger.log_ai_response(
        "claude", model, completion_tokens, total_tokens, duration_ms, context
    )


def log_gemini_request(model: str = "gemini-2.0-vision", 
                      context: Optional[Dict[str, Any]] = None) -> None:
    """Log Gemini AI request."""
    _ai_operation_logger.log_ai_request("gemini", model, context=context)


def log_gemini_response(model: str = "gemini-2.0-vision",
                       duration_ms: Optional[int] = None,
                       context: Optional[Dict[str, Any]] = None) -> None:
    """Log Gemini AI response."""
    _ai_operation_logger.log_ai_response("gemini", model, duration_ms=duration_ms, context=context)


def log_ai_error(provider: str, model: str, error: Union[str, Exception],
                context: Optional[Dict[str, Any]] = None) -> None:
    """Log AI operation error."""
    _ai_operation_logger.log_ai_error(provider, model, error, context)


# Configuration function
def configure_logger(name: str = "procheff",
                    log_file: Optional[str] = None,
                    console_output: bool = True) -> AILogger:
    """
    Configure and return a new logger instance.
    
    Args:
        name: Logger name
        log_file: Optional log file path
        console_output: Whether to output to console
        
    Returns:
        Configured AILogger instance
    """
    return AILogger(name, log_file, console_output)


if __name__ == "__main__":
    # Example usage
    logger = configure_logger("test", console_output=True)
    
    logger.info("System started", {"version": "3.0.0"})
    logger.debug("Debug information", {"module": "logging_test"})
    logger.success("Operation completed", {"duration": 1250})
    logger.warn("Potential issue detected", {"memory_usage": "85%"})
    logger.error("Error occurred", {"error_code": 500})
    
    # AI operation examples
    log_claude_request("claude-sonnet-4-20250514", 150, {"task": "cost_analysis"})
    log_claude_response("claude-sonnet-4-20250514", 420, 570, 2340, {"success": True})
    
    log_gemini_request(context={"task": "ocr_processing"})
    log_gemini_response(duration_ms=1800, context={"pages_processed": 3})
    
    log_ai_error("claude", "claude-sonnet-4-20250514", "Rate limit exceeded")