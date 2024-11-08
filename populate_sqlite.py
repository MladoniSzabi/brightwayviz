import brightway2 as bw
import bw2data as bd
import bw2io as bi
import bw2calc as bc
import bw2analyzer as bwa

import sqlite3
import json
from tqdm import tqdm

conn = sqlite3.connect("databases.db")
cur = conn.cursor()

PROJECT_NAME = 'ecoinvent-3.10-cutoff-try-3'
bd.projects.set_current(PROJECT_NAME)

DB_NAME="ecoinvent-3.10-cutoff"
eidb = bd.Database(DB_NAME)

BIODB_NAME = "ecoinvent-3.10-biosphere"
biodb = bd.Database(BIODB_NAME)

AGGDB_NAME = "ecoinvent-3.10-aggregates"
aggdb = bd.Database(AGGDB_NAME)

index = 1
id_mapping = {}

cur.execute("DROP TABLE IF EXISTS activitydataset;")
cur.execute("DROP TABLE IF EXISTS exchangesdataset;")

cur.execute("""CREATE TABLE activitydataset(
            database TEXT,
            activity_uuid TEXT,
            product_uuid TEXT,
            name TEXT,
            classifications_isic TEXT,
            classifications_cpc TEXT,
            classifications_other TEXT,
            classifications_hs2017 TEXT,
            location TEXT,
            type TEXT,
            unit TEXT,
            product TEXT,
            time_period_start INTEGER,
            time_period_end INTEGER,
            section TEXT,
            sectors TEXT,
            organisations TEXT); """)

cur.execute("""CREATE TABLE exchangesdataset(
            activity_id INTEGER REFERENCES activitydataset(rowid),
            child_id INTEGER REFERENCES activitydataset(rowid),
            type TEXT);""")

print("Loading processing activities...")

cur.execute("BEGIN TRANSACTION")
for act in tqdm(eidb):
    actdict = act.as_dict()

    classifications = {c[0].replace(" ", "_").replace(".", '_'): c[1].replace("\"", "\"\"") for c in actdict["classifications"]}
    other_class = {key:classifications[key] for key in classifications if key not in["ISIC_rev_4_ecoinvent", "CPC"]}
    if len(other_class) == 0:
        other_class = None

    id_mapping[act.key[1]] = index
    query = f"""INSERT INTO activitydataset(
        database,
        activity_uuid,
        product_uuid,
        name,
        classifications_isic,
        classifications_cpc,
        classifications_hs2017,
        classifications_other,
        location,
        type,
        unit,
        product,
        time_period_start,
        time_period_end,
        section,
        sectors,
        organisations) VALUES (
            '{act.key[0]}',
            '{actdict["activity"]}',
            '{actdict["flow"]}',
            "{actdict["name"]}",
            "{classifications.get("ISIC_rev_4_ecoinvent", "")}",
            "{classifications.get("CPC", "")}",
            "{classifications.get("HS2017", "")}",
            {("'" + json.dumps(other_class) + "'") if other_class else "''"},
            '{actdict["location"]}',
            '{actdict["activity type"]}',
            '{actdict["unit"]}',
            "{actdict["reference product"]}",
            {actdict["time period"]["start"]},
            {actdict["time period"]["finish"]},
            '{actdict["section"]}',
            "{','.join(actdict["sector"])}",
            '{',' + ','.join(map(str, actdict["organisations"])) + ','}'
    )"""
    try:
        cur.execute(query)
    except Exception as e:
        print(query)
        raise e
    index += 1

cur.execute("COMMIT")

print("Loading biosphere activities...")

cur.execute("BEGIN TRANSACTION")
for act in tqdm(biodb):
    actdict = act.as_dict()
    id_mapping[act.key[1]] = index
    query = f"""INSERT INTO activitydataset(
        database,
        activity_uuid,
        product_uuid,
        name,
        classifications_isic,
        classifications_cpc,
        classifications_hs2017,
        classifications_other,
        location,
        type,
        unit,
        product,
        time_period_start,
        time_period_end,
        section,
        sectors,
        organisations) VALUES (
            '{act.key[0]}',
            '{actdict["code"]}',
            '{actdict["CAS number"]}',
            "{actdict["name"]}",
            '',
            '',
            '',
            '{json.dumps(actdict["categories"])}',
            '',
            '{actdict["type"]}',
            '{actdict["unit"]}',
            '{actdict["name"]}',
            0,
            9999,
            '',
            '',
            ''
        )"""
    try:
        cur.execute(query)
    except Exception as e:
        print(query)
        raise e
    index += 1
cur.execute("COMMIT")
del biodb

print("Loading aggregations...")

cur.execute("BEGIN TRANSACTION")
for act in tqdm(aggdb):
    actdict = act.as_dict()
    parent = eidb.get(actdict["parent"]).as_dict()
    #print(parent)
    parent_class = {c[0].replace(" ", "_").replace(".", '_'): c[1].replace("\"", "\"\"") for c in parent["classifications"]}
    parent_other = {key:parent_class[key] for key in parent_class if key not in["ISIC_rev_4_ecoinvent", "CPC"]}

    classifications = {c[0].replace(" ", "_").replace(".", '_'): c[1].replace("\"", "\"\"") for c in actdict["classifications"]}
    other_class = {key:classifications[key] for key in classifications if key not in["ISIC_rev_4_ecoinvent", "CPC"]}
    if len(other_class) == 0:
        other_class = None

    id_mapping[act.key[1]] = index

    # TODO: the time period is hardcoded

    query = f"""INSERT INTO activitydataset(

        product_uuid,
        classifications_isic,
        classifications_cpc,
        classifications_hs2017,
        classifications_other,
        unit,
        product,
        time_period_start,
        time_period_end,
        section,
        sectors,
        organisations,

        database,
        activity_uuid,
        name,
        location,
        type) VALUES (
            "{id_mapping[actdict["parent"]]}",
            "{classifications.get("ISIC_rev_4_ecoinvent", parent_class.get("ISIC_rev_4_ecoinvent", ""))}",
            "{classifications.get("CPC", parent_class.get("CPC", ""))}",
            "{classifications.get("HS2017", parent_class.get("HS2017", ""))}",
            {("'" + json.dumps(parent_other) + "'") if parent_other else "''"},
            'unit',
            '{parent['activity type']}',
            0,
            9999,
            "{parent["section"]}",
            "{','.join(parent["sector"])}",
            '',

            '{act.key[0]}',
            '{act.key[1]}',
            ?,
            '{actdict["location"]}',
            'aggregation'
        )"""
    try:
        cur.execute(query, (actdict["name"],))
    except Exception as e:
        print(query)
        raise e
    index += 1
cur.execute("COMMIT")
print("Loading exchanges...")

cur.execute("BEGIN TRANSACTION")
for act in tqdm(eidb):
    for exc in act.exchanges():
        if exc["input"][1] == act.key[1]:
            continue
        exc = exc.as_dict()

        cur.execute(f"""INSERT INTO exchangesdataset(
                        activity_id,
                        child_id,
                        type
                    ) VALUES (
                        {id_mapping[act.key[1]]},
                        {id_mapping[exc["input"][1]]},
                        '{'biosphere' if exc['type'] == 'biosphere' else 'inputs'}'
                    )""")
cur.execute("COMMIT")

print("Loading aggregation exchanges...")

cur.execute("BEGIN TRANSACTION")
for act in tqdm(aggdb):
    for exc in act.exchanges():
        if exc["input"][1] == act.key[1]:
            continue
        exc = exc.as_dict()

        cur.execute(f"""INSERT INTO exchangesdataset(
                        activity_id,
                        child_id,
                        type
                    ) VALUES (
                        {id_mapping[act.key[1]]},
                        {id_mapping[exc["input"][1]]},
                        '{'aggregation' if exc['type'] == 'substitution' else 'inputs'}'
                    )""")
cur.execute("COMMIT")

print("Indexing exchanges dataset...")

cur.execute("CREATE INDEX idx_act_id ON exchangesdataset(activity_id)")

cur.close()
conn.close()