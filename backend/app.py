import secrets
import hashlib
from flask import Flask, request, jsonify, session
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
import os

from werkzeug.utils import secure_filename
from flask import send_from_directory

from datetime import datetime, timezone, date, timedelta
from email_validator import validate_email, EmailNotValidError
from functools import wraps
from uuid import uuid4


# =====================================================
# 1. APPLICATION CONFIGURATION
# =====================================================

app = Flask(__name__)

# Development-only session key.
# Replace with a secure random key before deployment.
app.config["SECRET_KEY"] = "ncct-local-development-only"

app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///ncct.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
# Study material upload configuration
app.config["UPLOAD_FOLDER"] = os.path.join(
    app.root_path,
    "uploads",
    "study_materials"
)

app.config["MAX_CONTENT_LENGTH"] = 100 * 1024 * 1024  # 100 MB

os.makedirs(
    app.config["UPLOAD_FOLDER"],
    exist_ok=True
)

ALLOWED_MATERIAL_EXTENSIONS = {
    "pdf",
    "doc",
    "docx",
    "ppt",
    "pptx",
    "txt",
    "jpg",
    "jpeg",
    "png",
    "mp4",
    "webm",
    "mp3"
}


def allowed_material_file(filename):
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower()
        in ALLOWED_MATERIAL_EXTENSIONS
    )

app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = False

CORS(
    app,
    supports_credentials=True,
    resources={
        r"/api/*": {
            "origins": ["http://localhost:5173"]
        }
    }
)

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)


# =====================================================
# 2. USER DATABASE MODEL
# =====================================================

class User(db.Model):

    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)

    full_name = db.Column(
        db.String(120),
        nullable=False
    )

    email = db.Column(
        db.String(150),
        unique=True,
        nullable=False,
        index=True
    )

    password_hash = db.Column(
        db.String(255),
        nullable=False
    )

    role = db.Column(
        db.String(30),
        nullable=False,
        default="trainee"
    )

    is_active = db.Column(
        db.Boolean,
        nullable=False,
        default=True
    )

    created_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc)
    )

    trainee_profile = db.relationship(
        "TraineeProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan"
    )

    def to_dict(self):

        return {
            "id": self.id,
            "full_name": self.full_name,
            "email": self.email,
            "role": self.role,
            "is_active": self.is_active,
            "created_at": (
                self.created_at.isoformat()
                if self.created_at else None
            )
        }


# =====================================================
# 3. TRAINEE PROFILE MODEL
# =====================================================

class TraineeProfile(db.Model):

    __tablename__ = "trainee_profiles"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        unique=True,
        nullable=False
    )

    phone = db.Column(db.String(15))
    gender = db.Column(db.String(20))
    date_of_birth = db.Column(db.String(20))
    education = db.Column(db.String(150))
    institution = db.Column(db.String(200))
    district = db.Column(db.String(100))
    state = db.Column(db.String(100))
    skills = db.Column(db.Text)

    user = db.relationship(
        "User",
        back_populates="trainee_profile"
    )


# =====================================================
# 4. TRAINING COURSE MODEL
# =====================================================

class TrainingCourse(db.Model):

    __tablename__ = "training_courses"

    id = db.Column(db.Integer, primary_key=True)

    title = db.Column(
        db.String(200),
        nullable=False
    )

    category = db.Column(db.String(100))
    description = db.Column(db.Text)
    duration = db.Column(db.String(50))

    mode = db.Column(
        db.String(30),
        default="Offline"
    )

    status = db.Column(
        db.String(30),
        default="Ongoing"
    )

    trainer_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    created_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc)
    )


# =====================================================
# 5. COURSE ENROLLMENT MODEL
# =====================================================

class CourseEnrollment(db.Model):

    __tablename__ = "course_enrollments"

    id = db.Column(db.Integer, primary_key=True)

    course_id = db.Column(
        db.Integer,
        db.ForeignKey("training_courses.id"),
        nullable=False
    )

    trainee_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    status = db.Column(
        db.String(30),
        default="Enrolled"
    )

    enrolled_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc)
    )

    __table_args__ = (
        db.UniqueConstraint(
            "course_id",
            "trainee_id",
            name="unique_course_trainee"
        ),
    )

# =====================================================
# COURSE STUDY MATERIAL MODEL
# =====================================================

class CourseMaterial(db.Model):

    __tablename__ = "course_materials"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    course_id = db.Column(
        db.Integer,
        db.ForeignKey("training_courses.id"),
        nullable=False
    )

    trainer_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    title = db.Column(
        db.String(200),
        nullable=False
    )

    description = db.Column(db.Text)

    material_type = db.Column(
        db.String(30),
        nullable=False
    )

    file_name = db.Column(db.String(255))

    file_path = db.Column(db.String(500))

    external_url = db.Column(db.String(1000))

    created_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc)
    )

# =====================================================
# 6. ATTENDANCE MODEL
# =====================================================

class Attendance(db.Model):

    __tablename__ = "attendance"

    id = db.Column(db.Integer, primary_key=True)

    course_id = db.Column(
        db.Integer,
        db.ForeignKey("training_courses.id"),
        nullable=False
    )

    trainee_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    trainer_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    attendance_date = db.Column(
        db.Date,
        nullable=False
    )

    status = db.Column(
        db.String(20),
        nullable=False
    )

    marked_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc)
    )

    __table_args__ = (
        db.UniqueConstraint(
            "course_id",
            "trainee_id",
            "attendance_date",
            name="unique_daily_attendance"
        ),
    )


# =====================================================
# QR ATTENDANCE SESSION MODEL
# =====================================================

class QRAttendanceSession(db.Model):

    __tablename__ = "qr_attendance_sessions"

    id = db.Column(db.Integer, primary_key=True)

    course_id = db.Column(
        db.Integer,
        db.ForeignKey("training_courses.id"),
        nullable=False
    )

    trainer_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    token_hash = db.Column(
        db.String(64),
        unique=True,
        nullable=False
    )

    attendance_date = db.Column(
        db.Date,
        nullable=False
    )

    expires_at = db.Column(
        db.DateTime,
        nullable=False
    )

    is_active = db.Column(
        db.Boolean,
        default=True,
        nullable=False
    )

    created_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc)
    )

# =====================================================
# 7. ASSESSMENT MODEL
# =====================================================

class Assessment(db.Model):

    __tablename__ = "assessments"

    id = db.Column(db.Integer, primary_key=True)

    course_id = db.Column(
        db.Integer,
        db.ForeignKey("training_courses.id"),
        nullable=False
    )

    trainer_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    title = db.Column(
        db.String(200),
        nullable=False
    )

    description = db.Column(db.Text)

    total_marks = db.Column(
        db.Integer,
        nullable=False
    )

    due_date = db.Column(db.Date)

    created_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc)
    )


# =====================================================
# 8. ASSESSMENT RESULT MODEL
# =====================================================

class AssessmentResult(db.Model):

    __tablename__ = "assessment_results"

    id = db.Column(db.Integer, primary_key=True)

    assessment_id = db.Column(
        db.Integer,
        db.ForeignKey("assessments.id"),
        nullable=False
    )

    trainee_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    marks_obtained = db.Column(
        db.Integer,
        nullable=False
    )

    feedback = db.Column(db.Text)

    submitted_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc)
    )

    __table_args__ = (
        db.UniqueConstraint(
            "assessment_id",
            "trainee_id",
            name="unique_assessment_result"
        ),
    )


class Certificate(db.Model):
    __tablename__ = "certificates"

    id = db.Column(db.Integer, primary_key=True)

    certificate_number = db.Column(
        db.String(50),
        unique=True,
        nullable=False
    )

    trainee_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    course_id = db.Column(
        db.Integer,
        db.ForeignKey("training_courses.id"),
        nullable=False
    )

    issued_by = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    issued_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc)
    )

# =====================================================
# 9. ROLE-BASED AUTHENTICATION DECORATOR
# =====================================================

def role_required(required_role):

    def decorator(function):

        @wraps(function)
        def wrapper(*args, **kwargs):

            user_id = session.get("user_id")

            if not user_id:

                return jsonify({
                    "success": False,
                    "message": "Please log in first."
                }), 401

            current_user = db.session.get(User, user_id)

            if not current_user or not current_user.is_active:

                session.clear()

                return jsonify({
                    "success": False,
                    "message": "Invalid or inactive account."
                }), 401

            if current_user.role != required_role:

                return jsonify({
                    "success": False,
                    "message": "You are not authorized."
                }), 403

            return function(*args, **kwargs)

        return wrapper

    return decorator


# =====================================================
# TRAINEE: SCAN QR AND MARK ATTENDANCE
# =====================================================

@app.route(
    "/api/trainee/attendance/scan",
    methods=["POST"]
)
@role_required("trainee")
def scan_attendance_qr():

    data = request.get_json(silent=True) or {}

    token = str(data.get("token") or "").strip()

    if not token:
        return jsonify({
            "success": False,
            "message": "QR token is required."
        }), 400

    token_hash = hashlib.sha256(
        token.encode("utf-8")
    ).hexdigest()

    qr_session = QRAttendanceSession.query.filter_by(
        token_hash=token_hash
    ).first()

    if not qr_session or not qr_session.is_active:
        return jsonify({
            "success": False,
            "message": "Invalid or inactive QR code."
        }), 400

    # Check QR expiry.
    expiry = qr_session.expires_at

    # SQLite may return a naive datetime.
    if expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=timezone.utc)

    if datetime.now(timezone.utc) >= expiry:

        qr_session.is_active = False
        db.session.commit()

        return jsonify({
            "success": False,
            "message": "QR code has expired. Ask your trainer for a new one."
        }), 410

    trainee_id = session["user_id"]
    course_id = qr_session.course_id

    # Check whether the trainee is enrolled.
    enrollment = CourseEnrollment.query.filter_by(
        course_id=course_id,
        trainee_id=trainee_id,
        status="Enrolled"
    ).first()

    if not enrollment:
        return jsonify({
            "success": False,
            "message": "You are not enrolled in this course."
        }), 403

    # Prevent duplicate attendance for the same course and date.
    existing = Attendance.query.filter_by(
        course_id=course_id,
        trainee_id=trainee_id,
        attendance_date=qr_session.attendance_date
    ).first()

    if existing:
        return jsonify({
            "success": False,
            "message": "Your attendance has already been marked."
        }), 409

    try:

        attendance = Attendance(
            course_id=course_id,
            trainee_id=trainee_id,
            trainer_id=qr_session.trainer_id,
            attendance_date=qr_session.attendance_date,
            status="Present"
        )

        db.session.add(attendance)
        db.session.commit()

        course = db.session.get(
            TrainingCourse,
            course_id
        )

        return jsonify({
            "success": True,
            "message": "Attendance marked successfully!",
            "attendance": {
                "course_id": course_id,
                "course_title": course.title if course else "Course",
                "date": qr_session.attendance_date.isoformat(),
                "status": "Present"
            }
        }), 201

    except Exception:
        db.session.rollback()
        app.logger.exception("QR attendance marking failed")

        return jsonify({
            "success": False,
            "message": "Unable to mark attendance."
        }), 500



# =====================================================
# 10. HEALTH CHECK API
# =====================================================

@app.route("/api/health", methods=["GET"])
def health():

    return jsonify({
        "status": "success",
        "message": "NCCT backend is running!",
        "database": "SQLite"
    }), 200


# =====================================================
# 11. USER REGISTRATION API
# =====================================================

@app.route("/api/auth/register", methods=["POST"])
def register():

    data = request.get_json(silent=True) or {}

    full_name = str(data.get("full_name") or "").strip()
    email = str(data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not full_name or not email or not password:

        return jsonify({
            "status": "error",
            "message": "All fields are required."
        }), 400

    if len(full_name) > 120:

        return jsonify({
            "status": "error",
            "message": "Name is too long."
        }), 400

    try:

        validate_email(
            email,
            check_deliverability=False
        )

    except EmailNotValidError:

        return jsonify({
            "status": "error",
            "message": "Invalid email address."
        }), 400

    if len(password) < 8:

        return jsonify({
            "status": "error",
            "message": "Password must contain at least 8 characters."
        }), 400

    # Public registration creates trainee accounts only.

    existing_user = User.query.filter_by(
        email=email
    ).first()

    if existing_user:

        return jsonify({
            "status": "error",
            "message": "Email already registered."
        }), 409

    hashed_password = bcrypt.generate_password_hash(
        password
    ).decode("utf-8")

    new_user = User(
        full_name=full_name,
        email=email,
        password_hash=hashed_password,
        role="trainee"
    )

    try:

        db.session.add(new_user)
        db.session.flush()

        new_profile = TraineeProfile(
            user_id=new_user.id
        )

        db.session.add(new_profile)
        db.session.commit()

        return jsonify({
            "status": "success",
            "message": "Registration successful!",
            "user": new_user.to_dict()
        }), 201

    except Exception:

        db.session.rollback()

        app.logger.exception("Registration failed")

        return jsonify({
            "status": "error",
            "message": "Registration failed."
        }), 500


# =====================================================
# 12. USER LOGIN API
# =====================================================

@app.route("/api/auth/login", methods=["POST"])
def login():

    data = request.get_json(silent=True) or {}

    email = str(data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:

        return jsonify({
            "status": "error",
            "message": "Email and password are required."
        }), 400

    user = User.query.filter_by(
        email=email
    ).first()

    if not user or not bcrypt.check_password_hash(
        user.password_hash,
        password
    ):

        return jsonify({
            "status": "error",
            "message": "Invalid email or password."
        }), 401

    if not user.is_active:

        return jsonify({
            "status": "error",
            "message": "Your account is inactive."
        }), 403

    session.clear()
    session["user_id"] = user.id

    return jsonify({
        "status": "success",
        "message": "Login successful!",
        "user": user.to_dict()
    }), 200


# =====================================================
# 13. CURRENT LOGGED-IN USER API
# =====================================================

@app.route("/api/auth/me", methods=["GET"])
def current_user():

    user_id = session.get("user_id")

    if not user_id:

        return jsonify({
            "status": "error",
            "message": "Please login first."
        }), 401

    user = db.session.get(User, user_id)

    if not user or not user.is_active:

        session.clear()

        return jsonify({
            "status": "error",
            "message": "User not found or inactive."
        }), 404

    return jsonify({
        "status": "success",
        "user": user.to_dict()
    }), 200


# =====================================================
# 14. USER LOGOUT API
# =====================================================

@app.route("/api/auth/logout", methods=["POST"])
def logout():

    session.clear()

    return jsonify({
        "status": "success",
        "message": "Logout successful!"
    }), 200


# =====================================================
# 15. TRAINER DASHBOARD STATISTICS
# =====================================================

@app.route("/api/trainer/dashboard", methods=["GET"])
@role_required("trainer")
def trainer_dashboard():

    trainer_id = session["user_id"]

    courses = TrainingCourse.query.filter_by(
        trainer_id=trainer_id
    ).all()

    course_ids = [course.id for course in courses]

    enrollments = (
        CourseEnrollment.query.filter(
            CourseEnrollment.course_id.in_(course_ids)
        ).all()
        if course_ids else []
    )

    attendance_records = Attendance.query.filter_by(
        trainer_id=trainer_id
    ).all()

    total_attendance = len(attendance_records)

    present_count = sum(
        1 for record in attendance_records
        if record.status == "Present"
    )

    average_attendance = (
        round((present_count / total_attendance) * 100)
        if total_attendance else 0
    )

    completed_courses = sum(
        1 for course in courses
        if course.status == "Completed"
    )

    return jsonify({
        "success": True,
        "statistics": {
            "active_courses": sum(
                1 for course in courses
                if course.status == "Ongoing"
            ),
            "total_trainees": len({
                enrollment.trainee_id
                for enrollment in enrollments
                if enrollment.status == "Enrolled"
            }),
            "average_attendance": average_attendance,
            "completed_courses": completed_courses
        }
    }), 200


# =====================================================
# 16. CREATE TRAINING COURSE
# =====================================================

@app.route("/api/trainer/courses", methods=["POST"])
@role_required("trainer")
def create_training_course():

    data = request.get_json(silent=True) or {}

    title = str(data.get("title") or "").strip()

    if not title:

        return jsonify({
            "success": False,
            "message": "Course title is required."
        }), 400

    course = TrainingCourse(
        title=title,
        category=data.get("category"),
        description=data.get("description"),
        duration=data.get("duration"),
        mode=data.get("mode", "Offline"),
        trainer_id=session["user_id"]
    )

    try:

        db.session.add(course)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Course created successfully.",
            "course_id": course.id
        }), 201

    except Exception:

        db.session.rollback()
        app.logger.exception("Course creation failed")

        return jsonify({
            "success": False,
            "message": "Unable to create course."
        }), 500



# =====================================================
# 17. GET TRAINER COURSES
# =====================================================

@app.route("/api/trainer/courses", methods=["GET"])
@role_required("trainer")
def get_trainer_courses():

    trainer_id = session["user_id"]

    courses = TrainingCourse.query.filter_by(
        trainer_id=trainer_id
    ).order_by(TrainingCourse.id.desc()).all()

    result = []

    for course in courses:

        trainee_count = CourseEnrollment.query.filter_by(
            course_id=course.id,
            status="Enrolled"
        ).count()

        result.append({
            "id": course.id,
            "title": course.title,
            "category": course.category,
            "description": course.description,
            "duration": course.duration,
            "mode": course.mode,
            "status": course.status,
            "trainees": trainee_count
        })

    return jsonify({
        "success": True,
        "courses": result
    }), 200


# =====================================================
# 18. ENROLL TRAINEE INTO COURSE
# =====================================================

@app.route(
    "/api/trainer/courses/<int:course_id>/enrollments",
    methods=["POST"]
)
@role_required("trainer")
def enroll_trainee(course_id):

    data = request.get_json(silent=True) or {}

    trainee_id = data.get("trainee_id")

    if not trainee_id:

        return jsonify({
            "success": False,
            "message": "Trainee ID is required."
        }), 400

    course = TrainingCourse.query.filter_by(
        id=course_id,
        trainer_id=session["user_id"]
    ).first()

    if not course:

        return jsonify({
            "success": False,
            "message": "Course not found."
        }), 404

    trainee = db.session.get(User, trainee_id)

    if not trainee or trainee.role != "trainee":

        return jsonify({
            "success": False,
            "message": "Valid trainee not found."
        }), 404

    existing = CourseEnrollment.query.filter_by(
        course_id=course_id,
        trainee_id=trainee_id
    ).first()

    if existing:

        return jsonify({
            "success": False,
            "message": "Trainee is already enrolled."
        }), 409

    enrollment = CourseEnrollment(
        course_id=course_id,
        trainee_id=trainee_id
    )

    try:

        db.session.add(enrollment)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Trainee enrolled successfully."
        }), 201

    except Exception:

        db.session.rollback()
        app.logger.exception("Enrollment failed")

        return jsonify({
            "success": False,
            "message": "Unable to enroll trainee."
        }), 500


# =====================================================
# 19. GET TRAINEES IN A COURSE
# =====================================================

@app.route(
    "/api/trainer/courses/<int:course_id>/trainees",
    methods=["GET"]
)
@role_required("trainer")
def get_course_trainees(course_id):

    course = TrainingCourse.query.filter_by(
        id=course_id,
        trainer_id=session["user_id"]
    ).first()

    if not course:

        return jsonify({
            "success": False,
            "message": "Course not found."
        }), 404

    enrollments = CourseEnrollment.query.filter_by(
        course_id=course_id,
        status="Enrolled"
    ).all()

    result = []

    for enrollment in enrollments:

        trainee = db.session.get(
            User,
            enrollment.trainee_id
        )

        if not trainee:
            continue

        profile = TraineeProfile.query.filter_by(
            user_id=trainee.id
        ).first()

        attendance = Attendance.query.filter_by(
            course_id=course_id,
            trainee_id=trainee.id
        ).all()

        total = len(attendance)

        present = sum(
            1 for record in attendance
            if record.status == "Present"
        )

        percentage = (
            round((present / total) * 100)
            if total else 0
        )

        result.append({
            "id": trainee.id,
            "name": trainee.full_name,
            "email": trainee.email,
            "phone": profile.phone if profile else None,
            "attendance": percentage,
            "enrollment_status": enrollment.status
        })

    return jsonify({
        "success": True,
        "course": course.title,
        "trainees": result
    }), 200

# =====================================================
# TRAINER: ADD COURSE STUDY MATERIAL
# =====================================================

@app.route(
    "/api/trainer/courses/<int:course_id>/materials",
    methods=["POST"]
)
@role_required("trainer")
def add_course_material(course_id):

    trainer_id = session["user_id"]

    course = TrainingCourse.query.filter_by(
        id=course_id,
        trainer_id=trainer_id
    ).first()

    if not course:
        return jsonify({
            "success": False,
            "message": "Course not found or access denied."
        }), 404

    title = request.form.get("title", "").strip()
    description = request.form.get("description", "").strip()
    material_type = request.form.get("material_type", "").strip().lower()
    external_url = request.form.get("external_url", "").strip()

    uploaded_file = request.files.get("file")

    allowed_types = [
        "video",
        "notes",
        "book",
        "presentation",
        "document",
        "other"
    ]

    if not title:
        return jsonify({
            "success": False,
            "message": "Material title is required."
        }), 400

    if material_type not in allowed_types:
        return jsonify({
            "success": False,
            "message": "Invalid material type."
        }), 400

    if not uploaded_file and not external_url:
        return jsonify({
            "success": False,
            "message": "Upload a file or provide a resource URL."
        }), 400

    if uploaded_file and uploaded_file.filename:

        original_name = secure_filename(uploaded_file.filename)

        if not original_name or not allowed_material_file(original_name):
            return jsonify({
                "success": False,
                "message": "This file type is not supported."
            }), 400

        extension = original_name.rsplit(".", 1)[1].lower()

        stored_name = f"{uuid4().hex}.{extension}"

        file_path = os.path.join(
            app.config["UPLOAD_FOLDER"],
            stored_name
        )

        try:
            uploaded_file.save(file_path)

        except Exception:
            app.logger.exception("Study material upload failed")

            return jsonify({
                "success": False,
                "message": "Unable to save the uploaded file."
            }), 500

        original_file_name = original_name

    else:
        file_path = None
        original_file_name = None

    if external_url:
        from urllib.parse import urlparse

        parsed_url = urlparse(external_url)

        if parsed_url.scheme not in ("http", "https") or not parsed_url.netloc:
            if file_path and os.path.exists(file_path):
                os.remove(file_path)

            return jsonify({
                "success": False,
                "message": "Please provide a valid HTTP or HTTPS URL."
            }), 400

    material = CourseMaterial(
        course_id=course_id,
        trainer_id=trainer_id,
        title=title,
        description=description,
        material_type=material_type,
        file_name=original_file_name,
        file_path=stored_name if uploaded_file and uploaded_file.filename else None,
        external_url=external_url or None
    )

    try:
        db.session.add(material)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Study material added successfully.",
            "material_id": material.id
        }), 201

    except Exception:
        db.session.rollback()

        if file_path and os.path.exists(file_path):
            os.remove(file_path)

        app.logger.exception("Study material database save failed")

        return jsonify({
            "success": False,
            "message": "Unable to add study material."
        }), 500

# =====================================================
# TRAINER: GET COURSE STUDY MATERIALS
# =====================================================

@app.route(
    "/api/trainer/courses/<int:course_id>/materials",
    methods=["GET"]
)
@role_required("trainer")
def get_trainer_course_materials(course_id):

    trainer_id = session["user_id"]

    course = TrainingCourse.query.filter_by(
        id=course_id,
        trainer_id=trainer_id
    ).first()

    if not course:
        return jsonify({
            "success": False,
            "message": "Course not found or access denied."
        }), 404

    materials = CourseMaterial.query.filter_by(
        course_id=course_id
    ).order_by(CourseMaterial.created_at.desc()).all()

    result = []

    for item in materials:
        result.append({
            "id": item.id,
            "title": item.title,
            "description": item.description,
            "material_type": item.material_type,
            "file_name": item.file_name,
            "external_url": item.external_url,
            "has_file": bool(item.file_path),
            "created_at": (
                item.created_at.isoformat()
                if item.created_at else None
            )
        })

    return jsonify({
        "success": True,
        "course": course.title,
        "materials": result
    }), 200

# =====================================================
# TRAINER: DELETE COURSE STUDY MATERIAL
# =====================================================

@app.route(
    "/api/trainer/materials/<int:material_id>",
    methods=["DELETE"]
)
@role_required("trainer")
def delete_course_material(material_id):

    trainer_id = session["user_id"]

    material = CourseMaterial.query.filter_by(
        id=material_id,
        trainer_id=trainer_id
    ).first()

    if not material:
        return jsonify({
            "success": False,
            "message": "Material not found or access denied."
        }), 404

    try:
        if material.file_path:
            file_path = os.path.join(
                app.config["UPLOAD_FOLDER"],
                material.file_path
            )

            if os.path.exists(file_path):
                os.remove(file_path)

        db.session.delete(material)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Study material deleted successfully."
        }), 200

    except Exception:
        db.session.rollback()
        app.logger.exception("Study material deletion failed")

        return jsonify({
            "success": False,
            "message": "Unable to delete study material."
        }), 500

# =====================================================
# 20. MARK OR UPDATE ATTENDANCE
# =====================================================

@app.route("/api/trainer/attendance", methods=["POST"])
@role_required("trainer")
def mark_attendance():

    data = request.get_json(silent=True) or {}

    course_id = data.get("course_id")
    records = data.get("records", [])

    if not course_id or not isinstance(records, list) or not records:

        return jsonify({
            "success": False,
            "message": "Course ID and attendance records are required."
        }), 400

    course = TrainingCourse.query.filter_by(
        id=course_id,
        trainer_id=session["user_id"]
    ).first()

    if not course:

        return jsonify({
            "success": False,
            "message": "Course not found."
        }), 404

    try:

        attendance_date = date.fromisoformat(
            data.get(
                "attendance_date",
                date.today().isoformat()
            )
        )

    except (ValueError, TypeError):

        return jsonify({
            "success": False,
            "message": "Invalid attendance date. Use YYYY-MM-DD."
        }), 400

    allowed_statuses = [
        "Present",
        "Absent",
        "Late",
        "Excused"
    ]

    try:

        for record in records:

            trainee_id = record.get("trainee_id")
            status = record.get("status")

            if not trainee_id or status not in allowed_statuses:

                db.session.rollback()

                return jsonify({
                    "success": False,
                    "message": "Invalid trainee ID or attendance status."
                }), 400

            enrollment = CourseEnrollment.query.filter_by(
                course_id=course_id,
                trainee_id=trainee_id,
                status="Enrolled"
            ).first()

            if not enrollment:

                db.session.rollback()

                return jsonify({
                    "success": False,
                    "message": f"Trainee {trainee_id} is not enrolled."
                }), 400

            attendance = Attendance.query.filter_by(
                course_id=course_id,
                trainee_id=trainee_id,
                attendance_date=attendance_date
            ).first()

            if attendance:

                attendance.status = status
                attendance.trainer_id = session["user_id"]
                attendance.marked_at = datetime.now(timezone.utc)

            else:

                attendance = Attendance(
                    course_id=course_id,
                    trainee_id=trainee_id,
                    trainer_id=session["user_id"],
                    attendance_date=attendance_date,
                    status=status
                )

                db.session.add(attendance)

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Attendance saved successfully."
        }), 200

    except Exception:

        db.session.rollback()
        app.logger.exception("Attendance saving failed")

        return jsonify({
            "success": False,
            "message": "Unable to save attendance."
        }), 500


# =====================================================
# 21. GET COURSE ATTENDANCE
# =====================================================

@app.route(
    "/api/trainer/courses/<int:course_id>/attendance",
    methods=["GET"]
)
@role_required("trainer")
def get_course_attendance(course_id):

    course = TrainingCourse.query.filter_by(
        id=course_id,
        trainer_id=session["user_id"]
    ).first()

    if not course:

        return jsonify({
            "success": False,
            "message": "Course not found."
        }), 404

    attendance_date_text = request.args.get("date")

    try:

        attendance_date = (
            date.fromisoformat(attendance_date_text)
            if attendance_date_text
            else date.today()
        )

    except ValueError:

        return jsonify({
            "success": False,
            "message": "Invalid date. Use YYYY-MM-DD."
        }), 400

    records = Attendance.query.filter_by(
        course_id=course_id,
        attendance_date=attendance_date
    ).all()

    result = []

    for record in records:

        trainee = db.session.get(
            User,
            record.trainee_id
        )

        if trainee:

            result.append({
                "trainee_id": trainee.id,
                "trainee_name": trainee.full_name,
                "status": record.status,
                "attendance_date": record.attendance_date.isoformat()
            })

    return jsonify({
        "success": True,
        "course": course.title,
        "attendance_date": attendance_date.isoformat(),
        "records": result
    }), 200


# =====================================================
# TRAINER: GENERATE QR ATTENDANCE SESSION
# =====================================================

@app.route(
    "/api/trainer/courses/<int:course_id>/attendance/qr-session",
    methods=["POST"]
)
@role_required("trainer")
def generate_attendance_qr(course_id):

    course = TrainingCourse.query.filter_by(
        id=course_id,
        trainer_id=session["user_id"]
    ).first()

    if not course:
        return jsonify({
            "success": False,
            "message": "Course not found."
        }), 404

    try:
        # Close previous active QR sessions for this course.
        QRAttendanceSession.query.filter_by(
            course_id=course_id,
            is_active=True
        ).update({"is_active": False})

        # Generate a secure random token.
        token = secrets.token_urlsafe(32)

        token_hash = hashlib.sha256(
            token.encode("utf-8")
        ).hexdigest()

        now = datetime.now(timezone.utc)
        expiry = now + timedelta(minutes=2)

        qr_session = QRAttendanceSession(
            course_id=course_id,
            trainer_id=session["user_id"],
            token_hash=token_hash,
            attendance_date=date.today(),
            expires_at=expiry,
            is_active=True
        )

        db.session.add(qr_session)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "QR attendance session generated.",
            "token": token,
            "course": course.title,
            "expires_at": expiry.isoformat(),
            "valid_for_seconds": 120
        }), 201

    except Exception:
        db.session.rollback()
        app.logger.exception("QR generation failed")

        return jsonify({
            "success": False,
            "message": "Unable to generate QR code."
        }), 500


# =====================================================
# TRAINER: CLOSE QR ATTENDANCE SESSION
# =====================================================

@app.route(
    "/api/trainer/courses/<int:course_id>/attendance/qr-session/close",
    methods=["POST"]
)
@role_required("trainer")
def close_attendance_qr(course_id):

    qr_session = QRAttendanceSession.query.filter_by(
        course_id=course_id,
        trainer_id=session["user_id"],
        is_active=True
    ).first()

    if not qr_session:
        return jsonify({
            "success": False,
            "message": "No active QR session found."
        }), 404

    qr_session.is_active = False
    db.session.commit()

    return jsonify({
        "success": True,
        "message": "QR attendance session closed."
    }), 200

# =====================================================
# 22. CREATE ASSESSMENT
# =====================================================

@app.route("/api/trainer/assessments", methods=["POST"])
@role_required("trainer")
def create_assessment():

    data = request.get_json(silent=True) or {}

    course_id = data.get("course_id")
    title = str(data.get("title") or "").strip()
    total_marks = data.get("total_marks")

    if not course_id or not title or total_marks is None:

        return jsonify({
            "success": False,
            "message": "Course, title and total marks are required."
        }), 400

    try:

        total_marks = int(total_marks)

    except (ValueError, TypeError):

        return jsonify({
            "success": False,
            "message": "Total marks must be a number."
        }), 400

    if total_marks <= 0:

        return jsonify({
            "success": False,
            "message": "Total marks must be greater than zero."
        }), 400

    course = TrainingCourse.query.filter_by(
        id=course_id,
        trainer_id=session["user_id"]
    ).first()

    if not course:

        return jsonify({
            "success": False,
            "message": "Course not found."
        }), 404

    due_date = None

    if data.get("due_date"):

        try:

            due_date = date.fromisoformat(
                data["due_date"]
            )

        except (ValueError, TypeError):

            return jsonify({
                "success": False,
                "message": "Invalid due date. Use YYYY-MM-DD."
            }), 400

    assessment = Assessment(
        course_id=course_id,
        trainer_id=session["user_id"],
        title=title,
        description=data.get("description"),
        total_marks=total_marks,
        due_date=due_date
    )

    try:

        db.session.add(assessment)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Assessment created successfully.",
            "assessment_id": assessment.id
        }), 201

    except Exception:

        db.session.rollback()
        app.logger.exception("Assessment creation failed")

        return jsonify({
            "success": False,
            "message": "Unable to create assessment."
        }), 500


# =====================================================
# 23. GET TRAINER ASSESSMENTS
# =====================================================

@app.route("/api/trainer/assessments", methods=["GET"])
@role_required("trainer")
def get_trainer_assessments():

    assessments = Assessment.query.filter_by(
        trainer_id=session["user_id"]
    ).order_by(Assessment.id.desc()).all()

    result = []

    for assessment in assessments:

        course = db.session.get(
            TrainingCourse,
            assessment.course_id
        )

        result.append({
            "id": assessment.id,
            "title": assessment.title,
            "description": assessment.description,
            "course_id": assessment.course_id,
            "course_title": (
                course.title if course else None
            ),
            "total_marks": assessment.total_marks,
            "due_date": (
                assessment.due_date.isoformat()
                if assessment.due_date else None
            ),
            "results_count": AssessmentResult.query.filter_by(
                assessment_id=assessment.id
            ).count()
        })

    return jsonify({
        "success": True,
        "assessments": result
    }), 200


# =====================================================
# 24. RECORD OR UPDATE ASSESSMENT RESULT
# =====================================================

@app.route(
    "/api/trainer/assessments/<int:assessment_id>/results",
    methods=["POST"]
)
@role_required("trainer")
def record_assessment_result(assessment_id):

    data = request.get_json(silent=True) or {}

    trainee_id = data.get("trainee_id")
    marks = data.get("marks_obtained")

    if trainee_id is None or marks is None:

        return jsonify({
            "success": False,
            "message": "Trainee ID and marks are required."
        }), 400

    try:

        marks = int(marks)

    except (ValueError, TypeError):

        return jsonify({
            "success": False,
            "message": "Marks must be a number."
        }), 400

    assessment = Assessment.query.filter_by(
        id=assessment_id,
        trainer_id=session["user_id"]
    ).first()

    if not assessment:

        return jsonify({
            "success": False,
            "message": "Assessment not found."
        }), 404

    if marks < 0 or marks > assessment.total_marks:

        return jsonify({
            "success": False,
            "message": "Marks are outside the allowed range."
        }), 400

    enrollment = CourseEnrollment.query.filter_by(
        course_id=assessment.course_id,
        trainee_id=trainee_id,
        status="Enrolled"
    ).first()

    if not enrollment:

        return jsonify({
            "success": False,
            "message": "Trainee is not enrolled in this course."
        }), 400

    result = AssessmentResult.query.filter_by(
        assessment_id=assessment_id,
        trainee_id=trainee_id
    ).first()

    try:

        if result:

            result.marks_obtained = marks
            result.feedback = data.get("feedback")
            result.submitted_at = datetime.now(timezone.utc)

        else:

            result = AssessmentResult(
                assessment_id=assessment_id,
                trainee_id=trainee_id,
                marks_obtained=marks,
                feedback=data.get("feedback")
            )

            db.session.add(result)

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Assessment result saved successfully."
        }), 200

    except Exception:

        db.session.rollback()
        app.logger.exception("Assessment result saving failed")

        return jsonify({
            "success": False,
            "message": "Unable to save assessment result."
        }), 500


# =====================================================
# 25. GET ASSESSMENT RESULTS
# =====================================================

@app.route(
    "/api/trainer/assessments/<int:assessment_id>/results",
    methods=["GET"]
)
@role_required("trainer")
def get_assessment_results(assessment_id):

    assessment = Assessment.query.filter_by(
        id=assessment_id,
        trainer_id=session["user_id"]
    ).first()

    if not assessment:
        return jsonify({
            "success": False,
            "message": "Assessment not found."
        }), 404

    results = AssessmentResult.query.filter_by(
        assessment_id=assessment_id
    ).all()

    result_list = []

    for result in results:

        trainee = db.session.get(
            User,
            result.trainee_id
        )

        if not trainee:
            continue

        percentage = round(
            (result.marks_obtained / assessment.total_marks) * 100,
            2
        )

        result_list.append({
            "id": result.id,
            "trainee_id": trainee.id,
            "trainee_name": trainee.full_name,
            "marks_obtained": result.marks_obtained,
            "total_marks": assessment.total_marks,
            "percentage": percentage,
            "result": "Pass" if percentage >= 40 else "Fail",
            "feedback": result.feedback,
            "submitted_at": (
                result.submitted_at.isoformat()
                if result.submitted_at else None
            )
        })

    return jsonify({
        "success": True,
        "assessment": {
            "id": assessment.id,
            "title": assessment.title,
            "total_marks": assessment.total_marks
        },
        "results": result_list
    }), 200

# =========================================================
# TRAINEE APIs
# =========================================================

@app.route("/api/trainee/dashboard", methods=["GET"])
@role_required("trainee")
def trainee_dashboard():

    trainee_id = session["user_id"]

    enrollments = CourseEnrollment.query.filter_by(
        trainee_id=trainee_id
    ).all()

    course_ids = [item.course_id for item in enrollments]

    total_courses = len(enrollments)

    attendance_records = Attendance.query.filter_by(
        trainee_id=trainee_id
    ).all()

    total_attendance = len(attendance_records)

    present_count = sum(
        1 for item in attendance_records
        if item.status == "Present"
    )

    attendance_percentage = (
        round((present_count / total_attendance) * 100, 2)
        if total_attendance else 0
    )

    completed_courses = sum(
        1 for item in enrollments
        if item.status.lower() == "completed"
    )

    total_assessments = Assessment.query.filter(
        Assessment.course_id.in_(course_ids)
    ).count() if course_ids else 0

    return jsonify({
        "success": True,
        "stats": {
            "total_courses": total_courses,
            "completed_courses": completed_courses,
            "attendance_percentage": attendance_percentage,
            "total_assessments": total_assessments
        }
    }), 200


@app.route("/api/trainee/courses", methods=["GET"])
@role_required("trainee")
def trainee_courses():

    trainee_id = session["user_id"]

    records = (
        db.session.query(CourseEnrollment, TrainingCourse, User)
        .join(
            TrainingCourse,
            CourseEnrollment.course_id == TrainingCourse.id
        )
        .outerjoin(
            User,
            TrainingCourse.trainer_id == User.id
        )
        .filter(CourseEnrollment.trainee_id == trainee_id)
        .order_by(CourseEnrollment.enrolled_at.desc())
        .all()
    )

    courses = []

    for enrollment, course, trainer in records:
        courses.append({
            "enrollment_id": enrollment.id,
            "course_id": course.id,
            "title": course.title,
            "category": course.category,
            "description": course.description,
            "duration": course.duration,
            "mode": course.mode,
            "course_status": course.status,
            "enrollment_status": enrollment.status,
            "trainer_name": trainer.full_name if trainer else "Not Assigned",
            "enrolled_at": (
                enrollment.enrolled_at.isoformat()
                if enrollment.enrolled_at else None
            )
        })

    return jsonify({
        "success": True,
        "courses": courses
    }), 200

@app.route("/api/trainee/courses/catalog", methods=["GET"])
@role_required("trainee")
def trainee_course_catalog():

    trainee_id = session["user_id"]

    # Search and category filters
    search = request.args.get("search", "").strip()
    category = request.args.get("category", "").strip()

    # Only show ongoing courses
    query = (
        db.session.query(TrainingCourse, User)
        .outerjoin(
            User,
            TrainingCourse.trainer_id == User.id
        )
        .filter(TrainingCourse.status == "Ongoing")
    )

    # Search by course title, category or description
    if search:
        search_term = f"%{search}%"

        query = query.filter(
            db.or_(
                TrainingCourse.title.ilike(search_term),
                TrainingCourse.category.ilike(search_term),
                TrainingCourse.description.ilike(search_term)
            )
        )

    # Filter by category
    if category and category.lower() != "all":
        query = query.filter(
            TrainingCourse.category == category
        )

    records = query.order_by(
        TrainingCourse.created_at.desc()
    ).all()

    # Find courses in which trainee is already enrolled
    enrolled_ids = {
        item.course_id
        for item in CourseEnrollment.query.filter_by(
            trainee_id=trainee_id
        ).all()
    }

    courses = []

    for course, trainer in records:

        courses.append({
            "course_id": course.id,
            "title": course.title,
            "category": course.category,
            "description": course.description,
            "duration": course.duration,
            "mode": course.mode,
            "course_status": course.status,
            "trainer_name": (
                trainer.full_name
                if trainer else "Not Assigned"
            ),
            "is_enrolled": course.id in enrolled_ids
        })

    categories = [
        item[0]
        for item in db.session.query(
            TrainingCourse.category
        ).filter(
            TrainingCourse.status == "Ongoing",
            TrainingCourse.category.isnot(None)
        ).distinct().all()
    ]

    return jsonify({
        "success": True,
        "courses": courses,
        "categories": categories
    }), 200


@app.route(
    "/api/trainee/courses/<int:course_id>/enroll",
    methods=["POST"]
)
@role_required("trainee")
def enroll_in_course(course_id):

    trainee_id = session["user_id"]

    # Check whether course exists
    course = db.session.get(
        TrainingCourse,
        course_id
    )

    if not course:
        return jsonify({
            "success": False,
            "message": "Course not found."
        }), 404

    # Only ongoing courses can be selected
    if course.status != "Ongoing":
        return jsonify({
            "success": False,
            "message": "This course is not available for enrollment."
        }), 400

    # Prevent duplicate enrollment
    existing = CourseEnrollment.query.filter_by(
        course_id=course_id,
        trainee_id=trainee_id
    ).first()

    if existing:
        return jsonify({
            "success": False,
            "message": "You are already enrolled in this course."
        }), 409

    try:
        enrollment = CourseEnrollment(
            course_id=course_id,
            trainee_id=trainee_id,
            status="Enrolled"
        )

        db.session.add(enrollment)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Successfully enrolled in the course!",
            "enrollment": {
                "id": enrollment.id,
                "course_id": enrollment.course_id,
                "status": enrollment.status
            }
        }), 201

    except Exception:
        db.session.rollback()
        app.logger.exception("Course enrollment failed")

        return jsonify({
            "success": False,
            "message": "Unable to enroll. Please try again."
        }), 500

@app.route("/api/trainee/attendance", methods=["GET"])
@role_required("trainee")
def trainee_attendance():

    trainee_id = session["user_id"]

    records = (
        db.session.query(Attendance, TrainingCourse)
        .join(
            TrainingCourse,
            Attendance.course_id == TrainingCourse.id
        )
        .filter(Attendance.trainee_id == trainee_id)
        .order_by(Attendance.attendance_date.desc())
        .all()
    )

    attendance_list = []

    for attendance, course in records:
        attendance_list.append({
            "id": attendance.id,
            "course_id": course.id,
            "course_title": course.title,
            "date": attendance.attendance_date.isoformat(),
            "status": attendance.status
        })

    total = len(attendance_list)
    present = sum(
        1 for item in attendance_list
        if item["status"] == "Present"
    )

    percentage = round((present / total) * 100, 2) if total else 0

    return jsonify({
        "success": True,
        "attendance": attendance_list,
        "summary": {
            "total": total,
            "present": present,
            "percentage": percentage
        }
    }), 200


@app.route("/api/trainee/assessments", methods=["GET"])
@role_required("trainee")
def trainee_assessments():

    trainee_id = session["user_id"]

    course_ids = [
        item.course_id
        for item in CourseEnrollment.query.filter_by(
            trainee_id=trainee_id
        ).all()
    ]

    if not course_ids:
        return jsonify({
            "success": True,
            "assessments": []
        }), 200

    records = (
        db.session.query(Assessment, TrainingCourse)
        .join(
            TrainingCourse,
            Assessment.course_id == TrainingCourse.id
        )
        .filter(Assessment.course_id.in_(course_ids))
        .order_by(Assessment.created_at.desc())
        .all()
    )

    assessment_list = []

    for assessment, course in records:

        result = AssessmentResult.query.filter_by(
            assessment_id=assessment.id,
            trainee_id=trainee_id
        ).first()

        percentage = None
        result_status = "Pending"

        if result:
            percentage = round(
                (result.marks_obtained / assessment.total_marks) * 100,
                2
            )
            result_status = "Pass" if percentage >= 40 else "Fail"

        assessment_list.append({
            "id": assessment.id,
            "title": assessment.title,
            "description": assessment.description,
            "course_id": course.id,
            "course_title": course.title,
            "total_marks": assessment.total_marks,
            "due_date": (
                assessment.due_date.isoformat()
                if assessment.due_date else None
            ),
            "marks_obtained": (
                result.marks_obtained if result else None
            ),
            "percentage": percentage,
            "result_status": result_status,
            "feedback": result.feedback if result else None
        })

    return jsonify({
        "success": True,
        "assessments": assessment_list
    }), 200

# =========================================================
# CERTIFICATE MANAGEMENT APIs
# =========================================================

@app.route(
    "/api/trainer/courses/<int:course_id>/enrollments/<int:trainee_id>/status",
    methods=["PUT"]
)
@role_required("trainer")
def update_enrollment_status(course_id, trainee_id):

    course = TrainingCourse.query.filter_by(
        id=course_id,
        trainer_id=session["user_id"]
    ).first()

    if not course:
        return jsonify({
            "success": False,
            "message": "Course not found."
        }), 404

    enrollment = CourseEnrollment.query.filter_by(
        course_id=course_id,
        trainee_id=trainee_id
    ).first()

    if not enrollment:
        return jsonify({
            "success": False,
            "message": "Trainee is not enrolled in this course."
        }), 404

    data = request.get_json() or {}
    new_status = data.get("status", "").strip()

    allowed_statuses = [
        "Enrolled",
        "In Progress",
        "Completed",
        "Dropped"
    ]

    if new_status not in allowed_statuses:
        return jsonify({
            "success": False,
            "message": "Invalid enrollment status."
        }), 400

    enrollment.status = new_status
    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Enrollment status updated.",
        "status": enrollment.status
    }), 200


@app.route(
    "/api/trainer/courses/<int:course_id>/certificates",
    methods=["POST"]
)
@role_required("trainer")
def issue_certificate(course_id):

    course = TrainingCourse.query.filter_by(
        id=course_id,
        trainer_id=session["user_id"]
    ).first()

    if not course:
        return jsonify({
            "success": False,
            "message": "Course not found."
        }), 404

    data = request.get_json() or {}
    trainee_id = data.get("trainee_id")

    if not trainee_id:
        return jsonify({
            "success": False,
            "message": "Trainee ID is required."
        }), 400

    enrollment = CourseEnrollment.query.filter_by(
        course_id=course_id,
        trainee_id=trainee_id
    ).first()

    if not enrollment:
        return jsonify({
            "success": False,
            "message": "Trainee is not enrolled in this course."
        }), 404

    if enrollment.status != "Completed":
        return jsonify({
            "success": False,
            "message": "Complete the course before issuing a certificate."
        }), 400

    existing = Certificate.query.filter_by(
        course_id=course_id,
        trainee_id=trainee_id
    ).first()

    if existing:
        return jsonify({
            "success": False,
            "message": "A certificate has already been issued.",
            "certificate_number": existing.certificate_number
        }), 409

    trainee = db.session.get(User, trainee_id)

    if not trainee or trainee.role != "trainee":
        return jsonify({
            "success": False,
            "message": "Invalid trainee account."
        }), 404

    certificate_number = (
        f"NCCT-{datetime.now().year}-{uuid4().hex[:8].upper()}"
    )

    certificate = Certificate(
        certificate_number=certificate_number,
        trainee_id=trainee_id,
        course_id=course_id,
        issued_by=session["user_id"]
    )

    db.session.add(certificate)
    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Certificate issued successfully.",
        "certificate": {
            "certificate_number": certificate.certificate_number,
            "trainee_name": trainee.full_name,
            "course_title": course.title,
            "issued_at": certificate.issued_at.isoformat()
        }
    }), 201


@app.route("/api/trainee/certificates", methods=["GET"])
@role_required("trainee")
def trainee_certificates():

    records = (
        db.session.query(Certificate, TrainingCourse)
        .join(
            TrainingCourse,
            Certificate.course_id == TrainingCourse.id
        )
        .filter(Certificate.trainee_id == session["user_id"])
        .order_by(Certificate.issued_at.desc())
        .all()
    )

    certificates = []

    for certificate, course in records:
        trainee = db.session.get(User, certificate.trainee_id)

        certificates.append({
            "certificate_number": certificate.certificate_number,
            "trainee_name": trainee.full_name if trainee else "Trainee",
            "course_title": course.title,
            "issued_at": (
                certificate.issued_at.isoformat()
                if certificate.issued_at else None
            )
        })

    return jsonify({
        "success": True,
        "certificates": certificates
    }), 200


@app.route(
    "/api/certificates/verify/<string:certificate_number>",
    methods=["GET"]
)
def verify_certificate(certificate_number):

    certificate = Certificate.query.filter_by(
        certificate_number=certificate_number
    ).first()

    if not certificate:
        return jsonify({
            "success": True,
            "valid": False,
            "message": "Certificate not found. This certificate is not valid."
        }), 200

    trainee = db.session.get(User, certificate.trainee_id)
    course = db.session.get(TrainingCourse, certificate.course_id)

    return jsonify({
        "success": True,
        "valid": True,
        "certificate": {
            "certificate_number": certificate.certificate_number,
            "trainee_name": trainee.full_name if trainee else "Unknown",
            "course_title": course.title if course else "Unknown",
            "issued_at": (
                certificate.issued_at.isoformat()
                if certificate.issued_at else None
            )
        }
    }), 200


# =========================================================
# EMPLOYMENT MODELS
# =========================================================

class Job(db.Model):
    __tablename__ = "jobs"

    id = db.Column(db.Integer, primary_key=True)

    title = db.Column(db.String(150), nullable=False)
    company = db.Column(db.String(150), nullable=False)
    location = db.Column(db.String(150))
    description = db.Column(db.Text, nullable=False)
    job_type = db.Column(db.String(50), default="Full-time")
    salary_range = db.Column(db.String(100))
    skills = db.Column(db.Text)
    deadline = db.Column(db.Date)

    status = db.Column(db.String(30), default="Open")

    recruiter_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    created_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc)
    )


class JobApplication(db.Model):
    __tablename__ = "job_applications"

    id = db.Column(db.Integer, primary_key=True)

    job_id = db.Column(
        db.Integer,
        db.ForeignKey("jobs.id"),
        nullable=False
    )

    trainee_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    cover_letter = db.Column(db.Text)

    status = db.Column(db.String(30), default="Applied")

    applied_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc)
    )

    __table_args__ = (
        db.UniqueConstraint(
            "job_id",
            "trainee_id",
            name="unique_job_application"
        ),
    )


# =========================================================
# EMPLOYMENT APIs
# =========================================================

# Recruiter: Create a job
@app.route("/api/recruiter/jobs", methods=["POST"])
@role_required("recruiter")
def create_job():

    data = request.get_json() or {}

    title = (data.get("title") or "").strip()
    company = (data.get("company") or "").strip()
    description = (data.get("description") or "").strip()

    if not title or not company or not description:
        return jsonify({
            "success": False,
            "message": "Title, company and description are required."
        }), 400

    deadline = None
    deadline_value = data.get("deadline")

    if deadline_value:
        try:
            deadline = date.fromisoformat(deadline_value)
        except (ValueError, TypeError):
            return jsonify({
                "success": False,
                "message": "Deadline must use YYYY-MM-DD format."
            }), 400

    job = Job(
        title=title,
        company=company,
        location=(data.get("location") or "").strip(),
        description=description,
        job_type=(data.get("job_type") or "Full-time").strip(),
        salary_range=(data.get("salary_range") or "").strip(),
        skills=(data.get("skills") or "").strip(),
        deadline=deadline,
        recruiter_id=session["user_id"]
    )

    db.session.add(job)
    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Job created successfully.",
        "job_id": job.id
    }), 201


# Recruiter: View their own jobs
@app.route("/api/recruiter/jobs", methods=["GET"])
@role_required("recruiter")
def recruiter_jobs():

    jobs = Job.query.filter_by(
        recruiter_id=session["user_id"]
    ).order_by(Job.created_at.desc()).all()

    job_list = []

    for job in jobs:
        application_count = JobApplication.query.filter_by(
            job_id=job.id
        ).count()

        job_list.append({
            "id": job.id,
            "title": job.title,
            "company": job.company,
            "location": job.location,
            "description": job.description,
            "job_type": job.job_type,
            "salary_range": job.salary_range,
            "skills": job.skills,
            "deadline": job.deadline.isoformat() if job.deadline else None,
            "status": job.status,
            "application_count": application_count,
            "created_at": job.created_at.isoformat() if job.created_at else None
        })

    return jsonify({
        "success": True,
        "jobs": job_list
    }), 200


# Recruiter: Update job status
@app.route("/api/recruiter/jobs/<int:job_id>/status", methods=["PUT"])
@role_required("recruiter")
def update_job_status(job_id):

    job = Job.query.filter_by(
        id=job_id,
        recruiter_id=session["user_id"]
    ).first()

    if not job:
        return jsonify({
            "success": False,
            "message": "Job not found."
        }), 404

    data = request.get_json() or {}
    new_status = data.get("status")

    if new_status not in ["Open", "Closed"]:
        return jsonify({
            "success": False,
            "message": "Status must be Open or Closed."
        }), 400

    job.status = new_status
    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Job status updated.",
        "status": job.status
    }), 200


# Trainee: Browse open jobs
@app.route("/api/trainee/jobs", methods=["GET"])
@role_required("trainee")
def available_jobs():

    jobs = Job.query.filter_by(
        status="Open"
    ).order_by(Job.created_at.desc()).all()

    job_list = []

    for job in jobs:
        existing_application = JobApplication.query.filter_by(
            job_id=job.id,
            trainee_id=session["user_id"]
        ).first()

        job_list.append({
            "id": job.id,
            "title": job.title,
            "company": job.company,
            "location": job.location,
            "description": job.description,
            "job_type": job.job_type,
            "salary_range": job.salary_range,
            "skills": job.skills,
            "deadline": job.deadline.isoformat() if job.deadline else None,
            "already_applied": existing_application is not None
        })

    return jsonify({
        "success": True,
        "jobs": job_list
    }), 200


# Trainee: Apply for a job
@app.route("/api/trainee/jobs/<int:job_id>/apply", methods=["POST"])
@role_required("trainee")
def apply_for_job(job_id):

    job = Job.query.filter_by(
        id=job_id,
        status="Open"
    ).first()

    if not job:
        return jsonify({
            "success": False,
            "message": "Job is not available."
        }), 404

    if job.deadline and job.deadline < date.today():
        return jsonify({
            "success": False,
            "message": "The application deadline has passed."
        }), 400

    existing = JobApplication.query.filter_by(
        job_id=job_id,
        trainee_id=session["user_id"]
    ).first()

    if existing:
        return jsonify({
            "success": False,
            "message": "You have already applied for this job."
        }), 409

    data = request.get_json() or {}

    application = JobApplication(
        job_id=job_id,
        trainee_id=session["user_id"],
        cover_letter=(data.get("cover_letter") or "").strip()
    )

    db.session.add(application)
    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Your application was submitted successfully.",
        "application_id": application.id
    }), 201


# Trainee: View own applications
@app.route("/api/trainee/applications", methods=["GET"])
@role_required("trainee")
def trainee_applications():

    records = (
        db.session.query(JobApplication, Job)
        .join(Job, JobApplication.job_id == Job.id)
        .filter(JobApplication.trainee_id == session["user_id"])
        .order_by(JobApplication.applied_at.desc())
        .all()
    )

    applications = []

    for application, job in records:
        applications.append({
            "id": application.id,
            "job_id": job.id,
            "job_title": job.title,
            "company": job.company,
            "location": job.location,
            "job_type": job.job_type,
            "status": application.status,
            "cover_letter": application.cover_letter,
            "applied_at": (
                application.applied_at.isoformat()
                if application.applied_at else None
            )
        })

    return jsonify({
        "success": True,
        "applications": applications
    }), 200


# Recruiter: View applicants for one of their jobs
@app.route(
    "/api/recruiter/jobs/<int:job_id>/applications",
    methods=["GET"]
)
@role_required("recruiter")
def recruiter_job_applications(job_id):

    job = Job.query.filter_by(
        id=job_id,
        recruiter_id=session["user_id"]
    ).first()

    if not job:
        return jsonify({
            "success": False,
            "message": "Job not found."
        }), 404

    records = (
        db.session.query(JobApplication, User)
        .join(User, JobApplication.trainee_id == User.id)
        .filter(JobApplication.job_id == job_id)
        .order_by(JobApplication.applied_at.desc())
        .all()
    )

    applications = []

    for application, trainee in records:
        applications.append({
            "id": application.id,
            "trainee_id": trainee.id,
            "trainee_name": trainee.full_name,
            "trainee_email": trainee.email,
            "cover_letter": application.cover_letter,
            "status": application.status,
            "applied_at": (
                application.applied_at.isoformat()
                if application.applied_at else None
            )
        })

    return jsonify({
        "success": True,
        "job": {
            "id": job.id,
            "title": job.title,
            "company": job.company
        },
        "applications": applications
    }), 200


# Recruiter: Update application status
@app.route(
    "/api/recruiter/applications/<int:application_id>/status",
    methods=["PUT"]
)
@role_required("recruiter")
def update_application_status(application_id):

    application = db.session.get(JobApplication, application_id)

    if not application:
        return jsonify({
            "success": False,
            "message": "Application not found."
        }), 404

    job = Job.query.filter_by(
        id=application.job_id,
        recruiter_id=session["user_id"]
    ).first()

    if not job:
        return jsonify({
            "success": False,
            "message": "You are not authorized to update this application."
        }), 403

    data = request.get_json() or {}
    new_status = data.get("status")

    allowed_statuses = [
        "Applied",
        "Shortlisted",
        "Rejected",
        "Hired"
    ]

    if new_status not in allowed_statuses:
        return jsonify({
            "success": False,
            "message": "Invalid application status."
        }), 400

    application.status = new_status
    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Application status updated.",
        "status": application.status
    }), 200




# =========================================================
# 26. ADMIN DASHBOARD AND MANAGEMENT APIs
# =========================================================

def _admin_course_record(course):
    trainer = db.session.get(User, course.trainer_id)
    return {
        "id": course.id,
        "title": course.title,
        "name": course.title,
        "category": course.category,
        "description": course.description,
        "duration": course.duration,
        "mode": course.mode,
        "status": course.status,
        "trainer_id": course.trainer_id,
        "trainer_name": trainer.full_name if trainer else "Not Assigned",
        "created_at": course.created_at.isoformat() if course.created_at else None,
        "trainees": CourseEnrollment.query.filter_by(
            course_id=course.id
        ).count()
    }


@app.route("/api/admin/dashboard", methods=["GET"])
@role_required("admin")
def admin_dashboard():

    trainees_count = User.query.filter_by(role="trainee").count()
    trainers_count = User.query.filter_by(role="trainer").count()
    recruiters_count = User.query.filter_by(role="recruiter").count()

    courses = TrainingCourse.query.all()
    enrollments = CourseEnrollment.query.all()

    total_courses = len(courses)
    active_courses = sum(1 for course in courses if course.status == "Ongoing")
    total_certificates = Certificate.query.count()
    total_jobs = Job.query.count()
    total_applications = JobApplication.query.count()

    current_year = datetime.now().year
    monthly_counts = {month: 0 for month in range(1, 13)}

    for enrollment in enrollments:
        if enrollment.enrolled_at and enrollment.enrolled_at.year == current_year:
            monthly_counts[enrollment.enrolled_at.month] += 1

    monthly_enrollments = [
        {
            "month": date(current_year, month, 1).strftime("%b"),
            "count": monthly_counts[month]
        }
        for month in range(1, 13)
    ]

    completed_enrollments = sum(
        1 for enrollment in enrollments
        if (enrollment.status or "").lower() == "completed"
    )
    in_progress_enrollments = max(
        len(enrollments) - completed_enrollments, 0
    )

    if enrollments:
        completed_percentage = round(
            completed_enrollments / len(enrollments) * 100
        )
    else:
        completed_percentage = 0

    return jsonify({
        "success": True,
        "stats": {
            "total_trainees": trainees_count,
            "total_trainers": trainers_count,
            "total_recruiters": recruiters_count,
            "active_programmes": active_courses,
            "total_courses": total_courses,
            "total_certificates": total_certificates,
            "total_jobs": total_jobs,
            "total_applications": total_applications,
            "total_institutions": db.session.query(
                TraineeProfile.institution
            ).filter(
                TraineeProfile.institution.isnot(None),
                TraineeProfile.institution != ""
            ).distinct().count()
        },
        "monthly_enrollments": monthly_enrollments,
        "training_progress": {
            "completed": completed_percentage,
            "in_progress": 100 - completed_percentage
        }
    }), 200


@app.route("/api/admin/trainees", methods=["GET"])
@role_required("admin")
def admin_trainees():

    trainees = User.query.filter_by(
        role="trainee"
    ).order_by(User.created_at.desc()).all()

    result = []

    for trainee in trainees:
        profile = TraineeProfile.query.filter_by(
            user_id=trainee.id
        ).first()

        result.append({
            "id": trainee.id,
            "full_name": trainee.full_name,
            "name": trainee.full_name,
            "email": trainee.email,
            "role": trainee.role,
            "is_active": trainee.is_active,
            "status": "Active" if trainee.is_active else "Inactive",
            "created_at": trainee.created_at.isoformat() if trainee.created_at else None,
            "phone": profile.phone if profile else None,
            "gender": profile.gender if profile else None,
            "education": profile.education if profile else None,
            "institution": profile.institution if profile else None,
            "district": profile.district if profile else None,
            "state": profile.state if profile else None,
            "skills": profile.skills if profile else None
        })

    return jsonify({"success": True, "trainees": result}), 200


@app.route("/api/admin/trainers", methods=["GET"])
@role_required("admin")
def admin_trainers():

    trainers = User.query.filter_by(
        role="trainer"
    ).order_by(User.created_at.desc()).all()

    result = []

    for trainer in trainers:
        trainer_courses = TrainingCourse.query.filter_by(
            trainer_id=trainer.id
        ).all()

        result.append({
            "id": trainer.id,
            "full_name": trainer.full_name,
            "name": trainer.full_name,
            "email": trainer.email,
            "role": trainer.role,
            "is_active": trainer.is_active,
            "status": "Active" if trainer.is_active else "Inactive",
            "created_at": trainer.created_at.isoformat() if trainer.created_at else None,
            "total_courses": len(trainer_courses),
            "courses": len(trainer_courses)
        })

    return jsonify({"success": True, "trainers": result}), 200


@app.route("/api/admin/recruiters", methods=["GET"])
@role_required("admin")
def admin_recruiters():

    recruiters = User.query.filter_by(
        role="recruiter"
    ).order_by(User.created_at.desc()).all()

    result = []

    for recruiter in recruiters:
        recruiter_jobs = Job.query.filter_by(
            recruiter_id=recruiter.id
        ).all()

        result.append({
            "id": recruiter.id,
            "full_name": recruiter.full_name,
            "name": recruiter.full_name,
            "email": recruiter.email,
            "role": recruiter.role,
            "is_active": recruiter.is_active,
            "status": "Active" if recruiter.is_active else "Inactive",
            "created_at": recruiter.created_at.isoformat() if recruiter.created_at else None,
            "total_jobs": len(recruiter_jobs),
            "company": recruiter_jobs[0].company if recruiter_jobs else None
        })

    return jsonify({"success": True, "recruiters": result}), 200


@app.route("/api/admin/institutions", methods=["GET"])
@role_required("admin")
def admin_institutions():

    profiles = TraineeProfile.query.filter(
        TraineeProfile.institution.isnot(None),
        TraineeProfile.institution != ""
    ).all()

    institutions = {}

    for profile in profiles:
        institution_name = profile.institution.strip()
        if not institution_name:
            continue

        if institution_name not in institutions:
            institutions[institution_name] = {
                "id": institution_name,
                "name": institution_name,
                "institution": institution_name,
                "trainee_count": 0,
                "trainees": 0,
                "district": profile.district,
                "state": profile.state
            }

        institutions[institution_name]["trainee_count"] += 1
        institutions[institution_name]["trainees"] += 1

    result = sorted(
        institutions.values(),
        key=lambda item: item["name"].lower()
    )

    return jsonify({
        "success": True,
        "institutions": result,
        "note": "Institution records are derived from trainee profiles; there is no separate institution table."
    }), 200


@app.route("/api/admin/programmes", methods=["GET"])
@role_required("admin")
def admin_programmes():

    # The current database has TrainingCourse, but no separate Programme model.
    courses = TrainingCourse.query.order_by(
        TrainingCourse.created_at.desc()
    ).all()

    result = [_admin_course_record(course) for course in courses]

    return jsonify({
        "success": True,
        "programmes": result,
        "note": "These programme entries are based on existing training courses."
    }), 200


@app.route("/api/admin/courses", methods=["GET"])
@role_required("admin")
def admin_courses():

    courses = TrainingCourse.query.order_by(
        TrainingCourse.created_at.desc()
    ).all()

    return jsonify({
        "success": True,
        "courses": [_admin_course_record(course) for course in courses]
    }), 200


@app.route("/api/admin/attendance", methods=["GET"])
@role_required("admin")
def admin_attendance():

    records = (
        db.session.query(Attendance, TrainingCourse)
        .join(TrainingCourse, Attendance.course_id == TrainingCourse.id)
        .order_by(Attendance.attendance_date.desc())
        .all()
    )

    result = []

    for attendance, course in records:
        trainee = db.session.get(User, attendance.trainee_id)
        trainer = db.session.get(User, attendance.trainer_id)

        result.append({
            "id": attendance.id,
            "trainee_id": attendance.trainee_id,
            "trainee_name": trainee.full_name if trainee else "Unknown",
            "course_id": course.id,
            "course_title": course.title,
            "trainer_id": attendance.trainer_id,
            "trainer_name": trainer.full_name if trainer else "Unknown",
            "date": attendance.attendance_date.isoformat(),
            "attendance_date": attendance.attendance_date.isoformat(),
            "status": attendance.status,
            "marked_at": attendance.marked_at.isoformat() if attendance.marked_at else None
        })

    return jsonify({"success": True, "attendance": result}), 200


@app.route("/api/admin/certificates", methods=["GET"])
@role_required("admin")
def admin_certificates():

    records = (
        db.session.query(Certificate, TrainingCourse)
        .join(TrainingCourse, Certificate.course_id == TrainingCourse.id)
        .order_by(Certificate.issued_at.desc())
        .all()
    )

    result = []

    for certificate, course in records:
        trainee = db.session.get(User, certificate.trainee_id)
        issuer = db.session.get(User, certificate.issued_by)

        result.append({
            "id": certificate.id,
            "certificate_number": certificate.certificate_number,
            "trainee_id": certificate.trainee_id,
            "trainee_name": trainee.full_name if trainee else "Unknown",
            "course_id": course.id,
            "course_title": course.title,
            "issued_by": issuer.full_name if issuer else "Unknown",
            "issued_at": certificate.issued_at.isoformat() if certificate.issued_at else None
        })

    return jsonify({"success": True, "certificates": result}), 200


@app.route("/api/admin/jobs", methods=["GET"])
@role_required("admin")
def admin_jobs():

    jobs = Job.query.order_by(Job.created_at.desc()).all()
    result = []

    for job in jobs:
        recruiter = db.session.get(User, job.recruiter_id)

        result.append({
            "id": job.id,
            "title": job.title,
            "company": job.company,
            "location": job.location,
            "description": job.description,
            "job_type": job.job_type,
            "salary_range": job.salary_range,
            "skills": job.skills,
            "deadline": job.deadline.isoformat() if job.deadline else None,
            "status": job.status,
            "recruiter_id": job.recruiter_id,
            "recruiter_name": recruiter.full_name if recruiter else "Unknown",
            "application_count": JobApplication.query.filter_by(job_id=job.id).count(),
            "created_at": job.created_at.isoformat() if job.created_at else None
        })

    return jsonify({"success": True, "jobs": result}), 200


@app.route("/api/admin/applications", methods=["GET"])
@role_required("admin")
def admin_applications():

    records = (
        db.session.query(JobApplication, Job)
        .join(Job, JobApplication.job_id == Job.id)
        .order_by(JobApplication.applied_at.desc())
        .all()
    )

    result = []

    for application, job in records:
        trainee = db.session.get(User, application.trainee_id)
        recruiter = db.session.get(User, job.recruiter_id)

        result.append({
            "id": application.id,
            "job_id": job.id,
            "job_title": job.title,
            "company": job.company,
            "trainee_id": application.trainee_id,
            "trainee_name": trainee.full_name if trainee else "Unknown",
            "trainee_email": trainee.email if trainee else None,
            "recruiter_id": job.recruiter_id,
            "recruiter_name": recruiter.full_name if recruiter else "Unknown",
            "status": application.status,
            "cover_letter": application.cover_letter,
            "applied_at": application.applied_at.isoformat() if application.applied_at else None
        })

    return jsonify({"success": True, "applications": result}), 200

@app.route(
    "/api/admin/users/<int:user_id>/status",
    methods=["PUT"]
)
@role_required("admin")
def admin_update_user_status(user_id):

    data = request.get_json(silent=True) or {}
    is_active = data.get("is_active")

    if not isinstance(is_active, bool):
        return jsonify({
            "success": False,
            "message": "is_active must be true or false."
        }), 400

    target_user = db.session.get(User, user_id)

    if not target_user:
        return jsonify({
            "success": False,
            "message": "User not found."
        }), 404

    # Prevent administrators from disabling admin accounts.
    if target_user.role == "admin":
        return jsonify({
            "success": False,
            "message": "Admin accounts cannot be modified here."
        }), 403

    try:
        target_user.is_active = is_active
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "User status updated successfully.",
            "user": {
                "id": target_user.id,
                "full_name": target_user.full_name,
                "email": target_user.email,
                "role": target_user.role,
                "is_active": target_user.is_active,
                "status": (
                    "Active" if target_user.is_active else "Inactive"
                )
            }
        }), 200

    except Exception:
        db.session.rollback()
        app.logger.exception("User status update failed")

        return jsonify({
            "success": False,
            "message": "Unable to update user status."
        }), 500
@app.route(
    "/api/admin/courses/<int:course_id>/status",
    methods=["PUT"]
)
@role_required("admin")
def admin_update_course_status(course_id):

    data = request.get_json(silent=True) or {}
    new_status = data.get("status")

    allowed_statuses = [
        "Upcoming",
        "Ongoing",
        "Completed",
        "Cancelled"
    ]

    if new_status not in allowed_statuses:
        return jsonify({
            "success": False,
            "message": "Invalid course status."
        }), 400

    course = db.session.get(TrainingCourse, course_id)

    if not course:
        return jsonify({
            "success": False,
            "message": "Course not found."
        }), 404

    try:
        course.status = new_status
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Course status updated successfully.",
            "course": {
                "id": course.id,
                "title": course.title,
                "status": course.status
            }
        }), 200

    except Exception:
        db.session.rollback()
        app.logger.exception("Course status update failed")

        return jsonify({
            "success": False,
            "message": "Unable to update course status."
        }), 500

    


# =====================================================
# TRAINEE: VIEW STUDY MATERIALS FOR AN ENROLLED COURSE
# =====================================================

@app.route(
    "/api/trainee/courses/<int:course_id>/materials",
    methods=["GET"]
)
@role_required("trainee")
def get_trainee_course_materials(course_id):

    trainee_id = session["user_id"]

    # Access is limited to active Enrolled records, matching the
    # enrollment status currently used by the attendance APIs.
    enrollment = CourseEnrollment.query.filter_by(
        course_id=course_id,
        trainee_id=trainee_id,
        status="Enrolled"
    ).first()

    if not enrollment:
        return jsonify({
            "success": False,
            "message": "You must be enrolled in this course to view its study materials."
        }), 403

    course = db.session.get(TrainingCourse, course_id)

    if not course:
        return jsonify({
            "success": False,
            "message": "Course not found."
        }), 404

    materials = CourseMaterial.query.filter_by(
        course_id=course_id
    ).order_by(CourseMaterial.created_at.desc()).all()

    result = []

    for item in materials:
        result.append({
            "id": item.id,
            "title": item.title,
            "description": item.description,
            "material_type": item.material_type,
            "file_name": item.file_name,
            "has_file": bool(item.file_path),
            "external_url": item.external_url,
            "created_at": (
                item.created_at.isoformat()
                if item.created_at else None
            )
        })

    return jsonify({
        "success": True,
        "course": {
            "id": course.id,
            "title": course.title
        },
        "materials": result
    }), 200


# =====================================================
# TRAINEE: SECURELY DOWNLOAD COURSE STUDY MATERIAL
# =====================================================

@app.route(
    "/api/trainee/materials/<int:material_id>/download",
    methods=["GET"]
)
@role_required("trainee")
def download_trainee_course_material(material_id):

    trainee_id = session["user_id"]

    material = db.session.get(CourseMaterial, material_id)

    if not material:
        return jsonify({
            "success": False,
            "message": "Study material not found."
        }), 404

    # Verify enrollment for the exact course that owns this material.
    enrollment = CourseEnrollment.query.filter_by(
        course_id=material.course_id,
        trainee_id=trainee_id,
        status="Enrolled"
    ).first()

    if not enrollment:
        return jsonify({
            "success": False,
            "message": "You are not authorized to download this material."
        }), 403

    if not material.file_path:
        return jsonify({
            "success": False,
            "message": "This material does not have an uploaded file."
        }), 404

    file_path = os.path.join(
        app.config["UPLOAD_FOLDER"],
        material.file_path
    )

    if not os.path.isfile(file_path):
        return jsonify({
            "success": False,
            "message": "The uploaded file could not be found on the server."
        }), 404

    # send_from_directory safely serves only files inside UPLOAD_FOLDER.
    return send_from_directory(
        app.config["UPLOAD_FOLDER"],
        material.file_path,
        as_attachment=True,
        download_name=material.file_name or "study-material"
    )


# =====================================================
# 25. DATABASE INITIALIZATION
# =====================================================

with app.app_context():

    db.create_all()

    print("SQLite database initialized successfully!")


# =====================================================
# 26. RUN FLASK SERVER
# =====================================================

if __name__ == "__main__":

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )
