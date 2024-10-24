import sqlite3
import json

class SQLiteDatabase:

    def __enter__(self):
        self.db = sqlite3.connect("file:databases.db?mode=ro", uri=True)
        self.cur = self.db.cursor()
        return self
    
    def __exit__(self, *args):
        self.cur.close()
        self.db.close()

    def generate_query(self, filters):
        query = "WHERE database='ecoinvent-3.10-cutoff'"
        params = []

        if filters['search_criteria'] != "":
            query += " AND name LIKE ? ESCAPE '\\'"
            escaped_str = filters['search_criteria'].replace("%", "\\%").replace("_", "\\_").replace("\\", "\\\\")
            params.append("%" + escaped_str + "%")

        if filters["time_period_start"] != None:
            query += " AND time_period_start <= ?"
            params.append(filters["time_period_start"])

        if filters["time_period_end"] != None:
            query += " AND time_period_end >= ?"
            params.append(filters["time_period_end"])

        if filters["sector"] != "":
            query += " AND sectors LIKE ? ESCAPE '\\'"
            escaped_str = filters["sector"].replace("%", "\\%").replace("_", "\\_").replace("\\", "\\\\")
            params.append("%" + escaped_str + "%")

        if filters["geography"] != "":
            query += " AND location=?"
            params.append(filters["geography"])

        if filters["type"] != "":
            query += " AND type LIKE ? ESCAPE '\\'"
            escaped_str = filters["type"].replace("%", "\\%").replace("_", "\\_").replace("\\", "\\\\")
            params.append("%" + escaped_str + "%")

        if filters["isic_section"] != "":
            query += " AND section LIKE ? ESCAPE '\\'"
            escaped_str = filters["isic_section"].replace("%", "\\%").replace("_", "\\_").replace("\\", "\\\\")
            params.append("%" + escaped_str + "%")

        if filters["isic_class"] != "":
            query += " AND classifications_isic LIKE ? ESCAPE '\\'"
            escaped_str = filters["isic_class"].replace("%", "\\%").replace("_", "\\_").replace("\\", "\\\\")
            params.append("%" + escaped_str + "%")

        if filters["cpc_class"] != "":
            query += " AND classifications_cpc LIKE ? ESCAPE '\\'"
            escaped_str = filters["cpc_class"].replace("%", "\\%").replace("_", "\\_").replace("\\", "\\\\")
            params.append("%" + escaped_str + "%")
        
        if filters["organisation"] != -1:
            query += " AND organisations LIKE '%," + str(int(filters["organisation"])) + ",%' "

        return (query, params)

    def convert_result(self, sqlite_result, columns):
        retval = {}
        for name, val in zip(columns, sqlite_result):

            if name == "sectors":
                retval[name] = val.split(',')
            elif name == "organisations":
                retval[name] = val[1:-1].split(',')
            elif name == "time_period_start":
                if "time-period" in retval:
                    retval["time-period"]["start"] = val
                else:
                    retval["time-period"] = {"start": val}
            elif name == "time_period_end":
                if "time-period" in retval:
                    retval["time-period"]["finish"] = val
                else:
                    retval["time-period"] = {"finish": val}
            elif name == "classifications_other":
                if "classifications" not in retval:
                    retval["classifications"] = {}
                if val:
                    other = json.loads(val)
                    if type(other) == dict:
                        for ok in other:
                            retval["classifications"][ok] = other[ok]
                    else:
                        retval["classifications"]["other"] = []
                        for ok in other:
                            retval["classifications"]["other"].append(ok)
            elif name == "classifications_cpc":
                if "classifications" not in retval:
                    retval["classifications"] = {}
                retval["classifications"]["cpc"] = val
            elif name == "classifications_isic":
                if "classifications" not in retval:
                    retval['classifications'] = {}
                retval["classifications"]['isic'] = val
            else:
                retval[name] = val
        return retval

    def get_count(self, query):
       return self.cur.execute("SELECT COUNT (*) FROM activitydataset " + query[0], query[1]).fetchone()[0]

    def get_page(self, query, page_size:int = 5, page_number:int = 0, keys:None|list = None):
        collection = []

        if keys == None:
            query_str = "SELECT rowid as id, * FROM activitydataset " + query[0]
        else:
            keys_conv = ["rowid" if k == 'id' else k for k in keys]
            query_str = "SELECT " + ', '.join(keys_conv) + " FROM activitydataset " + query[0]
        
        query_str = query_str + " LIMIT " + str(int(page_size)) + " OFFSET " + str(int(page_size) * int(page_number))

        result = self.cur.execute(query_str, query[1])
        if keys == None:
            keys = [description[0] for description in res.description]
        result = result.fetchall()

        for res in result:
            collection.append(self.convert_result(res, keys))

        return collection

    def get_activity(self, activity_id:int, keys : None|list =None):
        if keys == None:
            res = self.cur.execute("SELECT rowid as id, * FROM activitydataset WHERE rowid=" + str(int(activity_id)))
        else:
            keys_conv = ["rowid" if k == 'id' else k for k in keys]
            res = self.cur.execute("SELECT " + ', '.join(keys_conv) + " FROM activitydataset WHERE rowid=" + str(int(activity_id)))
        if keys == None:
            keys = [description[0] for description in res.description]
        return self.convert_result(res.fetchone(), keys)

    def get_children(self, activity_id:int):
        children = []
        query = "SELECT child_id FROM exchangesdataset WHERE activity_id=" + str(int(activity_id))
        result = self.cur.execute(query).fetchall()
        for res in result:
            children.append(res[0])
        
        return children
    
    def get_children_count(self, activity_id:int):
        query = "SELECT COUNT(*) FROM exchangesdataset WHERE activity_id=" + str(int(activity_id))
        return self.cur.execute(query).fetchone()[0]
