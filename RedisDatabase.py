import redis

class SQLiteDatabase:

    def __enter__(self):
        pass
    
    def __exit__(self, *args):
        pass

    def generate_query(self, filters):
        pass

    def get_count(self, query):
       pass

    def get_page(self, query, page_size = 5, page_number = 0, keys = None):
        pass

    def get_activity(self, activity_id):
        pass

    def get_children(self, activity_id):
        pass
    
    def get_children_count(self, activity_id):
        pass
