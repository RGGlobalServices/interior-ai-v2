from db import db
from datetime import datetime
import uuid

def gen_id():
    return uuid.uuid4().hex[:12]

class Project(db.Model):
    __tablename__ = "projects"
    id = db.Column(db.String, primary_key=True, default=gen_id)
    name = db.Column(db.String, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Annotation(db.Model):
    __tablename__ = "annotations"
    id = db.Column(db.String, primary_key=True, default=gen_id)
    project_id = db.Column(db.String, db.ForeignKey("projects.id"))
    file_name = db.Column(db.String)
    data = db.Column(db.JSON)  # store annotation JSON
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Report(db.Model):
    __tablename__ = "reports"
    id = db.Column(db.String, primary_key=True, default=gen_id)
    project_id = db.Column(db.String, db.ForeignKey("projects.id"))
    file_path = db.Column(db.String)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Discussion(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey("projects.id"))
    discussion_metadata = db.Column("metadata", db.JSON)  # ✅ works

