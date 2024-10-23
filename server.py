import os
import json
import gzip

import redis
from redis.commands.search.query import NumericFilter, Query

from flask import Flask, request, send_from_directory, make_response

r = redis.Redis(host="localhost", port=6379, decode_responses=True)
redis_index = r.ft("idx:act")

ENVIRONMENT = os.environ.get("ENVIRONMENT", "DEV")

if ENVIRONMENT == "PROD":
    with open("frontend/index.html") as f:
        content = gzip.compress(f.read().encode('utf-8'), 9)
    print("Compressed index.html: ", len(content))

transition_table = str.maketrans({
    ",": " ",
    ".": " ",
    "<": " ",
    ">": " ",
    "{": " ",
    "}": " ",
    "[": " ",
    "]": " ",
    "\"": " ",
    "'": " ",
    ":": " ",
    ";": " ",
    "!": " ",
    "@": " ",
    "#": " ",
    "$": " ",
    "%": " ",
    "^": " ",
    "&": " ",
    "*": " ",
    "(": " ",
    ")": " ",
    "-": " ",
    "+": " ",
    "=": " ",
    "~": " ",
    "\\":" "
})

def is_market(activity):
    return activity['activity_type'] == 'market activity' or activity['activity_type'] == 'market group'

def escape_string(s):
    return s.replace("")

def get_filters():
    return {
        'search_criteria': request.args.get("search", "").translate(transition_table),
        'time_period_start': request.args.get("time-period-start", None),
        'time_period_end': request.args.get("time-period-end", None),
        'sector': request.args.get("sector", "").translate(transition_table),
        'geography': request.args.get("geography", "").translate(transition_table),
        'activity_type': request.args.get("activity-type", "").translate(transition_table),
        'isic_section': request.args.get("isic-section", "").translate(transition_table),
        'isic_class': request.args.get("isic-class", "").translate(transition_table),
        'cpc_class': request.args.get("cpc-class", "").translate(transition_table),
        'organisation': int(request.args.get("organisation", -1))
    }

def generate_query(filters):
    query = ""

    if filters['search_criteria'] != "":
        query += "\'*" + filters['search_criteria'] + "*\' "

    if filters["time_period_start"] != None:
        query += "@time_period_start:[-inf " + str(filters["time_period_start"]) + "] "

    if filters["time_period_end"] != None:
        query += "@time_period_end:[" + str(filters["time_period_end"]) + " inf] "

    if filters["sector"] != "":
        query += "@sectors:'*" + filters["sector"] +"*' "

    if filters["geography"] != "":
        query += "@location:'*" + filters["location"] + "*' "

    if filters["activity_type"] != "":
        query += "@activity_type:'*" + filters["activity_type"] + "*' "

    if filters["isic_section"] != "":
        query += "@section:'" + filters["isic_section"] + "*' "

    if filters["isic_class"] != "":
        query += "@classification_isic:'" + filters["isic_class"] + "*' "

    if filters["cpc_class"] != "":
        query += "@classification_cpc:'" + filters["cpc_class"] + "*' "
    
    if filters["organisation"] != -1:
        query += "@organisations:{" + filters["organisation"] + "} "

    if query == "":
        query = "*"

    print(query)
    return Query(query)

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

    actlen = int(r.get("actlen"))

    if filters["search_criteria"] == "" and \
        filters["time_period_start"] == None and \
        filters["time_period_end"] == None and \
        filters["sector"] == "" and \
        filters["geography"] == "" and \
        filters["activity_type"] == "" and \
        filters["isic_section"] == "" and \
        filters["isic_class"] == "" and \
        filters["cpc_class"] == "" and \
        filters["organisation"] == -1:

        return str(actlen)
    
    query = generate_query(filters)
    query.paging(0,0)
    result = redis_index.search(query)
    return str(result.total)

DESIRED_KEYS = ["id", "name", "location", "type", "unit", "product", "organisations"]

@app.route("/api/activity", methods=["GET"])
def get_activity_page():
    filters = get_filters()

    page_number = int(request.args.get("page", 0))
    page_size = min(int(request.args.get("count", 0)), 50)

    collection = []

    query = generate_query(filters)
    query.paging(page_number * page_size, page_size)

    results = redis_index.search(query)
    print(results.total)
    for c in results.docs:
        collection.append(json.loads(c.json))
    
    if len(collection) == 0:
        return "[]"
    
    return json.dumps(collection)

@app.route("/api/activity/<int:activity_id>", methods=["GET"])
def get_activity(activity_id):
    return json.dumps(r.json().get("act:" + str(activity_id), "$")[0])


@app.route("/api/node", methods=["GET"])
def get_node():
    act_id = int(request.args.get("id"))
    activity = r.json().get("act:" + str(act_id), "$")[0]
    inputs_len = r.llen("inputs:" + str(act_id))
    bio_len = r.llen("biosphere:" + str(act_id))
    retval = {
        "id": activity["id"],
        "name": activity["name"],
        "children": [],
        "childCount": inputs_len + bio_len,
        "isAtBoundary": False
    }

    for index in r.lrange("inputs:" + str(act_id), 0, -1) + r.lrange("biosphere:" + str(act_id), 0, -1):
        next_act = r.json().get("act:" + index, "$")[0]
        is_at_boundary = False
        if is_market(activity) and not is_market(next_act):
            is_at_boundary = True
        retval["children"].append({
            "id": next_act["id"],
            "name": next_act["name"],
            "childCount": r.llen("inputs:" + str(index)) + r.llen("biosphere:" + str(index)),
            "isAtBoundary": is_at_boundary
        })
    
    return json.dumps(retval)

if ENVIRONMENT == "PROD":
    app.run(host='0.0.0.0')
else:
    app.run()