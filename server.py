import os
import json
import gzip

from flask import Flask, request, send_from_directory, make_response

from SQLiteDatabase import SQLiteDatabase

ENVIRONMENT = os.environ.get("ENVIRONMENT", "DEV")

if ENVIRONMENT == "PROD":
    with open("frontend/index.html") as f:
        content = gzip.compress(f.read().encode('utf-8'), 9)
    print("Compressed index.html: ", len(content))

def is_market(activity):
    return activity['type'] == 'market activity' or activity["type"] == 'market group'

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

    with SQLiteDatabase() as db:
        query = db.generate_query(filters)
        result = db.get_count(query)
        return str(result)

DESIRED_KEYS = ["id", "name", "location", "type", "unit", "product", "organisations"]

@app.route("/api/activity", methods=["GET"])
def get_activity_page():
    filters = get_filters()

    page_number = int(request.args.get("page", 0))
    page_size = min(int(request.args.get("count", 0)), 50)

    with SQLiteDatabase() as db:
        query = db.generate_query(filters)
        collection = db.get_page(query, page_size, page_number, DESIRED_KEYS)
        
        if len(collection) == 0:
            return "[]"

        return json.dumps(collection)

@app.route("/api/activity/<int:activity_id>", methods=["GET"])
def get_activity(activity_id):
    with SQLiteDatabase() as db:
        return json.dumps(db.get_activity(activity_id))


@app.route("/api/node", methods=["GET"])
def get_node():
    act_id = int(request.args.get("id"))
    assert(act_id >= 0)
    with SQLiteDatabase() as db:
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
            is_at_boundary = False
            if is_market(activity) and not is_market(next_act):
                is_at_boundary = True
            retval["children"].append({
                "id": next_act["id"],
                "name": next_act["name"],
                "childCount": db.get_children_count(index),
                "isAtBoundary": is_at_boundary
            })
        
        return json.dumps(retval)

if ENVIRONMENT == "PROD":
    app.run(host='0.0.0.0')
else:
    app.run()