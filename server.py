import os
import json
import gzip

import brightway2 as bw
import bw2data as bd
import bw2io as bi
import bw2calc as bc
import bw2analyzer as bwa

from flask import Flask, request, send_from_directory, make_response

ENVIRONMENT = os.environ.get("ENVIRONMENT", "DEV")

if ENVIRONMENT == "PROD":
    with open("frontend/index.html") as f:
        content = gzip.compress(f.read().encode('utf-8'), 9)
    print("Compressed index.html: ", len(content))

PROJECT_NAME = 'ecoinvent-3.10-cutoff-try-3'
bd.projects.set_current(PROJECT_NAME)

DB_NAME="ecoinvent-3.10-cutoff"
eidb = bd.Database(DB_NAME)

BIODB_NAME = "ecoinvent-3.10-biosphere"
biodb = bd.Database(BIODB_NAME)

acts = []
id_mapping = {}
organisations = []

print("Loading processing activities...")

for index, act in enumerate(eidb):
    actdict = act.as_dict()
    acts.append({
        "id": len(acts),
        "activity uuid": actdict["activity"],
        "product uuid": actdict["flow"],
        "name": actdict["name"],
        "classifications": actdict["classifications"],
        "activity type": actdict["activity type"],
        "location": actdict["location"],
        "type": actdict["type"],
        "unit": actdict["unit"],
        "product": actdict["reference product"],
        "inputs" : [],
        "biosphere": [],
        "outputs": [],
        "time-period": actdict["time period"],
        "section": actdict["section"],
        "sectors": actdict["sector"],
        "organisations": actdict["organisations"]
    })
    id_mapping[act.key[1]] = index

print("Loading biosphere activities...")

for index, act in enumerate(biodb):
    actdict = act.as_dict()
    acts.append({
        "id": len(acts),
        "name": actdict["name"],
        "activity uuid": actdict["code"],
        "product uuid": actdict["CAS number"],
        "classifications": actdict["categories"],
        "activity type": "biosphere",
        "location": "",
        "type": actdict["type"],
        "unit": actdict["unit"],
        "product": actdict["name"],
        "inputs" : [],
        "biosphere": [],
        "outputs": [],
        "time-period": [],
        "section": "",
        "sectors": [],
        "organisations": []
    })
    id_mapping[act.key[1]] = index

print("Loading exchanges...")

for act in eidb:
    for exc in act.exchanges():
        if exc["input"][1] == act.key[1]:
            continue
        exc = exc.as_dict()
        
        if exc['type'] == 'biosphere':
            acts[id_mapping[act.key[1]]]['biosphere'].append(id_mapping[exc["input"][1]])
        else:
            acts[id_mapping[act.key[1]]]['inputs'].append(id_mapping[exc["input"][1]])
        acts[id_mapping[exc["input"][1]]]['outputs'].append(id_mapping[act.key[1]])

print("Loading organisations...")
with open("organisational_boundaries_smaller.txt") as f:
    organisation = []
    line = f.readline()
    while line:
        if line == "\n":
            organisations.append(organisation)
            organisation = []
        else:
            organisation.append(id_mapping[line.strip()])
        line = f.readline()

del biodb
del eidb
del id_mapping

def is_market(activity):
    return activity['activity type'] == 'market activity' or activity['activity type'] == 'market group'

def get_filters():
    return {
        'search_criteria': request.args.get("search", ""),
        'time_period_start': request.args.get("time-period-start", None),
        'time_period_end': request.args.get("time-period-end", None),
        'sector': request.args.get("sector", ""),
        'geography': request.args.get("geography", ""),
        'activity_type': request.args.get("activity-type", ""),
        'isic_section': request.args.get("isic-section", ""),
        'isic_class': request.args.get("isic-class", ""),
        'cpc_class': request.args.get("cpc-class", ""),
        'organisation': int(request.args.get("organisation", -1))
    }

def matches_filter(activity, filters):
    if filters['search_criteria'] not in activity['name'] or filters['search_criteria'] not in activity['product']:
        return False

    if filters["time_period_start"] != None and int(filters["time_period_start"]) > activity["time period"][0]:
        return False

    if filters["time_period_end"] != None and int(filters["time_period_end"]) < activity["time period"][-1]:
        return False

    contained_in_sector = False
    for sector in activity['sectors']:
        if filters["sector"] in sector:
            contained_in_sector = True
            break
    
    if not contained_in_sector:
        return False

    if filters["geography"] not in activity["location"]:
        return False

    if filters["activity_type"] not in activity["activity type"]:
        return False

    if filters["isic_section"] not in activity["section"]:
        return False

    is_part_of_isic_class = False
    is_part_of_cpc_class = False
    for classification_method, value in activity["classifications"]:
        if "ISIC" in classification_method:
            if filters["isic_class"] in value:
                is_part_of_isic_class = True

        if "CPC" in classification_method:
            if filters["cpc_class"] in value:
                is_part_of_cpc_class = True
    
    if not is_part_of_isic_class:
        return False

    if not is_part_of_cpc_class:
        return False

    if filters["organisation"] != -1 and filters["organisation"] not in activity["organisations"]:
        return False

    return True

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

        return str(len(acts))
    
    count = 0
    for act in acts:
        if not matches_filter(act, filters):
            continue

        count += 1
    return str(count)

DESIRED_KEYS = ["id", "name", "location", "type", "unit", "product", "organisations"]

@app.route("/api/activity", methods=["GET"])
def get_activity_page():
    filters = get_filters()

    page_number = int(request.args.get("page", 0))
    page_size = min(int(request.args.get("count", 0)), 50)

    collection = []
    skipped = 0

    curr_page = 0
    for act in acts:
        if not matches_filter(act, filters):
            continue
        
        if skipped >= page_size * page_number:
            to_send = {k: v for k, v in act.items() if k in DESIRED_KEYS}

            collection.append(to_send)
            if len(collection) == page_size:
                break
        else:
            skipped += 1
    
    if len(collection) == 0:
        return "[]"
    
    return json.dumps(collection)

@app.route("/api/activity/<int:activity_id>", methods=["GET"])
def get_activity(activity_id):
    return json.dumps(acts[activity_id])


@app.route("/api/node", methods=["GET"])
def get_node():
    act_id = int(request.args.get("id"))
    activity = acts[act_id]
    retval = {
        "id": activity["id"],
        "name": activity["name"],
        "children": [],
        "childCount": len(activity["inputs"] + activity["biosphere"]),
        "isAtBoundary": False
    }
    for index in activity["inputs"] + activity['biosphere']:
        next_act = acts[index]
        is_at_boundary = False
        if is_market(activity) and not is_market(next_act):
            is_at_boundary = True
        retval["children"].append({
            "id": next_act["id"],
            "name": next_act["name"],
            "childCount": len(next_act["inputs"]) + len(next_act['biosphere']),
            "isAtBoundary": is_at_boundary
        })
    
    return json.dumps(retval)

if ENVIRONMENT == "PROD":
    app.run(host='0.0.0.0')
else:
    app.run()