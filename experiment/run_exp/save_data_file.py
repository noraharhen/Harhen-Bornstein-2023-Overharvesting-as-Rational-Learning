# Doesn't work -- just saving code from custom.py

from flask import request, jsonify, abort
from json import loads

@custom_code.route('/save_data_file', methods=['POST'])
def save_data_file():
  current_app.logger.warning("Reached /save_data_file") # Print message to server.log for debugging
  try:
    file_name = request.form['file_name']
    file_data = request.form['file_data']
    #current_app.logger.warning("File name: " + file_name)
    #current_app.logger.warning("File data: " + file_data)
    write_file = open("data/" + file_name, "w")
    write_file.write(file_data)
    write_file.close()
    response = {"save_data_file": "success"}
    return jsonify(**response)
  except:
    abort(404)
