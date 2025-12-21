"""
Database utilities for Multiverse MCP Server

Provides connection management and transaction helpers for PostgreSQL.
"""

import os
import psycopg2
import psycopg2.extras
from contextlib import contextmanager
from typing import Optional


def get_db_connection():
    """
    Get a PostgreSQL database connection.
    
    Returns:
        psycopg2.connection: Database connection or None if connection fails
    """
    try:
        conn = psycopg2.connect(
            os.environ['DATABASE_URL'],
        )
        return conn
    except KeyError:
        print("ERROR: DATABASE_URL environment variable not set")
        return None
    except Exception as e:
        print(f"ERROR: Unable to connect to the database: {e}")
        return None


@contextmanager
def db_transaction(cursor_factory=psycopg2.extras.RealDictCursor):
    """
    Context manager for database transactions.
    
    Automatically commits on success, rolls back on exception, and closes resources.
    
    Args:
        cursor_factory: Cursor factory to use (default: RealDictCursor for dict results)
    
    Yields:
        psycopg2.cursor: Database cursor
        
    Example:
        with db_transaction() as cursor:
            cursor.execute("SELECT * FROM students WHERE id = %s", (123,))
            result = cursor.fetchone()
    """
    conn = get_db_connection()
    if not conn:
        raise Exception("Database connection failed")
    
    cursor = None
    try:
        cursor = conn.cursor(cursor_factory=cursor_factory)
        yield cursor
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise
    finally:
        if cursor:
            cursor.close()
        conn.close()


def execute_query(sql: str, params: tuple = None, fetch: str = "all"):
    """
    Execute a query and return results.
    
    Args:
        sql: SQL query to execute
        params: Query parameters (tuple)
        fetch: "all", "one", or "none"
    
    Returns:
        Query results (list of dicts, dict, or None)
    """
    with db_transaction() as cursor:
        cursor.execute(sql, params or ())
        
        if fetch == "all":
            return cursor.fetchall()
        elif fetch == "one":
            return cursor.fetchone()
        elif fetch == "none":
            return None
        else:
            raise ValueError(f"Invalid fetch mode: {fetch}")


