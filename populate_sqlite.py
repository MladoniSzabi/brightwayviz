import brightway2 as bw
import bw2data as bd
import bw2io as bi
import bw2calc as bc
import bw2analyzer as bwa

import sqlite3
import json

conn = sqlite3.connect("databases.db")
cur = conn.cursor()

PROJECT_NAME = 'ecoinvent-3.10-cutoff-try-3'
bd.projects.set_current(PROJECT_NAME)

DB_NAME="ecoinvent-3.10-cutoff"
eidb = bd.Database(DB_NAME)

BIODB_NAME = "ecoinvent-3.10-biosphere"
biodb = bd.Database(BIODB_NAME)

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
for act in eidb:
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
            "{classifications.get("ISIC_rev_4_ecoinvent", "NULL")}",
            "{classifications.get("CPC", "NULL")}",
            {("'" + json.dumps(other_class) + "'") if other_class else "NULL"},
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
for act in biodb:
    actdict = act.as_dict()
    id_mapping[act.key[1]] = index
    query = f"""INSERT INTO activitydataset(
        database,
        activity_uuid,
        product_uuid,
        name,
        classifications_isic,
        classifications_cpc,
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
            NULL,
            NULL,
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

print("Loading exchanges...")

cur.execute("BEGIN TRANSACTION")

for act in eidb:
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

print("Indexing exchanges dataset...")

cur.execute("CREATE INDEX idx_act_id ON exchangesdataset(activity_id)")

cur.close()
conn.close()