#include <iostream>
#include <regex>

#include <App.h>
#include "helpers/AsyncFileStreamer.h"

namespace fs = std::filesystem;

AsyncFileStreamer staticFileStreamer("../frontend");

void indexFunction(uWS::HttpResponse<false> *res, uWS::HttpRequest *req)
{
    staticFileStreamer.streamFile(res, "index.html");
}

void serveStatic(uWS::HttpResponse<false> *res, uWS::HttpRequest *req)
{
    staticFileStreamer.streamFile(res, req->getUrl());
}

std::string getDB(std::string dbName)
{
    if (dbName == "")
        return "../dbs/databases.db";

    std::regex cleanerRegex("[^0-9a-zA-Z_]+");

    dbName = std::regex_replace(dbName, cleanerRegex, "");
    std::vector<std::string> dbs;
    for (const auto &entry : fs::directory_iterator("../dbs"))
        if (dbName == entry.path())
            return "../dbs/" + entry.path().filename().generic_string();

    return "../dbs/databases.db";
}

void getTotalActivities(uWS::HttpResponse<false> *res, uWS::HttpRequest *req)
{
    std::string method(req->getMethod());
    for (auto &c : method)
        c = toupper(c);

    if (method != "GET")
    {
        res->writeStatus("400")->end("Unsupported method");
    }
}

int main()
{
    uWS::App()
        .get("/", indexFunction)
        .get("/*", serveStatic)
        .listen(3000, [](auto *listen_socket)
                {
            if(listen_socket)
                std::cout<<"Listening..." << std::endl; })
        .run();
}
