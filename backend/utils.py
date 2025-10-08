import os

def project_folder(pid):
    """Returns the base directory for a project."""
    base_dir = os.path.join(os.path.dirname(__file__), "projects")
    project_dir = os.path.join(base_dir, pid)
    os.makedirs(project_dir, exist_ok=True)  # Create project directory if it doesn't exist
    return project_dir

def save_upload(pid, filename, file_stream):
    """Saves an uploaded file to the project's uploads directory and returns a relative path."""
    filename = os.path.basename(filename)  # Sanitize filename
    upload_dir = os.path.join(project_folder(pid), "uploads")
    os.makedirs(upload_dir, exist_ok=True)  # Create uploads directory if it doesn't exist
    dest = os.path.join(upload_dir, filename)
    file_stream.save(dest)  # Save file
    return f"uploads/{filename}"  # Return relative path