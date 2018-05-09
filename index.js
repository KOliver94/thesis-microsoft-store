var request = require('request');
var cheerio = require('cheerio');
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const MICROSOFT_URL = "https://www.microsoft.com";
const CATEGORY = "most-popular"

var options = {
    proxy: 'http://127.0.0.1:8080',
    url: MICROSOFT_URL + '/en-us/store/most-popular/apps/pc?s=store&skipitems=180',
    headers: {
        'cache-control': 'no-cache',
        'User-Agent': 'PostmanRuntime/7.1.1',
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate'
    }
};

function details(error, response, body) {
    if(!error) {
        var $ = cheerio.load(body);

        var name, developer;
        var permissions = [];

        /* Get the name of the application */
        $('.c-heading-2').filter(function () {
            var data = $(this);
            name = data.first().text();
        });

        /* Get the developer */
        $('.context-product-details').filter(function () {
            var data = $(this).children();
            developer = data.first().text();
        });

        /* Get the permissions */
        $('strong').filter(function() {
            if ($(this).text().trim() === 'This app can') {
                var count = $(this).next().next().children().length;
                for (var i = 0; i < count; i++) {
                    if ($(this).next().next().children().eq(i).text().trim()) {
                        permissions.push(($(this).next().next().children().eq(i).text().trim()));
                    }
                }
            }
        });

        var detail = {name: name, developer: developer}
        var object = {detail: detail, permission: permissions}

        saveToDatabase(object);

        // console.log('App name: ', name);
        // console.log('Developer: ', developer);
        // console.log('Permissions: ', permissions);

    }
}

function list(error, response, body) {
    if(!error){
        var $ = cheerio.load(body);

        var links = [];

        $('.m-product-placement-item').filter(function () {
            var link = $(this).children().attr('href');
            links.push(link);
        });
    }

    links.forEach(function (object) {
        options.url = MICROSOFT_URL + object.toString();
        request(options,details);
    })

}


function saveToDatabase(object){
    MongoClient.connect(url, function(err, db) {
        if (err) throw err;
        var dbo = db.db("microsoft-store");
        dbo.collection(CATEGORY).insertOne(object, function(err, res) {
            if (err) throw err;
            console.log("1 document inserted");
            db.close();
        });
    });
}

for(var i = 0; i <= 990; i+=90 )
{
    options.url=MICROSOFT_URL+"/en-us/store/most-popular/apps/pc?s=store&skipitems="+i;
    request(options,list);
}
