
from app import app, db, User, bcrypt

with app.app_context():

    email = "recruiter@ncct.com"

    existing = User.query.filter_by(email=email).first()

    if existing:
        print("Recruiter account already exists.")

    else:
        password = "Recruiter@123"

        hashed_password = bcrypt.generate_password_hash(
            password
        ).decode("utf-8")

        recruiter = User(
            full_name="NCCT Recruiter",
            email=email,
            password_hash=hashed_password,
            role="recruiter",
            is_active=True
        )

        db.session.add(recruiter)
        db.session.commit()

        print("Recruiter account created successfully!")
        print("Email:", email)
        print("Password:", password)
