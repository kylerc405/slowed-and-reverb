from flask import Flask, request, send_file, url_for, session, render_template, redirect, jsonify, send_from_directory
from flask_scss import Scss
from flask_wtf import FlaskForm
from wtforms import FileField, SubmitField
from werkzeug.utils import secure_filename
from wtforms.validators import DataRequired
from tempfile import NamedTemporaryFile
import atexit

import os

# from flask_sqlalchemy import SQLAlchemy
# from apscheduler.schedulers.background import BackgroundScheduler


app = Flask(__name__)
Scss(app)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'default_secret_key')

# app.config['CUSTOM_TEMP_DIR'] = '/tmp'
# app.config['CUSTOM_TEMP_DIR'] = 'C:/Users/kchen/AppData/Local/Temp'
# app.config['UPLOAD_FOLDER'] = 'uploads'


# os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

class UploadFileForm(FlaskForm):
    file = FileField("File", validators=[DataRequired()])
    submit = SubmitField()
    

@app.route("/", methods=["GET", "POST"])
def index():
    form = UploadFileForm()

    if request.method == "POST" and form.validate_on_submit():
        file = form.file.data
        filename = None
        
        #temp file method
        with NamedTemporaryFile(delete=False, suffix=".wav") as temp_file:
            filename = secure_filename(file.filename)
            temp_file.write(file.read())
            temp_file_path = temp_file.name
        session['audio_file'] = temp_file_path
        session['song_name'] = filename
        return redirect(url_for('uploaded'))
            

    return render_template("index.html", form=form, audio_file="static/temp.wav", song_name = " ") # change audio_file to None for different homepage
    # return render_template("index.html", form=form, audio_file=None)
    

# @app.route("/processing")
   
@app.route("/uploaded", methods=["GET", "POST"])
def uploaded():   
    form = UploadFileForm()

    if request.method == "POST" and form.validate_on_submit():
        file = form.file.data
        filename = None
        
        # cleanup_temp_file()
        #temp file method
        with NamedTemporaryFile(delete=False, suffix=".wav") as temp_file:
            filename = secure_filename(file.filename)
            temp_file.write(file.read())
            temp_file_path = temp_file.name
        session['audio_file'] = temp_file_path
        session['song_name'] = filename
        return redirect(url_for('uploaded'))
    
    
    
    
    temp_file_path = session.get('audio_file')
    song_name = session.get('song_name')
    if temp_file_path and os.path.exists(temp_file_path):
        # session.pop('audio_file', None)
        # session.pop('song_name', None)
        return render_template("index.html", form=UploadFileForm(), audio_file = temp_file_path, song_name = song_name)
    
    return redirect(url_for('index'))


@app.route('/uploads/<path:filename>')
def uploaded_file(filename): # runs when someone visits /uploads/<filename>
    # return send_from_directory(app.config['UPLOAD_FOLDER'], filename)
    return send_file(filename)

    
# def cleanup_temp_file():
#     temp_file_path = session.pop('audio_file', None)
#     # os.remove(temp_file_path)
#     if temp_file_path and os.path.exists(temp_file_path):
#         os.remove(temp_file_path)
#     session.pop('song_name', None)
    
# @app.before_request 
# def before_request():
#     if request.endpoint != 'uploaded' and 'audio_file' in session:
#         cleanup_temp_file()

# @atexit.register
# def cleanup():
#     if 'audio_file' in session:
#         cleanup_temp_file()


if __name__ == "__main__":
    # with app.app_context():
    #     db.create_all()
    app.run(debug=False, host='0.0.0.0')



