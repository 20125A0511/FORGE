"""AI conversation agent for customer portal. Uses Claude with tools: search_troubleshooting, create_ticket."""

import json
import logging
from typing import Any

from anthropic import Anthropic, APIError
from anthropic import APIConnectionError, APITimeoutError, APIStatusError
from anthropic import BadRequestError as AnthropicBadRequest
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import Customer, Ticket
from app.services import llm_service, notification_service
from app.utils.scoring import calculate_sla_deadline

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a friendly customer support agent for FORGE, a field service management company. Your job is to:

1. **Greet and gather information**: First ask what type of service they need (e.g. HVAC, Plumbing, Electrical, IT, General) and a brief description of the problem.
2. **Offer troubleshooting**: Once you know the equipment type and problem, use the search_troubleshooting tool to get step-by-step troubleshooting steps. Present these clearly to the customer so they can try to fix the issue themselves first.
3. **Create a service request if needed**: If the customer says the troubleshooting didn't work, they need a technician, or they want to schedule a visit, use the create_ticket tool to create a service request. Then confirm the ticket number and severity, and let them know a technician will be assigned shortly.

Be concise and helpful. Use the tools when you have enough information. Always respond in a warm, professional tone. If the user sends a short message like "my AC is not cooling", ask for the service type if unclear, then call search_troubleshooting. If they say "that didn't work" or "I need someone to come out", call create_ticket."""

TOOLS = [
    {
        "name": "search_troubleshooting",
        "description": "Search for step-by-step troubleshooting instructions for an equipment problem. Call this when the customer has described their problem and you want to offer self-service fixes before creating a service request.",
        "input_schema": {
            "type": "object",
            "properties": {
                "equipment_type": {
                    "type": "string",
                    "description": "Type of equipment (e.g. AC unit, water heater, thermostat, electrical panel)",
                },
                "problem_description": {
                    "type": "string",
                    "description": "Brief description of the problem",
                },
            },
            "required": ["problem_description"],
        },
    },
    {
        "name": "create_ticket",
        "description": "Create a service request (ticket) so a technician can be dispatched. Use this when the customer has tried troubleshooting, or explicitly asks for a technician or visit.",
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Short title for the service request"},
                "description": {
                    "type": "string",
                    "description": "Full description of the problem and what was tried",
                },
                "equipment_type": {"type": "string", "description": "Type of equipment if known"},
                "category": {
                    "type": "string",
                    "description": "Service category: HVAC, Plumbing, Electrical, Telecommunications, IT Services, General Maintenance",
                },
            },
            "required": ["title", "description"],
        },
    },
]


class ConversationAgent:
    """Orchestrates chat with Claude and tool execution (troubleshooting, create ticket)."""

    def __init__(self):
        self.client = (
            Anthropic(api_key=settings.ANTHROPIC_API_KEY)
            if settings.ANTHROPIC_API_KEY
            else None
        )
        self.model = settings.ANTHROPIC_MODEL

    async def reply(
        self,
        *,
        messages: list[dict],
        customer: Customer,
        db: AsyncSession,
    ) -> tuple[str, dict | None]:
        """
        Process the conversation and return (assistant_text_reply, metadata).
        metadata may include ticket_id, severity, etc. if a ticket was created.
        """
        if not self.client:
            return self._fallback_reply(messages, customer)

        api_messages: list[dict] = []
        for m in messages:
            role = m.get("role")
            content = m.get("content", "")
            if isinstance(content, list):
                # Already blocks
                api_messages.append({"role": role, "content": content})
            else:
                api_messages.append({"role": role, "content": str(content)})

        metadata: dict | None = None
        max_rounds = 5
        round_ = 0

        while round_ < max_rounds:
            round_ += 1
            try:
                response = self.client.messages.create(
                    model=self.model,
                    max_tokens=1024,
                    system=SYSTEM_PROMPT,
                    messages=api_messages,
                    tools=TOOLS,
                )
            except (APIError, APIConnectionError, APITimeoutError) as e:
                logger.warning("Anthropic API error (%s), using fallback: %s", type(e).__name__, e)
                return self._fallback_reply(messages, customer)

            # Collect text from response (SDK returns Pydantic objects, not dicts)
            text_parts: list[str] = []
            tool_uses = []

            for block in response.content:
                if getattr(block, "type", None) == "text":
                    text_parts.append(getattr(block, "text", ""))
                elif getattr(block, "type", None) == "tool_use":
                    tool_uses.append(block)

            # If we have text and no tool use, we're done
            if not tool_uses:
                return (" ".join(text_parts)).strip() or "How can I help you today?", metadata

            # Serialize response content for api_messages (convert Pydantic → dicts)
            serialized_content = []
            for block in response.content:
                if hasattr(block, "model_dump"):
                    serialized_content.append(block.model_dump())
                else:
                    serialized_content.append(block)
            api_messages.append(
                {"role": "assistant", "content": serialized_content}
            )

            # Execute each tool and build tool results
            tool_results: list[dict] = []
            for tu in tool_uses:
                tool_id = getattr(tu, "id", "")
                name = getattr(tu, "name", "")
                inp = getattr(tu, "input", {}) or {}
                try:
                    result = await self._run_tool(
                        name=name,
                        inp=inp,
                        customer=customer,
                        db=db,
                    )
                    if result.get("ticket_created"):
                        metadata = result
                    tool_results.append(
                        {"type": "tool_result", "tool_use_id": tool_id, "content": json.dumps(result)}
                    )
                except Exception as e:
                    logger.exception("Tool execution failed: %s", e)
                    tool_results.append(
                        {
                            "type": "tool_result",
                            "tool_use_id": tool_id,
                            "content": json.dumps({"error": str(e)}),
                            "is_error": True,
                        }
                    )

            # Append user message with tool results
            api_messages.append({"role": "user", "content": tool_results})

        # If we exited after max rounds with text, return it
        return (" ".join(text_parts)).strip() or "I've completed the actions. Is there anything else?", metadata

    async def _run_tool(
        self,
        name: str,
        inp: dict,
        customer: Customer,
        db: AsyncSession,
    ) -> dict[str, Any]:
        """Execute one tool and return a JSON-serializable result."""
        if name == "search_troubleshooting":
            equipment = inp.get("equipment_type") or "equipment"
            problem = inp.get("problem_description", "unknown issue")
            steps = await llm_service.generate_troubleshooting_guide(
                equipment_type=str(equipment),
                problem_description=str(problem),
            )
            return {
                "success": True,
                "equipment_type": equipment,
                "problem": problem,
                "troubleshooting_steps": steps,
            }

        if name == "create_ticket":
            title = inp.get("title", "Service request from portal")
            description = inp.get("description", "")
            equipment_type = inp.get("equipment_type")
            category = inp.get("category")

            analysis = await llm_service.analyze_ticket(
                title=title,
                description=description,
                customer_tier=customer.tier or "standard",
            )
            ticket = Ticket(
                title=title,
                description=description,
                raw_description=description,
                equipment_type=equipment_type or analysis.equipment_type,
                category=category or analysis.category,
                severity=analysis.severity,
                status="open",
                skills_required=analysis.skills_required,
                time_estimate_minutes=analysis.time_estimate_minutes,
                llm_analysis=analysis.model_dump(),
                confidence_score=analysis.confidence,
                sla_deadline=calculate_sla_deadline(analysis.severity),
                customer_id=customer.id,
                customer_name=customer.name,
                customer_email=customer.email,
                customer_phone=customer.phone,
            )
            db.add(ticket)
            await db.flush()
            await db.refresh(ticket)

            # Send SMS notification to customer with tracking link
            try:
                await notification_service.notify_ticket_created(ticket)
            except Exception as e:
                logger.warning("Failed to send ticket creation SMS: %s", e)

            return {
                "success": True,
                "ticket_created": True,
                "ticket_id": ticket.id,
                "ticket_severity": ticket.severity,
                "ticket_status": ticket.status,
                "tracking_token": ticket.tracking_token,
                "message": f"Service request #{ticket.id} created with priority {ticket.severity}. A technician will be assigned shortly.",
            }

        return {"success": False, "error": f"Unknown tool: {name}"}

    def _fallback_reply(self, messages: list[dict], customer: Customer) -> tuple[str, dict | None]:
        """When Claude is not configured, return a simple fallback."""
        last = next((m for m in reversed(messages) if m.get("role") == "user"), None)
        content = (last.get("content") or "").strip() if last else ""
        if not content:
            return "Hi! I'm FORGE support. What service do you need? (e.g. HVAC, Plumbing, Electrical) Describe your issue and I'll try to help.", None
        lower = content.lower()
        if "ticket" in lower or "technician" in lower or "come out" in lower or "visit" in lower:
            return "To create a service request, please use the main FORGE portal or contact support. (AI tools are not configured in this environment.)", None
        return "Thanks for the details. Try checking the equipment power and connections first. If the issue persists, say 'I need a technician' and we can create a service request for you.", None


conversation_agent = ConversationAgent()
