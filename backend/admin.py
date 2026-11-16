
from getpass import getpass
from app import app, db, User, bcrypt


def create_admin():
    print("\n================================")
    print("       NCCT ADMIN CREATION")
    print("================================\n")

    full_name = input("Enter admin name: ").strip()
    email = input("Enter admin email: ").strip().lower()
    password = getpass("Enter admin password: ")
    confirm_password = getpass("Confirm password: ")

    if not full_name or not email or not password:
        print("\nError: All fields are required.")
        return

    if password != confirm_password:
        print("\nError: Passwords do not match.")
        return

    if len(password) < 8:
        print("\nError: Password must contain at least 8 characters.")
        return

    with app.app_context():
        try:
            # Check whether the account already exists
            user = User.query.filter_by(email=email).first()

            if user:
                # Promote existing account to admin
                user.role = "admin"
                user.is_active = True

                print("\nExisting account found. Promoting to Admin...")

            else:
                # Hash password
                hashed_password = bcrypt.generate_password_hash(
                    password
                ).decode("utf-8")

                # Create new admin account
                user = User(
                    full_name=full_name,
                    email=email,
                    password_hash=hashed_password,
                    role="admin",
                    is_active=True
                )

                db.session.add(user)

            db.session.commit()

            print("\n================================")
            print("   ADMIN ACCOUNT READY!")
            print("================================")
            print("Name:", user.full_name)
            print("Email:", user.email)
            print("Role:", user.role)
            print("\nYou can now log in to NCCT.")
            print("================================\n")

        except Exception as e:
            db.session.rollback()
            print("\nError creating admin:", str(e))


if __name__ == "__main__":
    create_admin()
