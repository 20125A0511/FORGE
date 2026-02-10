#!/usr/bin/env python3
"""
Send one test SMS and print Twilio response + delivery status.
Usage: from backend folder, run:  python scripts/send_test_sms.py
Or with a number:  TO_NUMBER=+13305541987 python scripts/send_test_sms.py
"""
import os
import sys

# Load .env from backend root
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

def main():
    to = os.environ.get("TO_NUMBER", "+13305541987").strip()
    if not to.startswith("+"):
        to = "+1" + to

    account_sid = os.environ.get("TWILIO_ACCOUNT_SID")
    auth_token = os.environ.get("TWILIO_AUTH_TOKEN")
    from_number = os.environ.get("TWILIO_PHONE_NUMBER", "").strip()

    print("Config:")
    print(f"  TWILIO_ACCOUNT_SID: {account_sid[:6]}...{account_sid[-4:] if account_sid else 'MISSING'}")
    print(f"  TWILIO_AUTH_TOKEN: {'***' if auth_token else 'MISSING'}")
    print(f"  TWILIO_PHONE_NUMBER (From): {from_number or 'MISSING'}")
    print(f"  To: {to}")
    print()

    if account_sid and account_sid.startswith("SK"):
        print("WARNING: Your TWILIO_ACCOUNT_SID starts with 'SK' (API Key).")
        print("For Account SID + Auth Token auth, use the main Account SID (starts with 'AC')")
        print("from: https://console.twilio.com/ (first box on dashboard).")
        print()

    if not all([account_sid, auth_token, from_number]):
        print("ERROR: Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER in .env")
        sys.exit(1)

    try:
        from twilio.rest import Client
        client = Client(account_sid, auth_token)
    except Exception as e:
        print(f"ERROR creating Twilio client: {e}")
        sys.exit(1)

    body = "FORGE test: You got this message. Reply STOP to opt out."
    print("Sending SMS...")
    try:
        msg = client.messages.create(body=body, from_=from_number, to=to)
        print(f"Twilio SID: {msg.sid}")
        print(f"Status:     {msg.status}")
        print()
        print("Waiting 5s then re-fetching delivery status...")
        import time
        time.sleep(5)
        msg = client.messages(msg.sid).fetch()
        print(f"Status now:  {msg.status}")
        if msg.error_code:
            print(f"Error code:  {msg.error_code}")
            print(f"Error msg:   {msg.error_message}")
        print()
        print("Full details in Twilio Console:")
        print("  https://console.twilio.com/us1/monitor/logs/sms")
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
