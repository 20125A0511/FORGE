import json
import logging
from anthropic import Anthropic
from app.config import settings
from app.schemas.ticket import LLMAnalysisResponse

logger = logging.getLogger(__name__)

class LLMService:
    def __init__(self):
        self.client = Anthropic(api_key=settings.ANTHROPIC_API_KEY) if settings.ANTHROPIC_API_KEY else None
        self.model = settings.ANTHROPIC_MODEL
    
    async def analyze_ticket(self, title: str, description: str, customer_tier: str = "standard") -> LLMAnalysisResponse:
        """Analyze a ticket using Claude to extract severity, skills, time estimate, etc."""
        # If no API key, return a smart fallback based on keyword analysis
        if not self.client:
            return self._fallback_analysis(title, description)
        
        prompt = f"""You are an expert field service management AI. Analyze this service ticket and provide structured analysis.

Ticket Title: {title}
Ticket Description: {description}
Customer Tier: {customer_tier}

Analyze and respond with a JSON object containing:
1. "severity": Priority level (P1=Critical, P2=High, P3=Medium, P4=Low)
   - P1: Service completely down, safety hazard, major revenue impact
   - P2: Degraded service affecting multiple users, equipment malfunction
   - P3: Single user affected, workaround available, scheduled maintenance
   - P4: Cosmetic issues, enhancement requests, non-urgent maintenance
2. "confidence": Your confidence in the severity assessment (0.0-1.0)
3. "equipment_type": Type of equipment mentioned (or null)
4. "category": Service category (HVAC, Plumbing, Electrical, Telecommunications, IT, General Maintenance, etc.)
5. "skills_required": List of specific skills needed (e.g., ["HVAC Repair", "Refrigerant Handling"])
6. "time_estimate_minutes": Estimated time to resolve in minutes
7. "summary": Brief summary of the issue (1-2 sentences)
8. "troubleshooting_steps": List of step-by-step troubleshooting instructions for the field worker

Respond ONLY with valid JSON, no markdown formatting."""

        try:
            message = self.client.messages.create(
                model=self.model,
                max_tokens=1024,
                messages=[{"role": "user", "content": prompt}]
            )
            
            response_text = message.content[0].text
            # Parse JSON from response
            # Try to extract JSON if wrapped in markdown code blocks
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0]
            
            data = json.loads(response_text.strip())
            return LLMAnalysisResponse(**data)
        except Exception as e:
            logger.error(f"LLM analysis failed: {e}")
            return self._fallback_analysis(title, description)
    
    def _fallback_analysis(self, title: str, description: str) -> LLMAnalysisResponse:
        """Rule-based fallback when LLM is unavailable."""
        text = f"{title} {description}".lower()
        
        # Severity detection
        severity = "P3"
        confidence = 0.6
        if any(kw in text for kw in ["emergency", "fire", "flood", "gas leak", "no power", "safety", "hazard", "down", "critical"]):
            severity = "P1"
            confidence = 0.8
        elif any(kw in text for kw in ["not working", "broken", "malfunction", "multiple", "urgent", "failing"]):
            severity = "P2"
            confidence = 0.7
        elif any(kw in text for kw in ["cosmetic", "minor", "enhancement", "when possible", "low priority"]):
            severity = "P4"
            confidence = 0.7
        
        # Category detection
        category = "General Maintenance"
        skills = ["General Maintenance"]
        if any(kw in text for kw in ["hvac", "heating", "cooling", "air condition", "thermostat", "furnace", "refrigerant"]):
            category = "HVAC"
            skills = ["HVAC Repair"]
        elif any(kw in text for kw in ["plumb", "pipe", "leak", "drain", "water", "toilet", "faucet"]):
            category = "Plumbing"
            skills = ["Plumbing"]
        elif any(kw in text for kw in ["electr", "wiring", "outlet", "breaker", "power", "circuit", "light"]):
            category = "Electrical"
            skills = ["Electrical"]
        elif any(kw in text for kw in ["network", "internet", "wifi", "cable", "telecom", "fiber"]):
            category = "Telecommunications"
            skills = ["Telecommunications"]
        elif any(kw in text for kw in ["server", "computer", "software", "printer", "IT"]):
            category = "IT Services"
            skills = ["IT Support"]
        
        # Equipment type detection
        equipment_type = None
        equipment_keywords = {
            "furnace": "Furnace", "boiler": "Boiler", "ac unit": "AC Unit",
            "air conditioner": "AC Unit", "thermostat": "Thermostat",
            "water heater": "Water Heater", "generator": "Generator",
            "elevator": "Elevator", "compressor": "Compressor",
            "router": "Network Router", "server": "Server",
        }
        for kw, eq in equipment_keywords.items():
            if kw in text:
                equipment_type = eq
                break
        
        # Time estimate based on severity
        time_estimates = {"P1": 120, "P2": 90, "P3": 60, "P4": 45}
        
        return LLMAnalysisResponse(
            severity=severity,
            confidence=confidence,
            equipment_type=equipment_type,
            category=category,
            skills_required=skills,
            time_estimate_minutes=time_estimates[severity],
            summary=f"Service request: {title}",
            troubleshooting_steps=[
                "Verify the reported issue on-site",
                "Check equipment model and serial number",
                "Diagnose root cause",
                "Perform necessary repairs or replacements",
                "Test the system after repair",
                "Document findings and actions taken"
            ]
        )

    async def generate_troubleshooting_guide(self, equipment_type: str, problem_description: str) -> list[str]:
        """Generate detailed troubleshooting steps for a specific problem."""
        if not self.client:
            return [
                "Arrive on-site and assess the situation",
                f"Inspect the {equipment_type or 'equipment'}",
                "Identify the root cause of the issue",
                "Perform necessary repairs",
                "Test the repair thoroughly",
                "Document all work performed"
            ]
        
        prompt = f"""You are an expert field service technician. Generate a step-by-step troubleshooting guide.

Equipment: {equipment_type}
Problem: {problem_description}

Provide 6-10 specific, actionable troubleshooting steps. Respond as a JSON array of strings."""
        
        try:
            message = self.client.messages.create(
                model=self.model,
                max_tokens=1024,
                messages=[{"role": "user", "content": prompt}]
            )
            response_text = message.content[0].text
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0]
            return json.loads(response_text.strip())
        except Exception as e:
            logger.error(f"Troubleshooting guide generation failed: {e}")
            return ["Contact dispatch for guidance"]


# Singleton instance
llm_service = LLMService()
