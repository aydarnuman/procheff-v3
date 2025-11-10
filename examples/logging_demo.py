#!/usr/bin/env python3
"""
Example usage of the logging utility for Procheff-v3
Demonstrates various logging patterns and AI operation tracking.
"""

import time
import sys
import os

# Add the src directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from lib.utils.logging import (
    AILogger, 
    configure_logger,
    info, debug, warn, error, success,
    log_claude_request, log_claude_response,
    log_gemini_request, log_gemini_response,
    log_ai_error
)


def demo_basic_logging():
    """Demonstrate basic logging functionality."""
    print("\n=== Basic Logging Demo ===")
    
    # Using global functions
    info("Application starting up", {"version": "3.0.0", "environment": "development"})
    debug("Loading configuration", {"config_file": "app.json"})
    success("Database connected", {"host": "localhost", "database": "procheff"})
    warn("High memory usage detected", {"usage_percent": 87})
    error("Failed to connect to Redis", {"error": "Connection timeout"})


def demo_custom_logger():
    """Demonstrate custom logger configuration."""
    print("\n=== Custom Logger Demo ===")
    
    # Create a custom logger for a specific module
    api_logger = configure_logger(
        name="api_handler",
        log_file="logs/api.log",
        console_output=True
    )
    
    api_logger.info("API request received", {
        "method": "POST",
        "endpoint": "/api/ai/cost-analysis",
        "user_id": "user_123",
        "request_size": 1024
    })
    
    api_logger.success("API response sent", {
        "status_code": 200,
        "response_time_ms": 450,
        "tokens_used": 250
    })


def demo_ai_operations():
    """Demonstrate AI operation logging."""
    print("\n=== AI Operations Demo ===")
    
    # Claude operation simulation
    print("Simulating Claude AI operation...")
    
    log_claude_request(
        model="claude-sonnet-4-20250514",
        prompt_tokens=150,
        context={
            "task": "cost_analysis",
            "file_name": "menu_sample.csv",
            "user_id": "user_123"
        }
    )
    
    # Simulate processing time
    time.sleep(0.5)
    
    log_claude_response(
        model="claude-sonnet-4-20250514",
        completion_tokens=420,
        total_tokens=570,
        duration_ms=2340,
        context={
            "success": True,
            "analysis_type": "detailed",
            "cost_calculated": 15750.50
        }
    )
    
    # Gemini OCR operation simulation
    print("Simulating Gemini Vision OCR operation...")
    
    log_gemini_request(context={
        "task": "ocr_processing",
        "file_name": "tender_document.pdf",
        "text_density": 0.15
    })
    
    time.sleep(0.3)
    
    log_gemini_response(
        duration_ms=1800,
        context={
            "pages_processed": 3,
            "text_extracted": 2847,
            "confidence": 0.94
        }
    )


def demo_error_scenarios():
    """Demonstrate error logging scenarios."""
    print("\n=== Error Scenarios Demo ===")
    
    # API rate limit error
    log_ai_error(
        provider="claude",
        model="claude-sonnet-4-20250514",
        error="Rate limit exceeded: 60 requests per minute",
        context={
            "retry_after": 15,
            "request_count": 61
        }
    )
    
    # Gemini quota error
    log_ai_error(
        provider="gemini",
        model="gemini-2.0-vision",
        error="Quota exceeded for OCR operations",
        context={
            "daily_quota": 1000,
            "used_quota": 1000
        }
    )
    
    # General application error
    error("Database transaction failed", {
        "operation": "insert_analysis_result",
        "table": "analysis_logs",
        "error_code": "23505",
        "constraint": "unique_analysis_id"
    })


def demo_pipeline_logging():
    """Demonstrate pipeline operation logging."""
    print("\n=== Pipeline Logging Demo ===")
    
    pipeline_logger = configure_logger("pipeline_orchestrator")
    
    # Pipeline start
    pipeline_logger.info("Pipeline execution started", {
        "pipeline_id": "pipe_001",
        "steps": ["upload", "parse", "analyze", "decide", "report"],
        "estimated_duration": "45s"
    })
    
    # Step completion
    pipeline_logger.success("Step completed: File Upload", {
        "step": 1,
        "duration_ms": 1200,
        "file_size": 2048,
        "file_hash": "sha256:abc123..."
    })
    
    pipeline_logger.success("Step completed: Menu Parsing", {
        "step": 2,
        "duration_ms": 850,
        "items_parsed": 45,
        "categories_found": 8
    })
    
    # Warning during analysis
    pipeline_logger.warn("High cost detected in analysis", {
        "step": 3,
        "estimated_cost": 25000,
        "budget_limit": 20000,
        "risk_level": "high"
    })
    
    # Pipeline completion
    pipeline_logger.success("Pipeline execution completed", {
        "pipeline_id": "pipe_001",
        "total_duration_ms": 42300,
        "steps_completed": 5,
        "final_decision": "Dikkatli Katıl",
        "confidence": 0.78
    })


def demo_batch_processing():
    """Demonstrate batch processing logging."""
    print("\n=== Batch Processing Demo ===")
    
    batch_logger = configure_logger("batch_processor")
    
    batch_logger.info("Batch processing started", {
        "batch_id": "batch_20251110_001",
        "total_files": 12,
        "max_concurrent": 3
    })
    
    # Processing multiple files
    for i in range(3):
        batch_logger.info(f"Processing file {i+1}", {
            "file_name": f"tender_{i+1}.pdf",
            "file_size_kb": 1024 + (i * 512),
            "worker_id": f"worker_{i+1}"
        })
        
        time.sleep(0.1)  # Simulate processing
        
        if i == 1:  # Simulate one failure
            batch_logger.error(f"File {i+1} processing failed", {
                "error": "Invalid PDF format",
                "retry_count": 3,
                "max_retries": 3
            })
        else:
            batch_logger.success(f"File {i+1} processed successfully", {
                "processing_time_ms": 3500 + (i * 200),
                "analysis_result": "completed"
            })
    
    batch_logger.info("Batch processing completed", {
        "batch_id": "batch_20251110_001",
        "total_processed": 12,
        "successful": 11,
        "failed": 1,
        "total_duration_ms": 125000
    })


if __name__ == "__main__":
    print("🚀 Procheff-v3 Logging Utility Demo")
    print("=" * 50)
    
    # Run all demos
    demo_basic_logging()
    demo_custom_logger()
    demo_ai_operations()
    demo_error_scenarios()
    demo_pipeline_logging()
    demo_batch_processing()
    
    print("\n✅ All logging demos completed!")
    print("\nExample usage patterns:")
    print("1. Basic logging: info(), debug(), success(), warn(), error()")
    print("2. AI operations: log_claude_request(), log_claude_response()")
    print("3. Custom loggers: configure_logger() for specific modules")
    print("4. Structured context: Pass dictionaries for rich logging data")