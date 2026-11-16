
from getpass import getpass
from app import app, db, User, bcrypt

with app.app_context():
    print("\n===== CREATE TRAINER ACCOUNT =====")

    full_name = input("Enter trainer name: ").strip()
    email = input("Enter trainer email: ").strip().lower()
    password = getpass("Enter password: ")
    confirm_password = getpass("Confirm password: ")

    if not full_name or not email or not password:
        print("Error: All fields are required.")
    elif password != confirm_password:
        print("Error: Passwords do not match.")
    elif User.query.filter_by(email=email).first():
        print("Error: An account with this email already exists.")
    else:
        password_hash = bcrypt.generate_password_hash(
            password
        ).decode("utf-8")

        trainer = User(
            full_name=full_name,
            email=email,
            password_hash=password_hash,
            role="trainer",
            is_active=True
        )

        db.session.add(trainer)
        db.session.commit()

        print("\nTrainer account created successfully!")
        print("Name:", full_name)
        print("Email:", email)
        print("Role: trainer")
