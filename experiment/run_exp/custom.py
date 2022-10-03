# this file imports custom routes into the experiment server

from flask import Blueprint, render_template, request, jsonify, Response, abort, current_app
from jinja2 import TemplateNotFound
from functools import wraps
from sqlalchemy import or_

from psiturk.psiturk_config import PsiturkConfig
from psiturk.experiment_errors import ExperimentError
from psiturk.user_utils import PsiTurkAuthorization, nocache

# # Database setup
from psiturk.db import db_session, init_db
from psiturk.models import Participant
from json import dumps, loads

# load the configuration options
config = PsiturkConfig()
config.load_config()
myauth = PsiTurkAuthorization(config)  # if you want to add a password protect route use this

# explore the Blueprint
custom_code = Blueprint('custom_code', __name__, template_folder='templates', static_folder='static')

###########################################################
#  serving warm, fresh, & sweet custom, user-provided routes
#  add them here
###########################################################

#----------------------------------------------
# Get participant data file and write to file
#----------------------------------------------
@custom_code.route('/save_data_file', methods=['POST'])
def save_data_file():
  # Print message to server.log for debugging
  # current_app.logger.warning("Reached /save_data_file")
  try:
    # Get data from POST
    file_name = request.form['file_name']
    file_data = request.form['file_data']
    #current_app.logger.warning("File name: " + file_name)
    #current_app.logger.warning("File data: " + file_data)

    # Remove quotation marks from file data
    file_data = file_data.replace('"', '')

    # Write file to disk
    write_file = open("data/" + file_name, "w")
    write_file.write(file_data)
    write_file.close()

    # Return successfully
    response = {"save_data_file": "success"}
    return jsonify(**response)
  except:
    abort(404)

