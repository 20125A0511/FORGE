"""Notification service — sends SMS (via Twilio) and logs notifications."""

import logging
from dataclasses import dataclass
from enum import Enum

from app.config import settings
from app.utils.sms import send_sms

logger = logging.getLogger(__name__)


class NotificationType(Enum):
    TICKET_CREATED = "ticket_created"
    TICKET_ASSIGNED = "ticket_assigned"
    WORKER_EN_ROUTE = "worker_en_route"
    WORKER_ARRIVED = "worker_arrived"
    WORK_IN_PROGRESS = "work_in_progress"
    TICKET_COMPLETED = "ticket_completed"
    SLA_WARNING = "sla_warning"
    SCHEDULE_CHANGE = "schedule_change"


@dataclass
class Notification:
    type: NotificationType
    recipient_email: str | None
    recipient_phone: str | None
    title: str
    message: str
    data: dict | None = None


def _tracking_url(tracking_token: str) -> str:
    """Build the customer-facing tracking URL."""
    return f"{settings.FRONTEND_BASE_URL}/portal/track/{tracking_token}"


def _sr_url(ticket_id: int) -> str:
    """Build the technician-facing SR details URL."""
    return f"{settings.FRONTEND_BASE_URL}/portal/sr/{ticket_id}"


class NotificationService:
    """Notification service — sends SMS via Twilio (or logs in dev mode)."""

    async def send_notification(self, notification: Notification) -> bool:
        """Send a notification via SMS and log it."""
        logger.info(
            "[NOTIFICATION] %s -> %s: %s - %s",
            notification.type.value,
            notification.recipient_email or notification.recipient_phone,
            notification.title,
            notification.message,
        )
        # Send SMS if phone number is available
        if notification.recipient_phone:
            await send_sms(notification.recipient_phone, notification.message)
        return True

    # ─── Ticket Created (customer SMS with tracking link) ───────────

    async def notify_ticket_created(self, ticket) -> None:
        """Send SMS to customer when a service request is created."""
        tracking_link = _tracking_url(ticket.tracking_token)
        msg = (
            f"FORGE Service Request #{ticket.id} confirmed!\n\n"
            f"Issue: {ticket.title}\n"
            f"Priority: {ticket.severity}\n\n"
            f"Track your request status and technician live location here:\n"
            f"{tracking_link}\n\n"
            f"A technician will be assigned shortly."
        )
        await self.send_notification(
            Notification(
                type=NotificationType.TICKET_CREATED,
                recipient_email=ticket.customer_email,
                recipient_phone=ticket.customer_phone,
                title="Service Request Created",
                message=msg,
                data={"ticket_id": ticket.id, "tracking_token": ticket.tracking_token},
            )
        )

    # ─── Ticket Assigned (customer + worker SMS) ────────────────────

    async def notify_ticket_assigned(self, ticket, worker) -> None:
        """Send SMS to customer (with tracking link) and worker (with SR link)."""
        tracking_link = _tracking_url(ticket.tracking_token)
        sr_link = _sr_url(ticket.id)

        # Customer SMS
        customer_msg = (
            f"FORGE Update: Technician {worker.name} has been assigned to "
            f"your service request #{ticket.id}!\n\n"
            f"Technician: {worker.name}\n"
            f"Phone: {worker.phone or 'N/A'}\n\n"
            f"Track live status & technician location:\n"
            f"{tracking_link}"
        )
        await self.send_notification(
            Notification(
                type=NotificationType.TICKET_ASSIGNED,
                recipient_email=ticket.customer_email,
                recipient_phone=ticket.customer_phone,
                title="Technician Assigned",
                message=customer_msg,
                data={
                    "ticket_id": ticket.id,
                    "worker_id": worker.id,
                    "worker_name": worker.name,
                },
            )
        )

        # Worker/Technician SMS
        worker_msg = (
            f"FORGE: New assignment! Service Request #{ticket.id}\n\n"
            f"Issue: {ticket.title}\n"
            f"Severity: {ticket.severity}\n"
            f"Customer: {ticket.customer_name or 'N/A'}\n"
            f"Location: {ticket.location_address or 'See details'}\n\n"
            f"View full details:\n{sr_link}"
        )
        await self.send_notification(
            Notification(
                type=NotificationType.TICKET_ASSIGNED,
                recipient_email=worker.email,
                recipient_phone=worker.phone,
                title="New Assignment",
                message=worker_msg,
                data={"ticket_id": ticket.id},
            )
        )

    # ─── Status Change (customer SMS) ───────────────────────────────

    async def notify_status_change(self, ticket, new_status: str) -> None:
        """Notify customer about ticket status change via SMS."""
        tracking_link = _tracking_url(ticket.tracking_token)
        status_messages = {
            "en_route": f"Your technician is on the way! Track live location:\n{tracking_link}",
            "arrived": "Your technician has arrived at your location.",
            "in_progress": "Work is in progress on your service request.",
            "completed": (
                f"Your service request #{ticket.id} has been completed.\n"
                f"Thank you for choosing FORGE!"
            ),
        }
        status_text = status_messages.get(
            new_status, f"Your ticket status has been updated to: {new_status}"
        )
        msg = f"FORGE Update — {status_text}"

        await self.send_notification(
            Notification(
                type=NotificationType.WORK_IN_PROGRESS,
                recipient_email=ticket.customer_email,
                recipient_phone=ticket.customer_phone,
                title=f"Service Update - {new_status.replace('_', ' ').title()}",
                message=msg,
                data={"ticket_id": ticket.id, "status": new_status},
            )
        )


# Singleton
notification_service = NotificationService()
