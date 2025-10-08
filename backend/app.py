import os
import mimetypes
import openai
import base64
from flask import Flask, render_template, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
from db import db
from models import Project, Annotation, Discussion, Report
from utils import save_upload, project_folder
from fpdf import FPDF

# ✅ Load environment variables (Render will automatically inject them)
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
SQLALCHEMY_DATABASE_URI = os.environ.get("SQLALCHEMY_DATABASE_URI", "sqlite:///local.db")

# Initialize OpenAI API key
openai.api_key = OPENAI_API_KEY

def create_app():
    # Calculate the base directory of this script (app.py)
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

    # 1. Try the common path: assumes app.py is in a sub-folder (e.g., /backend/app.py) relative to the root
    BUILD_DIR_COMMON = os.path.join(BASE_DIR, '..', 'frontend', 'public') 
    
    # 2. Try the simplified path: assumes app.py is a sibling of the 'frontend' folder
    BUILD_DIR_SIMPLE = os.path.join(BASE_DIR, 'frontend', 'public')

    # Determine the correct build directory
    if os.path.exists(os.path.join(BUILD_DIR_COMMON, 'index.html')):
        FRONTEND_BUILD_DIR = BUILD_DIR_COMMON
    elif os.path.exists(os.path.join(BUILD_DIR_SIMPLE, 'index.html')):
        FRONTEND_BUILD_DIR = BUILD_DIR_SIMPLE
    else:
        # Fallback to the common path and raise a warning
        FRONTEND_BUILD_DIR = BUILD_DIR_COMMON
        print("WARNING: Could not find 'index.html' in expected build directories. Falling back to:", FRONTEND_BUILD_DIR)

    # Debugging check: Print the final path Flask is using
    print(f"--- FLASK DEBUG PATHS ---")
    print(f"Final FRONTEND_BUILD_DIR: {FRONTEND_BUILD_DIR}")
    print(f"index.html exists at final path: {os.path.exists(os.path.join(FRONTEND_BUILD_DIR, 'index.html'))}")
    print(f"--- END FLASK DEBUG PATHS ---")

    # 🎯 1. Set static_folder AND template_folder using the determined absolute path
    # 🎯 1. Set static_folder AND template_folder correctly
    app = Flask(
    __name__,
    static_folder=os.path.join(FRONTEND_BUILD_DIR, "static"),
    template_folder=FRONTEND_BUILD_DIR
)

    app.config["SQLALCHEMY_DATABASE_URI"] = SQLALCHEMY_DATABASE_URI
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    # It is recommended to run on port 5000 for the frontend proxy to work seamlessly
    # Ensure this port matches the proxy setting in frontend/package.json (e.g., 5000)

    db.init_app(app)
    # Explicit CORS for development to allow the frontend on 3000 to talk to Flask
    CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000"}})  

    with app.app_context():
        db.create_all()
    
    # ---------------- API ROUTES ----------------
    # 🎯 2. API ROUTES MUST COME FIRST to avoid being caught by the frontend router
   
    @app.route('/')
    def serve_react():
     build_dir = os.path.join(os.path.dirname(__file__), 'frontend', 'build')
     return send_from_directory(build_dir, 'index.html')

    @app.route('/<path:path>')
    def serve_static_files(path):
     build_dir = os.path.join(os.path.dirname(__file__), 'frontend', 'build')
     if os.path.exists(os.path.join(build_dir, path)):
        return send_from_directory(build_dir, path)
     return send_from_directory(build_dir, 'index.html')

    @app.route("/api/projects", methods=["GET", "POST"])
    def projects():
        if request.method == "POST":
            data = request.json or {}
            # ... API call to create project ...
            return jsonify({})

        # ... GET logic ...
        return jsonify([])

    @app.route("/api/projects/<pid>/upload", methods=["POST"])
    def upload_file(pid):
        if "file" not in request.files:
            return jsonify({"success": False, "message": "No file part"}), 400
        f = request.files["file"]
        if f.filename == "":
            return jsonify({"success": False, "message": "No selected file"}), 400
        
        # Saves the file and returns the path on the server
        dest = save_upload(pid, f.filename, f)
        return jsonify({"success": True, "path": dest})

    @app.route("/api/projects/<pid>/discuss", methods=["POST"])
    def discuss(pid):
        data = request.json or {}
        msg = data.get("message", "")
        try:
            resp = openai.ChatCompletion.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are an interior design assistant."},
                    {"role": "user", "content": msg},
                ],
            )
            answer = resp.choices[0].message["content"]
        except Exception as e:
            answer = f"(AI Error: {str(e)})"
        return jsonify({"assistant": answer})
    
    @app.route("/api/projects/<pid>/files/<filename>", methods=["GET"])
    def serve_file(pid, filename):
        """Serves the uploaded file (PDF or image) from the project's upload directory."""
        filename = os.path.basename(filename) # Sanitize filename
        file_path = os.path.join(project_folder(pid), "uploads", filename)
        
        if not os.path.exists(file_path):
            print(f"Error: File not found at {file_path}") # Debug log
            return jsonify({"success": False, "message": "File not found."}), 404

        # Guess the MIME type based on the file extension for correct browser rendering
        mime_type, _ = mimetypes.guess_type(file_path)
        if mime_type is None:
             mime_type = 'application/octet-stream' # Default fallback

        print(f"Serving file: {filename} with MIME type: {mime_type}") # Debug log

        # Use send_file to correctly stream the file content to the browser
        # as_attachment=False forces the browser to try and display it (like a PDF or image)
        response = send_file(file_path, as_attachment=False, mimetype=mime_type)
        
        # Add cache control headers
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate' # Prevent caching
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        response.headers['Access-Control-Allow-Origin'] = '*' # Allow cross-origin access
        return response
        
    @app.route("/sample.pdf")
    def serve_sample_pdf():
        """Serves a sample PDF file for testing."""
        # Create a simple PDF file for testing
        from fpdf import FPDF
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Arial", size=12)
        pdf.cell(200, 10, txt="Sample PDF for testing", ln=True, align='C')
        pdf.cell(200, 10, txt="You can draw on this PDF", ln=True, align='C')
        
        # Save the PDF to a temporary file
        temp_file = os.path.join(os.path.dirname(__file__), "static", "sample.pdf")
        os.makedirs(os.path.dirname(temp_file), exist_ok=True)
        pdf.output(temp_file)
        
        # Serve the file
        response = send_file(temp_file, mimetype="application/pdf")
        response.headers["Access-Control-Allow-Origin"] = "*"
        return response
    
    # ---------------- PDF EDITOR ROUTES ----------------
    @app.route("/pdf-editor/<pid>/<filename>")
    def pdf_editor(pid, filename):
        """Renders the PDF editor page."""
        # Use render_template with the correct template folder
        return render_template("annotation_pdf_editor.html", pid=pid, filename=filename)
    
    @app.route("/api/projects/<pid>/save-pdf", methods=["POST"])
    def save_pdf(pid):
        """Saves the edited PDF file."""
        data = request.json or {}
        pdf_data = data.get("pdfData")
        filename = data.get("filename")
        
        if not pdf_data or not filename:
            return jsonify({"success": False, "message": "Missing PDF data or filename"}), 400
            
        # Ensure the filename is sanitized
        filename = os.path.basename(filename)
        
        # Create the directory if it doesn't exist
        save_dir = os.path.join(project_folder(pid), "edited")
        os.makedirs(save_dir, exist_ok=True)
        
        # Save the PDF data
        file_path = os.path.join(save_dir, filename)
        
        try:
            # Save the PDF data (base64 encoded)
            import base64
            pdf_binary = base64.b64decode(pdf_data.split(',')[1])
            with open(file_path, 'wb') as f:
                f.write(pdf_binary)
            
            return jsonify({"success": True, "path": file_path})
        except Exception as e:
            return jsonify({"success": False, "message": str(e)}), 500
    
  # ---------------- FRONTEND CATCH-ALL ROUTE ----------------
 # ---------------- FRONTEND CATCH-ALL ROUTE ----------------
    # 🎯 3. This route is last and catches all requests that didn't match an API route.
    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_react_app(path):
        # Flask serves the React index.html for all non-API routes, letting React Router take over.
        return render_template("index.html")

    return app
# ---------------- Create app for Gunicorn ----------------
    app = create_app()
# ---------------- Run locally ----------------
if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)

