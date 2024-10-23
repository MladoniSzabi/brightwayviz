import redis
from redis.commands.search.query import NumericFilter, Query

import json

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

class SQLiteDatabase:

    def __enter__(self):
        self.r = redis.Redis(host="localhost", port=6379, decode_responses=True)
        self.redis_index = self.r.ft("idx:act")
        return self
    
    def __exit__(self, *args):
        self.r.close()

    def generate_query(self, filters):
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
            query += "@location:'*" + filters["geography"] + "*' "

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

        return Query(query)

    def get_count(self, query):
       query.paging(0,0)
       return self.redis_index.search(query)

    def get_page(self, query, page_size = 5, page_number = 0, keys = None):
        collection = []
        query.paging(page_number * page_size, page_size)

        results = self.redis_index.search(query)
        if keys != None:
            for c in results.docs:
                data = json.loads(c.json)
                ret = {}
                for key in keys:
                    ret[key] = data[key]
                collection.append(ret)
        else:
            for c in results.docs:
                collection.append(c.json)

        return collection

    def get_activity(self, activity_id, keys=None):
        data = self.r.json().get("act:" + str(activity_id), "$")[0]
        if keys != None:
            retval = {}
            for key in keys:
                retval[key] = data[key]
            
            return retval

        return data

    def get_children(self, activity_id):
        children = self.r.lrange("inputs:" + str(activity_id), 0, -1) + self.r.lrange("biosphere:" + str(activity_id), 0, -1)
        return children
    
    def get_children_count(self, activity_id):
        return self.r.llen("inputs:" + str(activity_id)) + self.r.llen("biosphere:" + str(activity_id))
