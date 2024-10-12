import os
import json

import brightway2 as bw
import bw2data as bd
import bw2io as bi
import bw2calc as bc
import bw2analyzer as bwa

from flask import Flask, request, send_from_directory

PROJECT_NAME = 'ecoinvent-3-10-lci-2'
bd.projects.set_current(PROJECT_NAME)

DB_NAME="ecoinvent-3.10-cutoff"
eidb = bd.Database(DB_NAME)

BIODB_NAME = "ecoinvent-3.10-biosphere"
biodb = bd.Database(BIODB_NAME)

acts = []
id_mapping = {}

for index, act in enumerate(eidb):
    actdict = act.as_dict()
    acts.append({
        "id": len(acts),
        "name": actdict["name"],
        "classifications": actdict["classifications"],
        "activity type": actdict["activity type"],
        "location": actdict["location"],
        "type": actdict["type"],
        "unit": actdict["unit"],
        "product": actdict["reference product"],
        "inputs" : [],
        "biosphere": [],
        "outputs": []
    })
    id_mapping[act.key[1]] = index

for index, act in enumerate(biodb):
    actdict = act.as_dict()
    #print(actdict.keys())
    acts.append({
        "id": len(acts),
        "name": actdict["name"],
        "classifications": actdict["categories"],
        "activity type": "biosphere",
        "location": "",
        "type": actdict["type"],
        "unit": actdict["unit"],
        "product": actdict["name"],
        "inputs" : [],
        "biosphere": [],
        "outputs": []
    })
    id_mapping[act.key[1]] = index

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

del biodb
del eidb
del id_mapping

def is_market(activity):
    return activity['activity type'] == 'market activity' or activity['activity type'] == 'market group'

app = Flask(__name__,
            static_url_path = '',
            static_folder='frontend')

@app.route("/", methods=["GET"])
def index():
    return send_from_directory("frontend", "index.html")

@app.route("/api/activity/total", methods=["GET"])
def get_activity_count():
    search_criteria = request.args.get("search", "")
    print(search_criteria)
    if search_criteria == "":
        print("ASD")
        return str(len(acts))
    
    count = 0
    for act in acts:
        if search_criteria in act['name']:
            count += 1
    return str(count)

@app.route("/api/activity", methods=["GET"])
def get_activity_page():
    search_criteria = request.args.get("search", "")
    page_number = int(request.args.get("page", 0))
    page_size = min(int(request.args.get("count", 0)), 50)

    collection = []
    skipped = 0

    curr_page = 0
    for act in acts:
        if search_criteria not in act['name']:
            continue
        
        if skipped >= page_size * page_number:
            to_send = act.copy()
            del to_send['inputs']
            del to_send['outputs']
            del to_send['classifications']
            collection.append(to_send)
            if len(collection) == page_size:
                break
        else:
            skipped += 1
    
    if len(collection) == 0:
        return ""
    
    return json.dumps(collection)

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

app.run(host="0.0.0.0")