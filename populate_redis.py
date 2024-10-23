import redis
from redis.commands.search.field import TextField, NumericField, TagField
from redis.commands.search.indexDefinition import IndexDefinition, IndexType

import os
import json
import gzip

import brightway2 as bw
import bw2data as bd
import bw2io as bi
import bw2calc as bc
import bw2analyzer as bwa

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

r.flushdb()

PROJECT_NAME = 'ecoinvent-3.10-cutoff-try-3'
bd.projects.set_current(PROJECT_NAME)

DB_NAME="ecoinvent-3.10-cutoff"
eidb = bd.Database(DB_NAME)

BIODB_NAME = "ecoinvent-3.10-biosphere"
biodb = bd.Database(BIODB_NAME)

index = 0
id_mapping = {}

print("Creating indices...")

schema = (
    NumericField("$.index", as_name="index"),
    TextField("$.activity_uuid", as_name="activity_uuid"),
    TextField("$.product_uuid", as_name="product_uuid"),
    TextField("$.name", as_name="name"),
    TextField("$.classifications.ISIC_rev_4_ecoinvent", as_name='classification_isic'),
    TextField("$.classifications.CPC", as_name='classification_cpc'),
    TextField("$.activity_type", as_name="activity_type"),
    TextField("$.location", as_name="location"),
    TextField("$.type", as_name="type"),
    TextField("$.unit", as_name="unit"),
    TextField("$.product", as_name="product"),
    NumericField("$.time-period.start", as_name="time_period_start"),
    NumericField("$.time-period.finish", as_name="time_period_finish"),
    TextField("$.section", as_name="section"),
    TextField("$.sectors", as_name="sectors"),
    NumericField("$.organisations[*]", as_name="organisations")
)

redis_index = r.ft("idx:act")
redis_index.create_index(schema, definition=IndexDefinition(prefix=["act:"], index_type=IndexType.JSON))

del schema

print("Loading processing activities...")

for act in eidb:
    actdict = act.as_dict()

    obj = {
        "id": index,
        "activity_uuid": actdict["activity"],
        "product_uuid": actdict["flow"],
        "name": actdict["name"],
        "classifications": {c[0].replace(" ", "_").replace(".", '_'): c[1] for c in actdict["classifications"]},
        "activity_type": actdict["activity type"],
        "location": actdict["location"],
        "type": actdict["type"],
        "unit": actdict["unit"],
        "product": actdict["reference product"],
        "time-period": actdict["time period"],
        "section": actdict["section"],
        "sectors": actdict["sector"],
        "organisations": actdict["organisations"]
    }
    id_mapping[act.key[1]] = index
    r.json().set("act:"+str(index), "$", obj)
    r.incr('actlen')
    index += 1

print("Loading biosphere activities...")

for act in biodb:
    actdict = act.as_dict()
    obj = {
        "id": index,
        "name": actdict["name"],
        "activity_uuid": actdict["code"],
        "product_uuid": actdict["CAS number"],
        "classifications": {"other": actdict["categories"]},
        "activity_type": "biosphere",
        "location": "",
        "type": actdict["type"],
        "unit": actdict["unit"],
        "product": actdict["name"],
        "time-period": {},
        "section": "",
        "sectors": [],
        "organisations": []
    }
    id_mapping[act.key[1]] = index
    r.json().set("act:"+str(index), "$", obj)
    r.incr('actlen')
    index += 1

del biodb

print("Loading exchanges...")

for act in eidb:
    for exc in act.exchanges():
        if exc["input"][1] == act.key[1]:
            continue
        exc = exc.as_dict()
        
        if exc['type'] == 'biosphere':
            r.lpush("biosphere:" + str(id_mapping[act.key[1]]), id_mapping[exc["input"][1]])
        else:
            r.lpush("inputs:" + str(id_mapping[act.key[1]]), id_mapping[exc["input"][1]])
        
        # Populates output array
        #acts[id_mapping[exc["input"][1]]]['outputs'].append(id_mapping[act.key[1]])

del eidb

org_index = 0

print(len(id_mapping.keys()))

# print("Loading organisations...")
# with open("organisational_boundaries_smaller.txt") as f:
#     organisation = []
#     line = f.readline()
#     while line:
#         if line == "\n":
#             org_index += 1
#         else:
#             r.lpush("org" + str(org_index), id_mapping[line.strip()])
#         line = f.readline()

# r.close()