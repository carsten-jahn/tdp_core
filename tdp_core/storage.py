import phovea_server.config
from pymongo import MongoClient
from pymongo.collection import ReturnDocument
from phovea_server.ns import Namespace, request, abort, etag
from phovea_server.util import jsonify
import phovea_server.security as security
import phovea_server.range as ranges
import logging

__author__ = 'Samuel Gratzl'
c = phovea_server.config.view('tdp_core')
_log = logging.getLogger(__name__)

app = Namespace(__name__)


@app.route('/namedsets/', methods=['GET', 'POST'])
@etag
def list_namedset():
  db = MongoClient(c.host, c.port)[c.database]

  if request.method == 'GET':
    q = dict(idType=request.args['idType']) if 'idType' in request.args else {}
    return jsonify(list((d for d in db.namedsets.find(q, {'_id': 0}) if security.can_read(d))))

  if request.method == 'POST':
    id = _generate_id()
    name = request.values.get('name', 'NoName')
    creator = request.values.get('creator', security.current_username())
    permissions = int(request.values.get('permissions', security.DEFAULT_PERMISSION))
    id_type = request.values.get('idType', '')
    ids = ranges.parse(request.values.get('ids', ''))[0].tolist()
    description = request.values.get('description', '')
    sub_type_key = request.values.get('subTypeKey', '')
    sub_type_value = request.values.get('subTypeValue', '')
    type = int(request.values.get('type', '0'))
    entry = dict(id=id, name=name, creator=creator, permissions=permissions, ids=ids, idType=id_type,
                 description=description,
                 subTypeKey=sub_type_key, subTypeValue=sub_type_value, type=type)
    db.namedsets.insert_one(entry)
    del entry['_id']
    return jsonify(entry)


@app.route('/namedset/<namedset_id>', methods=['GET', 'DELETE', 'PUT'])
@etag
def get_namedset(namedset_id):
  db = MongoClient(c.host, c.port)[c.database]
  result = list(db.namedsets.find(dict(id=namedset_id), {'_id': 0}))
  entry = result[0] if len(result) > 0 else None

  if not entry:
    abort(404, u'Namedset with id "{}" cannot be found'.format(namedset_id))

  if request.method == 'GET':
    if not security.can_read(entry):
      abort(403, u'Namedset with id "{}" is protected'.format(namedset_id))
    return jsonify(entry)

  if request.method == 'DELETE':
    if not security.can_write(entry):
      abort(403, u'Namedset with id "{}" is write protected'.format(namedset_id))
    q = dict(id=namedset_id)
    result = db.namedsets.remove(q)
    return jsonify(result['n'])  # number of deleted documents

  if request.method == 'PUT':
    if not security.can_write(entry):
      abort(403, u'Namedset with id "{}" is write protected'.format(namedset_id))
    filter = dict(id=namedset_id)
    values = dict()
    for key in ['name', 'idType', 'description', 'subTypeKey', 'subTypeValue']:
      if key in request.form:
        values[key] = request.form[key]
    if 'ids' in request.form:
      values['ids'] = ranges.parse(request.form['ids'])[0].tolist()
    for key in ['permissions', 'type']:
      if key in request.form:
        values[key] = int(request.form[key])
    query = {'$set': values}
    result = db.namedsets.find_one_and_update(filter, query, return_document=ReturnDocument.AFTER)
    del result['_id']
    return jsonify(result)


def get_namedset_by_id(namedset_id):
  db = MongoClient(c.host, c.port)[c.database]
  q = dict(id=namedset_id)
  result = list(db.namedsets.find(q, {'_id': 0}))
  if not result:
    abort(404, u'Namedset with id "{}" cannot be found'.format(namedset_id))
  if not security.can_read(result[0]):
    abort(403, u'Namedset with id "{}" is protected'.format(namedset_id))

  return result[0]


def _generate_id():
  import phovea_server.util
  return phovea_server.util.fix_id(phovea_server.util.random_id(10))


@app.route('/attachment/', methods=['POST'])
@etag
def post_attachment():
  """
  simple attachment management
  :return:
  """
  db = MongoClient(c.host, c.port)[c.database]

  id = _generate_id()
  # keep the encoded string
  creator = security.current_username()
  permissions = security.DEFAULT_PERMISSION

  entry = dict(id=id, creator=creator, permissions=permissions, data=request.data)
  db.attachments.insert_one(entry)
  return id


@app.route('/attachment/<attachment_id>', methods=['GET', 'DELETE', 'PUT'])
@etag
def get_attachment(attachment_id):
  db = MongoClient(c.host, c.port)[c.database]
  result = list(db.attachments.find(dict(id=attachment_id), {'_id': 0}))
  entry = result[0] if len(result) > 0 else None

  if not entry:
    abort(404, u'Attachment with id "{}" cannot be found'.format(attachment_id))

  if request.method == 'GET':
    if not security.can_read(entry):
      abort(403, u'Attachment with id "{}" is protected'.format(attachment_id))
    return entry['data']

  if request.method == 'DELETE':
    if not security.can_write(entry):
      abort(403, u'Attachment with id "{}" is write protected'.format(attachment_id))
    q = dict(id=attachment_id)
    result = db.attachments.remove(q)
    return jsonify(result['n'])  # number of deleted documents

  if request.method == 'PUT':
    if not security.can_write(entry):
      abort(403, u'Attachment with id "{}" is write protected'.format(attachment_id))
    filter = dict(id=attachment_id)
    # keep the encoded string
    query = {'$set': dict(data=request.data)}
    db.attachments.find_one_and_update(filter, query)
    return attachment_id


# @app.route('/delete_legacy_namedsets/', methods=['GET'])
# def delete_legacy_namedsets():
#  db = MongoClient(c.host, c.port)[c.database]
#  result = db.namedsets.remove({'id': {'$exists': False}}) # find all entries without id
#  return jsonify(result['n'])  # number of deleted documents


def create():
  """
   entry point of this plugin
  """
  return app


if __name__ == '__main__':
  app.debug = True
  app.run(host='0.0.0.0')
