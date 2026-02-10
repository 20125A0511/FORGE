"""Seed the FORGE database with realistic demo data.

Run with:  python -m seed_data
"""

import random
from datetime import datetime, time, timedelta, timezone

from sqlalchemy.orm import Session

from app.database import Base, sync_engine
from app.models import Assignment, Customer, Ticket, Worker
from app.utils.scoring import calculate_sla_deadline


def seed():
    """Insert demo data into the database (idempotent)."""
    # Create tables
    Base.metadata.create_all(sync_engine)

    with Session(sync_engine) as session:
        # Check if data already exists
        existing_customers = session.query(Customer).count()
        if existing_customers > 0:
            print("Database already seeded. Skipping.")
            return

        print("Seeding database with demo data...")

        # ── Customers ────────────────────────────────────────────────
        customers = [
            Customer(
                name="Austin Medical Center",
                email="facilities@austinmedical.com",
                phone="(512) 555-0101",
                company="Austin Medical Center",
                address="1400 N IH-35, Austin, TX 78701",
                location_lat=30.2785,
                location_lng=-97.7260,
                tier="enterprise",
                notes="24/7 facility, priority SLA contract. Contact Jim Reed for after-hours access.",
            ),
            Customer(
                name="Hill Country Mall",
                email="maintenance@hillcountrymall.com",
                phone="(512) 555-0202",
                company="Hill Country Mall Management",
                address="12700 Hill Country Blvd, Bee Cave, TX 78738",
                location_lat=30.3080,
                location_lng=-97.9395,
                tier="premium",
                notes="Large commercial property. Multiple HVAC units. Loading dock access at rear.",
            ),
            Customer(
                name="Riverside Apartments",
                email="manager@riversideapts.com",
                phone="(512) 555-0303",
                company="Riverside Property Group",
                address="1200 Riverside Dr, Austin, TX 78741",
                location_lat=30.2430,
                location_lng=-97.7280,
                tier="standard",
                notes="200-unit apartment complex. On-site manager Mon-Fri 9am-5pm.",
            ),
            Customer(
                name="TechHub Austin",
                email="ops@techhubaustin.io",
                phone="(512) 555-0404",
                company="TechHub Coworking Inc.",
                address="600 Congress Ave, Austin, TX 78701",
                location_lat=30.2672,
                location_lng=-97.7431,
                tier="premium",
                notes="Coworking space, 3 floors. Server room on 2nd floor. Key card required.",
            ),
            Customer(
                name="Lone Star Elementary School",
                email="admin@lonestarisd.edu",
                phone="(512) 555-0505",
                company="Lone Star ISD",
                address="8500 Burnet Rd, Austin, TX 78757",
                location_lat=30.3580,
                location_lng=-97.7370,
                tier="standard",
                notes="School hours 7am-4pm. All work requires background check clearance.",
            ),
            Customer(
                name="Barton Creek Resort & Spa",
                email="engineering@bartoncreekresort.com",
                phone="(512) 555-0606",
                company="Barton Creek Resort",
                address="8212 Barton Club Dr, Austin, TX 78735",
                location_lat=30.2910,
                location_lng=-97.8510,
                tier="enterprise",
                notes="Luxury resort, guest-facing areas require discreet service. 24/7 engineering on-site.",
            ),
            Customer(
                name="Central Texas Food Bank",
                email="facilities@ctfoodbank.org",
                phone="(512) 555-0707",
                company="Central Texas Food Bank",
                address="6500 Metropolis Dr, Austin, TX 78744",
                location_lat=30.2050,
                location_lng=-97.7420,
                tier="standard",
                notes="Non-profit. Large refrigeration units critical for food storage. Budget-conscious.",
            ),
        ]
        session.add_all(customers)
        session.flush()
        print(f"  Created {len(customers)} customers")

        # ── Workers ──────────────────────────────────────────────────
        workers = [
            Worker(
                name="Marcus Johnson",
                email="marcus.johnson@forge-service.com",
                phone="(512) 555-1001",
                skills=["HVAC Repair", "Refrigerant Handling", "Thermostat Installation", "Ductwork"],
                certifications=["EPA 608 Universal", "NATE Certified"],
                skill_level="senior",
                current_lat=30.2950,
                current_lng=-97.7500,
                availability_status="available",
                shift_start=time(7, 0),
                shift_end=time(16, 0),
                max_tickets_per_day=6,
                performance_rating=4.8,
                total_completed=342,
                first_time_fix_rate=0.92,
                avg_resolution_minutes=55.0,
                service_areas=["North Austin", "Downtown", "Cedar Park"],
                tools_inventory=["Refrigerant gauges", "Multimeter", "Vacuum pump", "Leak detector"],
            ),
            Worker(
                name="Sarah Chen",
                email="sarah.chen@forge-service.com",
                phone="(512) 555-1002",
                skills=["Electrical", "IT Support", "Network Installation", "Security Systems"],
                certifications=["Licensed Electrician", "CompTIA A+", "BICSI Certified"],
                skill_level="senior",
                current_lat=30.2680,
                current_lng=-97.7430,
                availability_status="available",
                shift_start=time(8, 0),
                shift_end=time(17, 0),
                max_tickets_per_day=7,
                performance_rating=4.9,
                total_completed=287,
                first_time_fix_rate=0.95,
                avg_resolution_minutes=45.0,
                service_areas=["Downtown", "East Austin", "South Austin"],
                tools_inventory=["Wire strippers", "Cable tester", "Multimeter", "Laptop", "Crimping tool"],
            ),
            Worker(
                name="Diego Rodriguez",
                email="diego.rodriguez@forge-service.com",
                phone="(512) 555-1003",
                skills=["Plumbing", "Pipe Fitting", "Water Heater Repair", "Drain Cleaning"],
                certifications=["Master Plumber License", "Backflow Prevention Certified"],
                skill_level="senior",
                current_lat=30.2340,
                current_lng=-97.7700,
                availability_status="available",
                shift_start=time(6, 0),
                shift_end=time(15, 0),
                max_tickets_per_day=5,
                performance_rating=4.7,
                total_completed=410,
                first_time_fix_rate=0.88,
                avg_resolution_minutes=70.0,
                service_areas=["South Austin", "Buda", "Kyle", "Downtown"],
                tools_inventory=["Pipe wrench set", "Snake/Auger", "PEX tools", "Torch kit", "Camera scope"],
            ),
            Worker(
                name="Aisha Patel",
                email="aisha.patel@forge-service.com",
                phone="(512) 555-1004",
                skills=["HVAC Repair", "Electrical", "General Maintenance", "Thermostat Installation"],
                certifications=["EPA 608 Type II", "OSHA 30"],
                skill_level="intermediate",
                current_lat=30.3500,
                current_lng=-97.7200,
                availability_status="available",
                shift_start=time(8, 0),
                shift_end=time(17, 0),
                max_tickets_per_day=8,
                performance_rating=4.5,
                total_completed=156,
                first_time_fix_rate=0.85,
                avg_resolution_minutes=65.0,
                service_areas=["North Austin", "Round Rock", "Pflugerville"],
                tools_inventory=["Multimeter", "Refrigerant gauges", "Basic hand tools"],
            ),
            Worker(
                name="Tommy Williams",
                email="tommy.williams@forge-service.com",
                phone="(512) 555-1005",
                skills=["Telecommunications", "Network Installation", "Fiber Optics", "Cable Management"],
                certifications=["BICSI RCDD", "Fiber Optic Certified"],
                skill_level="expert",
                current_lat=30.2700,
                current_lng=-97.7600,
                availability_status="busy",
                shift_start=time(7, 0),
                shift_end=time(16, 0),
                max_tickets_per_day=5,
                performance_rating=4.6,
                total_completed=198,
                first_time_fix_rate=0.91,
                avg_resolution_minutes=80.0,
                service_areas=["Downtown", "Domain", "East Austin"],
                tools_inventory=["OTDR", "Fusion splicer", "Cable tester", "Tone generator", "Punch-down tool"],
            ),
            Worker(
                name="Rachel Kim",
                email="rachel.kim@forge-service.com",
                phone="(512) 555-1006",
                skills=["General Maintenance", "Plumbing", "Painting", "Drywall Repair"],
                certifications=["OSHA 10"],
                skill_level="intermediate",
                current_lat=30.3200,
                current_lng=-97.6900,
                availability_status="available",
                shift_start=time(8, 0),
                shift_end=time(17, 0),
                max_tickets_per_day=10,
                performance_rating=4.3,
                total_completed=89,
                first_time_fix_rate=0.82,
                avg_resolution_minutes=50.0,
                service_areas=["East Austin", "Manor", "Pflugerville"],
                tools_inventory=["Basic hand tools", "Drill", "Paint supplies", "Plunger", "Drywall kit"],
            ),
            Worker(
                name="James O'Brien",
                email="james.obrien@forge-service.com",
                phone="(512) 555-1007",
                skills=["Electrical", "Generator Repair", "Lighting Systems", "Panel Upgrades"],
                certifications=["Master Electrician License", "OSHA 30"],
                skill_level="expert",
                current_lat=30.2200,
                current_lng=-97.8000,
                availability_status="available",
                shift_start=time(6, 0),
                shift_end=time(15, 0),
                max_tickets_per_day=5,
                performance_rating=4.9,
                total_completed=520,
                first_time_fix_rate=0.96,
                avg_resolution_minutes=50.0,
                service_areas=["South Austin", "Westlake", "Bee Cave", "Lakeway"],
                tools_inventory=["Multimeter", "Clamp meter", "Wire strippers", "Conduit bender", "Megger"],
            ),
            Worker(
                name="Maria Santos",
                email="maria.santos@forge-service.com",
                phone="(512) 555-1008",
                skills=["IT Support", "Network Installation", "Security Systems", "Access Control"],
                certifications=["CompTIA Network+", "CompTIA Security+", "Cisco CCNA"],
                skill_level="senior",
                current_lat=30.3900,
                current_lng=-97.7300,
                availability_status="on_break",
                shift_start=time(9, 0),
                shift_end=time(18, 0),
                max_tickets_per_day=6,
                performance_rating=4.7,
                total_completed=175,
                first_time_fix_rate=0.93,
                avg_resolution_minutes=55.0,
                service_areas=["Round Rock", "North Austin", "Cedar Park", "Georgetown"],
                tools_inventory=["Laptop", "Cable tester", "Crimping tool", "WiFi analyzer", "KVM switch"],
            ),
            Worker(
                name="Carlos Mendez",
                email="carlos.mendez@forge-service.com",
                phone="(512) 555-1009",
                skills=["HVAC Repair", "Refrigerant Handling", "Commercial HVAC", "Chiller Systems"],
                certifications=["EPA 608 Universal", "NATE Certified", "ASHRAE Certified"],
                skill_level="expert",
                current_lat=30.2500,
                current_lng=-97.8300,
                availability_status="available",
                shift_start=time(6, 0),
                shift_end=time(15, 0),
                max_tickets_per_day=4,
                performance_rating=4.8,
                total_completed=450,
                first_time_fix_rate=0.94,
                avg_resolution_minutes=90.0,
                service_areas=["Westlake", "Bee Cave", "Downtown", "South Austin"],
                tools_inventory=["Refrigerant gauges", "Recovery machine", "Vacuum pump", "Psychrometer", "Combustion analyzer"],
            ),
            Worker(
                name="Lisa Nguyen",
                email="lisa.nguyen@forge-service.com",
                phone="(512) 555-1010",
                skills=["General Maintenance", "HVAC Repair", "Electrical", "Plumbing"],
                certifications=["EPA 608 Type I", "OSHA 10"],
                skill_level="junior",
                current_lat=30.3100,
                current_lng=-97.7550,
                availability_status="available",
                shift_start=time(8, 0),
                shift_end=time(17, 0),
                max_tickets_per_day=8,
                performance_rating=4.1,
                total_completed=42,
                first_time_fix_rate=0.78,
                avg_resolution_minutes=75.0,
                service_areas=["North Austin", "Downtown", "East Austin"],
                tools_inventory=["Basic hand tools", "Multimeter", "Drill"],
            ),
            Worker(
                name="Robert Jackson",
                email="robert.jackson@forge-service.com",
                phone="(512) 555-1011",
                skills=["Plumbing", "General Maintenance", "Water Heater Repair"],
                certifications=["Journeyman Plumber License"],
                skill_level="intermediate",
                current_lat=30.2100,
                current_lng=-97.7550,
                availability_status="off_duty",
                shift_start=time(7, 0),
                shift_end=time(16, 0),
                max_tickets_per_day=7,
                performance_rating=4.4,
                total_completed=201,
                first_time_fix_rate=0.86,
                avg_resolution_minutes=60.0,
                service_areas=["South Austin", "Buda", "Kyle"],
                tools_inventory=["Pipe wrench set", "Snake/Auger", "Basic hand tools", "Torch kit"],
            ),
        ]
        session.add_all(workers)
        session.flush()
        print(f"  Created {len(workers)} workers")

        # ── Tickets ──────────────────────────────────────────────────
        now = datetime.now(timezone.utc)

        ticket_data = [
            {
                "title": "AC unit not cooling on 3rd floor - multiple offices affected",
                "description": "The main AC unit serving the 3rd floor has stopped cooling. Temperature is rising above 80F in multiple offices. Approximately 40 employees affected. The unit is making a grinding noise when the compressor kicks on.",
                "severity": "P1",
                "status": "open",
                "equipment_type": "AC Unit",
                "category": "HVAC",
                "customer": customers[0],  # Austin Medical Center
                "skills_required": ["HVAC Repair", "Refrigerant Handling"],
                "time_estimate_minutes": 120,
            },
            {
                "title": "Emergency water leak in server room",
                "description": "Water is actively leaking from the ceiling in the main server room (Room 204). We've placed buckets but the leak is worsening. Need immediate plumbing response to prevent equipment damage. IT team is monitoring servers.",
                "severity": "P1",
                "status": "assigned",
                "equipment_type": None,
                "category": "Plumbing",
                "customer": customers[3],  # TechHub Austin
                "skills_required": ["Plumbing", "Pipe Fitting"],
                "time_estimate_minutes": 90,
                "assigned_worker": workers[2],  # Diego Rodriguez
            },
            {
                "title": "Network switch failure - 50+ users offline",
                "description": "The core network switch in the MDF closet (1st floor) has failed. All wired connections on floors 1-2 are down. WiFi still working. Switch model: Cisco Catalyst 9300. Power light is amber, no port activity.",
                "severity": "P1",
                "status": "in_progress",
                "equipment_type": "Network Router",
                "category": "Telecommunications",
                "customer": customers[3],  # TechHub Austin
                "skills_required": ["Network Installation", "IT Support"],
                "time_estimate_minutes": 60,
                "assigned_worker": workers[4],  # Tommy Williams
            },
            {
                "title": "Thermostat malfunction in Building B lobby",
                "description": "The digital thermostat in the Building B lobby is displaying error code E4 and not responding to input. The HVAC system is stuck running heat despite being set to cooling mode. Guests are uncomfortable.",
                "severity": "P2",
                "status": "open",
                "equipment_type": "Thermostat",
                "category": "HVAC",
                "customer": customers[5],  # Barton Creek Resort
                "skills_required": ["HVAC Repair", "Thermostat Installation"],
                "time_estimate_minutes": 45,
            },
            {
                "title": "Bathroom flooding on 2nd floor, Unit 215",
                "description": "Tenant reports toilet overflowed and water is seeping under the door into the hallway. Maintenance shutoff valve doesn't seem to be working. Potential damage to unit below (115).",
                "severity": "P2",
                "status": "open",
                "equipment_type": None,
                "category": "Plumbing",
                "customer": customers[2],  # Riverside Apartments
                "skills_required": ["Plumbing", "Drain Cleaning"],
                "time_estimate_minutes": 60,
            },
            {
                "title": "Electrical panel buzzing in kitchen area",
                "description": "The main electrical panel in the commercial kitchen is making a loud buzzing/humming noise. Started this morning. No tripped breakers visible but the sound is concerning. Kitchen staff are worried about safety.",
                "severity": "P2",
                "status": "assigned",
                "equipment_type": None,
                "category": "Electrical",
                "customer": customers[5],  # Barton Creek Resort
                "skills_required": ["Electrical", "Panel Upgrades"],
                "time_estimate_minutes": 90,
                "assigned_worker": workers[6],  # James O'Brien
            },
            {
                "title": "Walk-in freezer temperature rising",
                "description": "The walk-in freezer temperature has risen from -10F to 15F over the past 4 hours. Compressor is running but not cooling effectively. We have approximately $50,000 worth of perishable food donations at risk.",
                "severity": "P1",
                "status": "open",
                "equipment_type": "Compressor",
                "category": "HVAC",
                "customer": customers[6],  # Central Texas Food Bank
                "skills_required": ["HVAC Repair", "Refrigerant Handling", "Commercial HVAC"],
                "time_estimate_minutes": 150,
            },
            {
                "title": "Classroom projector and AV system not powering on",
                "description": "The AV system in Room 104 (main auditorium) is completely dead. Projector, speakers, and smart board all unresponsive. Checked the breaker and it hasn't tripped. Teachers need this for presentations tomorrow.",
                "severity": "P3",
                "status": "open",
                "equipment_type": None,
                "category": "Electrical",
                "customer": customers[4],  # Lone Star Elementary
                "skills_required": ["Electrical", "IT Support"],
                "time_estimate_minutes": 60,
            },
            {
                "title": "Parking lot lights out - safety concern",
                "description": "6 of the 12 parking lot lights in the east lot are not working. This is creating dark spots and tenants have raised safety concerns, especially with the time change. Need lighting restored ASAP.",
                "severity": "P2",
                "status": "open",
                "equipment_type": None,
                "category": "Electrical",
                "customer": customers[2],  # Riverside Apartments
                "skills_required": ["Electrical", "Lighting Systems"],
                "time_estimate_minutes": 120,
            },
            {
                "title": "Fiber optic cable damage - east wing connectivity down",
                "description": "Construction crew accidentally damaged the fiber optic cable run to the east wing during renovation work. 20 offices have lost network connectivity. Need emergency fiber splice and repair.",
                "severity": "P2",
                "status": "open",
                "equipment_type": None,
                "category": "Telecommunications",
                "customer": customers[0],  # Austin Medical Center
                "skills_required": ["Fiber Optics", "Telecommunications"],
                "time_estimate_minutes": 180,
            },
            {
                "title": "Hot water heater leaking in utility room",
                "description": "The 80-gallon commercial water heater in the main utility room has developed a slow leak at the base. No flooding yet but there's a steady drip. Unit is 8 years old. May need replacement.",
                "severity": "P3",
                "status": "open",
                "equipment_type": "Water Heater",
                "category": "Plumbing",
                "customer": customers[1],  # Hill Country Mall
                "skills_required": ["Plumbing", "Water Heater Repair"],
                "time_estimate_minutes": 120,
            },
            {
                "title": "Access control system malfunction at main entrance",
                "description": "The badge reader at the main entrance is intermittently failing. Sometimes it works, sometimes employees have to badge multiple times. The door lock mechanism may also be misaligned. Creating security concerns.",
                "severity": "P3",
                "status": "open",
                "equipment_type": None,
                "category": "IT Services",
                "customer": customers[3],  # TechHub Austin
                "skills_required": ["Security Systems", "Access Control"],
                "time_estimate_minutes": 60,
            },
            {
                "title": "Rooftop HVAC unit scheduled maintenance",
                "description": "Quarterly preventive maintenance due for the 4 rooftop HVAC units. Need filter replacement, coil cleaning, belt inspection, refrigerant level check, and electrical connection inspection.",
                "severity": "P4",
                "status": "open",
                "equipment_type": "AC Unit",
                "category": "HVAC",
                "customer": customers[1],  # Hill Country Mall
                "skills_required": ["HVAC Repair", "Refrigerant Handling"],
                "time_estimate_minutes": 240,
            },
            {
                "title": "Drywall repair needed in hallway after pipe burst",
                "description": "Following last week's pipe repair, there's a 3x4 foot section of drywall that needs to be replaced in the 2nd floor hallway. Also need repainting to match existing wall color (Sherwin Williams SW7015).",
                "severity": "P4",
                "status": "open",
                "equipment_type": None,
                "category": "General Maintenance",
                "customer": customers[2],  # Riverside Apartments
                "skills_required": ["Drywall Repair", "Painting"],
                "time_estimate_minutes": 180,
            },
            {
                "title": "Emergency generator not starting during test",
                "description": "During our monthly emergency generator test, the backup generator failed to start. Battery voltage shows low. This is critical - the generator provides backup power for the entire facility including life safety systems.",
                "severity": "P1",
                "status": "open",
                "equipment_type": "Generator",
                "category": "Electrical",
                "customer": customers[0],  # Austin Medical Center
                "skills_required": ["Generator Repair", "Electrical"],
                "time_estimate_minutes": 120,
            },
            {
                "title": "WiFi dead zones in conference rooms",
                "description": "Multiple conference rooms on the 3rd floor are experiencing WiFi dead zones. Signal drops completely when doors are closed. May need additional access points or repositioning existing ones.",
                "severity": "P3",
                "status": "open",
                "equipment_type": None,
                "category": "Telecommunications",
                "customer": customers[1],  # Hill Country Mall
                "skills_required": ["Network Installation", "Telecommunications"],
                "time_estimate_minutes": 90,
            },
            {
                "title": "Playground equipment safety inspection",
                "description": "Annual safety inspection required for all outdoor playground equipment. Need to check structural integrity, hardware tightness, surface material depth, and identify any potential hazards per CPSC guidelines.",
                "severity": "P3",
                "status": "open",
                "equipment_type": None,
                "category": "General Maintenance",
                "customer": customers[4],  # Lone Star Elementary
                "skills_required": ["General Maintenance"],
                "time_estimate_minutes": 120,
            },
            {
                "title": "Spa hot tub pump making grinding noise",
                "description": "The main hot tub pump in the spa area has started making a grinding/whining noise. Water circulation appears reduced. Temperature is still maintained but guests are complaining about the noise. Model: Hayward SP2610X15.",
                "severity": "P3",
                "status": "open",
                "equipment_type": "Compressor",
                "category": "Plumbing",
                "customer": customers[5],  # Barton Creek Resort
                "skills_required": ["Plumbing", "General Maintenance"],
                "time_estimate_minutes": 90,
            },
        ]

        tickets = []
        for i, td in enumerate(ticket_data):
            customer = td["customer"]
            created_offset = timedelta(hours=random.randint(1, 72))
            created_at = now - created_offset

            ticket = Ticket(
                title=td["title"],
                description=td["description"],
                raw_description=td["description"],
                severity=td["severity"],
                status=td["status"],
                equipment_type=td["equipment_type"],
                category=td["category"],
                location_lat=customer.location_lat + random.uniform(-0.005, 0.005),
                location_lng=customer.location_lng + random.uniform(-0.005, 0.005),
                location_address=customer.address,
                skills_required=td["skills_required"],
                time_estimate_minutes=td["time_estimate_minutes"],
                sla_deadline=calculate_sla_deadline(td["severity"], created_at),
                customer_id=customer.id,
                customer_name=customer.name,
                customer_email=customer.email,
                customer_phone=customer.phone,
                llm_analysis={
                    "severity": td["severity"],
                    "confidence": round(random.uniform(0.75, 0.98), 2),
                    "equipment_type": td["equipment_type"],
                    "category": td["category"],
                    "skills_required": td["skills_required"],
                    "time_estimate_minutes": td["time_estimate_minutes"],
                    "summary": f"Service request: {td['title']}",
                    "troubleshooting_steps": [
                        "Verify the reported issue on-site",
                        "Check equipment model and serial number",
                        "Diagnose root cause",
                        "Perform necessary repairs or replacements",
                        "Test the system after repair",
                        "Document findings and actions taken",
                    ],
                },
                confidence_score=round(random.uniform(0.75, 0.98), 2),
            )

            if td.get("assigned_worker"):
                ticket.assigned_worker_id = td["assigned_worker"].id

            tickets.append(ticket)

        session.add_all(tickets)
        session.flush()
        print(f"  Created {len(tickets)} tickets")

        # ── Assignments ──────────────────────────────────────────────
        assignments = []

        # Assignment for ticket #2 (water leak -> Diego Rodriguez, assigned)
        assigned_ticket = tickets[1]
        assigned_worker = workers[2]  # Diego Rodriguez
        a1 = Assignment(
            ticket_id=assigned_ticket.id,
            worker_id=assigned_worker.id,
            status="pending",
            scheduled_time=now + timedelta(minutes=30),
            eta=now + timedelta(minutes=25),
            travel_distance_km=8.5,
            travel_time_minutes=18.0,
            skill_match_score=0.95,
            proximity_score=0.82,
            overall_score=0.88,
            notes="Emergency dispatch - water leak in server room. Priority response.",
        )
        assignments.append(a1)

        # Assignment for ticket #3 (network switch -> Tommy Williams, in_progress)
        inprog_ticket = tickets[2]
        inprog_worker = workers[4]  # Tommy Williams
        a2 = Assignment(
            ticket_id=inprog_ticket.id,
            worker_id=inprog_worker.id,
            status="in_progress",
            eta=now - timedelta(minutes=15),
            actual_arrival=now - timedelta(minutes=20),
            travel_distance_km=3.2,
            travel_time_minutes=8.0,
            skill_match_score=0.98,
            proximity_score=0.90,
            overall_score=0.94,
            notes="On-site, diagnosing switch failure. May need replacement unit.",
        )
        assignments.append(a2)

        # Assignment for ticket #6 (electrical panel -> James O'Brien, en_route)
        enroute_ticket = tickets[5]
        enroute_worker = workers[6]  # James O'Brien
        a3 = Assignment(
            ticket_id=enroute_ticket.id,
            worker_id=enroute_worker.id,
            status="en_route",
            eta=now + timedelta(minutes=15),
            travel_distance_km=12.1,
            travel_time_minutes=22.0,
            skill_match_score=0.97,
            proximity_score=0.75,
            overall_score=0.91,
            notes="Expert electrician dispatched for panel inspection.",
        )
        assignments.append(a3)

        # One completed assignment (historical)
        a4 = Assignment(
            ticket_id=tickets[12].id,  # HVAC maintenance
            worker_id=workers[0].id,   # Marcus Johnson
            status="completed",
            eta=now - timedelta(hours=48),
            actual_arrival=now - timedelta(hours=48, minutes=-5),
            actual_completion=now - timedelta(hours=44),
            travel_distance_km=15.3,
            travel_time_minutes=28.0,
            skill_match_score=0.96,
            proximity_score=0.70,
            overall_score=0.87,
            notes="Completed quarterly HVAC maintenance. All units in good condition. Replaced filters.",
            customer_rating=5,
            customer_feedback="Excellent service, very thorough inspection. Marcus was professional and knowledgeable.",
        )
        # Mark this ticket as completed
        tickets[12].status = "completed"
        tickets[12].completed_at = now - timedelta(hours=44)
        assignments.append(a4)

        session.add_all(assignments)
        session.flush()
        print(f"  Created {len(assignments)} assignments")

        session.commit()
        print("\nDatabase seeded successfully!")
        print(f"  Summary: {len(customers)} customers, {len(workers)} workers, "
              f"{len(tickets)} tickets, {len(assignments)} assignments")


if __name__ == "__main__":
    seed()
