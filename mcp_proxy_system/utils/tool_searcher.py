"""
Tool Searcher - Dynamic tool discovery system

Based on Anthropic's advanced tool use patterns for minimizing context window usage.
Instead of loading all tools upfront, this allows Claude to search for and load
only the tools needed for the current task.
"""

from typing import List, Dict, Any, Optional
import json


class ToolSearcher:
    """
    Tool discovery system that enables Claude to find relevant tools on-demand.

    This keeps only necessary tool definitions in context (typically 3-5 active tools)
    instead of loading 50+ tool definitions upfront.
    """

    def __init__(self):
        self.tool_catalog = self._build_tool_catalog()

    def _build_tool_catalog(self) -> Dict[str, Dict[str, Any]]:
        """
        Build searchable catalog of all available tools.

        Returns catalog with tool metadata for efficient searching.
        """
        return {
            # ========== REGISTRAR TOOLS ==========
            "registrar": {
                "description": "Student and enrollment management",
                "tools": {
                    "registrar_create_student": {
                        "description": "Create new student account",
                        "tags": ["student", "create", "account", "user"],
                        "use_cases": ["new student signup", "add student", "create account"]
                    },
                    "registrar_update_student": {
                        "description": "Update student information",
                        "tags": ["student", "update", "edit", "modify"],
                        "use_cases": ["change email", "update profile", "edit student"]
                    },
                    "registrar_get_student": {
                        "description": "Get student details by ID or email",
                        "tags": ["student", "get", "fetch", "lookup", "find"],
                        "use_cases": ["find student", "get profile", "student lookup"]
                    },
                    "registrar_list_students": {
                        "description": "List students with filters",
                        "tags": ["student", "list", "search", "filter", "active"],
                        "use_cases": ["all students", "active students", "filter students"]
                    },
                    "registrar_enroll_student": {
                        "description": "Enroll student in a class",
                        "tags": ["enroll", "enrollment", "register", "add to class"],
                        "use_cases": ["enroll student", "add to class", "register for class"]
                    },
                    "registrar_unenroll_student": {
                        "description": "Remove student from a class",
                        "tags": ["unenroll", "remove", "drop", "cancel enrollment"],
                        "use_cases": ["drop class", "remove from class", "cancel enrollment"]
                    },
                    "registrar_get_student_enrollments": {
                        "description": "Get all classes a student is enrolled in",
                        "tags": ["enrollment", "classes", "student schedule"],
                        "use_cases": ["student's classes", "what classes enrolled", "enrollment list"]
                    },
                    "registrar_get_class_roster": {
                        "description": "Get all students in a class",
                        "tags": ["roster", "class list", "enrolled students"],
                        "use_cases": ["class roster", "who's enrolled", "student list for class"]
                    },
                    "registrar_bulk_enroll": {
                        "description": "Enroll multiple students at once",
                        "tags": ["bulk", "multiple", "batch", "enroll many"],
                        "use_cases": ["enroll many students", "batch enrollment", "bulk add"]
                    },
                    "registrar_check_course_access": {
                        "description": "Check if student can access curriculum",
                        "tags": ["access", "permission", "curriculum", "verify"],
                        "use_cases": ["can student access", "check permissions", "verify access"]
                    },
                    "registrar_get_active_students": {
                        "description": "Get all students with active access",
                        "tags": ["active", "current", "valid access"],
                        "use_cases": ["active students", "current students", "who has access"]
                    },
                    "registrar_get_scholarship_students": {
                        "description": "Get all scholarship recipients",
                        "tags": ["scholarship", "free", "recipients"],
                        "use_cases": ["scholarship students", "free access", "scholarship list"]
                    },
                    "registrar_check_enrollment": {
                        "description": "Check if specific student is enrolled in specific class",
                        "tags": ["check", "verify", "is enrolled"],
                        "use_cases": ["is student enrolled", "check enrollment status", "verify enrollment"]
                    }
                }
            },

            # ========== PROGRAM MANAGER TOOLS ==========
            "program_manager": {
                "description": "Class, schedule, and program management",
                "tools": {
                    "pm_create_class": {
                        "description": "Create new class/course",
                        "tags": ["class", "create", "course", "new"],
                        "use_cases": ["new class", "create course", "add class"]
                    },
                    "pm_update_class": {
                        "description": "Update class details",
                        "tags": ["class", "update", "edit", "modify"],
                        "use_cases": ["edit class", "update course", "change class"]
                    },
                    "pm_get_class": {
                        "description": "Get class details",
                        "tags": ["class", "get", "fetch", "details"],
                        "use_cases": ["get class info", "class details", "find class"]
                    },
                    "pm_list_classes": {
                        "description": "List all classes with filters",
                        "tags": ["class", "list", "all", "upcoming"],
                        "use_cases": ["all classes", "upcoming classes", "class list"]
                    },
                    "pm_create_classtime": {
                        "description": "Create single class session",
                        "tags": ["session", "classtime", "schedule", "create"],
                        "use_cases": ["add session", "schedule class", "create meeting"]
                    },
                    "pm_bulk_create_classtimes": {
                        "description": "Create multiple class sessions at once",
                        "tags": ["sessions", "bulk", "schedule", "multiple"],
                        "use_cases": ["weekly schedule", "create all sessions", "batch schedule"]
                    },
                    "pm_list_classtimes": {
                        "description": "Get all sessions for a class",
                        "tags": ["sessions", "schedule", "list", "classtimes"],
                        "use_cases": ["class schedule", "all sessions", "session list"]
                    },
                    "pm_get_next_week_schedule": {
                        "description": "Get classes in next 7 days",
                        "tags": ["upcoming", "next week", "soon", "schedule"],
                        "use_cases": ["next week", "upcoming sessions", "this week's classes"]
                    },
                    "pm_get_schedule_for_date_range": {
                        "description": "Get classes in date range",
                        "tags": ["date range", "period", "schedule", "between"],
                        "use_cases": ["classes in date range", "schedule for month", "between dates"]
                    },
                    "pm_create_class_pricing": {
                        "description": "Create pricing tier for class",
                        "tags": ["pricing", "cost", "price", "create"],
                        "use_cases": ["add pricing", "set price", "create pricing tier"]
                    },
                    "pm_update_class_pricing": {
                        "description": "Update pricing tier",
                        "tags": ["pricing", "update", "edit", "change price"],
                        "use_cases": ["update price", "edit pricing", "change cost"]
                    },
                    "pm_list_class_pricing": {
                        "description": "Get all pricing tiers for class",
                        "tags": ["pricing", "list", "tiers", "costs"],
                        "use_cases": ["get pricing", "list prices", "pricing tiers"]
                    },
                    "pm_generate_registration_email": {
                        "description": "Generate registration email template",
                        "tags": ["email", "registration", "generate", "template"],
                        "use_cases": ["create email", "registration email", "generate template"]
                    },
                    "pm_update_class_registration_email": {
                        "description": "Update registration email template",
                        "tags": ["email", "update", "registration", "template"],
                        "use_cases": ["update email", "edit template", "change email"]
                    },
                    "pm_set_membership": {
                        "description": "Set student membership level and expiration",
                        "tags": ["membership", "set", "level", "expiration"],
                        "use_cases": ["set membership", "membership level", "set expiration"]
                    },
                    "pm_extend_membership": {
                        "description": "Extend membership by days",
                        "tags": ["membership", "extend", "renew", "add days"],
                        "use_cases": ["extend membership", "renew", "add time"]
                    },
                    "pm_grant_scholarship": {
                        "description": "Grant permanent scholarship access",
                        "tags": ["scholarship", "grant", "free", "permanent"],
                        "use_cases": ["grant scholarship", "free access", "scholarship"]
                    },
                    "pm_set_researcher_status": {
                        "description": "Set researcher status",
                        "tags": ["researcher", "status", "set"],
                        "use_cases": ["make researcher", "researcher status", "set researcher"]
                    },
                    "pm_get_expiring_memberships": {
                        "description": "Find memberships expiring soon",
                        "tags": ["membership", "expiring", "soon", "renewal"],
                        "use_cases": ["expiring memberships", "renewals needed", "membership expiration"]
                    },
                    "pm_enrollment_stats": {
                        "description": "Get enrollment statistics",
                        "tags": ["stats", "enrollment", "analytics", "metrics"],
                        "use_cases": ["enrollment stats", "how many enrolled", "enrollment metrics"]
                    },
                    "pm_membership_breakdown": {
                        "description": "Count students by membership level",
                        "tags": ["membership", "breakdown", "count", "stats"],
                        "use_cases": ["membership stats", "member count", "membership breakdown"]
                    },
                    "pm_revenue_report": {
                        "description": "Calculate revenue for time period",
                        "tags": ["revenue", "money", "income", "report"],
                        "use_cases": ["revenue report", "income", "earnings", "financial report"]
                    }
                }
            },

            # ========== STRIPE TOOLS ==========
            "stripe": {
                "description": "Stripe payment and product management",
                "tools": {
                    "stripe_create_product": {
                        "description": "Create Stripe product",
                        "tags": ["stripe", "product", "create", "new"],
                        "use_cases": ["create stripe product", "new product", "add product"]
                    },
                    "stripe_get_product": {
                        "description": "Get Stripe product details",
                        "tags": ["stripe", "product", "get", "fetch"],
                        "use_cases": ["get product", "product details", "find product"]
                    },
                    "stripe_list_products": {
                        "description": "List Stripe products",
                        "tags": ["stripe", "product", "list", "all"],
                        "use_cases": ["list products", "all products", "stripe products"]
                    },
                    "stripe_create_price": {
                        "description": "Create price for Stripe product",
                        "tags": ["stripe", "price", "create", "pricing"],
                        "use_cases": ["create price", "set price", "add pricing"]
                    },
                    "stripe_list_prices": {
                        "description": "List Stripe prices",
                        "tags": ["stripe", "price", "list", "all"],
                        "use_cases": ["list prices", "all prices", "get prices"]
                    },
                    "stripe_create_payment_link": {
                        "description": "Create Stripe payment link",
                        "tags": ["stripe", "payment", "link", "create"],
                        "use_cases": ["create payment link", "payment url", "checkout link"]
                    },
                    "stripe_list_payment_links": {
                        "description": "List Stripe payment links",
                        "tags": ["stripe", "payment", "link", "list"],
                        "use_cases": ["list payment links", "all links", "payment links"]
                    }
                }
            },

            # ========== TOOL SEARCH TOOLS ==========
            "tool_search": {
                "description": "Dynamic tool discovery and search",
                "tools": {
                    "search_tools": {
                        "description": "Search for MCP tools using natural language",
                        "tags": ["search", "find", "discover", "tools", "query"],
                        "use_cases": ["find tools", "search for tool", "what tools available", "discover tools"]
                    },
                    "get_workflow_tools": {
                        "description": "Get pre-defined workflow tool sequences",
                        "tags": ["workflow", "sequence", "process", "steps"],
                        "use_cases": ["enrollment workflow", "class creation workflow", "workflow tools"]
                    },
                    "get_tool_info": {
                        "description": "Get detailed information about a specific tool",
                        "tags": ["tool", "info", "details", "documentation"],
                        "use_cases": ["tool details", "what does tool do", "tool documentation"]
                    },
                    "list_all_tools": {
                        "description": "List all available MCP tools",
                        "tags": ["list", "all", "catalog", "inventory"],
                        "use_cases": ["all tools", "list tools", "available tools", "tool catalog"]
                    },
                    "list_servers": {
                        "description": "List all available MCP servers",
                        "tags": ["servers", "list", "mcp"],
                        "use_cases": ["list servers", "what servers", "available servers"]
                    }
                }
            },

            # ========== PROXY TOOLS ==========
            "proxy": {
                "description": "Hot-reload and dynamic tool calling system",
                "tools": {
                    "list_available_mcp_tools": {
                        "description": "List all MCP tools without loading full definitions",
                        "tags": ["list", "catalog", "tools", "available"],
                        "use_cases": ["list tools", "available tools", "tool catalog"]
                    },
                    "get_tool_usage_guide": {
                        "description": "Get usage instructions for specific tool",
                        "tags": ["guide", "usage", "help", "documentation"],
                        "use_cases": ["how to use tool", "tool guide", "usage instructions"]
                    },
                    "get_workflow_tool_list": {
                        "description": "Get tools needed for specific workflow",
                        "tags": ["workflow", "sequence", "tools", "process"],
                        "use_cases": ["workflow tools", "tools for workflow", "process tools"]
                    },
                    "search_mcp_tools": {
                        "description": "Search MCP tools by natural language",
                        "tags": ["search", "find", "query", "discover"],
                        "use_cases": ["search tools", "find tool", "discover tools"]
                    },
                    "install_mcp_server_from_git": {
                        "description": "Install MCP server from git repository",
                        "tags": ["install", "git", "server", "setup"],
                        "use_cases": ["install server", "add mcp server", "install from git"]
                    },
                    "list_installed_mcp_servers": {
                        "description": "List all installed MCP servers",
                        "tags": ["list", "servers", "installed"],
                        "use_cases": ["list servers", "installed servers", "what servers installed"]
                    },
                    "uninstall_mcp_server": {
                        "description": "Remove an MCP server",
                        "tags": ["uninstall", "remove", "delete", "server"],
                        "use_cases": ["remove server", "uninstall server", "delete server"]
                    },
                    "load_mcp_server_dynamically": {
                        "description": "Hot-reload: Load MCP server without restart",
                        "tags": ["load", "hot-reload", "dynamic", "server", "runtime"],
                        "use_cases": ["load server", "hot reload server", "add server dynamically"]
                    },
                    "call_dynamic_server_tool": {
                        "description": "Call any MCP tool dynamically by name",
                        "tags": ["call", "dynamic", "invoke", "execute", "tool"],
                        "use_cases": ["call tool", "invoke tool", "execute tool", "dynamic tool call"]
                    },
                    "get_loaded_servers": {
                        "description": "Check currently loaded dynamic servers",
                        "tags": ["loaded", "servers", "status", "check"],
                        "use_cases": ["what servers loaded", "check loaded servers", "server status"]
                    },
                    "reload_mcp_server": {
                        "description": "Hot-reload: Reload server after code changes",
                        "tags": ["reload", "refresh", "hot-reload", "update"],
                        "use_cases": ["reload server", "refresh server", "update server"]
                    },
                    "install_and_load_mcp_server": {
                        "description": "Hot-reload: Install from git and load immediately",
                        "tags": ["install", "load", "hot-reload", "git", "immediate"],
                        "use_cases": ["install and load", "quick install", "install immediately"]
                    }
                }
            }
        }

    def search_tools(self, query: str, max_results: int = 5) -> List[Dict[str, Any]]:
        """
        Search for tools matching the query.

        Args:
            query: Natural language search query (e.g., "enroll student in class")
            max_results: Maximum number of tools to return

        Returns:
            List of matching tools with relevance scores
        """
        query_lower = query.lower()
        results = []

        for server_name, server_data in self.tool_catalog.items():
            for tool_name, tool_info in server_data["tools"].items():
                score = 0

                # Check description match
                if any(word in tool_info["description"].lower() for word in query_lower.split()):
                    score += 10

                # Check tags match
                for tag in tool_info["tags"]:
                    if tag in query_lower:
                        score += 5

                # Check use cases match
                for use_case in tool_info["use_cases"]:
                    if use_case in query_lower:
                        score += 15

                # Exact tool name match
                if query_lower in tool_name.lower():
                    score += 20

                if score > 0:
                    results.append({
                        "tool": tool_name,
                        "server": server_name,
                        "description": tool_info["description"],
                        "score": score,
                        "tags": tool_info["tags"]
                    })

        # Sort by score and return top results
        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:max_results]

    def get_tools_for_workflow(self, workflow: str) -> List[str]:
        """
        Get recommended tools for a specific workflow.

        Args:
            workflow: Workflow name (e.g., "enrollment", "class_creation", "revenue")

        Returns:
            List of recommended tool names
        """
        workflows = {
            "enrollment": [
                "registrar_get_student",
                "registrar_get_class_roster",
                "registrar_enroll_student",
                "pm_get_class"
            ],
            "bulk_enrollment": [
                "pm_get_class",
                "registrar_bulk_enroll",
                "registrar_get_class_roster"
            ],
            "class_creation": [
                "pm_create_class",
                "stripe_create_product",
                "stripe_create_price",
                "stripe_create_payment_link",
                "pm_create_class_pricing",
                "pm_bulk_create_classtimes",
                "pm_generate_registration_email"
            ],
            "student_access_audit": [
                "registrar_get_student",
                "registrar_get_student_enrollments",
                "registrar_check_course_access",
                "pm_get_class"
            ],
            "revenue_analysis": [
                "pm_revenue_report",
                "pm_enrollment_stats",
                "pm_membership_breakdown",
                "pm_list_classes"
            ],
            "weekly_schedule": [
                "pm_get_next_week_schedule",
                "pm_get_class",
                "registrar_get_class_roster"
            ]
        }

        return workflows.get(workflow.lower(), [])

    def get_tool_info(self, tool_name: str) -> Optional[Dict[str, Any]]:
        """
        Get detailed information about a specific tool.

        Args:
            tool_name: Name of the tool

        Returns:
            Tool information dict or None if not found
        """
        for server_name, server_data in self.tool_catalog.items():
            if tool_name in server_data["tools"]:
                return {
                    "name": tool_name,
                    "server": server_name,
                    **server_data["tools"][tool_name]
                }
        return None

    def list_all_tools(self) -> List[str]:
        """
        List all available tool names.

        Returns:
            List of all tool names
        """
        tools = []
        for server_data in self.tool_catalog.values():
            tools.extend(server_data["tools"].keys())
        return sorted(tools)
