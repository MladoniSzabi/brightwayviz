import os
import json
import gzip
import re

from flask import Flask, request, send_from_directory, make_response

from SQLiteDatabase import SQLiteDatabase

ENVIRONMENT = os.environ.get("ENVIRONMENT", "DEV")

if ENVIRONMENT == "PROD":
    with open("frontend/index.html") as f:
        content = gzip.compress(f.read().encode('utf-8'), 9)
    print("Compressed index.html: ", len(content))

def is_market(activity):
    return activity['type'] == 'market activity' or activity["type"] == 'market group'

def is_agrifood(activity, parent):
    if ", for sowing" in activity['name']:
        return False

    if activity['type'] == 'aggregation':
        return True

    if parent['name'] == 'Agri-Food Systems' or parent['name'] == 'Agri Food Systems':
        return True

    return False

def get_filters():
    return {
        'search_criteria': request.args.get("search", ""),
        'time_period_start': request.args.get("time-period-start", None),
        'time_period_end': request.args.get("time-period-end", None),
        'sector': request.args.get("sector", ""),
        'geography': request.args.get("geography", ""),
        'type': request.args.get("activity-type", ""),
        'isic_section': request.args.get("isic-section", ""),
        'isic_class': request.args.get("isic-class", ""),
        'cpc_class': request.args.get("cpc-class", ""),
        'organisation': int(request.args.get("organisation", -1))
    }

print("Starting server...")

app = Flask(__name__,
            static_url_path = '',
            static_folder='frontend')

def get_db(db_name):
    if db_name == None:
        return "dbs/databases.db"
    db_name = re.sub('[^0-9a-zA-Z_]+', '', db_name)
    dbs = [os.path.splitext(x)[0] for x in os.listdir("dbs/")]
    if db_name in dbs:
        return "dbs/" + db_name + ".db"
    return "dbs/databases.db"

@app.route("/", methods=["GET"])
def index():
    if ENVIRONMENT == "PROD":
        response = make_response(content)
        response.headers['Content-length'] = len(content)
        response.headers['Content-encoding'] = 'gzip'
        return response
    return send_from_directory("frontend", "index.html")

@app.route("/api/activity/total", methods=["GET"])
def get_activity_count():
    filters = get_filters()

    with SQLiteDatabase(get_db(request.args.get("database", None))) as db:
        query = db.generate_query(filters)
        result = db.get_count(query)
        return str(result)

DESIRED_KEYS = ["id", "name", "location", "type", "unit", "product", "organisations"]

@app.route("/api/activity", methods=["GET"])
def get_activity_page():
    filters = get_filters()

    page_number = int(request.args.get("page", 0))
    page_size = min(int(request.args.get("count", 0)), 50)

    with SQLiteDatabase(get_db(request.args.get("database", None))) as db:
        query = db.generate_query(filters)
        collection = db.get_page(query, page_size, page_number, DESIRED_KEYS)
        
        if len(collection) == 0:
            return "[]"

        return json.dumps(collection)

@app.route("/api/activity/<int:activity_id>", methods=["GET"])
def get_activity(activity_id):
    with SQLiteDatabase(get_db(request.args.get("database", None))) as db:
        return json.dumps(db.get_activity(activity_id))

def expand_node(act_id, layer_count, db, agrifood_only):
    if layer_count == 0:
        return None
    activity = db.get_activity(act_id, ["id", "name", "type"])
    activity_children = db.get_children(act_id)
    retval = {
        "id": activity["id"],
        "name": activity["name"],
        "children": [],
        "childCount": len(activity_children),
        "isAtBoundary": False
    }

    for index in activity_children:
        next_act = db.get_activity(index, ["id", "name", "type"])
        if layer_count == 1:
            is_at_boundary = False
            if activity['type'] != 'ordinary transforming activity' and next_act['type'] == 'ordinary transforming activity':
                is_at_boundary = True
            should_add = (not agrifood_only) or (agrifood_only and is_agrifood(next_act, activity))
            if should_add:
                retval["children"].append({
                    "id": next_act["id"],
                    "name": next_act["name"],
                    "childCount": db.get_children_count(index),
                    "isAtBoundary": is_at_boundary
                })
        else:
            should_add = (not agrifood_only) or (agrifood_only and is_agrifood(next_act, activity))
            is_at_boundary = False
            if activity['type'] != 'ordinary transforming activity' and next_act['type'] == 'ordinary transforming activity':
                is_at_boundary = True
            if should_add:
                childNode = expand_node(index, layer_count-1, db, agrifood_only)
                childNode["isAtBoundary"] = is_at_boundary
                retval['children'].append(childNode)
            else:
                retval["children"].append({
                    "id": next_act["id"],
                    "name": next_act["name"],
                    "childCount": db.get_children_count(index),
                    "isAtBoundary": is_at_boundary
                })
    
    if len(retval['children']) == 0:
        del retval['children']
    
    return retval


@app.route("/api/node", methods=["GET"])
def get_node():
    depth = int(request.args.get("depth", 1))
    act_id = int(request.args.get("id"))
    agrifood_only = int(request.args.get("agrifood_only", 0))
    assert(act_id >= 0)
    with SQLiteDatabase(get_db(request.args.get("database", None))) as db:
        retval = expand_node(act_id, depth, db, agrifood_only)
        
    return json.dumps(retval)

@app.route("/api/ping", methods=["GET"])
def ping():
    return ""